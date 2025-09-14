# rail-play-tresjs

レールあそびアプリ — TresJS + Vue + Vuetify で作る 3D レール配置ゲーム。

## 特徴

### レール建設

- 3D シーン上にレール・電車・木・建物・橋脚を自由に配置
- レール部品: 直線／カーブ／スロープ／**曲線スロープ（上り・下り）**／駅ホーム／踏切
- **エリア制限**：床下配置防止、高さ制限による安全な建設
- **橋脚スマートスナップ**：線路接続点への自動配置、候補点の可視化

### ゲーム体験

- モード切替: 配置モード・運転モード・**電車カスタマイズモード**
- ループ完成の自動検出とレールロック（周回ができたら運転モードへ自動切替）
- ゴーストプレビュー（設置前に位置・向きをプレビュー、45°単位で回転）
- カメラ切替: 自由視点（Orbit）/ 先頭カメラ（Front）

### データ管理・UI

- 自動保存 + 手動保存スロット（保存1/保存2）・復元に対応（localStorage）
- プリセット配置（大きな円／オーバル／S字／スロープ周回）
- **パフォーマンス最適化**：不要な再計算を防止し、滑らかな操作感を実現

### 技術基盤

- Vue 3 + TypeScript + Vite による高速開発、Vuetify UI、TresJS/Three.js による軽量 3D 表現
- Biome による Lint/Format、厳密な型チェック

## 技術スタック

- Vue 3 / TypeScript / Vite 5
- TresJS (@tresjs/core, @tresjs/cientos), Three.js
- Vuetify 3
- Pinia（ゲームデータの保存など）
- Biome

## 動作要件

- Node.js 18 以上を推奨（Vite 5 系の要件に準拠）

## セットアップ

1. 依存関係をインストール
    - `npm install`
2. 開発サーバを起動
    - `npm run dev`
3. 型チェック + ビルド
    - `npm run build`
4. ローカルプレビュー
    - `npm run preview`
5. Lint / Format
    - `npm run lint`
    - `npm run format`

## 遊び方（かんたんガイド）

- ホーム画面で「ゲームを始める」を押すと配置モードで開始します。
- 左のサイドバー（配置モード）からツールを選び、床をクリックして配置します。
  - レールツール: 直線／カーブ／スロープ／**曲線スロープ（上り・下り）**／駅ホーム／踏切
  - 景観ツール: 木／ビル／**橋脚（スマートスナップ対応）**
  - 編集ツール: 回転／削除
  - レールは最初の1本のみ向きを指定、2本目以降は末端へ継ぎ足し配置されます。
- **橋脚配置**：橋脚ツール選択時に候補点が半透明表示され、クリックで最適位置にスナップします。
- 周回コースが完成すると自動で運転モードに切り替わり、レールはロックされます。
- 運転モードでは「走らせる」「速度調整」「カメラ切替（自由視点/先頭カメラ）」ができます。
- **電車カスタマイズモード**では電車の色（車体・屋根・窓・車輪）を変更し、プリセットも適用できます。

### キーボード操作（配置モード）

- R: 設置向きを +45° 回転（Shift+R で -90°）
- E: 設置向きを -45° 回転（Shift+E で +90°）
- Q: 設置向きをリセット（0°）
- Esc: ツールを「なし」に戻す

### カメラと視点

- 自由視点（Orbit）: マウスでぐりぐり回せます。
- 先頭カメラ（Front）: 走行中の先頭に追従。ドラッグで視線移動が可能です。

### 保存・復元（ローカル）

- 自動保存: 配置や設定の変更を一定間隔で自動保存します。
- 手動保存: 保存1/保存2の2つのスロットに保存・復元できます。
- クリア: 配置物をすべて削除できます（確認ダイアログあり）。
  - 保存データはブラウザの localStorage に保存され、外部送信はありません。

## スクリプト一覧

- dev: Vite 開発サーバ
- build: vue-tsc による型チェック + Vite ビルド
- preview: ビルド成果物のプレビュー
- lint: Biome で `src/` を Lint
- format: Biome で全体を整形

## ディレクトリ構成（抜粋）

```text
biome.json
index.html
package.json
src/
   App.vue
   main.ts
   components/
      RailPlayGame.vue         # UI全体/モード管理/保存・復元
      scene/RailPlayScene.vue  # TresCanvas + シーン/入力イベント
      panels/BuildPanel.vue    # 配置ツール/プリセット/保存UI
      panels/RunPanel.vue      # 走行/速度/カメラ切替
      panels/CustomizePanel.vue# 電車カラー編集
      panels/HelpDialog.vue    # 遊び方説明
      rail/RailSegment.vue     # レール1本（直線/カーブ/スロープ/駅/踏切 統合）
      rail/RailStation.vue     # 駅ホーム
      rail/RailCrossing.vue    # 踏切
      train/Train.vue          # 電車モデル
      scenery/SceneryTree.vue
      scenery/SceneryBuilding.vue
      scenery/SceneryPier.vue
   composables/
      useRailsGeometry.ts      # レール幾何計算・配置可能性判定・スマートスナップ
      useGhostPreview.ts       # ゴーストプレビュー・橋脚候補表示
      useTrainRunner.ts        # 電車物理運動・スロープ補間
      useCameraController.ts   # カメラ制御（軌道・先頭視点）
   stores/
      storage.ts               # 自動/手動保存ロジック（Pinia）
   constants/
      rail.ts / train.ts
public/
   train-blue.svg            # 本プロジェクトの青い電車アイコン（favicon）
```

## アイコン

- ファビコンとして `public/train-blue.svg` を使用しています（`index.html` で参照）。
- 本 SVG は本リポジトリで作成したオリジナル素材です。

## ライセンス

MIT
