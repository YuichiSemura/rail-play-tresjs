<template>
  <v-card-text>
    <v-btn color="success" :disabled="!store.canRunTrain" @click="toggleTrain" block class="mb-3">
      {{ store.trainRunning ? "停止" : "走らせる" }}
    </v-btn>

    <v-btn color="secondary" :disabled="!store.canRunTrain" @click="toggleCameraMode" block class="mb-3">
      <v-icon class="mr-1">{{
        store.cameraMode === "orbit" ? "mdi-train" : store.cameraMode === "front" ? "mdi-camera-enhance" : "mdi-orbit"
      }}</v-icon>
      {{ store.cameraMode === "orbit" ? "先頭カメラ" : store.cameraMode === "front" ? "車両注視" : "自由視点" }}
    </v-btn>

    <v-slider v-model="store.trainSpeed" :min="0.1" :max="8.0" :step="0.1" label="速度" />
  </v-card-text>
</template>

<script setup lang="ts">
import { useGameStore } from "../../stores/game";
import { useCameraController } from "../../composables/useCameraController";

const store = useGameStore();
const { toggleCameraMode } = useCameraController();

const toggleTrain = () => {
  store.trainRunning = !store.trainRunning;
};
</script>
