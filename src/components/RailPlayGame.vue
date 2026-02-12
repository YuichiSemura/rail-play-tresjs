<template>
  <div class="rail-play-container">
    <!-- 背面100%表示のRailPlayScene -->
    <div class="scene-background">
      <RailPlayScene
        @canvas-click="onCanvasClick"
        @plane-click="onPlaneClick"
        @plane-pointer-move="onPlanePointerMove"
        @rail-click="onRailClick"
        @tree-click="onTreeClick"
        @building-click="onBuildingClick"
        @pier-click="onPierClick"
        @front-look-start="onFrontLookStart"
        @front-look-move="onFrontLookMove"
        @front-look-end="onFrontLookEnd"
      />
    </div>

    <!-- 前面オーバーレイのサイドバー -->
    <div v-if="sidebarOpen" class="sidebar-overlay">
      <v-card class="sidebar-card d-flex flex-column">
        <v-card-title class="align-center d-flex justify-space-between pr-2">
          <div class="d-flex flex-column">
            <div class="mb-2">
              <v-btn
                v-if="gameMode !== 'customize'"
                size="small"
                class="mr-2"
                :color="gameMode === 'run' ? 'success' : 'primary'"
                @click="toggleGameMode"
                :disabled="gameMode === 'build' && !canRunTrain"
              >
                <v-icon>{{ gameMode === "build" ? "mdi-play" : "mdi-wrench" }}</v-icon>
                {{ gameMode === "build" ? "運転" : "配置" }}
              </v-btn>
              <v-btn size="small" color="secondary" @click="toggleCustomizeMode">
                <v-icon>{{ gameMode === "customize" ? "mdi-arrow-left" : "mdi-palette" }}</v-icon>
                {{ gameMode === "customize" ? "戻る" : "カスタム" }}
              </v-btn>
              <v-btn size="small" color="info" @click="helpDialog = true" class="ml-2">
                <v-icon>mdi-help-circle</v-icon>
                ヘルプ
              </v-btn>
            </div>

            <v-divider class="my-4" />
            <h3>{{ getModeTitle(gameMode) }}</h3>
          </div>
          <v-btn icon size="small" variant="text" @click="onRequestClose" :aria-label="'サイドバーを閉じる'">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <div class="sidebar-content">
          <BuildPanel v-if="gameMode === 'build'" />

          <RunPanel v-else-if="gameMode === 'run'" />

          <CustomizePanel v-else-if="gameMode === 'customize'" />
        </div>
        <div class="sidebar-footer text-caption text-medium-emphasis">
          ソースコードの参照・バグ報告:
          <a href="https://github.com/YuichiSemura/rail-play-tresjs" target="_blank" rel="noopener"
            >YuichiSemura/rail-play-tresjs</a
          >
        </div>
      </v-card>
    </div>

    <!-- 遊び方説明モーダル -->
    <HelpDialog v-model="helpDialog" />

    <!-- 通知用スナックバー -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="top">
      {{ snackbarText }}
      <template v-slot:actions>
        <v-btn color="white" variant="text" @click="snackbar = false"> 閉じる </v-btn>
      </template>
    </v-snackbar>

    <!-- 確認ダイアログ -->
    <v-dialog v-model="confirmDialog" max-width="500">
      <v-card>
        <v-card-title>{{ confirmTitle }}</v-card-title>
        <v-card-text>
          <div v-html="confirmMessage"></div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" @click="confirmDialog = false">キャンセル</v-btn>
          <v-btn color="primary" @click="store.executeConfirmAction()">実行</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { watch, onUnmounted, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useGameStore } from "../stores/game";
import { useRailsGeometry } from "../composables/useRailsGeometry";
import { useGhostPreview } from "../composables/useGhostPreview";
import { useTrainRunner } from "../composables/useTrainRunner";
import { useCameraController } from "../composables/useCameraController";
import { useUndoRedo } from "../composables/useUndoRedo";
import { useSaveLoad } from "../composables/useSaveLoad";
import RailPlayScene from "./scene/RailPlayScene.vue";
import BuildPanel from "./panels/BuildPanel.vue";
import RunPanel from "./panels/RunPanel.vue";
import CustomizePanel from "./panels/CustomizePanel.vue";
import type { Rail, Pose } from "../types/rail";
import type { GameMode } from "../types/common";
import HelpDialog from "./panels/HelpDialog.vue";
// 共通定数
import {
  CURVE_SEGMENT_ANGLE as CURVE_ANGLE,
  RAIL_STRAIGHT_FULL_LENGTH,
  RAIL_STRAIGHT_HALF_LENGTH,
  RAIL_SLOPE_RUN,
} from "../constants/rail";

