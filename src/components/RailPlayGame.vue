<template>
  <v-container fluid class="pa-0" style="height: 100%">
    <v-row no-gutters style="height: 100%">
      <v-col v-if="sidebarOpen" cols="3">
        <v-card class="h-100 pa-1 overflow-y-auto" style="max-height: calc(100dvh - var(--v-layout-top, 64px))">
          <v-card-title class="align-center">
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
                {{ gameMode === "build" ? "運転モード" : "配置モード" }}
              </v-btn>
              <v-btn size="small" color="secondary" @click="toggleCustomizeMode">
                <v-icon>{{ gameMode === "customize" ? "mdi-arrow-left" : "mdi-palette" }}</v-icon>
                {{ gameMode === "customize" ? "戻る" : "カスタムモード" }}
              </v-btn>
              <v-btn size="small" color="info" @click="helpDialog = true" class="ml-2">
                <v-icon>mdi-help-circle</v-icon>
                ヘルプ
              </v-btn>
            </div>

            <v-divider class="my-4" />
            <h3>{{ getModeTitle(gameMode) }}</h3>
          </v-card-title>

          <BuildPanel
            v-if="gameMode === 'build'"
            v-model:selectedTool="selectedTool"
            v-model:currentTitle="currentTitle"
            :rails="rails"
            :trees="trees"
            :buildings="buildings"
            :piers="piers"
            :is-rails-locked="isRailsLocked"
            :save-data-info="saveDataInfo"
            :has-manual-save1="storage.hasManual1()"
            :has-manual-save2="storage.hasManual2()"
            :manual-save-info1="storage.getManualInfo1()"
            :manual-save-info2="storage.getManualInfo2()"
            :last-pointer="lastPointer"
            :ghost-rail="ghostRail"
            :ghost-pier="ghostPier"
            @createLargeCircle="createLargeCircle"
            @createOvalPreset="createOvalPreset"
            @createSCurvePreset="createSCurvePreset"
            @createSlopeUpDownCurvesPreset="createSlopeUpDownCurvesPreset"
            @clearAllRails="clearAllRails"
            @handleSaveManual1="handleSaveManual1"
            @handleSaveManual2="handleSaveManual2"
            @handleLoadManual1="handleLoadManual1"
            @handleLoadManual2="handleLoadManual2"
          />

          <RunPanel
            v-else-if="gameMode === 'run'"
            :can-run-train="canRunTrain"
            :train-running="trainRunning"
            v-model:trainSpeed="trainSpeed"
            :camera-mode="cameraMode"
            @toggleTrain="toggleTrain"
            @toggleCameraMode="toggleCameraMode"
          />

          <CustomizePanel
            v-else-if="gameMode === 'customize'"
            v-model:trainCustomization="trainCustomization"
            @applyPreset="applyPreset"
          />
        </v-card>
      </v-col>

      <v-col :cols="sidebarOpen ? 9 : 12" class="position-relative scene-column" style="height: 100%">
        <RailPlayScene
          :camera-position="cameraPosition"
          :camera-rotation="cameraRotation"
          :camera-mode="cameraMode"
          :rails="rails"
          :trees="trees"
          :buildings="buildings"
          :piers="piers"
          :car-transforms="carTransforms"
          :train-customization="trainCustomization"
          :ghost-rail="ghostRail"
          :ghost-tree="ghostTree"
          :ghost-building="ghostBuilding"
          :ghost-pier="ghostPier"
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
      </v-col>
    </v-row>

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
          <v-btn color="primary" @click="executeConfirmAction">実行</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, onMounted } from "vue";
import { useStorageStore } from "../stores/storage";
import { useRailsGeometry } from "../composables/useRailsGeometry";
import { useGhostPreview } from "../composables/useGhostPreview";
import { useTrainRunner } from "../composables/useTrainRunner";
import { useCameraController } from "../composables/useCameraController";
import RailPlayScene from "./scene/RailPlayScene.vue";
import BuildPanel from "./panels/BuildPanel.vue";
import RunPanel from "./panels/RunPanel.vue";
import CustomizePanel from "./panels/CustomizePanel.vue";
import type { Rail, Pose } from "../types/rail";
import HelpDialog from "./panels/HelpDialog.vue";
// 共通定数
import {
  CURVE_SEGMENT_ANGLE as CURVE_ANGLE,
  RAIL_CURVE_RADIUS,
  RAIL_STRAIGHT_FULL_LENGTH,
  RAIL_STRAIGHT_HALF_LENGTH,
  RAIL_SLOPE_RUN,
} from "../constants/rail";

// Props
const { sidebarOpen } = defineProps<{ sidebarOpen: boolean }>();

// Rail は共通型を使用

type GameMode = "build" | "run" | "customize";

// 電車のカスタマイズ設定
interface TrainCustomization {
  bodyColor: string;
  roofColor: string;
  windowColor: string;
  wheelColor: string;
}

const gameMode = ref<GameMode>("build");
const selectedTool = ref<
  "none" | "straight" | "curve" | "slope" | "tree" | "building" | "pier" | "station" | "crossing" | "rotate" | "delete"
