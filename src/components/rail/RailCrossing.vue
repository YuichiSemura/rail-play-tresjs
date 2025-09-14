<template>
  <TresGroup :position="position" :rotation="rotation" :render-order="ghost ? 1 : 0" :scale="[scale, scale, scale]">
    <!-- ローカル座標: X=線路方向, Z=道路方向（線路に直交） -->

    <!-- 左側設備一式 -->
    <TresGroup :position="[-poleOffsetX, 0, poleOffsetZ]">
      <!-- ポール（黄黒縞をリングで近似） -->
      <TresGroup>
        <TresMesh v-for="seg in poleSegments" :key="'L-pole-' + seg.i" :position="[0, seg.y, 0]">
          <TresCylinderGeometry :args="[poleRadius, poleRadius, seg.h, 12]" />
          <TresMeshLambertMaterial
            :color="seg.isBlack ? poleBlack : poleYellow"
            :transparent="ghost"
            :opacity="ghost ? 0.35 : 1"
          />
        </TresMesh>
      </TresGroup>

      <!-- 基礎（コンクリート台） -->
      <TresMesh :position="[0, baseH / 2, 0]">
        <TresCylinderGeometry :args="[baseR, baseR, baseH, 6]" />
        <TresMeshLambertMaterial
          :color="ghost ? '#bdbdbd' : '#cfcfcf'"
          :transparent="ghost"
          :opacity="ghost ? 0.35 : 1"
        />
      </TresMesh>

      <!-- 制御箱 -->
      <TresMesh :position="[0, controlBoxY, 0]">
        <TresBoxGeometry :args="[0.26, 0.22, 0.12]" />
        <TresMeshLambertMaterial
          :color="ghost ? '#666666' : '#555555'"
          :transparent="ghost"
          :opacity="ghost ? 0.35 : 1"
        />
      </TresMesh>

      <!-- 赤色灯＆ブラケット（道路中央向き = -Z 側） -->
      <TresGroup :position="[0, poleLightY, 0]" :rotation="[0, Math.PI, 0]">
        <!-- ブラケット -->
        <TresMesh :position="[0, 0, -bracketLen / 2]">
          <TresBoxGeometry :args="[0.06, 0.06, bracketLen]" />
          <TresMeshLambertMaterial
            :color="ghost ? poleBlack : poleBlack"
            :transparent="ghost"
            :opacity="ghost ? 0.35 : 1"
          />
        </TresMesh>
        <!-- ライト -->
        <TresMesh :position="[-lightSpan / 2, 0, -bracketLen]">
          <TresSphereGeometry :args="[lightRadius, 16, 16]" />
          <TresMeshLambertMaterial
            :color="ghost ? '#aa4444' : '#ff3333'"
            :transparent="ghost"
            :opacity="ghost ? 0.35 : 1"
          />
        </TresMesh>
        <TresMesh :position="[lightSpan / 2, 0, -bracketLen]">
          <TresSphereGeometry :args="[lightRadius, 16, 16]" />
          <TresMeshLambertMaterial
            :color="ghost ? '#aa4444' : '#ff3333'"
            :transparent="ghost"
            :opacity="ghost ? 0.35 : 1"
          />
        </TresMesh>
      </TresGroup>

      <!-- クロスバック（×印） -->
      <TresGroup :position="[0, crossbuckY, 0]">
        <!-- 右上がり板 -->
        <TresGroup :rotation="[0, 0, Math.PI / 4]">
          <TresMesh>
            <TresBoxGeometry :args="[boardLen, boardWid, boardThk]" />
            <TresMeshLambertMaterial
              :color="ghost ? '#ffe08a' : poleYellow"
              :transparent="ghost"
              :opacity="ghost ? 0.35 : 1"
            />
          </TresMesh>
          <TresMesh v-for="(x, i) in boardStripeOffsets" :key="'L-b1-' + i" :position="[x, 0, boardThk / 2 + 0.001]">
            <TresBoxGeometry :args="[boardStripeLen, boardWid * 0.9, boardThk * 1.02]" />
            <TresMeshLambertMaterial
              :color="ghost ? '#6b6b6b' : poleBlack"
              :transparent="ghost"
              :opacity="ghost ? 0.35 : 1"
            />
          </TresMesh>
        </TresGroup>
        <!-- 右下がり板 -->
        <TresGroup :rotation="[0, 0, -Math.PI / 4]">
          <TresMesh>
            <TresBoxGeometry :args="[boardLen, boardWid, boardThk]" />
            <TresMeshLambertMaterial
              :color="ghost ? '#ffe08a' : poleYellow"
              :transparent="ghost"
              :opacity="ghost ? 0.35 : 1"
            />
          </TresMesh>
          <TresMesh v-for="(x, i) in boardStripeOffsets" :key="'L-b2-' + i" :position="[x, 0, boardThk / 2 + 0.001]">
            <TresBoxGeometry :args="[boardStripeLen, boardWid * 0.9, boardThk * 1.02]" />
            <TresMeshLambertMaterial
              :color="ghost ? '#6b6b6b' : poleBlack"
              :transparent="ghost"
              :opacity="ghost ? 0.35 : 1"
            />
          </TresMesh>
        </TresGroup>
      </TresGroup>
    </TresGroup>

    <!-- 右側設備一式（Z正面向き = +Z 側） -->
    <TresGroup :position="[poleOffsetX, 0, -poleOffsetZ]">
      <!-- ポール（黄黒縞） -->
      <TresGroup>
        <TresMesh v-for="seg in poleSegments" :key="'R-pole-' + seg.i" :position="[0, seg.y, 0]">
          <TresCylinderGeometry :args="[poleRadius, poleRadius, seg.h, 12]" />
          <TresMeshLambertMaterial
            :color="seg.isBlack ? poleBlack : poleYellow"
            :transparent="ghost"
            :opacity="ghost ? 0.35 : 1"
          />
        </TresMesh>
      </TresGroup>

      <!-- 基礎 -->
      <TresMesh :position="[0, baseH / 2, 0]">
        <TresCylinderGeometry :args="[baseR, baseR, baseH, 6]" />
        <TresMeshLambertMaterial
          :color="ghost ? '#bdbdbd' : '#cfcfcf'"
          :transparent="ghost"
          :opacity="ghost ? 0.35 : 1"
        />
      </TresMesh>

      <!-- 制御箱（反対側） -->
      <TresMesh :position="[0, controlBoxY, 0]">
        <TresBoxGeometry :args="[0.26, 0.22, 0.12]" />
        <TresMeshLambertMaterial
          :color="ghost ? '#666666' : '#555555'"
          :transparent="ghost"
          :opacity="ghost ? 0.35 : 1"
        />
      </TresMesh>

      <!-- 赤色灯＆ブラケット（+Z 側） -->
      <TresGroup :position="[0, poleLightY, 0]" :rotation="[0, Math.PI, 0]">
        <TresMesh :position="[0, 0, bracketLen / 2]">
          <TresBoxGeometry :args="[0.06, 0.06, bracketLen]" />
          <TresMeshLambertMaterial
            :color="ghost ? poleBlack : poleBlack"
            :transparent="ghost"
            :opacity="ghost ? 0.35 : 1"
          />
        </TresMesh>
        <TresMesh :position="[-lightSpan / 2, 0, bracketLen]">
          <TresSphereGeometry :args="[lightRadius, 16, 16]" />
          <TresMeshLambertMaterial
            :color="ghost ? '#aa4444' : '#ff3333'"
            :transparent="ghost"
            :opacity="ghost ? 0.35 : 1"
          />
        </TresMesh>
        <TresMesh :position="[lightSpan / 2, 0, bracketLen]">
          <TresSphereGeometry :args="[lightRadius, 16, 16]" />
          <TresMeshLambertMaterial
            :color="ghost ? '#aa4444' : '#ff3333'"
            :transparent="ghost"
            :opacity="ghost ? 0.35 : 1"
          />
        </TresMesh>
      </TresGroup>

      <!-- クロスバック -->
      <TresGroup :position="[0, crossbuckY, 0]">
        <TresGroup :rotation="[0, 0, Math.PI / 4]">
          <TresMesh>
            <TresBoxGeometry :args="[boardLen, boardWid, boardThk]" />
            <TresMeshLambertMaterial
              :color="ghost ? '#ffe08a' : poleYellow"
              :transparent="ghost"
              :opacity="ghost ? 0.35 : 1"
            />
          </TresMesh>
          <TresMesh v-for="(x, i) in boardStripeOffsets" :key="'R-b1-' + i" :position="[x, 0, boardThk / 2 + 0.001]">
            <TresBoxGeometry :args="[boardStripeLen, boardWid * 0.9, boardThk * 1.02]" />
            <TresMeshLambertMaterial
              :color="ghost ? '#6b6b6b' : poleBlack"
              :transparent="ghost"
              :opacity="ghost ? 0.35 : 1"
            />
          </TresMesh>
        </TresGroup>
        <TresGroup :rotation="[0, 0, -Math.PI / 4]">
          <TresMesh>
            <TresBoxGeometry :args="[boardLen, boardWid, boardThk]" />
            <TresMeshLambertMaterial
              :color="ghost ? '#ffe08a' : poleYellow"
              :transparent="ghost"
              :opacity="ghost ? 0.35 : 1"
            />
          </TresMesh>
          <TresMesh v-for="(x, i) in boardStripeOffsets" :key="'R-b2-' + i" :position="[x, 0, boardThk / 2 + 0.001]">
            <TresBoxGeometry :args="[boardStripeLen, boardWid * 0.9, boardThk * 1.02]" />
            <TresMeshLambertMaterial
              :color="ghost ? '#6b6b6b' : poleBlack"
              :transparent="ghost"
              :opacity="ghost ? 0.35 : 1"
            />
          </TresMesh>
        </TresGroup>
      </TresGroup>
    </TresGroup>

    <!-- 遮断桿（左右）: 閉=水平, 開=やや上げ -->
    <TresGroup :position="[-poleOffsetX, barrierHeightLocal, poleOffsetZ]" :rotation="[armAngle, -Math.PI / 2, 0]">
      <!-- ベース（黄） -->
      <TresMesh :position="[0, 0, -gateLength / 2]">
        <TresBoxGeometry :args="[gateThickness, gateThickness, gateLength]" />
        <TresMeshLambertMaterial
          :color="ghost ? '#ffe08a' : '#ffd04a'"
          :transparent="ghost"
          :opacity="ghost ? 0.35 : 1"
        />
      </TresMesh>
      <!-- ウェイトボックス -->
      <TresMesh :position="[0, -0.1, -weightOffset]">
        <TresBoxGeometry :args="[gateThickness * 0.2, gateThickness * 0.9, gateThickness * 2.8]" />
        <TresMeshLambertMaterial
          :color="ghost ? '#ffe08a' : '#ffd04a'"
          :transparent="ghost"
          :opacity="ghost ? 0.35 : 1"
        />
      </TresMesh>
      <!-- 黒ストライプ -->
      <TresMesh v-for="(z, i) in leftStripeZs" :key="'L-stripe-' + i" :position="[0, 0, z]">
        <TresBoxGeometry :args="[gateThickness * 1.02, gateThickness * 1.02, gateStripeLen]" />
        <TresMeshLambertMaterial
          :color="ghost ? '#6b6b6b' : poleBlack"
          :transparent="ghost"
          :opacity="ghost ? 0.35 : 1"
        />
      </TresMesh>
    </TresGroup>

    <TresGroup :position="[poleOffsetX, barrierHeightLocal, -poleOffsetZ]" :rotation="[armAngle, -Math.PI / 2, 0]">
      <!-- ベース（黄） -->
      <TresMesh :position="[0, 0, gateLength / 2]">
        <TresBoxGeometry :args="[gateThickness, gateThickness, gateLength]" />
        <TresMeshLambertMaterial
          :color="ghost ? '#ffe08a' : '#ffd04a'"
          :transparent="ghost"
          :opacity="ghost ? 0.35 : 1"
        />
      </TresMesh>
      <!-- ウェイトボックス -->
      <TresMesh :position="[0, -0.1, weightOffset]">
        <TresBoxGeometry :args="[gateThickness * 0.2, gateThickness * 0.9, gateThickness * 2.8]" />
        <TresMeshLambertMaterial
          :color="ghost ? '#ffe08a' : '#ffd04a'"
          :transparent="ghost"
          :opacity="ghost ? 0.35 : 1"
        />
      </TresMesh>
      <!-- 黒ストライプ -->
      <TresMesh v-for="(z, i) in rightStripeZs" :key="'R-stripe-' + i" :position="[0, 0, z]">
        <TresBoxGeometry :args="[gateThickness * 1.02, gateThickness * 1.02, gateStripeLen]" />
        <TresMeshLambertMaterial
          :color="ghost ? '#6b6b6b' : poleBlack"
          :transparent="ghost"
          :opacity="ghost ? 0.35 : 1"
        />
      </TresMesh>
    </TresGroup>
  </TresGroup>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RAIL_STRAIGHT_HALF_LENGTH } from "../../constants/rail";