// Props
const { sidebarOpen } = defineProps<{ sidebarOpen: boolean }>();
const emit = defineEmits<{ (e: "closeSidebar"): void }>();

const onRequestClose = () => emit("closeSidebar");

// ストア
const store = useGameStore();
const {
  rails, trees, buildings, piers,
  gameMode, selectedTool, isRailsLocked, isRestoring, helpDialog,
  trainRunning,
  cameraMode, cameraPosition,
  snackbar, snackbarText, snackbarColor,
  confirmDialog, confirmTitle, confirmMessage,
  canRunTrain,
} = storeToRefs(store);

// クリックイベントの重複処理を防ぐためのデバウンス
let lastClickTime = 0;
const CLICK_DEBOUNCE_MS = 100;

// カメラ制御（composable）
const {
  handleTrainPose,
  startFrontLook,
  updateFrontLook,
  endFrontLook,
} = useCameraController();

// 幾何ロジック（切り出し）
const {
  makeStraight,
  makeSlope,
  makeLeftCurve,
  makeRightCurve,
  makeLeftCurveSlope,
  makeRightCurveSlope,
  makeStation,
  makeCrossing,
  poseFromRailEnd,
  canPlaceSlope,
  canPlaceRail,
  generatePierCandidates,
  findNearestPierCandidate,
} = useRailsGeometry();

const snapToGrid = (position: number): number => {
  return Math.round(position / 1) * 1; // 1uグリッドに変更
};

// 任意のグリッドサイズでスナップ（木/ビル用に 1u を使用）
const snapToGridSize = (position: number, size: number): number => {
  return Math.round(position / size) * size;
};

