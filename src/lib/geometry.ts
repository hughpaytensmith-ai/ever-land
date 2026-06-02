import type { BarShell, EquipItem, Placement } from '../types'
import { yBands, totalDepth } from '../config/bar'

export interface Rect {
  x: number
  y: number
  w: number
  d: number
}

/** Footprint in the bar frame, accounting for 90°/270° rotation. */
export function footprint(item: EquipItem): Rect {
  const rot = ((item.rot % 360) + 360) % 360
  const swap = rot === 90 || rot === 270
  return { x: item.x, y: item.y, w: swap ? item.d : item.w, d: swap ? item.w : item.d }
}

/** Base height (mm from floor) of an item: explicit z if set, else the
 *  default for its placement (used by 3D + elevations). */
export function baseHeight(item: EquipItem, bar: BarShell): number {
  if (typeof item.z === 'number') return item.z
  switch (item.placement) {
    case 'front-top':
      return bar.frontHeight
    case 'back-bench':
      return 1000 // back bench can be 1000 (clearance for the keg fridge)
    case 'back-wall':
      return 1000
    case 'overhead':
      return 2400 - item.h
    default:
      return 0
  }
}

export function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.d && a.y + a.d > b.y
}

/** Items only physically collide within the same vertical layer/placement. */
function sameLayer(a: Placement, b: Placement): boolean {
  return a === b
}

export interface Collision {
  aId: string
  bId: string
}

export function collisions(items: EquipItem[]): Collision[] {
  const out: Collision[] = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const A = items[i]
      const B = items[j]
      if (A.hidden || B.hidden || A.archived || B.archived) continue
      if (A.fixture && B.fixture) continue
      if (!sameLayer(A.placement, B.placement)) continue
      if (overlap(footprint(A), footprint(B))) out.push({ aId: A.id, bId: B.id })
    }
  }
  return out
}

/** Allowed region (mm) for a placement band, used for overhang checks. */
export function regionFor(placement: Placement, bar: BarShell): Rect {
  const b = yBands(bar)
  switch (placement) {
    case 'front-top':
    case 'front-under':
    case 'overhead':
      return { x: 0, y: b.frontStart, w: bar.frontLen, d: bar.frontDepth }
    case 'back-under':
    case 'back-bench':
    case 'back-wall':
      return { x: 0, y: b.backStart, w: bar.backLen, d: bar.backDepth }
    case 'plant':
      return { x: bar.frontLen, y: 0, w: bar.eastReturn, d: totalDepth(bar) }
  }
}

export function isOverhang(item: EquipItem, bar: BarShell): boolean {
  const fp = footprint(item)
  const r = regionFor(item.placement, bar)
  const tol = 1
  return fp.x < r.x - tol || fp.y < r.y - tol || fp.x + fp.w > r.x + r.w + tol || fp.y + fp.d > r.y + r.d + tol
}

/** Packed width along X for a run (the under-bench layers). */
export function packedLength(items: EquipItem[], placement: Placement): number {
  return items
    .filter((i) => i.placement === placement && !i.fixture)
    .reduce((sum, i) => sum + footprint(i).w, 0)
}

// ── Snap-to ──────────────────────────────────────────────────────────────
// Default 20mm gap between equipment (more if a card's notes flag ventilation).
export const EQUIP_GAP = 20
const SNAP_THRESH = 70 // mm proximity that triggers a snap

/** Refine a proposed drag position: snap the dragged item's edges to bar/bench
 *  edges, the front-bar zone lines, and neighbouring items (leaving a 20mm gap
 *  or flush-aligning). Returns the snapped position + which guides fired. */
