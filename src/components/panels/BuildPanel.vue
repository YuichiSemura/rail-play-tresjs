<template>
  <v-card-text>
    <v-card-subtitle>操作</v-card-subtitle>
    <!-- v-btn-toggle は内部が単行スクロールのため折り返しできず項目が欠けるケースがある。
         v-item-group + v-item + v-btn 構成に置換し、flex-wrap で全項目を表示する。 -->
    <v-item-group v-model="selectedToolProxy" mandatory class="d-flex flex-wrap pa-2" style="gap: 8px">
      <v-item value="none" v-slot="{ isSelected, toggle }">
        <v-btn
          :color="isSelected ? 'primary' : undefined"
          :variant="isSelected ? 'elevated' : 'outlined'"
          @click="toggle"
        >
          <v-icon>mdi-cursor-default</v-icon>
          なし
        </v-btn>
      </v-item>
      <v-item value="straight" v-slot="{ isSelected, toggle }">
        <v-btn
          :color="isSelected ? 'primary' : undefined"
          :variant="isSelected ? 'elevated' : 'outlined'"
          @click="toggle"
          :disabled="isRailsLocked"
        >
          <v-icon>mdi-minus</v-icon>
          直線
        </v-btn>
      </v-item>
      <v-item value="curve" v-slot="{ isSelected, toggle }">
        <v-btn
          :color="isSelected ? 'primary' : undefined"
          :variant="isSelected ? 'elevated' : 'outlined'"
          @click="toggle"
          :disabled="isRailsLocked"
        >
          <v-icon>mdi-rotate-right</v-icon>
          カーブ
        </v-btn>
      </v-item>
      <v-item value="slope" v-slot="{ isSelected, toggle }">
        <v-btn
          :color="isSelected ? 'primary' : undefined"
          :variant="isSelected ? 'elevated' : 'outlined'"
          @click="toggle"
          :disabled="isRailsLocked"
        >
          <v-icon>mdi-trending-up</v-icon>
          スロープ
        </v-btn>
      </v-item>
      <v-item value="curve-slope-up" v-slot="{ isSelected, toggle }">
        <v-btn
          :color="isSelected ? 'primary' : undefined"
          :variant="isSelected ? 'elevated' : 'outlined'"
          @click="toggle"
          :disabled="isRailsLocked"
        >
          <v-icon>mdi-chart-timeline-variant</v-icon>
          曲線スロープ（上り）
        </v-btn>
      </v-item>
      <v-item value="curve-slope-down" v-slot="{ isSelected, toggle }">
        <v-btn
          :color="isSelected ? 'primary' : undefined"
          :variant="isSelected ? 'elevated' : 'outlined'"
          @click="toggle"
          :disabled="isRailsLocked"
        >
          <v-icon>mdi-chart-timeline-variant-reverse</v-icon>
          曲線スロープ（下り）
        </v-btn>
      </v-item>
      <v-item value="crossing" v-slot="{ isSelected, toggle }">
        <v-btn
          :color="isSelected ? 'primary' : undefined"
          :variant="isSelected ? 'elevated' : 'outlined'"
          @click="toggle"
          :disabled="isRailsLocked"
        >
          <v-icon>mdi-boom-gate</v-icon>
          踏切
        </v-btn>
      </v-item>
      <v-item value="station" v-slot="{ isSelected, toggle }">
        <v-btn
          :color="isSelected ? 'primary' : undefined"
          :variant="isSelected ? 'elevated' : 'outlined'"
          @click="toggle"
          :disabled="isRailsLocked"
        >
          <v-icon>mdi-train</v-icon>
          駅ホーム
        </v-btn>
      </v-item>
      <v-item value="tree" v-slot="{ isSelected, toggle }">
        <v-btn
          :color="isSelected ? 'primary' : undefined"
          :variant="isSelected ? 'elevated' : 'outlined'"
          @click="toggle"
        >
          <v-icon>mdi-pine-tree</v-icon>
          木
        </v-btn>
      </v-item>
      <v-item value="building" v-slot="{ isSelected, toggle }">
        <v-btn
          :color="isSelected ? 'primary' : undefined"
          :variant="isSelected ? 'elevated' : 'outlined'"
          @click="toggle"
        >
          <v-icon>mdi-office-building</v-icon>
          ビル
        </v-btn>
      </v-item>
      <v-item value="pier" v-slot="{ isSelected, toggle }">
        <v-btn
          :color="isSelected ? 'primary' : undefined"
          :variant="isSelected ? 'elevated' : 'outlined'"
          @click="toggle"
        >
          <v-icon>mdi-pillar</v-icon>
          橋脚
        </v-btn>
      </v-item>
      <v-item value="delete" v-slot="{ isSelected, toggle }">
        <v-btn
          :color="isSelected ? 'primary' : undefined"
          :variant="isSelected ? 'elevated' : 'outlined'"
          @click="toggle"
        >
          <v-icon>mdi-delete</v-icon>
          削除
        </v-btn>
      </v-item>
    </v-item-group>

    <!-- rotate ツール削除 -->

    <v-divider class="my-4" />

    <v-text-field
      v-model="titleProxy"
      label="作成中の線路にタイトルを設定"
      placeholder="例: 山手線、中央線、私の線路..."
      density="comfortable"
      variant="outlined"
      class="mx-2 mb-2"
      clearable
      hide-details
    />
    <div class="text-caption text-medium-emphasis mx-2 mb-2">※ タイトルは保存時に記録され、復元時に表示されます</div>

    <v-alert v-if="isRailsLocked" type="success" class="mt-4"> 周回線路が完成！ </v-alert>

    <v-alert v-else-if="rails.length > 0" type="info" class="mt-4"> 線路: {{ rails.length }}本配置済み </v-alert>

    <v-divider class="my-4" />

    <v-card-subtitle>プリセット線路</v-card-subtitle>
    <v-row dense class="pa-2">
      <v-col cols="6">
        <v-btn color="secondary" @click="$emit('createOvalPreset')" :disabled="rails.length > 0" block class="mb-2">
          <v-icon size="small">mdi-ellipse-outline</v-icon>
          <span class="text-caption">オーバル</span>
        </v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn color="secondary" @click="$emit('createSCurvePreset')" :disabled="rails.length > 0" block class="mb-2">
          <v-icon size="small">mdi-axis-z-rotate-clockwise</v-icon>
          <span class="text-caption">S字</span>
        </v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn
          color="secondary"
          @click="$emit('createSlopeUpDownCurvesPreset')"
          :disabled="rails.length > 0"
          block
          class="mb-2"
        >
          <v-icon size="small">mdi-trending-up</v-icon>
          <span class="text-caption">スロープ</span>
        </v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn color="secondary" @click="$emit('loadCurveSlopePreset')" :disabled="rails.length > 0" block class="mb-2">
          <v-icon size="small">mdi-file-document-outline</v-icon>
          <span class="text-caption">曲線スロープ</span>
        </v-btn>
      </v-col>
      <v-col cols="12">
        <v-btn
          color="warning"
          @click="$emit('clearAllRails')"
          :disabled="rails.length === 0 && trees.length === 0 && buildings.length === 0 && piers.length === 0"
          block
        >
          <v-icon>mdi-delete-sweep</v-icon>
          すべてクリア
        </v-btn>
      </v-col>
    </v-row>

    <v-divider class="my-4" />

    <v-card-subtitle>自動保存状況</v-card-subtitle>
    <v-row dense class="pa-2">
      <v-col cols="12">
        <div v-if="saveDataInfo" class="text-caption text-medium-emphasis mx-2">
          最終自動保存: {{ new Date(saveDataInfo.timestamp).toLocaleString() }}<br />
          線路{{ saveDataInfo.railsCount }}本、木{{ saveDataInfo.treesCount }}本、ビル{{
            saveDataInfo.buildingsCount
          }}本、橋脚{{ saveDataInfo.piersCount }}本
        </div>
        <div v-else class="text-caption text-medium-emphasis mx-2">まだ自動保存されていません</div>
      </v-col>
    </v-row>

    <v-card-subtitle>手動保存・復元</v-card-subtitle>
    <v-row dense class="pa-2">
      <v-col cols="6">
        <v-btn
          color="success"
          @click="$emit('handleSaveManual1')"
          :disabled="rails.length === 0 && trees.length === 0 && buildings.length === 0 && piers.length === 0"
          block
          class="mb-2"
        >
          <v-icon size="small">mdi-content-save</v-icon>
          <span class="text-caption">保存1</span>
        </v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn
          color="success"
          @click="$emit('handleSaveManual2')"
          :disabled="rails.length === 0 && trees.length === 0 && buildings.length === 0 && piers.length === 0"
          block
          class="mb-2"
        >
          <v-icon size="small">mdi-content-save</v-icon>
          <span class="text-caption">保存2</span>
        </v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn color="orange" @click="$emit('handleLoadManual1')" :disabled="!hasManualSave1" block class="mb-2">
          <v-icon size="small">mdi-upload</v-icon>
          <span class="text-caption">復元1</span>
        </v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn color="orange" @click="$emit('handleLoadManual2')" :disabled="!hasManualSave2" block class="mb-2">
          <v-icon size="small">mdi-upload</v-icon>
          <span class="text-caption">復元2</span>
        </v-btn>
      </v-col>
      <v-col cols="12">
        <div v-if="manualSaveInfo1" class="text-caption text-medium-emphasis mx-2">
          保存1: {{ new Date(manualSaveInfo1.timestamp).toLocaleString() }}
          <span v-if="manualSaveInfo1.title">"{{ manualSaveInfo1.title }}"</span>
          (線路{{ manualSaveInfo1.railsCount }}本)
        </div>
        <div v-if="manualSaveInfo2" class="text-caption text-medium-emphasis mx-2">
          保存2: {{ new Date(manualSaveInfo2.timestamp).toLocaleString() }}
          <span v-if="manualSaveInfo2.title">"{{ manualSaveInfo2.title }}"</span>
          (線路{{ manualSaveInfo2.railsCount }}本)
        </div>
      </v-col>
    </v-row>

    <v-divider class="my-4" />
  </v-card-text>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import type { Rail } from "../../types/rail";