// 進行端点の姿勢は共通型を使用
const createRail = (
  x: number,
  z: number,
  type: "straight" | "curve" | "slope" | "curve-slope-up" | "curve-slope-down" | "station" | "crossing"
): Rail => {
  // 前のレール終端姿勢（なければ原点+X）
  let pose: Pose = { point: [0, 0, 0], theta: 0 };
  if (rails.value.length > 0) {
    pose = poseFromRailEnd(rails.value[rails.value.length - 1]);
  } else {
    // 最初はクリック位置をグリッドスナップして開始点にする
    pose.point = [snapToGrid(x), 0, snapToGrid(z)];
  }

  if (type === "straight") {
    if (rails.value.length === 0) {
      const dx = snapToGrid(x) - pose.point[0];
      const dz = snapToGrid(z) - pose.point[2];
      if (Math.hypot(dx, dz) > 1e-3) {
        pose.theta = Math.atan2(dz, dx);
      }
      return makeStraight(pose, RAIL_STRAIGHT_FULL_LENGTH);
    }
    return makeStraight(pose, RAIL_STRAIGHT_FULL_LENGTH);
  } else if (type === "curve") {
    if (rails.value.length === 0) {
      const desired = getPlacementRotation();
      const base = pose.theta;
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
      return dL <= dR ? makeLeftCurve(pose) : makeRightCurve(pose);
    }

    const leftSide = (() => {
      const dir = { x: Math.cos(pose.theta), z: -Math.sin(pose.theta) };
      const vx = snapToGrid(x) - pose.point[0];
      const vz = snapToGrid(z) - pose.point[2];
      const cross = dir.x * vz - dir.z * vx;
      return cross <= 0;
    })();
    return leftSide ? makeLeftCurve(pose) : makeRightCurve(pose);
  } else if (type === "slope") {
    const sx = pose.point[0];
    const sz = pose.point[2];
    const tx = snapToGrid(x);
    const tz = snapToGrid(z);

    let ascending = true;

    if (rails.value.length === 0) {
      const dx0 = tx - sx;
      const dz0 = tz - sz;
      if (Math.hypot(dx0, dz0) > 1e-3) {
        pose.theta = Math.atan2(dz0, dx0);
      }
      ascending = true;
    } else {
      const cameraX = cameraPosition.value[0];
      const cameraZ = cameraPosition.value[2];

      const cameraToRailX = sx - cameraX;
      const cameraToRailZ = sz - cameraZ;

      const cameraToClickX = tx - cameraX;
      const cameraToClickZ = tz - cameraZ;

      const railDistance = Math.hypot(cameraToRailX, cameraToRailZ);
      const clickDistance = Math.hypot(cameraToClickX, cameraToClickZ);
      ascending = clickDistance > railDistance;
    }

    if (!canPlaceSlope(pose, ascending)) {
      throw new Error("スロープが地面より下がるか、高さ制限を超えるため配置できません");
    }
    return makeSlope(pose, ascending);
  } else if (type === "station") {
    if (rails.value.length === 0) {
      const dx = snapToGrid(x) - pose.point[0];
      const dz = snapToGrid(z) - pose.point[2];
      if (Math.hypot(dx, dz) > 1e-3) {
        pose.theta = Math.atan2(dz, dx);
      }
      return makeStation(pose, RAIL_STRAIGHT_FULL_LENGTH);
    }
    return makeStation(pose, RAIL_STRAIGHT_FULL_LENGTH);
  } else if (type === "crossing") {
    if (rails.value.length === 0) {
      const dx = snapToGrid(x) - pose.point[0];
      const dz = snapToGrid(z) - pose.point[2];
      if (Math.hypot(dx, dz) > 1e-3) {
        pose.theta = Math.atan2(dz, dx);
      }
      return makeCrossing(pose, RAIL_STRAIGHT_FULL_LENGTH);
    }
    return makeCrossing(pose, RAIL_STRAIGHT_FULL_LENGTH);
  } else if (type === "curve-slope-up") {
    const tx = snapToGrid(x);
    const tz = snapToGrid(z);

    const leftSide = (() => {
      const dir = { x: Math.cos(pose.theta), z: -Math.sin(pose.theta) };
      const vx = tx - pose.point[0];
      const vz = tz - pose.point[2];
      const cross = dir.x * vz - dir.z * vx;
      return cross <= 0;
    })();

    const ascending = true;
    return leftSide ? makeLeftCurveSlope(pose, ascending) : makeRightCurveSlope(pose, ascending);
  } else if (type === "curve-slope-down") {
    const tx = snapToGrid(x);
    const tz = snapToGrid(z);

    const leftSide = (() => {
      const dir = { x: Math.cos(pose.theta), z: -Math.sin(pose.theta) };
      const vx = tx - pose.point[0];
      const vz = tz - pose.point[2];
      const cross = dir.x * vz - dir.z * vx;
      return cross <= 0;
    })();

    const ascending = false;
    return leftSide ? makeLeftCurveSlope(pose, ascending) : makeRightCurveSlope(pose, ascending);
  }

  throw new Error(`Unknown rail type: ${type}`);
};

interface ClickEvent {
  intersections?: Array<{
    point: { x: number; y: number; z: number };
  }>;
  point?: { x: number; y: number; z: number };
}

// ゴーストプレビューロジック（composable）
const {
  rotatePlacement,
  resetPlacementRotation,
  updateGhost,
  updatePierCandidates,
  updatePointer,
  getPlacementRotation,
} = useGhostPreview(createRail);

// 列車走行ロジック（composable）
const { onTrainPose: registerTrainPoseCallback } = useTrainRunner();

// Register train pose callback for camera following
registerTrainPoseCallback(handleTrainPose);

// 履歴管理（Undo/Redo）
const { saveToHistory, handleUndo, handleRedo } = useUndoRedo();

const addTreeAt = (x: number, z: number) => {
  const px = snapToGridSize(x, 1);
  const pz = snapToGridSize(z, 1);
  if (!trees.value.some((t) => Math.hypot(t.position[0] - px, t.position[2] - pz) < 0.1)) {
    saveToHistory();
    trees.value.push({ position: [px, 0, pz], rotation: [0, getPlacementRotation(), 0] });
  }
};

