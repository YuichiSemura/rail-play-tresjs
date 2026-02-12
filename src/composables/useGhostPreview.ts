import { useGameStore } from "../stores/game";
import { useRailsGeometry } from "./useRailsGeometry";
import { CURVE_SEGMENT_ANGLE as CURVE_ANGLE, RAIL_STRAIGHT_HALF_LENGTH, RAIL_SLOPE_RUN } from "../constants/rail";
import type { Rail, Pose } from "../types/rail";

/**
 * ゴーストプレビューcomposable
 * ストアの状態を直接参照し、ゴースト・橋脚候補を管理する
 */
export function useGhostPreview(
  createRail: (
    x: number,
    z: number,
    type: "straight" | "curve" | "slope" | "curve-slope-up" | "curve-slope-down" | "station" | "crossing"
  ) => Rail
) {
  const store = useGameStore();
  const { makeLeftCurve, makeRightCurve, makeLeftCurveSlope, makeRightCurveSlope, generatePierCandidates } = useRailsGeometry();

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
    store.placementYaw = clampYawStep(store.placementYaw + deltaSteps * step);
    updateGhost();
  };

  const resetPlacementRotation = () => {
    store.placementYaw = 0;
    updateGhost();
  };

  // 橋脚候補を更新（線路変更時とツール選択時のみ）
  const updatePierCandidates = () => {
    if (store.gameMode !== "build" || store.selectedTool !== "pier") {
      store.pierCandidates = [];
      return;
    }

    const candidates = generatePierCandidates(store.rails);
    store.pierCandidates = candidates.map(candidate => ({
      position: candidate.position,
      height: Math.max(0.7, candidate.railHeight),
      rotation: [0, candidate.rotation, 0] as [number, number, number]
    }));
  };

  const updateGhost = () => {
    // ゴーストのみ初期化（橋脚候補は別途管理）
    store.ghostRail = null;
    store.ghostTree = null;
    store.ghostBuilding = null;
    store.ghostPier = null;

    if (store.gameMode !== "build") return;

    // レールのゴースト
    if (
      store.selectedTool === "straight" ||
      store.selectedTool === "curve" ||
      store.selectedTool === "slope" ||
      store.selectedTool === "curve-slope-up" ||
      store.selectedTool === "curve-slope-down" ||
      store.selectedTool === "station" ||
      store.selectedTool === "crossing"
    ) {
      if (store.rails.length === 0) {
        if (!store.lastPointer) return; // 初回は向き決めに必要
        // 初回のみ、placementYaw を反映
        const desired = clampYawStep(store.placementYaw);
        const gr = createRail(
          store.lastPointer.x,
          store.lastPointer.z,
          store.selectedTool as
            | "straight"
            | "curve"
            | "slope"
            | "curve-slope-up"
            | "curve-slope-down"
            | "station"
            | "crossing"
        );
        if (gr.type === "straight" || gr.type === "slope" || gr.type === "station" || gr.type === "crossing") {
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
          } else if (gr.type === "slope") {
            gr.connections = {
              start: [ix - dirX * len, startY, iz - dirZ * len],
              end: [ix + dirX * len, endY, iz + dirZ * len],
            };
          } else {
            // station/crossing は直線と同一再計算（水平）
            const len2 = RAIL_STRAIGHT_HALF_LENGTH;
            gr.connections = {
              start: [ix - dirX * len2, iy, iz - dirZ * len2],
              end: [ix + dirX * len2, iy, iz + dirZ * len2],
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
          store.ghostRail = chosen;
          return;
        } else if (gr.type === "curve-slope") {
          // curve-slope-up/curve-slope-downの処理
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
          // selectedTool に応じて上り下りを決定
          const ascending = store.selectedTool === "curve-slope-up";
          const chosen = dL <= dR ? makeLeftCurveSlope(pose, ascending) : makeRightCurveSlope(pose, ascending);
          store.ghostRail = chosen;
          return;
        }
        store.ghostRail = gr;
        return;
      }
      if (store.selectedTool === "straight") {
        store.ghostRail = createRail(0, 0, "straight");
      } else if (store.selectedTool === "curve") {
        if (!store.lastPointer) return;
        store.ghostRail = createRail(store.lastPointer.x, store.lastPointer.z, "curve");
      } else if (store.selectedTool === "slope") {
        if (!store.lastPointer) return;
        store.ghostRail = createRail(store.lastPointer.x, store.lastPointer.z, "slope");
      } else if (store.selectedTool === "station") {
        if (!store.lastPointer) return;
        store.ghostRail = createRail(store.lastPointer.x, store.lastPointer.z, "station");
      } else if (store.selectedTool === "crossing") {
        if (!store.lastPointer) return;
        store.ghostRail = createRail(store.lastPointer.x, store.lastPointer.z, "crossing");
      } else if (store.selectedTool === "curve-slope-up") {
        if (!store.lastPointer) return;
        store.ghostRail = createRail(store.lastPointer.x, store.lastPointer.z, "curve-slope-up");
      } else if (store.selectedTool === "curve-slope-down") {
        if (!store.lastPointer) return;
        store.ghostRail = createRail(store.lastPointer.x, store.lastPointer.z, "curve-slope-down");
      }
      return;
    }

    // 木のゴースト
    if (store.selectedTool === "tree") {
      if (!store.lastPointer) return;
      const px = snapToGridSize(store.lastPointer.x, 1);
      const pz = snapToGridSize(store.lastPointer.z, 1);
      store.ghostTree = { position: [px, 0, pz], rotation: [0, store.placementYaw, 0] };
      return;
    }

    // ビルのゴースト（標準色・高さ）
    if (store.selectedTool === "building") {
      if (!store.lastPointer) return;
      const px = snapToGridSize(store.lastPointer.x, 1);
      const pz = snapToGridSize(store.lastPointer.z, 1);
      store.ghostBuilding = {
        position: [px, 0, pz],
        height: 1.8,
        color: "#7FB3D5",
        rotation: [0, store.placementYaw, 0],
      };
      return;
    }

    if (store.selectedTool === "pier") {
      if (!store.lastPointer) return;
      const px = snapToGridSize(store.lastPointer.x, 1);
      const pz = snapToGridSize(store.lastPointer.z, 1);
      store.ghostPier = { position: [px, 0, pz], height: 0.7, rotation: [0, store.placementYaw, 0] };
      return;
    }
  };

  const updatePointer = (x: number, z: number) => {
    store.lastPointer = { x, z };
    updateGhost();
  };

  const getPlacementRotation = () => store.placementYaw;

  return {
    rotatePlacement,
    resetPlacementRotation,
    updateGhost,
    updatePierCandidates,
    updatePointer,
    getPlacementRotation,
  };
}
