import type { EquipItem } from '../types'

/** Stable 1-based display number per item (array order). Used so the 2D badge
 *  numbers match the schedule numbers — the legend that declutters labels. */
export function itemIndexMap(items: EquipItem[]): Map<string, number> {
  const m = new Map<string, number>()
  items.forEach((i, idx) => m.set(i.id, idx + 1))
  return m
}