interface Props {
  selectedTool:
    | "none"
    | "straight"
    | "curve"
    | "slope"
    | "curve-slope-up"
    | "curve-slope-down"
    | "tree"
    | "building"
    | "pier"
    | "station"
    | "crossing"
    | "delete";
  currentTitle: string;
  rails: Rail[];
  trees: { position: [number, number, number]; rotation?: [number, number, number] }[];
  buildings: {
    position: [number, number, number];
    height?: number;
    color?: string;
    rotation?: [number, number, number];
  }[];
  piers: { position: [number, number, number]; height?: number; rotation?: [number, number, number] }[];
  isRailsLocked: boolean;
  saveDataInfo: any;
  hasManualSave1: boolean;
  hasManualSave2: boolean;
  manualSaveInfo1: any;
  manualSaveInfo2: any;
  lastPointer: { x: number; z: number } | null;
  ghostRail: Rail | null;
  ghostPier: { position: [number, number, number]; height?: number; rotation?: [number, number, number] } | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:selectedTool": [
    value:
      | "none"
      | "straight"
      | "curve"
      | "slope"
      | "curve-slope-up"
      | "curve-slope-down"
      | "tree"
      | "building"
      | "pier"
      | "station"
      | "crossing"
      | "delete"
  ];
  "update:currentTitle": [value: string];
  createOvalPreset: [];
  createSCurvePreset: [];
  createSlopeUpDownCurvesPreset: [];
  loadCurveSlopePreset: [];
  clearAllRails: [];
  handleSaveManual1: [];
  handleSaveManual2: [];
  handleLoadManual1: [];
  handleLoadManual2: [];
}>();

// v-model bridge for selectedTool
const selectedToolProxy = computed({
  get: () => props.selectedTool,
  set: (
    v:
      | "none"
      | "straight"
      | "curve"
      | "slope"
      | "curve-slope-up"
      | "curve-slope-down"
      | "tree"
      | "building"
      | "pier"
      | "station"
      | "crossing"
      | "delete"
  ) => emit("update:selectedTool", v),
});

// v-model bridge for currentTitle
const titleProxy = computed({
  get: () => props.currentTitle,
  set: (v: string) => emit("update:currentTitle", v),
});

// 周回状態になった時に線路配置ツールが選択されていたら自動的に木に切り替える
watch(
  () => props.isRailsLocked,
  (isLocked) => {
    if (isLocked) {
      const railTools = ["straight", "curve", "slope", "curve-slope-up", "curve-slope-down", "station", "crossing"];
      if (railTools.includes(props.selectedTool)) {
        emit("update:selectedTool", "tree");
      }
    }
  }
);
</script>
