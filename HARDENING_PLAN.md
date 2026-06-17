# Fletcher's Bar Builder — Hardening & Team-Ready Plan (CO-STAR)

**Status:** awaiting Hugh's approval to execute · **Date:** 2026-06-17 · **Owner:** Kokomo (Hugh) + Claude

---

## (C) CONTEXT
Fletcher's Bar Builder is a live, multi-user 2D/3D bar-design tool (React + Konva + react-three-fiber + **Yjs** CRDT, persisted via **Supabase** snapshot + realtime broadcast, hosted on **GitHub Pages**). It's now shared with **Monique + colleagues**.

It has suffered **repeated silent data loss**. The Yjs operation history proves it: of 32 editing sessions, **~9 carry the ~491-op signature of a full re-seed** — i.e. roughly nine times a cold/slow page load **re-seeded the default layout over the saved room**, wiping the synced prices (~$52k schedule) and resetting items (the 1-door fridge → 2-door). There is currently **no audit log, no backups, and best-effort (silent) saving**. With more editors, the clobber fires more often.

## (O) OBJECTIVE
Make it **bulletproof for a team to open, edit, and save** — in one coordinated pass, then redeploy:
1. **Kill the seed-race** — a room that already has a saved layout can *never* be re-seeded/overwritten.
2. **Reliable autosave** with a visible status ("Saving… / Saved ✓ / Offline – retrying").
3. **Edit log** — persistent who + when + what, with an in-app **History** panel + a header "last edited by … " stamp.
4. **Automatic backups + one-click restore** — so any future mishap is recoverable in seconds.
5. **Restore/reconcile current data** — re-apply prices, confirm the 1-door fridge + glass rack, reconcile any stale item placements.
6. **Prove it** — cold-load test + 2-client concurrent-edit test + mobile, against the live build.
7. **Team usage note** + security hygiene (revoke pasted tokens).

## (S) STYLE
Senior, defensive full-stack. Snapshot-guarded seeding, append-only logs, **idempotent, non-destructive** migrations. One build → separate deploy → verify against the live bundle **and a real cold-load test**, never assumptions. Back up before touching prod data.

## (T) TONE
Direct, transparent about trade-offs and any residual risk.

## (A) AUDIENCE
Hugh (non-CAD, reviews in-browser) + Monique's design team (collaborative editors). This doc also doubles as a spec a future dev could pick up.

## (R) RESPONSE — the plan

### Root cause (technical)
`store.ts → bootstrap()` waits 1000 ms for the Supabase snapshot, then calls `ensureSeeded()`. `ensureSeeded` re-seeds when `items.length === 0` **or** `seedVersion` mismatches — and re-seeding does `items.delete(0, len)` then re-pushes defaults. On a slow/cold load the snapshot hasn't arrived in 1 s → `items.length === 0` → **it seeds and that state then saves/broadcasts over the good room.**

### Workstreams
| # | Fix | What / How | Files |
|---|-----|-----------|-------|
| 1 | **Seed-race elimination** | `SupabaseProvider.loadSnapshot()` resolves a `snapshotChecked` promise → `true` if a row existed (and was applied), `false` only if the server **confirms no row**; on error → **don't seed** (show "reconnecting"). `bootstrap()` awaits `snapshotChecked` (8 s cap) and seeds **only if `!snapshotExisted && items.length === 0`**. `ensureSeeded` becomes **append-only / empty-room-only**; version changes become **in-place migrations** (like the existing `migrateShell`) that never delete items. | `doc.ts`, `supabase.ts`, `store.ts` |
| 2 | **Reliable autosave + status** | `saveSnapshot` verifies the write, retries with backoff on failure, and emits a status. Header shows **Saving… / Saved ✓ / Offline – retrying**. Guard: a doc that is empty or just-seeded **never overwrites** a non-empty server snapshot. | `supabase.ts`, `store.ts`, `Header.tsx` |
| 3 | **Edit log (who/when/what)** | New append-only table `bar_edits(room, author, action, ts)`. Each committed mutation (drag-end, add, delete, rename, shell change) logs `{author = name, action summary, ts}` (debounced per gesture). New **History** panel (newest first) + header "last edited by X · 2m ago". | `supabase.sql`, `supabase.ts`, `store.ts`, `History.tsx`, `Header.tsx` |
| 4 | **Backups + restore** | Append-only `bar_room_backups(room, ts, state)` written on a throttle (e.g. ≤ every 10 min while editing) + a manual "Snapshot now". Standalone restore script (`scripts/restore.mjs <ts>`). Keeps the existing named "Versions" feature too. | `supabase.sql`, `supabase.ts`, `scripts/` |
| 5 | **Data restore/reconcile** | Re-apply equipment **prices** from the Google Sheet (`1GHey…`); confirm 1-door fridge + glass rack (done, will re-verify); one-time **reconcile stale `placement` → actual position** so 3D/elevations match the plan for items dragged before the position-fix. | `scripts/` (standalone, no reseed) |
| 6 | **Verification / system check** | See checklist below — cold-load (no clobber), 2-client concurrent merge + persist, save-status, edit-log writing, mobile tap/drag, all-views consistency, locked shelves/soffit, error boundaries. | — |
| 7 | **Team note + hygiene** | One-paragraph "how to use" for Monique's team (auto-saves, edit freely, history is tracked). **Revoke the 2 GitHub tokens** pasted in chat. | `README` / chat |

