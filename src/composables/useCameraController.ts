import { ref, watch } from "vue";

export type CameraMode = "orbit" | "front";

export function useCameraController() {
  // State
  const cameraMode = ref<CameraMode>("orbit");
  const cameraPosition = ref<[number, number, number]>([15, 8, 15]);
  const cameraRotation = ref<[number, number, number]>([0, 0, 0]);

  // Constants
  const FRONT_OFFSET: [number, number, number] = [0, 0.07, -0.4]; // 少し後ろから車両前方を見る（yは車両高さに加算）
  const CAM_POS_LERP = 0.18;
  const CAM_ROT_LERP = 0.12;
  const ORBIT_INITIAL_POSITION: [number, number, number] = [15, 8, 15];
  const ORBIT_INITIAL_ROTATION: [number, number, number] = [0, 0, 0];

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

  // Public methods
  const toggleCameraMode = () => {
    cameraMode.value = cameraMode.value === "orbit" ? "front" : "orbit";
  };

  const resetToOrbit = () => {
    cameraMode.value = "orbit";
    cameraPosition.value = [...ORBIT_INITIAL_POSITION];
    cameraRotation.value = [...ORBIT_INITIAL_ROTATION];
  };

  const handleTrainPose = (payload: { position: [number, number, number]; rotation: [number, number, number] }) => {
    if (cameraMode.value !== "front") return;
    
    const [px, py, pz] = payload.position;
    const [, yaw] = payload.rotation;
    
    // yaw に基づきローカルオフセットを回転
    const ox = FRONT_OFFSET[0] * Math.cos(yaw) - FRONT_OFFSET[2] * Math.sin(yaw);
    const oz = FRONT_OFFSET[0] * Math.sin(yaw) + FRONT_OFFSET[2] * Math.cos(yaw);
    const targetPos: [number, number, number] = [px - ox, py + FRONT_OFFSET[1], pz + oz];
    const targetYaw = yaw;

    // 現在値から目標へ補間
    cameraPosition.value = lerp3(cameraPosition.value, targetPos, CAM_POS_LERP);
    cameraRotation.value = [0, angleLerp(cameraRotation.value[1], targetYaw, CAM_ROT_LERP), 0];
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
    
    // Methods
    toggleCameraMode,
    resetToOrbit,
    handleTrainPose,
  };
}