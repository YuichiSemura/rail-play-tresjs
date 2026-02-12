import { useGameStore } from "../stores/game";
import { useRailsGeometry } from "./useRailsGeometry";
import { RAIL_STRAIGHT_FULL_LENGTH } from "../constants/rail";
import type { Rail, Pose } from "../types/rail";
import type { GameMode } from "../types/common";
import type { TreeData, BuildingData, PierData } from "../types/gameObjects";

/**
 * プリセット線路生成composable
 */
export function usePresets() {
  const store = useGameStore();
  const {
    makeStraight,
    makeSlope,
    makeLeftCurve,
    makeRightCurve,
    makeStation,
    makeCrossing,
    poseFromRailEnd,
  } = useRailsGeometry();

  // オーバル（1直線 + 左半円 + 1直線 + 左半円 = 計10本）
  const createOvalPreset = (straightLength?: number) => {
    store.saveToHistory();
    store.rails = [];
    store.isRailsLocked = false;
    store.gameMode = "build";

    const straightL =
      typeof straightLength === "number" && !Number.isNaN(straightLength)
        ? straightLength
        : RAIL_STRAIGHT_FULL_LENGTH;
    let theta = 0;
    let current: [number, number, number] = [0, 0, 0];

    const addStraightOne = () => {
      const rail = makeStraight({ point: current, theta }, straightL);
      store.rails.push(rail);
      const pose = poseFromRailEnd(rail);
      current = pose.point;
      theta = pose.theta;
    };

    const addLeftCurve = () => {
      const rail = makeLeftCurve({ point: current, theta });
      store.rails.push(rail);
      const pose = poseFromRailEnd(rail);
      current = pose.point;
      theta = pose.theta;
    };

    addStraightOne();
    for (let i = 0; i < 4; i++) addLeftCurve();
    addStraightOne();
    for (let i = 0; i < 4; i++) addLeftCurve();

    store.isRailsLocked = true;
    store.gameMode = "run";
  };

  // 左→右の S 字（ループしない）
  const createSCurvePreset = () => {
    store.saveToHistory();
    store.rails = [];
    store.trees = [];
    store.buildings = [];
    store.isRailsLocked = false;
    store.gameMode = "build";

    let theta = 0;
    let current: [number, number, number] = [0, 0, 0];

    const addLeftCurveS = () => {
      const rail = makeLeftCurve({ point: current, theta });
      store.rails.push(rail);
      const pose = poseFromRailEnd(rail);
      current = pose.point;
      theta = pose.theta;
    };

    const addRightCurveS = () => {
      const rail = makeRightCurve({ point: current, theta });
      store.rails.push(rail);
      const pose = poseFromRailEnd(rail);
      current = pose.point;
      theta = pose.theta;
    };

    const addStraightOne = () => {
      const rail = makeStraight({ point: current, theta });
      store.rails.push(rail);
      const pose = poseFromRailEnd(rail);
      current = pose.point;
      theta = pose.theta;
    };

    addLeftCurveS();
    addRightCurveS();
    addLeftCurveS();
    addRightCurveS();
    addLeftCurveS();
    addRightCurveS();
    addLeftCurveS();
    addRightCurveS();
    addRightCurveS();
    addRightCurveS();
    addStraightOne();
    addStraightOne();
    addStraightOne();
    addRightCurveS();
    addRightCurveS();
    addLeftCurveS();
    addRightCurveS();
    addLeftCurveS();
    addRightCurveS();
    addLeftCurveS();
    addRightCurveS();
    addLeftCurveS();
    addRightCurveS();
    addRightCurveS();
    addRightCurveS();
    addStraightOne();
    addStraightOne();
    addStraightOne();
    addRightCurveS();
    addRightCurveS();

    // 線路の周りにオブジェクトを配置
    const placeAround = (count: number, distance: number, y: number) => {
      const items: [number, number, number][] = [];
      const rnd = (min: number, max: number) => Math.random() * (max - min) + min;
      for (let i = 0; i < count; i++) {
        const rail = store.rails[Math.floor(Math.random() * store.rails.length)];
        if (!rail) continue;
        const angle = rnd(0, Math.PI * 2);
        const dx = Math.cos(angle) * distance + rnd(-0.8, 0.8);
        const dz = Math.sin(angle) * distance + rnd(-0.8, 0.8);
        const px = rail.position[0] + dx;
        const pz = rail.position[2] + dz;
        items.push([px, y, pz]);
      }
      return items;
    };

    const treePos = placeAround(5, 3.0, 0);
    const bldPos = placeAround(5, 4.5, 0);
    store.trees = treePos.map((p) => ({ position: p }));
    const colors = ["#7FB3D5", "#85C1E9", "#5DADE2", "#A9CCE3", "#5499C7"];
    store.buildings = bldPos.map((p, idx) => ({
      position: p,
      height: 1.5 + (idx % 3) * 0.6,
      color: colors[idx % colors.length],
    }));
  };

  // 坂上り→坂下り→カーブx4→坂上り→坂下り→カーブx4（ループ）
  const createSlopeUpDownCurvesPreset = () => {
    store.saveToHistory();
    store.rails = [];
    store.isRailsLocked = false;
    store.gameMode = "build";

    let pose: Pose = { point: [0, 0, 0], theta: 0 };

    const add = (r: Rail) => {
      store.rails.push(r);
      pose = poseFromRailEnd(r);
    };

    add(makeSlope(pose, true));
    add(makeSlope(pose, true));
    add(makeStraight(pose));
    add(makeStation(pose));
    add(makeStraight(pose));
    add(makeSlope(pose, false));
    add(makeSlope(pose, false));
    for (let i = 0; i < 2; i++) add(makeLeftCurve(pose));
    add(makeStation(pose));
    for (let i = 0; i < 2; i++) add(makeLeftCurve(pose));
    add(makeSlope(pose, true));
    add(makeSlope(pose, true));
    add(makeStraight(pose));
    add(makeStation(pose));
    add(makeStraight(pose));
    add(makeSlope(pose, false));
    add(makeSlope(pose, false));
    for (let i = 0; i < 2; i++) add(makeLeftCurve(pose));
    add(makeCrossing(pose));
    for (let i = 0; i < 2; i++) add(makeLeftCurve(pose));

    store.isRailsLocked = true;
    store.gameMode = "run";
  };

  // JSONファイルからプリセットデータをロード
  const loadCurveSlopePreset = async () => {
    try {
      const presetModule = await import("../data/curve_slope_preset.json");
      const presetData = presetModule.default;

      store.rails = [];
      store.trees = [];
      store.buildings = [];
      store.piers = [];
      store.isRailsLocked = false;
      store.gameMode = "build";

      if (presetData.rails && Array.isArray(presetData.rails)) {
        store.rails = presetData.rails as Rail[];
      }
      if (presetData.trees && Array.isArray(presetData.trees)) {
        store.trees = presetData.trees as TreeData[];
      }
      if (presetData.buildings && Array.isArray(presetData.buildings)) {
        store.buildings = presetData.buildings as BuildingData[];
      }
      if (presetData.piers && Array.isArray(presetData.piers)) {
        store.piers = presetData.piers as PierData[];
      }
      if (presetData.isRailsLocked) {
        store.isRailsLocked = presetData.isRailsLocked;
      }
      if (presetData.gameMode) {
        store.gameMode = presetData.gameMode as GameMode;
      }

      store.resetGhosts();
      store.resetToOrbit();
      store.incrementTrainKey();

      const totalItems =
        store.rails.length + store.trees.length +
        store.buildings.length + store.piers.length;
      store.showNotification(`曲線スローププリセットを読み込みました（${totalItems}個のオブジェクト）`, "success");
      store.clearHistory();
    } catch (error) {
      console.error("プリセット読み込みエラー:", error);
      store.showNotification("プリセットの読み込みに失敗しました", "error");
    }
  };

  return {
    createOvalPreset,
    createSCurvePreset,
    createSlopeUpDownCurvesPreset,
    loadCurveSlopePreset,
  };
}
