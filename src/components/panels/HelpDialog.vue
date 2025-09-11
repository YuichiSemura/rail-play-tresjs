<template>
  <v-dialog v-model="model" max-width="800px">
    <v-card>
      <v-card-title class="text-h5">
        <v-icon class="mr-2">mdi-help-circle</v-icon>
        遊び方ガイド
      </v-card-title>
      <v-card-text>
        <v-expansion-panels variant="accordion">
          <!-- 基本操作 -->
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon class="mr-2">mdi-mouse</v-icon>
              基本操作
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <ul>
                <li><strong>視点移動:</strong> マウスドラッグで画面を回転できます</li>
                <li><strong>ズーム:</strong> マウスホイールで拡大・縮小できます</li>
                <li><strong>パン:</strong> 右クリック＋ドラッグで画面を平行移動できます</li>
              </ul>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- レール配置 -->
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon class="mr-2">mdi-train-variant</v-icon>
              レール配置
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <ul>
                <li><strong>直線レール:</strong> クリックして配置。もう一度クリックで削除</li>
                <li><strong>カーブレール:</strong> 左右のカーブが選択できます</li>
                <li><strong>坂レール:</strong> 高低差のあるレールを作成できます</li>
                <li><strong>接続:</strong> レール同士は自動的に接続されます</li>
              </ul>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- キーボードショートカット -->
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon class="mr-2">mdi-keyboard</v-icon>
              キーボードショートカット
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <ul>
                <li><strong>R:</strong> 配置方向を45°（時計回り）回転</li>
                <li><strong>Shift + R:</strong> 配置方向を90°（反時計回り）回転</li>
                <li><strong>E:</strong> 配置方向を45°（反時計回り）回転</li>
                <li><strong>Shift + E:</strong> 配置方向を90°（時計回り）回転</li>
                <li><strong>Q:</strong> 配置方向をリセット（初期向きに戻す）</li>
                <li><strong>ESC:</strong> 配置ツールを「なし」にしてカメラ操作に集中</li>
                <li class="text-medium-emphasis">※ ビルドモード中のみ有効です</li>
              </ul>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- 建物・装飾 -->
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon class="mr-2">mdi-home-city</v-icon>
              建物・装飾
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <ul>
                <li><strong>建物:</strong> 街並みを作るためのビルを配置できます</li>
                <li><strong>木:</strong> 自然な風景を作るための樹木を配置できます</li>
                <li><strong>橋脚:</strong> 高架レールをサポートする支柱を配置できます</li>
                <li><strong>配置・削除:</strong> クリックで配置、もう一度クリックで削除</li>
              </ul>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- 電車の操作 -->
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon class="mr-2">mdi-train</v-icon>
              電車の操作
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <ul>
                <li><strong>自動運転:</strong> 配置されたレール上を電車が自動で走行します</li>
                <li><strong>カスタマイズ:</strong> ホーム画面から電車の色を変更できます</li>
                <li><strong>連結:</strong> 3両編成の電車が表示されます</li>
              </ul>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- プリセット -->
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon class="mr-2">mdi-palette</v-icon>
              プリセット
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <ul>
                <li><strong>基本レイアウト:</strong> 楕円形の基本的なレール配置</li>
                <li><strong>複雑レイアウト:</strong> カーブと直線を組み合わせた複雑な配置</li>
                <li><strong>坂道レイアウト:</strong> 高低差のある立体的な配置</li>
              </ul>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- データ管理 -->
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon class="mr-2">mdi-content-save</v-icon>
              データ管理
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <ul>
                <li><strong>保存:</strong> 現在のレイアウトをブラウザに保存できます</li>
                <li><strong>復元:</strong> 保存したレイアウトを読み込むことができます</li>
                <li><strong>自動保存:</strong> データはローカルストレージに自動的に保存されます</li>
              </ul>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="model = false"> 閉じる </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const model = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit("update:modelValue", v),
});
</script>
