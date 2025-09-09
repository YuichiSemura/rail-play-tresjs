// 列車描画・移動用の共有定数

export const TRAIN_SCALE = 0.3; // モデルのスケール
const BASE_HEIGHT_OFFSET = 1.03; // 元モデルの床から中心までの高さ
export const HEIGHT_OFFSET = BASE_HEIGHT_OFFSET * TRAIN_SCALE; // ワールドでの高さ補正

export const CAR_COUNT = 3; // 編成数
export const CAR_LENGTH_WORLD = 2.3 * TRAIN_SCALE; // 屋根長から近似
export const COUPLER_GAP = 0.16; // 連結余裕
export const CAR_SPACING = CAR_LENGTH_WORLD + COUPLER_GAP; // 各車中心間距離
