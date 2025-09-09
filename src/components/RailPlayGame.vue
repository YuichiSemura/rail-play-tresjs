<template>
  <v-container fluid class="pa-0" style="height: 100vh">
    <v-row no-gutters style="height: 100%">
      <v-col cols="3">
        <v-card class="h-100 pa-4">
          <v-card-title class="d-flex justify-space-between align-center">
            <span>{{ gameMode === "build" ? "レール配置モード" : "運転モード" }}</span>
            <v-btn
              size="small"
              :color="gameMode === 'run' ? 'success' : 'primary'"
              @click="toggleGameMode"
              :disabled="gameMode === 'build' && !canRunTrain"
            >
              <v-icon>{{ gameMode === "build" ? "mdi-play" : "mdi-wrench" }}</v-icon>
              {{ gameMode === "build" ? "運転" : "配置" }}
            </v-btn>
          </v-card-title>

          <v-card-text v-if="gameMode === 'build'">
            <v-btn-toggle v-model="selectedTool" color="primary" mandatory>
              <v-btn value="straight">
                <v-icon>mdi-minus</v-icon>
                直線
              </v-btn>
              <v-btn value="curve">
                <v-icon>mdi-rotate-right</v-icon>
                カーブ
              </v-btn>
              <v-btn value="rotate">
                <v-icon>mdi-rotate-3d-variant</v-icon>
                回転
              </v-btn>
              <v-btn value="delete">
                <v-icon>mdi-delete</v-icon>
                削除
              </v-btn>
            </v-btn-toggle>

            <div v-if="selectedTool === 'rotate'" class="mt-3">
              <v-alert type="info">
                <v-icon>mdi-information</v-icon>
                回転したいレールをクリックしてください
              </v-alert>
            </div>

            <v-alert v-if="isRailsLocked" type="success" class="mt-4">
              <v-icon>mdi-check-circle</v-icon>
              線路が周回完成！
            </v-alert>

            <v-alert v-else-if="rails.length > 0" type="info" class="mt-4">
              線路: {{ rails.length }}本配置済み
            </v-alert>

            <v-divider class="my-4" />

            <v-card-subtitle>Rails データ (デバッグ用)</v-card-subtitle>
            <div class="rails-debug" style="max-height: 300px; overflow-y: auto; font-size: 12px">
              <div
                v-for="(rail, index) in rails"
                :key="rail.id"
                class="mb-2 pa-2"
                style="background-color: #f5f5f5; border-radius: 4px"
              >
                <div>
                  <strong>Rail {{ index }}:</strong>
                </div>
                <div>Type: {{ rail.type }}</div>
                <div>
                  Position: [{{ rail.position[0].toFixed(2) }}, {{ rail.position[1].toFixed(2) }},
                  {{ rail.position[2].toFixed(2) }}]
                </div>
                <div>
                  Rotation: [{{ rail.rotation[0].toFixed(2) }}, {{ rail.rotation[1].toFixed(2) }},
                  {{ rail.rotation[2].toFixed(2) }}]
                </div>
                <div>
                  Start: [{{ rail.connections.start[0].toFixed(2) }}, {{ rail.connections.start[1].toFixed(2) }},
                  {{ rail.connections.start[2].toFixed(2) }}]
                </div>
                <div>
                  End: [{{ rail.connections.end[0].toFixed(2) }}, {{ rail.connections.end[1].toFixed(2) }},
                  {{ rail.connections.end[2].toFixed(2) }}]
                </div>
              </div>
            </div>

            <v-divider class="my-4" />

            <v-card-subtitle>プリセット線路</v-card-subtitle>
            <v-btn color="secondary" @click="createLargeCircle" :disabled="rails.length > 0" block class="mb-2">
              <v-icon>mdi-circle-outline</v-icon>
              大きな円を生成
            </v-btn>

            <v-btn color="secondary" @click="createOvalPreset()" :disabled="rails.length > 0" block class="mb-2">
              <v-icon>mdi-ellipse-outline</v-icon>
              オーバル生成
            </v-btn>

            <v-btn color="warning" @click="clearAllRails" :disabled="rails.length === 0" block>
              <v-icon>mdi-delete-sweep</v-icon>
              すべてクリア
            </v-btn>
            <v-divider class="my-4" />
            <v-card-subtitle>方向デバッグ</v-card-subtitle>
            <v-btn color="secondary" @click="createSCurvePreset" :disabled="rails.length > 0" block class="mb-2">
              <v-icon>mdi-axis-z-rotate-clockwise</v-icon>
              S字（左→右）
            </v-btn>
          </v-card-text>

          <v-card-text v-else>
            <v-btn color="success" :disabled="!canRunTrain" @click="toggleTrain" block class="mb-3">
              {{ trainRunning ? "停止" : "走らせる" }}
            </v-btn>

            <v-btn color="secondary" :disabled="!canRunTrain" @click="toggleCameraMode" block class="mb-3">
              <v-icon class="mr-1">{{ cameraMode === "orbit" ? "mdi-train" : "mdi-orbit" }}</v-icon>
              {{ cameraMode === "orbit" ? "先頭カメラ" : "自由視点" }}
            </v-btn>

            <v-slider v-model="trainSpeed" :min="0.1" :max="2.0" :step="0.1" label="速度" />
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="9" class="position-relative">
        <TresCanvas style="height: 100vh" @click="onCanvasClick">
          <!-- Main Camera (orbit / front 共用) -->
          <TresPerspectiveCamera
            :position="cameraPosition"
            :rotation="cameraRotation"
            :fov="cameraMode === 'orbit' ? 50 : 70"
          />

          <!-- Controls (orbit モード時のみ) -->
          <OrbitControls v-if="cameraMode === 'orbit'" />

          <!-- Lights -->
          <TresAmbientLight :intensity="0.5" />
          <TresDirectionalLight :position="[10, 10, 5]" :intensity="1" cast-shadow />

          <!-- Floor -->
          <TresMesh :rotation="[-Math.PI / 2, 0, 0]" :position="[0, -0.01, 0]" @click="onPlaneClick">
            <TresPlaneGeometry :args="[50, 50]" />
            <TresMeshLambertMaterial color="#90EE90" :side="2" />
          </TresMesh>

          <!-- Grid helpers (just above the floor) - unified color -->
          <!-- Minor grid: 1u step -->
          <TresGridHelper :args="[50, 50, '#888888', '#888888']" :position="[0, -0.005, 0]" />
          <!-- Major grid: 2u step (double overlay for stronger look) -->
          <TresGridHelper :args="[50, 25, '#888888', '#888888']" :position="[0, -0.004, 0]" />
          <TresGridHelper :args="[50, 25, '#888888', '#888888']" :position="[0, -0.003, 0]" />

          <!-- Axis-aligned grid lines (X/Z at 0) -->
          <!-- X-axis grid line at Z=0 -->
          <TresMesh :position="[0, -0.002, 0]">
            <TresBoxGeometry :args="[50, 0.001, 0.04]" />
            <TresMeshBasicMaterial color="#888888" />
          </TresMesh>
          <!-- Z-axis grid line at X=0 -->
          <TresMesh :position="[0, -0.002, 0]">
            <TresBoxGeometry :args="[0.04, 0.001, 50]" />
            <TresMeshBasicMaterial color="#888888" />
          </TresMesh>

          <!-- Origin: axes + small marker -->
          <TresAxesHelper :args="[3]" :position="[0, 0, 0]" />
          <TresMesh :position="[0, 0.05, 0]">
            <TresSphereGeometry :args="[0.07, 16, 16]" />
            <TresMeshStandardMaterial color="#FFD700" />
          </TresMesh>

          <!-- 壁（方角表示用） -->
          <!-- 北の壁（赤） -->
          <TresMesh :position="[0, 5, -25]">
            <TresPlaneGeometry :args="[50, 10]" />
            <TresMeshLambertMaterial color="#FF6B6B" :side="2" />
          </TresMesh>

          <!-- 南の壁（青） -->
          <TresMesh :position="[0, 5, 25]">
            <TresPlaneGeometry :args="[50, 10]" />
            <TresMeshLambertMaterial color="#4ECDC4" :side="2" />
          </TresMesh>

          <!-- 東の壁（黄） -->
          <TresMesh :position="[25, 5, 0]" :rotation="[0, Math.PI / 2, 0]">
            <TresPlaneGeometry :args="[50, 10]" />
            <TresMeshLambertMaterial color="#FFE66D" :side="2" />
          </TresMesh>

          <!-- 西の壁（緑） -->
          <TresMesh :position="[-25, 5, 0]" :rotation="[0, Math.PI / 2, 0]">
            <TresPlaneGeometry :args="[50, 10]" />
            <TresMeshLambertMaterial color="#95E1D3" :side="2" />
          </TresMesh>

          <!-- Rails -->
          <RailPlayRail v-for="rail in rails" :key="rail.id" :rail="rail" @click="onRailClick" />

          <!-- Train -->
          <RailPlayTrain
            v-if="rails.length > 0"
            :rails="rails"
            :speed="trainSpeed"
            :running="trainRunning"
            @pose="onTrainPose"
          />
        </TresCanvas>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls } from "@tresjs/cientos";
