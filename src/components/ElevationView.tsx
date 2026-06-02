import { useLayoutEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect, Text, Line, Group } from 'react-konva'
import type Konva from 'konva'
import { useItems, useBar, updateItem } from '../sync/store'
import { useUI } from '../lib/ui'
import { totalDepth, yBands } from '../config/bar'
import { footprint, baseHeight } from '../lib/geometry'
import { PALETTE, STATUS_COLOR } from '../config/theme'
import type { BarShell, EquipItem } from '../types'

export type ElevDir = 'north' | 'south' | 'east' | 'west'

const MAX_H = 2500 // mm drawn height (floor → above overhead)
const GRID = 10
const snap = (v: number) => Math.round(v / GRID) * GRID

interface Cfg {
  title: string
  sub: string
  axis: 'x' | 'y'
  flip: boolean
  runLen: (b: BarShell) => number
  include: (i: EquipItem) => boolean
}

const CFG: Record<ElevDir, Cfg> = {
  north: {
    title: 'North elevation',
    sub: 'front bar — customer face (looking south)',
    axis: 'x', flip: false,
    runLen: (b) => b.frontLen,
    // front face + overhead. North ∪ South must cover EVERY placement so no
    // item ever goes missing vs the plan/3D.
    include: (i) => i.placement === 'front-top' || i.placement === 'front-under' || i.placement === 'overhead',
  },
  south: {
    title: 'South elevation',
    sub: 'back-of-bar — engine wall (looking north)',
    axis: 'x', flip: true,
    runLen: (b) => b.backLen,
    // back runs + plant/gas (east return) + overhead
    include: (i) => i.placement.startsWith('back') || i.placement === 'plant' || i.placement === 'overhead',
  },
  west: {
    title: 'West elevation',
    sub: 'Entertainment end — section by depth (looking east)',
    axis: 'y', flip: false,
    runLen: (b) => totalDepth(b),
    include: () => true, // end section shows the full cut — every item
  },
  east: {
    title: 'East elevation',
    sub: 'dish-drop end — section by depth (looking west)',
    axis: 'y', flip: true,
    runLen: (b) => totalDepth(b),
    include: () => true,
  },
}