const addBuildingAt = (x: number, z: number) => {
  const px = snapToGridSize(x, 1);
  const pz = snapToGridSize(z, 1);
  if (!buildings.value.some((b) => Math.hypot(b.position[0] - px, b.position[2] - pz) < 0.1)) {
    const palette = ["#7FB3D5", "#85C1E9", "#5DADE2", "#A9CCE3", "#5499C7"];
    const color = palette[Math.floor(Math.random() * palette.length)];
    const height = 1.5 + Math.floor(Math.random() * 3) * 0.6;
    saveToHistory();
    buildings.value.push({ position: [px, 0, pz], height, color, rotation: [0, getPlacementRotation(), 0] });
  }
};

const addPierAt = (x: number, z: number) => {
  const candidates = generatePierCandidates(rails.value);
  const clickPos: [number, number, number] = [x, 0, z];
  const nearestCandidate = findNearestPierCandidate(clickPos, candidates);

  if (!nearestCandidate) {
    store.showNotification("橋脚を配置できる線路接続点が範囲内にありません", "warning");
    return;
  }

  const existing = piers.value.find(
    (p) => Math.hypot(p.position[0] - nearestCandidate.position[0], p.position[2] - nearestCandidate.position[2]) < 0.1
  );

  if (existing) {
    store.showNotification("この位置には既に橋脚が配置されています", "warning");
    return;
  }

  const pierHeight = Math.max(0.7, nearestCandidate.railHeight);
  saveToHistory();
  piers.value.push({
    position: nearestCandidate.position,
    height: pierHeight,
    rotation: [0, nearestCandidate.rotation, 0],
  });
  store.showNotification("橋脚を配置しました", "success");
};

const addStationAt = (x: number, z: number) => {
  const newRail = createRail(x, z, "station");

  const isDuplicate = rails.value.some(
    (r) => Math.hypot(r.position[0] - newRail.position[0], r.position[2] - newRail.position[2]) < 0.1
  );

  if (!isDuplicate) {
    saveToHistory();
    rails.value.push(newRail);
    store.isLoopComplete();
  }
};

const onPlaneClick = (event: ClickEvent) => {
  if (gameMode.value !== "build") return;
  if (selectedTool.value === "none") return;

  const now = Date.now();
  if (now - lastClickTime < CLICK_DEBOUNCE_MS) {
    return;
  }
  lastClickTime = now;

  const intersect = event.intersections?.[0];
  const pointLike = intersect?.point ?? event.point;
  if (!pointLike) return;

  const point = pointLike;
  updatePointer(point.x, point.z);

  if (
    selectedTool.value === "straight" ||
    selectedTool.value === "curve" ||
    selectedTool.value === "slope" ||
    selectedTool.value === "curve-slope-up" ||
    selectedTool.value === "curve-slope-down"
  ) {
    if (isRailsLocked.value) {
      store.showNotification(
        "周回線路が完成しています。新しい線路を配置するには「すべてクリア」を実行してください。",
        "warning"
      );
      return;
    }

    let newRail: Rail;
    try {
      newRail = createRail(point.x, point.z, selectedTool.value);
    } catch (error) {
      if (error instanceof Error) {
        store.showNotification(error.message, "warning");
      } else {
        store.showNotification("レールを配置できませんでした", "warning");
      }
      return;
    }

    if (!canPlaceRail(newRail)) {
      store.showNotification("レールがエリア外に出るため配置できません", "warning");
      return;
    }

    // 最初の一本は向き調整（R/Eの事前回転）を尊重
    if (rails.value.length === 0) {
      if (newRail.type === "straight" || newRail.type === "slope") {
        newRail.rotation = [newRail.rotation[0], getPlacementRotation(), newRail.rotation[2]];
        const [ix, iy, iz] = newRail.position;
        const len = newRail.type === "straight" ? RAIL_STRAIGHT_HALF_LENGTH : RAIL_SLOPE_RUN / 2;
        const dirX = Math.cos(-newRail.rotation[1]);
        const dirZ = Math.sin(-newRail.rotation[1]);
        const startY = newRail.connections.start[1];
        const endY = newRail.connections.end[1];
        if (newRail.type === "straight") {
          newRail.connections = {
            start: [ix - dirX * len, iy, iz - dirZ * len],
            end: [ix + dirX * len, iy, iz + dirZ * len],
          };
        } else {
          newRail.connections = {
            start: [ix - dirX * len, startY, iz - dirZ * len],
            end: [ix + dirX * len, endY, iz + dirZ * len],
          };
        }
      } else if (newRail.type === "curve") {
        const desired = getPlacementRotation();
        const base = newRail.rotation[1];
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
        if ((newRail.direction || "left") === "left") {
          if (dR < dL) {
            const pose = { point: newRail.connections.start, theta: base } as Pose;
            const rerail = makeRightCurve(pose);
            newRail = rerail;
          }
        } else {
          if (dL < dR) {
            const pose = { point: newRail.connections.start, theta: base } as Pose;
            const rerail = makeLeftCurve(pose);
            newRail = rerail;
          }
        }
      }
    }
    saveToHistory();
    rails.value.push(newRail);
    return;
  }
  if (selectedTool.value === "tree") {
    addTreeAt(point.x, point.z);
    return;
  }
  if (selectedTool.value === "crossing") {
    if (isRailsLocked.value) {
      store.showNotification(
        "周回線路が完成しています。新しい踏切を配置するには「すべてクリア」を実行してください。",
        "warning"
      );
      return;
    }
    const newRail = createRail(point.x, point.z, "crossing");
    const isDuplicate = rails.value.some(
      (r) => Math.hypot(r.position[0] - newRail.position[0], r.position[2] - newRail.position[2]) < 0.1
    );
    if (!isDuplicate) {
      saveToHistory();
      rails.value.push(newRail);
      store.isLoopComplete();
    }
    return;
  }
  if (selectedTool.value === "building") {
    addBuildingAt(point.x, point.z);
    return;
  }
  if (selectedTool.value === "pier") {
    addPierAt(point.x, point.z);
    return;
  }
  if (selectedTool.value === "station") {
    if (isRailsLocked.value) {
      store.showNotification(
        "周回線路が完成しています。新しい駅ホームを配置するには「すべてクリア」を実行してください。",
        "warning"
      );
      return;
    }

    addStationAt(point.x, point.z);
    return;
  }
};

