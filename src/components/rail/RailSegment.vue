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

    <!-- Slope rail (curved slope with ease-in-out) -->
    <TresGroup v-else-if="rail.type === 'slope'" :key="`slope-${rail.id}`">
      <TresGroup :position="[rail.position[0], 0, rail.position[2]]" :rotation="[0, rail.rotation[1], 0]">
        <TresMesh v-if="slopeGeometry" :geometry="slopeGeometry">
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
      :rotation="[0, rail.rotation[1], 0]"
    >
      <TresGroup v-if="curveGeometry" :rotation="[0, -Math.PI / 4, 0]">
        <TresMesh :geometry="curveGeometry" :position="[0, 0, 0]" :rotation="[Math.PI / 2, 0, 0]">
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
      :rotation="[0, rail.rotation[1], 0]"
    >
      <TresGroup v-if="curveGeometry" :rotation="[0, Math.PI / 4, 0]">
        <TresMesh :geometry="curveGeometry" :position="[0, 0, 0]" :rotation="[Math.PI / 2, 0, 0]">
          <TresMeshLambertMaterial
            :color="ghost ? '#6AA0FF' : '#4169E1'"
            :transparent="ghost"
            :opacity="ghost ? 0.35 : 1"
            :side="2"
          />
        </TresMesh>
      </TresGroup>
    </TresGroup>

    <!-- Left Curve Slope rail-->
    <TresGroup
      v-else-if="rail.type === 'curve-slope' && rail.direction === 'left'"
      :key="`curve-slope-left-${rail.id}`"
      :position="[rail.position[0], rail.position[1] + RAIL_HEIGHT / 2, rail.position[2]]"
      :rotation="[0, rail.rotation[1], 0]"
    >
      <TresGroup v-if="curveSlopeGeometry">
        <TresMesh :geometry="curveSlopeGeometry">
          <TresMeshLambertMaterial
            :color="ghost ? '#6AA0FF' : '#4169E1'"
            :transparent="ghost"
            :opacity="ghost ? 0.35 : 1"
            :side="2"
          />
        </TresMesh>
      </TresGroup>
    </TresGroup>

    <!-- Right Curve Slope rail-->
    <TresGroup
      v-else-if="rail.type === 'curve-slope' && rail.direction === 'right'"
      :key="`curve-slope-right-${rail.id}`"
      :position="[rail.position[0], rail.position[1] + RAIL_HEIGHT / 2, rail.position[2]]"
      :rotation="[0, Math.PI + rail.rotation[1], 0]"
    >
      <TresGroup v-if="curveSlopeGeometry">
        <TresMesh :geometry="curveSlopeGeometry">
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
      <RailStation :position="rail.position" :rotation="rail.rotation" :ghost="ghost" />
    </TresGroup>

    <TresGroup v-else-if="rail.type === 'crossing'" :key="`crossing-${rail.id}`">
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
      <RailCrossing :position="rail.position" :rotation="rail.rotation" :ghost="ghost" />
    </TresGroup>
  </TresGroup>
</template>

<script setup lang="ts">
import type { Rail } from "../../types/rail";
import { onMounted, ref, watch } from "vue";
import * as THREE from "three";
import RailStation from "./RailStation.vue";
import RailCrossing from "./RailCrossing.vue";
import {
  RAIL_STRAIGHT_FULL_LENGTH,
  CURVE_SEGMENT_ANGLE,
  RAIL_CURVE_INNER_RADIUS,
  RAIL_CURVE_OUTER_RADIUS,
  RAIL_HEIGHT,
  RAIL_THICKNESS,
  RAIL_SLOPE_RUN,
  RAIL_CURVE_RADIUS,
} from "../../constants/rail";

const props = defineProps<{
  rail: Rail;
  ghost?: boolean;
}>();

const emit = defineEmits<{
  click: [rail: Rail];
}>();

const onClick = () => {
  if (props.ghost) return;
  emit("click", props.rail);
};

const curveGeometry = ref<THREE.ExtrudeGeometry | null>(null);
const slopeGeometry = ref<THREE.BufferGeometry | null>(null);
const curveSlopeGeometry = ref<THREE.BufferGeometry | null>(null);

