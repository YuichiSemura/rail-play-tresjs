# Undo / Redo 機能 設計メモ

## 目的

ユーザーが線路やオブジェクトの追加・削除・移動・属性変更を安全に試行錯誤できるようにし、編集ストレスを下げる。  
「直前のミスを戻す」「複数手順を遡って状態を比較する」「やっぱり適用したいのでやり直す」を提供。

## 現状前提（推測）

- 状態は Vue のリアクティブ (配列: rails / trees / buildings / piers、タイトル等)。
- ID を持つ Rail 型あり。木/ビル/橋脚も座標配列で管理。
- Three.js オブジェクトは TresJS コンポーネント側でリアクティブ配列から生成。
- 自動保存があり、Undo/Redo は永続不要（セッション限定でよい想定）。

## Undo/Redo で扱う操作の粒度

1 コマンド = ユーザーの意味ある操作 1 単位。  
まとめる（バッチ化）例:

- ドラッグ移動（開始～離すまで）→ 1 コマンド
- 複数選択削除 → 1 コマンド
- プリセット生成（内部で複数レール追加）→ CompositeCommand

扱うイベント候補:

- レール追加 / 削除
- レール（またはオブジェクト）移動・回転・高さ変更
- タイトル変更
- オブジェクト追加（木 / ビル / 橋脚）
- オブジェクト削除
- プリセット展開
- すべてクリア
- 将来: 属性編集（色・高さ・長さパラメータなど）

## 機能要件（明示）

- Undo (Ctrl/Cmd+Z) / Redo (Shift+Ctrl/Cmd+Z)
- スタック最大長制限（例: 200 コマンド）。超過時は最古を破棄。
- 連続微調整のマージ（移動/回転/高さ等）。
- 失敗耐性: do()/undo() 中に例外時はスタック整合を保つ。
- UI 状態: Undo 可能ならボタン enable、不可なら disable。
- ループ完成状態(isRailsLocked)は Undo/Redo 後に再計算。

## 非要件

- 永続保存（次回起動で Undo 履歴を復元しない）
- 時間軸分岐（複雑な timeline）は不要（基本 past / future の2スタック）

## 設計方針

Command パターン + 2 スタック（past / future）。  
execute(command):

1) command.do()
2) past.push(command)
3) future = [] クリア

undo():

1) c = past.pop()
2) c.undo()
3) future.push(c)

redo():

1) c = future.pop()
2) c.do()
3) past.push(c)

## インターフェース

```typescript
interface Command {
  do(): void;
  undo(): void;
  // 連続操作圧縮用。true を返したら next は追加不要。
  merge?(next: Command): boolean;
  // デバッグ用識別 (ログ)
  label?: string;
}
```

## 代表的コマンド例

```typescript
class AddRailCommand implements Command {
  constructor(private store: StoreRef, private rail: Rail) {}
  do() { this.store.addRail(this.rail); }
  undo() { this.store.removeRail(this.rail.id); }
  label = "AddRail";
}

class RemoveRailsCommand implements Command {
  private removed: Rail[];
  constructor(private store: StoreRef, private targetIds: string[]) {
    this.removed = [];
  }
  do() {
    this.removed = this.targetIds.map(id => this.store.getRail(id)!).filter(Boolean);
    this.targetIds.forEach(id => this.store.removeRail(id));
  }
  undo() {
    this.removed.forEach(r => this.store.addRail(r));
  }
  label = "RemoveRails";
}

class MoveRailsCommand implements Command {
  // before / after の座標姿勢差分を保持
  constructor(
    private store: StoreRef,
    private changes: { id: string; prev: Transform; next: Transform }[]
  ) {}
  do() { this.changes.forEach(c => this.store.updateRailTransform(c.id, c.next)); }
  undo() { this.changes.forEach(c => this.store.updateRailTransform(c.id, c.prev)); }
  merge(next: Command) {
    if (!(next instanceof MoveRailsCommand)) return false;
    // 同一対象集合なら after を上書きし圧縮
    const idsA = this.changes.map(c => c.id).sort().join(",");
    const idsB = next.changes.map(c => c.id).sort().join(",");
    if (idsA !== idsB) return false;
    const map = new Map(next.changes.map(c => [c.id, c.next]));
    this.changes = this.changes.map(c => ({ ...c, next: map.get(c.id)! }));
    return true;
  }
  label = "MoveRails";
}

class SetTitleCommand implements Command {
  constructor(private store: StoreRef, private prev: string, private next: string) {}
  do() { this.store.setTitle(this.next); }
  undo() { this.store.setTitle(this.prev); }
  merge(next: Command) {
    if (!(next instanceof SetTitleCommand)) return false;
    // 連続タイトル編集を1件へ
    this.next = next.next;
    return true;
  }
  label = "SetTitle";
}

class CompositeCommand implements Command {
  constructor(private children: Command[], public label = "Composite") {}
  do() { this.children.forEach(c => c.do()); }
  undo() { [...this.children].reverse().forEach(c => c.undo()); }
}
```

