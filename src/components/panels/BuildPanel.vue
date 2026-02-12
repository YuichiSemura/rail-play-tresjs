<template>
  <v-card-text>
    <v-card-subtitle>操作</v-card-subtitle>
    <!-- v-btn-toggle は内部が単行スクロールのため折り返しできず項目が欠けるケースがある。
         v-item-group + v-item + v-btn 構成に置換し、flex-wrap で全項目を表示する。 -->
    <v-item-group v-model="store.selectedTool" mandatory class="d-flex flex-wrap pa-2" style="gap: 8px">
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
          :disabled="store.isRailsLocked"
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
          :disabled="store.isRailsLocked"
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
          :disabled="store.isRailsLocked"
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
          :disabled="store.isRailsLocked"
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
          :disabled="store.isRailsLocked"
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
          :disabled="store.isRailsLocked"
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
          :disabled="store.isRailsLocked"
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

    <v-card-subtitle>履歴操作</v-card-subtitle>
    <v-row dense class="pa-2">
      <v-col cols="6">
        <v-btn color="info" @click="handleUndo" :disabled="!store.canUndo" block class="mb-2">
          <v-icon size="small">mdi-undo</v-icon>
          <span class="text-caption">元に戻す (Ctrl+Z)</span>
        </v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn color="info" @click="handleRedo" :disabled="!store.canRedo" block class="mb-2">
          <v-icon size="small">mdi-redo</v-icon>
          <span class="text-caption">やり直す (Ctrl+Shift+Z)</span>
        </v-btn>
      </v-col>
    </v-row>

    <v-divider class="my-4" />

    <v-text-field
      v-model="store.currentTitle"
      label="作成中の線路にタイトルを設定"
      placeholder="例: 山手線、中央線、私の線路..."
      density="comfortable"
      variant="outlined"
      class="mx-2 mb-2"
      clearable
      hide-details
    />
    <div class="text-caption text-medium-emphasis mx-2 mb-2">※ タイトルは保存時に記録され、復元時に表示されます</div>

    <v-alert v-if="store.isRailsLocked" type="success" class="mt-4"> 周回線路が完成！ </v-alert>

    <v-alert v-else-if="store.rails.length > 0" type="info" class="mt-4"> 線路: {{ store.rails.length }}本配置済み </v-alert>

    <v-divider class="my-4" />

    <v-card-subtitle>プリセット線路</v-card-subtitle>
    <v-row dense class="pa-2">
      <v-col cols="6">
        <v-btn color="secondary" @click="createOvalPreset()" :disabled="store.rails.length > 0" block class="mb-2">
          <v-icon size="small">mdi-ellipse-outline</v-icon>
          <span class="text-caption">オーバル</span>
        </v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn color="secondary" @click="createSCurvePreset()" :disabled="store.rails.length > 0" block class="mb-2">
          <v-icon size="small">mdi-axis-z-rotate-clockwise</v-icon>
          <span class="text-caption">S字</span>
        </v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn
          color="secondary"
          @click="createSlopeUpDownCurvesPreset()"
          :disabled="store.rails.length > 0"
          block
          class="mb-2"
        >
          <v-icon size="small">mdi-trending-up</v-icon>
          <span class="text-caption">スロープ</span>
        </v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn color="secondary" @click="loadCurveSlopePreset()" :disabled="store.rails.length > 0" block class="mb-2">
          <v-icon size="small">mdi-file-document-outline</v-icon>
          <span class="text-caption">曲線スロープ</span>
        </v-btn>
      </v-col>
      <v-col cols="12">
        <v-btn
          color="warning"
          @click="clearAllRails()"
          :disabled="store.rails.length === 0 && store.trees.length === 0 && store.buildings.length === 0 && store.piers.length === 0"
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
        <div v-if="store.saveDataInfo" class="text-caption text-medium-emphasis mx-2">
          最終自動保存: {{ new Date(store.saveDataInfo.timestamp).toLocaleString() }}<br />
          線路{{ store.saveDataInfo.railsCount }}本、木{{ store.saveDataInfo.treesCount }}本、ビル{{
            store.saveDataInfo.buildingsCount
          }}本、橋脚{{ store.saveDataInfo.piersCount }}本
        </div>
        <div v-else class="text-caption text-medium-emphasis mx-2">まだ自動保存されていません</div>
      </v-col>
    </v-row>

    <v-card-subtitle>手動保存・復元</v-card-subtitle>
    <v-row dense class="pa-2">
      <v-col cols="6">
        <v-btn
          color="success"
          @click="handleSaveManual1()"
          :disabled="store.rails.length === 0 && store.trees.length === 0 && store.buildings.length === 0 && store.piers.length === 0"
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
          @click="handleSaveManual2()"
          :disabled="store.rails.length === 0 && store.trees.length === 0 && store.buildings.length === 0 && store.piers.length === 0"
          block
          class="mb-2"
        >
          <v-icon size="small">mdi-content-save</v-icon>
          <span class="text-caption">保存2</span>
        </v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn color="orange" @click="handleLoadManual1()" :disabled="!storage.hasManual1()" block class="mb-2">
          <v-icon size="small">mdi-upload</v-icon>
          <span class="text-caption">復元1</span>
        </v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn color="orange" @click="handleLoadManual2()" :disabled="!storage.hasManual2()" block class="mb-2">
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
import { useGameStore } from "../../stores/game";
import { useStorageStore } from "../../stores/storage";
import { useUndoRedo } from "../../composables/useUndoRedo";
import { usePresets } from "../../composables/usePresets";
import { useSaveLoad } from "../../composables/useSaveLoad";

const store = useGameStore();
const storageStore = useStorageStore();

const { handleUndo, handleRedo } = useUndoRedo();
const {
  createOvalPreset,
  createSCurvePreset,
  createSlopeUpDownCurvesPreset,
  loadCurveSlopePreset,
} = usePresets();
const {
  storage,
  clearAllRails,
  handleSaveManual1,
  handleSaveManual2,
  handleLoadManual1,
  handleLoadManual2,
} = useSaveLoad();

const manualSaveInfo1 = computed(() => storageStore.getManualInfo1());
const manualSaveInfo2 = computed(() => storageStore.getManualInfo2());

// 周回状態になった時に線路配置ツールが選択されていたら自動的に木に切り替える
watch(
  () => store.isRailsLocked,
  (isLocked) => {
    if (isLocked) {
      const railTools = ["straight", "curve", "slope", "curve-slope-up", "curve-slope-down", "station", "crossing"];
      if (railTools.includes(store.selectedTool)) {
        store.selectedTool = "tree";
      }
    }
  }
);
</script>
