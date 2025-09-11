<template>
  <v-card-text>
    <v-card-subtitle>電車の色設定</v-card-subtitle>

    <div class="mb-4">
      <v-label class="mb-2">車体色</v-label>
      <div class="d-flex align-center">
        <input type="color" v-model="bodyColor" class="color-picker mr-3" />
        <v-text-field
          v-model="bodyColor"
          dense
          hide-details
          variant="outlined"
          style="max-width: 120px"
        />
      </div>
    </div>

    <div class="mb-4">
      <v-label class="mb-2">屋根色</v-label>
      <div class="d-flex align-center">
        <input type="color" v-model="roofColor" class="color-picker mr-3" />
        <v-text-field
          v-model="roofColor"
          dense
          hide-details
          variant="outlined"
          style="max-width: 120px"
        />
      </div>
    </div>

    <div class="mb-4">
      <v-label class="mb-2">窓色</v-label>
      <div class="d-flex align-center">
        <input type="color" v-model="windowColor" class="color-picker mr-3" />
        <v-text-field
          v-model="windowColor"
          dense
          hide-details
          variant="outlined"
          style="max-width: 120px"
        />
      </div>
    </div>

    <div class="mb-4">
      <v-label class="mb-2">車輪色</v-label>
      <div class="d-flex align-center">
        <input type="color" v-model="wheelColor" class="color-picker mr-3" />
        <v-text-field
          v-model="wheelColor"
          dense
          hide-details
          variant="outlined"
          style="max-width: 120px"
        />
      </div>
    </div>

    <v-divider class="my-4" />

    <v-card-subtitle>プリセット</v-card-subtitle>
    <v-row dense>
      <v-col cols="6">
        <v-btn color="primary" @click="$emit('applyPreset', 'default')" block class="mb-2">
          <v-icon size="small">mdi-restore</v-icon>
          <span class="text-caption">デフォルト</span>
        </v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn color="secondary" @click="$emit('applyPreset', 'red')" block class="mb-2">
          <v-icon size="small">mdi-palette</v-icon>
          <span class="text-caption">赤い電車</span>
        </v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn color="success" @click="$emit('applyPreset', 'green')" block class="mb-2">
          <v-icon size="small">mdi-palette</v-icon>
          <span class="text-caption">緑の電車</span>
        </v-btn>
      </v-col>
    </v-row>
  </v-card-text>
</template>

<script setup lang="ts">
import { computed } from "vue";
interface TrainCustomization {
  bodyColor: string;
  roofColor: string;
  windowColor: string;
  wheelColor: string;
}

interface Props {
  trainCustomization: TrainCustomization;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:trainCustomization": [value: TrainCustomization];
  applyPreset: [preset: "default" | "red" | "green"];
}>();

// v-model bridges for each field
const bodyColor = computed({
  get: () => props.trainCustomization.bodyColor,
  set: (v: string) =>
    emit("update:trainCustomization", { ...props.trainCustomization, bodyColor: v }),
});
const roofColor = computed({
  get: () => props.trainCustomization.roofColor,
  set: (v: string) =>
    emit("update:trainCustomization", { ...props.trainCustomization, roofColor: v }),
});
const windowColor = computed({
  get: () => props.trainCustomization.windowColor,
  set: (v: string) =>
    emit("update:trainCustomization", { ...props.trainCustomization, windowColor: v }),
});
const wheelColor = computed({
  get: () => props.trainCustomization.wheelColor,
  set: (v: string) =>
    emit("update:trainCustomization", { ...props.trainCustomization, wheelColor: v }),
});
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