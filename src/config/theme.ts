import type { Status } from '../types'

// Fletcher's palette (§9).
export const PALETTE = {
  paper: '#F2EFE6',
  pine: '#35705E',
  ink: '#1C1A17',
  navy: '#28305C',
  terracotta: '#B56A43',
  ochre: '#C99A3B',
  walnut: '#4E3424',
  stone: '#9A968C',
} as const

// Status colours — muted/desaturated for the architectural-plan aesthetic.
export const STATUS_COLOR: Record<Status, string> = {
  proposed: '#9A968C', // stone
  confirmed: '#5F7468', // muted pine-grey
  ordered: '#5A6178', // muted navy-grey
  risk: '#B0764F', // muted terracotta (the one accent that should read as a flag)
}

export const STATUS_LABEL: Record<Status, string> = {
  proposed: 'Proposed',
  confirmed: 'Confirmed',
  ordered: 'Ordered',
  risk: 'Fit-risk',
}

// Presence cursor colours assigned round-robin to collaborators.
export const PRESENCE_COLORS = [
  PALETTE.pine,
  PALETTE.terracotta,
  PALETTE.navy,
  PALETTE.ochre,
  PALETTE.walnut,
]
