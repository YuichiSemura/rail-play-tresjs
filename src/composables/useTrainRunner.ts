import { watch, onUnmounted } from "vue";
import { useGameStore, type CarPose } from "../stores/game";
import { useRailsGeometry } from "./useRailsGeometry";
import { CAR_SPACING, CAR_COUNT, HEIGHT_OFFSET } from "../constants/train";
import { CURVE_SEGMENT_ANGLE as CURVE_ANGLE, RAIL_CURVE_RADIUS } from "../constants/rail";
import type { Rail } from "../types/rail";

/**
 * 電車の運行制御とアニメーション管理
 *
 * 【前提知識】
 * - 電車は複数車両（CAR_COUNT台）で構成され、各車両は一定間隔（CAR_SPACING）で配置
 * - 電車は線路上を進行し、先頭車両の位置に基づいて後続車両の位置を計算
 * - 曲線では円弧に沿って移動し、スロープでは高度変化をease-in-outカーブで滑らかに補間
 * - カメラ追従のため、先頭車両の位置・回転情報をリアルタイムで配信
 *
 * 【座標系と回転の扱い】
 * - position: [x, y, z] 世界座標
 * - rotation: [pitch, yaw, roll] ピッチ（上下）、ヨー（左右回転）、ロール（横転）
 * - yaw角度: 0 = Z軸負方向、π/2 = X軸正方向
 */