### Supabase schema (additive, safe — no change to `bar_rooms`)
```sql
create table if not exists bar_edits (
  id bigint generated always as identity primary key,
  room text not null, author text, action text, ts timestamptz default now());
create index if not exists bar_edits_room_ts on bar_edits(room, ts desc);

create table if not exists bar_room_backups (
  id bigint generated always as identity primary key,
  room text not null, state text not null, ts timestamptz default now());
create index if not exists bar_backups_room_ts on bar_room_backups(room, ts desc);
-- RLS: allow anon insert/select (matches the app's existing anon access to bar_rooms)
```

### Execution sequence (one swoop)
0. **Back up** the live room now (✔ have `/tmp/fbb-backup-2026-06-17.b64`); snapshot again right before deploy.
1. Create the two Supabase tables (SQL above).
2. Implement WS 1–4 in code (sync layer + Header + History).
3. **One** `tsc + vite` build → smoke-test locally (cold-load + 2-tab concurrent) → **deploy to GitHub Pages** → verify live bundle sha + cold-load.
4. Run data scripts (WS 5): prices, placement reconcile, re-verify fridge/rack.
5. Full verification checklist (below).
6. Post team note; you revoke tokens.

### System-check / "bulletproof" checklist (acceptance criteria)
- [ ] Cold load with throttled network **never** re-seeds a saved room (simulate slow snapshot).
- [ ] Two browsers editing simultaneously → changes merge, both persist, neither clobbers.
- [ ] Kill network mid-edit → status shows "Offline – retrying" → reconnect → saves.
- [ ] Reopen on a fresh device → sees the latest saved layout (not defaults).
- [ ] Every edit appears in History with author + time; header shows "last edited by".
- [ ] Backup row written; `restore.mjs` round-trips a backup successfully.
- [ ] Prices present + correct; fridge = 1-door; glass rack present.
- [ ] Plan = 3D = N/S/E/W consistent; shelves/soffit locked; mobile tap-to-select + drag work.
- [ ] No console errors; 3D error boundary intact.

### Decisions needed from you (so the "one swoop" lands right)
1. **Canonical layout to protect:** the room's been edited a lot — is the **current arrangement the one to lock in**, or should I restore a specific earlier state first? (Once hardened, whatever's there becomes the protected truth.)
2. **DJ booth + garnish rail** are deleted — **on purpose by the team, or restore them?**
3. **Prices:** re-pull from the **Google Sheet** as the source of truth? (Confirm the sheet is current.)
4. **Edit-log + backups tables** live on the shared InnerLoom Supabase project (as `bar_rooms` already does). OK, or spin up a **dedicated Supabase project** for Fletcher's now (cleaner, ~20 min extra)?

### Risks / rollback
- All code changes are additive/guarded; deploy is to `gh-pages` (instant rollback by re-pushing the prior build — `main` history has it).
- Data scripts run **after** a fresh backup; `restore.mjs` reverts any step.
- Residual: the public anon key still allows anyone with the link+key to write (fine for a private team tool; a dedicated project + RLS/auth is the longer-term hardening if you want it).
