# 型安全なツール種別列挙とコンパイルエラー誘発テクニック

## 目的

ツール種別(直線/カーブ/スロープ/木/ビル/削除...) の追加・変更時に **漏れを即座に型エラーで検出** し、UI / ロジックコードの同期ズレによるバグ（未対応ツールが動かない、アイコン欠落など）を防止する。

## 解決したい主な課題

| 課題 | ありがちな状況 | 望ましい状態 |
|------|----------------|--------------|
| 文字列リテラルばら撒き | "straight" を各所で手入力 | 中央定義から補完取得 |
| 新ツール追加漏れ | switch の default に落ちて無音失敗 | コンパイル時に未列挙エラー |
| マッピングオブジェクトのキー漏れ | アイコン / ラベルの欠落 | Record<ToolKind, X> で強制 |
| 不要な any 化 | 柔軟性優先で型崩壊 | as const + satisfies で安全に拡張 |

## 基本方針

1. 値オブジェクトを `as const` で定義 → リテラル型化。
2. `typeof` + インデックスアクセスで Union を生成。
3. マッピング (icon, label, category) は `Record<Union, ...>` で漏れ検出。
4. `switch` 文は `never` 変数受け取りで網羅性チェック。
5. `satisfies` で「値は制約を満たすが型を広げない」記述を使う。

## 基本定義例

```ts
export const ToolKinds = {
  None: "none",
  Straight: "straight",
  Curve: "curve",
  Slope: "slope",
  CurveSlopeUp: "curve-slope-up",
  CurveSlopeDown: "curve-slope-down",
  Tree: "tree",
  Building: "building",
  Pier: "pier",
  Station: "station",
  Crossing: "crossing",
  Delete: "delete",
} as const;

export type ToolKind = typeof ToolKinds[keyof typeof ToolKinds];
```

補完は `ToolKinds.Straight` を参照すれば得られ、Union `ToolKind` は拡張時に自動更新される。

## カテゴリ分離 (論理グループ化)

```ts
export const RailToolArray = [
  ToolKinds.Straight,
  ToolKinds.Curve,
  ToolKinds.Slope,
  ToolKinds.CurveSlopeUp,
  ToolKinds.CurveSlopeDown,
  ToolKinds.Station,
  ToolKinds.Crossing,
] as const;
export type RailTool = typeof RailToolArray[number];

export const DecorationToolArray = [
  ToolKinds.Tree,
  ToolKinds.Building,
  ToolKinds.Pier,
] as const;
export type DecorationTool = typeof DecorationToolArray[number];
```

`RailToolArray.includes(tool)` すると `tool` が `ToolKind` であれば型は絞られないが、型ガードを提供するとより活用できる。

### 型ガード

```ts
export function isRailTool(t: ToolKind): t is RailTool {
  return (RailToolArray as readonly string[]).includes(t);
}
```

## マッピングの型安全 (Record)

```ts
export const ToolIcons: Record<ToolKind, string> = {
  [ToolKinds.None]: "mdi-cursor-default",
  [ToolKinds.Straight]: "mdi-minus",
  [ToolKinds.Curve]: "mdi-rotate-right",
  [ToolKinds.Slope]: "mdi-trending-up",
  [ToolKinds.CurveSlopeUp]: "mdi-chart-timeline-variant",
  [ToolKinds.CurveSlopeDown]: "mdi-chart-timeline-variant-reverse",
  [ToolKinds.Station]: "mdi-train",
  [ToolKinds.Crossing]: "mdi-boom-gate",
  [ToolKinds.Tree]: "mdi-pine-tree",
  [ToolKinds.Building]: "mdi-office-building",
  [ToolKinds.Pier]: "mdi-pillar",
  [ToolKinds.Delete]: "mdi-delete",
};
```

キーを 1 個でも忘れるとコンパイルエラー。型安全マッピングが追加漏れを防ぐ。

## ラベル: `satisfies` で過剰キー検出

```ts
export const ToolLabels = {
  [ToolKinds.None]: "なし",
  [ToolKinds.Straight]: "直線",
  [ToolKinds.Curve]: "カーブ",
  [ToolKinds.Slope]: "スロープ",
  [ToolKinds.CurveSlopeUp]: "曲線スロープ(上り)",
  [ToolKinds.CurveSlopeDown]: "曲線スロープ(下り)",
  [ToolKinds.Station]: "駅ホーム",
  [ToolKinds.Crossing]: "踏切",
  [ToolKinds.Tree]: "木",
  [ToolKinds.Building]: "ビル",
  [ToolKinds.Pier]: "橋脚",
  [ToolKinds.Delete]: "削除",
} satisfies Record<ToolKind, string>;
```

`Record` 単体と違い、余計なキーも検出できる（TypeScript 4.9+）。

