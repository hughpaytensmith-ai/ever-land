import type { EquipItem, Placement, Services, Space, Status } from '../types'

// ──────────────────────────────────────────────────────────────────────────
// DEFAULT LAYOUT = Hugh's saved arrangement (positions preserved), updated per
// his plan feedback: mirror deleted, 3 back shelves, full-width overhead,
// draught = 1 beer + 2 carbonated cocktails + 1 nitro (4 lines), sparkling
// water as a separate FRONT-bar station fed by a back-bar under-bench
// carbonator. Water/drain + carbonator run-length noted on the cards.
// ──────────────────────────────────────────────────────────────────────────

export const CATEGORY_COLOR = {
  entertainment: '#9E9683',
  coffee: '#7D7263',
  refrigeration: '#8A99A1',
  ice: '#8FB0A6',
  draught: '#B58A6A',
  wash: '#9A968C',
  cook: '#B5703F', // kitchen — heat (induction)
  prep: '#8A9B6E', // kitchen — prep (slicer, sandwich)
  fixture: '#CFC9BB',
} as const
type Category = keyof typeof CATEGORY_COLOR

interface Seed {
  id: string
  key: string
  label: string
  product: string
  w: number
  d: number
  h: number
  x: number
  y: number
  z?: number
  rot?: number
  placement: Placement
  zone: string
  cat: Category
  status?: Status
  services?: Services
  notes?: string
  fixture?: boolean
  price?: number
}

