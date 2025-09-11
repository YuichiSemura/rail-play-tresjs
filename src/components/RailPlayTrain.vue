<template>
  <!-- 3両（既定）を等間隔で表示（描画専用） -->
  <!-- 外側: Yaw（進行方向）。内側: Pitch（上下）。回転順序を明示的に Y → X にするため二重グループ構成 -->
  <TresGroup v-for="(car, i) in cars" :key="i" :position="car.position" :rotation="[0, car.rotation[1], 0]">
    <TresGroup :rotation="[car.rotation[0], 0, 0]" :scale="[TRAIN_SCALE, TRAIN_SCALE, TRAIN_SCALE]">
      <!-- 車体本体（1/3程度に縮小: 元 0.8x0.8x2.2 → スケール適用で実質 0.36x0.36x0.99 相当） -->
      <TresMesh>
        <TresBoxGeometry :args="[0.8, 0.8, 2.2]" />
        <TresMeshLambertMaterial :color="colors.bodyColor" />
      </TresMesh>
      <!-- 屋根 -->
      <TresMesh :position="[0, 0.5, 0]">
        <TresBoxGeometry :args="[0.9, 0.2, 2.3]" />
        <TresMeshLambertMaterial :color="colors.roofColor" />
      </TresMesh>
      <!-- 前窓 -->
      <TresMesh :position="[0, 0.2, 1.0]">
        <TresBoxGeometry :args="[0.6, 0.4, 0.05]" />
        <TresMeshLambertMaterial :color="colors.windowColor" />
      </TresMesh>
      <!-- 後窓 -->
      <TresMesh :position="[0, 0.2, -1.0]">
        <TresBoxGeometry :args="[0.6, 0.4, 0.05]" />
        <TresMeshLambertMaterial :color="colors.windowColor" />
      </TresMesh>
      <!-- 側面窓（左2つ） -->
      <TresMesh :position="[0.42, 0.2, 0.5]">
        <TresBoxGeometry :args="[0.05, 0.3, 0.4]" />
        <TresMeshLambertMaterial :color="colors.windowColor" />
      </TresMesh>
      <TresMesh :position="[0.42, 0.2, -0.5]">
        <TresBoxGeometry :args="[0.05, 0.3, 0.4]" />
        <TresMeshLambertMaterial :color="colors.windowColor" />
      </TresMesh>
      <!-- 側面窓（右2つ） -->
      <TresMesh :position="[-0.42, 0.2, 0.5]">
        <TresBoxGeometry :args="[0.05, 0.3, 0.4]" />
        <TresMeshLambertMaterial :color="colors.windowColor" />
      </TresMesh>
      <TresMesh :position="[-0.42, 0.2, -0.5]">
        <TresBoxGeometry :args="[0.05, 0.3, 0.4]" />
        <TresMeshLambertMaterial :color="colors.windowColor" />
      </TresMesh>
      <!-- 車輪 -->
      <TresMesh :position="[0.5, -0.5, 0.8]" :rotation="[0, 0, Math.PI / 2]">
        <TresCylinderGeometry :args="[0.2, 0.2, 0.1]" />
        <TresMeshLambertMaterial :color="colors.wheelColor" />
      </TresMesh>
      <TresMesh :position="[-0.5, -0.5, 0.8]" :rotation="[0, 0, -Math.PI / 2]">
        <TresCylinderGeometry :args="[0.2, 0.2, 0.1]" />
        <TresMeshLambertMaterial :color="colors.wheelColor" />
      </TresMesh>
      <TresMesh :position="[0.5, -0.5, -0.8]" :rotation="[0, 0, Math.PI / 2]">
        <TresCylinderGeometry :args="[0.2, 0.2, 0.1]" />
        <TresMeshLambertMaterial :color="colors.wheelColor" />
      </TresMesh>
      <TresMesh :position="[-0.5, -0.5, -0.8]" :rotation="[0, 0, -Math.PI / 2]">
        <TresCylinderGeometry :args="[0.2, 0.2, 0.1]" />
        <TresMeshLambertMaterial :color="colors.wheelColor" />
      </TresMesh>
    </TresGroup>
  </TresGroup>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { TRAIN_SCALE } from "../constants/train";

// カスタマイゼーション設定の型定義
interface TrainCustomization {
  bodyColor: string;
  roofColor: string;
  windowColor: string;
  wheelColor: string;
}

const props = defineProps<{
  cars: Array<{ position: [number, number, number]; rotation: [number, number, number] }>;
  customization?: TrainCustomization;
}>();

// デフォルトの色設定
const defaultCustomization: TrainCustomization = {
  bodyColor: "#2E86C1",
  roofColor: "#1B4F72",
  windowColor: "#85C1E9",
  wheelColor: "#2C2C2C",
};

// 実際に使用する色設定（props.customizationまたはデフォルト）
const colors = computed(() => {
  return props.customization || defaultCustomization;
});
</script>
