<template>
  <v-card-text>
    <v-card-subtitle>操作</v-card-subtitle>
    <v-btn-toggle v-model="selectedToolProxy" color="primary" mandatory class="d-flex flex-wrap pa-2">
      <v-btn value="straight">
        <v-icon>mdi-minus</v-icon>
        直線
      </v-btn>
      <v-btn value="curve">
        <v-icon>mdi-rotate-right</v-icon>
        カーブ
      </v-btn>
      <v-btn value="slope">
        <v-icon>mdi-trending-up</v-icon>
        スロープ
      </v-btn>
      <v-btn value="tree">
        <v-icon>mdi-pine-tree</v-icon>
        木
      </v-btn>
      <v-btn value="building">
        <v-icon>mdi-office-building</v-icon>
        ビル
      </v-btn>
      <v-btn value="pier">
        <v-icon>mdi-pillar</v-icon>
        橋脚
      </v-btn>
      <v-btn value="station">
        <v-icon>mdi-train</v-icon>
        駅ホーム
      </v-btn>
      <v-btn value="rotate">
        <v-icon>mdi-rotate-3d-variant</v-icon>
        回転
      </v-btn>
      <v-btn value="delete">
        <v-icon>mdi-delete</v-icon>
        削除
      </v-btn>
    </v-btn-toggle>

    <div v-if="selectedTool === 'rotate'" class="mt-3">
      <v-alert type="info"> 回転したいレールをクリックしてください </v-alert>
    </div>

    <v-alert v-if="isRailsLocked" type="success" class="mt-4"> 周回線路が完成！ </v-alert>

    <v-alert v-else-if="rails.length > 0" type="info" class="mt-4"> 線路: {{ rails.length }}本配置済み </v-alert>

    <v-divider class="my-4" />

    <v-card-subtitle>プリセット線路</v-card-subtitle>
    <v-row dense class="pa-2">
      <v-col cols="6">
        <v-btn color="secondary" @click="$emit('createLargeCircle')" :disabled="rails.length > 0" block class="mb-2">
          <v-icon size="small">mdi-circle-outline</v-icon>
          <span class="text-caption">大きな円</span>
        </v-btn>
      </v-col>
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

    <v-card-subtitle>データ保存・復元</v-card-subtitle>
    <v-row dense class="pa-2">
      <v-col cols="6">
        <v-btn
          color="primary"
          @click="$emit('handleSaveData')"
          :disabled="rails.length === 0 && trees.length === 0 && buildings.length === 0 && piers.length === 0"
          block
          class="mb-2"
        >
          <v-icon size="small">mdi-content-save</v-icon>
          <span class="text-caption">保存</span>
        </v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn color="secondary" @click="$emit('handleLoadData')" :disabled="!hasSaveData" block class="mb-2">
          <v-icon size="small">mdi-upload</v-icon>
          <span class="text-caption">復元</span>
        </v-btn>
      </v-col>
      <v-col cols="12">
        <div v-if="saveDataInfo" class="text-caption text-medium-emphasis mx-2">
          保存データ: {{ new Date(saveDataInfo.timestamp).toLocaleString() }}<br />
          線路{{ saveDataInfo.railsCount }}本、木{{ saveDataInfo.treesCount }}本、ビル{{
            saveDataInfo.buildingsCount
          }}本、橋脚{{ saveDataInfo.piersCount }}本
        </div>
      </v-col>
    </v-row>

    <v-divider class="my-4" />

    <v-expansion-panels class="pa-2">
      <v-expansion-panel>
        <v-expansion-panel-title>
          <v-icon>mdi-bug</v-icon>
          デバッグ情報
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-card-subtitle>プレビュー（デバッグ）</v-card-subtitle>
          <div class="rails-debug" style="max-height: 140px; overflow-y: auto; font-size: 12px">
            <div class="mb-2 pa-2" style="background-color: #f5f5f5; border-radius: 4px">
              <div>
                <strong>lastPointer:</strong>
                <span v-if="lastPointer"> [{{ lastPointer.x.toFixed(2) }}, {{ lastPointer.z.toFixed(2) }}] </span>
                <span v-else>なし</span>
              </div>
              <div class="mt-1">
                <strong>ghostRail:</strong>
                <template v-if="ghostRail">
                  <div>
                    Type: {{ ghostRail.type }}
                    {{ ghostRail.type === "curve" ? `(${ghostRail.direction})` : "" }}
                  </div>
                  <div>
                    Position: [
                    {{ ghostRail.position[0].toFixed(2) }}, {{ ghostRail.position[1].toFixed(2) }},
                    {{ ghostRail.position[2].toFixed(2) }}
                    ]
                  </div>
                  <div>RotY: {{ ((ghostRail.rotation[1] * 180) / Math.PI).toFixed(1) }}°</div>
                  <div>
                    Start: [
                    {{ ghostRail.connections.start[0].toFixed(2) }}, {{ ghostRail.connections.start[1].toFixed(2) }},
                    {{ ghostRail.connections.start[2].toFixed(2) }}
                    ]
                  </div>
                  <div>
                    End: [
                    {{ ghostRail.connections.end[0].toFixed(2) }}, {{ ghostRail.connections.end[1].toFixed(2) }},
                    {{ ghostRail.connections.end[2].toFixed(2) }}
                    ]
                  </div>
                </template>
                <span v-else>なし</span>
              </div>
              <div class="mt-1">
                <strong>ghostPier:</strong>
                <template v-if="ghostPier">
                  <div>
                    Position: [
                    {{ ghostPier.position[0].toFixed(2) }}, {{ ghostPier.position[1].toFixed(2) }},
                    {{ ghostPier.position[2].toFixed(2) }}
                    ]
                  </div>
                  <div>
                    Rotation: [
                    {{ (ghostPier.rotation?.[0] ?? 0).toFixed(2) }}, {{ (ghostPier.rotation?.[1] ?? 0).toFixed(2) }},
                    {{ (ghostPier.rotation?.[2] ?? 0).toFixed(2) }}
                    ]
                  </div>
                  <div>Height: {{ ghostPier.height ?? "auto" }}</div>
                </template>
                <span v-else>なし</span>
              </div>
            </div>
          </div>

          <v-card-subtitle>Rails データ (デバッグ用)</v-card-subtitle>
          <div class="rails-debug" style="max-height: 300px; overflow-y: auto; font-size: 12px">
            <div
              v-for="(rail, index) in rails"
              :key="rail.id"
              class="mb-2 pa-2"
              style="background-color: #f5f5f5; border-radius: 4px"
            >
              <div>
                <strong>Rail {{ index }}:</strong>
              </div>
              <div>Type: {{ rail.type }}</div>
              <div>
                Position: [{{ rail.position[0].toFixed(2) }}, {{ rail.position[1].toFixed(2) }},
                {{ rail.position[2].toFixed(2) }}]
              </div>
              <div>
                Rotation: [{{ rail.rotation[0].toFixed(2) }}, {{ rail.rotation[1].toFixed(2) }},
                {{ rail.rotation[2].toFixed(2) }}]
              </div>
              <div>
                Start: [{{ rail.connections.start[0].toFixed(2) }}, {{ rail.connections.start[1].toFixed(2) }},
                {{ rail.connections.start[2].toFixed(2) }}]
              </div>
              <div>
                End: [{{ rail.connections.end[0].toFixed(2) }}, {{ rail.connections.end[1].toFixed(2) }},
                {{ rail.connections.end[2].toFixed(2) }}]
              </div>
            </div>
          </div>

          <v-card-subtitle class="mt-4">Piers データ (デバッグ用)</v-card-subtitle>
          <div class="rails-debug" style="max-height: 240px; overflow-y: auto; font-size: 12px">
            <div
              v-for="(p, index) in piers"
              :key="'pier-' + index"
              class="mb-2 pa-2"
              style="background-color: #f5f5f5; border-radius: 4px"
            >
              <div>
                <strong>Pier {{ index }}:</strong>
              </div>
              <div>
                Position: [{{ p.position[0].toFixed(2) }}, {{ p.position[1].toFixed(2) }},
                {{ p.position[2].toFixed(2) }}]
              </div>
              <div>
                Rotation: [
                {{ (p.rotation?.[0] ?? 0).toFixed(2) }}, {{ (p.rotation?.[1] ?? 0).toFixed(2) }},
                {{ (p.rotation?.[2] ?? 0).toFixed(2) }}
                ]
              </div>
              <div>Height: {{ p.height ?? "auto" }}</div>
            </div>
            <div v-if="piers.length === 0" class="text-medium-emphasis">なし</div>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <v-divider class="my-4" />
  </v-card-text>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Rail } from "../../types/rail";

interface Props {
  selectedTool: "straight" | "curve" | "slope" | "tree" | "building" | "pier" | "station" | "rotate" | "delete";
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
  hasSaveData: boolean;
  saveDataInfo: any;
  lastPointer: { x: number; z: number } | null;
  ghostRail: Rail | null;
  ghostPier: { position: [number, number, number]; height?: number; rotation?: [number, number, number] } | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:selectedTool": [value: "straight" | "curve" | "slope" | "tree" | "building" | "pier" | "station" | "rotate" | "delete"];
  createLargeCircle: [];
  createOvalPreset: [];
  createSCurvePreset: [];
  createSlopeUpDownCurvesPreset: [];
  clearAllRails: [];
  handleSaveData: [];
  handleLoadData: [];
}>();

// v-model bridge for selectedTool
const selectedToolProxy = computed({
  get: () => props.selectedTool,
  set: (v: "straight" | "curve" | "slope" | "tree" | "building" | "pier" | "station" | "rotate" | "delete") =>
    emit("update:selectedTool", v),
});
</script>
