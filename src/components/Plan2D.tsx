import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect, Text, Group, Line, Circle, Label, Tag } from 'react-konva'
import type Konva from 'konva'
import { useItems, useBar, updateItem, setCursor, usePresence } from '../sync/store'
import { useUI } from '../lib/ui'
import { yBands, totalDepth, FRONT_ZONES } from '../config/bar'
import { footprint, collisions, isOverhang, snapPlacement, placementForDrop, isLocked } from '../lib/geometry'
import { PALETTE, STATUS_COLOR } from '../config/theme'
import { planSnapshot } from '../lib/snapshot'
import { itemIndexMap } from '../lib/indexing'
import type { EquipItem } from '../types'

const GRID = 10 // mm snap
const snap = (v: number) => Math.round(v / GRID) * GRID

export default function Plan2D() {
  const items = useItems()
  const bar = useBar()
  const presence = usePresence()
  const { selectedId, select } = useUI()
  const showOverhead = useUI((s) => s.showOverhead)
  const flipX = useUI((s) => s.flipX)

  const wrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 40, y: 40 })
  const [readout, setReadout] = useState<string | null>(null)
  // active snap guides during a drag (screen px, layer-local coords)
  const [guide, setGuide] = useState<{ x: number | null; y: number | null }>({ x: null, y: null })

  // The dish-drop / return + back-bar overhang sit on the WEST. The back bar
  // runs longer than the front, extending west of x=0; the return/gas zone
  // occupies that western strip. `ox` shifts the whole drawing right so the
  // westmost point maps to 0 (equipment x-data is untouched).
  const westExt = Math.max(bar.backLen - bar.frontLen, bar.eastReturn, 0)
  const ox = westExt
  const worldWmm = bar.frontLen + westExt
  const worldHmm = totalDepth(bar)

  // fit-to-view scale (px per mm), then user zoom on top
  const fitScale = Math.min((size.w - 80) / worldWmm, (size.h - 80) / worldHmm)
  const scale = Math.max(0.01, fitScale * zoom)
  const mm = (v: number) => v * scale
  // x-coordinate of a data point, honouring the west offset + the flip toggle
  const px = (v: number) => (flipX ? worldWmm - (v + ox) : v + ox) * scale
  const X = px // points
  // left screen-edge of a rect spanning [xData, xData+wData]
  const rx = (xData: number, wData: number) => (flipX ? px(xData + wData) : px(xData))
  // data-x (left edge) → node screen-x (mirror of toDataX below)
  const dataXToNode = (xData: number, fpw: number) => rx(xData, fpw)
  // Snap a node's local screen position: returns the snapped node px (sx,sy),
  // the resulting data coords, and which guides fired. Used both live (via
  // dragBoundFunc, so the item visibly clicks) and on commit.
  const snapNode = (
    item: EquipItem,
    fpw: number,
    toDataX: (nx: number) => number,
    localX: number,
    localY: number,
  ) => {
    const yData = localY / scale
    // re-home placement to the band being dragged into, and snap against THAT
    // band's edges/neighbours (so a cross-aisle drag isn't pulled back)
    const placement = placementForDrop(yData, footprint(item).d, item.placement, bar)
    const target = placement === item.placement ? item : { ...item, placement }
    const s = snapPlacement({ x: snap(toDataX(localX)), y: snap(yData) }, target, items, bar)
    return { sx: dataXToNode(s.x, fpw), sy: s.y * scale, dataX: s.x, dataY: s.y, snappedX: s.snappedX, snappedY: s.snappedY, placement }
  }

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const apply = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
    }
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    apply()
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    planSnapshot.get = () => stageRef.current?.toDataURL({ pixelRatio: 2 })
    return () => {
      planSnapshot.get = null
    }
  }, [])

  const bands = yBands(bar)
  const cols = collisions(items)
  const warnedIds = new Set<string>()
  cols.forEach((c) => {
    warnedIds.add(c.aId)
    warnedIds.add(c.bId)
  })
  items.forEach((i) => {
    if (isOverhang(i, bar)) warnedIds.add(i.id)
  })

  const toMm = () => {
    const stage = stageRef.current
    if (!stage) return null
    const p = stage.getPointerPosition()
    if (!p) return null
    const localX = (p.x - pan.x) / scale
    return { x: flipX ? worldWmm - localX - ox : localX - ox, y: (p.y - pan.y) / scale }
  }

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const dir = e.evt.deltaY > 0 ? 0.9 : 1.1
    setZoom((z) => Math.min(6, Math.max(0.4, z * dir)))
  }

  const idx = itemIndexMap(items)
  const visible = items.filter((i) => !i.hidden && !i.archived && (i.placement !== 'overhead' || showOverhead))

  // Never mount a Konva Stage at 0×0 — drawing a zero-size canvas throws in
  // Konva's async draw loop (uncatchable by React) and would blank the app.
  const sized = size.w > 1 && size.h > 1

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-paper">
      {sized && (
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        draggable
        x={pan.x}
        y={pan.y}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) setPan({ x: e.target.x(), y: e.target.y() })
        }}
        onWheel={onWheel}
        onMouseMove={() => {
          const m = toMm()
          if (m) setCursor(Math.round(m.x), Math.round(m.y))
        }}
        onMouseLeave={() => setCursor(null, null)}
        onClick={(e) => {
          if (e.target === stageRef.current) select(null)
        }}
        onTap={(e) => {
          if (e.target === stageRef.current) select(null)
        }}
      >
        <Layer>
          {/* ── BAR STRUCTURE (floor plan, SP185 A.07 — dish-drop/return WEST) ── */}
          {/* return / gas strip (west in data; flips with the toggle) */}
          <Rect x={rx(-westExt, westExt)} y={mm(0)} width={mm(westExt)} height={mm(worldHmm)} fill="#E8E5DC" stroke={PALETTE.stone} strokeWidth={0.4} />
          <Text x={rx(-westExt, westExt) + 6} y={mm(6)} text="RETURN · gas" fontSize={9} fill={PALETTE.stone} />

          {/* standing side-bar along the north edge */}
          <Rect x={rx(bar.frontLen - bar.backLen, bar.backLen)} y={mm(bands.backEnd)} width={mm(bar.backLen)} height={mm(110)} fill="#F0EDE4" stroke={PALETTE.stone} strokeWidth={0.4} />
          <Text x={rx(bar.frontLen - bar.backLen, bar.backLen) + 6} y={mm(bands.backEnd) + 2} text="STANDING SIDE-BAR" fontSize={9} fill={PALETTE.stone} />

          {/* back-of-bar counter (extends to the dish drop) */}
          <Rect x={rx(bar.frontLen - bar.backLen, bar.backLen)} y={mm(bands.backStart)} width={mm(bar.backLen)} height={mm(bar.backDepth)} fill="#ECEAE3" stroke={PALETTE.ink} strokeWidth={1.3} />
          <Text x={rx(bar.frontLen - bar.backLen, bar.backLen) + 6} y={mm(bands.backStart) + 4} text="BACK-OF-BAR · engine wall" fontSize={10} fill={PALETTE.stone} />

          {/* dish drop at the kitchen end */}
          <Rect x={rx(bar.frontLen - bar.backLen, 360)} y={mm(bands.backStart) - mm(360)} width={mm(360)} height={mm(360)} fill="#E2DED3" stroke={PALETTE.ink} strokeWidth={0.9} cornerRadius={mm(60)} />
          <Text x={rx(bar.frontLen - bar.backLen, 360) + 6} y={mm(bands.backStart) - mm(340)} text="DISH DROP" fontSize={9} fill={PALETTE.stone} />

          {/* staff aisle */}
          <Rect x={rx(0, bar.frontLen)} y={mm(bands.aisleStart)} width={mm(bar.frontLen)} height={mm(bar.aisle)} fill="#F5F3ED" stroke={PALETTE.ink} strokeWidth={0.4} />

          {/* front bar counter (1100H) */}
          <Rect x={rx(0, bar.frontLen)} y={mm(bands.frontStart)} width={mm(bar.frontLen)} height={mm(bar.frontDepth)} fill="#ECEAE3" stroke={PALETTE.ink} strokeWidth={1.3} />
          <Text x={rx(0, bar.frontLen) + 6} y={mm(bands.frontStart) + 4} text="FRONT BAR · 1100H" fontSize={10} fill={PALETTE.stone} />
          {/* 900 datum on the front bar (the guest-facing low counter line) */}
          <Line
            points={[rx(0, bar.frontLen), mm(bands.frontEnd) - 1, rx(0, bar.frontLen) + mm(bar.frontLen), mm(bands.frontEnd) - 1]}
            stroke={PALETTE.ochre}
            strokeWidth={1}
            dash={[5, 4]}
            listening={false}
          />
          <Text x={rx(0, bar.frontLen) + 6} y={mm(bands.frontEnd) - 13} text="900 datum" fontSize={9} fill={PALETTE.ochre} listening={false} />

          {/* front zone dividers + per-zone dims */}
          {FRONT_ZONES.map((z) => (
            <Group key={z.label} listening={false}>
              <Line points={[px(z.x1), mm(bands.frontStart), px(z.x1), mm(bands.frontEnd)]} stroke={PALETTE.stone} dash={[4, 4]} strokeWidth={1} />
              <Text x={rx(z.x0, z.x1 - z.x0) + 4} y={mm(bands.frontEnd) - 14} width={mm(z.x1 - z.x0) - 8} text={`${z.label} ${z.x1 - z.x0}`} fontSize={9} fill={PALETTE.stone} />
            </Group>
          ))}

          {/* dimension lines (in the aisle band) */}
          <HDim px={px} x0={0} x1={bar.frontLen} yPx={mm(bands.frontEnd) + 16} label={`FRONT ${bar.frontLen.toLocaleString()}`} ticks={[1130, 3430]} />
          <HDim px={px} x0={bar.frontLen - bar.backLen} x1={bar.frontLen} yPx={mm(bands.backStart) - 14} label={`BACK ${bar.backLen.toLocaleString()}`} />
          <Line points={[px(bar.frontLen) + 12, mm(bands.aisleStart), px(bar.frontLen) + 12, mm(bands.aisleEnd)]} stroke={PALETTE.stone} strokeWidth={0.75} />
          <Text x={px(bar.frontLen) + 16} y={mm(bands.aisleStart) + mm(bar.aisle) / 2 - 6} text={`aisle ${bar.aisle}`} fontSize={9} fill={PALETTE.stone} />

          {/* equipment */}
          {visible.map((it) => {
            const fpw = footprint(it).w
            const leftPx = rx(it.x, fpw)
            const toDataX = (nodeXpx: number) => (flipX ? worldWmm - nodeXpx / scale - fpw - ox : nodeXpx / scale - ox)
            return (
              <PlanItem
                key={it.id}
                item={it}
                n={idx.get(it.id) ?? 0}
                scale={scale}
                leftPx={leftPx}
                locked={isLocked(it)}
                selected={selectedId === it.id}
                warned={warnedIds.has(it.id)}
                onSelect={() => select(it.id)}
                // live magnetic snap: constrain the drag to snapped positions
                // (abs↔local via pan) so the item visibly clicks to run edges,
                // the 1130/3430 zone lines, bench edges + neighbours (20mm gap).
                dragBoundFunc={(pos) => {
                  const r = snapNode(it, fpw, toDataX, pos.x - pan.x, pos.y - pan.y)
                  return { x: r.sx + pan.x, y: r.sy + pan.y }
                }}
                onDragMove={(node) => {
                  const r = snapNode(it, fpw, toDataX, node.x(), node.y())
                  setGuide({ x: r.snappedX ? node.x() : null, y: r.snappedY ? node.y() : null })
                  setReadout(`${it.label}  ·  x ${r.dataX}  y ${r.dataY}  ·  ${it.w}×${it.d}mm`)
                }}
                onDragEnd={(node) => {
                  const r = snapNode(it, fpw, toDataX, node.x(), node.y())
                  setGuide({ x: null, y: null })
                  setReadout(null)
                  updateItem(
                    it.id,
                    r.placement === it.placement
                      ? { x: r.dataX, y: r.dataY }
                      : { x: r.dataX, y: r.dataY, placement: r.placement },
                  )
                }}
              />
            )
          })}

          {/* live snap guides (during a drag) */}
          {guide.x !== null && (
            <Line points={[guide.x, mm(0), guide.x, mm(worldHmm)]} stroke={PALETTE.ochre} strokeWidth={1} dash={[4, 4]} listening={false} />
          )}
          {guide.y !== null && (
            <Line
              points={[Math.min(px(-westExt), px(bar.frontLen)), guide.y, Math.max(px(-westExt), px(bar.frontLen)), guide.y]}
              stroke={PALETTE.ochre}
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          )}

          {/* other users' cursors */}
          {presence.map((p) =>
            p.state.cursor ? (
              <Group key={p.id} x={X(p.state.cursor.x)} y={mm(p.state.cursor.y)} listening={false}>
                <Circle radius={5} fill={p.state.color} />
                <Label x={8} y={-6}>
                  <Tag fill={p.state.color} cornerRadius={3} />
                  <Text text={p.state.name} fontSize={11} fill="#fff" padding={3} />
                </Label>
              </Group>
            ) : null,
          )}
        </Layer>
      </Stage>
      )}

      {/* HUD */}
      <ScaleBar scale={scale} />
      <div className="pointer-events-none absolute right-3 top-3 rounded bg-ink/80 px-2 py-1 text-[11px] text-paper">
        {readout ?? `${worldWmm}×${worldHmm}mm envelope`}
      </div>
      <div className="absolute bottom-3 right-3 flex gap-1">
        <HudBtn onClick={() => setZoom((z) => Math.min(6, z * 1.2))}>+</HudBtn>
        <HudBtn onClick={() => setZoom((z) => Math.max(0.4, z / 1.2))}>−</HudBtn>
        <HudBtn onClick={() => { setZoom(1); setPan({ x: 40, y: 40 }) }}>fit</HudBtn>
      </div>
    </div>
  )
}

