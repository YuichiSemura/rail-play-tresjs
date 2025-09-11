<template>
  <TresGroup ref="root" @click="onClick">
    <!-- Straight rail -->
    <TresGroup v-if="rail.type === 'straight'" :key="`straight-${rail.id}`" :position="[0, RAIL_HEIGHT / 2, 0]">
      <TresMesh :position="rail.position" :rotation="rail.rotation">
        <TresBoxGeometry :args="[RAIL_STRAIGHT_FULL_LENGTH, RAIL_HEIGHT, RAIL_THICKNESS]" />
        <TresMeshLambertMaterial
          :color="ghost ? '#6AA0FF' : '#4169E1'"
          :transparent="ghost"
          :opacity="ghost ? 0.35 : 1"
          :side="2"
        />
      </TresMesh>
    </TresGroup>

    <!-- Slope rail (tilted box to match logical rise) -->
    <TresGroup v-else-if="rail.type === 'slope'" :key="`slope-${rail.id}`" :position="[0, RAIL_HEIGHT / 2, 0]">
      <!-- Outer group applies yaw so local X aligns with path -->
      <TresGroup
        :position="[rail.position[0], (rail.connections.start[1] + rail.connections.end[1]) / 2, rail.position[2]]"
        :rotation="[0, -rail.rotation[1], 0]"
      >
        <!-- Inner mesh pitched around Z by arctan(dy/run) and length=3D length to preserve horizontal run -->
        <TresMesh :rotation="[0, 0, Math.atan2(rail.connections.end[1] - rail.connections.start[1], RAIL_SLOPE_RUN)]">
          <TresBoxGeometry :args="[RAIL_SLOPE_LENGTH_3D, RAIL_HEIGHT, RAIL_THICKNESS]" />
          <TresMeshLambertMaterial
            :color="ghost ? '#6AA0FF' : '#4169E1'"
            :transparent="ghost"
            :opacity="ghost ? 0.35 : 1"
            :side="2"
          />
        </TresMesh>
      </TresGroup>
    </TresGroup>

    <!-- Left Curve rail-->
    <TresGroup
      v-else-if="rail.type === 'curve' && rail.direction === 'left'"
      :key="`curve-left-${rail.id}`"
      :position="rail.position"
      :rotation="[0, -rail.rotation[1], 0]"
    >
      <TresGroup v-if="curveGeometry" :rotation="[0, Math.PI / 2, 0]">
        <TresMesh :geometry="curveGeometry" :rotation="[Math.PI / 2, 0, 0]">
          <TresMeshLambertMaterial
            :color="ghost ? '#6AA0FF' : '#4169E1'"
            :transparent="ghost"
            :opacity="ghost ? 0.35 : 1"
            :side="2"
          />
        </TresMesh>
      </TresGroup>
    </TresGroup>

    <!-- Right Curve rail-->
    <TresGroup
      v-else-if="rail.type === 'curve' && rail.direction === 'right'"
      :key="`curve-right-${rail.id}`"
      :position="rail.position"
      :rotation="[0, Math.PI - rail.rotation[1], 0]"
    >
      <TresGroup v-if="curveGeometry" :rotation="[0, Math.PI / 2, 0]">
        <TresMesh :geometry="curveGeometry" :rotation="[Math.PI / 2, 0, 0]">
          <TresMeshLambertMaterial
            :color="ghost ? '#6AA0FF' : '#4169E1'"
            :transparent="ghost"
            :opacity="ghost ? 0.35 : 1"
            :side="2"
          />
        </TresMesh>
      </TresGroup>
    </TresGroup>

    <!-- Station rail (same as straight rail but with station platform) -->
    <TresGroup v-else-if="rail.type === 'station'" :key="`station-${rail.id}`">
      <!-- レール部分 -->
      <TresGroup :position="[0, RAIL_HEIGHT / 2, 0]">
        <TresMesh :position="rail.position" :rotation="rail.rotation">
          <TresBoxGeometry :args="[RAIL_STRAIGHT_FULL_LENGTH, RAIL_HEIGHT, RAIL_THICKNESS]" />
          <TresMeshLambertMaterial
            :color="ghost ? '#6AA0FF' : '#4169E1'"
            :transparent="ghost"
            :opacity="ghost ? 0.35 : 1"
            :side="2"
          />
        </TresMesh>
      </TresGroup>
      <!-- プラットフォーム部分 -->
      <RailPlayStation :position="rail.position" :rotation="rail.rotation" :ghost="ghost" />
    </TresGroup>

    <!-- Crossing rail (same as straight rail but with crossing hardware on both sides) -->
    <TresGroup v-else-if="rail.type === 'crossing'" :key="`crossing-${rail.id}`">
      <!-- レール部分 -->
      <TresGroup :position="[0, RAIL_HEIGHT / 2, 0]">
        <TresMesh :position="rail.position" :rotation="rail.rotation">
          <TresBoxGeometry :args="[RAIL_STRAIGHT_FULL_LENGTH, RAIL_HEIGHT, RAIL_THICKNESS]" />
          <TresMeshLambertMaterial
            :color="ghost ? '#6AA0FF' : '#4169E1'"
            :transparent="ghost"
            :opacity="ghost ? 0.35 : 1"
            :side="2"
          />
        </TresMesh>
      </TresGroup>
      <!-- 踏切本体 -->
      <RailPlayCrossing :position="rail.position" :rotation="rail.rotation" :ghost="ghost" />
    </TresGroup>
  </TresGroup>
