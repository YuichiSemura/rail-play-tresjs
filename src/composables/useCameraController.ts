import { ref, watch } from "vue";

export type CameraMode = "orbit" | "front" | "follow";

export function useCameraController() {
  // State
  const cameraMode = ref<CameraMode>("orbit");
  const cameraPosition = ref<[number, number, number]>([15, 8, 15]);
  const cameraRotation = ref<[number, number, number]>([0, 0, 0]);
  // Front-camera look offsets (pitch: X, yaw: Y)
  const frontLookPitch = ref(0); // radians
  const frontLookYaw = ref(0); // radians
  const isFrontLookActive = ref(false);
  // Follow mode target position (2両目の位置)
  const followTarget = ref<[number, number, number]>([0, 0, 0]);

  // Constants
  const FRONT_OFFSET: [number, number, number] = [0, 0.15, -0.85]; // ごく少し前寄りから撮る（yは車両高さに加算）
  const CAM_POS_LERP = 0.18;
  const CAM_ROT_LERP = 0.12;
  const ORBIT_INITIAL_POSITION: [number, number, number] = [15, 8, 15];
  const ORBIT_INITIAL_ROTATION: [number, number, number] = [0, 0, 0];
  const MAX_LOOK = Math.PI / 4; // 約45°
  const LOOK_SENSITIVITY_X = 0.002; // yaw 1px あたりのラジアン
  const LOOK_SENSITIVITY_Y = 0.002; // pitch 1px あたりのラジアン

  // Helper functions
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const lerp3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ];

  const angleLerp = (current: number, target: number, t: number) => {
    let delta = target - current;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return current + delta * t;
  };
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  // Public: front-look controls
  const startFrontLook = () => {
    isFrontLookActive.value = true;
  };
  const updateFrontLook = (dx: number, dy: number) => {
    // dx: 水平ドラッグ（右+）、dy: 垂直ドラッグ（下+）
    // 上へドラッグ（dy<0）でカメラを上に向けるため、pitch は dy をそのまま加算（負方向へ）
    frontLookYaw.value = clamp(frontLookYaw.value + dx * LOOK_SENSITIVITY_X, -MAX_LOOK, MAX_LOOK);
    frontLookPitch.value = clamp(frontLookPitch.value + dy * LOOK_SENSITIVITY_Y, -MAX_LOOK, MAX_LOOK);
  };
  const endFrontLook = () => {
    isFrontLookActive.value = false;
  };

  // Public methods
  const toggleCameraMode = () => {
    if (cameraMode.value === "orbit") {
      cameraMode.value = "front";
    } else if (cameraMode.value === "front") {
      cameraMode.value = "follow";
    } else {
      cameraMode.value = "orbit";
    }
  };

  const resetToOrbit = () => {
    cameraMode.value = "orbit";
    cameraPosition.value = [...ORBIT_INITIAL_POSITION];
    cameraRotation.value = [...ORBIT_INITIAL_ROTATION];
  };

  // （旧仕様）カーブ内側固定角度調整は廃止 -> レール終端方向の先読み補間方式に変更

  //　フロントカメラとフォローカメラの処理
  const handleTrainPose = (payload: {
    position: [number, number, number];
    rotation: [number, number, number];
    railType?: string;
    curveDirection?: string; // 互換性のため残しつつ未使用
    secondCarPosition?: [number, number, number];
    currentEndYaw?: number; // 現在レールを t=1 まで進んだ場合の接線方向
    nextEndYaw?: number; // 次レールの終端接線方向（無い場合は undefined）
    segmentProgress?: number; // 現在レール内進行度 (0-1)
  }) => {
    // フォローモード: 2両目を注視点として設定
    if (cameraMode.value === "follow" && payload.secondCarPosition) {
      followTarget.value = payload.secondCarPosition;
      return;
    }

    if (cameraMode.value !== "front") return;

    const [px, py, pz] = payload.position;
    const [pitch, yaw] = payload.rotation; // スロープでのピッチ角度も取得

    // yaw に基づきローカルオフセットを回転
    const ox = FRONT_OFFSET[0] * Math.cos(yaw) - FRONT_OFFSET[2] * Math.sin(yaw);
    const oz = FRONT_OFFSET[0] * Math.sin(yaw) + FRONT_OFFSET[2] * Math.cos(yaw);
    const targetPos: [number, number, number] = [px - ox, py + FRONT_OFFSET[1], pz + oz];

    // 新方式: 現在レール終端方向(currentEndYaw) と 次レール終端方向(nextEndYaw) を利用した先読み補間
    // currentEndYaw / nextEndYaw は列車本来の yaw 系（後で rotation[1]-Math.PI を使っているため、同じ基準に合わせる）
    const currentEndYaw = payload.currentEndYaw !== undefined ? payload.currentEndYaw - Math.PI : undefined;
    const nextEndYawRaw = payload.nextEndYaw !== undefined ? payload.nextEndYaw - Math.PI : undefined;
    const nextEndYaw = nextEndYawRaw ?? currentEndYaw;

    // （新）レール一本を使ってゆっくり方向転換: segmentProgress で先読み寄せを制御
    const tSeg = clamp(payload.segmentProgress ?? 0, 0, 1);
    // easeInOut (smoothstep) で序盤ゆっくり終盤加速
    const ease = tSeg * tSeg * (3 - 2 * tSeg);
    const MAX_LOOK_AHEAD_BLEND = 0.85; // 終端で最大どれだけ次レール終端方向へ寄せるか
    const dynamicLookAheadBlend = MAX_LOOK_AHEAD_BLEND * ease;

    let lookAheadYaw: number | undefined;
    if (currentEndYaw !== undefined && nextEndYaw !== undefined) {
      let delta = nextEndYaw - currentEndYaw;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      lookAheadYaw = currentEndYaw + delta * dynamicLookAheadBlend;
    }

    const CAMERA_YAW_BLEND = 1.2; // 現在接線 yaw と look-ahead のブレンド（1未満で過剰先行を防止）
    let blendedYaw = yaw;
    if (lookAheadYaw !== undefined) {
      let dy = lookAheadYaw - yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      blendedYaw = yaw + dy * CAMERA_YAW_BLEND; // 先読み方向へ寄せる
    }

    // 追加スムージング（レール境界で blendedYaw が急変しないように）
    const BLENDED_YAW_SMOOTH = 0.05;
    if ((handleTrainPose as any)._smoothedYaw === undefined) {
      (handleTrainPose as any)._smoothedYaw = blendedYaw;
    } else {
      let prev = (handleTrainPose as any)._smoothedYaw as number;
      let d = blendedYaw - prev;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      (handleTrainPose as any)._smoothedYaw = prev + d * BLENDED_YAW_SMOOTH;
    }
    const stabilizedYaw = (handleTrainPose as any)._smoothedYaw as number;

    // 電車の進行方向（スロープでのピッチ） + ユーザー手動調整 + 先読み補間 + スムージング
    const targetYaw = stabilizedYaw + frontLookYaw.value;
    const targetPitch = -pitch / 3 + frontLookPitch.value; // ピッチは元の傾斜を忠実に（/3 を撤回）

    // 現在値から目標へ補間
    cameraPosition.value = lerp3(cameraPosition.value, targetPos, CAM_POS_LERP);
    cameraRotation.value = [
      lerp(cameraRotation.value[0], targetPitch, CAM_ROT_LERP),
      angleLerp(cameraRotation.value[1], targetYaw, CAM_ROT_LERP),
      0,
    ];

    // ドラッグ終了後の自動リセットは行わない（ユーザー操作のみで維持/変更）
  };

  // Watch for camera mode changes to reset to orbit position
  watch(cameraMode, (mode) => {
    if (mode === "orbit") {
      cameraPosition.value = [...ORBIT_INITIAL_POSITION];
      cameraRotation.value = [...ORBIT_INITIAL_ROTATION];
    }
  });

  return {
    // State
    cameraMode,
    cameraPosition,
    cameraRotation,
    followTarget,

    // Methods
    toggleCameraMode,
    resetToOrbit,
    handleTrainPose,
    startFrontLook,
    updateFrontLook,
    endFrontLook,
  };
}