>("none");
const rails = ref<Rail[]>([]);
const trees = ref<{ position: [number, number, number]; rotation?: [number, number, number] }[]>([]);
const buildings = ref<
  { position: [number, number, number]; height?: number; color?: string; rotation?: [number, number, number] }[]
>([]);
const piers = ref<{ position: [number, number, number]; height?: number; rotation?: [number, number, number] }[]>([]);
const trainRunning = ref(false);
// クリア時に列車コンポーネントを確実に破棄・再生成するためのキー
const trainKey = ref(0);
const trainSpeed = ref(1.0);

// 保存データ情報（リアクティブ）- 初期化は後で行う
const saveDataInfo = ref<ReturnType<typeof getSaveDataInfo>>(null);

// ストレージ（Pinia）
const storage = useStorageStore();

// 通知用
const snackbar = ref(false);
const snackbarText = ref("");
const snackbarColor = ref("success");

// 作成中の線路のタイトル
const currentTitle = ref("");

// 確認ダイアログ用の状態
const confirmDialog = ref(false);
const confirmTitle = ref("");
const confirmMessage = ref("");
const confirmAction = ref<(() => void) | null>(null);

// 電車カスタマイズ設定（デフォルト値）
const trainCustomization = ref<TrainCustomization>({
  bodyColor: "#2E86C1",
  roofColor: "#1B4F72",
  windowColor: "#85C1E9",
  wheelColor: "#2C2C2C",
});

// ヘルプモーダルの状態管理
const helpDialog = ref(false);
const isRailsLocked = ref(false);

// クリックイベントの重複処理を防ぐためのデバウンス
const lastClickTime = ref(0);
const CLICK_DEBOUNCE_MS = 100;

// カメラ制御（composable）
const {
  cameraMode,
  cameraPosition,
  cameraRotation,
  toggleCameraMode,
  resetToOrbit,
  handleTrainPose,
  startFrontLook,
  updateFrontLook,
  endFrontLook,
} = useCameraController();

// 幾何ロジック（切り出し）
const { makeStraight, makeSlope, makeLeftCurve, makeRightCurve, makeStation, makeCrossing, poseFromRailEnd } =
  useRailsGeometry();

const isLoopComplete = (): boolean => {
  if (rails.value.length < 3) return false;

  const firstRail = rails.value[0];
  const lastRail = rails.value[rails.value.length - 1];

  const distance = Math.sqrt(
    (firstRail.connections.start[0] - lastRail.connections.end[0]) ** 2 +
      (firstRail.connections.start[2] - lastRail.connections.end[2]) ** 2
  );

  const isConnected = distance < 0.5;

  if (isConnected && !isRailsLocked.value) {
    isRailsLocked.value = true;
    gameMode.value = "run"; // 自動的にランモードに切り替え
    console.log("線路が周回完成！ランモードに切り替えました");
  }

  return isConnected;
};

const canRunTrain = computed(() => {
  return rails.value.length > 2 && isLoopComplete();
});

// 列車走行ロジック（composable）
const {
  carTransforms,
  onTrainPose: registerTrainPoseCallback,
  reset: resetTrain,
} = useTrainRunner(rails, trainSpeed, trainRunning, canRunTrain);

// Register train pose callback for camera following
registerTrainPoseCallback(handleTrainPose);

const snapToGrid = (position: number): number => {
  return Math.round(position / 1) * 1; // 1uグリッドに変更
};

// 任意のグリッドサイズでスナップ（木/ビル用に 1u を使用）
const snapToGridSize = (position: number, size: number): number => {
  return Math.round(position / size) * size;
};

// 進行端点の姿勢は共通型を使用

