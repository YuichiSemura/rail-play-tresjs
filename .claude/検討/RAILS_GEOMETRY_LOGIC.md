# レール幾何計算ロジック詳細解説

このファイルは `useRailsGeometry.ts` の座標計算ロジックを詳細に解説します。

## 前提知識

### 座標系

- **X軸**: 東西方向（右が正）
- **Y軸**: 高さ方向（上が正）
- **Z軸**: 南北方向（手前が正、奥が負）
- **原点**: (0, 0, 0) がシーンの中心

### 角度表現

- **theta (θ)**: Y軸周りの回転角度（ラジアン）
- **0**: Z軸負方向（北）を向く
- **π/2**: X軸正方向（東）を向く
- **π**: Z軸正方向（南）を向く
- **3π/2**: X軸負方向（西）を向く

### Three.jsとの対応

- **rotation[1]**: Three.jsのY軸回転 = `-theta`（符号が逆）
- 理由: Three.js は左手座標系、数学的計算は右手座標系

## 基本データ構造

### Pose（姿勢）

```typescript
interface Pose {
  point: Vec3;  // [x, y, z] 位置
  theta: number; // Y軸周りの回転角度（ラジアン）
}
```

### Rail（レール）

```typescript
interface Rail {
  position: Vec3;     // 3Dオブジェクトの配置座標（中心点）
  rotation: Euler;    // [rx, ry, rz] Three.js回転
  connections: {      // 論理的な接続点
    start: Vec3;      // 開始点
    end: Vec3;        // 終了点
  };
}
```

## 直線レールの計算

### makeStraight関数

```typescript
const makeStraight = (pose: Pose, length = RAIL_STRAIGHT_FULL_LENGTH): Rail => {
  const start = pose.point;
  // 終点計算: 開始点から theta 方向に length 分進む
  const dirx = Math.cos(pose.theta);      // X方向成分
  const dirz = Math.sin(pose.theta);      // Z方向成分
  const end: Vec3 = [
    start[0] + dirx * length,
    start[1],
    start[2] - dirz * length  // 注意: -dirz（座標系の違い）
  ];

  // 中点計算（3Dオブジェクト配置用）
  const mid: Vec3 = [
    (start[0] + end[0]) / 2,
    start[1],
    (start[2] + end[2]) / 2
  ];

  return {
    position: mid,
    rotation: [0, pose.theta, 0],  // Three.jsのY回転 = theta
    connections: { start, end }
  };
};
```

### 重要ポイント

1. **Z座標に-dirz**: Three.js座標系に合わせるため
2. **position vs connections**: positionは表示用、connectionsは論理用
3. **中点計算**: 3Dオブジェクトは中心に配置される

## スロープレールの計算

### makeSlope関数

```typescript
const makeSlope = (pose: Pose, ascending = true): Rail => {
  const start = pose.point;
  const dirx = Math.cos(pose.theta);
  const dirz = Math.sin(pose.theta);
  const rise = ascending ? RAIL_SLOPE_RISE : -RAIL_SLOPE_RISE;

  const end: Vec3 = [
    start[0] + dirx * RAIL_SLOPE_RUN,
    start[1] + rise,              // Y座標のみ変化
    start[2] - dirz * RAIL_SLOPE_RUN
  ];

  // 中点のY座標も傾斜を考慮
  const mid: Vec3 = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,      // 高度の平均
    (start[2] + end[2]) / 2
  ];

  return { position: mid, rotation: [0, pose.theta, 0], connections: { start, end } };
};
```

### スロープの物理的意味

- **RAIL_SLOPE_RUN**: 水平距離（例: 4.0）
- **RAIL_SLOPE_RISE**: 垂直距離（例: 1.0）
- **勾配**: rise/run = 1/4 = 25%

## カーブレールの計算（複雑）

### 左カーブの幾何学

```typescript
const makeLeftCurve = (pose: Pose): Rail => {
  const r = RAIL_CURVE_RADIUS; // 半径（例: 2.0）

  // 円の中心を計算: 現在位置から左側（垂直方向）に半径分
  const cx = pose.point[0] - Math.sin(pose.theta) * r;
  const cz = pose.point[2] - Math.cos(pose.theta) * r;
  const position: Vec3 = [cx, pose.point[1], cz];

  // 終点計算: 中心から CURVE_ANGLE（π/2）回転した位置
  const end: Vec3 = [
    position[0] + Math.sin(pose.theta + CURVE_ANGLE) * r,
    position[1],
    position[2] + Math.cos(pose.theta + CURVE_ANGLE) * r
  ];

  return {
    position,
    rotation: [0, pose.theta, 0],
    connections: { start: pose.point, end },
    direction: "left"
  };
};
```

### カーブの幾何学的理解

1. **円の中心計算**
   - 現在位置から「左側」に半径分移動
   - 左側 = theta + π/2 方向 = (-sin(theta), -cos(theta))

2. **終点計算**
   - 中心から theta + CURVE_ANGLE 方向に半径分
   - CURVE_ANGLE = π/2（90度カーブ）

3. **右カーブとの違い**
   - 左: 反時計回り (+CURVE_ANGLE)
   - 右: 時計回り (-CURVE_ANGLE)

## 曲線スロープの計算

### makeLeftCurveSlope関数

