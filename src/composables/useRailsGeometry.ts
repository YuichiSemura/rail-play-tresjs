// レール生成/幾何ユーティリティ
import {
  CURVE_SEGMENT_ANGLE as CURVE_ANGLE,
  RAIL_CURVE_RADIUS,
  RAIL_STRAIGHT_FULL_LENGTH,
  RAIL_SLOPE_RUN,
  RAIL_SLOPE_RISE,
} from "../constants/rail";
import type { Rail } from "../types/rail";
import type { Pose, Vec3, Euler } from "../types/common";

export function useRailsGeometry() {
  const segmentLength = (r: Rail) =>
    r.type === "straight" || r.type === "slope" || r.type === "station"
      ? Math.hypot(r.connections.end[0] - r.connections.start[0], r.connections.end[2] - r.connections.start[2])
      : RAIL_CURVE_RADIUS * CURVE_ANGLE;

  const makeStraight = (pose: Pose, length = RAIL_STRAIGHT_FULL_LENGTH): Rail => {
    const start = pose.point;
    const end: Vec3 = [start[0] + Math.cos(pose.theta) * length, start[1], start[2] + Math.sin(pose.theta) * length];
    const mid: Vec3 = [(start[0] + end[0]) / 2, start[1], (start[2] + end[2]) / 2];
    return {
      id: `straight-${Date.now()}-${Math.random()}`,
      type: "straight",
      position: mid,
      rotation: [0, -pose.theta, 0],
      connections: { start, end },
    };
  };

  const makeSlope = (pose: Pose, ascending = true): Rail => {
    const start = pose.point;
    const dirx = Math.cos(pose.theta);
    const dirz = Math.sin(pose.theta);
    const rise = ascending ? RAIL_SLOPE_RISE : -RAIL_SLOPE_RISE;
    const end: Vec3 = [start[0] + dirx * RAIL_SLOPE_RUN, start[1] + rise, start[2] + dirz * RAIL_SLOPE_RUN];
    const mid: Vec3 = [(start[0] + end[0]) / 2, start[1], (start[2] + end[2]) / 2];
    return {
      id: `slope-${Date.now()}-${Math.random()}`,
      type: "slope",
      position: mid,
      rotation: [0, -pose.theta, 0],
      connections: { start, end },
    };
  };

  const makeLeftCurve = (pose: Pose): Rail => {
    const r = RAIL_CURVE_RADIUS;
    const cx = pose.point[0] - Math.sin(pose.theta) * r;
    const cz = pose.point[2] + Math.cos(pose.theta) * r;
    const position: Vec3 = [cx, 0, cz];
    const rotation: Euler = [0, pose.theta, 0];
    const end: Vec3 = [
      position[0] + Math.sin(pose.theta + CURVE_ANGLE) * r,
      0,
      position[2] - Math.cos(pose.theta + CURVE_ANGLE) * r,
    ];
    return {
      id: `curve-left-${Date.now()}-${Math.random()}`,
      type: "curve",
      position,
      rotation,
      connections: { start: pose.point, end },
      direction: "left",
    };
  };

  const makeRightCurve = (pose: Pose): Rail => {
    const r = RAIL_CURVE_RADIUS;
    const cx = pose.point[0] + Math.sin(pose.theta) * r;
    const cz = pose.point[2] - Math.cos(pose.theta) * r;
    const position: Vec3 = [cx, 0, cz];
    const rotation: Euler = [0, pose.theta, 0];
    const end: Vec3 = [
      position[0] - Math.sin(pose.theta - CURVE_ANGLE) * r,
      0,
      position[2] + Math.cos(pose.theta - CURVE_ANGLE) * r,
    ];
    return {
      id: `curve-right-${Date.now()}-${Math.random()}`,
      type: "curve",
      position,
      rotation,
      connections: { start: pose.point, end },
      direction: "right",
    };
  };

  const makeStation = (pose: Pose, length = RAIL_STRAIGHT_FULL_LENGTH): Rail => {
    const start = pose.point;
    const end: Vec3 = [start[0] + Math.cos(pose.theta) * length, start[1], start[2] + Math.sin(pose.theta) * length];
    const mid: Vec3 = [(start[0] + end[0]) / 2, start[1], (start[2] + end[2]) / 2];
    return {
      id: `station-${Date.now()}-${Math.random()}`,
      type: "station",
      position: mid,
      rotation: [0, -pose.theta, 0],
      connections: { start, end },
    };
  };

  const poseFromRailEnd = (rail: Rail): Pose => {
    const end = rail.connections.end;
    if (rail.type === "straight" || rail.type === "slope" || rail.type === "station") {
      const theta = -rail.rotation[1];
      return { point: end, theta };
    }
    const base = rail.rotation[1];
    const theta = rail.direction === "right" ? base - CURVE_ANGLE : base + CURVE_ANGLE;
    return { point: end, theta };
  };

  return { segmentLength, makeStraight, makeSlope, makeLeftCurve, makeRightCurve, makeStation, poseFromRailEnd } as const;
}