const createRail = (x: number, z: number, type: "straight" | "curve" | "slope" | "station" | "crossing"): Rail => {
  // 前のレール終端姿勢（なければ原点+X）
  let pose: Pose = { point: [0, 0, 0], theta: 0 };
  if (rails.value.length > 0) {
    pose = poseFromRailEnd(rails.value[rails.value.length - 1]);
  } else {
    // 最初はクリック位置をグリッドスナップして開始点にする
    pose.point = [snapToGrid(x), 0, snapToGrid(z)];
  }

  if (type === "straight") {
    // 固定長で配置し、既存線路がある場合は「末端の向きにのみ」継ぎ足す
    // 最初の1本のみ、クリック方向で向きを決める（長さは固定）
    if (rails.value.length === 0) {
      const dx = snapToGrid(x) - pose.point[0];
      const dz = snapToGrid(z) - pose.point[2];
      if (Math.hypot(dx, dz) > 1e-3) {
        pose.theta = Math.atan2(dz, dx);
      }
      return makeStraight(pose, RAIL_STRAIGHT_FULL_LENGTH);
    }
    // 2本目以降はクリック位置に依存せず、末端の姿勢そのままに固定長で追加
    return makeStraight(pose, RAIL_STRAIGHT_FULL_LENGTH);
  } else if (type === "curve") {
    // クリックが接線の左側か右側かで分岐
    const leftSide = (() => {
      const dir = { x: Math.cos(pose.theta), z: Math.sin(pose.theta) };
      const vx = snapToGrid(x) - pose.point[0];
      const vz = snapToGrid(z) - pose.point[2];
      const cross = dir.x * vz - dir.z * vx; // 2D cross: (dir x v)
      return cross > 0; // 左側なら正
    })();
    return leftSide ? makeLeftCurve(pose) : makeRightCurve(pose);
  } else if (type === "slope") {
    // slope（水平投影長=4、上り/下りはクリック位置で決定：前方=上り、後方=下り）
    const sx = pose.point[0];
    const sz = pose.point[2];
    const tx = snapToGrid(x);
    const tz = snapToGrid(z);
    if (rails.value.length === 0) {
      const dx0 = tx - sx;
      const dz0 = tz - sz;
      if (Math.hypot(dx0, dz0) > 1e-3) {
        pose.theta = Math.atan2(dz0, dx0);
      }
    }
    const dirx = Math.cos(pose.theta);
    const dirz = Math.sin(pose.theta);
    const vx = tx - sx;
    const vz = tz - sz;
    const dot = dirx * vx + dirz * vz; // 前方: dot>=0, 後方: dot<0
    const ascending = dot >= 0;
    return makeSlope(pose, ascending);
  } else if (type === "station") {
    // 駅ホームレール（直線レールと同様の処理）
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
    // 踏切（直線レールと同様の処理）
    if (rails.value.length === 0) {
      const dx = snapToGrid(x) - pose.point[0];
      const dz = snapToGrid(z) - pose.point[2];
      if (Math.hypot(dx, dz) > 1e-3) {
        pose.theta = Math.atan2(dz, dx);
      }
      return makeCrossing(pose, RAIL_STRAIGHT_FULL_LENGTH);
    }
    return makeCrossing(pose, RAIL_STRAIGHT_FULL_LENGTH);
  }

  // 何も該当しない場合のデフォルト（型安全性のため）
  throw new Error(`Unknown rail type: ${type}`);
};

interface ClickEvent {
  intersections?: Array<{
    point: { x: number; y: number; z: number };
  }>;
  // Tres の Pointer イベントは point を直接持つ場合がある
  point?: { x: number; y: number; z: number };
}

// ゴーストプレビューロジック（composable）
const {
  lastPointer,
  ghostRail,
  ghostTree,
  ghostBuilding,
  ghostPier,
  rotatePlacement,
  resetPlacementRotation,
  updateGhost,
  updatePointer,
  resetGhosts,
  getPlacementRotation,
} = useGhostPreview(rails, selectedTool, gameMode, createRail);

const addTreeAt = (x: number, z: number) => {
  const px = snapToGridSize(x, 1);
  const pz = snapToGridSize(z, 1);
  // 同座標重複を軽減
  if (!trees.value.some((t) => Math.hypot(t.position[0] - px, t.position[2] - pz) < 0.1)) {
    trees.value.push({ position: [px, 0, pz], rotation: [0, getPlacementRotation(), 0] });
  }
};

const addBuildingAt = (x: number, z: number) => {
  const px = snapToGridSize(x, 1);
  const pz = snapToGridSize(z, 1);
  if (!buildings.value.some((b) => Math.hypot(b.position[0] - px, b.position[2] - pz) < 0.1)) {
    // 簡単なバリエーション
    const palette = ["#7FB3D5", "#85C1E9", "#5DADE2", "#A9CCE3", "#5499C7"];
    const color = palette[Math.floor(Math.random() * palette.length)];
    const height = 1.5 + Math.floor(Math.random() * 3) * 0.6;
    buildings.value.push({ position: [px, 0, pz], height, color, rotation: [0, getPlacementRotation(), 0] });
  }
};

const addPierAt = (x: number, z: number) => {
  const px = snapToGridSize(x, 1);
  const pz = snapToGridSize(z, 1);
  if (!piers.value.some((p) => Math.hypot(p.position[0] - px, p.position[2] - pz) < 0.1)) {
    piers.value.push({ position: [px, 0, pz], height: 0.7, rotation: [0, getPlacementRotation(), 0] });
  }
};

const addStationAt = (x: number, z: number) => {
  // 駅ホームをレールとして追加
  const newRail = createRail(x, z, "station");

  // 位置の重複チェック（既存のレールと重複していないか確認）
  const isDuplicate = rails.value.some(
    (r) => Math.hypot(r.position[0] - newRail.position[0], r.position[2] - newRail.position[2]) < 0.1
  );

  if (!isDuplicate) {
    rails.value.push(newRail);
    // 周回チェック
    isLoopComplete();
  }
};