import RailPlayRail from "./RailPlayRail.vue";
import RailPlayTrain from "./RailPlayTrain.vue";
// 共通定数
import {
  CURVE_SEGMENT_ANGLE as CURVE_ANGLE,
  RAIL_CURVE_RADIUS,
  RAIL_STRAIGHT_FULL_LENGTH,
  RAIL_STRAIGHT_HALF_LENGTH,
} from "../constants/rail";

export interface Rail {
  id: string;
  type: "straight" | "curve";
  position: [number, number, number];
  rotation: [number, number, number];
  connections: {
    start: [number, number, number];
    end: [number, number, number];
  };
  direction?: "left" | "right";
}

type GameMode = "build" | "run";
type CameraMode = "orbit" | "front";

const gameMode = ref<GameMode>("build");
const selectedTool = ref<"straight" | "curve" | "rotate" | "delete">("straight");
const rails = ref<Rail[]>([]);
const trainRunning = ref(false);
const trainSpeed = ref(1.0);
const isRailsLocked = ref(false);
const cameraMode = ref<CameraMode>("orbit");
// カメラ姿勢（orbit モード初期位置）
const cameraPosition = ref<[number, number, number]>([15, 8, 15]);
const cameraRotation = ref<[number, number, number]>([0, 0, 0]);
// 列車先頭ビュー時の追従オフセット
const FRONT_OFFSET: [number, number, number] = [0, 0.07, -0.4]; // 少し後ろから車両前方を見る

