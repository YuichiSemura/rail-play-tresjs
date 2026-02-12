# CLAUDE.md

3D rail-building game — TresJS + Vue 3 + Vuetify.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — `vue-tsc && vite build`
- `npm run lint` — `biome lint src/`
- `npm run format` — `biome format . --write`

## Conventions

- TypeScript + Vue 3 SFC, Biome lint/format, vue-tsc type check, Vuetify 3
- Branch: `feat/<summary>` or `fix/<summary>`
- Small commits, Japanese messages OK
- PR: summarize changes and verification steps

## Architecture

### State Management

- `useGameStore` (Pinia Setup Store) — single source of truth for all game state
- `useStorageStore` (Pinia Options Store) — localStorage I/O
- All composables and child components import store directly — **zero props** pattern
- Components use `useGameStore()` + `storeToRefs()`, no prop drilling

### Key Components

- `RailPlayGame.vue` — orchestrator, holds `createRail` function
- `RailPlayScene.vue` — 3D scene rendering (0 props, emits events)
- `BuildPanel.vue` / `RunPanel.vue` / `CustomizePanel.vue` / `HelpDialog.vue` — all 0 props

### Composables

- `useRailsGeometry()` — pure geometry/placement utilities
- `useGhostPreview(createRail)` — ghost preview + smart snap (1 param)
- `useTrainRunner()` — train physics, watches `store.trainKey` for reset
- `useCameraController()` — camera modes: orbit / front / follow
- `useUndoRedo()` — save/undo/redo (build mode only, max 50 states)
- `useSaveLoad()` — auto-save (1.5s debounce), manual save (2 slots)
- `usePresets()` — preset track generators (oval, S-curve, slope, curve-slope)

### Types

- `types/rail.ts` — `Rail` union: Straight | Slope | Curve | CurveSlope | Station | Crossing
- `types/gameObjects.ts` — `ToolType` (12 values), `HistoryState`, `TreeData`, `BuildingData`, `PierData`
- `types/common.ts` — `Vec3`, `GameMode`, `Pose`, `CarPose`

### Coordinate System

- Three.js standard: X = east/west, Y = up, Z = north/south
- Rotation: Y-axis yaw, 45-degree snap for placement
- Grid snap: 1 unit; area limit: 25 units (`constants/area.ts`)

## Gotchas

### CameraMode type divergence

- `types/common.ts` defines `CameraMode = "orbit" | "front"` (stale, 2 modes)
- `stores/game.ts` defines `CameraMode = "orbit" | "front" | "follow"` (correct, 3 modes)
- Always import `CameraMode` from `stores/game.ts`

### createRail location

- `createRail` lives in `RailPlayGame.vue`, not in a composable
- Cannot be moved due to circular dependency with `useGhostPreview`

### Undo/Redo constraints

- Only works in build mode (silently ignored in run/customize)
- Max 50 history states; deep-copies state via `JSON.parse(JSON.stringify())`
- Keyboard: Ctrl+Z undo, Ctrl+Shift+Z / Ctrl+Y redo

### Rail placement rules

- Rails can only be deleted from the start or end of the chain
- Loop detection (`isLoopComplete`) auto-locks rails and switches to run mode
- Once locked, must clear all to place new rails
- Slopes: cannot go below Y=0 or above 4.2 (6 × RAIL_SLOPE_RISE)

## Constants Reference

- Straight rail: full length 2 (half = 1), thickness 0.4
- Curve: radius 2, segment 45° (8 curves = full circle)
- Slope: run 4, rise 0.7; curve-slope rise 0.175
- Max height: 4.2; area limit: ±25 units
- Train: 3 cars, scale 0.3, speed range 0.1–8.0×

## Known Issues

- Deleted objects may visually remain on canvas (Three.js cleanup issue)
- `CameraMode` type in `common.ts` is out of sync with `stores/game.ts`
