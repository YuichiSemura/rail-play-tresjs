<template>
  <TresGroup @click="onClick">
    <!-- Straight rail -->
    <TresMesh v-if="rail.type === 'straight'" :position="rail.position" :rotation="rail.rotation">
      <!-- 直線レールジオメトリは共通定数から -->
      <TresBoxGeometry :args="[RAIL_STRAIGHT_FULL_LENGTH, 0.2, 0.5]" />
      <TresMeshLambertMaterial color="#4169E1" :side="2" />
    </TresMesh>

    <!-- Curve rail (90度カーブ) -->
    <TresGroup v-else-if="rail.type === 'curve'" :position="rail.position" :rotation="[0, -rail.rotation[1], 0]">
      <TresMesh :rotation="[-Math.PI / 2, 0, 0]">
        <TresRingGeometry :args="RAIL_CURVE_RING_ARGS" />
        <TresMeshLambertMaterial color="#4169E1" :side="2" />
      </TresMesh>
    </TresGroup>
  </TresGroup>
</template>

<script setup lang="ts">
import type { Rail } from "./RailPlayGame.vue";
import { RAIL_STRAIGHT_FULL_LENGTH, RAIL_CURVE_RING_ARGS } from "../constants/rail";

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
