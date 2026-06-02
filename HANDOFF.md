# Fletcher's Bar Builder — Handoff (CO-STAR)

> Hand this to a fresh Claude Code session to continue the build. Self-contained.

## (C) CONTEXT
In-progress build for **Hugh (Kokomo Social)** — **"Fletcher's — Bar Builder"**, a collaborative 2D/3D bar-design tool for **Fellow Hospitality**, 31A Fletcher St, Byron Bay. Two users (Hugh + **Monique, Studio Plenty**) open a shared live link and arrange bar equipment against the architect's plans.

- **Code:** `/Users/mac/Desktop/fletchers-bar-builder`
- **Live:** https://fletchers-bar-builder.netlify.app/?room=fletchers-bar
- **Stack:** React + Vite + TypeScript · Konva (2D) · react-three-fiber + drei (3D) · **Yjs** CRDT (pluggable provider) · Tailwind (muted CAD palette) · jsPDF/CSV export.
- **Realtime + persistence:** **Supabase Realtime** broadcast + `bar_rooms` Postgres snapshot table. Supabase = the **InnerLoom** project `https://erxxbmwxxhrabjiamfvt.supabase.co`, publishable key `sb_publishable_GXQRfX2RCwszaKuR19kEYQ_9wfPoTvI` (public/anon — safe in client). ⚠️ co-located on InnerLoom's backend; dedicated project is the clean long-term fix.
- **Hosting:** Netlify team `hugh-payten-smith`, **site id `01bdcba2-1a52-4554-b27f-c5b4023e9c42`**. Deploy via Netlify REST API zip-deploy (CLI won't install — native `sharp` fails on Node 24).
- **Plans = source of truth:** Studio Plenty **SP185_DD01** (13 sheets) at `public/assets/plans/sheet-01..13.png` + `public/assets/SP185_DD01.pdf` (orig in `~/Downloads/260527_SP185_DD01.pdf`). A.07 dims: front **3,730** (1130 Entertainment + 2300 Bar + 300 Drinks pass); back **4,610** (600 store +105 +390 drip-tray +105 +600 freezer +25 +400 ice +25 +1800 fridge/coffee +560 sink); bar 1100, bench 900.

**Functional now (deployed):** 2D plan; 3D; editable **N/S/E/W elevations** (drag along wall + vertically to set height); per-item **placement layer + vertical anchor** (Floor/On bench/Under benchtop/Auto via `z?:number`); **visibility toggle** (`hidden?`); **rename**; **add (incl. blank)/delete**; **numbered badges** matching a numbered schedule (declutter); live cursors; comments; named versions; CSV/PDF/PNG export; **Reference drawer** with all 13 sheets.

**Default layout = Hugh's saved arrangement** (his choice over a plan-accurate set). `SEED_VERSION = 5` in `src/sync/store.ts`. Plan-accurate set lives in git history / session log if he wants to switch. `SHELL_VERSION = 1` migrates back-bar to 4610 without wiping items.

## (O) OBJECTIVE
Keep iterating to Hugh's feedback, faithful to SP185, **never destroying his saved arrangement**. Open items:
1. Confirm latest deploy renders in a real browser (in-tool preview was broken).
2. Token hygiene: advise Hugh to **rotate** the Netlify + Supabase access tokens he pasted (runtime only needs the public publishable key).
3. Take new feature/fix requests.

## (S) STYLE
Senior full-stack engineer. Edit → **one** build → **separate** deploy. Verify against the live bundle (grep `dist/assets/index-*.js`) + HTTP 200s, not assumptions. Preserve Hugh's data — prefer in-place migrations (like `SHELL_VERSION`) over reseeds.

## (T) TONE
Direct, concise, honest. Flag limits/mistakes plainly. Confirm prod-touching or irreversible actions first.

## (A) AUDIENCE
A new Claude Code session on Hugh's Mac. Hugh: non-CAD, time-pressed, detail-driven, reviews in his own browser. Values plan accuracy + his arrangement persisting.

## (R) RESPONSE — operating rules learned the hard way
- ⚠️ **Local FS went unstable and silently ZEROED ~9 files** (`types.ts`, `sync/doc.ts`, `lib/export.ts`, `ErrorBoundary/Schedule/SidePanel/SpecCard.tsx`, `tsconfig.json`, `tailwind.config.ts`) + parts of `node_modules`. **Integrity-check all `src/**` + config files (Python byte-count) before every build** — a file can report bytes via `wc -c` yet read as 0 via `open().read()`. Symptoms: "Cannot find name Map/Set/Promise" = empty `tsconfig.json`; "Rollup can't resolve @react-three/drei" = corrupt `node_modules` (`rm -rf node_modules package-lock.json && npm install`). **Project is now under git** → `git status` / `git checkout -- <file>` to restore.
- **Never run parallel `npm run build`** (that caused the corruption). Build ~1–7 min; run once in background w/ generous timeout, **deploy as a separate command**.
- **Deploy:** `npm run build` → `cd dist && zip -qr ../x.zip .` → `POST api.netlify.com/api/v1/sites/01bdcba2-1a52-4554-b27f-c5b4023e9c42/deploys` (Bearer = Netlify token from Hugh, `Content-Type: application/zip`) → poll `state` until `ready`.
- **Change live room layout/shell:** clear its snapshot via Supabase Management API (needs Supabase access token from Hugh) and/or bump a version constant — but default to preserving Hugh's arrangement.
- In-tool **preview** was unreliable last session; verify via curl + ask Hugh to eyeball.
- Full running log: `/Users/mac/.claude/projects/-Users-mac-Desktop/memory/fletchers_bar_builder.md`.

Start: read the memory log, confirm the deploy is healthy, ask Hugh what's next.