</template>

<script setup lang="ts">
import type { Rail } from "../types/rail";
import { onMounted, onUnmounted, ref, watch } from "vue";
import * as THREE from "three";
import RailPlayStation from "./RailPlayStation.vue";
import RailPlayCrossing from "./RailPlayCrossing.vue";
import {
  RAIL_STRAIGHT_FULL_LENGTH,
  CURVE_SEGMENT_ANGLE,
  RAIL_CURVE_INNER_RADIUS,
  RAIL_CURVE_OUTER_RADIUS,
  RAIL_HEIGHT,
  RAIL_THICKNESS,
  RAIL_SLOPE_RUN,
  RAIL_SLOPE_LENGTH_3D,
} from "../constants/rail";

const props = defineProps<{
  rail: Rail;
  ghost?: boolean;
}>();

const emit = defineEmits<{
  click: [rail: Rail];
}>();

const onClick = () => {
  // ゴーストはクリックを透過（何もしない）
  if (props.ghost) return;
  emit("click", props.rail);
};

// Curve geometry (Extrude) 作成
const curveGeometry = ref<THREE.ExtrudeGeometry | null>(null);

// ルートグループ参照（レイキャスト無効化用）
const root = ref<THREE.Group | null>(null);

// ghost時は全子オブジェクトのraycastを無効化して床クリックをブロックしない
const setGhostRaycast = (ghost: boolean) => {
  const grp = root.value;
  if (!grp) return;
  grp.traverse((obj: THREE.Object3D) => {
    const anyObj = obj as any;
    if (ghost) {
      if (!anyObj.userData) anyObj.userData = {};
      if (!anyObj.userData.__origRaycast) {
        anyObj.userData.__origRaycast = anyObj.raycast;
      }
      anyObj.raycast = () => null;
    } else {
      if (anyObj.userData && anyObj.userData.__origRaycast) {
        anyObj.raycast = anyObj.userData.__origRaycast;
        delete anyObj.userData.__origRaycast;
      }
    }
  });
};

const buildCurveGeometry = () => {
  // 既存のジオメトリを破棄してから再生成
  if (curveGeometry.value) {
    curveGeometry.value.dispose();
    curveGeometry.value = null;
  }
  if (props.rail.type !== "curve") return;
  const isRight = props.rail.direction === "right";
  const shape = new THREE.Shape();
  const a0 = 0;
  const a1 = CURVE_SEGMENT_ANGLE;
  if (!isRight) {
    // 左カーブ（従来）
    shape.moveTo(RAIL_CURVE_OUTER_RADIUS * Math.cos(a0), RAIL_CURVE_OUTER_RADIUS * Math.sin(a0));
    shape.absarc(0, 0, RAIL_CURVE_OUTER_RADIUS, a0, a1, false);
    shape.lineTo(RAIL_CURVE_INNER_RADIUS * Math.cos(a1), RAIL_CURVE_INNER_RADIUS * Math.sin(a1));
    shape.absarc(0, 0, RAIL_CURVE_INNER_RADIUS, a1, a0, true);
    shape.lineTo(RAIL_CURVE_OUTER_RADIUS * Math.cos(a0), RAIL_CURVE_OUTER_RADIUS * Math.sin(a0));
  } else {
    // 右カーブ: 反時計回り (counter-clockwise) で外側を -Δ → 0 へ描画
    const a0r = -CURVE_SEGMENT_ANGLE; // -Δ
    const a1r = 0; // 0
    // 外側円弧（CCW: a0r → a1r）
    shape.moveTo(RAIL_CURVE_OUTER_RADIUS * Math.cos(a0r), RAIL_CURVE_OUTER_RADIUS * Math.sin(a0r));
    shape.absarc(0, 0, RAIL_CURVE_OUTER_RADIUS, a0r, a1r, false);
    // ラジアル（外→内） at angle a1r (=0)
    shape.lineTo(RAIL_CURVE_INNER_RADIUS * Math.cos(a1r), RAIL_CURVE_INNER_RADIUS * Math.sin(a1r));
    // 内側円弧（戻る: clockwise で a1r → a0r）
    shape.absarc(0, 0, RAIL_CURVE_INNER_RADIUS, a1r, a0r, true);
    shape.lineTo(RAIL_CURVE_OUTER_RADIUS * Math.cos(a0r), RAIL_CURVE_OUTER_RADIUS * Math.sin(a0r));
  }
  const extrudeSettings: THREE.ExtrudeGeometryOptions = { depth: RAIL_HEIGHT, bevelEnabled: false, curveSegments: 32 };
  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.translate(0, 0, -RAIL_HEIGHT);
  curveGeometry.value = geom;
};

onMounted(() => {
  buildCurveGeometry();
  setGhostRaycast(!!props.ghost);
});

// レール情報が変わる度にジオメトリを更新（ゴースト切替含む）
watch(
  () => props.rail,
  () => buildCurveGeometry(),
  { deep: true }
);

// ghost切替でレイキャスト可否を更新
watch(
  () => props.ghost,
  (g) => setGhostRaycast(!!g)
);

onUnmounted(() => {
  if (curveGeometry.value) {
    curveGeometry.value.dispose();
    curveGeometry.value = null;
  }
  // 念のためレイキャストを元に戻す
  setGhostRaycast(false);
});
</script>
