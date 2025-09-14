# 電車運行ロジック詳細解説

このファイルは `useTrainRunner.ts` の電車運行計算ロジックを詳細に解説します。

## 前提知識

### 電車の物理モデル
- **3両編成**: 機関車 + 客車2両
- **車両間隔**: `CAR_LENGTH`（例: 1.2）で固定
- **連続運動**: 先頭車の位置から後続車を計算

### 時間とスピード
- **requestAnimationFrame**: ブラウザの60FPS描画サイクルに同期
- **deltaTime**: 前フレームからの経過時間（ミリ秒）
- **speed**: ユーザー設定の速度倍率（0.5〜2.0）

### レール上の位置表現
- **railIndex**: 現在走行中のレール番号
- **segmentPosition**: そのレール内での進行度（0.0〜1.0）
- **totalDistance**: 全レール通算での走行距離

## 基本データ構造

### TrainState（電車の状態）
```typescript
interface TrainState {
  railIndex: number;          // 現在のレール番号
  segmentPosition: number;    // レール内位置（0.0〜1.0）
  totalDistance: number;      // 通算走行距離
  isRunning: boolean;         // 運行中フラグ
}
```

### CarTransform（車両の3D座標）
```typescript
interface CarTransform {
  position: [number, number, number];  // 3D位置
  rotation: [number, number, number];  // 3D回転
}
```

## 電車運行の基本サイクル

### メインループ（updateTrainPosition）

```typescript
const updateTrainPosition = (deltaTime: number) => {
  if (!trainRunning.value || !canRunTrain.value) return;

  // 1. 速度計算: 基本速度 × ユーザー設定速度 × deltaTime
  const distance = BASE_SPEED * trainSpeed.value * (deltaTime / 1000);

  // 2. 位置更新
  trainState.totalDistance += distance;

  // 3. 現在レール上の位置を計算
  updateCurrentRailPosition();

  // 4. 各車両の3D座標を計算
  updateCarTransforms();

  // 5. カメラ追従用のコールバック実行
  if (onTrainPose) {
    const headPose = getTrainPose(trainState.totalDistance);
    onTrainPose(headPose.position, headPose.rotation);
  }
};
```

### 設計の核心
1. **時間ベース**: フレームレート非依存の滑らかな移動
2. **距離ベース**: 総走行距離で全体位置を管理
3. **連鎖計算**: 先頭→次位→最後尾の順で車両座標計算

## レール上の位置計算

### updateCurrentRailPosition関数

```typescript
const updateCurrentRailPosition = () => {
  let remainingDistance = trainState.totalDistance;
  let currentIndex = 0;

  // 累積距離からどのレール上にいるか特定
  for (let i = 0; i < rails.value.length; i++) {
    const segmentLen = segmentLength(rails.value[i]);

    if (remainingDistance <= segmentLen) {
      // このレール上にいる
      currentIndex = i;
      trainState.railIndex = i;
      trainState.segmentPosition = remainingDistance / segmentLen;
      return;
    }

    remainingDistance -= segmentLen;
  }

  // 全レールを通過 → ループして最初に戻る
  const totalLength = rails.value.reduce((sum, rail) => sum + segmentLength(rail), 0);
  trainState.totalDistance = trainState.totalDistance % totalLength;
  updateCurrentRailPosition(); // 再帰的に再計算
};
```

### レール長計算（segmentLength）
```typescript
const segmentLength = (rail: Rail): number => {
  if (rail.type === "straight" || rail.type === "slope" || rail.type === "station") {
    // 直線系: ユークリッド距離
    const start = rail.connections.start;
    const end = rail.connections.end;
    return Math.hypot(end[0] - start[0], end[2] - start[2]);
  } else {
    // カーブ系: 弧長 = 半径 × 角度
    return RAIL_CURVE_RADIUS * CURVE_SEGMENT_ANGLE;
  }
};
```

## 3D座標の補間計算

### getPoseOnRail関数（最重要）

```typescript
const getPoseOnRail = (rail: Rail, t: number): { position: Vec3; rotation: Vec3 } => {
  // t: 0.0〜1.0 のレール内進行度

  if (rail.type === "straight" || rail.type === "station" || rail.type === "crossing") {
    return getPoseOnStraight(rail, t);
  } else if (rail.type === "slope") {
    return getPoseOnSlope(rail, t);
  } else if (rail.type === "curve") {
    return getPoseOnCurve(rail, t);
  } else if (rail.type === "curve-slope") {
    return getPoseOnCurveSlope(rail, t);
  }

  // フォールバック
  return { position: rail.connections.start, rotation: [0, 0, 0] };
};
```

