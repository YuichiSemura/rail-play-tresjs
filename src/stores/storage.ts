import { defineStore } from "pinia";
import { watch } from "vue";
import type { Rail } from "../types/rail";
import type { Vec3, GameMode } from "../types/common";

// 後続の段階的移行で、既存の保存/復元ロジックをここへ集約していきます。
// まずは最小の状態とアクションのみ用意します。

export type SaveData = {
  version: string;
  timestamp: number;
  rails: Rail[];
  trees: Array<{ position: Vec3; rotation?: Vec3 }>;
  buildings: Array<{ position: Vec3; height?: number; color?: string; rotation?: Vec3 }>;
  piers: Array<{ position: Vec3; height?: number; rotation?: Vec3 }>;
  gameMode?: GameMode;
  isRailsLocked?: boolean;
};

export type SavePayload = Omit<SaveData, "version" | "timestamp">;

const SAVE_KEY = "rail-play-game-data";
const SAVE_VERSION = "1.0.0";

export const useStorageStore = defineStore("storage", {
  state: () => ({
    info: null as null | {
      timestamp: number;
      version: string;
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
            this.save(payload);
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
  },
});