## Exhaustive チェック (never)

```ts
export function toolActionDispatcher(kind: ToolKind) {
  switch (kind) {
    case ToolKinds.None: return; // 何もしない
    case ToolKinds.Straight: return /* 直線配置処理 */;
    case ToolKinds.Curve: return;
    case ToolKinds.Slope: return;
    case ToolKinds.CurveSlopeUp: return;
    case ToolKinds.CurveSlopeDown: return;
    case ToolKinds.Tree: return;
    case ToolKinds.Building: return;
    case ToolKinds.Pier: return;
    case ToolKinds.Station: return;
    case ToolKinds.Crossing: return;
    case ToolKinds.Delete: return;
  }
  const _exhaustive: never = kind; // ここに来たら新ツール未処理
  return _exhaustive;
}
```

新しいツールを `ToolKinds` に追加して switch に書き忘れると `never` チェックでエラー。

## Discriminated Union でパラメータ付ツールを拡張

将来、ツール毎に設定パラメータ（長さ/半径など）を持たせたい場合:

```ts
type ToolSpec =
  | { kind: typeof ToolKinds.Straight; length: number }
  | { kind: typeof ToolKinds.Curve; radius: number; angle: number }
  | { kind: typeof ToolKinds.Slope; length: number; height: number }
  | { kind: typeof ToolKinds.Tree }
  | { kind: typeof ToolKinds.Delete };

function applyTool(spec: ToolSpec) {
  switch (spec.kind) {
    case ToolKinds.Straight: /* spec.length */ return;
    case ToolKinds.Curve: /* spec.radius */ return;
    case ToolKinds.Slope: return;
    case ToolKinds.Tree: return;
    case ToolKinds.Delete: return;
    default: {
      const _n: never = spec; return _n;
    }
  }
}
```

`spec.kind` を discriminant にしてプロパティ補完が効く。

## `BuildPanel.vue` への適用ポイント

現状 `Props` の `selectedTool` が文字列 Union リテラルで重複記述されている。
改善手順:

1. `src/constants/tools.ts` を作成し上記 `ToolKinds` / `ToolKind` を定義。
2. `BuildPanel.vue` の Props を `selectedTool: ToolKind;` に差し替え。
3. テンプレートの `value="straight"` などは `value="straight"` のままで OK (リテラルが ToolKind に推論)。
4. 監視ロジック内 `railTools` 定数を `RailToolArray` 利用に変更。
5. アイコン対応表をマッピングから参照 (必要なら `ToolIcons[tool]`).

## 型ガードの高度利用 (カテゴリ別分岐)

```ts
export function handleByCategory(t: ToolKind) {
  if (isRailTool(t)) {
    // t は RailTool に絞られる
    placeRail(t);
  } else if (isDecorationTool(t)) {
    placeDecoration(t);
  } else {
    // それ以外 (削除 / none 等)
    handleSpecial(t);
  }
}
```

カテゴリ単位で関数を分けることで switch 列挙の重複を削減。

## 追加時の最小作業チェックリスト

1. `ToolKinds` に値追加
2. アイコン `ToolIcons` にキー追加 (コンパイルで要求される)
3. ラベル `ToolLabels` にキー追加 (satisfies で要求)
4. 適用カテゴリ配列へ追加 (必要なら) + 型ガード
5. `switch` / dispatcher にケース追加 (未追加なら `never` エラー)

=> いずれか忘れると必ず型エラーになる設計。

## ESLint/Biome への補完ルール (任意)

- 追加で `no-fallthrough` を有効化 → switch ミス防止。
- 命名規則: Enum 的だが既存 JS 流儀との折衷で `camelCase` 文字列値 + PascalCase キー。

## 導入ステップ提案

1. `constants/tools.ts` 追加
2. `BuildPanel.vue` の Union を `ToolKind` に置換
3. 既存 "railTools" 配列を `RailToolArray` に統一
4. ループロジックなど他ファイルで文字列使用箇所を段階移行
5. CI で `tsc --noEmit` を追加 (型漏れ検出を強化)

## 将来的拡張

- 国際化: `ToolLabels` を i18n 辞書キーへ差し替え
- アイコン/ラベル以外に: デフォルトパラメータ (`defaultParams`) マッピング追加
- ツール有効条件 (例: ループ完成後はレール系無効) を関数 `isToolEnabled(tool, state)` に集約

## まとめ

中央定義 + Record + exhaustive + discriminated union を組み合わせることで、ツール種類拡張の漏れをコンパイル時に 100% 可視化できる。これによりコードベースの一貫性と保守性が向上し、将来の機能追加速度を落とさず品質を担保できる。

以上。`tools.ts` の雛形実装に進める準備が整っている。
