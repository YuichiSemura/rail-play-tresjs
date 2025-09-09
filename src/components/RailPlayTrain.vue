<template>
  <!-- 3両（既定）を等間隔で表示 -->
  <TresGroup
    v-for="(car, i) in carTransforms"
    :key="i"
    :position="car.position"
    :rotation="car.rotation"
    :scale="[TRAIN_SCALE, TRAIN_SCALE, TRAIN_SCALE]"
  >
    <!-- 車体本体（1/3程度に縮小: 元 0.8x0.8x2.2 → スケール適用で実質 0.36x0.36x0.99 相当） -->
    <TresMesh>
      <TresBoxGeometry :args="[0.8, 0.8, 2.2]" />
      <TresMeshLambertMaterial color="#2E86C1" />
    </TresMesh>
    <!-- 屋根 -->
    <TresMesh :position="[0, 0.5, 0]">
      <TresBoxGeometry :args="[0.9, 0.2, 2.3]" />
      <TresMeshLambertMaterial color="#1B4F72" />
    </TresMesh>
    <!-- 前窓 -->
    <TresMesh :position="[0, 0.2, 1.0]">
      <TresBoxGeometry :args="[0.6, 0.4, 0.05]" />
      <TresMeshLambertMaterial color="#85C1E9" />
    </TresMesh>
    <!-- 後窓 -->
    <TresMesh :position="[0, 0.2, -1.0]">
      <TresBoxGeometry :args="[0.6, 0.4, 0.05]" />
      <TresMeshLambertMaterial color="#85C1E9" />
    </TresMesh>
    <!-- 側面窓（左2つ） -->
    <TresMesh :position="[0.42, 0.2, 0.5]">
      <TresBoxGeometry :args="[0.05, 0.3, 0.4]" />
      <TresMeshLambertMaterial color="#85C1E9" />
    </TresMesh>
    <TresMesh :position="[0.42, 0.2, -0.5]">
      <TresBoxGeometry :args="[0.05, 0.3, 0.4]" />
      <TresMeshLambertMaterial color="#85C1E9" />
    </TresMesh>
    <!-- 側面窓（右2つ） -->
    <TresMesh :position="[-0.42, 0.2, 0.5]">
      <TresBoxGeometry :args="[0.05, 0.3, 0.4]" />
      <TresMeshLambertMaterial color="#85C1E9" />
    </TresMesh>
    <TresMesh :position="[-0.42, 0.2, -0.5]">
      <TresBoxGeometry :args="[0.05, 0.3, 0.4]" />
      <TresMeshLambertMaterial color="#85C1E9" />
    </TresMesh>
    <!-- 車輪 -->
    <TresMesh :position="[0.5, -0.5, 0.8]" :rotation="[0, 0, Math.PI / 2]">
      <TresCylinderGeometry :args="[0.2, 0.2, 0.1]" />
      <TresMeshLambertMaterial color="#2C2C2C" />
    </TresMesh>
    <TresMesh :position="[-0.5, -0.5, 0.8]" :rotation="[0, 0, -Math.PI / 2]">
      <TresCylinderGeometry :args="[0.2, 0.2, 0.1]" />
      <TresMeshLambertMaterial color="#2C2C2C" />
    </TresMesh>
    <TresMesh :position="[0.5, -0.5, -0.8]" :rotation="[0, 0, Math.PI / 2]">
      <TresCylinderGeometry :args="[0.2, 0.2, 0.1]" />
      <TresMeshLambertMaterial color="#2C2C2C" />
    </TresMesh>
    <TresMesh :position="[-0.5, -0.5, -0.8]" :rotation="[0, 0, -Math.PI / 2]">
      <TresCylinderGeometry :args="[0.2, 0.2, 0.1]" />
      <TresMeshLambertMaterial color="#2C2C2C" />
    </TresMesh>
  </TresGroup>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import type { Rail } from "./RailPlayGame.vue";
import { RAIL_CURVE_RADIUS, CURVE_SEGMENT_ANGLE as CURVE_ANGLE } from "../constants/rail";

