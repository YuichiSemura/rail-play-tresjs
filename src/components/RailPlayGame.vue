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
              <v-btn value="slope">
                <v-icon>mdi-trending-up</v-icon>
                スロープ
              </v-btn>
              <v-btn value="tree">
                <v-icon>mdi-pine-tree</v-icon>
                木
              </v-btn>
              <v-btn value="building">
                <v-icon>mdi-office-building</v-icon>
                ビル
              </v-btn>
              <v-btn value="pier">
                <v-icon>mdi-pillar</v-icon>
                橋脚
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

            <v-card-subtitle>プレビュー（デバッグ）</v-card-subtitle>
            <div class="rails-debug" style="max-height: 140px; overflow-y: auto; font-size: 12px">
              <div class="mb-2 pa-2" style="background-color: #f5f5f5; border-radius: 4px">
                <div>
                  <strong>lastPointer:</strong>
                  <span v-if="lastPointer"> [{{ lastPointer.x.toFixed(2) }}, {{ lastPointer.z.toFixed(2) }}] </span>
                  <span v-else>なし</span>
                </div>
                <div class="mt-1">
                  <strong>ghostRail:</strong>
                  <template v-if="ghostRail">
                    <div>Type: {{ ghostRail.type }} {{ ghostRail.direction ? `(${ghostRail.direction})` : "" }}</div>
                    <div>
                      Position: [
                      {{ ghostRail.position[0].toFixed(2) }}, {{ ghostRail.position[1].toFixed(2) }},
                      {{ ghostRail.position[2].toFixed(2) }}
                      ]
                    </div>
                    <div>RotY: {{ ((ghostRail.rotation[1] * 180) / Math.PI).toFixed(1) }}°</div>
                    <div>
                      Start: [
                      {{ ghostRail.connections.start[0].toFixed(2) }}, {{ ghostRail.connections.start[1].toFixed(2) }},
                      {{ ghostRail.connections.start[2].toFixed(2) }}
                      ]
                    </div>
                    <div>
                      End: [
                      {{ ghostRail.connections.end[0].toFixed(2) }}, {{ ghostRail.connections.end[1].toFixed(2) }},
                      {{ ghostRail.connections.end[2].toFixed(2) }}
                      ]
                    </div>
                  </template>
                  <span v-else>なし</span>
                </div>
              </div>
            </div>

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

            <v-btn color="secondary" @click="createSCurvePreset" :disabled="rails.length > 0" block class="mb-2">
              <v-icon>mdi-axis-z-rotate-clockwise</v-icon>
              S字（左→右）
            </v-btn>

            <v-btn
              color="secondary"
              @click="createSlopeUpDownCurvesPreset"
              :disabled="rails.length > 0"
              block
              class="mb-2"
            >
              <v-icon>mdi-trending-up</v-icon>
              スロープありオーバル
            </v-btn>

            <v-btn color="warning" @click="clearAllRails" :disabled="rails.length === 0" block>
              <v-icon>mdi-delete-sweep</v-icon>
              すべてクリア
            </v-btn>
            <v-divider class="my-4" />
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
          <TresMesh
            :rotation="[-Math.PI / 2, 0, 0]"
            :position="[0, -0.01, 0]"
            @click="onPlaneClick"
            @pointer-move="onPlanePointerMove"
          >
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

          <!-- Ghost rail preview -->
          <RailPlayRail v-if="ghostRail" :key="`ghost-${ghostRail.id}`" :rail="ghostRail" :ghost="true" />

          <!-- Ghost tree/building preview -->
          <RailPlayTree v-if="ghostTree" :position="ghostTree.position" :ghost="true" />
          <RailPlayBuilding
            v-if="ghostBuilding"
            :position="ghostBuilding.position"
            :height="ghostBuilding.height"
            :color="ghostBuilding.color"
            :ghost="true"
          />

          <!-- Train -->
          <RailPlayTrain :cars="carTransforms" />

          <!-- Trees -->
          <RailPlayTree v-for="(t, i) in trees" :key="'tree-' + i" :position="t.position" @click="onTreeClick(i)" />

          <!-- Buildings -->
          <RailPlayBuilding
            v-for="(b, i) in buildings"
            :key="'bld-' + i"
            :position="b.position"
            :height="b.height"
            :color="b.color"
            @click="onBuildingClick(i)"
          />

          <!-- Piers -->
          <RailPlayPier
            v-for="(p, i) in piers"
            :key="'pier-' + i"
            :position="p.position"
            :height="p.height || 1.5"
            @click="onPierClick(i)"
          />

          <!-- Ghost pier preview -->
          <RailPlayPier
            v-if="ghostPier"
            :position="ghostPier.position"
            :height="ghostPier.height || 1.5"
            :ghost="true"
          />
        </TresCanvas>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls } from "@tresjs/cientos";
