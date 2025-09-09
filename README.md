# rail-play-tresjs

レールあそびアプリ — TresJS + Vue + Vuetify で作る 3D レール配置ゲーム。

## 特徴

- 3D シーン上にレール・電車・木・建物・桟橋などを配置
- Vue 3 + TypeScript + Vite で高速開発
- TresJS/Three.js による軽量 3D 表現（Cientos の便利コンポーネントも活用）
- Vuetify ベースのUI（今後拡張）
- Biome による Lint/Format

## 技術スタック

- Vue 3 / TypeScript / Vite 5
- TresJS (@tresjs/core, @tresjs/cientos), Three.js
- Vuetify 3
- Biome

## 動作要件

- Node.js 18 以上を推奨（Vite 5 系の要件に準拠）

## セットアップ

1. 依存関係をインストール
   - npm を使用する場合
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
    RailPlayBuilding.vue
    RailPlayGame.vue
    RailPlayPier.vue
    RailPlayRail.vue
    RailPlayTrain.vue
    RailPlayTree.vue
  constants/
    rail.ts
    train.ts
public/
  train-blue.svg (本プロジェクトの青い電車アイコン)
```

## アイコン

- ファビコンとして `public/train-blue.svg` を使用しています（index.html で参照）。
- 本 SVG は本リポジトリで作成したオリジナル素材です。

## ライセンス

MIT
