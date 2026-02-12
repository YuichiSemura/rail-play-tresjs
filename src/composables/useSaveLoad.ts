import { useGameStore } from "../stores/game";
import { useStorageStore } from "../stores/storage";
import type { Rail } from "../types/rail";
import type { GameMode } from "../types/common";
import type { TreeData, BuildingData, PierData } from "../types/gameObjects";

/**
 * セーブ/ロード/クリア/自動保存を管理するcomposable
 * ストアの状態を直接参照する
 */
export function useSaveLoad() {
  const store = useGameStore();
  const storage = useStorageStore();

  const getSaveDataInfo = () => {
    if (storage.info) return storage.info;
    if (!storage.has()) return null;
    const res = storage.load();
    if (res.ok) return storage.info;
    return null;
  };

  const loadGameData = () => {
    const res = storage.load();
    if (!res.ok) {
      store.showNotification(res.message, "warning");
      return false;
    }
    const saveData = res.data;
    store.rails = saveData.rails || [];
    store.trees = saveData.trees || [];
    store.buildings = saveData.buildings || [];
    store.piers = saveData.piers || [];
    store.gameMode = (saveData.gameMode || "build") as GameMode;
    store.isRailsLocked = saveData.isRailsLocked || false;

    store.incrementTrainKey();
    store.resetGhosts();
    store.resetToOrbit();

    const totalItems =
      store.rails.length + store.trees.length +
      store.buildings.length + store.piers.length;
    store.showNotification(`ゲームデータを復元しました（${totalItems}個のオブジェクト）`, "success");
    store.saveDataInfo = storage.info;
    return true;
  };

  const clearAllRails = () => {
    store.rails = [];
    store.trees = [];
    store.buildings = [];
    store.piers = [];
    store.isRailsLocked = false;
    store.gameMode = "build";
    store.trainRunning = false;
    store.incrementTrainKey();
    store.resetGhosts();
    store.resetToOrbit();
    store.clearHistory();
  };

  /** 保存ペイロードを組み立てる共通ヘルパー */
  const buildPayload = () => ({
    title: store.currentTitle || undefined,
    rails: store.rails,
    trees: store.trees,
    buildings: store.buildings,
    piers: store.piers,
    gameMode: store.gameMode,
    isRailsLocked: store.isRailsLocked,
  });

  /** 保存確認メッセージの組み立て */
  const buildSaveMessage = (
    slotLabel: string,
    existingData: { timestamp: number; title?: string; railsCount: number; treesCount: number; buildingsCount: number; piersCount: number } | null,
  ) => {
    let message = `現在のデータを${slotLabel}に保存しますか？<br><br>`;
    message += "<strong>保存予定のデータ:</strong><br>";
    if (store.currentTitle) {
      message += `・タイトル: "${store.currentTitle}"<br>`;
    }
    message += `・線路: ${store.rails.length}本<br>`;
    message += `・木: ${store.trees.length}本<br>`;
    message += `・ビル: ${store.buildings.length}本<br>`;
    message += `・橋脚: ${store.piers.length}本<br>`;

    if (existingData) {
      message += `<br><strong>既存の${slotLabel}データ（上書きされます）:</strong><br>`;
      message += `・保存日時: ${new Date(existingData.timestamp).toLocaleString()}<br>`;
      if (existingData.title) {
        message += `・タイトル: "${existingData.title}"<br>`;
      }
      message += `・線路: ${existingData.railsCount}本、木: ${existingData.treesCount}本、ビル: ${existingData.buildingsCount}本、橋脚: ${existingData.piersCount}本`;
    }
    return message;
  };

  /** ロード確認メッセージの組み立て */
  const buildLoadMessage = (
    slotLabel: string,
    saveInfo: { timestamp: number; title?: string; railsCount: number; treesCount: number; buildingsCount: number; piersCount: number },
  ) => {
    const currentItems =
      store.rails.length + store.trees.length +
      store.buildings.length + store.piers.length;

    let message = `${slotLabel}データを復元しますか？<br><br>`;
    message += "<strong>復元予定のデータ:</strong><br>";
    message += `・保存日時: ${new Date(saveInfo.timestamp).toLocaleString()}<br>`;
    if (saveInfo.title) {
      message += `・タイトル: "${saveInfo.title}"<br>`;
    }
    message += `・線路: ${saveInfo.railsCount}本<br>`;
    message += `・木: ${saveInfo.treesCount}本<br>`;
    message += `・ビル: ${saveInfo.buildingsCount}本<br>`;
    message += `・橋脚: ${saveInfo.piersCount}本<br>`;

    if (currentItems > 0) {
      message += "<br><strong>現在のデータ（破棄されます）:</strong><br>";
      if (store.currentTitle) {
        message += `・タイトル: "${store.currentTitle}"<br>`;
      }
      message += `・線路: ${store.rails.length}本<br>`;
      message += `・木: ${store.trees.length}本<br>`;
      message += `・ビル: ${store.buildings.length}本<br>`;
      message += `・橋脚: ${store.piers.length}本`;
    }
    return message;
  };

  /** ロード後の状態復元共通処理 */
  const restoreFromSaveData = (saveData: {
    rails?: Rail[];
    trees?: TreeData[];
    buildings?: BuildingData[];
    piers?: PierData[];
    gameMode?: string;
    isRailsLocked?: boolean;
    title?: string;
  }) => {
    store.rails = (saveData.rails || []) as Rail[];
    store.trees = (saveData.trees || []) as TreeData[];
    store.buildings = (saveData.buildings || []) as BuildingData[];
    store.piers = (saveData.piers || []) as PierData[];
    store.gameMode = (saveData.gameMode || "build") as GameMode;
    store.isRailsLocked = saveData.isRailsLocked || false;
    store.currentTitle = saveData.title || "";

    store.incrementTrainKey();
    store.resetGhosts();
    store.resetToOrbit();
  };

  const handleSaveManual1 = () => {
    const totalItems =
      store.rails.length + store.trees.length +
      store.buildings.length + store.piers.length;
    if (totalItems === 0) {
      store.showNotification("保存するデータがありません", "warning");
      return;
    }

    const existingData = storage.getManualInfo1();
    const message = buildSaveMessage("保存1", existingData);
    store.showConfirmDialog("保存1への保存確認", message, () => {
      const res = storage.saveManual1(buildPayload());
      store.showNotification(res.message, res.ok ? "success" : "warning");
    });
  };

  const handleSaveManual2 = () => {
    const totalItems =
      store.rails.length + store.trees.length +
      store.buildings.length + store.piers.length;
    if (totalItems === 0) {
      store.showNotification("保存するデータがありません", "warning");
      return;
    }

    const existingData = storage.getManualInfo2();
    const message = buildSaveMessage("保存2", existingData);
    store.showConfirmDialog("保存2への保存確認", message, () => {
      const res = storage.saveManual2(buildPayload());
      store.showNotification(res.message, res.ok ? "success" : "warning");
    });
  };

  const handleLoadManual1 = () => {
    const saveInfo = storage.getManualInfo1();
    if (!saveInfo) {
      store.showNotification("保存1データが見つかりません", "warning");
      return;
    }

    const message = buildLoadMessage("保存1", saveInfo);
    store.showConfirmDialog("保存1データの復元確認", message, () => {
      const res = storage.loadManual1();
      if (!res.ok) {
        store.showNotification(res.message, "warning");
        return;
      }

      restoreFromSaveData(res.data);

      const totalItems =
        store.rails.length + store.trees.length +
        store.buildings.length + store.piers.length;
      store.showNotification(`保存1データを復元しました（${totalItems}個のオブジェクト）`, "success");
    });
  };

  const handleLoadManual2 = () => {
    const saveInfo = storage.getManualInfo2();
    if (!saveInfo) {
      store.showNotification("保存2データが見つかりません", "warning");
      return;
    }

    const message = buildLoadMessage("保存2", saveInfo);
    store.showConfirmDialog("保存2データの復元確認", message, () => {
      const res = storage.loadManual2();
      if (!res.ok) {
        store.showNotification(res.message, "warning");
        return;
      }

      restoreFromSaveData(res.data);

      const totalItems =
        store.rails.length + store.trees.length +
        store.buildings.length + store.piers.length;
      store.showNotification(`保存2データを復元しました（${totalItems}個のオブジェクト）`, "success");
    });
  };

  /** onMounted 内で呼ぶ初期化処理 */
  const initSaveLoad = () => {
    store.saveDataInfo = getSaveDataInfo();

    if (storage.has()) {
      loadGameData();
    }

    return storage.startAutoSave(
      () => ({
        rails: store.rails,
        trees: store.trees,
        buildings: store.buildings,
        piers: store.piers,
        gameMode: store.gameMode,
        isRailsLocked: store.isRailsLocked,
      }),
      { debounceMs: 1500, immediate: false },
    );
  };

  return {
    storage,
    clearAllRails,
    handleSaveManual1,
    handleSaveManual2,
    handleLoadManual1,
    handleLoadManual2,
    initSaveLoad,
  };
}
