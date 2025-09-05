<template>
  <TresMesh :position="trainPosition">
    <TresBoxGeometry :args="[1, 0.5, 2]" />
    <TresMeshLambertMaterial color="#FF4444" />
  </TresMesh>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import type { Rail } from "./RailPlayGame.vue";

const props = defineProps<{
  rails: Rail[];
  speed: number;
}>();

const trainPosition = ref<[number, number, number]>([0, 0, 0]);
let animationId: number | null = null;
let progress = 0;

const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

const getPositionOnRail = (rail: Rail, t: number): [number, number, number] => {
  if (rail.type === "straight") {
    return [
      lerp(rail.connections.start[0], rail.connections.end[0], t),
      rail.connections.start[1] + 0.5,
      lerp(rail.connections.start[2], rail.connections.end[2], t),
    ];
  }

  const centerX = rail.position[0];
  const centerZ = rail.position[2];
  const radius = 2;
  const startAngle = rail.rotation[1];
  const angle = startAngle + (Math.PI / 2) * t;

  return [centerX + Math.cos(angle) * radius, rail.position[1] + 0.5, centerZ + Math.sin(angle) * radius];
};

const animate = () => {
  if (props.rails.length === 0) return;

  progress += props.speed * 0.008;
  if (progress >= props.rails.length) progress = 0;

  const currentRailIndex = Math.floor(progress);
  const railProgress = progress - currentRailIndex;
  const rail = props.rails[currentRailIndex];

  if (rail) {
    trainPosition.value = getPositionOnRail(rail, railProgress);
  }

  animationId = requestAnimationFrame(animate);
};

onMounted(() => {
  if (props.rails.length > 0) {
    trainPosition.value = getPositionOnRail(props.rails[0], 0);
  }
  animate();
});

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
});
</script>
