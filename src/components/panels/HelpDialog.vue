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
              <h4 class="mb-2">基本レール</h4>
              <ul class="mb-3">
                <li><strong>直線レール:</strong> まっすぐなレールを配置</li>
                <li><strong>カーブレール:</strong> 左右90°のカーブレールを配置</li>
                <li><strong>スロープ:</strong> 上り・下りの坂道レールを配置</li>
              </ul>
              <h4 class="mb-2">高度なレール</h4>
              <ul class="mb-3">
                <li><strong>曲線スロープ（上り）:</strong> カーブしながら上るレール</li>
                <li><strong>曲線スロープ（下り）:</strong> カーブしながら下るレール</li>
                <li><strong>駅ホーム:</strong> 駅の機能を持つ直線レール</li>
                <li><strong>踏切:</strong> 道路との交差点を表現するレール</li>
              </ul>
              <h4 class="mb-2">配置のルール</h4>
              <ul>
                <li>最初のレールのみクリック位置と向きで配置</li>
                <li>2本目以降は前のレールの終端に自動接続</li>
                <li>床下や制限高度を超える場所には配置不可</li>
                <li>周回が完成すると自動で運転モードに切り替わり</li>
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
              <h4 class="mb-2">景観アイテム</h4>
              <ul class="mb-3">
                <li><strong>建物:</strong> 街並みを作るためのビルを配置（ランダムな高さ・色）</li>
                <li><strong>木:</strong> 自然な風景を作るための樹木を配置</li>
              </ul>
              <h4 class="mb-2">橋脚（スマートスナップ機能）</h4>
              <ul class="mb-3">
                <li><strong>自動候補表示:</strong> 橋脚ツール選択時、配置可能な位置が半透明で表示</li>
                <li><strong>スマートスナップ:</strong> クリック位置に最も近い線路接続点に自動配置</li>
                <li><strong>正確な角度:</strong> 曲線スロープでも線路に垂直な正しい角度で配置</li>
                <li><strong>高さ自動調整:</strong> 線路の高さに応じて橋脚の高さを自動設定</li>
              </ul>
              <h4 class="mb-2">操作方法</h4>
              <ul>
                <li>クリックで配置、配置済みアイテムをクリックで削除</li>
                <li>回転ツールでアイテムの向きを90°ずつ調整可能</li>
              </ul>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- 電車・カメラ操作 -->
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon class="mr-2">mdi-train</v-icon>
              電車・カメラ操作
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <h4 class="mb-2">運転モード</h4>
              <ul class="mb-3">
                <li><strong>自動運転:</strong> 周回コース完成時に自動でモード切替、電車が走行開始</li>
                <li><strong>速度調整:</strong> スライダーで電車の速度を0.5倍〜2.0倍に調整</li>
                <li><strong>3両編成:</strong> 機関車＋客車2両の編成で走行</li>
                <li><strong>スロープ走行:</strong> 坂道では滑らかな高度変化で走行</li>
              </ul>
              <h4 class="mb-2">カメラモード</h4>
              <ul class="mb-3">
                <li><strong>自由視点（Orbit）:</strong> マウスで自由に視点を回転・移動</li>
                <li><strong>先頭カメラ（Front）:</strong> 電車の先頭に追従、ドラッグで視線微調整</li>
              </ul>
              <h4 class="mb-2">電車カスタマイズモード</h4>
              <ul>
                <li><strong>色変更:</strong> 車体・屋根・窓・車輪の色をそれぞれ調整</li>
                <li><strong>プリセット:</strong> デフォルト・赤・緑の定番カラーリング</li>
              </ul>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- プリセット -->
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon class="mr-2">mdi-palette</v-icon>
              プリセットレイアウト
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <ul>
                <li><strong>大きな円:</strong> 左カーブのみで構成されるシンプルな円形コース</li>
                <li><strong>楕円レイアウト:</strong> 直線＋左カーブで構成される楕円形コース</li>
                <li><strong>S字カーブ:</strong> 左右カーブを組み合わせた複雑な周回コース（景観付き）</li>
                <li><strong>スロープ付き楕円:</strong> 上り・下りスロープと駅・踏切を含む立体コース</li>
              </ul>
              <p class="text-medium-emphasis mt-2">
                ※ プリセット選択時は既存のレール・建物がすべて削除されます
              </p>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- データ管理 -->
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon class="mr-2">mdi-content-save</v-icon>
              データ管理
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <h4 class="mb-2">自動保存</h4>
              <ul class="mb-3">
                <li><strong>自動保存:</strong> レール・建物の変更を1.5秒後に自動保存</li>
                <li><strong>ページ読み込み時:</strong> 前回のデータを自動で復元</li>
              </ul>
              <h4 class="mb-2">手動保存（2スロット対応）</h4>
              <ul class="mb-3">
                <li><strong>保存1/保存2:</strong> 異なるレイアウトを2つまで手動保存</li>
                <li><strong>保存情報表示:</strong> 保存日時、タイトル、アイテム数を確認可能</li>
                <li><strong>上書き確認:</strong> 既存データがある場合は確認ダイアログで安全に保存</li>
              </ul>
              <h4 class="mb-2">データの安全性</h4>
              <ul>
                <li>すべてのデータはブラウザのローカルストレージに保存</li>
                <li>外部サーバーへの送信は一切なし、プライバシー安全</li>
                <li>ブラウザのデータ削除時のみデータが失われます</li>
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
