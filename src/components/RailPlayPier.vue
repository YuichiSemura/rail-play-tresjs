<template>
  <!-- 橋脚（プラレール風の黄色いフレーム） -->
  <TresGroup :position="position" :rotation="rotation" @click="onClick">
    <!-- パラメータから寸法計算（地面から高さ=height） -->
    <!-- 左右の脚 -->
    <TresMesh :position="[-(FRAME_WIDTH / 2 - LEG_THICK / 2), LEG_HEIGHT / 2, 0]">
      <TresBoxGeometry :args="[LEG_THICK, LEG_HEIGHT, FRAME_DEPTH]" />
      <TresMeshLambertMaterial :color="PIER_COLOR" :transparent="props.ghost" :opacity="props.ghost ? 0.5 : 1" />
    </TresMesh>
    <TresMesh :position="[FRAME_WIDTH / 2 - LEG_THICK / 2, LEG_HEIGHT / 2, 0]">
      <TresBoxGeometry :args="[LEG_THICK, LEG_HEIGHT, FRAME_DEPTH]" />
      <TresMeshLambertMaterial :color="PIER_COLOR" :transparent="props.ghost" :opacity="props.ghost ? 0.5 : 1" />
    </TresMesh>

    <!-- 上部ビーム（脚をつなぐ梁） -->
    <TresMesh :position="[0, LEG_HEIGHT + TOP_THICK / 2, 0]">
      <TresBoxGeometry :args="[FRAME_WIDTH, TOP_THICK, FRAME_DEPTH]" />
      <TresMeshLambertMaterial :color="PIER_COLOR" :transparent="props.ghost" :opacity="props.ghost ? 0.5 : 1" />
    </TresMesh>
  </TresGroup>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RAIL_HEIGHT, RAIL_SLOPE_PITCH, RAIL_SLOPE_RISE } from "../constants/rail";
const props = defineProps<{
  position: [number, number, number];
  /** 地面から上面（梁上端）までの高さ。既定は0.7 */
  height?: number;
  rotation?: [number, number, number];
  ghost?: boolean;
}>();

const emit = defineEmits<{ click: [] }>();

const onClick = () => {
  emit("click");
};

// 寸法（見た目調整用）：画像のイメージに近い比率
const PIER_COLOR = "#9E9E9E"; // グレー
const FRAME_WIDTH = 0.8; // 全幅
const FRAME_DEPTH = 0.2; // 奥行（半分に薄く）
const TOP_THICK = 0.08; // 上部ビーム厚み
const LEG_THICK = 0.12; // 脚の太さ（X方向）

// 高さ関連（総高さH: スタッド上面が到達する高さ）
// 既定はスロープ上端の裏面高に一致: rise - (RAIL_HEIGHT/2)*cos(pitch)
const H = computed(() => props.height ?? RAIL_SLOPE_RISE - (RAIL_HEIGHT / 2) * Math.cos(RAIL_SLOPE_PITCH));
const LEG_HEIGHT = computed(() => Math.max(0.1, H.value - TOP_THICK));

// 省略時の回転（props更新に追従）
const rotation = computed<[number, number, number]>(() => (props.rotation ?? [0, 0, 0]) as [number, number, number]);
</script>
