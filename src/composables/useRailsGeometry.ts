// レール生成/幾何ユーティリティ
import {
  CURVE_SEGMENT_ANGLE as CURVE_ANGLE,
  RAIL_CURVE_RADIUS,
  RAIL_STRAIGHT_FULL_LENGTH,
  RAIL_SLOPE_RUN,
  RAIL_SLOPE_RISE,
  RAIL_CURVE_SLOPE_RISE,
  MAX_RAIL_HEIGHT,
  MIN_PIER_HEIGHT,
} from "../constants/rail";
import { AREA_LIMIT } from "../constants/area";
import type { Rail } from "../types/rail";
import type { Pose, Vec3, Euler } from "../types/common";

/**
 * 線路配置・幾何計算のユーティリティ関数群
 *
 * 【前提知識】
 * - 座標系: X軸（東西）、Y軸（高さ）、Z軸（南北）
 * - Pose: { point: [x, y, z], theta: 回転角度 } - 線路配置の起点と向き
 * - theta: Y軸周りの回転（0 = Z軸負方向、π/2 = X軸正方向）
 * - 各レールは start/end の接続点を持ち、電車はこの間を移動する
 */
export function useRailsGeometry() {
  /**
   * レールセグメントの長さを計算
   *
   * @param r レールオブジェクト
   * @returns セグメントの長さ
   *
   * 【計算方法】
   * - 直線系（直線、スロープ、駅、踏切）: start-end間の直線距離
   * - 曲線系（カーブ、カーブスロープ）: 弧長 = 半径 × 角度
   */
  const segmentLength = (r: Rail) =>
    r.type === "straight" || r.type === "slope" || r.type === "station" || r.type === "crossing"
      ? Math.hypot(r.connections.end[0] - r.connections.start[0], r.connections.end[2] - r.connections.start[2])
      : RAIL_CURVE_RADIUS * CURVE_ANGLE;

  /**
   * 直線レールを生成
   *
   * @param pose 配置起点と向き
   * @param length レールの長さ（デフォルト: 定数値）
   * @returns 直線レールオブジェクト
   *
   * 【計算ロジック】
   * 1. 起点（pose.point）から指定された向き（pose.theta）に向かって直線を引く
   * 2. Math.cos(theta) でX方向、-Math.sin(theta) でZ方向の成分を計算
   *    （注意: Z軸は-sin を使うことで座標系の整合性を保つ）
   * 3. 中点を position として保存（3Dオブジェクトの配置座標）
   */
  const makeStraight = (pose: Pose, length = RAIL_STRAIGHT_FULL_LENGTH): Rail => {
    const start = pose.point;
    const dirx = Math.cos(pose.theta);
    const dirz = Math.sin(pose.theta);
    const end: Vec3 = [start[0] + dirx * length, start[1], start[2] - dirz * length];
    const mid: Vec3 = [(start[0] + end[0]) / 2, start[1], (start[2] + end[2]) / 2];
    return {
      id: `straight-${Date.now()}-${Math.random()}`,
      type: "straight",
      position: mid,
      rotation: [0, pose.theta, 0],
      connections: { start, end },
    };
  };

  /**
   * スロープレールを生成
   *
   * @param pose 配置起点と向き
   * @param ascending 上り坂かどうか（false = 下り坂）
   * @returns スロープレールオブジェクト
   *
   * 【計算ロジック】
   * 1. 水平距離 RAIL_SLOPE_RUN で指定方向に進む
   * 2. 同時に垂直方向に RAIL_SLOPE_RISE 分だけ上昇/下降
   * 3. 実際の電車移動では、この高度変化はease-in-outカーブで滑らかに補間される
   *    （useTrainRunner の getPoseOnRail で実装）
   */
  const makeSlope = (pose: Pose, ascending = true): Rail => {
    const start = pose.point;
    const dirx = Math.cos(pose.theta);
    const dirz = Math.sin(pose.theta);
    const rise = ascending ? RAIL_SLOPE_RISE : -RAIL_SLOPE_RISE;
    const end: Vec3 = [start[0] + dirx * RAIL_SLOPE_RUN, start[1] + rise, start[2] - dirz * RAIL_SLOPE_RUN];
    const mid: Vec3 = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2];
    return {
      id: `slope-${Date.now()}-${Math.random()}`,
      type: "slope",
      position: mid,
      rotation: [0, pose.theta, 0],
      connections: { start, end },
    };
  };

  /**
   * スロープ配置の妥当性をチェック
   *
   * @param pose 配置起点と向き
   * @param ascending 上り坂かどうか
   * @returns 配置可能かどうか
   *
   * 【チェック項目】
   * 1. 地面レベル（Y=0）より下に潜らないか
   * 2. 最大高度制限を超えないか
   *
   * 【注意点】
   * - 浮動小数点演算の誤差を考慮してEPSILONを使用
   * - 下り坂の場合、終点が地下に潜る可能性がある
   */
  const canPlaceSlope = (pose: Pose, ascending = true): boolean => {
    const start = pose.point;
    const dirx = Math.cos(pose.theta);
    const dirz = Math.sin(pose.theta);
    const rise = ascending ? RAIL_SLOPE_RISE : -RAIL_SLOPE_RISE;
    const EPSILON = 1e-10; // 浮動小数点誤差対策
    const end: Vec3 = [start[0] + dirx * RAIL_SLOPE_RUN, start[1] + rise, start[2] + dirz * RAIL_SLOPE_RUN];

    // 地面レベル（Y=0）より下がるかチェック
    if (start[1] < -EPSILON || end[1] < -EPSILON) return false;

    // 最大高さ制限チェック
    if (start[1] > MAX_RAIL_HEIGHT || end[1] > MAX_RAIL_HEIGHT) return false;

    return true;
  };

  // 指定エリア内に点があるかチェックする関数
  const isWithinArea = (point: Vec3): boolean => {
    return Math.abs(point[0]) <= AREA_LIMIT && Math.abs(point[2]) <= AREA_LIMIT;
  };

  // レールが配置可能かチェックする関数
  const canPlaceRail = (rail: Rail): boolean => {
    // エリア内チェック
    const startInArea = isWithinArea(rail.connections.start);
    const endInArea = isWithinArea(rail.connections.end);
    const positionInArea = isWithinArea(rail.position);

    // 高さ制限チェック（最大高度）
    const startHeightOk = rail.connections.start[1] <= MAX_RAIL_HEIGHT;
    const endHeightOk = rail.connections.end[1] <= MAX_RAIL_HEIGHT;
    const positionHeightOk = rail.position[1] <= MAX_RAIL_HEIGHT;

    // 床の下チェック（最小高度）
    const EPSILON = 1e-10; // 浮動小数点誤差対策
    const startAboveGround = rail.connections.start[1] >= -EPSILON;
    const endAboveGround = rail.connections.end[1] >= -EPSILON;
    const positionAboveGround = rail.position[1] >= -EPSILON;

    return (
      startInArea &&
      endInArea &&
      positionInArea &&
      startHeightOk &&
      endHeightOk &&
      positionHeightOk &&
      startAboveGround &&
      endAboveGround &&
      positionAboveGround
    );
  };

  // 橋脚候補点の型定義
  interface PierCandidate {
    position: Vec3;
    railHeight: number;
    railId: string;
    rotation: number;
    connectionType: "start" | "end";
  }

  // 橋脚配置候補点を生成
  const generatePierCandidates = (rails: Rail[]): PierCandidate[] => {
    const candidates: PierCandidate[] = [];
    const SNAP_THRESHOLD = 0.1; // 重複除去用の閾値

    for (const rail of rails) {
      // 開始点の候補
      if (rail.connections.start[1] >= MIN_PIER_HEIGHT) {
        const startCandidate: PierCandidate = {
          position: [rail.connections.start[0], 0, rail.connections.start[2]],
          railHeight: rail.connections.start[1],
          railId: rail.id,
          rotation: getRailRotationAtConnection(rail, "start"),
          connectionType: "start",
        };

        // 重複チェック（同じ位置に複数の候補がある場合は統合）
        const existing = candidates.find(
          (c) =>
            Math.hypot(c.position[0] - startCandidate.position[0], c.position[2] - startCandidate.position[2]) <
            SNAP_THRESHOLD
        );

        if (!existing) {
          candidates.push(startCandidate);
        } else if (existing.railHeight < startCandidate.railHeight) {
          // より高い線路の高さを採用
          existing.railHeight = startCandidate.railHeight;
          existing.rotation = startCandidate.rotation;
        }
      }

      // 終了点の候補
      if (rail.connections.end[1] >= MIN_PIER_HEIGHT) {
        const endCandidate: PierCandidate = {
          position: [rail.connections.end[0], 0, rail.connections.end[2]],
          railHeight: rail.connections.end[1],
          railId: rail.id,
          rotation: getRailRotationAtConnection(rail, "end"),
          connectionType: "end",
        };

        // 重複チェック
        const existing = candidates.find(
          (c) =>
            Math.hypot(c.position[0] - endCandidate.position[0], c.position[2] - endCandidate.position[2]) <
            SNAP_THRESHOLD
        );

        if (!existing) {
          candidates.push(endCandidate);
        } else if (existing.railHeight < endCandidate.railHeight) {
          // より高い線路の高さを採用
          existing.railHeight = endCandidate.railHeight;
          existing.rotation = endCandidate.rotation;
        }
      }
    }

    return candidates;
  };

  // レールの接続点での回転角度を取得
  const getRailRotationAtConnection = (rail: Rail, connectionType: "start" | "end"): number => {
    // 線路の接線方向を取得
    let railDirection: number;
    if (rail.type === "curve" || rail.type === "curve-slope") {
      // カーブの場合、接続点での接線方向を計算
      const baseRotation = rail.rotation[1];
      if (connectionType === "start") {
        railDirection = baseRotation;
      } else {
        // 終点の場合は、カーブの終端での方向
        const curveAngle = rail.direction === "right" ? -CURVE_ANGLE : CURVE_ANGLE;
        return baseRotation + curveAngle + Math.PI / 2;
      }
    } else {
      // 直線レール、スロープ、駅、踏切の場合
      return rail.rotation[1] + Math.PI / 2; // 橋脚は線路に垂直
    }
    // カーブ開始点の場合
    return railDirection + Math.PI / 2;
  };

  // スマートスナップ: 最も近い橋脚候補を検索
  const findNearestPierCandidate = (clickPos: Vec3, candidates: PierCandidate[]): PierCandidate | null => {
    const SNAP_THRESHOLD = 2.0; // スナップ範囲（2グリッド以内）
    let nearest: PierCandidate | null = null;
    let minDistance = Infinity;

    for (const candidate of candidates) {
      const distance = Math.hypot(clickPos[0] - candidate.position[0], clickPos[2] - candidate.position[2]);

      if (distance < minDistance && distance < SNAP_THRESHOLD) {
        minDistance = distance;
        nearest = candidate;
      }
    }

    return nearest;
  };

  // 橋脚が配置可能かチェックする関数（従来版・互換性維持）
  const canPlacePier = (
    position: Vec3,
    rails: Rail[]
  ): {
    canPlace: boolean;
    error?: string;
    rotation?: number;
    railHeight?: number;
    correctPosition?: Vec3;
  } => {
    const [x, , z] = position;

    // 最も近い接続点を探す
    let nearestConnection: Vec3 | null = null;
    let minDistance = Infinity;
    let nearestRail: Rail | null = null;

    for (const rail of rails) {
      const checkPoints = [rail.connections.start, rail.connections.end];

      for (const point of checkPoints) {
        const distance = Math.hypot(point[0] - x, point[2] - z);

        if (distance < minDistance) {
          minDistance = distance;
          nearestConnection = point;
          nearestRail = rail;
        }
      }
    }

    // 接続点に十分近いかチェック（グリッド許容範囲内）
    if (!nearestConnection || minDistance > 0.1) {
      return { canPlace: false, error: "橋脚は線路の接続点にのみ配置できます" };
    }

    const railHeight = nearestConnection[1];

    // 高さが1個分以上必要
    if (railHeight < MIN_PIER_HEIGHT) {
      return { canPlace: false, error: `橋脚の配置には線路の高さが${MIN_PIER_HEIGHT.toFixed(1)}以上必要です` };
    }

    // 橋脚の最大数制限（高さに応じて）
    const maxPierCount = Math.floor(railHeight / RAIL_SLOPE_RISE);
    if (maxPierCount > 6) {
      return { canPlace: false, error: "橋脚は6個分の高さまでしか配置できません" };
    }

    // 正しい橋脚の配置位置（線路の下の地面）
    const correctPosition: Vec3 = [nearestConnection[0], 0, nearestConnection[2]];

    // レールの向きを取得（橋脚は線路に垂直）
    let railDirection = 0;
    if (nearestRail) {
      // レールの種類に応じて方向を計算
      if (nearestRail.type === "curve") {
        // カーブの場合、接続点での接線方向を計算
        const isStart =
          Math.hypot(
            nearestConnection[0] - nearestRail.connections.start[0],
            nearestConnection[2] - nearestRail.connections.start[2]
          ) < 0.1;

        if (isStart) {
          railDirection = -nearestRail.rotation[1];
        } else {
          // 終点の場合は、カーブの終端での方向
          const baseRotation = nearestRail.rotation[1];
          const curveAngle = nearestRail.direction === "right" ? -CURVE_ANGLE : CURVE_ANGLE;
          railDirection = -(baseRotation + curveAngle);
        }
      } else {
        // 直線レール、スロープ、駅、踏切の場合
        railDirection = -nearestRail.rotation[1];
      }

      // 橋脚は線路に垂直なので90度回転
      railDirection += Math.PI / 2;
    }

    return {
      canPlace: true,
      rotation: railDirection,
      railHeight: railHeight,
      correctPosition: correctPosition,
    };
  };

  /**
   * 左カーブレールを生成
   *
   * @param pose 配置起点と向き
   * @returns 左カーブレールオブジェクト
   *
   * 【幾何学的計算】
   * 1. 現在位置から左側（theta + π/2 方向）に半径分離れた点を円の中心とする
   * 2. その中心から時計回りに CURVE_ANGLE（通常π/2 = 90度）分回転した点が終点
   * 3. position は円の中心座標（3Dオブジェクトの配置に使用）
   *
   * 【座標計算の詳細】
   * - 中心座標: 現在位置から垂直左方向（sin/cosの符号に注意）
   * - 終点: 中心から回転後の方向への半径分のベクトル
   */
  const makeLeftCurve = (pose: Pose): Rail => {
    const r = RAIL_CURVE_RADIUS;
    const cx = pose.point[0] - Math.sin(pose.theta) * r;
    const cz = pose.point[2] - Math.cos(pose.theta) * r;
    const position: Vec3 = [cx, pose.point[1], cz];
    const rotation: Euler = [0, pose.theta, 0];
    const end: Vec3 = [
      position[0] + Math.sin(pose.theta + CURVE_ANGLE) * r,
      position[1],
      position[2] + Math.cos(pose.theta + CURVE_ANGLE) * r,
    ];
    return {
      id: `curve-left-${Date.now()}-${Math.random()}`,
      type: "curve",
      position,
      rotation,
      connections: { start: pose.point, end },
      direction: "left",
    };
  };

  /**
   * 右カーブレールを生成
   *
   * @param pose 配置起点と向き
   * @returns 右カーブレールオブジェクト
   *
   * 【幾何学的計算】
   * 1. 現在位置から右側（theta - π/2 方向）に半径分離れた点を円の中心とする
   * 2. その中心から反時計回りに CURVE_ANGLE 分回転した点が終点
   * 3. 左カーブとは逆方向の計算（角度の符号が逆）
   *
   * 【左右の違い】
   * - 中心位置: 左は -sin(θ), 右は -sin(-θ) = sin(θ)
   * - 終点角度: 左は +CURVE_ANGLE, 右は -CURVE_ANGLE
   */
  const makeRightCurve = (pose: Pose): Rail => {
    const r = RAIL_CURVE_RADIUS;
    const cx = pose.point[0] - Math.sin(-pose.theta) * r;
    const cz = pose.point[2] + Math.cos(-pose.theta) * r;
    const position: Vec3 = [cx, pose.point[1], cz];
    const rotation: Euler = [0, pose.theta, 0];
    const end: Vec3 = [
      position[0] - Math.sin(pose.theta - CURVE_ANGLE) * r,
      position[1],
      position[2] - Math.cos(pose.theta - CURVE_ANGLE) * r,
    ];
    return {
      id: `curve-right-${Date.now()}-${Math.random()}`,
      type: "curve",
      position,
      rotation,
      connections: { start: pose.point, end },
      direction: "right",
    };
  };

  const makeLeftCurveSlope = (pose: Pose, ascending = true): Rail => {
    const r = RAIL_CURVE_RADIUS;
    const cx = pose.point[0] - Math.sin(pose.theta) * r;
    const cz = pose.point[2] - Math.cos(pose.theta) * r;
    const position: Vec3 = [cx, pose.point[1], cz];
    const rotation: Euler = [0, pose.theta, 0];
    const rise = ascending ? RAIL_CURVE_SLOPE_RISE : -RAIL_CURVE_SLOPE_RISE;
    const end: Vec3 = [
      position[0] + Math.sin(pose.theta + CURVE_ANGLE) * r,
      pose.point[1] + rise,
      position[2] + Math.cos(pose.theta + CURVE_ANGLE) * r,
    ];
    return {
      id: `curve-slope-left-${Date.now()}-${Math.random()}`,
      type: "curve-slope",
      position,
      rotation,
      connections: { start: pose.point, end },
      direction: "left",
    };
  };

  const makeRightCurveSlope = (pose: Pose, ascending = true): Rail => {
    const r = RAIL_CURVE_RADIUS;
    const cx = pose.point[0] - Math.sin(-pose.theta) * r;
    const cz = pose.point[2] + Math.cos(-pose.theta) * r;
    const position: Vec3 = [cx, pose.point[1], cz];
    const rotation: Euler = [0, pose.theta, 0];
    const rise = ascending ? RAIL_CURVE_SLOPE_RISE : -RAIL_CURVE_SLOPE_RISE;
    const end: Vec3 = [
      position[0] - Math.sin(pose.theta - CURVE_ANGLE) * r,
      pose.point[1] + rise,
      position[2] - Math.cos(pose.theta - CURVE_ANGLE) * r,
    ];
    return {
      id: `curve-slope-right-${Date.now()}-${Math.random()}`,
      type: "curve-slope",
      position,
      rotation,
      connections: { start: pose.point, end },
      direction: "right",
    };
  };

  const makeStation = (pose: Pose, length = RAIL_STRAIGHT_FULL_LENGTH): Rail => {
    const start = pose.point;
    const end: Vec3 = [start[0] + Math.cos(pose.theta) * length, start[1], start[2] - Math.sin(pose.theta) * length];
    const mid: Vec3 = [(start[0] + end[0]) / 2, start[1], (start[2] + end[2]) / 2];
    return {
      id: `station-${Date.now()}-${Math.random()}`,
      type: "station",
      position: mid,
      rotation: [0, pose.theta, 0],
      connections: { start, end },
    };
  };

  const makeCrossing = (pose: Pose, length = RAIL_STRAIGHT_FULL_LENGTH): Rail => {
    const start = pose.point;
    const end: Vec3 = [start[0] + Math.cos(pose.theta) * length, start[1], start[2] - Math.sin(pose.theta) * length];
    const mid: Vec3 = [(start[0] + end[0]) / 2, start[1], (start[2] + end[2]) / 2];
    return {
      id: `crossing-${Date.now()}-${Math.random()}`,
      type: "crossing",
      position: mid,
      rotation: [0, pose.theta, 0],
      connections: { start, end },
    };
  };

  /**
   * レール終端でのPose（位置と向き）を計算
   *
   * @param rail レールオブジェクト
   * @returns 終端での位置と向き
   *
   * 【用途】
   * 次のレールを連続配置する際の起点として使用
   *
   * 【計算方法】
   * - 直線系: レールの回転角度をそのまま使用
   * - カーブ系: 終端での接線方向を計算
   *   - 右カーブ: 開始角度 - カーブ角度
   *   - 左カーブ: 開始角度 + カーブ角度
   *
   * 【注意】
   * rotation[1] は Three.js の Y軸回転で、数学的な角度と符号が逆のため -rail.rotation[1] を使用
   */
  const poseFromRailEnd = (rail: Rail): Pose => {
    const end = rail.connections.end;
    if (rail.type === "straight" || rail.type === "slope" || rail.type === "station" || rail.type === "crossing") {
      const theta = rail.rotation[1];
      return { point: end, theta };
    }
    // curve or curve-slope
    const base = rail.rotation[1];
    const theta = rail.direction === "right" ? base - CURVE_ANGLE : base + CURVE_ANGLE;
    return { point: end, theta };
  };

  return {
    segmentLength,
    makeStraight,
    makeSlope,
    makeLeftCurve,
    makeRightCurve,
    makeLeftCurveSlope,
    makeRightCurveSlope,
    makeStation,
    makeCrossing,
    poseFromRailEnd,
    canPlaceSlope,
    canPlaceRail,
    isWithinArea,
    canPlacePier,
    generatePierCandidates,
    findNearestPierCandidate,
    getRailRotationAtConnection,
  } as const;
}
