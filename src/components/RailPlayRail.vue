<template>
  <TresGroup @click="onClick">
    <!-- Straight rail -->
    <TresMesh v-if="rail.type === 'straight'" :position="rail.position" :rotation="rail.rotation">
      <TresBoxGeometry :args="[4, 0.2, 0.5]" />
      <TresMeshLambertMaterial color="#4169E1" />
    </TresMesh>

    <!-- Curve rail -->
    <TresMesh v-else-if="rail.type === 'curve'" :position="rail.position" :rotation="rail.rotation">
      <TresTorusGeometry :args="[2, 0.2, 8, 16, Math.PI / 2]" />
      <TresMeshLambertMaterial color="#4169E1" />
    </TresMesh>
  </TresGroup>
</template>

<script setup lang="ts">
import type { Rail } from "./RailPlayGame.vue";

const props = defineProps<{
  rail: Rail;
}>();

const emit = defineEmits<{
  click: [rail: Rail];
}>();

const onClick = () => {
  emit("click", props.rail);
};
</script>