```typescript
const makeLeftCurveSlope = (pose: Pose, ascending = true): Rail => {
  const r = RAIL_CURVE_RADIUS;
  // 中心計算は左カーブと同じ
  const cx = pose.point[0] - Math.sin(pose.theta) * r;
  const cz = pose.point[2] - Math.cos(pose.theta) * r;
  const position: Vec3 = [cx, pose.point[1], cz];

  // 高度変化を追加
  const rise = ascending ? RAIL_CURVE_SLOPE_RISE : -RAIL_CURVE_SLOPE_RISE;
  const end: Vec3 = [
    position[0] + Math.sin(pose.theta + CURVE_ANGLE) * r,
    pose.point[1] + rise,  // 開始点から直接計算
    position[2] + Math.cos(pose.theta + CURVE_ANGLE) * r
  ];

  return {
    position,
    rotation: [0, pose.theta, 0],
    connections: { start: pose.point, end },
    direction: "left"
  };
};
```

### 重要な設計判断

- **高度変化**: カーブ中心ではなく、開始点基準で計算
- **理由**: 電車の走行時に自然な傾斜感を得るため

## レール接続の論理

### poseFromRailEnd関数

```typescript
const poseFromRailEnd = (rail: Rail): Pose => {
  const end = rail.connections.end;

  if (rail.type === "straight" || rail.type === "slope" || rail.type === "station") {
    // 直線系: 回転角度はそのまま
    return { point: end, theta: rail.rotation[1] };
  }

  // カーブ系: 終端での接線方向を計算
  const base = rail.rotation[1];
  const theta = rail.direction === "right"
    ? base - CURVE_ANGLE   // 右カーブ: -90度
    : base + CURVE_ANGLE;  // 左カーブ: +90度

  return { point: end, theta };
};
```

### レール連続配置の仕組み

1. 最初のレール: ユーザーのクリック位置・方向で配置
2. 2本目以降: 前のレールの `poseFromRailEnd` を開始点として使用
3. これにより自動的に連続したレールが配置される

## 橋脚配置のスマートスナップ

### 角度計算の複雑性

```typescript
const getRailRotationAtConnection = (rail: Rail, connectionType: "start" | "end"): number => {
  let railDirection: number;

  if (rail.type === "curve" || rail.type === "curve-slope") {
    const baseRotation = rail.rotation[1];
    if (connectionType === "start") {
      railDirection = baseRotation;
    } else {
      // 終点: カーブの終端接線方向
      const curveAngle = rail.direction === "right" ? -CURVE_ANGLE : CURVE_ANGLE;
      railDirection = baseRotation + curveAngle;
    }
  } else {
    railDirection = rail.rotation[1];
  }

  // 橋脚は線路に垂直 + π/2の倍数にスナップ
  let pierRotation = railDirection + Math.PI / 2;
  pierRotation = ((pierRotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
  const snapStep = Math.PI / 2;
  return Math.round(pierRotation / snapStep) * snapStep;
};
```

### スナップ機能の意義

- **問題**: 曲線レールでは橋脚の配置位置・角度が複雑
- **解決**: 線路接続点を自動検出し、適切な位置・角度で配置
- **結果**: ユーザーは大まかにクリックするだけで正確な橋脚配置

## 配置可能性の判定

### canPlaceRail関数

```typescript
const canPlaceRail = (rail: Rail): boolean => {
  // エリア内チェック
  const startInArea = isWithinArea(rail.connections.start);
  const endInArea = isWithinArea(rail.connections.end);
  const positionInArea = isWithinArea(rail.position);

  // 高度制限チェック
  const startHeightOk = rail.connections.start[1] <= MAX_RAIL_HEIGHT;
  const endHeightOk = rail.connections.end[1] <= MAX_RAIL_HEIGHT;
  const positionHeightOk = rail.position[1] <= MAX_RAIL_HEIGHT;

  // 床下チェック（重要: 曲線下りスロープ対策）
  const EPSILON = 1e-10;
  const startAboveGround = rail.connections.start[1] >= -EPSILON;
  const endAboveGround = rail.connections.end[1] >= -EPSILON;
  const positionAboveGround = rail.position[1] >= -EPSILON;

  return startInArea && endInArea && positionInArea &&
         startHeightOk && endHeightOk && positionHeightOk &&
         startAboveGround && endAboveGround && positionAboveGround;
};
```

### 三重チェックの理由

1. **connections**: 論理的な線路の始点・終点
2. **position**: 3Dオブジェクトの配置座標
3. **EPSILON**: 浮動小数点誤差への対応

## パフォーマンス考慮

### 橋脚候補生成の最適化

- **問題**: マウス移動の度に重い計算が実行されていた
- **解決**: `updatePierCandidates()` を分離し、必要時のみ実行
- **タイミング**: レール変更時、ツール選択時、モード変更時のみ

### 重複除去

```typescript
const SNAP_THRESHOLD = 0.1;
const existing = candidates.find(c =>
  Math.hypot(c.position[0] - newCandidate.position[0],
             c.position[2] - newCandidate.position[2]) < SNAP_THRESHOLD
);
```

## まとめ

このレール幾何計算システムの特徴:

1. **数学的精密性**: 三角関数を用いた正確な座標計算
2. **座標系統一**: Three.jsと数学計算の橋渡し
3. **ユーザビリティ**: 複雑な計算をスマートスナップで隠蔽
4. **安全性**: 多重チェックによる不正配置の防止
5. **パフォーマンス**: 必要時のみ計算実行

これらの設計により、ユーザーは直感的にレールを配置でき、内部では正確な3D幾何計算が行われています。
