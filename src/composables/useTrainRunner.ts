import { ref, onUnmounted, type Ref } from "vue";
import type { Rail } from "../types/rail";
import { useRailsGeometry } from "./useRailsGeometry";
import { CAR_SPACING, CAR_COUNT, HEIGHT_OFFSET } from "../constants/train";
import { CURVE_SEGMENT_ANGLE as CURVE_ANGLE, RAIL_CURVE_RADIUS } from "../constants/rail";

export type CarPose = { position: [number, number, number]; rotation: [number, number, number] };

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
  /**
   * 全レール長の合計を計算
   * 電車の進行距離計算とループ処理で使用
   */
  const totalRailLength = () => rails.value.reduce((acc, r) => acc + segmentLength(r), 0);

  /**
   * スロープ用のease-in-outイージング関数
   * RailSegment.vueのレール描画と同じアルゴリズムを使用
   *
   * @param t 進行度（0-1）
   * @returns イージング適用後の値（0-1）
   *
   * 【効果】
   * - t=0付近: ゆっくり開始（2次関数的加速）
   * - t=0.5付近: 線形的な変化
   * - t=1付近: ゆっくり終了（2次関数的減速）
   */
  const easeInOutQuad = (t: number) => {
    return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  };

  /**
   * 指定したレールと進行度から車両の位置・回転を計算
   *
   * @param r レールオブジェクト
   * @param t 進行度（0=開始点、1=終了点）
   * @returns 車両の位置と回転角度
   *
   * 【重要な処理】
   * 1. レールタイプごとに異なる軌道計算
   * 2. スロープ・カーブスロープではease-in-outで高度変化を滑らかに
   * 3. 車両の向きは軌道の接線方向に設定
   * 4. ピッチ角度は坂道の傾斜に応じて計算
   */
  const getPoseOnRail = (r: Rail, t: number): CarPose => {
    if (r.type === "straight" || r.type === "station" || r.type === "crossing") {
      // 直線レール系の処理
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

      // 直線補間で位置を計算
      const x = sx + nx * len * t;
      const z = sz + nz * len * t;
      const y = sy + (ey - sy) * t + HEIGHT_OFFSET;

      // 進行方向（ヨー角）と傾斜（ピッチ角）を計算
      const yaw = Math.atan2(nx, nz);
      const pitch = Math.atan2(ey - sy, len);
      return { position: [x, y, z], rotation: [-pitch, yaw, 0] };
    }
    if (r.type === "slope") {
      // スロープの処理（ease-in-outカーブで滑らかな高度変化）
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

      // X, Z座標は直線的に補間（水平移動）
      const x = sx + nx * len * t;
      const z = sz + nz * len * t;

      // Y座標はease-in-outカーブで補間（滑らかな坂道）
      const totalRise = ey - sy;
      const easedT = easeInOutQuad(t);
      const y = sy + totalRise * easedT + HEIGHT_OFFSET;

      const yaw = Math.atan2(nx, nz);

      // ピッチ角度もease-in-outカーブの接線に合わせて計算
      // 微分近似で接線の傾きを求める
      const deltaT = 0.001; // 微小変化量
      const easedT1 = easeInOutQuad(Math.max(0, t - deltaT));
      const easedT2 = easeInOutQuad(Math.min(1, t + deltaT));
      const dydt = ((easedT2 - easedT1) / (2 * deltaT)) * totalRise; // Y方向の変化率
      const dxdt = len; // X方向の変化量は一定
      const pitch = Math.atan2(dydt, dxdt); // 接線の傾斜角

      return { position: [x, y, z], rotation: [-pitch, yaw, 0] };
    }
    if (r.type === "curve-slope") {
      // 曲線スロープの処理（カーブ＋滑らかな高度変化）
      const cx = r.position[0]; // カーブ中心のX座標
      const cz = r.position[2]; // カーブ中心のZ座標
      const theta = r.rotation[1]; // カーブの開始角度
      const sgn = r.direction === "right" ? -1 : 1; // 右カーブは-1、左カーブは1

      // 円弧上の位置を計算
      const phi = -(theta - sgn * (Math.PI / 2) + sgn * CURVE_ANGLE * t);
      const x = cx + Math.cos(phi) * RAIL_CURVE_RADIUS;
      const z = cz + Math.sin(phi) * RAIL_CURVE_RADIUS;

      // 円弧の接線方向を計算（車両の向き）
      const tx = -Math.sin(phi) * sgn;
      const tz = Math.cos(phi) * sgn;
      const yaw = Math.atan2(tx, -tz);

      // Y座標はease-in-outカーブで補間（スロープと同じ処理）
      const startY = r.connections.start[1];
      const endY = r.connections.end[1];
      const totalRise = endY - startY;
      const easedT = easeInOutQuad(t);
      const y = startY + totalRise * easedT + HEIGHT_OFFSET;

      // ピッチ角度の計算（カーブスロープの傾斜）
      const deltaT = 0.001;
      const easedT1 = easeInOutQuad(Math.max(0, t - deltaT));
      const easedT2 = easeInOutQuad(Math.min(1, t + deltaT));
      const dydt = ((easedT2 - easedT1) / (2 * deltaT)) * totalRise; // 高度変化率
      const arcLength = RAIL_CURVE_RADIUS * CURVE_ANGLE; // カーブの弧長
      const dxdt = arcLength; // 弧に沿った距離の変化量
      const pitch = Math.atan2(dydt, dxdt); // 接線の傾斜角

      return { position: [x, y, z], rotation: [-pitch, -yaw, 0] };
    }
    // curve（通常のカーブ、高度変化なし）
    const cx = r.position[0]; // カーブ中心のX座標
    const cz = r.position[2]; // カーブ中心のZ座標
    const theta = r.rotation[1]; // カーブの開始角度
    const sgn = r.direction === "right" ? -1 : 1; // 右カーブは-1、左カーブは1

    // 円弧上の位置を計算
    const phi = -(theta - sgn * (Math.PI / 2) + sgn * CURVE_ANGLE * t);
    const x = cx + Math.cos(phi) * RAIL_CURVE_RADIUS;
    const z = cz + Math.sin(phi) * RAIL_CURVE_RADIUS;

    // 円弧の接線方向を計算（車両の向き）
    const tx = -sgn * Math.sin(phi);
    const tz = sgn * Math.cos(phi);
    const yaw = -Math.atan2(tx, -tz);

    // 高度は変化しない
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

  /**
   * 電車を1ステップ進行させ、全車両の位置・回転を更新
   *
   * 【処理フロー】
   * 1. 進行距離を更新（速度×時間）
   * 2. 全レール長でループ処理（無限走行）
   * 3. 先頭車両の現在レールとレール内進行度を計算
   * 4. 各車両について、車両間隔を考慮して位置を逆算
   * 5. ピッチ角度のスムージング処理
   * 6. カメラ追従用に先頭車両の情報を配信
   */
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

    // 後続車両の位置計算（先頭から順番に配置）
    const poses: CarPose[] = [];
    for (let i = 0; i < CAR_COUNT; i++) {
      // 先頭車両から i 台分の距離を戻す
      let back = progressDist - i * CAR_SPACING;
      back = wrap(back, L); // 全レール長でループ

      // 逆算した距離に対応するレール区間を探索
      let dd = back;
      let j = 0;
      for (; j < rails.value.length; j++) {
        const seg = segmentLength(rails.value[j]);
        if (dd <= seg) break;
        dd -= seg;
      }

      // 該当レール内での進行度を計算
      const sl = segmentLength(rails.value[j] || rails.value[0]);
      const tt = Math.max(0, Math.min(1, dd / (sl || 1)));
      const pose = getPoseOnRail(rails.value[j] || rails.value[0], tt);

      // ピッチ角度のスムージング（レール境界での急激な変化を防ぐ）
      const prev = carTransforms.value[i];
      const PITCH_LERP = 0.08; // 小さいほど滑らか（0.08 = ゆっくり補間）
      const smoothedPitch = prev ? angleLerp(prev.rotation[0], pose.rotation[0], PITCH_LERP) : pose.rotation[0];
      poses.push({ position: pose.position, rotation: [smoothedPitch, pose.rotation[1], pose.rotation[2]] });
    }
    carTransforms.value = poses;

    // カメラ追従用に先頭車両の位置・回転を配信
    // 注意: カメラ向きの調整のため、yaw角度からMath.PIを引いている
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
