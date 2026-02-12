import { ref, computed } from "vue";
import { defineStore } from "pinia";
import type { Rail } from "../types/rail";
import type { GameMode } from "../types/common";
import type {
  TreeData,
  BuildingData,
  PierData,
  TrainCustomization,
  ToolType,
  HistoryState,
} from "../types/gameObjects";
import { CAR_SPACING, CAR_COUNT, HEIGHT_OFFSET } from "../constants/train";

export type CameraMode = "orbit" | "front" | "follow";

export type CarPose = {
  position: [number, number, number];
  rotation: [number, number, number];
};

const ORBIT_INITIAL_POSITION: [number, number, number] = [15, 8, 15];
const ORBIT_INITIAL_ROTATION: [number, number, number] = [0, 0, 0];

const MAX_HISTORY_SIZE = 50;

const makeInitialCarPoses = (): CarPose[] =>
  Array.from({ length: CAR_COUNT }, (_, i) => ({
    position: [-(i * CAR_SPACING), HEIGHT_OFFSET, 0] as [number, number, number],
    rotation: [0, Math.PI / 2, 0] as [number, number, number],
  }));

/**
 * 中央ゲームストア
 * 全ゲーム状態を集約し、composable とコンポーネントが直接参照する single source of truth
 */
export const useGameStore = defineStore("game", () => {
  // ============================
  // ゲームオブジェクト
  // ============================
  const rails = ref<Rail[]>([]);
  const trees = ref<TreeData[]>([]);
  const buildings = ref<BuildingData[]>([]);
  const piers = ref<PierData[]>([]);

  // ============================
  // ゲーム制御
  // ============================
  const gameMode = ref<GameMode>("build");
  const selectedTool = ref<ToolType>("none");
  const isRailsLocked = ref(false);
  const currentTitle = ref("");
  const isRestoring = ref(false);
  const helpDialog = ref(false);

  // ============================
  // 列車
  // ============================
  const trainRunning = ref(false);
  const trainSpeed = ref(1.0);
  const trainKey = ref(0);
  const trainCustomization = ref<TrainCustomization>({
    bodyColor: "#2E86C1",
    roofColor: "#1B4F72",
    windowColor: "#85C1E9",
    frontWindowColor: "#F7DC6F",
    wheelColor: "#2C2C2C",
  });

  // ============================
  // カメラ
  // ============================
  const cameraMode = ref<CameraMode>("orbit");
  const cameraPosition = ref<[number, number, number]>([...ORBIT_INITIAL_POSITION]);
  const cameraRotation = ref<[number, number, number]>([...ORBIT_INITIAL_ROTATION]);
  const followTarget = ref<[number, number, number]>([0, 0, 0]);

  // ============================
  // ゴーストプレビュー
  // ============================
  const lastPointer = ref<{ x: number; z: number } | null>(null);
  const placementYaw = ref(0);
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
  const pierCandidates = ref<
    Array<{
      position: [number, number, number];
      height: number;
      rotation: [number, number, number];
    }>
  >([]);

  // ============================
  // 列車表示
  // ============================
  const carTransforms = ref<CarPose[]>(makeInitialCarPoses());

  // ============================
  // 通知（旧 useNotification）
  // ============================
  const snackbar = ref(false);
  const snackbarText = ref("");
  const snackbarColor = ref("success");
  const confirmDialog = ref(false);
  const confirmTitle = ref("");
  const confirmMessage = ref("");
  const confirmAction = ref<(() => void) | null>(null);

  const showNotification = (message: string, color: "success" | "error" | "warning" = "success") => {
    snackbarText.value = message;
    snackbarColor.value = color;
    snackbar.value = true;
  };

  const showConfirmDialog = (title: string, message: string, action: () => void) => {
    confirmTitle.value = title;
    confirmMessage.value = message;
    confirmAction.value = action;
    confirmDialog.value = true;
  };

  const executeConfirmAction = () => {
    if (confirmAction.value) {
      confirmAction.value();
    }
    confirmDialog.value = false;
    confirmAction.value = null;
  };

  // ============================
  // 履歴（旧 useHistory）
  // ============================
  const undoStack = ref<HistoryState[]>([]);
  const redoStack = ref<HistoryState[]>([]);
  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  const captureState = (state: HistoryState): HistoryState =>
    JSON.parse(JSON.stringify(state)) as HistoryState;

  const pushHistory = (currentState: HistoryState) => {
    const snapshot = captureState(currentState);
    undoStack.value.push(snapshot);
    if (undoStack.value.length > MAX_HISTORY_SIZE) {
      undoStack.value.shift();
    }
    redoStack.value = [];
  };

  const undo = (): HistoryState | null => {
    if (!canUndo.value) return null;
    return undoStack.value.pop() ?? null;
  };

  const redo = (): HistoryState | null => {
    if (!canRedo.value) return null;
    return redoStack.value.pop() ?? null;
  };

  const saveCurrentForRedo = (currentState: HistoryState) => {
    redoStack.value.push(captureState(currentState));
  };

  const saveCurrentForUndo = (currentState: HistoryState) => {
    undoStack.value.push(captureState(currentState));
  };

  const clearHistory = () => {
    undoStack.value = [];
    redoStack.value = [];
  };

  /** 現在の状態スナップショットを取得 */
  const getCurrentState = (): HistoryState => ({
    rails: rails.value,
    trees: trees.value,
    buildings: buildings.value,
    piers: piers.value,
    gameMode: gameMode.value,
    isRailsLocked: isRailsLocked.value,
    currentTitle: currentTitle.value,
  });

  /** 現在の状態を履歴に保存 */
  const saveToHistory = () => {
    pushHistory(getCurrentState());
  };

  /** 履歴状態を復元 */
  const restoreState = (historyState: HistoryState) => {
    rails.value = historyState.rails;
    trees.value = historyState.trees;
    buildings.value = historyState.buildings;
    piers.value = historyState.piers;
    gameMode.value = historyState.gameMode;
    isRailsLocked.value = historyState.isRailsLocked;
    currentTitle.value = historyState.currentTitle;
  };

  // ============================
  // セーブ情報
  // ============================
  const saveDataInfo = ref<{
    timestamp: number;
    title?: string;
    railsCount: number;
    treesCount: number;
    buildingsCount: number;
    piersCount: number;
  } | null>(null);

  // ============================
  // アクション
  // ============================
  const incrementTrainKey = () => {
    trainKey.value++;
  };

  const resetGhosts = () => {
    ghostRail.value = null;
    ghostTree.value = null;
    ghostBuilding.value = null;
    ghostPier.value = null;
    pierCandidates.value = [];
    lastPointer.value = null;
  };

  const resetToOrbit = () => {
    cameraMode.value = "orbit";
    cameraPosition.value = [...ORBIT_INITIAL_POSITION];
    cameraRotation.value = [...ORBIT_INITIAL_ROTATION];
  };

  /** 周回判定 + 自動モード切替 */
  const isLoopComplete = (): boolean => {
    if (rails.value.length < 3) return false;
    const firstRail = rails.value[0];
    const lastRail = rails.value[rails.value.length - 1];
    const distance = Math.sqrt(
      (firstRail.connections.start[0] - lastRail.connections.end[0]) ** 2 +
        (firstRail.connections.start[1] - lastRail.connections.end[1]) ** 2 +
        (firstRail.connections.start[2] - lastRail.connections.end[2]) ** 2,
    );
    const isConnected = distance < 0.5;
    if (isConnected && !isRailsLocked.value) {
      isRailsLocked.value = true;
      gameMode.value = "run";
    }
    return isConnected;
  };

  const canRunTrain = computed(() => rails.value.length > 2 && isLoopComplete());

  return {
    // ゲームオブジェクト
    rails, trees, buildings, piers,
    // ゲーム制御
    gameMode, selectedTool, isRailsLocked, currentTitle, isRestoring, helpDialog,
    // 列車
    trainRunning, trainSpeed, trainKey, trainCustomization,
    // カメラ
    cameraMode, cameraPosition, cameraRotation, followTarget,
    // ゴーストプレビュー
    lastPointer, placementYaw,
    ghostRail, ghostTree, ghostBuilding, ghostPier, pierCandidates,
    // 列車表示
    carTransforms,
    // 通知
    snackbar, snackbarText, snackbarColor,
    confirmDialog, confirmTitle, confirmMessage,
    showNotification, showConfirmDialog, executeConfirmAction,
    // 履歴
    canUndo, canRedo,
    pushHistory, undo, redo,
    saveCurrentForRedo, saveCurrentForUndo,
    clearHistory, getCurrentState, saveToHistory, restoreState,
    // セーブ情報
    saveDataInfo,
    // アクション
    incrementTrainKey, resetGhosts, resetToOrbit,
    isLoopComplete, canRunTrain,
  };
});