export function snapPlacement(
  proposed: { x: number; y: number },
  item: EquipItem,
  others: EquipItem[],
  bar: BarShell,
): { x: number; y: number; snappedX: boolean; snappedY: boolean } {
  const fp = footprint({ ...item, x: proposed.x, y: proposed.y })
  let x = proposed.x
  let y = proposed.y
  const r = regionFor(item.placement, bar)

  const neighbours = others.filter(
    (o) => o.id !== item.id && o.placement === item.placement && !o.hidden && !o.archived && !o.fixture,
  )

  // ── X candidates: the dragged LEFT edge can snap to any of these targets ──
  const leftTargets: number[] = [
    r.x, // bar run start (west edge)
    r.x + r.w - fp.w, // flush to bar run end (east edge)
  ]
  // front-bar zone boundaries (Entertainment | Bar | Drinks pass)
  if (item.placement === 'front-top' || item.placement === 'front-under') {
    leftTargets.push(1130, 1130 - fp.w, 3430, 3430 - fp.w)
  }
  for (const o of neighbours) {
    const of = footprint(o)
    leftTargets.push(of.x + of.w + EQUIP_GAP) // 20mm gap to o's right
    leftTargets.push(of.x - EQUIP_GAP - fp.w) // 20mm gap to o's left
    leftTargets.push(of.x) // align left edges
    leftTargets.push(of.x + of.w - fp.w) // align right edges
  }
  let bestDx = Infinity
  let snapX = x
  for (const t of leftTargets) {
    if (Math.abs(t - x) < Math.abs(bestDx)) {
      bestDx = t - x
      snapX = t
    }
  }
  const snappedX = Math.abs(bestDx) <= SNAP_THRESH
  if (snappedX) x = snapX

  // ── Y: bench/band front edge, flush to back/wall, or align to a neighbour ──
  const yTargets = [r.y, r.y + r.d - fp.d, ...neighbours.map((o) => o.y)]
  let bestDy = Infinity
  let snapY = y
  for (const t of yTargets) {
    if (Math.abs(t - y) < Math.abs(bestDy)) {
      bestDy = t - y
      snapY = t
    }
  }
  const snappedY = Math.abs(bestDy) <= SNAP_THRESH
  if (snappedY) y = snapY

  return { x: Math.round(x), y: Math.round(y), snappedX, snappedY }
}

export type WarnLevel = 'info' | 'soft'
export interface Warning {
  level: WarnLevel
  msg: string
  itemIds?: string[]
}

/** All warnings are INFORMATIONAL / SOFT — never blocking (§4, §7). */
export function computeWarnings(allItems: EquipItem[], bar: BarShell): Warning[] {
  const out: Warning[] = []
  const items = allItems.filter((i) => !i.hidden && !i.archived)

  // aisle
  if (bar.aisle < 800) {
    out.push({ level: 'soft', msg: `Staff aisle is ${bar.aisle}mm — under the ~900mm walkable target.` })
  }

  // run over-pack (front + back under-bench)
  const frontPacked = packedLength(items, 'front-under')
  if (frontPacked > bar.frontLen) {
    out.push({
      level: 'soft',
      msg: `Front under-bench packs ${frontPacked}mm into a ${bar.frontLen}mm run (+${frontPacked - bar.frontLen}mm).`,
    })
  }
  const backPacked = packedLength(items, 'back-under')
  if (backPacked > bar.backLen) {
    out.push({
      level: 'soft',
      msg: `Back under-bench packs ${backPacked}mm into a ${bar.backLen}mm run (+${backPacked - bar.backLen}mm) — the engine wall is tight.`,
    })
  }

  // collisions
  const cols = collisions(items)
  if (cols.length) {
    const byId = new Map(items.map((i) => [i.id, i.label]))
    cols.forEach((c) =>
      out.push({
        level: 'soft',
        msg: `Overlap: ${byId.get(c.aId)} ↔ ${byId.get(c.bId)}.`,
        itemIds: [c.aId, c.bId],
      }),
    )
  }

  // overhangs
  items.forEach((i) => {
    if (isOverhang(i, bar)) out.push({ level: 'soft', msg: `${i.label} overhangs its zone.`, itemIds: [i.id] })
  })

  return out
}