export default function ElevationView({ dir }: { dir: ElevDir }) {
  const items = useItems()
  const bar = useBar()
  const { selectedId, select } = useUI()
  const showOverhead = useUI((s) => s.showOverhead)
  const cfg = CFG[dir]

  const wrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [readout, setReadout] = useState<string | null>(null)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const apply = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      setSize((p) => (p.w === w && p.h === h ? p : { w, h }))
    }
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    apply()
    return () => ro.disconnect()
  }, [])

  const runLen = cfg.runLen(bar)
  const padX = 60
  const padTop = 40
  const padBottom = 60
  const fit = Math.min((size.w - padX * 2) / runLen, (size.h - padTop - padBottom) / MAX_H)
  const scale = Math.max(0.01, fit)

  const along = (i: EquipItem) => {
    const fp = footprint(i)
    return cfg.axis === 'x' ? { p: i.x, len: fp.w } : { p: i.y, len: fp.d }
  }
  const screenX = (mm: number) => (cfg.flip ? runLen - mm : mm) * scale + padX
  const screenY = (z: number) => (MAX_H - z) * scale + padTop

  const bands = yBands(bar)
  // Show EVERY item in every elevation so each view mirrors the full layout
  // (plan = 3D = N/S/E/W). Items not on this face are drawn dimmed + inert.
  const shown = items.filter((i) => !i.hidden && !i.archived && (i.placement !== 'overhead' || showOverhead))
  const sized = size.w > 1 && size.h > 1

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-paper">
      {sized && (
        <Stage ref={stageRef} width={size.w} height={size.h} onMouseDown={(e) => { if (e.target === stageRef.current) select(null) }}>
          <Layer>
            {/* depth-section bands (end elevations) */}
            {cfg.axis === 'y' && (
              <>
                <SectionBand x0={screenX(0)} x1={screenX(bar.frontDepth)} y={screenY(1100)} h={1100 * scale} label="front" />
                <SectionBand x0={screenX(bands.backStart)} x1={screenX(bands.backEnd)} y={screenY(900)} h={900 * scale} label="back" />
              </>
            )}

            {/* floor */}
            <Line points={[padX, screenY(0), size.w - padX, screenY(0)]} stroke={PALETTE.ink} strokeWidth={2} />
            {/* 1100 datum (front-bar counter height) */}
            <Line points={[padX, screenY(1100), size.w - padX, screenY(1100)]} stroke={PALETTE.stone} strokeWidth={1} dash={[8, 6]} />
            <Text x={padX + 4} y={screenY(1100) - 16} text="1100" fontSize={11} fill={PALETTE.stone} />
            {/* 900 datum (back-bench / standing working height) */}
            <Line points={[padX, screenY(900), size.w - padX, screenY(900)]} stroke={PALETTE.ochre} strokeWidth={1} dash={[8, 6]} />
            <Text x={padX + 4} y={screenY(900) - 16} text="900" fontSize={11} fill={PALETTE.ochre} />

            {shown.map((i) => {
              const onFace = cfg.include(i)
              const a = along(i)
              const by = baseHeight(i, bar)
              const x = cfg.flip ? screenX(a.p + a.len) : screenX(a.p)
              const w = a.len * scale
              const y = screenY(by + i.h)
              const h = i.h * scale
              const sel = selectedId === i.id
              // convert a node's screen pos → along-axis mm + base-height mm
              const toMm = (px: number, py: number) => {
                let along = (px - padX) / scale
                if (cfg.flip) along = runLen - along - a.len
                const topZ = MAX_H - (py - padTop) / scale
                const baseZ = Math.max(0, topZ - i.h)
                return { along: snap(along), z: snap(baseZ) }
              }
              return (
                <Group
                  key={i.id}
                  x={x}
                  y={y}
                  draggable={onFace}
                  listening={onFace}
                  opacity={onFace ? 1 : 0.16}
                  onMouseDown={(e) => (e.cancelBubble = true)}
                  onClick={(e) => {
                    e.cancelBubble = true
                    select(i.id)
                  }}
                  onDragMove={(e) => {
                    const m = toMm(e.target.x(), e.target.y())
                    setReadout(`${i.label} · ${cfg.axis === 'x' ? 'x' : 'depth'} ${Math.round(m.along)}mm · base ${Math.round(m.z)}mm`)
                  }}
                  onDragEnd={(e) => {
                    setReadout(null)
                    const m = toMm(e.target.x(), e.target.y())
                    const patch: Partial<EquipItem> = cfg.axis === 'x' ? { x: m.along } : { y: m.along }
                    patch.z = m.z
                    updateItem(i.id, patch)
                  }}
                >
                  <Rect
                    width={w}
                    height={h}
                    fill={i.color}
                    opacity={onFace ? (i.fixture ? 0.16 : 0.42) : 0.5}
                    stroke={onFace ? (sel ? PALETTE.ink : STATUS_COLOR[i.status]) : PALETTE.stone}
                    strokeWidth={onFace ? (sel ? 2.5 : 1) : 0.5}
                    dash={onFace ? undefined : [3, 3]}
                  />
                  {onFace && w > 30 && h > 14 && (
                    <Text text={i.label} x={3} y={3} width={w - 6} fontSize={Math.max(8, Math.min(12, w / 10))} fill={PALETTE.ink} ellipsis wrap="word" listening={false} />
                  )}
                  {onFace && w > 30 && (
                    <Text text={`${i.h}`} x={3} y={h - 14} fontSize={10} fill={PALETTE.ink} opacity={0.55} listening={false} />
                  )}
                </Group>
              )
            })}
          </Layer>
        </Stage>
      )}

      <div className="pointer-events-none absolute left-3 top-2 text-[12px]">
        <span className="wordmark text-ink">{cfg.title}</span>{' '}
        <span className="text-stone">— {cfg.sub}</span>
      </div>
      <div className="pointer-events-none absolute right-3 top-2 rounded bg-ink/80 px-2 py-1 text-[11px] text-paper">
        {readout ?? 'drag to reposition along the wall · click to select'}
      </div>
    </div>
  )
}

function SectionBand({ x0, x1, y, h, label }: { x0: number; x1: number; y: number; h: number; label: string }) {
  const left = Math.min(x0, x1)
  const w = Math.abs(x1 - x0)
  return (
    <Group listening={false}>
      <Rect x={left} y={y} width={w} height={h} fill={PALETTE.stone} opacity={0.08} />
      <Text x={left} y={y + h + 4} width={w} text={label} fontSize={11} fill={PALETTE.stone} align="center" />
    </Group>
  )
}