import RailPlayRail from "./RailPlayRail.vue";
import RailPlayTrain from "./RailPlayTrain.vue";
import RailPlayTree from "./RailPlayTree.vue";
import RailPlayBuilding from "./RailPlayBuilding.vue";
import RailPlayPier from "./RailPlayPier.vue";
// 共通定数
import {
  CURVE_SEGMENT_ANGLE as CURVE_ANGLE,
  RAIL_CURVE_RADIUS,
  RAIL_STRAIGHT_FULL_LENGTH,
  RAIL_STRAIGHT_HALF_LENGTH,
  RAIL_SLOPE_RUN,
  RAIL_SLOPE_RISE,
} from "../constants/rail";

export interface Rail {
  id: string;
  type: "straight" | "curve" | "slope";
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
const selectedTool = ref<"straight" | "curve" | "slope" | "tree" | "building" | "pier" | "rotate" | "delete">(
  "straight"
);
const rails = ref<Rail[]>([]);
const trees = ref<{ position: [number, number, number] }[]>([]);
const buildings = ref<{ position: [number, number, number]; height?: number; color?: string }[]>([]);
const piers = ref<{ position: [number, number, number]; height?: number }[]>([]);
const trainRunning = ref(false);
// クリア時に列車コンポーネントを確実に破棄・再生成するためのキー
const trainKey = ref(0);
const trainSpeed = ref(1.0);
const isRailsLocked = ref(false);
const cameraMode = ref<CameraMode>("orbit");
// カメラ姿勢（orbit モード初期位置）
const cameraPosition = ref<[number, number, number]>([15, 8, 15]);
const cameraRotation = ref<[number, number, number]>([0, 0, 0]);
// 列車先頭ビュー時の追従オフセット
const FRONT_OFFSET: [number, number, number] = [0, 0.07, -0.4]; // 少し後ろから車両前方を見る（yは車両高さに加算）

// スムージング係数（0-1、小さいほどなめらか）
const CAM_POS_LERP = 0.18;
const CAM_ROT_LERP = 0.12;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

const angleLerp = (current: number, target: number, t: number) => {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * t;
};

// ----------------- 列車の姿勢（親側で管理） -----------------
import { CAR_SPACING, CAR_COUNT, HEIGHT_OFFSET } from "../constants/train";
type CarPose = { position: [number, number, number]; rotation: [number, number, number] };
const initialPose: CarPose[] = Array.from({ length: CAR_COUNT }, (_, i) => ({
  position: [-(i * CAR_SPACING), HEIGHT_OFFSET, 0],
  rotation: [0, Math.PI / 2, 0],
}));
const carTransforms = ref<CarPose[]>(initialPose);
let progressDist = 0;

// レール区間長の簡易計算（従来ロジックを親側に移設）
const segmentLength = (r: Rail) =>
  r.type === "straight" || r.type === "slope"
    ? Math.hypot(r.connections.end[0] - r.connections.start[0], r.connections.end[2] - r.connections.start[2])
    : RAIL_CURVE_RADIUS * CURVE_ANGLE;

const totalRailLength = () => rails.value.reduce((acc, r) => acc + segmentLength(r), 0);

const getPoseOnRail = (r: Rail, t: number): CarPose => {
  if (r.type === "straight" || r.type === "slope") {
    const sx = r.connections.start[0];
    const sy = r.connections.start[1];
    const sz = r.connections.start[2];
    const ex = r.connections.end[0];
    const ey = r.connections.end[1];
    const ez = r.connections.end[2];
    const dx = ex - sx;
    const dz = ez - sz;
    const len = Math.hypot(dx, dz) || 1;
    const nx = dx / len;
    const nz = dz / len;
    const x = sx + nx * len * t;
    const z = sz + nz * len * t;
    const y = sy + (ey - sy) * t + HEIGHT_OFFSET;
    const yaw = Math.atan2(nx, nz);
    // pitch: 傾斜角。three.jsの回転規約では上りでマイナス、下りでプラスになるように反転して適用
    const pitch = Math.atan2(ey - sy, len);
    return { position: [x, y, z], rotation: [-pitch, yaw, 0] };
  }
  // curve
  const cx = r.position[0];
  const cz = r.position[2];
  const theta = r.rotation[1];
  const sgn = r.direction === "right" ? -1 : 1;
  const phi = theta - sgn * (Math.PI / 2) + sgn * CURVE_ANGLE * t;
  const x = cx + Math.cos(phi) * RAIL_CURVE_RADIUS;
  const z = cz + Math.sin(phi) * RAIL_CURVE_RADIUS;
  const tx = -sgn * Math.sin(phi);
  const tz = sgn * Math.cos(phi);
  const yaw = Math.atan2(tx, tz);
  const y = r.connections.start[1] + HEIGHT_OFFSET;
  return { position: [x, y, z], rotation: [0, yaw, 0] };
};

// 進行を1ステップ進め、carTransforms を更新
const stepTrain = () => {
  const L = totalRailLength();
  if (L <= 0) return;
  // 以前のセマンティクス維持
  const avgSegLen = rails.value.length > 0 ? L / rails.value.length : 1;
  progressDist += trainSpeed.value * 0.008 * avgSegLen;
  const wrap = (v: number, m: number) => ((v % m) + m) % m;
  progressDist = wrap(progressDist, L);

  // 進行距離に対応する区間を走査
  let d = progressDist;
  let idx = 0;
  for (; idx < rails.value.length; idx++) {
    const seg = segmentLength(rails.value[idx]);
    if (d <= seg) break;
    d -= seg;
  }
  const segLen = segmentLength(rails.value[idx] || rails.value[0]);
  const t = Math.max(0, Math.min(1, d / (segLen || 1)));
  const lead = getPoseOnRail(rails.value[idx] || rails.value[0], t);

  // 後続車
  const poses: CarPose[] = [];
  for (let i = 0; i < CAR_COUNT; i++) {
    // 先頭から i 台分の距離を戻す
    let back = progressDist - i * CAR_SPACING;
    back = wrap(back, L);
    // 区間再走査
    let dd = back;
    let j = 0;
    for (; j < rails.value.length; j++) {
      const seg = segmentLength(rails.value[j]);
      if (dd <= seg) break;
      dd -= seg;
    }
    const sl = segmentLength(rails.value[j] || rails.value[0]);
    const tt = Math.max(0, Math.min(1, dd / (sl || 1)));
    const pose = getPoseOnRail(rails.value[j] || rails.value[0], tt);
    // ピッチのみスムージングして、境目で急に角度が変わらないようにする
    const prev = carTransforms.value[i];
    const PITCH_LERP = 0.08; // 0-1 小さいほどなめらか（以前: 0.25 -> よりゆっくり補間）
    const smoothedPitch = prev ? angleLerp(prev.rotation[0], pose.rotation[0], PITCH_LERP) : pose.rotation[0];
    poses.push({ position: pose.position, rotation: [smoothedPitch, pose.rotation[1], pose.rotation[2]] });
  }
  carTransforms.value = poses;
  // カメラ追従
  onTrainPose({ position: lead.position, rotation: [lead.rotation[0], lead.rotation[1] - Math.PI, lead.rotation[2]] });
};

// アニメーションループ
let animId: number | null = null;
const loop = () => {
  if (gameMode.value === "run" && canRunTrain.value && trainRunning.value) {
    stepTrain();
  }
  animId = requestAnimationFrame(loop);
};
if (typeof window !== "undefined") loop();

onUnmounted(() => {
  if (animId !== null) {
    cancelAnimationFrame(animId);
    animId = null;
  }
});

const onTrainPose = (payload: { position: [number, number, number]; rotation: [number, number, number] }) => {
  if (cameraMode.value !== "front") return;
  const [px, py, pz] = payload.position;
  const [, yaw] = payload.rotation;
  // yaw に基づきローカルオフセットを回転
  const ox = FRONT_OFFSET[0] * Math.cos(yaw) - FRONT_OFFSET[2] * Math.sin(yaw);
  const oz = FRONT_OFFSET[0] * Math.sin(yaw) + FRONT_OFFSET[2] * Math.cos(yaw);
  const targetPos: [number, number, number] = [px - ox, py + FRONT_OFFSET[1], pz + oz];
  const targetYaw = yaw;

  // 現在値から目標へ補間
  cameraPosition.value = lerp3(cameraPosition.value, targetPos, CAM_POS_LERP);
  cameraRotation.value = [0, angleLerp(cameraRotation.value[1], targetYaw, CAM_ROT_LERP), 0];
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

// 任意のグリッドサイズでスナップ（木/ビル用に 1u を使用）
const snapToGridSize = (position: number, size: number): number => {
  return Math.round(position / size) * size;
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

// スロープレールを返す（start=pose.point, 水平投影長=RAIL_SLOPE_RUN, 上り/下り=ascending）
const makeSlope = (pose: Pose, ascending = true): Rail => {
  const start = pose.point;
  const dirx = Math.cos(pose.theta);
  const dirz = Math.sin(pose.theta);
  const rise = ascending ? RAIL_SLOPE_RISE : -RAIL_SLOPE_RISE;
  const end: [number, number, number] = [
    start[0] + dirx * RAIL_SLOPE_RUN,
    start[1] + rise,
    start[2] + dirz * RAIL_SLOPE_RUN,
  ];
  const mid: [number, number, number] = [(start[0] + end[0]) / 2, start[1], (start[2] + end[2]) / 2];
  return {
    id: `slope-${Date.now()}-${Math.random()}`,
    type: "slope",
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
  if (rail.type === "straight" || rail.type === "slope") {
    // pathAngle = -rotation.y
    const theta = -rail.rotation[1];
    return { point: end, theta };
  }
  // curve: rotation.y = 開始接線方向角
  const base = rail.rotation[1];
  const theta = rail.direction === "right" ? base - CURVE_ANGLE : base + CURVE_ANGLE;
  return { point: end, theta };
};

const createRail = (x: number, z: number, type: "straight" | "curve" | "slope"): Rail => {
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
  } else {
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
  }
};

interface ClickEvent {
  intersections?: Array<{
    point: { x: number; y: number; z: number };
  }>;
  // Tres の Pointer イベントは point を直接持つ場合がある
  point?: { x: number; y: number; z: number };
}

// ゴースト用の最後のポインタ座標とプレビューRail
const lastPointer = ref<{ x: number; z: number } | null>(null);
const ghostRail = ref<Rail | null>(null);
const ghostTree = ref<{ position: [number, number, number] } | null>(null);
const ghostBuilding = ref<{ position: [number, number, number]; height?: number; color?: string } | null>(null);
const ghostPier = ref<{ position: [number, number, number]; height?: number } | null>(null);

const updateGhost = () => {
  // すべて初期化
  ghostRail.value = null;
  ghostTree.value = null;
  ghostBuilding.value = null;
  ghostPier.value = null;

  if (gameMode.value !== "build") return;

  // レールのゴースト
  if (selectedTool.value === "straight" || selectedTool.value === "curve" || selectedTool.value === "slope") {
    if (rails.value.length === 0) {
      if (!lastPointer.value) return; // 初回は向き決めに必要
      ghostRail.value = createRail(lastPointer.value.x, lastPointer.value.z, selectedTool.value as any);
      return;
    }
    if (selectedTool.value === "straight") {
      ghostRail.value = createRail(0, 0, "straight");
    } else if (selectedTool.value === "curve") {
      if (!lastPointer.value) return;
      ghostRail.value = createRail(lastPointer.value.x, lastPointer.value.z, "curve");
    } else if (selectedTool.value === "slope") {
      if (!lastPointer.value) return;
      ghostRail.value = createRail(lastPointer.value.x, lastPointer.value.z, "slope");
    }
    return;
  }

  // 木のゴースト
  if (selectedTool.value === "tree") {
    if (!lastPointer.value) return;
    const px = snapToGridSize(lastPointer.value.x, 1);
    const pz = snapToGridSize(lastPointer.value.z, 1);
    ghostTree.value = { position: [px, 0, pz] };
    return;
  }

  // ビルのゴースト（標準色・高さ）
  if (selectedTool.value === "building") {
    if (!lastPointer.value) return;
    const px = snapToGridSize(lastPointer.value.x, 1);
    const pz = snapToGridSize(lastPointer.value.z, 1);
    ghostBuilding.value = { position: [px, 0, pz], height: 1.8, color: "#7FB3D5" };
    return;
  }
  if (selectedTool.value === "pier") {
    if (!lastPointer.value) return;
    const px = snapToGridSize(lastPointer.value.x, 1);
    const pz = snapToGridSize(lastPointer.value.z, 1);
    ghostPier.value = { position: [px, 0, pz], height: 1.5 };
    return;
  }
};

const addTreeAt = (x: number, z: number) => {
  const px = snapToGridSize(x, 1);
  const pz = snapToGridSize(z, 1);
  // 同座標重複を軽減
  if (!trees.value.some((t) => Math.hypot(t.position[0] - px, t.position[2] - pz) < 0.1)) {
    trees.value.push({ position: [px, 0, pz] });
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
    buildings.value.push({ position: [px, 0, pz], height, color });
  }
};

const addPierAt = (x: number, z: number) => {
  const px = snapToGridSize(x, 1);
  const pz = snapToGridSize(z, 1);
  if (!piers.value.some((p) => Math.hypot(p.position[0] - px, p.position[2] - pz) < 0.1)) {
    piers.value.push({ position: [px, 0, pz], height: 1.5 });
  }
};

const onPlaneClick = (event: ClickEvent) => {
  if (gameMode.value !== "build") return; // ビルドモード以外では配置不可

  const intersect = event.intersections?.[0];
  const pointLike = intersect?.point ?? event.point;
  if (!pointLike) return;

  const point = pointLike;
  // クリックでも最終ポインタを更新（カーブのプレビューに必要）
  lastPointer.value = { x: point.x, z: point.z };

  if (selectedTool.value === "straight" || selectedTool.value === "curve" || selectedTool.value === "slope") {
    const newRail = createRail(point.x, point.z, selectedTool.value);
    rails.value.push(newRail);
    updateGhost();
    return;
  }
  if (selectedTool.value === "tree") {
    addTreeAt(point.x, point.z);
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
  // rotate/delete は平面では何もしない
};

const onPlanePointerMove = (event: ClickEvent) => {
  const intersect = event.intersections?.[0];
  const pointLike = intersect?.point ?? event.point;
  if (!pointLike) return;
  lastPointer.value = { x: pointLike.x, z: pointLike.z };
  updateGhost();
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

const onTreeClick = (index: number) => {
  if (gameMode.value !== "build") return;
  if (selectedTool.value === "delete") {
    trees.value.splice(index, 1);
  }
};

const onBuildingClick = (index: number) => {
  if (gameMode.value !== "build") return;
  if (selectedTool.value === "delete") {
    buildings.value.splice(index, 1);
  }
};

const onPierClick = (index: number) => {
  if (gameMode.value !== "build") return;
  if (selectedTool.value === "delete") {
    piers.value.splice(index, 1);
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
  trees.value = [];
  buildings.value = [];
  piers.value = [];
  isRailsLocked.value = false;
  gameMode.value = "build";
  trainRunning.value = false;
  carTransforms.value = initialPose;
  // プレビュー類もリセット
  ghostRail.value = null;
  ghostTree.value = null;
  ghostBuilding.value = null;
  ghostPier.value = null;
  lastPointer.value = null;
  // 列車を確実に削除（アンマウント）させ、次回の生成は新インスタンスに
  trainKey.value++;
  // 自由視点へ戻す
  cameraMode.value = "orbit";
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
  add(makeSlope(pose, false));
  // カーブ x4（左）
  for (let i = 0; i < 4; i++) add(makeLeftCurve(pose));
  // 上り→下り
  add(makeSlope(pose, true));
  add(makeSlope(pose, false));
  // カーブ x4（左）
  for (let i = 0; i < 4; i++) add(makeLeftCurve(pose));

  // ループ完成しているのでロックして運転モードへ
  isRailsLocked.value = true;
  gameMode.value = "run";
};

// ツールやモード変更、レール本数の変化でプレビューを更新
watch(selectedTool, () => updateGhost());
watch(gameMode, () => updateGhost());
watch(
  () => rails.value.length,
  () => updateGhost()
);
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