const props = withDefaults(
  defineProps<{
    position: [number, number, number];
    rotation?: [number, number, number];
    ghost?: boolean;
    roadWidth?: number;
    poleHeight?: number;
    poleRadius?: number;
    gateLength?: number;
    gateThickness?: number;
    isClosed?: boolean;
    /**
     * コンポーネント全体のスケール。1で等倍。
     * 既定で約2/3（以前の表示の2倍）。
     */
    scale?: number;
  }>(),
  {
    rotation: () => [0, 0, 0],
    ghost: false,
    roadWidth: 1,
    poleHeight: 1.6,
    poleRadius: 0.06,
    gateLength: 2.2,
    gateThickness: 0.1,
    isClosed: true,
    scale: 2 / 3,
  }
);

const ghost = props.ghost ?? false;

// 色
const poleYellow = "#ffd04a";
const poleBlack = "#333333";

// ポール左右のオフセット（道路幅/2 + 余白）
const poleOffsetX = computed(() => RAIL_STRAIGHT_HALF_LENGTH);
const poleOffsetZ = computed(() => props.roadWidth / 2 + 0.35);
const poleLightY = computed(() => props.poleHeight * 0.55);

// 遮断桿の角度（X回転）: 閉=0, 開=やや上げ
const armAngle = computed(() => (props.isClosed ? 0 : -Math.PI / 2 + 0.25));

