<template>
  <TresGroup @click="onClick">
    <!-- Straight rail -->
    <TresGroup v-if="rail.type === 'straight'" :position="[0, RAIL_HEIGHT / 2, 0]">
      <TresMesh :position="rail.position" :rotation="rail.rotation">
        <TresBoxGeometry :args="[RAIL_STRAIGHT_FULL_LENGTH, RAIL_HEIGHT, RAIL_THICKNESS]" />
        <TresMeshLambertMaterial color="#4169E1" :side="2" />
      </TresMesh>
    </TresGroup>

    <!-- Left Curve rail-->
    <TresGroup
      v-else-if="rail.type === 'curve' && rail.direction === 'left'"
      :position="rail.position"
      :rotation="[0, -rail.rotation[1], 0]"
    >
      <TresGroup v-if="curveGeometry" :rotation="[0, Math.PI / 2, 0]">
        <TresMesh :geometry="curveGeometry" :rotation="[Math.PI / 2, 0, 0]">
          <TresMeshLambertMaterial :color="'#4169E1'" :side="2" />
        </TresMesh>
      </TresGroup>
    </TresGroup>

    <!-- Right Curve rail-->
    <TresGroup
      v-else-if="rail.type === 'curve' && rail.direction === 'right'"
      :position="rail.position"
      :rotation="[0, Math.PI - rail.rotation[1], 0]"
    >
      <TresGroup v-if="curveGeometry" :rotation="[0, Math.PI / 2, 0]">
        <TresMesh :geometry="curveGeometry" :rotation="[Math.PI / 2, 0, 0]">
          <TresMeshLambertMaterial :color="'#4169E1'" :side="2" />
        </TresMesh>
      </TresGroup>
    </TresGroup>
  </TresGroup>
</template>

<script setup lang="ts">
import type { Rail } from "./RailPlayGame.vue";
import { onMounted, ref } from "vue";
import * as THREE from "three";
import {
  RAIL_STRAIGHT_FULL_LENGTH,
  CURVE_SEGMENT_ANGLE,
  RAIL_CURVE_INNER_RADIUS,
  RAIL_CURVE_OUTER_RADIUS,
  RAIL_HEIGHT,
  RAIL_THICKNESS,
} from "../constants/rail";

const props = defineProps<{
  rail: Rail;
}>();

const emit = defineEmits<{
  click: [rail: Rail];
}>();

const onClick = () => {
  emit("click", props.rail);
};

// Curve geometry (Extrude) 作成
const curveGeometry = ref<THREE.ExtrudeGeometry | null>(null);

onMounted(() => {
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
});
</script>
