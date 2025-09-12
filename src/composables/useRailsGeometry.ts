// レール生成/幾何ユーティリティ
import {
  CURVE_SEGMENT_ANGLE as CURVE_ANGLE,
  RAIL_CURVE_RADIUS,
  RAIL_STRAIGHT_FULL_LENGTH,
  RAIL_SLOPE_RUN,
  RAIL_SLOPE_RISE,
  MAX_RAIL_HEIGHT,
  MIN_PIER_HEIGHT,
} from "../constants/rail";
import { AREA_LIMIT } from "../constants/area";
import type { Rail } from "../types/rail";
import type { Pose, Vec3, Euler } from "../types/common";

export function useRailsGeometry() {
  const segmentLength = (r: Rail) =>
    r.type === "straight" || r.type === "slope" || r.type === "station" || r.type === "crossing"
      ? Math.hypot(r.connections.end[0] - r.connections.start[0], r.connections.end[2] - r.connections.start[2])
      : RAIL_CURVE_RADIUS * CURVE_ANGLE;

  const makeStraight = (pose: Pose, length = RAIL_STRAIGHT_FULL_LENGTH): Rail => {
    const start = pose.point;
    const end: Vec3 = [start[0] + Math.cos(pose.theta) * length, start[1], start[2] + Math.sin(pose.theta) * length];
    const mid: Vec3 = [(start[0] + end[0]) / 2, start[1], (start[2] + end[2]) / 2];
    return {
      id: `straight-${Date.now()}-${Math.random()}`,
      type: "straight",
      position: mid,
      rotation: [0, -pose.theta, 0],
      connections: { start, end },
    };
  };

  const makeSlope = (pose: Pose, ascending = true): Rail => {
    const start = pose.point;
    const dirx = Math.cos(pose.theta);
    const dirz = Math.sin(pose.theta);
    const rise = ascending ? RAIL_SLOPE_RISE : -RAIL_SLOPE_RISE;
    const end: Vec3 = [start[0] + dirx * RAIL_SLOPE_RUN, start[1] + rise, start[2] + dirz * RAIL_SLOPE_RUN];
    const mid: Vec3 = [(start[0] + end[0]) / 2, start[1], (start[2] + end[2]) / 2];
    return {
      id: `slope-${Date.now()}-${Math.random()}`,
      type: "slope",
      position: mid,
      rotation: [0, -pose.theta, 0],
      connections: { start, end },
    };
  };

  const canPlaceSlope = (pose: Pose, ascending = true): boolean => {
    const start = pose.point;
    const dirx = Math.cos(pose.theta);
    const dirz = Math.sin(pose.theta);
    const rise = ascending ? RAIL_SLOPE_RISE : -RAIL_SLOPE_RISE;
    const end: Vec3 = [start[0] + dirx * RAIL_SLOPE_RUN, start[1] + rise, start[2] + dirz * RAIL_SLOPE_RUN];
    
    // 地面レベル（Y=0）より下がるかチェック
    if (start[1] < 0 || end[1] < 0) return false;
    
    // 最大高さ制限チェック
    if (start[1] > MAX_RAIL_HEIGHT || end[1] > MAX_RAIL_HEIGHT) return false;
    
    return true;
  };

  const isWithinArea = (point: Vec3): boolean => {
    return Math.abs(point[0]) <= AREA_LIMIT && Math.abs(point[2]) <= AREA_LIMIT;
  };

  const canPlaceRail = (rail: Rail): boolean => {
    // エリア内チェック
    const startInArea = isWithinArea(rail.connections.start);
    const endInArea = isWithinArea(rail.connections.end);
    const positionInArea = isWithinArea(rail.position);
    
    // 高さ制限チェック
    const startHeightOk = rail.connections.start[1] <= MAX_RAIL_HEIGHT;
    const endHeightOk = rail.connections.end[1] <= MAX_RAIL_HEIGHT;
    const positionHeightOk = rail.position[1] <= MAX_RAIL_HEIGHT;
    
    return startInArea && endInArea && positionInArea && startHeightOk && endHeightOk && positionHeightOk;
  };

  // 線路の接続点を取得する関数
  const getRailConnectionPoints = (rails: Rail[]): Vec3[] => {
    const connectionPoints: Vec3[] = [];
    rails.forEach(rail => {
      connectionPoints.push(rail.connections.start, rail.connections.end);
    });
    return connectionPoints;
  };

  // 橋脚が配置可能かチェックする関数
  const canPlacePier = (position: Vec3, rails: Rail[]): { 
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
      if (nearestRail.type === 'curve') {
        // カーブの場合、接続点での接線方向を計算
        const isStart = Math.hypot(
          nearestConnection[0] - nearestRail.connections.start[0],
          nearestConnection[2] - nearestRail.connections.start[2]
        ) < 0.1;
        
        if (isStart) {
          railDirection = -nearestRail.rotation[1];
        } else {
          // 終点の場合は、カーブの終端での方向
          const baseRotation = nearestRail.rotation[1];
          const curveAngle = nearestRail.direction === 'right' ? -CURVE_ANGLE : CURVE_ANGLE;
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
      correctPosition: correctPosition
    };
  };

  const makeLeftCurve = (pose: Pose): Rail => {
    const r = RAIL_CURVE_RADIUS;
    const cx = pose.point[0] - Math.sin(pose.theta) * r;
    const cz = pose.point[2] + Math.cos(pose.theta) * r;
    const position: Vec3 = [cx, 0, cz];
    const rotation: Euler = [0, pose.theta, 0];
    const end: Vec3 = [
      position[0] + Math.sin(pose.theta + CURVE_ANGLE) * r,
      0,
      position[2] - Math.cos(pose.theta + CURVE_ANGLE) * r,
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

  const makeRightCurve = (pose: Pose): Rail => {
    const r = RAIL_CURVE_RADIUS;
    const cx = pose.point[0] + Math.sin(pose.theta) * r;
    const cz = pose.point[2] - Math.cos(pose.theta) * r;
    const position: Vec3 = [cx, 0, cz];
    const rotation: Euler = [0, pose.theta, 0];
    const end: Vec3 = [
      position[0] - Math.sin(pose.theta - CURVE_ANGLE) * r,
      0,
      position[2] + Math.cos(pose.theta - CURVE_ANGLE) * r,
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

  const makeStation = (pose: Pose, length = RAIL_STRAIGHT_FULL_LENGTH): Rail => {
    const start = pose.point;
    const end: Vec3 = [start[0] + Math.cos(pose.theta) * length, start[1], start[2] + Math.sin(pose.theta) * length];
    const mid: Vec3 = [(start[0] + end[0]) / 2, start[1], (start[2] + end[2]) / 2];
    return {
      id: `station-${Date.now()}-${Math.random()}`,
      type: "station",
      position: mid,
      rotation: [0, -pose.theta, 0],
      connections: { start, end },
    };
  };

  const makeCrossing = (pose: Pose, length = RAIL_STRAIGHT_FULL_LENGTH): Rail => {
    const start = pose.point;
    const end: Vec3 = [start[0] + Math.cos(pose.theta) * length, start[1], start[2] + Math.sin(pose.theta) * length];
    const mid: Vec3 = [(start[0] + end[0]) / 2, start[1], (start[2] + end[2]) / 2];
    return {
      id: `crossing-${Date.now()}-${Math.random()}`,
      type: "crossing",
      position: mid,
      rotation: [0, -pose.theta, 0],
      connections: { start, end },
    };
  };

  const poseFromRailEnd = (rail: Rail): Pose => {
    const end = rail.connections.end;
    if (rail.type === "straight" || rail.type === "slope" || rail.type === "station" || rail.type === "crossing") {
      const theta = -rail.rotation[1];
      return { point: end, theta };
    }
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
    makeStation,
    makeCrossing,
    poseFromRailEnd,
    canPlaceSlope,
    canPlaceRail,
    isWithinArea,
    canPlacePier,
  } as const;
}
