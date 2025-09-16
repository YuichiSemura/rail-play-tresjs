# 小規模ジオメトリ大量配置最適化 方針メモ

## 目的

「木 / ビル / 橋脚 / 小物」など形状バリエーションが少ないが数が増えがちなオブジェクトを、大量に並べてもフレームレートが落ちにくい構造にする。Draw Call・メモリ占有・再レンダリングの無駄を最小化する。

## 現状想定

- 各オブジェクトを個別 `Mesh` として追加している可能性が高い。
- Vue のリアクティブ配列が直接 Tres の `<TresMesh>` 群へバインド。
- 1 オブジェクトごとに: (geometry + material + transform) の管理コストが発生。
- レール本数は中規模、装飾オブジェクトは将来的に数百～千単位に増加し得る。

## 基本戦略レイヤ

1. 共有: 同じ形状/材質は再利用 (Geometry/Material の単一インスタンス化)
2. 集約: 多数オブジェクトを InstancedMesh へ集約し Draw Call を削減
3. 差分: 変更が発生した部分のみ行列更新 (フル再構築回避)
4. 節約: 不要になったリソースを確実に `dispose()`
5. 抑制: 遠距離・画面外は描画負荷を下げる (Frustum / LOD / Distance Culling)
6. 簡潔: Vue reactivity と three オブジェクト生成を分離 (shallowRef + 手動更新)

## 目標指標

| 項目 | 目標値 (初期) |
|------|--------------|
| Draw Calls (装飾 300 個) | 50 以下 |
| FPS (MacBook Air M2 想定) | 55~60fps 持続 |
| GC / メモリリーク | 長時間操作で `geometries` / `textures` 数が単調増加しない |

`renderer.info` の `render.calls` / `memory.geometries` を定期ログして達成確認。

## InstancedMesh 導入方針

### 適用対象

- 木、ビル(共通ベース形状 + 高さスケール差)、橋脚、汎用デコレーション。
- 「姿勢/色/スケールのみ違い、中身の形は同じ」ケース。

### 導入手順

1. ベースとなる `BufferGeometry` と `Material` を 1 度生成 (例: `provide` or モジュールスコープ)。
2. 個数上限を決めて `InstancedMesh(geometry, material, maxCount)` を生成。
3. Reactivity とは別に `instances: InstanceRecord[]` をローカルに保持。
4. 追加/削除時に空きスロット管理 (free list) を更新。
5. `setMatrixAt(index, matrix)` / `setColorAt(index, color)` で差分更新。
6. 更新後 `instanceMatrix.needsUpdate = true`。色も扱うなら `instanceColor.needsUpdate = true`。

### スロット管理サンプル

```ts
interface InstanceSlot { used: boolean; id: string; }
const slots: InstanceSlot[] = Array.from({ length: max }, () => ({ used: false, id: "" }));
function allocSlot(id: string) {
  const i = slots.findIndex(s => !s.used);
  if (i === -1) return -1; // 要リサイズ or 再構築
  slots[i].used = true; slots[i].id = id; return i;
}
function freeSlot(id: string) {
  const s = slots.find(s => s.id === id); if (!s) return;
  s.used = false; s.id = "";
}
```

### 差分適用の考え方

- 毎フレーム全再計算 → NG
- 追加/削除/移動イベント単位で行列生成
- Undo/Redo で大量変更発生時は 1 フレーム遅延バッチ (`requestAnimationFrame`) でまとめ反映

## Geometry キャッシュ

レールなどパラメータ付き形状（長さ/半径/角度/勾配）はキー化して Map キャッシュ:

```ts
const railGeomCache = new Map<string, BufferGeometry>();
function getRailGeometry(key: { type: string; length?: number; radius?: number; angle?: number; slope?: number }) {
  const k = JSON.stringify(key);
  if (railGeomCache.has(k)) return railGeomCache.get(k)!;
  const geom = buildRailGeometry(key); // 頂点生成
  railGeomCache.set(k, geom);
  return geom;
}
```

Dispose タイミング: 現在未使用参照カウントが 0 になったら `geometry.dispose()` → 初期はリーク防止優先で「プロセス中常駐」でも良い。

## Frustum / Distance / LOD

