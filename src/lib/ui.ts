import { create } from 'zustand'

export type ViewMode = '2d' | '3d' | 'north' | 'south' | 'east' | 'west'

interface UIState {
  selectedId: string | null
  view: ViewMode
  showOverhead: boolean
  showReference: boolean
  flipX: boolean
  name: string | null
  select: (id: string | null) => void
  setView: (v: ViewMode) => void
  toggleOverhead: () => void
  toggleReference: () => void
  toggleFlip: () => void
  setName: (n: string) => void
}

const initFlip = (() => {
  try {
    // default ON (flipped) the first time — flips the east/west the user reported reversed
    const v = localStorage.getItem('fbb:flipX')
    return v === null ? true : v === '1'
  } catch {
    return true
  }
})()

export const useUI = create<UIState>((set) => ({
  selectedId: null,
  view: '2d',
  showOverhead: true,
  showReference: false,
  flipX: initFlip,
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
  setName: (n) => set({ name: n }),
}))
