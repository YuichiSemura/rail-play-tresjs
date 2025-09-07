<template>
  <TresGroup :position="trainPosition" :rotation="trainRotation" :scale="[TRAIN_SCALE, TRAIN_SCALE, TRAIN_SCALE]">
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
import { ref, onMounted, onUnmounted } from "vue";
import type { Rail } from "./RailPlayGame.vue";
import { RAIL_CURVE_RADIUS, CURVE_SEGMENT_ANGLE as CURVE_ANGLE } from "../constants/rail";

const props = defineProps<{
  rails: Rail[];
  speed: number;
}>();

// スケール適用後の高さ補正
const TRAIN_SCALE = 0.3; // さらに縮小
const BASE_HEIGHT_OFFSET = 1.03; // 元サイズ時
const HEIGHT_OFFSET = BASE_HEIGHT_OFFSET * TRAIN_SCALE;
const trainPosition = ref<[number, number, number]>([0, HEIGHT_OFFSET, 0]);
const trainRotation = ref<[number, number, number]>([0, 0, 0]);
let animationId: number | null = null;
let progress = 0;

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
  // 接続点計算で start = C + (sinθ * r, -cosθ * r), end = C + (cosθ * r, sinθ * r)
  // これに一致する中心角 φ の範囲は φ ∈ [θ-90°, θ] で位置 = C + (cosφ * r, sinφ * r)
  const phi = theta - Math.PI / 2 + CURVE_ANGLE * t;

  const position: [number, number, number] = [
    centerX + Math.cos(phi) * radius,
    rail.position[1] + HEIGHT_OFFSET,
    centerZ + Math.sin(phi) * radius,
  ];

  // 進行方向は中心角 - 90°
  // 接線方向ベクトル = (-sinφ, cosφ)
  const pathAngle = Math.atan2(-Math.sin(phi), Math.cos(phi));
  // モデルは +Z が前なので yaw = pathAngle
  const yaw = pathAngle;
  const rotation: [number, number, number] = [0, yaw, 0];

  return { position, rotation };
};

const animate = () => {
  if (props.rails.length === 0) return;

  progress += props.speed * 0.008;
  if (progress >= props.rails.length) progress = 0;

  const currentRailIndex = Math.floor(progress);
  const railProgress = progress - currentRailIndex;
  const rail = props.rails[currentRailIndex];

  if (rail) {
    const { position, rotation } = getPositionAndRotationOnRail(rail, railProgress);
    trainPosition.value = position;
    trainRotation.value = rotation;
  }

  animationId = requestAnimationFrame(animate);
};

onMounted(() => {
  if (props.rails.length > 0) {
    const { position, rotation } = getPositionAndRotationOnRail(props.rails[0], 0);
    trainPosition.value = position;
    trainRotation.value = rotation;
  }
  animate();
});

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
});
</script>
