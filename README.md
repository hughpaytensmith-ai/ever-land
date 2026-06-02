# Fletcher's — Bar Builder

A web-based **collaborative bar-design tool** for Fletcher's (Fellow Hospitality, 31A Fletcher St, Byron Bay). Two people (Hugh · Kokomo Social, and Monique · Studio Plenty) open a **shared live link** and refine a scaled model of the bar to confirm the equipment fits and lock the specs.

It ships pre-built with the **recommended default layout** and you drag to adjust. Two synced views of one shared layout:

- **2D top-down plan** — authoritative, scaled to the real drawings. Drag equipment; pieces snap to 10mm; collisions/overhangs flagged (softly).
- **3D box model** — orbitable Three.js view of the same bar + equipment as scaled volumes, to check heights, sightlines and the overhead joinery.

Place in 2D → updates in 3D. One shared state, two people live.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

The app boots straight into the **§6 default layout**, zone-labelled. No setup, no account.

### Build / preview

```bash
npm run build
npm run preview
```

---

## Realtime — local-first, websocket-ready

The collaboration layer is a vendor-neutral CRDT ([Yjs](https://yjs.dev)) behind a pluggable provider, so two people can drag at once and merge without conflict.

| Mode | When | What you get |
| --- | --- | --- |
| **Local** (default) | `VITE_SYNC_WS_URL` unset | Instant boot · IndexedDB persistence (reload-safe) · same-browser tabs sync live via BroadcastChannel |
| **WebSocket** | `VITE_SYNC_WS_URL` set | True **cross-device live link** — two machines, same room, live cursors + edits |

The "shared link" is just the URL — the `?room=…` id identifies the document. Copy it with the **Share link** button.

### Turn on the cross-device live link (self-hosted, $0)

No third-party account, no Liveblocks. Run a `y-websocket` server on your own infra (e.g. the Hetzner box, alongside n8n):

```bash
cd server
docker compose up -d        # listens on :1234
```

Terminate TLS at your reverse proxy and point the frontend at it:

```bash
cp .env.example .env
# .env
VITE_SYNC_WS_URL=wss://bar-sync.yourdomain.com
```

Rebuild/redeploy. Both users open the same `?room=…` link → live.

### Hosting the app

Static build → Vercel / Netlify free tier (you already use both). `npm run build` → deploy `dist/`.

---

## What's in the box

- **§6 default layout** seeded: open front cocktail station + DJ booth (Entertainment end, no compressor under), the back **engine wall** (coffee WEST · keg fridge + 5-tap font CENTRE · glasswasher + hand sink EAST), and the **plant corner** (ice machine + CO₂ + N₂ + carbonator) in the east return.
- **Editable bar shell** — drag the run lengths / depths / aisle. Fit warnings are **informational, never blocking**. **Export bar envelope** for the design team to build around.
- **Fit-risk / architecture cards** — keg fridge (purpose-built 6-corny), ice machine (L-cube height), draught (two gases, per-line pressures, direct draw, inline carbonator, nitro N₂), DJ vibration isolation, tight back-bar run.
- **Equipment schedule** — make/model/dims/services/price/status, editable, CSV/PDF export.
- **3D** mirrors every 2D placement, scaled, 1,100mm bar height respected.
- **Live** — cursors, presence, comments, autosave, named versions ("Option A/B").
- **Reference layer** — A.07 plan + concept renders (drop into `public/assets`).

## Assets (§12)

Drop these into `public/assets` (the app runs without them — tiles degrade gracefully):

- `A07-bar-plan.png` — Studio Plenty SP185_DD01 A.07 (primary)
- `view-from-bar-1.jpg`, `view-from-bar-2.jpg`, `kitchen.jpg`, `dining.jpg` — concept renders

## Tech

React + Vite + TypeScript · Konva (2D) · react-three-fiber + drei (3D) · Yjs + y-websocket / y-indexeddb (realtime) · Tailwind · jsPDF (export).

Bar dimensions and the equipment library live in editable config (`src/config/bar.ts`, `src/config/equipment.ts`) so non-devs can tweak them.

---

*Specs are verified-approximate from manufacturer/retailer listings — every card is marked "confirm with supplier" before ordering.*
