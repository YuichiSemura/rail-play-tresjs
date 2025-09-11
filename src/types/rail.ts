import type { Vec3, Euler, Pose } from "./common";

export type RailBase = {
  id: string;
  position: Vec3;
  rotation: Euler;
  connections: { start: Vec3; end: Vec3 };
};

export type StraightRail = RailBase & { type: "straight" };
export type SlopeRail = RailBase & { type: "slope" };
export type CurveRail = RailBase & { type: "curve"; direction: "left" | "right" };
export type StationRail = RailBase & { type: "station" };
export type CrossingRail = RailBase & { type: "crossing" };

export type Rail = StraightRail | SlopeRail | CurveRail | StationRail | CrossingRail;

export type { Pose };
