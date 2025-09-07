<template>
  <TresGroup @click="onClick">
    <!-- Straight rail -->
    <TresGroup v-if="rail.type === 'straight'" :position="[0, RAIL_HEIGHT / 2, 0]">
      <TresMesh :position="rail.position" :rotation="rail.rotation">
        <!-- 直線レールジオメトリは共通定数から -->
        >
        <TresBoxGeometry :args="[RAIL_STRAIGHT_FULL_LENGTH, RAIL_HEIGHT, RAIL_THICKNESS]" />
        <TresMeshLambertMaterial color="#4169E1" :side="2" />
      </TresMesh>
    </TresGroup>

    <!-- Curve rail (Extruded arc) -->
    <TresGroup v-else-if="rail.type === 'curve'" :position="rail.position" :rotation="[0, -rail.rotation[1], 0]">
      <TresGroup v-if="curveGeometry" :rotation="[0, Math.PI / 2, 0]">
        <TresMesh :geometry="curveGeometry" :rotation="[Math.PI / 2, 0, 0]">
          <TresMeshLambertMaterial color="#4169E1" :side="2" />
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

  // 外側 -> 角度進行 -> 内側へラジアル -> 内側円弧逆戻り -> 外側へラジアル で閉じる
  const shape = new THREE.Shape();
  const a0 = 0;
  const a1 = CURVE_SEGMENT_ANGLE;
  // 開始点 (外側, 角度0)
  shape.moveTo(RAIL_CURVE_OUTER_RADIUS * Math.cos(a0), RAIL_CURVE_OUTER_RADIUS * Math.sin(a0));
  // 外側円弧
  shape.absarc(0, 0, RAIL_CURVE_OUTER_RADIUS, a0, a1, false);
  // ラジアル (外->内) at angle a1
  shape.lineTo(RAIL_CURVE_INNER_RADIUS * Math.cos(a1), RAIL_CURVE_INNER_RADIUS * Math.sin(a1));
  // 内側円弧 (戻る)
  shape.absarc(0, 0, RAIL_CURVE_INNER_RADIUS, a1, a0, true);
  // ラジアル (内->外) at angle 0
  shape.lineTo(RAIL_CURVE_OUTER_RADIUS * Math.cos(a0), RAIL_CURVE_OUTER_RADIUS * Math.sin(a0));

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: RAIL_HEIGHT,
    bevelEnabled: false,
    curveSegments: 32,
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // 中心を 0 に近づけるため Z 方向 (depth) の中心へ移動
  geom.translate(0, 0, -RAIL_HEIGHT);
  curveGeometry.value = geom;
});
</script>