const onPlanePointerMove = (event: ClickEvent) => {
  const intersect = event.intersections?.[0];
  const pointLike = intersect?.point ?? event.point;
  if (!pointLike) return;
  updatePointer(pointLike.x, pointLike.z);
};

const onCanvasClick = () => {
  // Canvas level click handling if needed
};

const onRailClick = (rail: Rail) => {
  if (gameMode.value !== "build") return;

  if (selectedTool.value === "delete") {
    const index = rails.value.findIndex((r) => r.id === rail.id);
    if (index > -1) {
      if (index === 0 || index === rails.value.length - 1) {
        saveToHistory();
        rails.value.splice(index, 1);
        if (isRailsLocked.value) {
          isRailsLocked.value = false;
          gameMode.value = "build";
        }
      } else {
        store.showNotification("線路の削除は先頭または最後のレールのみ可能です", "warning");
      }
    }
  }
};

const onTreeClick = (index: number) => {
  if (gameMode.value !== "build") return;
  if (selectedTool.value === "delete") {
    saveToHistory();
    trees.value.splice(index, 1);
  }
};

const onBuildingClick = (index: number) => {
  if (gameMode.value !== "build") return;
  if (selectedTool.value === "delete") {
    saveToHistory();
    buildings.value.splice(index, 1);
  }
};

const onPierClick = (index: number) => {
  if (gameMode.value !== "build") return;
  if (selectedTool.value === "delete") {
    saveToHistory();
    piers.value.splice(index, 1);
  }
};

const toggleGameMode = () => {
  if (gameMode.value === "build" && canRunTrain.value) {
    gameMode.value = "run";
  } else if (gameMode.value === "run") {
    gameMode.value = "build";
    trainRunning.value = false;
  }
};

// 先頭カメラ視点 微調整ドラッグ
const onFrontLookStart = () => {
  if (cameraMode.value === "front") startFrontLook();
};
const onFrontLookMove = (dx: number, dy: number) => {
  if (cameraMode.value === "front") updateFrontLook(dx, dy);
};
const onFrontLookEnd = () => {
  if (cameraMode.value === "front") endFrontLook();
};