const props = defineProps<{
  rails: Rail[];
  speed: number;
  running: boolean;
}>();

const emit = defineEmits<{
  (e: "pose", payload: { position: [number, number, number]; rotation: [number, number, number] }): void;
}>();

// スケール適用後の高さ補正
const TRAIN_SCALE = 0.3; // さらに縮小
const BASE_HEIGHT_OFFSET = 1.03; // 元サイズ時
const HEIGHT_OFFSET = BASE_HEIGHT_OFFSET * TRAIN_SCALE;

// 車両編成設定（デフォルト3両 / 等間隔）
const CAR_COUNT = 3;
// 実車両のおおよその長さ（屋根の 2.3 を基準）と連結余白
const CAR_LENGTH_WORLD = 2.3 * TRAIN_SCALE; // ≒0.69
const COUPLER_GAP = 0.16; // 少し余裕
const CAR_SPACING = CAR_LENGTH_WORLD + COUPLER_GAP; // 各車中心間の距離

// 全車両の姿勢配列
type Pose = { position: [number, number, number]; rotation: [number, number, number] };
const carTransforms = ref<Pose[]>(
  Array.from({ length: CAR_COUNT }, () => ({ position: [0, HEIGHT_OFFSET, 0], rotation: [0, 0, 0] }))
);

// レール長情報（総延長に基づき距離パラメータで移動）
let segmentLengths: number[] = [];
let cumulativeLengths: number[] = [];
let totalLength = 0;

let animationId: number | null = null;
// 進捗は距離（ワールド座標）で保持
let progressDist = 0;

// lerp は現在未使用のため削除（警告抑制）

const getPositionAndRotationOnRail = (
  rail: Rail,
  t: number
): { position: [number, number, number]; rotation: [number, number, number] } => {
  if (rail.type === "straight") {
    // 接続点から方向ベクトルを作り、t に応じて補間
    const sx = rail.connections.start[0];
    const sz = rail.connections.start[2];
    const ex = rail.connections.end[0];
    const ez = rail.connections.end[2];
    const dirX = ex - sx;
    const dirZ = ez - sz;
    const length = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
    const nx = dirX / length;
    const nz = dirZ / length;
    const posX = sx + nx * length * t;
    const posZ = sz + nz * length * t;
    // yaw: forward(+Zローカル) を (nx,nz) に向ける => yaw = atan2(nx, nz)
    const yaw = Math.atan2(nx, nz);
    return {
      position: [posX, rail.position[1] + HEIGHT_OFFSET, posZ],
      rotation: [0, yaw, 0],
    };
  }

  // カーブレールの場合
  const centerX = rail.position[0];
  const centerZ = rail.position[2];
  const radius = RAIL_CURVE_RADIUS;
  const theta = rail.rotation[1]; // 開始接線方向（直線部の進行方向）
  // 進行方向（左/右）に応じて中心角 φ の進み方が変わる
  // 左カーブ: φ は θ-90° から +Δ 方向へ進む
  // 右カーブ: φ は θ+90° から -Δ 方向へ進む
  const sgn = rail.direction === "right" ? -1 : 1; // left=+1, right=-1
  const phi = theta - sgn * (Math.PI / 2) + sgn * CURVE_ANGLE * t;

  const position: [number, number, number] = [
    centerX + Math.cos(phi) * radius,
    rail.position[1] + HEIGHT_OFFSET,
    centerZ + Math.sin(phi) * radius,
  ];

  // 接線方向ベクトル：左(-sinφ, cosφ)、右(+sinφ, -cosφ) を sgn で統一
  const tx = -sgn * Math.sin(phi);
  const tz = sgn * Math.cos(phi);
  const pathAngle = Math.atan2(tx, tz);
  // モデルは +Z が前なので yaw = pathAngle
  const yaw = pathAngle;
  const rotation: [number, number, number] = [0, yaw, 0];

  return { position, rotation };
};

