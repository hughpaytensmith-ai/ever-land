import type { BarShell, Placement, Space } from '../types'
import { DEFAULT_BAR, FRONT_ZONES } from './bar'

// ──────────────────────────────────────────────────────────────────────────
// Space registry — the Bar and the Kitchen are both galley spaces (a front
// counter + a working aisle + a back equipment run), so they share the SAME
// shell model, geometry, placement system and views. Everything that differs
// between them (dimensions, labels, snap zone-lines, ornaments) lives here.
// ──────────────────────────────────────────────────────────────────────────

export type { Space }

// Kitchen shell, read off Studio Plenty A.07 (Bar & kitchen plan). Galley along
// the east wall: back equipment run + food-pass counter facing the dining, with
// the dish drop at the west end shared with the bar. Lengths are sized to fit
// the A.07 kit with service gaps; refine against the plan as needed.
// Kitchen is drawn FREEFORM (a room + U-shaped bench), not as a galley. These
// shell numbers exist mainly so totalDepth()=roomH and the elevations have a
// run length; the plan itself uses roomW/roomH/bench below.
export const DEFAULT_KITCHEN: BarShell = {
  frontLen: 3900, // = roomW (E-W) — A.07 footprint
  frontDepth: 450,
  frontHeight: 900,
  aisle: 950,
  backLen: 3900,
  backDepth: 600, // 450+950+600 = 2000 = roomH (N-S)
  eastReturn: 0,
  benchHeight: 900, // commercial bench top
  pxPerMm: 0.2,
}

export interface ElevLabels {
  title: string
  sub: string
}

export interface SpaceDef {
  key: Space
  label: string
  shellLabel: string
  defaultShell: BarShell
  /** x positions (mm) that the dragged left-edge snaps to (front-run zone lines) */
  zoneLines: number[]
  /** front-run zones drawn as overlay dividers + labels */
  zones: { label: string; x0: number; x1: number }[]
  /** schedule grouping (placement → section title) */
  scheduleGroups: { key: Placement[]; title: string }[]
  planFrontLabel: string
  planBackLabel: string
  /** draw the bar-only ornaments: west return/gas strip, dish drop, standing
   *  side-bar, 900 datum line. (Kitchen draws a plain dish-drop marker only.) */
  barOrnaments: boolean
  /** show the "Overhead joinery" toggle (bar soffit only) */
  hasOverhead: boolean
  /** extra rooms drawn beside the equipment run (kitchen: STORE + WC), in data
   *  coords. The plan envelope expands to include them. */
  rooms?: { label: string; x: number; y: number; w: number; h: number }[]
  /** label for the food-out / pass marker (kitchen) */
  passLabel?: string
  /** FREEFORM plan mode (kitchen): instead of the galley front/aisle/back bands,
   *  the plan draws a room outline + a custom bench (the U-shaped worktop) and
   *  equipment is placed at true 2D positions. */
  freeform?: boolean
  /** room footprint (mm) for freeform mode */
  roomW?: number
  roomH?: number
  /** bench worktop rectangles (mm) — the legs of the U */
  bench?: { x: number; y: number; w: number; h: number }[]
  elev: Record<'north' | 'south' | 'east' | 'west', ElevLabels>
}

export const SPACES: Record<Space, SpaceDef> = {
  bar: {
    key: 'bar',
    label: 'Bar',
    shellLabel: 'Bar shell',
    defaultShell: DEFAULT_BAR,
    zoneLines: [1130, 3430], // Entertainment | Bar | Drinks-pass divisions
    zones: FRONT_ZONES.map((z) => ({ ...z })),
    scheduleGroups: [
      { key: ['front-top', 'front-under'], title: 'Front bar' },
      { key: ['back-bench', 'back-under', 'back-wall'], title: 'Back-of-bar' },
      { key: ['plant'], title: 'Plant / gas' },
      { key: ['overhead'], title: 'Overhead' },
    ],
    planFrontLabel: 'FRONT BAR · 1100H',
    planBackLabel: 'BACK-OF-BAR · engine wall',
    barOrnaments: true,
    hasOverhead: true,
    elev: {
      north: { title: 'North elevation', sub: 'front bar — customer face (looking south)' },
      south: { title: 'South elevation', sub: 'back-of-bar — engine wall (looking north)' },
      east: { title: 'East elevation', sub: 'dish-drop end — section by depth (looking west)' },
      west: { title: 'West elevation', sub: 'Entertainment end — section by depth (looking east)' },
    },
  },
  kitchen: {
    key: 'kitchen',
    label: 'Kitchen',
    shellLabel: 'Kitchen shell',
    defaultShell: DEFAULT_KITCHEN,
    zoneLines: [],
    zones: [],
    scheduleGroups: [
      { key: ['front-top', 'front-under'], title: 'Food pass' },
      { key: ['back-bench', 'back-under', 'back-wall'], title: 'Back bench — equipment' },
      { key: ['plant'], title: 'Plant / gas' },
      { key: ['overhead'], title: 'Overhead' },
    ],
    planFrontLabel: 'FOOD OUT · aisle',
    planBackLabel: 'EQUIPMENT WALL',
    barOrnaments: false,
    hasOverhead: false,
    // FREEFORM: A.07 kitchen — ≈ 3.9 × 2.0 m. Bench: basins (NW, deep) + a main
    // bench along the back wall + an east alcove; FOOD PASS along the south.
    freeform: true,
    roomW: 3900,
    roomH: 2000,
    bench: [
      { x: 0, y: 0, w: 700, h: 900 }, // BASINS (NW, against back wall — top)
      { x: 700, y: 0, w: 2790, h: 650 }, // MAIN BENCH (back wall: bins·DW·store·fridge×2)
      { x: 3490, y: 0, w: 410, h: 1100 }, // EAST ALCOVE (induction + sandwich)
      { x: 700, y: 1550, w: 2790, h: 450 }, // FOOD PASS (south counter — bottom)
    ],
    passLabel: '◀ dish drop / bar          FOOD PASS (south) ↓',
    elev: {
      north: { title: 'North elevation', sub: 'food pass — dining side (looking south)' },
      south: { title: 'South elevation', sub: 'back bench — equipment wall (looking north)' },
      east: { title: 'East elevation', sub: 'cookline end — section by depth (looking west)' },
      west: { title: 'West elevation', sub: 'dish-drop end — section by depth (looking east)' },
    },
  },
}
