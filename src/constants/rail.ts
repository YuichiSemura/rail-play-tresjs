// 共通レール定数定義
// どのコンポーネントからも import して使用してください。

// 1本の直線レールの中心から端までの長さ（片側）
export const RAIL_STRAIGHT_HALF_LENGTH = 1; // => フル長さ 2
export const RAIL_STRAIGHT_FULL_LENGTH = RAIL_STRAIGHT_HALF_LENGTH * 2;
export const RAIL_THICKNESS = 0.4; // 以前: 内1.8, 外2.2 -> 差 0.4

// 直線レールのジオメトリ寸法 (length, height, width)
export const RAIL_STRAIGHT_GEOMETRY: [number, number, number] = [RAIL_STRAIGHT_FULL_LENGTH, 0.2, RAIL_THICKNESS];

// カーブ 1 セグメント角度（8 本で一周）
export const CURVE_SEGMENT_ANGLE = Math.PI / 4; // 45°

// カーブ半径（中心からレール中心線まで）
export const RAIL_CURVE_RADIUS = 2;

// カーブレールの太さ（外径 - 内径）
export const RAIL_CURVE_INNER_RADIUS = RAIL_CURVE_RADIUS - RAIL_THICKNESS / 2; // 1.8
export const RAIL_CURVE_OUTER_RADIUS = RAIL_CURVE_RADIUS + RAIL_THICKNESS / 2; // 2.2

// カーブレールの垂直方向の厚み（Extrude depth）
export const RAIL_HEIGHT = 0.1;

// スロープ（ランプ）設定
// 直線の二倍（長さ4）の間に高さ1上がる
export const RAIL_SLOPE_RUN = RAIL_STRAIGHT_FULL_LENGTH * 2; // 4
export const RAIL_SLOPE_RISE = 0.7; // +0.7 上昇
export const RAIL_SLOPE_PITCH = Math.atan(RAIL_SLOPE_RISE / RAIL_SLOPE_RUN); // 傾斜角 ≈ 14°
export const RAIL_SLOPE_LENGTH_3D = Math.sqrt(RAIL_SLOPE_RUN ** 2 + RAIL_SLOPE_RISE ** 2);

// 高さ制限
export const MAX_RAIL_HEIGHT = 6 * RAIL_SLOPE_RISE; // 6個分の高さまで
export const MIN_PIER_HEIGHT = RAIL_SLOPE_RISE; // 1個分以上の高さが必要

// 便利まとめ
export const RAIL_CURVE_RING_ARGS: [number, number, number, number, number, number] = [
  RAIL_CURVE_INNER_RADIUS,
  RAIL_CURVE_OUTER_RADIUS,
  32, // segments
  1,
  Math.PI / 4,
  CURVE_SEGMENT_ANGLE,
];