### 直線レールでの補間

```typescript
const getPoseOnStraight = (rail: Rail, t: number) => {
  const start = rail.connections.start;
  const end = rail.connections.end;

  // 線形補間
  const position: Vec3 = [
    start[0] + (end[0] - start[0]) * t,
    start[1] + (end[1] - start[1]) * t,
    start[2] + (end[2] - start[2]) * t
  ];

  // 進行方向の計算
  const direction = [end[0] - start[0], 0, end[2] - start[2]];
  const rotationY = Math.atan2(direction[2], direction[0]);

  return { position, rotation: [0, rotationY, 0] };
};
```

### スロープでの補間（ease-in-out）

```typescript
const getPoseOnSlope = (rail: Rail, t: number) => {
  const start = rail.connections.start;
  const end = rail.connections.end;

  // ease-in-out補間：滑らかな加減速
  const easeT = t < 0.5
    ? 2 * t * t                    // 前半: 加速
    : 1 - 2 * (1 - t) * (1 - t);  // 後半: 減速

  const position: Vec3 = [
    start[0] + (end[0] - start[0]) * t,      // X,Z: 線形
    start[1] + (end[1] - start[1]) * easeT,  // Y: ease-in-out
    start[2] + (end[2] - start[2]) * t
  ];

  // 接線ベクトル計算（微分）
  const tangent = getSlopeTangent(rail, t);
  const rotationY = Math.atan2(tangent[2], tangent[0]);

  return { position, rotation: [0, rotationY, 0] };
};
```

### カーブでの補間（円運動）

```typescript
const getPoseOnCurve = (rail: Rail, t: number) => {
  const center = rail.position;
  const radius = RAIL_CURVE_RADIUS;
  const startAngle = rail.rotation[1];  // レールの基準角度

  // 円運動パラメータ
  const totalAngle = CURVE_SEGMENT_ANGLE;  // π/2（90度）
  const direction = rail.direction === "left" ? 1 : -1;

  // 現在の角度
  const currentAngle = startAngle + direction * totalAngle * t;

  // 円周上の位置
  const position: Vec3 = [
    center[0] + radius * Math.cos(currentAngle),
    center[1],  // カーブは水平
    center[2] + radius * Math.sin(currentAngle)
  ];

  // 接線方向（速度ベクトル）
  const tangentAngle = currentAngle + direction * Math.PI / 2;
  const rotationY = tangentAngle;

  return { position, rotation: [0, rotationY, 0] };
};
```

### 曲線スロープ（最複雑）

```typescript
const getPoseOnCurveSlope = (rail: Rail, t: number) => {
  const center = rail.position;
  const radius = RAIL_CURVE_RADIUS;
  const startAngle = rail.rotation[1];

  // カーブ成分（getPoseOnCurveと同じ）
  const totalAngle = CURVE_SEGMENT_ANGLE;
  const direction = rail.direction === "left" ? 1 : -1;
  const currentAngle = startAngle + direction * totalAngle * t;

  // 高度変化成分（ease-in-out）
  const startY = rail.connections.start[1];
  const endY = rail.connections.end[1];
  const easeT = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
  const currentY = startY + (endY - startY) * easeT;

  const position: Vec3 = [
    center[0] + radius * Math.cos(currentAngle),
    currentY,  // 高度変化を適用
    center[2] + radius * Math.sin(currentAngle)
  ];

  const rotationY = currentAngle + direction * Math.PI / 2;

  return { position, rotation: [0, rotationY, 0] };
};
```

## 車両間隔の計算

### updateCarTransforms関数

```typescript
const updateCarTransforms = () => {
  const transforms: CarTransform[] = [];

  // 各車両の位置を後方に向かって計算
  for (let carIndex = 0; carIndex < CAR_COUNT; carIndex++) {
    const distance = trainState.totalDistance - (carIndex * CAR_LENGTH);

    if (distance < 0) {
      // まだレール上に出ていない車両
      const firstRail = rails.value[0];
      transforms.push({
        position: firstRail.connections.start,
        rotation: [0, firstRail.rotation[1], 0]
      });
    } else {
      const pose = getTrainPose(distance);
      transforms.push({
        position: pose.position,
        rotation: pose.rotation
      });
    }
  }

  carTransforms.value = transforms;
};
```

