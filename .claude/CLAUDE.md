# CLAUDE.md

このファイルは AI（Claude/Copilot など）にプロジェクトの意図と前提を伝えるための開発ノートです。

## プロジェクト概要

レールあそびアプリ — TresJS + Vue + Vuetify で作る 3D レール配置ゲーム。

## 現状の機能（抜粋）

- TresJS/Three.js による 3D シーン
- レール/電車/木/建物/桟橋などの配置（`src/components/*` 参照）
- Biome による Lint/Format、vue-tsc による型チェック

## 優先 TODO（開発メモ）

- パーツの増加（橋脚）
- 景観の増加（踏切・駅）
- 電車カスタマイズモード

## コーディング規約

- 言語: TypeScript + Vue 3（SFC）
- Lint/Format: Biome（`npm run lint`, `npm run format`）
- 型チェック: `vue-tsc`（`npm run build` 内で実行）
- UI: Vuetify 3（必要に応じて拡張）

## 類似プロジェクト

`../lunchNoCohoGaRoulette/` は TresJS + Vue + Vuetify を組み合わせたアプリ。

## 開発/実行

- 開発サーバ: `npm run dev`
- ビルド: `npm run build`
- プレビュー: `npm run preview`

## PR/ブランチ運用

1. `feat/<短い要約>` または `fix/<短い要約>` のブランチを作成
2. 小さくまとめてコミット（日本語OK）
3. PR 作成時に変更点と動作確認内容を簡潔に記載

## ライセンス

MIT