function PlanItem({
  item,
  n,
  scale,
  leftPx,
  locked,
  selected,
  warned,
  onSelect,
  dragBoundFunc,
  onDragMove,
  onDragEnd,
}: {
  item: EquipItem
  n: number
  scale: number
  leftPx: number
  locked: boolean
  selected: boolean
  warned: boolean
  onSelect: () => void
  dragBoundFunc: (pos: Konva.Vector2d) => Konva.Vector2d
  onDragMove: (node: Konva.Node) => void
  onDragEnd: (node: Konva.Node) => void
}) {
  const fp = footprint(item)
  const mm = (v: number) => v * scale
  const w = mm(fp.w)
  const h = mm(fp.d)
  const stroke = warned ? '#B0764F' : PALETTE.ink
  // Numbered tag (matches the schedule) keeps the plan readable — no stacked
  // labels. The selected item gets its full name floated above it.
  const badge = Math.max(11, Math.min(18, Math.min(w, h) * 0.4))
  return (
    <Group
      x={leftPx}
      y={mm(item.y)}
      draggable={!locked}
      dragBoundFunc={dragBoundFunc}
      onMouseDown={(e) => (e.cancelBubble = true)}
      onClick={(e) => {
        e.cancelBubble = true
        onSelect()
      }}
      onTap={(e) => {
        e.cancelBubble = true
        onSelect()
      }}
      onDblClick={(e) => {
        e.cancelBubble = true
        if (!locked) updateItem(item.id, { rot: (item.rot + 90) % 360 })
      }}
      onDblTap={(e) => {
        e.cancelBubble = true
        if (!locked) updateItem(item.id, { rot: (item.rot + 90) % 360 })
      }}
      onDragStart={(e) => (e.cancelBubble = true)}
      onDragMove={(e) => onDragMove(e.target)}
      onDragEnd={(e) => onDragEnd(e.target)}
    >
      <Rect
        width={w}
        height={h}
        fill={item.color}
        opacity={item.fixture ? 0.16 : 0.4}
        stroke={stroke}
        strokeWidth={selected ? 2.5 : warned ? 2 : 0.9}
        cornerRadius={1}
        dash={item.placement === 'overhead' ? [6, 4] : undefined}
      />
      {/* number badge (centre) */}
      {w > 14 && h > 14 && (
        <Text
          text={String(n)}
          x={0}
          y={h / 2 - badge / 2}
          width={w}
          align="center"
          fontSize={badge}
          fontStyle="600"
          fill={selected ? PALETTE.ink : 'rgba(28,26,23,0.62)'}
          listening={false}
        />
      )}
      {/* full name only for the selected item, floated above */}
      {selected && (
        <Label x={0} y={-18}>
          <Tag fill={PALETTE.ink} cornerRadius={3} />
          <Text text={`${n} · ${item.label}`} fontSize={11} fill="#fff" padding={3} />
        </Label>
      )}
    </Group>
  )
}

