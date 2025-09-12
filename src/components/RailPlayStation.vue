<template>
  <TresGroup
    :position="position"
    :rotation="rotation"
    :scale="scale"
    @pointerdown="!ghost && $emit('click')"
    :render-order="ghost ? 1 : 0"
  >
    <!-- レール部分は rail/RailSegment.vue で描画されるため、ここでは描画しない -->

    <TresGroup :position="[0, 0, 0]" :rotation="[0, Math.PI / 2, 0]">
      <!-- 左側のホーム -->
      <TresMesh :position="[-PLATFORM_OFFSET, PLATFORM_HEIGHT / 2, 0]">
        <TresBoxGeometry :args="[PLATFORM_WIDTH, PLATFORM_HEIGHT, RAIL_LENGTH]" />
        <TresMeshLambertMaterial :color="PLATFORM_COLOR" :transparent="ghost" :opacity="ghost ? 0.25 : 1" />
      </TresMesh>

      <!-- 右側のホーム -->
      <TresMesh :position="[PLATFORM_OFFSET, PLATFORM_HEIGHT / 2, 0]">
        <TresBoxGeometry :args="[PLATFORM_WIDTH, PLATFORM_HEIGHT, RAIL_LENGTH]" />
        <TresMeshLambertMaterial :color="PLATFORM_COLOR" :transparent="ghost" :opacity="ghost ? 0.25 : 1" />
      </TresMesh>

      <!-- 左側のベンチ -->
      <TresMesh
        :position="[-PLATFORM_OFFSET, PLATFORM_HEIGHT + BENCH_HEIGHT / 2, -RAIL_LENGTH / 4]"
        :rotation="[0, Math.PI / 2, 0]"
      >
        <TresBoxGeometry :args="[BENCH_WIDTH, BENCH_HEIGHT, BENCH_DEPTH]" />
        <TresMeshLambertMaterial :color="BENCH_COLOR" :transparent="ghost" :opacity="ghost ? 0.25 : 1" />
      </TresMesh>

      <!-- 右側のベンチ -->
      <TresMesh
        :position="[PLATFORM_OFFSET, PLATFORM_HEIGHT + BENCH_HEIGHT / 2, -RAIL_LENGTH / 4]"
        :rotation="[0, Math.PI / 2, 0]"
      >
        <TresBoxGeometry :args="[BENCH_WIDTH, BENCH_HEIGHT, BENCH_DEPTH]" />
        <TresMeshLambertMaterial :color="BENCH_COLOR" :transparent="ghost" :opacity="ghost ? 0.25 : 1" />
      </TresMesh>

      <!-- 左側の看板（支柱） -->
      <TresMesh :position="[-PLATFORM_OFFSET, PLATFORM_HEIGHT + SIGN_POLE_HEIGHT / 2, RAIL_LENGTH / 4]">
        <TresCylinderGeometry :args="[SIGN_POLE_RADIUS, SIGN_POLE_RADIUS, SIGN_POLE_HEIGHT]" />
        <TresMeshLambertMaterial :color="SIGN_POLE_COLOR" :transparent="ghost" :opacity="ghost ? 0.25 : 1" />
      </TresMesh>

      <!-- 左側の看板（板） -->
      <TresMesh
        :position="[-PLATFORM_OFFSET, PLATFORM_HEIGHT + SIGN_POLE_HEIGHT - SIGN_HEIGHT / 2, RAIL_LENGTH / 4]"
        :rotation="[0, Math.PI / 2, 0]"
      >
        <TresBoxGeometry :args="[SIGN_WIDTH, SIGN_HEIGHT, SIGN_DEPTH]" />
        <TresMeshLambertMaterial :color="SIGN_COLOR" :transparent="ghost" :opacity="ghost ? 0.25 : 1" />
      </TresMesh>

      <!-- 右側の看板（支柱） -->
      <TresMesh :position="[PLATFORM_OFFSET, PLATFORM_HEIGHT + SIGN_POLE_HEIGHT / 2, RAIL_LENGTH / 4]">
        <TresCylinderGeometry :args="[SIGN_POLE_RADIUS, SIGN_POLE_RADIUS, SIGN_POLE_HEIGHT]" />
        <TresMeshLambertMaterial :color="SIGN_POLE_COLOR" :transparent="ghost" :opacity="ghost ? 0.25 : 1" />
      </TresMesh>

      <!-- 右側の看板（板） -->
      <TresMesh
        :position="[PLATFORM_OFFSET, PLATFORM_HEIGHT + SIGN_POLE_HEIGHT - SIGN_HEIGHT / 2, RAIL_LENGTH / 4]"
        :rotation="[0, Math.PI / 2, 0]"
      >
        <TresBoxGeometry :args="[SIGN_WIDTH, SIGN_HEIGHT, SIGN_DEPTH]" />
        <TresMeshLambertMaterial :color="SIGN_COLOR" :transparent="ghost" :opacity="ghost ? 0.25 : 1" />
      </TresMesh>
    </TresGroup>
  </TresGroup>
</template>

<script setup lang="ts">
import { RAIL_STRAIGHT_FULL_LENGTH } from "../constants/rail";

defineEmits<{ (e: "click"): void }>();
const props = defineProps<{
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  ghost?: boolean;
}>();

// 線路部分の定数（他のレールと統一）
const RAIL_LENGTH = RAIL_STRAIGHT_FULL_LENGTH; // 通常の線路と同じ長さ

// ホーム部分の定数
const PLATFORM_WIDTH = 0.4;
const PLATFORM_HEIGHT = 0.15;
const PLATFORM_OFFSET = 0.4; // 線路の中心からホームまでの距離
const PLATFORM_COLOR = "#E0E0E0";

// ベンチの定数
const BENCH_WIDTH = 0.24;
const BENCH_HEIGHT = 0.05;
const BENCH_DEPTH = 0.05;
const BENCH_COLOR = "#8b4513"; // 茶色

// 看板の定数
const SIGN_POLE_HEIGHT = 0.3;
const SIGN_POLE_RADIUS = 0.02;
const SIGN_POLE_COLOR = "#424242";
const SIGN_WIDTH = 0.3;
const SIGN_HEIGHT = 0.12;
const SIGN_DEPTH = 0.05;
const SIGN_COLOR = "#FFFFFF";

const rotation = props.rotation ?? [0, 0, 0];
const scale = props.scale ?? [1, 1, 1];
const ghost = props.ghost ?? false;
</script>

<style scoped></style>