const onTrainPose = (payload: { position: [number, number, number]; rotation: [number, number, number] }) => {
  if (cameraMode.value !== "front") return;
  const [px, py, pz] = payload.position;
  const [, yaw] = payload.rotation;
  // yaw に基づきローカルオフセットを回転
  const ox = FRONT_OFFSET[0] * Math.cos(yaw) - FRONT_OFFSET[2] * Math.sin(yaw);
  const oz = FRONT_OFFSET[0] * Math.sin(yaw) + FRONT_OFFSET[2] * Math.cos(yaw);
  cameraPosition.value = [px - ox, py + FRONT_OFFSET[1], pz + oz];
  cameraRotation.value = [0, yaw, 0];
};

// モード切替時に orbit 初期姿勢へ戻す
watch(cameraMode, (m) => {
  if (m === "orbit") {
    cameraPosition.value = [15, 8, 15];
    cameraRotation.value = [0, 0, 0];
  }
});

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

const snapToGrid = (position: number): number => {
  return Math.round(position / 2) * 2;
};

// 進行端点の姿勢（接続開始点とその時の進行方向角 θ）
type Pose = { point: [number, number, number]; theta: number };

// 直線レールを返す（start=pose.point, 長さ=length, 方向=theta）
const makeStraight = (pose: Pose, length = RAIL_STRAIGHT_FULL_LENGTH): Rail => {
  const start = pose.point;
  const end: [number, number, number] = [
    start[0] + Math.cos(pose.theta) * length,
    start[1],
    start[2] + Math.sin(pose.theta) * length,
  ];
  const mid: [number, number, number] = [(start[0] + end[0]) / 2, start[1], (start[2] + end[2]) / 2];
  return {
    id: `straight-${Date.now()}-${Math.random()}`,
    type: "straight",
    position: mid,
    rotation: [0, -pose.theta, 0],
    connections: { start, end },
  };
};

// 左カーブ1本（45°）を返す（start=pose.point, θ=pose.theta）
const makeLeftCurve = (pose: Pose): Rail => {
  const r = RAIL_CURVE_RADIUS;
  const cx = pose.point[0] - Math.sin(pose.theta) * r;
  const cz = pose.point[2] + Math.cos(pose.theta) * r;
  const position: [number, number, number] = [cx, 0, cz];
  const rotation: [number, number, number] = [0, pose.theta, 0];
  const end: [number, number, number] = [
    position[0] + Math.sin(pose.theta + CURVE_ANGLE) * r,
    0,
    position[2] - Math.cos(pose.theta + CURVE_ANGLE) * r,
  ];
  return {
    id: `curve-left-${Date.now()}-${Math.random()}`,
    type: "curve",
    position,
    rotation,
    connections: { start: pose.point, end },
    direction: "left",
  };
};