function HDim({ px, x0, x1, yPx, label, ticks }: { px: (v: number) => number; x0: number; x1: number; yPx: number; label: string; ticks?: number[] }) {
  const allTicks = [x0, x1, ...(ticks ?? [])]
  const a = px(x0)
  const b = px(x1)
  const left = Math.min(a, b)
  return (
    <Group listening={false}>
      <Line points={[a, yPx, b, yPx]} stroke={PALETTE.stone} strokeWidth={0.75} />
      {allTicks.map((t, i) => (
        <Line key={i} points={[px(t), yPx - 4, px(t), yPx + 4]} stroke={PALETTE.stone} strokeWidth={0.75} />
      ))}
      <Text x={left} y={yPx - 13} width={Math.abs(b - a)} align="center" text={label} fontSize={9} fill={PALETTE.stone} />
    </Group>
  )
}

function ScaleBar({ scale }: { scale: number }) {
  // pick a round mm length whose pixel width is ~80px
  const targets = [100, 250, 500, 1000, 2000]
  const mmLen = targets.reduce((best, t) => (Math.abs(t * scale - 80) < Math.abs(best * scale - 80) ? t : best), 100)
  const px = mmLen * scale
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 text-[11px] text-ink/70">
      <div className="h-2 border-x border-b border-ink/60" style={{ width: px }} />
      <span>{mmLen >= 1000 ? `${mmLen / 1000}m` : `${mmLen}mm`}</span>
    </div>
  )
}

function HudBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-8 w-8 rounded border border-stone/40 bg-paper/90 text-sm text-ink shadow-panel hover:bg-white"
    >
      {children}
    </button>
  )
}