// より直線的なease-in-out関数（緩やかな曲線）
const easeInOutQuad = (t: number) => {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
};
// 線形寄りにするためのブレンド: 0 = 元の easeInOut, 1 = 完全線形
const SLOPE_EASE_LINEAR_BLEND = 0.65; // 調整パラメータ（必要なら外部設定化）
const blendedEase = (t: number) => {
  const e = easeInOutQuad(t);
  return e * (1 - SLOPE_EASE_LINEAR_BLEND) + t * SLOPE_EASE_LINEAR_BLEND;
};

const buildSlopeGeometry = () => {
  // 既存のジオメトリを破棄してから再生成
  if (slopeGeometry.value) {
    slopeGeometry.value.dispose();
    slopeGeometry.value = null;
  }
  if (props.rail.type !== "slope") return;

  const startY = props.rail.connections.start[1];
  const endY = props.rail.connections.end[1];
  const totalRise = endY - startY;

  // カスタムジオメトリを作成
  const segments = 32;
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  const width = RAIL_THICKNESS;
  const height = RAIL_HEIGHT;

  // 各セグメントの頂点を生成
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = -RAIL_SLOPE_RUN / 2 + RAIL_SLOPE_RUN * t;

    // ease-in-out カーブで高さを計算（より直線的）
    const easedT = easeInOutQuad(t);
    const y = startY + totalRise * easedT + RAIL_HEIGHT / 2;

    // レール断面の4つの頂点を追加
    vertices.push(
      x,
      y - height / 2,
      -width / 2, // 下左
      x,
      y - height / 2,
      width / 2, // 下右
      x,
      y + height / 2,
      width / 2, // 上右
      x,
      y + height / 2,
      -width / 2 // 上左
    );

    // 法線ベクトルを追加（簡易）
    for (let j = 0; j < 4; j++) {
      normals.push(0, 1, 0);
    }
  }

  // インデックスを生成（四角形を三角形2つで構成）
  for (let i = 0; i < segments; i++) {
    const base = i * 4;
    const nextBase = (i + 1) * 4;

    // 面を構成
    const faces = [
      [base, nextBase, nextBase + 1, base + 1], // 下面
      [base + 1, nextBase + 1, nextBase + 2, base + 2], // 右面
      [base + 2, nextBase + 2, nextBase + 3, base + 3], // 上面
      [base + 3, nextBase + 3, nextBase, base], // 左面
    ];

    faces.forEach((face) => {
      indices.push(face[0], face[1], face[2]);
      indices.push(face[0], face[2], face[3]);
    });
  }

  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeVertexNormals();

  slopeGeometry.value = geometry;
};

const buildCurveGeometry = () => {
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
    shape.moveTo(RAIL_CURVE_OUTER_RADIUS * Math.cos(a0), RAIL_CURVE_OUTER_RADIUS * Math.sin(a0));
    shape.absarc(0, 0, RAIL_CURVE_OUTER_RADIUS, a0, a1, false);
    shape.lineTo(RAIL_CURVE_INNER_RADIUS * Math.cos(a1), RAIL_CURVE_INNER_RADIUS * Math.sin(a1));
    shape.absarc(0, 0, RAIL_CURVE_INNER_RADIUS, a1, a0, true);
    shape.lineTo(RAIL_CURVE_OUTER_RADIUS * Math.cos(a0), RAIL_CURVE_OUTER_RADIUS * Math.sin(a0));
  } else {
    const a0r = -CURVE_SEGMENT_ANGLE;
    const a1r = 0;
    shape.moveTo(RAIL_CURVE_OUTER_RADIUS * Math.cos(a0r), RAIL_CURVE_OUTER_RADIUS * Math.sin(a0r));
    shape.absarc(0, 0, RAIL_CURVE_OUTER_RADIUS, a0r, a1r, false);
    shape.lineTo(RAIL_CURVE_INNER_RADIUS * Math.cos(a1r), RAIL_CURVE_INNER_RADIUS * Math.sin(a1r));
    shape.absarc(0, 0, RAIL_CURVE_INNER_RADIUS, a1r, a0r, true);
    shape.lineTo(RAIL_CURVE_OUTER_RADIUS * Math.cos(a0r), RAIL_CURVE_OUTER_RADIUS * Math.sin(a0r));
  }
  const extrudeSettings: THREE.ExtrudeGeometryOptions = { depth: RAIL_HEIGHT, bevelEnabled: false, curveSegments: 32 };
  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.translate(0, 0, -RAIL_HEIGHT);
  curveGeometry.value = geom;
};

