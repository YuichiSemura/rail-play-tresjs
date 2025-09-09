<template>
  <TresGroup :position="position" :rotation="rotation" :scale="scale">
    <!-- base building block -->
    <TresMesh>
      <TresBoxGeometry :args="[width, height, depth]" />
      <TresMeshLambertMaterial :color="color" />
    </TresMesh>
    <!-- simple roof accent -->
    <TresMesh :position="[0, height / 2 + 0.05, 0]">
      <TresBoxGeometry :args="[width * 1.02, 0.1, depth * 1.02]" />
      <TresMeshLambertMaterial color="#CCCCCC" />
    </TresMesh>
  </TresGroup>
</template>

<script setup lang="ts">
const props = defineProps<{
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  width?: number;
  depth?: number;
  height?: number;
  color?: string;
}>();

const width = props.width ?? 0.9;
const depth = props.depth ?? 0.9;
const height = props.height ?? 1.8;
const color = props.color ?? "#7FB3D5";
const rotation = props.rotation ?? [0, 0, 0];
const scale = props.scale ?? [1, 1, 1];
</script>

<style scoped></style>