const onPlaneClick = (event: ClickEvent) => {
  if (gameMode.value !== "build") return; // ビルドモード以外では配置不可
  if (selectedTool.value === "none") return; // 何も選択していない場合は配置不可

  // デバウンス処理：短時間内の重複クリックを防ぐ
  const now = Date.now();
  if (now - lastClickTime.value < CLICK_DEBOUNCE_MS) {
    return;
  }
  lastClickTime.value = now;

  const intersect = event.intersections?.[0];
  const pointLike = intersect?.point ?? event.point;
  if (!pointLike) return;

  const point = pointLike;
  // クリックでも最終ポインタを更新（カーブのプレビューに必要）
  updatePointer(point.x, point.z);

  if (selectedTool.value === "straight" || selectedTool.value === "curve" || selectedTool.value === "slope") {
    // 周回状態では新しい線路を配置できない
    if (isRailsLocked.value) {
      showNotification(
        "周回線路が完成しています。新しい線路を配置するには「すべてクリア」を実行してください。",
        "warning"
      );
      return;
    }

    let newRail = createRail(point.x, point.z, selectedTool.value);
    // 最初の一本は向き調整（R/Eの事前回転）を尊重
    if (rails.value.length === 0) {
      if (newRail.type === "straight" || newRail.type === "slope") {
        newRail.rotation = [newRail.rotation[0], getPlacementRotation(), newRail.rotation[2]];
        // 接続点を再計算（直線/スロープ）
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
        // カーブは開始接線方向（rotation[1]）が placementYaw に一致するよう左右を決め直す
        // ここでは簡易に：placementYaw に最も近い左右のいずれかを採用
        const desired = getPlacementRotation();
        const base = newRail.rotation[1];
        // 左なら +Δ、右なら -Δ になる想定
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
            // 左→右に入れ替える: makeRightCurveを再生成
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
    rails.value.push(newRail);
    return;
  }
  if (selectedTool.value === "tree") {
    addTreeAt(point.x, point.z);
    return;
  }
  if (selectedTool.value === "crossing") {
    // 周回状態では新しい踏切を配置できない（駅と同様の扱いにする）
    if (isRailsLocked.value) {
      showNotification(
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
      rails.value.push(newRail);
      isLoopComplete();
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
    // 周回状態では新しい駅ホームを配置できない
    if (isRailsLocked.value) {
      showNotification(
        "周回線路が完成しています。新しい駅ホームを配置するには「すべてクリア」を実行してください。",
        "warning"
      );
      return;
    }

    addStationAt(point.x, point.z);
    return;
  }
  // rotate/delete は平面では何もしない
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

const rotateRail = (rail: Rail) => {
  // 90度回転させる
  const newRotationY = rail.rotation[1] + Math.PI / 2;
  rail.rotation = [rail.rotation[0], newRotationY, rail.rotation[2]];

  // 接続点を再計算（インライン）
  const [ix, iy, iz] = rail.position;
  const [, iry] = rail.rotation;
  if (rail.type === "straight") {
    const len = RAIL_STRAIGHT_HALF_LENGTH;
    const dirX = Math.cos(-iry);
    const dirZ = Math.sin(-iry);
    rail.connections = { start: [ix - dirX * len, iy, iz - dirZ * len], end: [ix + dirX * len, iy, iz + dirZ * len] };
  } else if (rail.type === "slope") {
    const len = RAIL_SLOPE_RUN / 2;
    const dirX = Math.cos(-iry);
    const dirZ = Math.sin(-iry);
    const prevStartY = rail.connections.start[1];
    const prevEndY = rail.connections.end[1];
    rail.connections = {
      start: [ix - dirX * len, prevStartY, iz - dirZ * len],
      end: [ix + dirX * len, prevEndY, iz + dirZ * len],
    };
  } else {
    const r = RAIL_CURVE_RADIUS;
    const theta = iry;
    if (rail.type === "curve" && (rail.direction || "left") === "left") {
      // Left curve: start = C - n_left(theta), end = C - n_left(theta + Δ)
      rail.connections = {
        start: [ix + Math.sin(theta) * r, iy, iz - Math.cos(theta) * r],
        end: [ix + Math.sin(theta + CURVE_ANGLE) * r, iy, iz - Math.cos(theta + CURVE_ANGLE) * r],
      };
    } else {
      // Right curve: start = C - n_right(theta), end = C - n_right(theta - Δ)
      rail.connections = {
        start: [ix - Math.sin(theta) * r, iy, iz + Math.cos(theta) * r],
        end: [ix - Math.sin(theta - CURVE_ANGLE) * r, iy, iz + Math.cos(theta - CURVE_ANGLE) * r],
      };
    }
  }

  // 周回状態をリセット（回転によって接続が変わる可能性があるため）
  if (isRailsLocked.value) {
    isRailsLocked.value = false;
    gameMode.value = "build";
  }
};

const onRailClick = (rail: Rail) => {
  if (gameMode.value !== "build") return;

  if (selectedTool.value === "delete") {
    const index = rails.value.findIndex((r) => r.id === rail.id);
    if (index > -1) {
      // 先頭または最後のレールのみ削除可能
      if (index === 0 || index === rails.value.length - 1) {
        rails.value.splice(index, 1);
        // 削除後にロック状態をリセット
        if (isRailsLocked.value) {
          isRailsLocked.value = false;
          gameMode.value = "build"; // ビルドモードに戻す
        }
      } else {
        showNotification("線路の削除は先頭または最後のレールのみ可能です", "warning");
      }
    }
  } else if (selectedTool.value === "rotate") {
    rotateRail(rail);
  }
};

const onTreeClick = (index: number) => {
  if (gameMode.value !== "build") return;
  if (selectedTool.value === "delete") {
    trees.value.splice(index, 1);
  } else if (selectedTool.value === "rotate") {
    const t = trees.value[index];
    if (!t) return;
    const rot = t.rotation ?? [0, 0, 0];
    t.rotation = [rot[0], rot[1] + Math.PI / 2, rot[2]];
  }
};

const onBuildingClick = (index: number) => {
  if (gameMode.value !== "build") return;
  if (selectedTool.value === "delete") {
    buildings.value.splice(index, 1);
  } else if (selectedTool.value === "rotate") {
    const b = buildings.value[index];
    if (!b) return;
    const rot = b.rotation ?? [0, 0, 0];
    b.rotation = [rot[0], rot[1] + Math.PI / 2, rot[2]];
  }
};

const onPierClick = (index: number) => {
  if (gameMode.value !== "build") return;
  if (selectedTool.value === "delete") {
    piers.value.splice(index, 1);
  } else if (selectedTool.value === "rotate") {
    const p = piers.value[index];
    if (!p) return;
    const rot = p.rotation ?? [0, 0, 0];
    p.rotation = [rot[0], rot[1] + Math.PI / 2, rot[2]];
  }
};

const toggleGameMode = () => {
  if (gameMode.value === "build" && canRunTrain.value) {
    gameMode.value = "run";
  } else if (gameMode.value === "run") {
    gameMode.value = "build";
    trainRunning.value = false; // 電車を停止
  }
};

const createLargeCircle = () => {
  // 半径2 の 45° カーブ 8本で一周
  rails.value = [];
  const num = 8;
  let pose: Pose = { point: [0, 0, 0], theta: 0 };
  for (let i = 0; i < num; i++) {
    const rail = makeLeftCurve(pose);
    rails.value.push(rail);
    pose = poseFromRailEnd(rail);
  }
  isRailsLocked.value = true;
  gameMode.value = "run";
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

const clearAllRails = () => {
  rails.value = [];
  trees.value = [];
  buildings.value = [];
  piers.value = [];
  isRailsLocked.value = false;
  gameMode.value = "build";
  trainRunning.value = false;
  resetTrain();
  // プレビュー類もリセット
  resetGhosts();
  // 列車を確実に削除（アンマウント）させ、次回の生成は新インスタンスに
  trainKey.value++;
  // 自由視点へ戻す
  resetToOrbit();
};

// ゲームデータの保存・復元機能（Pinia ストア利用）

const showNotification = (message: string, color: "success" | "error" | "warning" = "success") => {
  snackbarText.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
};

// 確認ダイアログを表示する関数
const showConfirmDialog = (title: string, message: string, action: () => void) => {
  confirmTitle.value = title;
  confirmMessage.value = message;
  confirmAction.value = action;
  confirmDialog.value = true;
};

// 確認ダイアログでの実行ボタンを押した時の処理
const executeConfirmAction = () => {
  if (confirmAction.value) {
    confirmAction.value();
  }
  confirmDialog.value = false;
  confirmAction.value = null;
};

const loadGameData = () => {
  const res = storage.load();
  if (!res.ok) {
    showNotification(res.message, "warning");
    return false;
  }
  const saveData = res.data;
  // データを復元
  rails.value = saveData.rails || [];
  trees.value = saveData.trees || [];
  buildings.value = saveData.buildings || [];
  piers.value = saveData.piers || [];
  gameMode.value = saveData.gameMode || "build";
  isRailsLocked.value = saveData.isRailsLocked || false;

  // 列車の強制再マウント
  trainKey.value++;

  // ゴーストをクリア
  resetGhosts();

  // カメラを初期位置に戻す
  resetToOrbit();

  const totalItems = rails.value.length + trees.value.length + buildings.value.length + piers.value.length;
  showNotification(`ゲームデータを復元しました（${totalItems}個のオブジェクト）`, "success");
  // 表示情報を更新
  saveDataInfo.value = storage.info;
  return true;
};

const getSaveDataInfo = () => {
  // 可能ならストアのキャッシュ済み情報を返す
  if (storage.info) return storage.info;
  if (!storage.has()) return null;
  // 情報だけ取得するためにロードして info を更新（状態には適用しない）
  const res = storage.load();
  if (res.ok) return storage.info;
  return null;
};

// 手動保存・復元ハンドラ
const handleSaveManual1 = () => {
  const totalItems = rails.value.length + trees.value.length + buildings.value.length + piers.value.length;
  if (totalItems === 0) {
    showNotification("保存するデータがありません", "warning");
    return;
  }

  const existingData = storage.getManualInfo1();
  let message = `現在のデータを保存1に保存しますか？<br><br>`;
  message += `<strong>保存予定のデータ:</strong><br>`;
  if (currentTitle.value) {
    message += `・タイトル: "${currentTitle.value}"<br>`;
  }
  message += `・線路: ${rails.value.length}本<br>`;
  message += `・木: ${trees.value.length}本<br>`;
  message += `・ビル: ${buildings.value.length}本<br>`;
  message += `・橋脚: ${piers.value.length}本<br>`;

  if (existingData) {
    message += `<br><strong>既存の保存1データ（上書きされます）:</strong><br>`;
    message += `・保存日時: ${new Date(existingData.timestamp).toLocaleString()}<br>`;
    if (existingData.title) {
      message += `・タイトル: "${existingData.title}"<br>`;
    }
    message += `・線路: ${existingData.railsCount}本、木: ${existingData.treesCount}本、ビル: ${existingData.buildingsCount}本、橋脚: ${existingData.piersCount}本`;
  }

  showConfirmDialog("保存1への保存確認", message, () => {
    const res = storage.saveManual1({
      title: currentTitle.value || undefined,
      rails: rails.value,
      trees: trees.value,
      buildings: buildings.value,
      piers: piers.value,
      gameMode: gameMode.value,
      isRailsLocked: isRailsLocked.value,
    });
    showNotification(res.message, res.ok ? "success" : "warning");
  });
};

const handleSaveManual2 = () => {
  const totalItems = rails.value.length + trees.value.length + buildings.value.length + piers.value.length;
  if (totalItems === 0) {
    showNotification("保存するデータがありません", "warning");
    return;
  }

  const existingData = storage.getManualInfo2();
  let message = `現在のデータを保存2に保存しますか？<br><br>`;
  message += `<strong>保存予定のデータ:</strong><br>`;
  if (currentTitle.value) {
    message += `・タイトル: "${currentTitle.value}"<br>`;
  }
  message += `・線路: ${rails.value.length}本<br>`;
  message += `・木: ${trees.value.length}本<br>`;
  message += `・ビル: ${buildings.value.length}本<br>`;
  message += `・橋脚: ${piers.value.length}本<br>`;

  if (existingData) {
    message += `<br><strong>既存の保存2データ（上書きされます）:</strong><br>`;
    message += `・保存日時: ${new Date(existingData.timestamp).toLocaleString()}<br>`;
    if (existingData.title) {
      message += `・タイトル: "${existingData.title}"<br>`;
    }
    message += `・線路: ${existingData.railsCount}本、木: ${existingData.treesCount}本、ビル: ${existingData.buildingsCount}本、橋脚: ${existingData.piersCount}本`;
  }

  showConfirmDialog("保存2への保存確認", message, () => {
    const res = storage.saveManual2({
      title: currentTitle.value || undefined,
      rails: rails.value,
      trees: trees.value,
      buildings: buildings.value,
      piers: piers.value,
      gameMode: gameMode.value,
      isRailsLocked: isRailsLocked.value,
    });
    showNotification(res.message, res.ok ? "success" : "warning");
  });
};

const handleLoadManual1 = () => {
  const saveInfo = storage.getManualInfo1();
  if (!saveInfo) {
    showNotification("保存1データが見つかりません", "warning");
    return;
  }

  const currentItems = rails.value.length + trees.value.length + buildings.value.length + piers.value.length;
  let message = `保存1データを復元しますか？<br><br>`;
  message += `<strong>復元予定のデータ:</strong><br>`;
  message += `・保存日時: ${new Date(saveInfo.timestamp).toLocaleString()}<br>`;
  if (saveInfo.title) {
    message += `・タイトル: "${saveInfo.title}"<br>`;
  }
  message += `・線路: ${saveInfo.railsCount}本<br>`;
  message += `・木: ${saveInfo.treesCount}本<br>`;
  message += `・ビル: ${saveInfo.buildingsCount}本<br>`;
  message += `・橋脚: ${saveInfo.piersCount}本<br>`;

  if (currentItems > 0) {
    message += `<br><strong>現在のデータ（破棄されます）:</strong><br>`;
    if (currentTitle.value) {
      message += `・タイトル: "${currentTitle.value}"<br>`;
    }
    message += `・線路: ${rails.value.length}本<br>`;
    message += `・木: ${trees.value.length}本<br>`;
    message += `・ビル: ${buildings.value.length}本<br>`;
    message += `・橋脚: ${piers.value.length}本`;
  }

  showConfirmDialog("保存1データの復元確認", message, () => {
    const res = storage.loadManual1();
    if (!res.ok) {
      showNotification(res.message, "warning");
      return;
    }

    const saveData = res.data;
    rails.value = saveData.rails || [];
    trees.value = saveData.trees || [];
    buildings.value = saveData.buildings || [];
    piers.value = saveData.piers || [];
    gameMode.value = saveData.gameMode || "build";
    isRailsLocked.value = saveData.isRailsLocked || false;
    currentTitle.value = saveData.title || "";

    trainKey.value++;
    resetGhosts();
    resetToOrbit();

    const totalItems = rails.value.length + trees.value.length + buildings.value.length + piers.value.length;
    showNotification(`保存1データを復元しました（${totalItems}個のオブジェクト）`, "success");
  });
};

const handleLoadManual2 = () => {
  const saveInfo = storage.getManualInfo2();
  if (!saveInfo) {
    showNotification("保存2データが見つかりません", "warning");
    return;
  }

  const currentItems = rails.value.length + trees.value.length + buildings.value.length + piers.value.length;
  let message = `保存2データを復元しますか？<br><br>`;
  message += `<strong>復元予定のデータ:</strong><br>`;
  message += `・保存日時: ${new Date(saveInfo.timestamp).toLocaleString()}<br>`;
  if (saveInfo.title) {
    message += `・タイトル: "${saveInfo.title}"<br>`;
  }
  message += `・線路: ${saveInfo.railsCount}本<br>`;
  message += `・木: ${saveInfo.treesCount}本<br>`;
  message += `・ビル: ${saveInfo.buildingsCount}本<br>`;
  message += `・橋脚: ${saveInfo.piersCount}本<br>`;

  if (currentItems > 0) {
    message += `<br><strong>現在のデータ（破棄されます）:</strong><br>`;
    if (currentTitle.value) {
      message += `・タイトル: "${currentTitle.value}"<br>`;
    }
    message += `・線路: ${rails.value.length}本<br>`;
    message += `・木: ${trees.value.length}本<br>`;
    message += `・ビル: ${buildings.value.length}本<br>`;
    message += `・橋脚: ${piers.value.length}本`;
  }

  showConfirmDialog("保存2データの復元確認", message, () => {
    const res = storage.loadManual2();
    if (!res.ok) {
      showNotification(res.message, "warning");
      return;
    }

    const saveData = res.data;
    rails.value = saveData.rails || [];
    trees.value = saveData.trees || [];
    buildings.value = saveData.buildings || [];
    piers.value = saveData.piers || [];
    gameMode.value = saveData.gameMode || "build";
    isRailsLocked.value = saveData.isRailsLocked || false;
    currentTitle.value = saveData.title || "";

    trainKey.value++;
    resetGhosts();
    resetToOrbit();

    const totalItems = rails.value.length + trees.value.length + buildings.value.length + piers.value.length;
    showNotification(`保存2データを復元しました（${totalItems}個のオブジェクト）`, "success");
  });
};

const toggleTrain = () => {
  trainRunning.value = !trainRunning.value;
};

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

const applyPreset = (preset: "default" | "red" | "green") => {
  switch (preset) {
    case "default":
      trainCustomization.value = {
        bodyColor: "#2E86C1",
        roofColor: "#1B4F72",
        windowColor: "#85C1E9",
        wheelColor: "#2C2C2C",
      };
      break;
    case "red":
      trainCustomization.value = {
        bodyColor: "#E74C3C",
        roofColor: "#B71C1C",
        windowColor: "#FFCDD2",
        wheelColor: "#424242",
      };
      break;
    case "green":
      trainCustomization.value = {
        bodyColor: "#27AE60",
        roofColor: "#1B5E20",
        windowColor: "#C8E6C9",
        wheelColor: "#2E2E2E",
      };
      break;
  }
  showNotification(
    `${preset === "default" ? "デフォルト" : preset === "red" ? "赤い電車" : "緑の電車"}プリセットを適用しました`,
    "success"
  );
};

// オーバル（1直線 + 左半円 + 1直線 + 左半円 = 計10本）プリセット生成
const createOvalPreset = (straightLength?: number) => {
  rails.value = [];
  isRailsLocked.value = false;
  gameMode.value = "build";

  const straightL =
    typeof straightLength === "number" && !isNaN(straightLength) ? straightLength : RAIL_STRAIGHT_FULL_LENGTH; // 直線1本の長さ（クリックイベント誤渡し対策）
  let theta = 0; // 進行方向角
  let current: [number, number, number] = [0, 0, 0];

  const addStraightOne = () => {
    const rail = makeStraight({ point: current, theta }, straightL);
    rails.value.push(rail);
    const pose = poseFromRailEnd(rail);
    current = pose.point;
    theta = pose.theta;
  };

  const addLeftCurve = () => {
    const rail = makeLeftCurve({ point: current, theta });
    rails.value.push(rail);
    const pose = poseFromRailEnd(rail);
    current = pose.point;
    theta = pose.theta;
  };

  // 1: 直線
  addStraightOne();
  // 2-5: 左半円（4カーブ）
  for (let i = 0; i < 4; i++) addLeftCurve();
  // 6: 反対側直線（現在 θ = π ）
  addStraightOne();
  // 7-10: 左半円（残り4カーブで閉じる）
  for (let i = 0; i < 4; i++) addLeftCurve();

  isRailsLocked.value = true;
  gameMode.value = "run";
};

// 左→右の S 字（向きデバッグ用、ループしない）
const createSCurvePreset = () => {
  rails.value = [];
  trees.value = [];
  buildings.value = [];
  isRailsLocked.value = false; // ループではない
  gameMode.value = "build";

  let theta = 0; // +X 方向
  let current: [number, number, number] = [0, 0, 0];

  // createOvalPreset の addLeftCurve と同一ロジック
  const addLeftCurveS = () => {
    const rail = makeLeftCurve({ point: current, theta });
    rails.value.push(rail);
    const pose = poseFromRailEnd(rail);
    current = pose.point;
    theta = pose.theta;
  };

  const addRightCurveS = () => {
    const rail = makeRightCurve({ point: current, theta });
    rails.value.push(rail);
    const pose = poseFromRailEnd(rail);
    current = pose.point;
    theta = pose.theta;
  };

  const addStraightOne = () => {
    const rail = makeStraight({ point: current, theta });
    rails.value.push(rail);
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

  // 線路の周りに適当にオブジェクトを配置（各5つ）
  const placeAround = (count: number, distance: number, y: number) => {
    const items: [number, number, number][] = [];
    const rnd = (min: number, max: number) => Math.random() * (max - min) + min;
    for (let i = 0; i < count; i++) {
      const rail = rails.value[Math.floor(Math.random() * rails.value.length)];
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
  trees.value = treePos.map((p) => ({ position: p }));
  const colors = ["#7FB3D5", "#85C1E9", "#5DADE2", "#A9CCE3", "#5499C7"];
  buildings.value = bldPos.map((p, idx) => ({
    position: p,
    height: 1.5 + (idx % 3) * 0.6,
    color: colors[idx % colors.length],
  }));
};

// 坂上り→坂下り→カーブx4→坂上り→坂下り→カーブx4（ループ）
const createSlopeUpDownCurvesPreset = () => {
  rails.value = [];
  isRailsLocked.value = false;
  gameMode.value = "build";

  let pose: Pose = { point: [0, 0, 0], theta: 0 };

  const add = (r: Rail) => {
    rails.value.push(r);
    pose = poseFromRailEnd(r);
  };

  // 上り→下り
  add(makeSlope(pose, true));
  add(makeSlope(pose, true));
  add(makeStraight(pose));
  add(makeStation(pose));
  add(makeStraight(pose));
  add(makeSlope(pose, false));
  add(makeSlope(pose, false));
  // カーブ x4（左）
  for (let i = 0; i < 2; i++) add(makeLeftCurve(pose));
  // 駅ホーム
  add(makeStation(pose));
  for (let i = 0; i < 2; i++) add(makeLeftCurve(pose));
  // 上り→下り
  add(makeSlope(pose, true));
  add(makeSlope(pose, true));
  add(makeStraight(pose));
  add(makeStation(pose));
  add(makeStraight(pose));
  add(makeSlope(pose, false));
  add(makeSlope(pose, false));
  // カーブ x4（左）
  for (let i = 0; i < 2; i++) add(makeLeftCurve(pose));
  // 駅ホーム
  add(makeCrossing(pose));
  for (let i = 0; i < 2; i++) add(makeLeftCurve(pose));

  // ループ完成しているのでロックして運転モードへ
  isRailsLocked.value = true;
  gameMode.value = "run";
};

// ツールやモード変更、レール本数の変化でプレビューを更新
watch(selectedTool, updateGhost);
watch(gameMode, updateGhost);
watch(() => rails.value.length, updateGhost);

// 運転モード → 配置モードに切り替わったらカメラを自由視点へ戻す
watch(gameMode, (mode, prev) => {
  if (mode === "build" && prev === "run") {
    resetToOrbit();
  }
});

// キーボードショートカット（回転）
const onKeyDown = (e: KeyboardEvent) => {
  if (gameMode.value !== "build") return;
  const shift = e.shiftKey;
  if (e.key === "r" || e.key === "R") {
    rotatePlacement(shift ? -2 : 1); // R: +45°, Shift+R: -90°
  } else if (e.key === "e" || e.key === "E") {
    rotatePlacement(shift ? 2 : -1); // E: -45°, Shift+E: +90°
  } else if (e.key === "q" || e.key === "Q") {
    resetPlacementRotation();
  } else if (e.key === "Escape") {
    // ESCキーで「なし」状態に切り替え
    selectedTool.value = "none";
  }
};

onMounted(() => {
  window.addEventListener("keydown", onKeyDown);
  // 保存データ情報を初期化
  saveDataInfo.value = getSaveDataInfo();

  // ページロード時に自動復元を実行
  if (storage.has()) {
    loadGameData();
  }

  // 自動保存を開始（rails/trees/buildings/piers/gameMode/isRailsLocked を監視）
  const { stop } = storage.startAutoSave(
    () => ({
      rails: rails.value,
      trees: trees.value,
      buildings: buildings.value,
      piers: piers.value,
      gameMode: gameMode.value,
      isRailsLocked: isRailsLocked.value,
    }),
    { debounceMs: 1500, immediate: false }
  );
  // アンマウント時に解除
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

/* TresCanvas を透過（alpha）にしたため、こちらの背景が見える */
.scene-column {
  background: #e6f4ff; /* 薄い空色 */
}
</style>
