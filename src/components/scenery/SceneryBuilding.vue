<template>
  <TresGroup
    :position="position"
    :rotation="rotation"
    :scale="scale"
    @click="!ghost && $emit('click')"
    :render-order="ghost ? 1 : 0"
  >
    <TresMesh :position="[0, height / 2, 0]">
      <TresBoxGeometry :args="[width, height, depth]" />
      <TresMeshLambertMaterial :color="color" :transparent="ghost" :opacity="ghost ? 0.25 : 1" />
    </TresMesh>
    <TresMesh :position="[0, height + 0.05, 0]">
      <TresBoxGeometry :args="[width * 1.02, 0.1, depth * 1.02]" />
      <TresMeshLambertMaterial color="#CCCCCC" :transparent="ghost" :opacity="ghost ? 0.25 : 1" />
    </TresMesh>
  </TresGroup>
</template>

<script setup lang="ts">
defineEmits<{ (e: "click"): void }>();
const props = defineProps<{
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  width?: number;
  depth?: number;
  height?: number;
  color?: string;
  ghost?: boolean;
}>();

const width = props.width ?? 0.9;
const depth = props.depth ?? 0.9;
const height = props.height ?? 1.8;
const color = props.color ?? "#7FB3D5";
const rotation = props.rotation ?? [0, 0, 0];
const scale = props.scale ?? [1, 1, 1];
const ghost = props.ghost ?? false;
</script>

<style scoped></style>
