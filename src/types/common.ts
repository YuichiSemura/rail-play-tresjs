// 共通型（当面は追加のみ。既存コードの import 差し替えは後続タスクで実施）

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

export type Euler = Vec3; // [x, y, z] in radians

export type GameMode = "build" | "run" | "customize";
export type CameraMode = "orbit" | "front";

export type Pose = {
  point: Vec3;
  theta: number; // yaw (radians)
};

export type CarPose = {
  position: Vec3;
  rotation: Euler;
};
