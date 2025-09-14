<template>
  <TresGroup v-for="(car, i) in cars" :key="i" :position="car.position" :rotation="[0, car.rotation[1], 0]">
    <TresGroup :rotation="[car.rotation[0], 0, 0]" :scale="[TRAIN_SCALE, TRAIN_SCALE, TRAIN_SCALE]">
      <TresMesh>
        <TresBoxGeometry :args="[0.8, 0.8, 2.2]" />
        <TresMeshLambertMaterial :color="colors.bodyColor" />
      </TresMesh>
      <TresMesh :position="[0, 0.5, 0]">
        <TresBoxGeometry :args="[0.9, 0.2, 2.3]" />
        <TresMeshLambertMaterial :color="colors.roofColor" />
      </TresMesh>
      <TresMesh :position="[0, 0.2, 1.0]">
        <TresBoxGeometry :args="[0.6, 0.4, 0.05]" />
        <TresMeshLambertMaterial :color="colors.windowColor" />
      </TresMesh>
      <TresMesh :position="[0, 0.2, -1.0]">
        <TresBoxGeometry :args="[0.6, 0.4, 0.05]" />
        <TresMeshLambertMaterial :color="colors.windowColor" />
      </TresMesh>
      <TresMesh :position="[0.42, 0.2, 0.5]">
        <TresBoxGeometry :args="[0.05, 0.3, 0.4]" />
        <TresMeshLambertMaterial :color="colors.windowColor" />
      </TresMesh>
      <TresMesh :position="[0.42, 0.2, -0.5]">
        <TresBoxGeometry :args="[0.05, 0.3, 0.4]" />
        <TresMeshLambertMaterial :color="colors.windowColor" />
      </TresMesh>
      <TresMesh :position="[-0.42, 0.2, 0.5]">
        <TresBoxGeometry :args="[0.05, 0.3, 0.4]" />
        <TresMeshLambertMaterial :color="colors.windowColor" />
      </TresMesh>
      <TresMesh :position="[-0.42, 0.2, -0.5]">
        <TresBoxGeometry :args="[0.05, 0.3, 0.4]" />
        <TresMeshLambertMaterial :color="colors.windowColor" />
      </TresMesh>
      <!-- Front window (driver's cab) -->
      <TresMesh :position="[0, 0.2, 1.1]">
        <TresBoxGeometry :args="[0.5, 0.3, 0.05]" />
        <TresMeshLambertMaterial :color="colors.frontWindowColor" />
      </TresMesh>
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
import { TRAIN_SCALE } from "../../constants/train";

interface TrainCustomization {
  bodyColor: string;
  roofColor: string;
  windowColor: string;
  frontWindowColor: string;
  wheelColor: string;
}

const props = defineProps<{
  cars: Array<{ position: [number, number, number]; rotation: [number, number, number] }>;
  customization?: TrainCustomization;
}>();

const defaultCustomization: TrainCustomization = {
  bodyColor: "#2E86C1",
  roofColor: "#1B4F72",
  windowColor: "#85C1E9",
  frontWindowColor: "#F7DC6F", // 運転席窓は黄色っぽく
  wheelColor: "#2C2C2C",
};

const colors = computed(() => props.customization || defaultCustomization);
</script>