- 視点から一定距離 (例: 400+) の木は描画省略 or 簡易バージョン (スプライト)
- `onBeforeRender` でカメラ距離チェック → 遠距離は `visible=false`
- LOD 切替が頻繁過ぎるとコストになるのでヒステリシス閾値 (in:350/out:380) を導入

## Vue Reactivity の境界調整

課題: 配列が変わるたびに多数の `<TresMesh>` が再生成されると GC 負荷＋CPU コスト。

対策:

- 表示は 1 個の `<primitive :object="instancedRef" />` のみ。
- データは単純な配列 `decorations: DecorationData[]` を Pinia で管理。
- watch(decorations) で差分検出し instanced へ更新。
- 差分検出は `new Set` 比較で追加/削除 ID を抽出。

## 破棄 (dispose) 徹底

削除時に:

```ts
function disposeMesh(m: THREE.Mesh) {
  m.geometry.dispose();
  if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
  else m.material.dispose();
}
```

InstancedMesh は最後に全体破棄するだけ。頻繁な再生成は避ける。

## メモリ監視ユーティリティ (開発用)

```ts
function logRendererInfo(renderer: THREE.WebGLRenderer) {
  const i = renderer.info;
  console.log(`[perf] calls=${i.render.calls} tris=${i.render.triangles} geom=${i.memory.geometries} tex=${i.memory.textures}`);
}
// setInterval(()=>logRendererInfo(renderer), 3000);
```

## Undo/Redo との相性

- Instanced のスロット再配置が頻繁になる → 大量操作は遅延 1 フレームバッチ適用
- 削除→Undo の際、slot を再利用しても可。同じ index でなくても外観上問題なし（ID→index マップで追跡）

## 実装ステップ案

1. 木を対象に InstancedMesh 実験 (max 512)。
2. 差分更新ロジック (alloc/free + setMatrixAt)。
3. パフォーマンス計測ログ挿入。
4. Undo/Redo 導入後: 大量追加/削除をバッチ化するラッパ作成。
5. ビル/橋脚へ適用。高さは行列スケール Y で表現。
6. Frustum 距離フィルタ（visible 切替）導入。
7. LOD (スプライト化など) 任意検証。
8. キャッシュ Map 導入（レール geometry）。
9. メモリリーク観測し dispose タイミング調整。

## 計測のしきい値サンプル

| 状況 | 期待範囲 | アラート条件 |
|------|----------|---------------|
| calls | < 80 | > 120 継続 5s |
| geom  | 線路本数 + 装飾型数 + α | 異常な単調増加 |
| FPS (外部計測) | >= 55 | < 45 継続 2s |

## 実装例 (概念)

```ts
const instanced = new THREE.InstancedMesh(baseGeom, baseMat, MAX);
const idToIndex = new Map<string, number>();
const matricesDirty: number[] = [];

function addTree(data: TreeData) {
  const idx = allocSlot(data.id);
  if (idx < 0) return; // TODO: 拡張
  const m = new THREE.Matrix4();
  tempPos.set(...data.position);
  tempQuat.identity();
  tempScale.set(1, data.scaleY ?? 1, 1);
  m.compose(tempPos, tempQuat, tempScale);
  instanced.setMatrixAt(idx, m);
  if (instanced.instanceMatrix) instanced.instanceMatrix.needsUpdate = true;
  idToIndex.set(data.id, idx);
}

function updateTree(id: string, patch: Partial<TreeData>) {
  const idx = idToIndex.get(id); if (idx == null) return;
  // 既存 matrix を再構築 (保持していなければ再生成)
  // instanced.getMatrixAt(idx, m) (r160以降利用可能) して再計算
  instanced.instanceMatrix.needsUpdate = true;
}
```

## 早期最適化しないライン

- 線路自体を Instanced 化するのは将来判断（種類やパラメータ多岐で複雑化）。
- まずは装飾系のみ対象。効果が明確ならレール部分へ拡大を検討。

## まとめ

1. InstancedMesh + 差分反映で Draw Call を劇的に削減。
2. Vue のリアクティブ再レンダリング回数を抑制し three オブジェクトは手動制御。
3. キャッシュ / 破棄 / LOD / 距離フィルタを段階投入し測定ベースで判断。
4. Undo/Redo 導入後もバッチ反映ですり抜け性能低下を防止。
5. まず “木” をパイロットに検証し、成果を他オブジェクトへ水平展開する。

以上。次は木オブジェクト向け InstancedMesh の PoC から始める。
