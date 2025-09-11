<template>
  <v-card-text>
    <v-btn color="success" :disabled="!canRunTrain" @click="$emit('toggleTrain')" block class="mb-3">
      {{ trainRunning ? "停止" : "走らせる" }}
    </v-btn>

    <v-btn color="secondary" :disabled="!canRunTrain" @click="$emit('toggleCameraMode')" block class="mb-3">
      <v-icon class="mr-1">{{ cameraMode === "orbit" ? "mdi-train" : "mdi-orbit" }}</v-icon>
      {{ cameraMode === "orbit" ? "先頭カメラ" : "自由視点" }}
    </v-btn>

    <v-slider v-model="trainSpeedProxy" :min="0.1" :max="2.0" :step="0.1" label="速度" />
  </v-card-text>
</template>

<script setup lang="ts">
import { computed } from "vue";
interface Props {
  canRunTrain: boolean;
  trainRunning: boolean;
  trainSpeed: number;
  cameraMode: "orbit" | "front";
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:trainSpeed": [value: number];
  toggleTrain: [];
  toggleCameraMode: [];
}>();

// v-model bridge for trainSpeed
const trainSpeedProxy = computed({
  get: () => props.trainSpeed,
  set: (v: number) => emit("update:trainSpeed", v),
});
</script>