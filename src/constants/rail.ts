// 共通レール定数定義
// どのコンポーネントからも import して使用してください。

// 1本の直線レールの中心から端までの長さ（片側）
export const RAIL_STRAIGHT_HALF_LENGTH = 1; // => フル長さ 2
export const RAIL_STRAIGHT_FULL_LENGTH = RAIL_STRAIGHT_HALF_LENGTH * 2;

// 直線レールのジオメトリ寸法 (length, height, width)
export const RAIL_STRAIGHT_GEOMETRY: [number, number, number] = [RAIL_STRAIGHT_FULL_LENGTH, 0.2, 0.5];

// カーブ 1 セグメント角度（8 本で一周）
export const CURVE_SEGMENT_ANGLE = Math.PI / 4; // 45°

// カーブ半径（中心からレール中心線まで）
export const RAIL_CURVE_RADIUS = 2;

// カーブレールの太さ（外径 - 内径）
export const RAIL_CURVE_THICKNESS = 0.4; // 以前: 内1.8, 外2.2 -> 差 0.4
export const RAIL_CURVE_INNER_RADIUS = RAIL_CURVE_RADIUS - RAIL_CURVE_THICKNESS / 2; // 1.8
export const RAIL_CURVE_OUTER_RADIUS = RAIL_CURVE_RADIUS + RAIL_CURVE_THICKNESS / 2; // 2.2

// 便利まとめ
export const RAIL_CURVE_RING_ARGS: [number, number, number, number, number, number] = [
  RAIL_CURVE_INNER_RADIUS,
  RAIL_CURVE_OUTER_RADIUS,
  32, // segments
  1,
  Math.PI / 4,
  CURVE_SEGMENT_ANGLE,
];
