<template>
  <TresGroup :position="position" :rotation="rotation" :scale="scale">
    <!-- trunk -->
    <TresMesh :position="[0, trunkHeight / 2, 0]">
      <TresCylinderGeometry :args="[trunkRadius, trunkRadius, trunkHeight, 8]" />
      <TresMeshLambertMaterial color="#8B5A2B" />
    </TresMesh>
    <!-- foliage -->
    <TresMesh :position="[0, trunkHeight + foliageRadius * 0.9, 0]">
      <TresSphereGeometry :args="[foliageRadius, 12, 12]" />
      <TresMeshLambertMaterial color="#2E8B57" />
    </TresMesh>
  </TresGroup>
  
</template>

<script setup lang="ts">
const props = defineProps<{
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  trunkHeight?: number;
  trunkRadius?: number;
  foliageRadius?: number;
}>();

const trunkHeight = props.trunkHeight ?? 0.6;
const trunkRadius = props.trunkRadius ?? 0.08;
const foliageRadius = props.foliageRadius ?? 0.45;
const rotation = props.rotation ?? [0, 0, 0];
const scale = props.scale ?? [1, 1, 1];
</script>

<style scoped></style>