// レール各区間の長さを計算
const recomputeLengths = () => {
  segmentLengths = props.rails.map((r) => {
    if (r.type === "straight") {
      const sx = r.connections.start[0];
      const sz = r.connections.start[2];
      const ex = r.connections.end[0];
      const ez = r.connections.end[2];
      return Math.hypot(ex - sx, ez - sz);
    } else {
      // 半径 R の 45°円弧
      return RAIL_CURVE_RADIUS * CURVE_ANGLE;
    }
  });
  cumulativeLengths = [];
  let acc = 0;
  for (let i = 0; i < segmentLengths.length; i++) {
    cumulativeLengths.push(acc);
    acc += segmentLengths[i];
  }
  totalLength = acc;
  // 進捗を折り返し
  if (totalLength > 0) {
    progressDist = ((progressDist % totalLength) + totalLength) % totalLength;
  } else {
    progressDist = 0;
  }
};

// 距離 s（0..totalLength）地点の姿勢をサンプリング
const sampleAtDistance = (s: number): Pose => {
  if (props.rails.length === 0 || totalLength <= 0) {
    return { position: [0, HEIGHT_OFFSET, 0], rotation: [0, 0, 0] };
  }
  // wrap
  let d = ((s % totalLength) + totalLength) % totalLength;
  // 区間を線形探索（本数は大きくない前提）
  let idx = 0;
  while (idx < props.rails.length - 1 && d >= cumulativeLengths[idx] + segmentLengths[idx]) {
    idx++;
  }
  const segStart = cumulativeLengths[idx];
  const segLen = segmentLengths[idx] || 1;
  const t = Math.max(0, Math.min(1, (d - segStart) / segLen));
  const { position, rotation } = getPositionAndRotationOnRail(props.rails[idx], t);
  return { position, rotation };
};

const step = () => {
  if (props.rails.length === 0) {
    animationId = requestAnimationFrame(step);
    return;
  }

  // 走行中のみ進める
  if (props.running) {
    // 以前のセマンティクス（1フレームに 0.008 セグメント）を実距離へ換算
    if (totalLength <= 0) recomputeLengths();
    const avgSegLen = props.rails.length > 0 ? totalLength / props.rails.length : 1;
    progressDist += props.speed * 0.008 * avgSegLen;
    if (totalLength > 0) progressDist = ((progressDist % totalLength) + totalLength) % totalLength;

    // 先頭車のサンプリング
    const lead = sampleAtDistance(progressDist);
    // 後続車を等間隔でサンプリング
    const nextTransforms: Pose[] = [];
    for (let i = 0; i < CAR_COUNT; i++) {
      const d = progressDist - i * CAR_SPACING;
      const pose = sampleAtDistance(d);
      // 高さ補正
      pose.position = [pose.position[0], HEIGHT_OFFSET, pose.position[2]];
      nextTransforms.push(pose);
    }
    carTransforms.value = nextTransforms;
    // カメラ用に先頭車の姿勢を emit（従来通り yaw-π を渡す）
    emit("pose", {
      position: lead.position,
      rotation: [lead.rotation[0], lead.rotation[1] - Math.PI, lead.rotation[2]],
    });
  }

  animationId = requestAnimationFrame(step);
};

const startLoop = () => {
  if (animationId != null) return;
  animationId = requestAnimationFrame(step);
};

const stopLoop = () => {
  if (animationId != null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
};

onMounted(() => {
  if (props.rails.length > 0) {
    recomputeLengths();
    const init: Pose[] = [];
    for (let i = 0; i < CAR_COUNT; i++) {
      const pose = sampleAtDistance(-i * CAR_SPACING);
      pose.position = [pose.position[0], HEIGHT_OFFSET, pose.position[2]];
      init.push(pose);
    }
    carTransforms.value = init;
  }
  if (props.running) startLoop();
});

onUnmounted(() => {
  stopLoop();
});

// running の変化で開始/停止
watch(
  () => props.running,
  (v) => {
    if (v) startLoop();
    else stopLoop();
  }
);

// レール変更時に長さを再計算
watch(
  () => props.rails,
  () => {
    recomputeLengths();
  },
  { deep: true }
);
</script>