// セーブ/ロード/クリア（composable）
const { initSaveLoad } = useSaveLoad();

// モード切替とカスタマイズ関数
const getModeTitle = (mode: GameMode) => {
  switch (mode) {
    case "build":
      return "レール配置モード";
    case "run":
      return "運転モード";
    case "customize":
      return "電車カスタマイズモード";
    default:
      return "";
  }
};

const toggleCustomizeMode = () => {
  if (gameMode.value === "customize") {
    gameMode.value = "build";
  } else {
    gameMode.value = "customize";
  }
};

// ツールやモード変更、レール本数の変化でプレビューを更新
watch(selectedTool, () => {
  updateGhost();
  updatePierCandidates();
});
watch(gameMode, () => {
  updateGhost();
  updatePierCandidates();
});
watch(
  () => rails.value.length,
  () => {
    if (isRestoring.value) return;
    updateGhost();
    updatePierCandidates();
  }
);

// 運転モード → 配置モードに切り替わったらカメラを自由視点へ戻す
watch(gameMode, (mode, prev) => {
  if (mode === "build" && prev === "run") {
    store.resetToOrbit();
  }
});

// キーボードショートカット（回転、Undo/Redo）
const onKeyDown = (e: KeyboardEvent) => {
  // Undo: Ctrl+Z (Mac: Cmd+Z)
  if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    handleUndo();
    return;
  }

  // Redo: Ctrl+Shift+Z or Ctrl+Y (Mac: Cmd+Shift+Z or Cmd+Y)
  if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key === "z") || e.key === "y")) {
    e.preventDefault();
    handleRedo();
    return;
  }

  if (gameMode.value !== "build") return;
  const shift = e.shiftKey;
  if (e.key === "r" || e.key === "R") {
    rotatePlacement(shift ? -2 : 1);
  } else if (e.key === "e" || e.key === "E") {
    rotatePlacement(shift ? 2 : -1);
  } else if (e.key === "q" || e.key === "Q") {
    resetPlacementRotation();
  } else if (e.key === "Escape") {
    selectedTool.value = "none";
  }
};

onMounted(() => {
  window.addEventListener("keydown", onKeyDown);
  // セーブ/ロード初期化（自動復元＋自動保存開始）
  const { stop } = initSaveLoad();
  onUnmounted(() => stop());
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKeyDown);
});
</script>

<style scoped>
.position-relative {
  position: relative;
}

.position-absolute {
  position: absolute;
}

.bottom-4 {
  bottom: 1rem;
}

.right-4 {
  right: 1rem;
}

.color-picker {
  width: 40px;
  height: 32px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* 新しいレイアウト用のスタイル */
.rail-play-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.scene-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
  background: #e6f4ff; /* 薄い空色 */
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 120; /* ハンバーガーボタン(50) より前面 */
  width: 91.666vw; /* スマホ: 11/12 = 91.666% */
  height: 100vh;
  pointer-events: none; /* カード以外はクリックを透過 */
}

/* タブレット以上で幅を段階的に調整 */
@media (min-width: 768px) {
  .sidebar-overlay {
    width: 50vw; /* タブレット: 6/12 = 50% */
  }
}

@media (min-width: 1024px) {
  .sidebar-overlay {
    width: 33.333vw; /* デスクトップ小: 4/12 = 33.333% */
  }
}

@media (min-width: 1280px) {
  .sidebar-overlay {
    width: 25vw; /* デスクトップ大: 3/12 = 25% (最大) */
  }
}

.sidebar-card {
  width: 100%;
  height: 100vh;
  max-height: 100vh;
  pointer-events: all; /* カード内はクリック有効 */
  padding: 8px;
  background: rgba(255, 255, 255, 0.85); /* より透明な背景 */
  backdrop-filter: blur(2px); /* 背景ぼかし効果 */
}

.sidebar-content {
  flex: 1 1 auto;
  overflow-y: auto;
  padding-right: 4px; /* スクロールバー余白 */
}

.sidebar-footer {
  flex: 0 0 auto;
  padding: 8px 4px 4px 4px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.6);
}

.sidebar-footer a {
  color: #1976d2;
  text-decoration: none;
}

.sidebar-footer a:hover {
  text-decoration: underline;
}
</style>
