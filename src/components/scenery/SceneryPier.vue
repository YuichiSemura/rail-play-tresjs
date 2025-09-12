<template>
  <TresGroup :position="position" :rotation="rotation" @click="onClick">
    <TresMesh :position="[-(FRAME_WIDTH / 2 - LEG_THICK / 2), LEG_HEIGHT / 2, 0]">
      <TresBoxGeometry :args="[LEG_THICK, LEG_HEIGHT, FRAME_DEPTH]" />
      <TresMeshLambertMaterial :color="PIER_COLOR" :transparent="props.ghost" :opacity="props.ghost ? 0.5 : 1" />
    </TresMesh>
    <TresMesh :position="[FRAME_WIDTH / 2 - LEG_THICK / 2, LEG_HEIGHT / 2, 0]">
      <TresBoxGeometry :args="[LEG_THICK, LEG_HEIGHT, FRAME_DEPTH]" />
      <TresMeshLambertMaterial :color="PIER_COLOR" :transparent="props.ghost" :opacity="props.ghost ? 0.5 : 1" />
    </TresMesh>
    <TresMesh :position="[0, LEG_HEIGHT + TOP_THICK / 2, 0]">
      <TresBoxGeometry :args="[FRAME_WIDTH, TOP_THICK, FRAME_DEPTH]" />
      <TresMeshLambertMaterial :color="PIER_COLOR" :transparent="props.ghost" :opacity="props.ghost ? 0.5 : 1" />
    </TresMesh>
  </TresGroup>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RAIL_HEIGHT, RAIL_SLOPE_PITCH, RAIL_SLOPE_RISE } from "../../constants/rail";
const props = defineProps<{
  position: [number, number, number];
  height?: number;
  rotation?: [number, number, number];
  ghost?: boolean;
}>();

const emit = defineEmits<{ click: [] }>();
const onClick = () => emit("click");

const PIER_COLOR = "#9E9E9E";
const FRAME_WIDTH = 0.8;
const FRAME_DEPTH = 0.2;
const TOP_THICK = 0.08;
const LEG_THICK = 0.12;
const H = computed(() => props.height ?? RAIL_SLOPE_RISE - (RAIL_HEIGHT / 2) * Math.cos(RAIL_SLOPE_PITCH));
const LEG_HEIGHT = computed(() => Math.max(0.1, H.value - TOP_THICK));
const rotation = computed<[number, number, number]>(() => (props.rotation ?? [0, 0, 0]) as [number, number, number]);
</script>

<style scoped></style>
