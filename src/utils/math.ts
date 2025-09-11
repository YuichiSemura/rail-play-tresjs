// 数値ユーティリティ（既存コード差し替えは後続タスクで）

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const lerp3 = (
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export const wrapAngle = (rad: number) => {
  let x = rad;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
};

export const angleLerp = (current: number, target: number, t: number) => {
  const delta = wrapAngle(target - current);
  return current + delta * t;
};

export const snapTo = (value: number, step: number) => Math.round(value / step) * step;