## スタック管理ユーティリティ

```typescript
class UndoManager {
  past: Command[] = [];
  future: Command[] = [];
  max = 200;

  execute(cmd: Command) {
    // 直前コマンドに merge 試行
    const last = this.past[this.past.length - 1];
    if (last && last.merge && last.merge(cmd)) {
      this.future = [];
      return;
    }
    cmd.do();
    this.past.push(cmd);
    if (this.past.length > this.max) this.past.shift();
    this.future = [];
  }

  undo() {
    const c = this.past.pop();
    if (!c) return;
    c.undo();
    this.future.push(c);
  }

  redo() {
    const c = this.future.pop();
    if (!c) return;
    c.do();
    this.past.push(c);
  }

  clearAll() {
    this.past = [];
    this.future = [];
  }
}
```

## ループ判定との統合

- 各 do()/undo() 後に rail 配列が変動 → recomputeLoopState()
- 状態が unlocked→locked へ移行時: 現行ロジックでツールを木へ変更
- Undo で locked が解除されるケースにも対応

フック層:

```typescript
function afterMutation() {
  recomputeLoopState();
  // UI 再描画など
}
```

→ UndoManager 内でコマンド実行後に呼ぶラッパーを挟む。

## メモリ・性能配慮

- Rail インスタンスは再利用せず immutable 方針なら差分記録が簡単。
- Move 系は before/after の最小差分のみ保持。
- 大量追加 (プリセット) は CompositeCommand で一度に push。  
  Undo 1 回で全撤回でき、スタック汚染防止。

## キーボードショートカット

- Mac: ⌘ + Z / ⇧ + ⌘ + Z
- Windows: Ctrl + Z / Ctrl + Y (または Ctrl + Shift + Z)
→ OS 判定でラベル、実際は keydown イベントで両方許容。

## 例: プリセット展開

1. プリセット生成関数が rails[] を返す。
2. その配列を AddRailCommand の配列に変換。
3. CompositeCommand(children) を execute。

## すべてクリア

- rails / trees / buildings / piers の現状態をコピー。
- do(): 全クリア
- undo(): コピーを再挿入
- Redo: 再クリア

## 失敗時ロールバック

- do() 内で throw されたらスタックへ push しない。
- 可能なら do() は副作用を最小化し例外を出さない設計（事前バリデーション）。

## テスト計画

単体:

- Add / Remove / Move / Composite の do/undo がペアで元に戻るか
- Merge 動作 (連続 Move / Title)
- スタック最大長超過処理 (最古削除)
- Undo→Redo の ID 一貫性
統合:
- UI から操作（レール追加 → Undo → Redo）で Three.js 表示数が一致
- ループ完成後にレール追加 Undo で isRailsLocked=false になる

## 実装ステップ（推奨順）

1. UndoManager 骨格 + AddRailCommand / RemoveRailsCommand
2. UI ボタン / ショートカット接続
3. ループ判定再計算フック
4. MoveRailsCommand（ドラッグ確定時のみ発行）
5. CompositeCommand（プリセット / すべてクリア）
6. タイトル変更コマンド + merge
7. オブジェクト（木/ビル/橋脚）追加削除コマンド
8. テスト整備
9. ログ/デバッグ (過去スタックを console.table で確認)
10. 最終: エラーハンドリング + ガード

## 将来拡張余地

- 履歴ビュー (時系列ラベル一覧表示)
- コマンド圧縮 GC (古い Move を定期的に統合)
- タイムトラベルプレビュー (Undo せず指定位置へジャンプ)

## 実装に必要な最小タスク一覧

- /src/undo/Command.ts 作成
- /src/undo/UndoManager.ts 作成
- 既存 store の add/remove/update API 確認・分離
- プリセット生成箇所を CompositeCommand 化
- ドラッグ終了イベントで MoveRailsCommand 発行
- キーボードショートカット登録 (onMounted -> window.addEventListener)
- ループ再計算トリガ統一関数追加
- 基本テスト (Vitest) 追加

## 簡易 UI 追加イメージ

- BuildPanel 下部に
  - Undo (mdi-undo) disabled = past.length===0
  - Redo (mdi-redo) disabled = future.length===0
- ショートカット表示ツールチップ

## まとめ

- Command パターン + 2 スタックでシンプルに開始
- 粒度は「ユーザーが意識する単位」
- 大量操作は Composite でまとめノイズ削減
- Move / Title は merge で履歴圧縮
- ループ判定は常に後処理フックで再評価
- 永続不要なのでシリアライズは当面考慮外

以上。実装着手時は Command / UndoManager の雛形から進める。
