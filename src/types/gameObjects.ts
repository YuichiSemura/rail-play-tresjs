import type { Vec3, GameMode } from "./common";
import type { Rail } from "./rail";

export type TreeData = {
  position: Vec3;
  rotation?: Vec3;
};

export type BuildingData = {
  position: Vec3;
  height?: number;
  color?: string;
  rotation?: Vec3;
};

export type PierData = {
  position: Vec3;
  height?: number;
  rotation?: Vec3;
};

export type TrainCustomization = {
  bodyColor: string;
  roofColor: string;
  windowColor: string;
  frontWindowColor: string;
  wheelColor: string;
};

export type ToolType =
  | "none"
  | "straight"
  | "curve"
  | "slope"
  | "curve-slope-up"
  | "curve-slope-down"
  | "tree"
  | "building"
  | "pier"
  | "station"
  | "crossing"
  | "delete";

/** ゲームオブジェクトのRefをまとめた型 */
export interface GameObjects {
  rails: import("vue").Ref<Rail[]>;
  trees: import("vue").Ref<TreeData[]>;
  buildings: import("vue").Ref<BuildingData[]>;
  piers: import("vue").Ref<PierData[]>;
}

/** Undo/Redo 用スナップショット */
export interface HistoryState {
  rails: Rail[];
  trees: TreeData[];
  buildings: BuildingData[];
  piers: PierData[];
  gameMode: GameMode;
  isRailsLocked: boolean;
  currentTitle: string;
}