// 右カーブ1本（45°）を返す（start=pose.point, θ=pose.theta）
const makeRightCurve = (pose: Pose): Rail => {
  const r = RAIL_CURVE_RADIUS;
  const cx = pose.point[0] + Math.sin(pose.theta) * r;
  const cz = pose.point[2] - Math.cos(pose.theta) * r;
  const position: [number, number, number] = [cx, 0, cz];
  const rotation: [number, number, number] = [0, pose.theta, 0];
  // For right turn, end point is C - n_right(theta - Δ) where n_right(a) = (sin a, -cos a)
  // => end = [cx - sin(theta-Δ)*r, cz + cos(theta-Δ)*r]
  const end: [number, number, number] = [
    position[0] - Math.sin(pose.theta - CURVE_ANGLE) * r,
    0,
    position[2] + Math.cos(pose.theta - CURVE_ANGLE) * r,
  ];
  return {
    id: `curve-right-${Date.now()}-${Math.random()}`,
    type: "curve",
    position,
    rotation,
    connections: { start: pose.point, end },
    direction: "right",
  };
};

// 与えたレールの「終端」姿勢を返す（次レールの pose に使う）
const poseFromRailEnd = (rail: Rail): Pose => {
  const end = rail.connections.end;
  if (rail.type === "straight") {
    // pathAngle = -rotation.y
    const theta = -rail.rotation[1];
    return { point: end, theta };
  }
  // curve: rotation.y = 開始接線方向角
  const base = rail.rotation[1];
  const theta = rail.direction === "right" ? base - CURVE_ANGLE : base + CURVE_ANGLE;
  return { point: end, theta };
};

const createRail = (x: number, z: number, type: "straight" | "curve"): Rail => {
  // 前のレール終端姿勢（なければ原点+X）
  let pose: Pose = { point: [0, 0, 0], theta: 0 };
  if (rails.value.length > 0) {
    pose = poseFromRailEnd(rails.value[rails.value.length - 1]);
  } else {
    // 最初はクリック位置をグリッドスナップして開始点にする
    pose.point = [snapToGrid(x), 0, snapToGrid(z)];
  }

  if (type === "straight") {
    // クリック方向で長さを決める（start→click まで）
    const dx = snapToGrid(x) - pose.point[0];
    const dz = snapToGrid(z) - pose.point[2];
    const length = Math.max(0.0001, Math.hypot(dx, dz));
    pose.theta = Math.atan2(dz, dx);
    return makeStraight(pose, length);
  } else {
    // クリックが接線の左側か右側かで分岐
    const leftSide = (() => {
      const dir = { x: Math.cos(pose.theta), z: Math.sin(pose.theta) };
      const vx = snapToGrid(x) - pose.point[0];
      const vz = snapToGrid(z) - pose.point[2];
      const cross = dir.x * vz - dir.z * vx; // 2D cross: (dir x v)
      return cross > 0; // 左側なら正
    })();
    return leftSide ? makeLeftCurve(pose) : makeRightCurve(pose);
  }
};

interface ClickEvent {
  intersections?: Array<{
    point: { x: number; y: number; z: number };
  }>;
}

const onPlaneClick = (event: ClickEvent) => {
  if (selectedTool.value === "delete" || selectedTool.value === "rotate") return;
  if (gameMode.value !== "build") return; // ビルドモード以外では配置不可

  const intersect = event.intersections?.[0];
  if (intersect) {
    const point = intersect.point;
    const newRail = createRail(point.x, point.z, selectedTool.value as "straight" | "curve");
    rails.value.push(newRail);
  }
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
  } else {
    const r = RAIL_CURVE_RADIUS;
    const theta = iry;
    if ((rail.direction || "left") === "left") {
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
      rails.value.splice(index, 1);
      // 削除後にロック状態をリセット
      if (isRailsLocked.value) {
        isRailsLocked.value = false;
        gameMode.value = "build"; // ビルドモードに戻す
      }
    }
  } else if (selectedTool.value === "rotate") {
    rotateRail(rail);
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

const clearAllRails = () => {
  rails.value = [];
  isRailsLocked.value = false;
  gameMode.value = "build";
  trainRunning.value = false;
};

const toggleTrain = () => {
  trainRunning.value = !trainRunning.value;
};

const toggleCameraMode = () => {
  cameraMode.value = cameraMode.value === "orbit" ? "front" : "orbit";
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
};
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
</style>
