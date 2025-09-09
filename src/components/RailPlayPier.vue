<template>
  <TresGroup :position="position" @click="onClick">
    <!-- 柱本体（灰色） -->
    <TresMesh :position="[0, (height || 1.5) / 2, 0]">
      <TresBoxGeometry :args="[0.4, height || 1.5, 0.4]" />
      <TresMeshLambertMaterial :color="'#9E9E9E'" :transparent="ghost" :opacity="ghost ? 0.35 : 1" />
    </TresMesh>
    <!-- 天板（少し広めの灰色） -->
    <TresMesh :position="[0, (height || 1.5) + 0.1, 0]">
      <TresBoxGeometry :args="[0.8, 0.2, 0.8]" />
      <TresMeshLambertMaterial :color="'#BDBDBD'" :transparent="ghost" :opacity="ghost ? 0.35 : 1" />
    </TresMesh>
  </TresGroup>
</template>

<script setup lang="ts">
defineProps<{
  position: [number, number, number];
  height?: number;
  ghost?: boolean;
}>();

const emit = defineEmits<{ click: [] }>();

const onClick = () => {
  emit("click");
};
</script>
