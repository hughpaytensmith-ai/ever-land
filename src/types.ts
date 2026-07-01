// Domain types for Fletcher's Bar Builder.
// All linear dimensions are in millimetres (mm), the authoritative unit.

/** Which physical space an item / shell belongs to. The tool toggles between
 *  these; items default to 'bar' when the field is absent (back-compat with
 *  rooms created before the kitchen existed). */
export type Space = 'bar' | 'kitchen'

export type Placement =
  | 'front-top' // on the front-bar top, guest-facing
  | 'front-under' // under-bench, front bar
  | 'back-bench' // on the back-bar bench
  | 'back-under' // under-bench, back bar
  | 'back-wall' // mounted on the back wall (shelves, mirror, font)
  | 'plant' // east-return plant corner
  | 'overhead' // suspended joinery soffit

export type Status = 'proposed' | 'confirmed' | 'ordered' | 'risk'

export interface Services {
  power?: string
  water?: boolean
  drain?: boolean
  gas?: 'CO2' | 'N2' | 'CO2+N2'
  data?: boolean
}

/** A placed piece of equipment on the shared layout. */
export interface EquipItem {
  id: string
  /** which space this item lives in. Absent ⇒ 'bar' (legacy items). */
  space?: Space
  key: string
  label: string
  product: string
  w: number
  d: number
  h: number
  x: number
  y: number
  rot: number
  placement: Placement
  zone: string
  status: Status
  price: number | null
  services: Services
  color: string
  notes?: string
  fixture?: boolean
  /** explicit base height (mm from floor). Overrides the placement default —
   *  set by dragging vertically in elevation, or the anchor buttons. */
  z?: number
  /** hidden from all views when true (visibility toggle) — stays in schedule */
  hidden?: boolean
  /** archived: removed from the schedule + all views entirely, but restorable */
  archived?: boolean
}

/** The adjustable bar/kitchen shell. Everything editable. Both spaces use this
 *  same galley model (front counter + working aisle + back equipment run). */
export interface BarShell {
  frontLen: number
  frontDepth: number
  frontHeight: number
  aisle: number
  backLen: number
  backDepth: number
  eastReturn: number
  /** height of the back bench top (mm). Bar = 1000; kitchen = 900. Used by
   *  baseHeight() so on-bench kit sits at the right level in 3D + elevations. */
  benchHeight: number
  pxPerMm: number
}

export interface CommentThread {
  id: string
  itemId: string
  author: string
  text: string
  ts: number
}

export interface PresenceState {
  name: string
  color: string
  /** cursor carries the space it was taken in, so a bar cursor isn't drawn on
   *  the kitchen plan (different coordinate frame). */
  cursor: { x: number; y: number; space?: Space } | null
}