const buildCurveSlopeGeometry = () => {
  if (curveSlopeGeometry.value) {
    curveSlopeGeometry.value.dispose();
    curveSlopeGeometry.value = null;
  }
  if (props.rail.type !== "curve-slope") return;

  const isRight = props.rail.direction === "right";
  const startY = props.rail.connections.start[1];
  const endY = props.rail.connections.end[1];
  const totalRise = endY - startY;

  // 線路の断面形状（長方形）を定義
  const railCrossSection = new THREE.Shape();
  const halfWidth = RAIL_THICKNESS / 2;
  const halfHeight = RAIL_HEIGHT / 2;

  railCrossSection.moveTo(-halfHeight, -halfWidth);
  railCrossSection.lineTo(halfHeight, -halfWidth);
  railCrossSection.lineTo(halfHeight, halfWidth);
  railCrossSection.lineTo(-halfHeight, halfWidth);
  railCrossSection.lineTo(-halfHeight, -halfWidth);

  // 螺旋パスを作成（カーブ + 高さ変化）
  const segments = 64; // 滑らかな螺旋のために多めのセグメント
  const spiralPoints: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;

    // 角度の計算（左右で方向が逆）
    let angle: number;
    angle = CURVE_SEGMENT_ANGLE * t;

    // 螺旋上の位置を計算
    const radius = RAIL_CURVE_RADIUS;
    const z = Math.cos(angle) * radius;
    const x = Math.sin(angle) * radius * (isRight ? -1 : 1); // 右カーブはX座標を反転

    // 高さをease-in-outで補間
    const easedT = blendedEase(t);
    const y = totalRise * easedT;

    spiralPoints.push(new THREE.Vector3(x, y, z));
  }

  // 手動でジオメトリを構築して断面の回転を制御
  const geom = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  // 線路断面の頂点（長方形の4つの角）
  const sectionPoints = [
    new THREE.Vector2(-RAIL_THICKNESS / 2, -RAIL_HEIGHT / 2),
    new THREE.Vector2(RAIL_THICKNESS / 2, -RAIL_HEIGHT / 2),
    new THREE.Vector2(RAIL_THICKNESS / 2, RAIL_HEIGHT / 2),
    new THREE.Vector2(-RAIL_THICKNESS / 2, RAIL_HEIGHT / 2),
  ];

  // 各セグメントポイントで断面を作成
  for (let i = 0; i <= segments; i++) {
    const point = spiralPoints[i];

    // 接線ベクトルを計算
    let tangent: THREE.Vector3;
    if (i === 0) {
      tangent = spiralPoints[1].clone().sub(point).normalize();
    } else if (i === segments) {
      tangent = point
        .clone()
        .sub(spiralPoints[i - 1])
        .normalize();
    } else {
      tangent = spiralPoints[i + 1]
        .clone()
        .sub(spiralPoints[i - 1])
        .normalize();
    }

    // 水平な法線ベクトル（Y軸固定）
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const actualUp = new THREE.Vector3().crossVectors(right, tangent).normalize();

    // 断面の各頂点を計算
    for (const sectionPoint of sectionPoints) {
      const vertex = point
        .clone()
        .add(right.clone().multiplyScalar(sectionPoint.x))
        .add(actualUp.clone().multiplyScalar(sectionPoint.y));

      vertices.push(vertex.x, vertex.y, vertex.z);
      normals.push(actualUp.x, actualUp.y, actualUp.z);
    }
  }

  // インデックスを生成（4角形の面を2つの三角形で構成）
  for (let i = 0; i < segments; i++) {
    const current = i * 4;
    const next = (i + 1) * 4;

    for (let j = 0; j < 4; j++) {
      const nextJ = (j + 1) % 4;

      // 第一三角形
      indices.push(current + j, next + j, current + nextJ);
      // 第二三角形
      indices.push(current + nextJ, next + j, next + nextJ);
    }
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  curveSlopeGeometry.value = geom;
};

onMounted(() => {
  buildCurveGeometry();
  buildSlopeGeometry();
  buildCurveSlopeGeometry();
});

watch(
  () => props.rail,
  () => {
    buildCurveGeometry();
    buildSlopeGeometry();
    buildCurveSlopeGeometry();
  },
  { deep: true }
);
</script>