const SEEDS: Seed[] = [
  // ── FRONT BAR ────────────────────────────────────────────────────────────
  {
    id: 'ice-well', key: 'ice-well', label: 'Ice well (large)',
    product: 'Drop-in ice well',
    w: 1000, d: 400, h: 300, x: 1320, y: 50,
    placement: 'front-top', zone: 'Front · top', cat: 'ice',
    status: 'confirmed', services: { drain: true },
    notes: 'Fed from the ice machine. Drain required. Use the placement control to set on/under bench.',
  },
  {
    id: 'speed-rail', key: 'speed-rail', label: 'Speed rail',
    product: 'Stainless speed rail',
    w: 1290, d: 100, h: 100, x: 1300, y: 490,
    placement: 'front-top', zone: 'Front · top', cat: 'fixture',
    status: 'confirmed', services: {}, fixture: true,
  },
  {
    id: 'sparkling-station', key: 'sparkling-station', label: 'Sparkling water station',
    product: 'Front-bar sparkling-water tap (dedicated station). Fed by the back-bar under-bench inline carbonator via a short, insulated carbonated-water line.',
    w: 300, d: 300, h: 250, x: 3180, y: 60,
    placement: 'front-top', zone: 'Front · Drinks pass', cat: 'ice',
    status: 'confirmed', services: { water: true, drain: true, gas: 'CO2' },
    notes: 'WATER/DRAIN: needs a drip tray + drain. CARBONATOR RUN: keep the carbonated-water line from the back-bar carbonator SHORT — ideally < ~3–4 m, insulated, and as cold as possible, or carbonation drops and the pour foams. If the run must be longer, mount the carbonator/chiller closer or add a secondary chiller at the station.',
  },

  {
    id: 'wine-fridge', key: 'ub-fridge-2door', label: 'Wine & soft-drink fridge',
    product: '2-door under-bench fridge (Skope ReFlex / Williams / AG)',
    w: 1340, d: 600, h: 850, x: 2370, y: 20,
    placement: 'front-under', zone: 'Front · under', cat: 'refrigeration',
    status: 'confirmed', services: { power: '10A' },
  },
  {
    id: 'freezer', key: 'ub-freezer', label: 'Freezer',
    product: 'Under-bench freezer',
    w: 600, d: 600, h: 850, x: -20, y: 0,
    placement: 'front-under', zone: 'Front · under', cat: 'refrigeration',
    status: 'confirmed', services: { power: '10A' },
  },
  {
    id: 'glass-storage-front', key: 'glass-storage', label: 'Glass storage + drinks pass',
    product: 'Under-bench glass storage',
    w: 590, d: 600, h: 850, x: 610, y: 10,
    placement: 'front-under', zone: 'Front · Drinks pass', cat: 'fixture',
    status: 'proposed', services: {}, fixture: true,
  },

  // ── BACK-OF-BAR ───────────────────────────────────────────────────────────
  {
    id: 'coffee-fridge', key: 'ub-fridge-1door', label: 'Coffee / milk fridge',
    product: '1-door under-bench fridge — solid silver/black front',
    w: 600, d: 600, h: 850, x: 0, y: 1500,
    placement: 'back-under', zone: 'Back · coffee', cat: 'refrigeration',
    status: 'confirmed', services: { power: '10A' },
  },
  {
    id: 'glass-rack-1', key: 'glass-rack', label: 'Glass rack (under-bench)',
    product: 'Under-bench clean-glass rack storage',
    w: 500, d: 500, h: 850, x: 700, y: 1500,
    placement: 'back-under', zone: 'Back · coffee', cat: 'fixture',
    status: 'proposed', services: {},
  },
  {
    id: 'espresso', key: 'espresso', label: 'Espresso machine',
    product: 'La Marzocco Linea PB AV (2-group)',
    w: 710, d: 590, h: 533, x: 250, y: 1510,
    placement: 'back-bench', zone: 'Back · coffee', cat: 'coffee',
    status: 'confirmed', services: { power: '15A', water: true, drain: true },
    notes: 'Plumbed + drain. On the 1000mm back bench.',
  },
  {
    id: 'grinder', key: 'grinder', label: 'Grinder',
    product: 'Mazzer Major V',
    w: 190, d: 470, h: 640, x: 20, y: 1550,
    placement: 'back-bench', zone: 'Back · coffee', cat: 'coffee',
    status: 'confirmed', services: { power: '10A' },
  },
  {
    id: 'batch-brewer', key: 'batch-brewer', label: 'Batch / filter brewer',
    product: 'Marco SP9 / Moccamaster batch',
    w: 200, d: 450, h: 450, x: 990, y: 1570,
    placement: 'back-bench', zone: 'Back · coffee', cat: 'coffee',
    status: 'confirmed', services: { power: '15A', water: true },
    notes: 'Plumbed.',
  },
  {
    id: 'keg-fridge', key: 'keg-fridge', label: 'Keg fridge — 4 lines',
    product: 'Under-bench keg fridge feeding 4 draught lines: 1 beer · 2 carbonated cocktails · 1 nitro cold-brew/cocktail. Corny kegs, 2–4°C.',
    w: 1400, d: 600, h: 1000, x: 1350, y: 1500,
    placement: 'back-under', zone: 'Back · draught', cat: 'refrigeration',
    status: 'risk', services: { power: '10A', gas: 'CO2+N2' },
    notes:
      'DRAUGHT: 1 beer (~12psi CO₂) + 2 carbonated cocktails (~30–45psi CO₂, Perlick 650SS flow-control, stainless lines) + 1 nitro (separate N₂, stout/restrictor faucet). Sparkling water is NOT on this fridge — it is the front-bar station fed by the back-bar carbonator. Font directly above = short/direct draw (<1m, no glycol). FIT-RISK: purpose-built unit for the keg count; confirm with supplier. 1000mm back bench gives clearance.',
  },
  {
    id: 'font', key: 'font', label: 'Draught font — 4 taps',
    product: '4-tap font + drip tray: 1 beer · 2 carbonated cocktails · 1 nitro. Perlick 650SS flow-control on cocktail taps; stout/restrictor faucet on nitro.',
    w: 600, d: 120, h: 300, x: 1710, y: 1940,
    placement: 'back-wall', zone: 'Back · draught', cat: 'draught',
    status: 'confirmed', services: { drain: true, gas: 'CO2+N2' },
    notes: 'Drip tray drain. Two gases: CO₂ (beer + cocktails, secondary regulators per line) + separate N₂ (nitro). Directly above the keg fridge for a short draw.',
  },
  {
    id: 'carbonator', key: 'carbonator', label: 'Inline carbonator (sparkling)',
    product: 'Mains-water carbonator + chiller, back-bar UNDER-BENCH (KegLand Benchy / Water2Water / Soda Tap / Bluedrop). Feeds the front-bar sparkling-water station.',
    w: 300, d: 400, h: 450, x: 2200, y: 1500,
    placement: 'back-under', zone: 'Back · draught', cat: 'ice',
    status: 'confirmed', services: { power: '10A', water: true, drain: true, gas: 'CO2' },
    notes:
      'WATER/DRAIN: mains cold-water inlet + a drain nearby (and for the chiller condensate). CO₂ feed. DISTANCE: mount as close as practical to the front sparkling station — carbonated-water line ideally < ~3–4 m, insulated; the compressor/chiller wants ventilation + ~50mm clearance and to stay cool. Keep away from heat sources (espresso/glasswasher).',
  },
  // 3× back-bar open shelves (per A.05 East elevation — guessed spacing)
  {
    id: 'shelf-1', key: 'shelf', label: 'Back shelf 1 (low)',
    product: 'Open display shelf', w: 4610, d: 120, h: 30, x: -880, y: 1980, z:1200,
    placement: 'back-wall', zone: 'Back wall', cat: 'fixture', status: 'confirmed', services: {}, fixture: true,
  },
  {
    id: 'shelf-2', key: 'shelf', label: 'Back shelf 2 (mid)',
    product: 'Open display shelf', w: 4610, d: 120, h: 30, x: -880, y: 1980, z:1585,
    placement: 'back-wall', zone: 'Back wall', cat: 'fixture', status: 'confirmed', services: {}, fixture: true,
  },
  {
    id: 'shelf-3', key: 'shelf', label: 'Back shelf 3 (high)',
    product: 'Open display shelf', w: 4610, d: 120, h: 30, x: -880, y: 1980, z:1970,
    placement: 'back-wall', zone: 'Back wall', cat: 'fixture', status: 'confirmed', services: {}, fixture: true,
  },
  {
    // Stemware hung from the underside of shelf 1 (lowest, z1200), filling its
    // length in two runs that step around the draught font tower (x2120–2720).
    // Glasses drop ~280mm: top flush to the shelf underside at 1200 → base 920.
    id: 'wine-glass-racks-w', key: 'wine-glass-rack', label: 'Under-shelf wine glass racks (west run)',
    product: 'Avanti stemmed glass rack — triple-row 280mm, ganged ×10 under shelf 1 (~90 stems)',
    w: 2970, d: 120, h: 280, x: -880, y: 1980, z: 920,
    placement: 'back-wall', zone: 'Back wall', cat: 'fixture', status: 'proposed', services: {}, fixture: true,
    notes: 'Hanging stemware filling the underside of the lowest back shelf, west of the draught font. Price = 10 × ~$25 est — confirm unit price + count on Kitchen Warehouse (Avanti triple-row 28cm).',
  },
  {
    id: 'wine-glass-racks-e', key: 'wine-glass-rack', label: 'Under-shelf wine glass racks (east run)',
    product: 'Avanti stemmed glass rack — triple-row 280mm, ganged ×3 under shelf 1 (~27 stems)',
    w: 980, d: 120, h: 280, x: 2750, y: 1980, z: 920,
    placement: 'back-wall', zone: 'Back wall', cat: 'fixture', status: 'proposed', services: {}, fixture: true,
    notes: 'Hanging stemware filling the underside of the lowest back shelf, east of the draught font. Price = 3 × ~$25 est — confirm on Kitchen Warehouse (Avanti triple-row 28cm).',
  },
  {
    id: 'glasswasher', key: 'glasswasher', label: 'Glasswasher',
    product: 'Winterhalter UC-M Excellence-i — polish-free, integrated RO',
    w: 600, d: 600, h: 820, x: 2740, y: 1500,
    placement: 'back-under', zone: 'Back · wash (dish drop)', cat: 'wash',
    status: 'confirmed', services: { power: '15A', water: true, drain: true },
    notes: 'At the dish drop. Plumbed + drain; clean-glass racks under.',
  },
  {
    id: 'hand-sink', key: 'hand-sink', label: 'Hand sink',
    product: 'Stainless hand/prep sink',
    w: 400, d: 450, h: 850, x: 3340, y: 1500,
    placement: 'back-under', zone: 'Back · wash (dish drop)', cat: 'wash',
    status: 'confirmed', services: { water: true, drain: true },
    notes: 'Plumbed + drain.',
  },

  // ── PLANT / GAS ───────────────────────────────────────────────────────────
  {
    id: 'ice-machine', key: 'ice-machine', label: 'Ice machine',
    product: 'Hoshizaki IM-series square cuber, under-bench self-contained',
    w: 600, d: 600, h: 800, x: 2730, y: 1490,
    placement: 'plant', zone: 'Plant', cat: 'ice',
    status: 'risk', services: { power: '10A', water: true, drain: true },
    notes: 'WATER/DRAIN: mains water + drain. Vented; scoops to the front ice well. Confirm under-bench height with Hoshizaki AU.',
  },
  {
    id: 'co2', key: 'co2', label: 'CO₂ cylinder + regulator panel',
    product: 'CO₂ cyl → secondary regulators (per-line: beer / cocktails / carbonator)',
    w: 200, d: 200, h: 600, x: 3820, y: 300,
    placement: 'plant', zone: 'Plant', cat: 'draught',
    status: 'confirmed', services: { gas: 'CO2' },
  },
  {
    id: 'n2', key: 'n2', label: 'Nitrogen cylinder + regulator',
    product: 'Separate N₂ for the nitro line (NOT CO₂)',
    w: 180, d: 180, h: 580, x: 4080, y: 300,
    placement: 'plant', zone: 'Plant', cat: 'draught',
    status: 'confirmed', services: { gas: 'N2' },
  },

  // ── OVERHEAD — full-width joinery soffit ─────────────────────────────────
  {
    id: 'overhead', key: 'overhead', label: 'Overhead joinery (soffit)',
    product: 'Timber joinery soffit — speakers + AC + TV (concealed SHS, TBC builder). Runs the full length over the bar.',
    w: 3730, d: 700, h: 300, x: 0, y: 0,
    placement: 'overhead', zone: 'Overhead', cat: 'fixture',
    status: 'proposed', services: { power: '10A', data: true }, fixture: true,
    notes: 'Full-width soffit across the bar (per RCP / perspectives). Power + data to joinery.',
  },
]