// ライトとブラケット
const lightRadius = 0.08;
const lightSpan = 0.36; // ライト間隔（X方向）
const bracketLen = 0.04; // ポールからの張り出し

// 基礎・制御箱・クロスバック
const baseR = 0.16;
const baseH = 0.14;
const controlBoxY = 0.4;

const crossbuckY = computed(() => props.poleHeight * 0.82);
const boardLen = 0.85;
const boardWid = 0.14;
const boardThk = 0.02;
const boardStripeLen = 0.12;
const boardStripeOffsets = computed(() => {
  const n = 4; // 黒ストライプ本数
  const start = -boardLen / 2 + boardStripeLen / 2 + 0.02;
  const pitch = boardStripeLen * 2;
  return Array.from({ length: n }, (_, i) => start + i * pitch);
});

// ポール縞（リングで近似）
const poleSegments = computed(() => {
  const ringH = 0.18;
  const n = Math.ceil(props.poleHeight / ringH);
  const arr = [] as Array<{ i: number; y: number; h: number; isBlack: boolean }>;
  for (let i = 0; i < n; i++) {
    const h = i === n - 1 ? props.poleHeight - ringH * (n - 1) : ringH;
    const y = ringH * i + h / 2; // groundから
    arr.push({ i, y, h, isBlack: i % 2 === 1 });
  }
  return arr;
});

// 遮断桿のストライプ
const gateStripeLen = 0.3;
const stripeStart = 0.35; // 付け根付近は黄色を残す
const weightOffset = 1.05;
const leftStripeZs = computed(() => {
  const zs: number[] = [];
  const start = -stripeStart - gateStripeLen / 2;
  for (let z = start; Math.abs(z) <= props.gateLength - gateStripeLen / 2; z -= gateStripeLen * 2) {
    zs.push(z);
  }
  return zs;
});
const rightStripeZs = computed(() => {
  const zs: number[] = [];
  const start = stripeStart + gateStripeLen / 2;
  for (let z = start; z <= props.gateLength - gateStripeLen / 2; z += gateStripeLen * 2) {
    zs.push(z);
  }
  return zs;
});

const position = props.position;
const rotation = props.rotation ?? [0, 0, 0];
// 全体スケール
const scale = props.scale ?? 2 / 3;
// スケールしても遮断桿の世界高さを維持するためのローカルY位置
const barrierHeightLocal = (props.poleHeight / 2) * scale;
</script>

<style scoped></style>