export function useTrainRunner() {
  const store = useGameStore();
  const { segmentLength } = useRailsGeometry();

  // Internal state
  const initialPose: CarPose[] = Array.from({ length: CAR_COUNT }, (_, i) => ({
    position: [-(i * CAR_SPACING), HEIGHT_OFFSET, 0] as [number, number, number],
    rotation: [0, Math.PI / 2, 0] as [number, number, number],
  }));

  let progressDist = 0;
  let animId: number | null = null;

  // Helper functions
  /**
   * 全レール長の合計を計算
   * 電車の進行距離計算とループ処理で使用
   */
  const totalRailLength = () => store.rails.reduce((acc, r) => acc + segmentLength(r), 0);

  /**
   * スロープ用のease-in-outイージング関数
   * RailSegment.vueのレール描画と同じアルゴリズムを使用
   */
  const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  // 線形寄りにするためのブレンド: 0 = 元の easeInOut, 1 = 完全線形
  const SLOPE_EASE_LINEAR_BLEND = 0.65;
  const blendedEase = (t: number) => {
    const e = easeInOutQuad(t);
    return e * (1 - SLOPE_EASE_LINEAR_BLEND) + t * SLOPE_EASE_LINEAR_BLEND;
  };

  /**
   * 指定したレールと進行度から車両の位置・回転を計算
   */
  const getPoseOnRail = (r: Rail, t: number): CarPose => {
    if (r.type === "straight" || r.type === "station" || r.type === "crossing") {
      const sx = r.connections.start[0];
      const sy = r.connections.start[1];
      const sz = r.connections.start[2];
      const ex = r.connections.end[0];
      const ey = r.connections.end[1];
      const ez = r.connections.end[2];
      const dx = ex - sx;
      const dz = ez - sz;
      const len = Math.hypot(dx, dz) || 1;
      const nx = dx / len;
      const nz = dz / len;

      const x = sx + nx * len * t;
      const z = sz + nz * len * t;
      const y = sy + (ey - sy) * t + HEIGHT_OFFSET;

      const yaw = Math.atan2(nx, nz);
      const pitch = Math.atan2(ey - sy, len);
      return { position: [x, y, z], rotation: [-pitch, yaw, 0] };
    }
    if (r.type === "slope") {
      const sx = r.connections.start[0];
      const sy = r.connections.start[1];
      const sz = r.connections.start[2];
      const ex = r.connections.end[0];
      const ey = r.connections.end[1];
      const ez = r.connections.end[2];
      const dx = ex - sx;
      const dz = ez - sz;
      const len = Math.hypot(dx, dz) || 1;
      const nx = dx / len;
      const nz = dz / len;

      const x = sx + nx * len * t;
      const z = sz + nz * len * t;

      const totalRise = ey - sy;
      const easedT = easeInOutQuad(t);
      const y = sy + totalRise * easedT + HEIGHT_OFFSET;

      const yaw = Math.atan2(nx, nz);

      const deltaT = 0.001;
      const easedT1 = easeInOutQuad(Math.max(0, t - deltaT));
      const easedT2 = easeInOutQuad(Math.min(1, t + deltaT));
      const dydt = ((easedT2 - easedT1) / (2 * deltaT)) * totalRise;
      const dxdt = len;
      const pitch = Math.atan2(dydt, dxdt);

      return { position: [x, y, z], rotation: [-pitch, yaw, 0] };
    }
    if (r.type === "curve-slope") {
      const cx = r.position[0];
      const cz = r.position[2];
      const theta = r.rotation[1];
      const sgn = r.direction === "right" ? -1 : 1;

      const phi = -(theta - sgn * (Math.PI / 2) + sgn * CURVE_ANGLE * t);
      const x = cx + Math.cos(phi) * RAIL_CURVE_RADIUS;
      const z = cz + Math.sin(phi) * RAIL_CURVE_RADIUS;

      const tx = -Math.sin(phi) * sgn;
      const tz = Math.cos(phi) * sgn;
      const yaw = Math.atan2(tx, -tz);

      const startY = r.connections.start[1];
      const endY = r.connections.end[1];
      const totalRise = endY - startY;
      const easedT = blendedEase(t);
      const y = startY + totalRise * easedT + HEIGHT_OFFSET;

      const deltaT = 0.001;
      const easedT1 = blendedEase(Math.max(0, t - deltaT));
      const easedT2 = blendedEase(Math.min(1, t + deltaT));
      const dydt = ((easedT2 - easedT1) / (2 * deltaT)) * totalRise;
      const arcLength = RAIL_CURVE_RADIUS * CURVE_ANGLE;
      const dxdt = arcLength;
      const pitch = Math.atan2(dydt, dxdt);

      return { position: [x, y, z], rotation: [-pitch, -yaw, 0] };
    }
    // curve（通常のカーブ、高度変化なし）
    const cx = r.position[0];
    const cz = r.position[2];
    const theta = r.rotation[1];
    const sgn = r.direction === "right" ? -1 : 1;

    const phi = -(theta - sgn * (Math.PI / 2) + sgn * CURVE_ANGLE * t);
    const x = cx + Math.cos(phi) * RAIL_CURVE_RADIUS;
    const z = cz + Math.sin(phi) * RAIL_CURVE_RADIUS;

    const tx = -sgn * Math.sin(phi);
    const tz = sgn * Math.cos(phi);
    const yaw = -Math.atan2(tx, -tz);

    const y = r.connections.start[1] + HEIGHT_OFFSET;
    return { position: [x, y, z], rotation: [0, yaw, 0] };
  };

  // Emit for train pose updates (for camera following)
  const trainPoseCallbacks: Array<
    (pose: {
      position: [number, number, number];
      rotation: [number, number, number];
      railType?: string;
      curveDirection?: string;
      secondCarPosition?: [number, number, number];
      lookAheadYaw?: number;
    }) => void
  > = [];

  const onTrainPose = (
    callback: (pose: {
      position: [number, number, number];
      rotation: [number, number, number];
      railType?: string;
      curveDirection?: string;
      secondCarPosition?: [number, number, number];
      lookAheadYaw?: number;
    }) => void
  ) => {
    trainPoseCallbacks.push(callback);
    return () => {
      const index = trainPoseCallbacks.indexOf(callback);
      if (index > -1) trainPoseCallbacks.splice(index, 1);
    };
  };

  const emitTrainPose = (pose: {
    position: [number, number, number];
    rotation: [number, number, number];
    railType?: string;
    curveDirection?: string;
    secondCarPosition?: [number, number, number];
    lookAheadYaw?: number;
  }) => {
    trainPoseCallbacks.forEach((callback) => callback(pose));
  };

  const angleLerp = (current: number, target: number, t: number) => {
    let delta = target - current;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return current + delta * t;
  };

  /**
   * 電車を1ステップ進行させ、全車両の位置・回転を更新
   */
  const stepTrain = () => {
    const L = totalRailLength();
    if (L <= 0) return;
    const avgSegLen = store.rails.length > 0 ? L / store.rails.length : 1;
    progressDist += store.trainSpeed * 0.008 * avgSegLen;
    const wrap = (v: number, m: number) => ((v % m) + m) % m;
    progressDist = wrap(progressDist, L);

    // 進行距離に対応する区間を走査
    let d = progressDist;
    let idx = 0;
    for (; idx < store.rails.length; idx++) {
      const seg = segmentLength(store.rails[idx]);
      if (d <= seg) break;
      d -= seg;
    }
    const segLen = segmentLength(store.rails[idx] || store.rails[0]);
    const t = Math.max(0, Math.min(1, d / (segLen || 1)));
    const lead = getPoseOnRail(store.rails[idx] || store.rails[0], t);

    // 後続車両の位置計算（先頭から順番に配置）
    const poses: CarPose[] = [];
    for (let i = 0; i < CAR_COUNT; i++) {
      let back = progressDist - i * CAR_SPACING;
      back = wrap(back, L);

      let dd = back;
      let j = 0;
      for (; j < store.rails.length; j++) {
        const seg = segmentLength(store.rails[j]);
        if (dd <= seg) break;
        dd -= seg;
      }

      const sl = segmentLength(store.rails[j] || store.rails[0]);
      const tt = Math.max(0, Math.min(1, dd / (sl || 1)));
      const pose = getPoseOnRail(store.rails[j] || store.rails[0], tt);

      // ピッチ角度のスムージング（レール境界での急激な変化を防ぐ）
      const prev = store.carTransforms[i];
      const PITCH_LERP = 0.08;
      const smoothedPitch = prev ? angleLerp(prev.rotation[0], pose.rotation[0], PITCH_LERP) : pose.rotation[0];
      poses.push({ position: pose.position, rotation: [smoothedPitch, pose.rotation[1], pose.rotation[2]] });
    }
    store.carTransforms = poses;

    // カメラ追従用に先頭車両の位置・回転を配信
    const currentRail = store.rails[idx] || store.rails[0];
    const secondCarPosition = poses.length >= 2 ? poses[1].position : undefined;

    // 距離ベース先読み: 先頭車両から LOOK_AHEAD_DIST 先の接線方向を取得
    const LOOK_AHEAD_DIST = 1.5;
    let lookAheadYaw: number | undefined;
    {
      const laDist = wrap(progressDist + LOOK_AHEAD_DIST, L);
      let ld = laDist;
      let lidx = 0;
      for (; lidx < store.rails.length; lidx++) {
        const seg = segmentLength(store.rails[lidx]);
        if (ld <= seg) break;
        ld -= seg;
      }
      const laRail = store.rails[lidx] || store.rails[0];
      const lsl = segmentLength(laRail);
      const lt = Math.max(0, Math.min(1, ld / (lsl || 1)));
      const laPose = getPoseOnRail(laRail, lt);
      lookAheadYaw = laPose.rotation[1] - Math.PI;
    }

    emitTrainPose({
      position: lead.position,
      rotation: [lead.rotation[0], lead.rotation[1] - Math.PI, lead.rotation[2]],
      railType: currentRail?.type,
      curveDirection: currentRail && "direction" in currentRail ? currentRail.direction : undefined,
      secondCarPosition,
      lookAheadYaw,
    });
  };

  // Animation loop
  const loop = () => {
    if (store.trainRunning && store.canRunTrain) {
      stepTrain();
    }

    animId = requestAnimationFrame(loop);
  };

  // Public methods
  const start = () => {
    if (animId === null && typeof window !== "undefined") {
      loop();
    }
  };

  const stop = () => {
    if (animId !== null) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  };

  const reset = () => {
    store.carTransforms = [...initialPose];
    progressDist = 0;
  };

  // Watch trainKey for reset (replaces resetTrain callback)
  watch(() => store.trainKey, () => {
    reset();
  });

  // Auto-start if window is available
  start();

  // Cleanup on unmount
  onUnmounted(stop);

  return {
    onTrainPose,
    start,
    stop,
    reset,
  };
}