// ──────────────────────────────────────────────────────────────────────────
// KITCHEN — laid out EXACTLY to A.07 (SP185 DD01, the build target). Footprint
// ≈ 3,900 × 2,000. Frame: x 0 (west / dish drop) → 3,900 (east); y 0 (south /
// FOOD PASS) → 2,000 (north / back wall). A.07 arrangement:
//   • BASINS (NW, against back wall): hand basin behind, wash basin in front —
//     the 700-wide × 870-deep unit.
//   • MAIN BENCH (runs east, against the back wall): U/B bins · U/B dishwasher ·
//     U/B store · FRIDGE ×2.
//   • EAST ALCOVE: induction (the 350 hob) + sandwich press.
//   • FOOD PASS (south): meat slicer on it; dish drop at the west.
// A.07 does NOT show a food-prep bench or salamander (those are only on the
// equipment schedule) — omitted here to match A.07. Fridges drawn under-bench
// per A.07 (the schedule's 1,850 uprights are noted as an alternative).
// ──────────────────────────────────────────────────────────────────────────
const A07 = 'Per Studio Plenty A.07 (DD01) — drag to refine.'
const KITCHEN_SEEDS: Seed[] = [
  // ── BASINS (NW, against the back wall) ───────────────────────────────────
  {
    id: 'k-hand-basin', key: 'hand-basin', label: 'Hand basin',
    product: 'Stainless hand-wash basin (per A.07)', price: 250,
    w: 400, d: 400, h: 250, x: 150, y: 40,
    placement: 'back-bench', zone: 'Kitchen · basins', cat: 'wash', status: 'proposed',
    services: { water: true, drain: true }, notes: `Hand basin, behind the wash basin (A.07 700×870 unit). ${A07}`,
  },
  {
    id: 'k-wash-basin', key: 'wash-sink', label: 'Wash basin',
    product: 'Single-bowl stainless wash basin, 304 SS (fits A.07 700-wide unit)', price: 650,
    w: 600, d: 450, h: 900, x: 60, y: 490,
    placement: 'back-under', zone: 'Kitchen · basins', cat: 'wash', status: 'proposed',
    services: { water: true, drain: true }, notes: `Wash basin, in front of the hand basin (A.07). ${A07}`,
  },
  // ── MAIN BENCH (back wall, west→east): bins · DW · store · fridge ×2 ─────
  {
    id: 'k-ub-bins', key: 'ub-bins', label: 'U/B bins',
    product: 'Under-bench waste/recycling bins (schedule: 300×400×600)',
    w: 300, d: 600, h: 600, x: 760, y: 40,
    placement: 'back-under', zone: 'Kitchen · main bench', cat: 'fixture', status: 'proposed',
    services: {}, fixture: true, notes: A07,
  },
  {
    id: 'k-dishwasher', key: 'dishwasher', label: 'Dishwasher (U/B)',
    product: 'Under-bench commercial dishwasher (schedule: 600×600×850). Real: Eswood UC25NDP (~$3,200).', price: 3200,
    w: 600, d: 600, h: 850, x: 1100, y: 40,
    placement: 'back-under', zone: 'Kitchen · main bench', cat: 'wash', status: 'proposed',
    services: { power: '15A', water: true, drain: true }, notes: `"U/B DW" on A.07. ${A07}`,
  },
  {
    id: 'k-ub-store', key: 'ub-store', label: 'U/B store',
    product: 'Under-bench storage cabinet (joinery)',
    w: 470, d: 600, h: 820, x: 1740, y: 40,
    placement: 'back-under', zone: 'Kitchen · main bench', cat: 'fixture', status: 'proposed',
    services: {}, fixture: true, notes: `"U/B STORE" on A.07. ${A07}`,
  },
  {
    id: 'k-fridge-1', key: 'food-fridge', label: 'Food fridge 1',
    product: 'Under-bench food fridge, 600 wide (A.07 shows under-bench; schedule alt: 600×600×1850 upright)', price: 2800,
    w: 600, d: 600, h: 850, x: 2250, y: 40,
    placement: 'back-under', zone: 'Kitchen · main bench', cat: 'refrigeration', status: 'proposed',
    services: { power: '10A' }, notes: `One of "FRIDGE X2" on A.07. ${A07}`,
  },
  {
    id: 'k-fridge-2', key: 'food-fridge', label: 'Food fridge 2',
    product: 'Under-bench food fridge, 600 wide (A.07 shows under-bench; schedule alt: 600×600×1850 upright)', price: 2800,
    w: 600, d: 600, h: 850, x: 2870, y: 40,
    placement: 'back-under', zone: 'Kitchen · main bench', cat: 'refrigeration', status: 'proposed',
    services: { power: '10A' }, notes: `One of "FRIDGE X2" on A.07. ${A07}`,
  },
  // ── EAST ALCOVE: induction (350) + sandwich press ───────────────────────
  {
    id: 'k-induction', key: 'induction-hub', label: 'Induction hub',
    product: 'Induction hub (schedule: 290–360×520×60; A.07 hob 350). Real: Roband Dipo / Cooktek class.', price: 1600,
    w: 350, d: 520, h: 60, x: 3520, y: 560,
    placement: 'back-bench', zone: 'Kitchen · east alcove', cat: 'cook', status: 'proposed',
    services: { power: '15A' }, notes: `The "350" hob in the east alcove on A.07. ${A07}`,
  },
  {
    id: 'k-sandwich', key: 'sandwich-press', label: 'Sandwich press',
    product: 'Commercial sandwich / panini press — bench unit (schedule: 420–500×350×200)', price: 450,
    w: 460, d: 350, h: 200, x: 3520, y: 40, rot: 90,
    placement: 'back-bench', zone: 'Kitchen · east alcove', cat: 'prep', status: 'proposed',
    services: { power: '15A' }, notes: `"SANDWICH" against the back wall, east alcove (A.07). ${A07}`,
  },
  // ── FOOD PASS (south): slicer ────────────────────────────────────────────
  {
    id: 'k-slicer', key: 'meat-slicer', label: 'Meat slicer',
    product: 'Bench gravity-feed meat slicer (schedule: 470×430×320). Real: Anvil/Noaw 220mm class.', price: 700,
    w: 470, d: 430, h: 320, x: 2300, y: 1550,
    placement: 'back-bench', zone: 'Kitchen · food pass', cat: 'prep', status: 'proposed',
    services: { power: '10A' }, notes: `On the FOOD PASS, per A.07. ${A07}`,
  },
]

