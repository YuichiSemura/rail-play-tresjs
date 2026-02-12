import { ref, watch } from "vue";
import { useGameStore, type CameraMode } from "../stores/game";

export type { CameraMode };

/**
 * カメラ制御composable
 * ストアのカメラ状態を読み書きし、補間・先読みロジックを管理する
 */
export function useCameraController() {
  const store = useGameStore();

  // 内部状態（ストアに含めない）
  const frontLookPitch = ref(0);
  const frontLookYaw = ref(0);
  const isFrontLookActive = ref(false);

  // Constants
  const FRONT_OFFSET: [number, number, number] = [0, 0.15, -0.85];
  const CAM_POS_LERP = 0.18;
  const CAM_ROT_LERP = 0.12;
  const MAX_LOOK = Math.PI / 4;
  const LOOK_SENSITIVITY_X = 0.002;
  const LOOK_SENSITIVITY_Y = 0.002;

  // Helper functions
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const lerp3 = (
    a: [number, number, number],
    b: [number, number, number],
    t: number,
  ): [number, number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

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
    frontLookYaw.value = clamp(frontLookYaw.value + dx * LOOK_SENSITIVITY_X, -MAX_LOOK, MAX_LOOK);
    frontLookPitch.value = clamp(
      frontLookPitch.value + dy * LOOK_SENSITIVITY_Y,
      -MAX_LOOK,
      MAX_LOOK,
    );
  };
  const endFrontLook = () => {
    isFrontLookActive.value = false;
  };

  // Public methods
  const toggleCameraMode = () => {
    if (store.cameraMode === "orbit") {
      store.cameraMode = "front";
    } else if (store.cameraMode === "front") {
      store.cameraMode = "follow";
    } else {
      store.cameraMode = "orbit";
    }
  };

  // 距離ベース先読み方式: 現在位置から一定距離先の接線方向をサンプリングしてカメラ方向に利用

  //　フロントカメラとフォローカメラの処理
  const handleTrainPose = (payload: {
    position: [number, number, number];
    rotation: [number, number, number];
    railType?: string;
    curveDirection?: string;
    secondCarPosition?: [number, number, number];
    lookAheadYaw?: number;
  }) => {
    // フォローモード: 2両目を注視点として設定
    if (store.cameraMode === "follow" && payload.secondCarPosition) {
      store.followTarget = payload.secondCarPosition;
      return;
    }

    if (store.cameraMode !== "front") return;

    const [px, py, pz] = payload.position;
    const [pitch, yaw] = payload.rotation;

    // yaw に基づきローカルオフセットを回転
    const ox = FRONT_OFFSET[0] * Math.cos(yaw) - FRONT_OFFSET[2] * Math.sin(yaw);
    const oz = FRONT_OFFSET[0] * Math.sin(yaw) + FRONT_OFFSET[2] * Math.cos(yaw);
    const targetPos: [number, number, number] = [px - ox, py + FRONT_OFFSET[1], pz + oz];

    // 距離ベース先読み方式
    const LOOK_AHEAD_BLEND = 0.6;
    const BLENDED_YAW_SMOOTH = 0.12;

    let blendedYaw = yaw;
    if (payload.lookAheadYaw !== undefined) {
      let dy = payload.lookAheadYaw - yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      blendedYaw = yaw + dy * LOOK_AHEAD_BLEND;
    }

    // スムージング（急激な方向変化を抑制）
    if ((handleTrainPose as any)._smoothedYaw === undefined) {
      (handleTrainPose as any)._smoothedYaw = blendedYaw;
    } else {
      const prev = (handleTrainPose as any)._smoothedYaw as number;
      let d = blendedYaw - prev;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      (handleTrainPose as any)._smoothedYaw = prev + d * BLENDED_YAW_SMOOTH;
    }
    const stabilizedYaw = (handleTrainPose as any)._smoothedYaw as number;

    const targetYaw = stabilizedYaw + frontLookYaw.value;
    const targetPitch = -pitch + frontLookPitch.value;

    // 現在値から目標へ補間
    store.cameraPosition = lerp3(store.cameraPosition, targetPos, CAM_POS_LERP);
    store.cameraRotation = [
      lerp(store.cameraRotation[0], targetPitch, CAM_ROT_LERP),
      angleLerp(store.cameraRotation[1], targetYaw, CAM_ROT_LERP),
      0,
    ];
  };

  // Watch for camera mode changes to reset to orbit position
  watch(
    () => store.cameraMode,
    (mode) => {
      if (mode === "orbit") {
        store.resetToOrbit();
      }
    },
  );

  return {
    toggleCameraMode,
    handleTrainPose,
    startFrontLook,
    updateFrontLook,
    endFrontLook,
  };
}
