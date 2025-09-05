<template>
  <v-container fluid class="pa-0" style="height: 100vh">
    <v-row no-gutters style="height: 100%">
      <v-col cols="3">
        <v-card class="h-100 pa-4">
          <v-card-title>レール選択</v-card-title>
          <v-card-text>
            <v-btn-toggle v-model="selectedTool" color="primary" mandatory>
              <v-btn value="straight">
                <v-icon>mdi-minus</v-icon>
                直線
              </v-btn>
              <v-btn value="curve">
                <v-icon>mdi-rotate-right</v-icon>
                カーブ
              </v-btn>
              <v-btn value="delete">
                <v-icon>mdi-delete</v-icon>
                削除
              </v-btn>
            </v-btn-toggle>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="9" class="position-relative">
        <TresCanvas style="height: 100vh" @click="onCanvasClick">
          <!-- Camera -->
          <TresPerspectiveCamera :position="[0, 10, 10]" />
          
          <!-- Controls -->
          <OrbitControls />
          
          <!-- Lights -->
          <TresAmbientLight :intensity="0.5" />
          <TresDirectionalLight :position="[10, 10, 5]" :intensity="1" cast-shadow />

          <!-- Floor -->
          <TresMesh :rotation="[-Math.PI / 2, 0, 0]" :position="[0, -0.5, 0]" @click="onPlaneClick">
            <TresPlaneGeometry :args="[50, 50]" />
            <TresMeshLambertMaterial color="#90EE90" />
          </TresMesh>

          <!-- Rails -->
          <RailPlayRail v-for="rail in rails" :key="rail.id" :rail="rail" @click="onRailClick" />

          <!-- Train -->
          <RailPlayTrain v-if="trainRunning && rails.length > 0" :rails="rails" :speed="trainSpeed" />
        </TresCanvas>

        <div class="position-absolute bottom-4 right-4">
          <v-card class="pa-3">
            <v-btn color="success" :disabled="!canRunTrain" @click="toggleTrain">
              {{ trainRunning ? "停止" : "走らせる" }}
            </v-btn>
            <v-slider v-model="trainSpeed" :min="0.1" :max="2.0" :step="0.1" label="速度" class="mt-3" />
          </v-card>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls } from '@tresjs/cientos';
import RailPlayRail from "./RailPlayRail.vue";
import RailPlayTrain from "./RailPlayTrain.vue";

export interface Rail {
  id: string;
  type: "straight" | "curve";
  position: [number, number, number];
  rotation: [number, number, number];
  connections: {
    start: [number, number, number];
    end: [number, number, number];
  };
}

const selectedTool = ref<"straight" | "curve" | "delete">("straight");
const rails = ref<Rail[]>([]);
const trainRunning = ref(false);
const trainSpeed = ref(1.0);

const isLoopComplete = (): boolean => {
  if (rails.value.length < 3) return false;

  const firstRail = rails.value[0];
  const lastRail = rails.value[rails.value.length - 1];

  const distance = Math.sqrt(
    (firstRail.connections.start[0] - lastRail.connections.end[0]) ** 2 +
      (firstRail.connections.start[2] - lastRail.connections.end[2]) ** 2
  );

  return distance < 1;
};

const canRunTrain = computed(() => {
  return rails.value.length > 2 && isLoopComplete();
});

const snapToGrid = (position: number): number => {
  return Math.round(position / 2) * 2;
};

const calculateConnections = (
  position: [number, number, number],
  rotation: [number, number, number],
  type: "straight" | "curve"
) => {
  const [x, y, z] = position;
  const [, ry] = rotation;

  if (type === "straight") {
    const length = 2;
    const startX = x - Math.cos(ry) * length;
    const startZ = z - Math.sin(ry) * length;
    const endX = x + Math.cos(ry) * length;
    const endZ = z + Math.sin(ry) * length;

    return {
      start: [startX, y, startZ] as [number, number, number],
      end: [endX, y, endZ] as [number, number, number],
    };
  }

  const radius = 2;
  const startAngle = ry;
  const endAngle = ry + Math.PI / 2;

  const startX = x + Math.cos(startAngle) * radius;
  const startZ = z + Math.sin(startAngle) * radius;
  const endX = x + Math.cos(endAngle) * radius;
  const endZ = z + Math.sin(endAngle) * radius;

  return {
    start: [startX, y, startZ] as [number, number, number],
    end: [endX, y, endZ] as [number, number, number],
  };
};

const findBestConnection = (clickX: number, clickZ: number, type: "straight" | "curve") => {
  if (rails.value.length === 0) {
    return {
      position: [snapToGrid(clickX), 0, snapToGrid(clickZ)] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    };
  }

  const lastRail = rails.value[rails.value.length - 1];
  const connectPoint = lastRail.connections.end;

  let bestRotation: [number, number, number] = [0, 0, 0];

  if (type === "straight") {
    const dx = snapToGrid(clickX) - connectPoint[0];
    const dz = snapToGrid(clickZ) - connectPoint[2];
    const angle = Math.atan2(dz, dx);
    bestRotation = [0, angle, 0];
  } else {
    const dx = snapToGrid(clickX) - connectPoint[0];
    const dz = snapToGrid(clickZ) - connectPoint[2];
    const angle = Math.atan2(dz, dx) - Math.PI / 4;
    bestRotation = [0, angle, 0];
  }

  return {
    position: connectPoint,
    rotation: bestRotation,
  };
};

const createRail = (x: number, z: number, type: "straight" | "curve"): Rail => {
  const connection = findBestConnection(x, z, type);
  const connections = calculateConnections(connection.position, connection.rotation, type);

  return {
    id: `rail-${Date.now()}-${Math.random()}`,
    type,
    position: connection.position,
    rotation: connection.rotation,
    connections,
  };
};

interface ClickEvent {
  intersections?: Array<{
    point: { x: number; y: number; z: number };
  }>;
}

const onPlaneClick = (event: ClickEvent) => {
  if (selectedTool.value === "delete") return;

  const intersect = event.intersections?.[0];
  if (intersect) {
    const point = intersect.point;
    const newRail = createRail(point.x, point.z, selectedTool.value);
    rails.value.push(newRail);
  }
};

const onCanvasClick = () => {
  // Canvas level click handling if needed
};

const onRailClick = (rail: Rail) => {
  if (selectedTool.value === "delete") {
    const index = rails.value.findIndex((r) => r.id === rail.id);
    if (index > -1) {
      rails.value.splice(index, 1);
    }
  }
};

const toggleTrain = () => {
  trainRunning.value = !trainRunning.value;
};
</script>

<style scoped>
.position-relative {
  position: relative;
}

.position-absolute {
  position: absolute;
}

.bottom-4 {
  bottom: 1rem;
}

.right-4 {
  right: 1rem;
}
</style>
