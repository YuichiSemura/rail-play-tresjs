import { ref, type Ref } from "vue";
import type { Rail, Pose } from "../types/rail";
import { useRailsGeometry } from "./useRailsGeometry";
import { CURVE_SEGMENT_ANGLE as CURVE_ANGLE, RAIL_STRAIGHT_HALF_LENGTH, RAIL_SLOPE_RUN } from "../constants/rail";

export interface GhostPreviewState {
  lastPointer: Ref<{ x: number; z: number } | null>;
  placementYaw: Ref<number>;
  ghostRail: Ref<Rail | null>;
  ghostTree: Ref<{ position: [number, number, number]; rotation?: [number, number, number] } | null>;
  ghostBuilding: Ref<{
    position: [number, number, number];
    height?: number;
    color?: string;
    rotation?: [number, number, number];
  } | null>;
  ghostPier: Ref<{
    position: [number, number, number];
    height?: number;
    rotation?: [number, number, number];
  } | null>;
}

export function useGhostPreview(
  rails: Ref<Rail[]>,
  selectedTool: Ref<string>,
  gameMode: Ref<string>,
  createRail: (x: number, z: number, type: "straight" | "curve" | "slope" | "station") => Rail
) {
  const { makeLeftCurve, makeRightCurve } = useRailsGeometry();

  // State
  const lastPointer = ref<{ x: number; z: number } | null>(null);
  const placementYaw = ref(0); // radians
  const ghostRail = ref<Rail | null>(null);
  const ghostTree = ref<{ position: [number, number, number]; rotation?: [number, number, number] } | null>(null);
  const ghostBuilding = ref<{
    position: [number, number, number];
    height?: number;
    color?: string;
    rotation?: [number, number, number];
  } | null>(null);
  const ghostPier = ref<{
    position: [number, number, number];
    height?: number;
    rotation?: [number, number, number];
  } | null>(null);

  // Helper functions
  const snapToGridSize = (position: number, size: number): number => {
    return Math.round(position / size) * size;
  };

  const clampYawStep = (rad: number) => {
    const twoPi = Math.PI * 2;
    const normalized = ((rad % twoPi) + twoPi) % twoPi; // wrap [0, 2π)
    // 45°単位へスナップ
    const step = Math.PI / 4;
    return Math.round(normalized / step) * step;
  };

  // Public methods
  const rotatePlacement = (deltaSteps: number) => {
    const step = Math.PI / 4;
    placementYaw.value = clampYawStep(placementYaw.value + deltaSteps * step);
    updateGhost();
  };

  const resetPlacementRotation = () => {
    placementYaw.value = 0;
    updateGhost();
  };

  const updateGhost = () => {
    // すべて初期化
    ghostRail.value = null;
    ghostTree.value = null;
    ghostBuilding.value = null;
    ghostPier.value = null;

    if (gameMode.value !== "build") return;

    // レールのゴースト
    if (
      selectedTool.value === "straight" ||
      selectedTool.value === "curve" ||
      selectedTool.value === "slope" ||
      selectedTool.value === "station"
    ) {
      if (rails.value.length === 0) {
        if (!lastPointer.value) return; // 初回は向き決めに必要
        // 初回のみ、placementYaw を反映
        const desired = clampYawStep(placementYaw.value);
        const gr = createRail(
          lastPointer.value.x,
          lastPointer.value.z,
          selectedTool.value as "straight" | "curve" | "slope"
        );
        if (gr.type === "straight" || gr.type === "slope" || gr.type === "station") {
          gr.rotation = [gr.rotation[0], desired, gr.rotation[2]];
          const [ix, iy, iz] = gr.position;
          const len = gr.type === "straight" ? RAIL_STRAIGHT_HALF_LENGTH : RAIL_SLOPE_RUN / 2;
          const dirX = Math.cos(-gr.rotation[1]);
          const dirZ = Math.sin(-gr.rotation[1]);
          const startY = gr.connections.start[1];
          const endY = gr.connections.end[1];
          if (gr.type === "straight") {
            gr.connections = {
              start: [ix - dirX * len, iy, iz - dirZ * len],
              end: [ix + dirX * len, iy, iz + dirZ * len],
            };
          } else {
            gr.connections = {
              start: [ix - dirX * len, startY, iz - dirZ * len],
              end: [ix + dirX * len, endY, iz + dirZ * len],
            };
          }
        } else if (gr.type === "curve") {
          // 望みの接線角に近い方向（左/右）を選択
          const base = gr.rotation[1];
          const leftYaw = base + CURVE_ANGLE;
          const rightYaw = base - CURVE_ANGLE;
          const norm = (a: number) => {
            let d = a;
            while (d > Math.PI) d -= 2 * Math.PI;
            while (d < -Math.PI) d += 2 * Math.PI;
            return d;
          };
          const dL = Math.abs(norm(desired - leftYaw));
          const dR = Math.abs(norm(desired - rightYaw));
          // 再生成して一貫性確保
          const pose: Pose = { point: gr.connections.start, theta: base };
          const chosen = dL <= dR ? makeLeftCurve(pose) : makeRightCurve(pose);
          ghostRail.value = chosen;
          return;
        }
        ghostRail.value = gr;
        return;
      }
      if (selectedTool.value === "straight") {
        console.log("ghost straight");
        ghostRail.value = createRail(0, 0, "straight");
      } else if (selectedTool.value === "curve") {
        if (!lastPointer.value) return;
        ghostRail.value = createRail(lastPointer.value.x, lastPointer.value.z, "curve");
      } else if (selectedTool.value === "slope") {
        if (!lastPointer.value) return;
        ghostRail.value = createRail(lastPointer.value.x, lastPointer.value.z, "slope");
      } else if (selectedTool.value === "station") {
        if (!lastPointer.value) return;
        console.log("ghost station");
        ghostRail.value = createRail(lastPointer.value.x, lastPointer.value.z, "station");
      }
      return;
    }

    // 木のゴースト
    if (selectedTool.value === "tree") {
      if (!lastPointer.value) return;
      const px = snapToGridSize(lastPointer.value.x, 1);
      const pz = snapToGridSize(lastPointer.value.z, 1);
      ghostTree.value = { position: [px, 0, pz], rotation: [0, placementYaw.value, 0] };
      return;
    }

    // ビルのゴースト（標準色・高さ）
    if (selectedTool.value === "building") {
      if (!lastPointer.value) return;
      const px = snapToGridSize(lastPointer.value.x, 1);
      const pz = snapToGridSize(lastPointer.value.z, 1);
      ghostBuilding.value = {
        position: [px, 0, pz],
        height: 1.8,
        color: "#7FB3D5",
        rotation: [0, placementYaw.value, 0],
      };
      return;
    }

    if (selectedTool.value === "pier") {
      if (!lastPointer.value) return;
      const px = snapToGridSize(lastPointer.value.x, 1);
      const pz = snapToGridSize(lastPointer.value.z, 1);
      ghostPier.value = { position: [px, 0, pz], height: 0.7, rotation: [0, placementYaw.value, 0] };
      return;
    }
  };

  const updatePointer = (x: number, z: number) => {
    lastPointer.value = { x, z };
    updateGhost();
  };

  const resetGhosts = () => {
    ghostRail.value = null;
    ghostTree.value = null;
    ghostBuilding.value = null;
    ghostPier.value = null;
    lastPointer.value = null;
  };

  const getPlacementRotation = () => placementYaw.value;

  return {
    // State
    lastPointer,
    placementYaw,
    ghostRail,
    ghostTree,
    ghostBuilding,
    ghostPier,

    // Methods
    rotatePlacement,
    resetPlacementRotation,
    updateGhost,
    updatePointer,
    resetGhosts,
    getPlacementRotation,
  };
}
