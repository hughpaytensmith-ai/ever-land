import type { BarShell } from '../types'

// ──────────────────────────────────────────────────────────────────────────
// Bar shell — Studio Plenty SP185_DD01 A.07 (rev 27/5/2026, WIP) — §4.
// Every value is an editable constant. The shell is ADJUSTABLE, not a hard
// constraint: the tool's job is to define the kit + a sensible arrangement,
// then export the resulting envelope for the design team to build around.
// ──────────────────────────────────────────────────────────────────────────

export const DEFAULT_BAR: BarShell = {
  frontLen: 3730, // Entertainment 1130 | Bar 2300 | Drinks pass 300
  frontDepth: 600,
  frontHeight: 1100,
  aisle: 900, // clear staff aisle — keep walkable
  // A.07 back-bar dim chain: 600+105+390+105+600+25+400+25+1800+560 = 4610
  // (longer than the 3730 front — it runs east to the dish drop).
  backLen: 4610,
  backDepth: 600,
  eastReturn: 900, // east return to the kitchen wall (dish drop)
  benchHeight: 1000, // back bench top (clearance for the keg fridge)
  pxPerMm: 0.2, // 1px = 5mm (configurable)
}

// Coordinate frame (§6):
//   X = along bar length, 0 at west/dining end → frontLen at east/kitchen end.
//   Y = depth, 0 at the customer edge → back wall.
// Derived Y bands (front 0–depth, aisle, back run):
export function yBands(bar: BarShell) {
  const frontStart = 0
  const frontEnd = bar.frontDepth
  const aisleStart = frontEnd
  const aisleEnd = frontEnd + bar.aisle
  const backStart = aisleEnd
  const backEnd = aisleEnd + bar.backDepth
  return { frontStart, frontEnd, aisleStart, aisleEnd, backStart, backEnd }
}

export function totalDepth(bar: BarShell) {
  return bar.frontDepth + bar.aisle + bar.backDepth
}

// Front-bar length zoning (§4) — for the reference overlay labels.
export const FRONT_ZONES = [
  { label: 'Entertainment', x0: 0, x1: 1130 },
  { label: 'Bar', x0: 1130, x1: 3430 },
  { label: 'Drinks pass', x0: 3430, x1: 3730 },
] as const

export const SCALE_PRESETS = [
  { label: '1px = 2.5mm', pxPerMm: 0.4 },
  { label: '1px = 5mm', pxPerMm: 0.2 },
  { label: '1px = 10mm', pxPerMm: 0.1 },
]
