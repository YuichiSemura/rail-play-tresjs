import { ref, computed } from "vue";
import type { Rail } from "../types/rail";
import type { GameMode } from "../types/common";

/**
 * 履歴管理用の状態スナップショット型
 */
export interface HistoryState {
  rails: Rail[];
  trees: Array<{ position: [number, number, number]; rotation?: [number, number, number] }>;
  buildings: Array<{ position: [number, number, number]; height?: number; color?: string; rotation?: [number, number, number] }>;
  piers: Array<{ position: [number, number, number]; height?: number; rotation?: [number, number, number] }>;
  gameMode: GameMode;
  isRailsLocked: boolean;
  currentTitle: string;
}

/**
 * Undo/Redo機能を提供するcomposable
 * スナップショット方式で状態全体を履歴管理します
 */
export function useHistory(maxHistorySize = 50) {
  // 履歴スタック
  const undoStack = ref<HistoryState[]>([]);
  const redoStack = ref<HistoryState[]>([]);

  // Undo/Redo可能かどうか
  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  // 履歴に何ステップあるか
  const historyCount = computed(() => undoStack.value.length);

  /**
   * 現在の状態をキャプチャしてスナップショットを作成
   */
  function captureState(state: HistoryState): HistoryState {
    // deep copyでスナップショット作成
    return JSON.parse(JSON.stringify(state)) as HistoryState;
  }

  /**
   * 新しい操作を履歴に追加
   * @param currentState 現在の状態
   */
  function pushHistory(currentState: HistoryState) {
    const snapshot = captureState(currentState);
    undoStack.value.push(snapshot);

    // 履歴上限を超えたら古いものを削除
    if (undoStack.value.length > maxHistorySize) {
      undoStack.value.shift();
    }

    // 新しい操作が行われたらredoスタックをクリア
    redoStack.value = [];
  }

  /**
   * Undo操作: 1つ前の状態に戻す
   * @returns 復元すべき状態、またはnull（undo不可の場合）
   */
  function undo(): HistoryState | null {
    if (!canUndo.value) {
      return null;
    }

    // undoスタックから1つ前の状態を取り出す
    const previousState = undoStack.value.pop();

    if (!previousState) {
      return null;
    }

    return previousState;
  }

  /**
   * Redo操作: Undoで取り消した操作をやり直す
   * @returns 復元すべき状態、またはnull（redo不可の場合）
   */
  function redo(): HistoryState | null {
    if (!canRedo.value) {
      return null;
    }

    // redoスタックから状態を取り出す
    const nextState = redoStack.value.pop();

    if (!nextState) {
      return null;
    }

    return nextState;
  }

  /**
   * Undo実行前に現在の状態をredoスタックに保存
   */
  function saveCurrentForRedo(currentState: HistoryState) {
    const snapshot = captureState(currentState);
    redoStack.value.push(snapshot);
  }

  /**
   * Redo実行前に現在の状態をundoスタックに保存
   */
  function saveCurrentForUndo(currentState: HistoryState) {
    const snapshot = captureState(currentState);
    undoStack.value.push(snapshot);
  }

  /**
   * 履歴をクリア（全クリアやプリセット読み込み時に使用）
   */
  function clearHistory() {
    undoStack.value = [];
    redoStack.value = [];
  }

  return {
    // 状態
    canUndo,
    canRedo,
    historyCount,

    // メソッド
    pushHistory,
    undo,
    redo,
    saveCurrentForRedo,
    saveCurrentForUndo,
    clearHistory,
  };
}
