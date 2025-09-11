import { defineStore } from "pinia";
import { watch } from "vue";
import type { Rail } from "../types/rail";
import type { Vec3, GameMode } from "../types/common";

// 後続の段階的移行で、既存の保存/復元ロジックをここへ集約していきます。
// まずは最小の状態とアクションのみ用意します。

export type SaveData = {
  version: string;
  timestamp: number;
  title?: string;
  rails: Rail[];
  trees: Array<{ position: Vec3; rotation?: Vec3 }>;
  buildings: Array<{ position: Vec3; height?: number; color?: string; rotation?: Vec3 }>;
  piers: Array<{ position: Vec3; height?: number; rotation?: Vec3 }>;
  gameMode?: GameMode;
  isRailsLocked?: boolean;
};

export type SavePayload = Omit<SaveData, "version" | "timestamp">;

const SAVE_KEY = "rail-play-game-data";
const MANUAL_SAVE_KEY_1 = "rail-play-game-data-manual-1";
const MANUAL_SAVE_KEY_2 = "rail-play-game-data-manual-2";
const SAVE_VERSION = "1.0.0";

export const useStorageStore = defineStore("storage", {
  state: () => ({
    info: null as null | {
      timestamp: number;
      version: string;
      title?: string;
      railsCount: number;
      treesCount: number;
      buildingsCount: number;
      piersCount: number;
    },
    manualInfo1: null as null | {
      timestamp: number;
      version: string;
      title?: string;
      railsCount: number;
      treesCount: number;
      buildingsCount: number;
      piersCount: number;
    },
    manualInfo2: null as null | {
      timestamp: number;
      version: string;
      title?: string;
      railsCount: number;
      treesCount: number;
      buildingsCount: number;
      piersCount: number;
    },
  }),
  actions: {
    save(payload: SavePayload) {
      const total =
        (payload.rails?.length ?? 0) +
        (payload.trees?.length ?? 0) +
        (payload.buildings?.length ?? 0) +
        (payload.piers?.length ?? 0);
      if (total === 0) {
        return { ok: false as const, message: "保存するデータがありません" };
      }

      const data: SaveData = { ...payload, version: SAVE_VERSION, timestamp: Date.now() };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      this.info = {
        timestamp: data.timestamp,
        version: data.version,
        title: data.title,
        railsCount: data.rails?.length ?? 0,
        treesCount: data.trees?.length ?? 0,
        buildingsCount: data.buildings?.length ?? 0,
        piersCount: data.piers?.length ?? 0,
      };
      return { ok: true as const, message: "ゲームデータを保存しました", data };
    },

    load() {
      const str = localStorage.getItem(SAVE_KEY);
      if (!str) return { ok: false as const, message: "保存データが見つかりません" };
      try {
        const data = JSON.parse(str) as SaveData;
        this.info = {
          timestamp: data.timestamp,
          version: data.version,
          title: data.title,
          railsCount: data.rails?.length ?? 0,
          treesCount: data.trees?.length ?? 0,
          buildingsCount: data.buildings?.length ?? 0,
          piersCount: data.piers?.length ?? 0,
        };
        return { ok: true as const, message: "ゲームデータを復元しました", data };
      } catch (e) {
        console.error("Failed to parse save data", e);
        return { ok: false as const, message: "保存データの読み込みに失敗しました" };
      }
    },

    has() {
      return localStorage.getItem(SAVE_KEY) !== null;
    },

    clear() {
      localStorage.removeItem(SAVE_KEY);
      this.info = null;
    },

    /**
     * 自動保存を開始します。返された stop() を呼ぶと解除できます。
     * getPayload はリアクティブな参照から保存対象を組み立てて返してください。
     */
    startAutoSave(getPayload: () => SavePayload, opts?: { debounceMs?: number; immediate?: boolean }) {
      const debounceMs = opts?.debounceMs ?? 1500;
      const immediate = opts?.immediate ?? false;

      let timer: number | undefined;
      const schedule = (payload: SavePayload) => {
        if (timer !== undefined) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          try {
            const result = this.save(payload);
            console.log("Auto save result:", result.message);
          } catch (e) {
            // ここでは通知しない（UI 側で明示保存時のみ通知）
            console.error("Auto save failed", e);
          }
        }, debounceMs);
      };

      const stop = watch(
        () => getPayload(),
        (payload) => schedule(payload),
        { deep: true, immediate }
      );

      return { stop };
    },

    // 手動保存スロット1
    saveManual1(payload: SavePayload) {
      const total =
        (payload.rails?.length ?? 0) +
        (payload.trees?.length ?? 0) +
        (payload.buildings?.length ?? 0) +
        (payload.piers?.length ?? 0);
      if (total === 0) {
        return { ok: false as const, message: "保存するデータがありません" };
      }

      const data: SaveData = { ...payload, version: SAVE_VERSION, timestamp: Date.now() };
      localStorage.setItem(MANUAL_SAVE_KEY_1, JSON.stringify(data));
      this.manualInfo1 = {
        timestamp: data.timestamp,
        version: data.version,
        title: data.title,
        railsCount: data.rails?.length ?? 0,
        treesCount: data.trees?.length ?? 0,
        buildingsCount: data.buildings?.length ?? 0,
        piersCount: data.piers?.length ?? 0,
      };
      return { ok: true as const, message: "ゲームデータを保存1に保存しました", data };
    },

    // 手動保存スロット2
    saveManual2(payload: SavePayload) {
      const total =
        (payload.rails?.length ?? 0) +
        (payload.trees?.length ?? 0) +
        (payload.buildings?.length ?? 0) +
        (payload.piers?.length ?? 0);
      if (total === 0) {
        return { ok: false as const, message: "保存するデータがありません" };
      }

      const data: SaveData = { ...payload, version: SAVE_VERSION, timestamp: Date.now() };
      localStorage.setItem(MANUAL_SAVE_KEY_2, JSON.stringify(data));
      this.manualInfo2 = {
        timestamp: data.timestamp,
        version: data.version,
        title: data.title,
        railsCount: data.rails?.length ?? 0,
        treesCount: data.trees?.length ?? 0,
        buildingsCount: data.buildings?.length ?? 0,
        piersCount: data.piers?.length ?? 0,
      };
      return { ok: true as const, message: "ゲームデータを保存2に保存しました", data };
    },

    // 手動復元スロット1
    loadManual1() {
      const str = localStorage.getItem(MANUAL_SAVE_KEY_1);
      if (!str) return { ok: false as const, message: "保存1データが見つかりません" };
      try {
        const data = JSON.parse(str) as SaveData;
        this.manualInfo1 = {
          timestamp: data.timestamp,
          version: data.version,
          title: data.title,
          railsCount: data.rails?.length ?? 0,
          treesCount: data.trees?.length ?? 0,
          buildingsCount: data.buildings?.length ?? 0,
          piersCount: data.piers?.length ?? 0,
        };
        return { ok: true as const, message: "保存1データを復元しました", data };
      } catch (e) {
        console.error("Failed to parse manual save 1 data", e);
        return { ok: false as const, message: "保存1データの読み込みに失敗しました" };
      }
    },

    // 手動復元スロット2
    loadManual2() {
      const str = localStorage.getItem(MANUAL_SAVE_KEY_2);
      if (!str) return { ok: false as const, message: "保存2データが見つかりません" };
      try {
        const data = JSON.parse(str) as SaveData;
        this.manualInfo2 = {
          timestamp: data.timestamp,
          version: data.version,
          title: data.title,
          railsCount: data.rails?.length ?? 0,
          treesCount: data.trees?.length ?? 0,
          buildingsCount: data.buildings?.length ?? 0,
          piersCount: data.piers?.length ?? 0,
        };
        return { ok: true as const, message: "保存2データを復元しました", data };
      } catch (e) {
        console.error("Failed to parse manual save 2 data", e);
        return { ok: false as const, message: "保存2データの読み込みに失敗しました" };
      }
    },

    // 手動保存の有無チェック
    hasManual1() {
      return localStorage.getItem(MANUAL_SAVE_KEY_1) !== null;
    },

    hasManual2() {
      return localStorage.getItem(MANUAL_SAVE_KEY_2) !== null;
    },

    // 手動保存情報を取得（情報のみで状態は変更しない）
    getManualInfo1() {
      if (this.manualInfo1) return this.manualInfo1;
      if (!this.hasManual1()) return null;
      const res = this.loadManual1();
      if (res.ok) return this.manualInfo1;
      return null;
    },

    getManualInfo2() {
      if (this.manualInfo2) return this.manualInfo2;
      if (!this.hasManual2()) return null;
      const res = this.loadManual2();
      if (res.ok) return this.manualInfo2;
      return null;
    },

    // 手動保存データ削除
    clearManual1() {
      localStorage.removeItem(MANUAL_SAVE_KEY_1);
      this.manualInfo1 = null;
    },

    clearManual2() {
      localStorage.removeItem(MANUAL_SAVE_KEY_2);
      this.manualInfo2 = null;
    },
  },
});
