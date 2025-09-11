// 簡易 UID 生成（crypto.randomUUID があれば優先）

export const uid = (prefix = "id") =>
  (globalThis.crypto?.randomUUID?.() as string) || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
