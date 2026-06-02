import { useLayoutEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect, Text, Line, Group } from 'react-konva'
import type Konva from 'konva'
import { useItems, useBar, updateItem } from '../sync/store'
import { useUI } from '../lib/ui'
import { totalDepth, yBands } from '../config/bar'
import { footprint, baseHeight, isLocked } from '../lib/geometry'
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
  // data coord at the run's start (west/customer). The back run is based at
  // frontLen-backLen (it extends west of x=0), so South must offset by it —
  // otherwise back items render ~880mm off and partly off-canvas.
  origin: (b: BarShell) => number
  // which side of the aisle this face shows (null = end section, shows all).
  // Membership is decided by an item's POSITION, not its placement label, so a
  // piece dragged across the bar lands on the right elevation immediately.
  face: 'front' | 'back' | null
  dimTicks: (b: BarShell) => number[] // interior dimension ticks (data coords)
  dimLabel: (b: BarShell) => string
}

const CFG: Record<ElevDir, Cfg> = {
  north: {
    title: 'North elevation',
    sub: 'front bar — customer face (looking south)',
    axis: 'x', flip: false,
    runLen: (b) => b.frontLen,
    origin: () => 0,
    face: 'front',
    dimTicks: () => [1130, 3430], // Entertainment | Bar | Drinks-pass zone lines
    dimLabel: (b) => `FRONT ${b.frontLen.toLocaleString()}`,
  },
  south: {
    title: 'South elevation',
    sub: 'back-of-bar — engine wall (looking north)',
    axis: 'x', flip: true,
    runLen: (b) => b.backLen,
    origin: (b) => b.frontLen - b.backLen, // back run starts west of x=0
    face: 'back',
    dimTicks: () => [],
    dimLabel: (b) => `BACK ${b.backLen.toLocaleString()}`,
  },
  west: {
    title: 'West elevation',
    sub: 'Entertainment end — section by depth (looking east)',
    axis: 'y', flip: false,
    runLen: (b) => totalDepth(b),
    origin: () => 0,
    face: null, // end section shows the full cut — every item
    dimTicks: (b) => [b.frontDepth, b.frontDepth + b.aisle],
    dimLabel: (b) => `DEPTH ${totalDepth(b).toLocaleString()}`,
  },
  east: {
    title: 'East elevation',
    sub: 'dish-drop end — section by depth (looking west)',
    axis: 'y', flip: true,
    runLen: (b) => totalDepth(b),
    origin: () => 0,
    face: null,
    dimTicks: (b) => [b.frontDepth, b.frontDepth + b.aisle],
    dimLabel: (b) => `DEPTH ${totalDepth(b).toLocaleString()}`,
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
  const origin = cfg.origin(bar)
  const padX = 60
  const padTop = 40
  const padBottom = 60
  const fit = Math.min((size.w - padX * 2) / runLen, (size.h - padTop - padBottom) / MAX_H)
  const scale = Math.max(0.01, fit)

  const along = (i: EquipItem) => {
    const fp = footprint(i)
    return cfg.axis === 'x' ? { p: i.x, len: fp.w } : { p: i.y, len: fp.d }
  }
  const screenX = (mm: number) => (cfg.flip ? runLen - (mm - origin) : mm - origin) * scale + padX
  const screenY = (z: number) => (MAX_H - z) * scale + padTop

  const bands = yBands(bar)
  const aisleMid = (bands.aisleStart + bands.aisleEnd) / 2
  // Which side of the aisle an item physically sits on (by position, so a stale
  // placement label can't strand it on the wrong elevation).
  const sideOf = (i: EquipItem) => (i.y + footprint(i).d / 2 > aisleMid ? 'back' : 'front')
  const onFaceOf = (i: EquipItem) =>
    cfg.face === null
      ? true
      : i.placement === 'overhead'
        ? true
        : i.placement === 'plant'
          ? cfg.face === 'back'
          : sideOf(i) === cfg.face
  // Show EVERY item in every elevation so each view mirrors the full layout
  // (plan = 3D = N/S/E/W). Items not on this face are drawn dimmed + inert.
  const shown = items.filter((i) => !i.hidden && !i.archived && (i.placement !== 'overhead' || showOverhead))
  const sized = size.w > 1 && size.h > 1

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-paper">
      {sized && (
        <Stage ref={stageRef} width={size.w} height={size.h} onMouseDown={(e) => { if (e.target === stageRef.current) select(null) }} onTap={(e) => { if (e.target === stageRef.current) select(null) }}>
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
            {/* height datums (labels staggered so the close lines stay legible) */}
            <Line points={[padX, screenY(1100), size.w - padX, screenY(1100)]} stroke={PALETTE.stone} strokeWidth={1} dash={[8, 6]} />
            <Text x={padX + 4} y={screenY(1100) - 14} text="1100 front" fontSize={11} fill={PALETTE.stone} />
            <Line points={[padX, screenY(1000), size.w - padX, screenY(1000)]} stroke={PALETTE.pine} strokeWidth={1} dash={[8, 6]} />
            <Text x={padX + 96} y={screenY(1000) - 14} text="1000 back bench" fontSize={11} fill={PALETTE.pine} />
            <Line points={[padX, screenY(900), size.w - padX, screenY(900)]} stroke={PALETTE.ochre} strokeWidth={1} dash={[8, 6]} />
            <Text x={padX + 232} y={screenY(900) - 14} text="900" fontSize={11} fill={PALETTE.ochre} />

            {/* dimension chain (run length + zone ticks) below the floor */}
            <ElevDim screenX={screenX} origin={origin} runLen={runLen} ticks={cfg.dimTicks(bar)} label={cfg.dimLabel(bar)} y={screenY(0) + 24} />

            {shown.map((i) => {
              const onFace = onFaceOf(i)
              const draggable = onFace && !isLocked(i)
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
                if (cfg.flip) along = runLen - along - a.len + origin
                else along = along + origin
                const topZ = MAX_H - (py - padTop) / scale
                const baseZ = Math.max(0, topZ - i.h)
                return { along: snap(along), z: snap(baseZ) }
              }
              return (
                <Group
                  key={i.id}
                  x={x}
                  y={y}
                  draggable={draggable}
                  listening={onFace}
                  opacity={onFace ? 1 : 0.16}
                  onMouseDown={(e) => (e.cancelBubble = true)}
                  onClick={(e) => {
                    e.cancelBubble = true
                    select(i.id)
                  }}
                  onTap={(e) => {
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

// Dimension chain below the floor — run length + interior ticks, like the plan.
function ElevDim({
  screenX,
  origin,
  runLen,
  ticks,
  label,
  y,
}: {
  screenX: (mm: number) => number
  origin: number
  runLen: number
  ticks: number[]
  label: string
  y: number
}) {
  const a = screenX(origin)
  const b = screenX(origin + runLen)
  const left = Math.min(a, b)
  const right = Math.max(a, b)
  const allTicks = [origin, origin + runLen, ...ticks]
  return (
    <Group listening={false}>
      <Line points={[left, y, right, y]} stroke={PALETTE.stone} strokeWidth={0.75} />
      {allTicks.map((t, i) => (
        <Line key={i} points={[screenX(t), y - 4, screenX(t), y + 4]} stroke={PALETTE.stone} strokeWidth={0.75} />
      ))}
      <Text x={left} y={y + 5} width={right - left} align="center" text={label} fontSize={10} fill={PALETTE.stone} />
    </Group>
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
