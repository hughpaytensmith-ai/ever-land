import { create } from 'zustand'

export type ViewMode = '2d' | '3d' | 'north' | 'south' | 'east' | 'west'

interface UIState {
  selectedId: string | null
  view: ViewMode
  showOverhead: boolean
  showReference: boolean
  flipX: boolean
  showPanel: boolean
  showHistory: boolean
  name: string | null
  select: (id: string | null) => void
  setView: (v: ViewMode) => void
  toggleOverhead: () => void
  toggleReference: () => void
  toggleFlip: () => void
  togglePanel: () => void
  setPanel: (v: boolean) => void
  toggleHistory: () => void
  setName: (n: string) => void
}

const initFlip = (() => {
  try {
    // Locked default: RETURN + DISH DROP on the LEFT (Hugh's preferred
    // orientation). Per-user Flip toggle still overrides via localStorage.
    const v = localStorage.getItem('fbb:flipX')
    return v === null ? false : v === '1'
  } catch {
    return false
  }
})()

// Right detail panel: remembered preference, else shown on desktop / hidden on
// phones (where the canvas needs the full width).
const initPanel = (() => {
  try {
    const v = localStorage.getItem('fbb:showPanel')
    if (v !== null) return v === '1'
  } catch {
    /* ignore */
  }
  return typeof window !== 'undefined' ? window.innerWidth >= 768 : true
})()

export const useUI = create<UIState>((set) => ({
  selectedId: null,
  view: '2d',
  showOverhead: true,
  showReference: false,
  flipX: initFlip,
  showPanel: initPanel,
  showHistory: false,
  name: null,
  select: (id) => set({ selectedId: id }),
  setView: (v) => set({ view: v }),
  toggleOverhead: () => set((s) => ({ showOverhead: !s.showOverhead })),
  toggleReference: () => set((s) => ({ showReference: !s.showReference })),
  toggleFlip: () =>
    set((s) => {
      const flipX = !s.flipX
      try {
        localStorage.setItem('fbb:flipX', flipX ? '1' : '0')
      } catch {
        /* ignore */
      }
      return { flipX }
    }),
  togglePanel: () =>
    set((s) => {
      const showPanel = !s.showPanel
      try {
        localStorage.setItem('fbb:showPanel', showPanel ? '1' : '0')
      } catch {
        /* ignore */
      }
      return { showPanel }
    }),
  // transient open (does NOT persist) — used to pop the panel on mobile when an
  // item is tapped, so the default stays hidden on the next load
  setPanel: (v) => set({ showPanel: v }),
  toggleHistory: () => set((s) => ({ showHistory: !s.showHistory })),
  setName: (n) => set({ name: n }),
}))
