import { ref, onUnmounted, type Ref } from "vue";
import type { Rail } from "../types/rail";
import { useRailsGeometry } from "./useRailsGeometry";
import { CAR_SPACING, CAR_COUNT, HEIGHT_OFFSET } from "../constants/train";
import { CURVE_SEGMENT_ANGLE as CURVE_ANGLE, RAIL_CURVE_RADIUS } from "../constants/rail";

export type CarPose = { position: [number, number, number]; rotation: [number, number, number] };

export function useTrainRunner(
  rails: Ref<Rail[]>,
  trainSpeed: Ref<number>,
  running: Ref<boolean>,
  canRun: Ref<boolean>
) {
  const { segmentLength } = useRailsGeometry();

  // State
  const initialPose: CarPose[] = Array.from({ length: CAR_COUNT }, (_, i) => ({
    position: [-(i * CAR_SPACING), HEIGHT_OFFSET, 0],
    rotation: [0, Math.PI / 2, 0],
  }));

  const carTransforms = ref<CarPose[]>(initialPose);
  let progressDist = 0;
  let animId: number | null = null;

  // Helper functions
  const totalRailLength = () => rails.value.reduce((acc, r) => acc + segmentLength(r), 0);

  // スロープ用のease-in-out関数（RailSegment.vueと同じ）
  const easeInOutQuad = (t: number) => {
    return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  };

  const getPoseOnRail = (r: Rail, t: number): CarPose => {
    if (r.type === "straight" || r.type === "station" || r.type === "crossing") {
      // 直線レールの処理（従来通り）
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
      // スロープの処理（ease-in-outカーブ適用）
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
      
      // X, Z座標は直線的に補間
      const x = sx + nx * len * t;
      const z = sz + nz * len * t;
      
      // Y座標はease-in-outカーブで補間
      const totalRise = ey - sy;
      const easedT = easeInOutQuad(t);
      const y = sy + totalRise * easedT + HEIGHT_OFFSET;
      
      const yaw = Math.atan2(nx, nz);
      
      // ピッチ角度もease-in-outカーブの接線に合わせて計算
      const deltaT = 0.001; // 微小変化量
      const easedT1 = easeInOutQuad(Math.max(0, t - deltaT));
      const easedT2 = easeInOutQuad(Math.min(1, t + deltaT));
      const dydt = (easedT2 - easedT1) / (2 * deltaT) * totalRise;
      const dxdt = len; // X方向の変化量は一定
      const pitch = Math.atan2(dydt, dxdt);
      
      return { position: [x, y, z], rotation: [-pitch, yaw, 0] };
    }
    // curve
    const cx = r.position[0];
    const cz = r.position[2];
    const theta = r.rotation[1];
    const sgn = r.type === "curve" && r.direction === "right" ? -1 : 1;
    const phi = theta - sgn * (Math.PI / 2) + sgn * CURVE_ANGLE * t;
    const x = cx + Math.cos(phi) * RAIL_CURVE_RADIUS;
    const z = cz + Math.sin(phi) * RAIL_CURVE_RADIUS;
    const tx = -sgn * Math.sin(phi);
    const tz = sgn * Math.cos(phi);
    const yaw = Math.atan2(tx, tz);
    const y = r.connections.start[1] + HEIGHT_OFFSET;
    return { position: [x, y, z], rotation: [0, yaw, 0] };
  };

  // Emit for train pose updates (for camera following)
  const trainPoseCallbacks: Array<
    (pose: { position: [number, number, number]; rotation: [number, number, number] }) => void
  > = [];

  const onTrainPose = (
    callback: (pose: { position: [number, number, number]; rotation: [number, number, number] }) => void
  ) => {
    trainPoseCallbacks.push(callback);
    return () => {
      const index = trainPoseCallbacks.indexOf(callback);
      if (index > -1) trainPoseCallbacks.splice(index, 1);
    };
  };

  const emitTrainPose = (pose: { position: [number, number, number]; rotation: [number, number, number] }) => {
    trainPoseCallbacks.forEach((callback) => callback(pose));
  };

  // 進行を1ステップ進め、carTransforms を更新
  const stepTrain = () => {
    const L = totalRailLength();
    if (L <= 0) return;
    // 以前のセマンティクス維持
    const avgSegLen = rails.value.length > 0 ? L / rails.value.length : 1;
    progressDist += trainSpeed.value * 0.008 * avgSegLen;
    const wrap = (v: number, m: number) => ((v % m) + m) % m;
    progressDist = wrap(progressDist, L);

    // 進行距離に対応する区間を走査
    let d = progressDist;
    let idx = 0;
    for (; idx < rails.value.length; idx++) {
      const seg = segmentLength(rails.value[idx]);
      if (d <= seg) break;
      d -= seg;
    }
    const segLen = segmentLength(rails.value[idx] || rails.value[0]);
    const t = Math.max(0, Math.min(1, d / (segLen || 1)));
    const lead = getPoseOnRail(rails.value[idx] || rails.value[0], t);

    // 後続車
    const poses: CarPose[] = [];
    for (let i = 0; i < CAR_COUNT; i++) {
      // 先頭から i 台分の距離を戻す
      let back = progressDist - i * CAR_SPACING;
      back = wrap(back, L);
      // 区間再走査
      let dd = back;
      let j = 0;
      for (; j < rails.value.length; j++) {
        const seg = segmentLength(rails.value[j]);
        if (dd <= seg) break;
        dd -= seg;
      }
      const sl = segmentLength(rails.value[j] || rails.value[0]);
      const tt = Math.max(0, Math.min(1, dd / (sl || 1)));
      const pose = getPoseOnRail(rails.value[j] || rails.value[0], tt);
      // ピッチのみスムージングして、境目で急に角度が変わらないようにする
      const prev = carTransforms.value[i];
      const PITCH_LERP = 0.08; // 0-1 小さいほどなめらか（以前: 0.25 -> よりゆっくり補間）
      const smoothedPitch = prev ? angleLerp(prev.rotation[0], pose.rotation[0], PITCH_LERP) : pose.rotation[0];
      poses.push({ position: pose.position, rotation: [smoothedPitch, pose.rotation[1], pose.rotation[2]] });
    }
    carTransforms.value = poses;

    // Emit train pose for camera following
    emitTrainPose({
      position: lead.position,
      rotation: [lead.rotation[0], lead.rotation[1] - Math.PI, lead.rotation[2]],
    });
  };

  const angleLerp = (current: number, target: number, t: number) => {
    let delta = target - current;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return current + delta * t;
  };

  // Animation loop
  const loop = () => {
    if (running.value && canRun.value) {
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
    carTransforms.value = [...initialPose];
    progressDist = 0;
  };

  // Auto-start if window is available
  start();

  // Cleanup on unmount
  onUnmounted(stop);

  return {
    carTransforms,
    onTrainPose,
    start,
    stop,
    reset,
  };
}
