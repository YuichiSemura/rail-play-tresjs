<template>
  <v-card-text>
    <v-card-subtitle>電車の色設定</v-card-subtitle>

    <div class="mb-4">
      <v-label class="mb-2">車体色</v-label>
      <div class="d-flex align-center">
        <input type="color" v-model="bodyColor" class="color-picker mr-3" />
        <v-text-field v-model="bodyColor" dense hide-details variant="outlined" style="max-width: 120px" />
      </div>
    </div>

    <div class="mb-4">
      <v-label class="mb-2">屋根色</v-label>
      <div class="d-flex align-center">
        <input type="color" v-model="roofColor" class="color-picker mr-3" />
        <v-text-field v-model="roofColor" dense hide-details variant="outlined" style="max-width: 120px" />
      </div>
    </div>

    <div class="mb-4">
      <v-label class="mb-2">窓色</v-label>
      <div class="d-flex align-center">
        <input type="color" v-model="windowColor" class="color-picker mr-3" />
        <v-text-field v-model="windowColor" dense hide-details variant="outlined" style="max-width: 120px" />
      </div>
    </div>

    <div class="mb-4">
      <v-label class="mb-2">車輪色</v-label>
      <div class="d-flex align-center">
        <input type="color" v-model="wheelColor" class="color-picker mr-3" />
        <v-text-field v-model="wheelColor" dense hide-details variant="outlined" style="max-width: 120px" />
      </div>
    </div>

    <v-divider class="my-4" />

    <v-card-subtitle>プリセット</v-card-subtitle>
    <v-row dense>
      <v-col cols="6">
        <v-btn color="primary" @click="applyPreset('default')" block class="mb-2">
          <v-icon size="small">mdi-restore</v-icon>
          <span class="text-caption">デフォルト</span>
        </v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn color="secondary" @click="applyPreset('red')" block class="mb-2">
          <v-icon size="small">mdi-palette</v-icon>
          <span class="text-caption">赤い電車</span>
        </v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn color="success" @click="applyPreset('green')" block class="mb-2">
          <v-icon size="small">mdi-palette</v-icon>
          <span class="text-caption">緑の電車</span>
        </v-btn>
      </v-col>
    </v-row>
  </v-card-text>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useGameStore } from "../../stores/game";

const store = useGameStore();

// v-model bridges for each field
const bodyColor = computed({
  get: () => store.trainCustomization.bodyColor,
  set: (v: string) => { store.trainCustomization = { ...store.trainCustomization, bodyColor: v }; },
});
const roofColor = computed({
  get: () => store.trainCustomization.roofColor,
  set: (v: string) => { store.trainCustomization = { ...store.trainCustomization, roofColor: v }; },
});
const windowColor = computed({
  get: () => store.trainCustomization.windowColor,
  set: (v: string) => { store.trainCustomization = { ...store.trainCustomization, windowColor: v }; },
});
const wheelColor = computed({
  get: () => store.trainCustomization.wheelColor,
  set: (v: string) => { store.trainCustomization = { ...store.trainCustomization, wheelColor: v }; },
});

const applyPreset = (preset: "default" | "red" | "green") => {
  switch (preset) {
    case "default":
      store.trainCustomization = {
        bodyColor: "#2E86C1",
        roofColor: "#1B4F72",
        windowColor: "#85C1E9",
        frontWindowColor: "#F7DC6F",
        wheelColor: "#2C2C2C",
      };
      break;
    case "red":
      store.trainCustomization = {
        bodyColor: "#E74C3C",
        roofColor: "#B71C1C",
        windowColor: "#FFCDD2",
        frontWindowColor: "#FAD7A0",
        wheelColor: "#424242",
      };
      break;
    case "green":
      store.trainCustomization = {
        bodyColor: "#27AE60",
        roofColor: "#1B5E20",
        windowColor: "#C8E6C9",
        frontWindowColor: "#D5F5E3",
        wheelColor: "#2E2E2E",
      };
      break;
  }
  store.showNotification(
    `${preset === "default" ? "デフォルト" : preset === "red" ? "赤い電車" : "緑の電車"}プリセットを適用しました`,
    "success"
  );
};
</script>

<style scoped>
.color-picker {
  width: 40px;
  height: 32px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
