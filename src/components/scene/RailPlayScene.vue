<template>
  <TresCanvas
    style="height: 100%"
    :alpha="true"
    @click="onCanvasClick"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMoveScene"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
  >
    <!-- Main Camera (orbit / front 共用) -->
    <TresPerspectiveCamera
      ref="cameraRef"
      :position="cameraPosition"
      :rotation="cameraRotation"
      :fov="cameraMode === 'orbit' ? 50 : 70"
    />

    <!-- Controls (orbit モード時のみ) -->
    <OrbitControls
      v-if="cameraMode === 'orbit'"
      ref="orbitControlsRef"
      :maxPolarAngle="Math.PI / 2 - 0.005"
      :minDistance="3"
      :maxDistance="50"
      :minAzimuthAngle="-Infinity"
      :maxAzimuthAngle="Infinity"
      :minPolarAngle="0"
      :enablePan="true"
      @change="restrictCameraTarget"
    />

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
    <!-- 北の壁（白系） -->
    <TresMesh :position="[0, 5, -AREA_LIMIT]">
      <TresPlaneGeometry :args="[50, 10]" />
      <TresMeshLambertMaterial color="#F5F5F5" :side="2" />
    </TresMesh>

    <!-- 南の壁（白系） -->
    <TresMesh :position="[0, 5, AREA_LIMIT]">
      <TresPlaneGeometry :args="[50, 10]" />
      <TresMeshLambertMaterial color="#FAFAFA" :side="2" />
    </TresMesh>

    <!-- 東の壁（白系） -->
    <TresMesh :position="[AREA_LIMIT, 5, 0]" :rotation="[0, Math.PI / 2, 0]">
      <TresPlaneGeometry :args="[50, 10]" />
      <TresMeshLambertMaterial color="#F7F7F7" :side="2" />
    </TresMesh>

    <!-- 西の壁（白系） -->
    <TresMesh :position="[-AREA_LIMIT, 5, 0]" :rotation="[0, Math.PI / 2, 0]">
      <TresPlaneGeometry :args="[50, 10]" />
      <TresMeshLambertMaterial color="#FFFFFF" :side="2" />
    </TresMesh>

    <!-- Rails -->
    <RailPlayRail v-for="rail in rails" :key="rail.id" :rail="rail" @click="onRailClick" />

    <!-- Station platforms are now rendered inside RailPlayRail component -->

    <!-- Train -->
    <RailPlayTrain :cars="carTransforms" :customization="trainCustomization" />

    <!-- Trees -->
    <RailPlayTree
      v-for="(t, i) in trees"
      :key="'tree-' + i"
      :position="t.position"
      :rotation="t.rotation"
      @click="onTreeClick(i)"
    />

    <!-- Buildings -->
    <RailPlayBuilding
      v-for="(b, i) in buildings"
      :key="'bld-' + i"
      :position="b.position"
      :height="b.height"
      :color="b.color"
      :rotation="b.rotation"
      @click="onBuildingClick(i)"
    />

    <!-- Piers -->
    <RailPlayPier
      v-for="(p, i) in piers"
      :key="`pier-${piersKey}-${i}`"
      :position="p.position"
      :height="p.height"
      :rotation="p.rotation"
      @click="onPierClick(i)"
    />

    <!-- Ghost rail preview -->
    <RailPlayRail v-if="ghostRail" :key="`ghost-${ghostRail.id}`" :rail="ghostRail" :ghost="true" />

    <!-- Ghost tree/building preview -->
    <RailPlayTree v-if="ghostTree" :position="ghostTree.position" :rotation="ghostTree.rotation" :ghost="true" />
    <RailPlayBuilding
      v-if="ghostBuilding"
      :position="ghostBuilding.position"
      :height="ghostBuilding.height"
      :color="ghostBuilding.color"
      :rotation="ghostBuilding.rotation"
      :ghost="true"
    />

    <!-- Ghost pier preview -->
    <RailPlayPier
      v-if="ghostPier"
      :position="ghostPier.position"
      :height="ghostPier.height"
      :rotation="ghostPier.rotation"
      :ghost="true"
    />

    <!-- Ghost station preview is now rendered inside RailPlayRail component -->
  </TresCanvas>
</template>