### 車両配置の論理
1. **先頭車**: `totalDistance` の位置
2. **2両目**: `totalDistance - CAR_LENGTH` の位置
3. **3両目**: `totalDistance - (2 × CAR_LENGTH)` の位置

この方法により、先頭車の動きに自然に追従する車両群が実現されます。

## スロープのease-in-out補間

### 物理的意味
```typescript
// ease-in-out関数
const easeInOut = (t: number): number => {
  return t < 0.5
    ? 2 * t * t                    // 前半: y = 2x²（上に凸）
    : 1 - 2 * (1 - t) * (1 - t);  // 後半: y = 1 - 2(1-x)²（下に凸）
};
```

### なぜease-in-out？
1. **リアルな動き**: 電車は坂道で徐々に加減速
2. **滑らかな接続**: 前後のレールとの自然な繋がり
3. **視覚的美しさ**: 機械的でない有機的な動き

### 接線ベクトルの計算
```typescript
const getSlopeTangent = (rail: Rail, t: number): Vec3 => {
  const start = rail.connections.start;
  const end = rail.connections.end;

  // ease-in-out関数の微分
  const easeDerivative = t < 0.5
    ? 4 * t           // d/dt(2t²) = 4t
    : 4 * (1 - t);    // d/dt(1-2(1-t)²) = 4(1-t)

  return [
    end[0] - start[0],                    // X: 線形なので定数
    (end[1] - start[1]) * easeDerivative, // Y: ease微分
    end[2] - start[2]                     // Z: 線形なので定数
  ];
};
```

この接線ベクトルから電車の向きを計算し、坂道でも自然な姿勢を保ちます。

## カメラ追従システム

### onTrainPoseコールバック
```typescript
const registerTrainPoseCallback = (callback: (pos: Vec3, rot: Vec3) => void) => {
  onTrainPose = callback;
};
```

### 先頭カメラでの利用
```typescript
// useCameraController.ts 内
const handleTrainPose = (position: Vec3, rotation: Vec3) => {
  if (cameraMode.value === "front") {
    // 先頭車の少し後方にカメラを配置
    const offset = 0.5;
    cameraPosition.value = [
      position[0] - Math.cos(rotation[1]) * offset,
      position[1] + 0.3,  // 少し上から
      position[2] + Math.sin(rotation[1]) * offset
    ];
    cameraRotation.value = rotation;
  }
};
```

## パフォーマンス最適化

### 計算の分散
1. **メインループ**: 60FPS で軽量な位置更新のみ
2. **重い計算**: 必要時のみ実行（レール変更時など）
3. **メモ化**: segmentLength などの結果をキャッシュ

### ガベージコレクション対策
```typescript
// オブジェクト再利用
const tempPose = { position: [0, 0, 0], rotation: [0, 0, 0] };

const updatePosition = () => {
  // 新しいオブジェクトを作らず、既存を更新
  tempPose.position[0] = newX;
  tempPose.position[1] = newY;
  tempPose.position[2] = newZ;
  // ...
};
```

## エラーハンドリング

### 境界条件
- **レール不足**: 3本未満ではループしない
- **距離オーバーフロー**: 総距離での除算で循環
- **配列越境**: railIndex の範囲チェック

### デバッグサポート
```typescript
const debugTrainState = () => ({
  rail: rails.value[trainState.railIndex]?.type,
  position: trainState.segmentPosition.toFixed(3),
  distance: trainState.totalDistance.toFixed(1)
});
```

## まとめ

この電車運行システムの特徴:

1. **物理的リアリティ**: ease-in-out補間による自然な加減速
2. **数学的精密性**: 三角関数による正確な円運動計算
3. **パフォーマンス**: 60FPS安定動作のための最適化
4. **拡張性**: 新しいレール種別への対応が容易
5. **デバッグ性**: 状態の可視化とトレース機能

これらの設計により、複雑な3Dレール上での滑らかで自然な電車運行を実現しています。

### 重要な数学的関係式

```
スロープ接線角度 = arctan(高度変化速度 / 水平移動速度)
カーブ接線方向 = 円の中心角 + π/2
車両間隔距離 = 先頭距離 - (車両番号 × CAR_LENGTH)
総走行距離 = Σ(各レールの長さ)
```

これらの公式を理解することで、電車運行システムの全体像が把握できます。