function buildFrom(seeds: Seed[], space: Space): EquipItem[] {
  return seeds.map((s) => ({
    id: s.id,
    space,
    key: s.key,
    label: s.label,
    product: s.product,
    w: s.w,
    d: s.d,
    h: s.h,
    x: s.x,
    y: s.y,
    z: s.z,
    rot: s.rot ?? 0,
    placement: s.placement,
    zone: s.zone,
    status: s.status ?? 'proposed',
    price: s.price ?? null,
    services: s.services ?? {},
    color: CATEGORY_COLOR[s.cat],
    notes: s.notes,
    fixture: s.fixture,
  }))
}

export function buildDefaultItems(): EquipItem[] {
  return buildFrom(SEEDS, 'bar')
}
export function buildKitchenItems(): EquipItem[] {
  return buildFrom(KITCHEN_SEEDS, 'kitchen')
}

interface LibItem { key: string; label: string; w: number; d: number; h: number; color: string; placement: Placement }
function libFrom(seeds: Seed[]): LibItem[] {
  const seen = new Set<string>()
  const out: LibItem[] = []
  for (const s of seeds) {
    if (seen.has(s.key)) continue
    seen.add(s.key)
    out.push({ key: s.key, label: s.label, w: s.w, d: s.d, h: s.h, color: CATEGORY_COLOR[s.cat], placement: s.placement })
  }
  return out
}
const BAR_LIBRARY = libFrom(SEEDS)
const KITCHEN_LIBRARY = libFrom(KITCHEN_SEEDS)

/** Equipment palette for the "add a piece" dropdown, scoped to the active space. */
export function equipmentLibrary(space: Space): LibItem[] {
  return space === 'kitchen' ? KITCHEN_LIBRARY : BAR_LIBRARY
}
