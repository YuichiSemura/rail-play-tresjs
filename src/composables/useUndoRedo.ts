import { useGameStore } from "../stores/game";

/**
 * Undo/Redo統合composable
 * ストアの履歴機能を使い、ゲーム状態のスナップショット・復元を管理する
 */
export function useUndoRedo() {
  const store = useGameStore();

  const saveToHistory = () => {
    store.saveToHistory();
  };

  const handleUndo = () => {
    if (!store.canUndo || store.gameMode !== "build") return;

    const currentState = store.getCurrentState();
    store.saveCurrentForRedo(currentState);

    const previousState = store.undo();

    if (previousState) {
      store.isRestoring = true;
      store.restoreState(previousState);
      store.isRestoring = false;
      store.resetGhosts();
      store.resetToOrbit();
      store.incrementTrainKey();
      store.showNotification("操作を元に戻しました", "success");
    }
  };

  const handleRedo = () => {
    if (!store.canRedo || store.gameMode !== "build") return;

    const currentState = store.getCurrentState();
    store.saveCurrentForUndo(currentState);

    const nextState = store.redo();

    if (nextState) {
      store.isRestoring = true;
      store.restoreState(nextState);
      store.isRestoring = false;
      store.resetGhosts();
      store.resetToOrbit();
      store.incrementTrainKey();
      store.showNotification("操作をやり直しました", "success");
    }
  };

  return {
    saveToHistory,
    handleUndo,
    handleRedo,
  };
}
