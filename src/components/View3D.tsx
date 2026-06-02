import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, Billboard, Text } from '@react-three/drei'
import { useItems, useBar } from '../sync/store'
import { useUI } from '../lib/ui'
import { footprint, baseHeight } from '../lib/geometry'
import { totalDepth } from '../config/bar'
import { STATUS_COLOR, PALETTE } from '../config/theme'
import type { BarShell, EquipItem } from '../types'
import { threeSnapshot } from '../lib/snapshot'

const S = 0.001 // mm → metres

const baseY = baseHeight

function SnapshotBridge() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    threeSnapshot.get = () => gl.domElement.toDataURL('image/png')
    return () => {
      threeSnapshot.get = null
    }
  }, [gl])
  return null
}

function Box({ item, bar, selected, onSelect }: { item: EquipItem; bar: BarShell; selected: boolean; onSelect: () => void }) {
  const fp = footprint(item)
  const cx = (item.x + fp.w / 2) * S
  const cz = (item.y + fp.d / 2) * S
  const by = baseY(item, bar)
  const cy = (by + item.h / 2) * S
  const color = STATUS_COLOR[item.status]
  return (
    <group position={[cx, cy, cz]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        castShadow
      >
        <boxGeometry args={[fp.w * S, item.h * S, fp.d * S]} />
        {/* solid kit is OPAQUE — keeps it out of the transparency sort pass that
            was flickering on orbit; only the faint fixtures stay see-through */}
        <meshStandardMaterial
          color={color}
          transparent={item.fixture}
          opacity={item.fixture ? 0.4 : 1}
          emissive={selected ? PALETTE.ochre : '#000000'}
          emissiveIntensity={selected ? 0.5 : 0}
        />
      </mesh>
      {!item.fixture && (
        <Billboard position={[0, (item.h / 2) * S + 0.08, 0]}>
          <Text fontSize={0.06} color={PALETTE.ink} anchorX="center" anchorY="bottom" maxWidth={1}>
            {item.label}
          </Text>
        </Billboard>
      )}
    </group>
  )
}

function BarShellMesh({ bar }: { bar: BarShell }) {
  // The back run is longer than the front and starts WEST of x=0 (matches the
  // plan + the back equipment). Previously the bench was drawn from x=0, so it
  // overhung east and left the west kit uncovered — reading as a return on BOTH
  // ends. Anchor it to the real back-run start instead.
  const backX0 = bar.frontLen - bar.backLen
  const aisleZ = bar.frontDepth + bar.aisle
  return (
    <group>
      {/* front bar counter */}
      <mesh position={[(bar.frontLen / 2) * S, (bar.frontHeight / 2) * S, (bar.frontDepth / 2) * S]}>
        <boxGeometry args={[bar.frontLen * S, bar.frontHeight * S, bar.frontDepth * S]} />
        {/* depthWrite off so the translucent shell never z-fights the kit inside */}
        <meshStandardMaterial color={PALETTE.walnut} transparent opacity={0.12} depthWrite={false} />
      </mesh>
      {/* back bar bench — aligned to the back run (west start, like the plan) */}
      <mesh position={[(backX0 + bar.backLen / 2) * S, (900 / 2) * S, (aisleZ + bar.backDepth / 2) * S]}>
        <boxGeometry args={[bar.backLen * S, 900 * S, bar.backDepth * S]} />
        <meshStandardMaterial color={PALETTE.walnut} transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  )
}

export default function View3D() {
  const items = useItems()
  const bar = useBar()
  const { selectedId, select } = useUI()
  const showOverhead = useUI((s) => s.showOverhead)

  // The model spans from the back run's west start to the east return; recenter
  // on the true mid-point so it sits on the origin (not skewed off to one side).
  const minX = Math.min(0, bar.frontLen - bar.backLen)
  const maxX = bar.frontLen + bar.eastReturn
  const worldD = totalDepth(bar)
  const offset: [number, number, number] = [(-(minX + maxX) / 2) * S, 0, (-worldD / 2) * S]

  const visible = items.filter((i) => !i.hidden && !i.archived && (i.placement !== 'overhead' || showOverhead))

  return (
    <div className="h-full w-full bg-[#ECE7DA]">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true, antialias: true, powerPreference: 'default', failIfMajorPerformanceCaveat: false }}
        camera={{ position: [3, 3.2, 4], fov: 45 }}
        onPointerMissed={() => select(null)}
      >
        <SnapshotBridge />
        <color attach="background" args={['#ECE7DA']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 8, 5]} intensity={1.1} castShadow />
        <directionalLight position={[-4, 3, -2]} intensity={0.3} />

        <group position={offset}>
          <BarShellMesh bar={bar} />
          {visible.map((it) => (
            <Box key={it.id} item={it} bar={bar} selected={selectedId === it.id} onSelect={() => select(it.id)} />
          ))}
        </group>

        <Grid
          args={[20, 20]}
          cellSize={0.5}
          cellColor="#C9C2B2"
          sectionSize={2}
          sectionColor="#9A968C"
          infiniteGrid
          fadeDistance={28}
          position={[0, 0, 0]}
        />
        <OrbitControls makeDefault enableDamping target={[0, 0.5, 0]} />
      </Canvas>
    </div>
  )
}