<script setup lang="ts">
import { TresCanvas } from "@tresjs/core";
import { shallowRef, onMounted } from "vue";
import { OrbitControls } from "@tresjs/cientos";
import RailPlayRail from "../RailPlayRail.vue";
import RailPlayTrain from "../RailPlayTrain.vue";
import RailPlayTree from "../RailPlayTree.vue";
import RailPlayBuilding from "../RailPlayBuilding.vue";
import RailPlayPier from "../RailPlayPier.vue";
import type { Rail } from "../../types/rail";

interface ClickEvent {
  intersections?: Array<{
    point: { x: number; y: number; z: number };
  }>;
  // Tres の Pointer イベントは point を直接持つ場合がある
  point?: { x: number; y: number; z: number };
}

// Props
interface Props {
  // カメラ関連
  cameraPosition: [number, number, number];
  cameraRotation: [number, number, number];
  cameraMode: "orbit" | "front";

  // ゲームオブジェクト
  rails: Rail[];
  trees: { position: [number, number, number]; rotation?: [number, number, number] }[];
  buildings: {
    position: [number, number, number];
    height?: number;
    color?: string;
    rotation?: [number, number, number];
  }[];
  piers: { position: [number, number, number]; height?: number; rotation?: [number, number, number] }[];
  piersKey: number;

  // 列車関連
  carTransforms: { position: [number, number, number]; rotation: [number, number, number] }[];
  trainCustomization: {
    bodyColor: string;
    roofColor: string;
    windowColor: string;
    wheelColor: string;
  };

  // ゴースト関連
  ghostRail: Rail | null;
  ghostTree: { position: [number, number, number]; rotation?: [number, number, number] } | null;
  ghostBuilding: {
    position: [number, number, number];
    height?: number;
    color?: string;
    rotation?: [number, number, number];
  } | null;
  ghostPier: { position: [number, number, number]; height?: number; rotation?: [number, number, number] } | null;
}

const AREA_LIMIT = 25; // カメラ移動のエリア制限（X/Z方向、正負）

const props = defineProps<Props>();
const cameraRef = shallowRef<any>(null);

// Emits
const emit = defineEmits<{
  canvasClick: [];
  planeClick: [event: ClickEvent];
  planePointerMove: [event: ClickEvent];
  railClick: [rail: Rail];
  treeClick: [index: number];
  buildingClick: [index: number];
  pierClick: [index: number];
  frontLookStart: [];
  frontLookMove: [dx: number, dy: number];
  frontLookEnd: [];
}>();

// Event handlers
const onCanvasClick = () => {
  emit("canvasClick");
};

const onPlaneClick = (event: ClickEvent) => {
  emit("planeClick", event);
};

const onPlanePointerMove = (event: ClickEvent) => {
  emit("planePointerMove", event);
};

const onRailClick = (rail: Rail) => {
  emit("railClick", rail);
};

const onTreeClick = (index: number) => {
  emit("treeClick", index);
};

// Front camera look drag
let dragging = false;
let lastX = 0;
let lastY = 0;
const onPointerDown = (e: PointerEvent) => {
  // OrbitControls が無効なとき（= front）だけドラッグで視点操作
  if ((props as any).cameraMode !== "front") return;
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  emit("frontLookStart");
};
const onPointerMoveScene = (e: PointerEvent) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  emit("frontLookMove", dx, dy);
};
const onPointerUp = () => {
  if (!dragging) return;
  dragging = false;
  emit("frontLookEnd");
};

onMounted(() => {
  // three.js の Euler 回転順を YXZ に設定（前後のピッチが進行方向に対して自然になる）
  // Tres のカメラは内部 three の Camera を保持している
  const cam = cameraRef.value?.instance || cameraRef.value;
  if (cam && cam.rotation) {
    cam.rotation.order = "YXZ";
  }
});

const restrictCameraTarget = (controls: any) => {
  // Y方向の移動を禁止（Y=0に固定）
  if (controls.target.y !== 0) {
    controls.target.y = 0;
  }

  // X/Z方向をエリア内に制限
  controls.target.x = Math.max(-AREA_LIMIT * 0.8, Math.min(AREA_LIMIT * 0.8, controls.target.x));
  controls.target.z = Math.max(-AREA_LIMIT * 0.8, Math.min(AREA_LIMIT * 0.8, controls.target.z));
};

const onBuildingClick = (index: number) => {
  emit("buildingClick", index);
};

const onPierClick = (index: number) => {
  emit("pierClick", index);
};
</script>
