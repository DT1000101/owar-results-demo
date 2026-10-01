# Test release: seeding + staggered bracket UI (`0.9.0-test.1`)

Branch: `test/dan-seeding-bracket` (does **not** change `main`).

## What this adds (frontend only)

- `/seeding/` board (Open Q1/Q2 vs Women/Groms single session copy)
- Knockout projection: Seed N / `1st place H1` placeholders → fill as RaceTec results arrive
- Staggered start columns on live results
- Open label (maps RaceTec “Open Men” → Open)

## Live updates (same cadence as existing results)

Adam’s importer still polls the RDF every ~30s — **unchanged**.

The new UI polls `/api/public/events` (+ per-event `/results`) every **15s** (same as the live board):

1. Detect seeding/qual sessions by name (`Q1`/`Q2`/`seed`/`qualif`/…)
2. Rebuild seed list from fastest laps (Open Q1→seeds 17–32, Q2→1–16)
3. Recompute heat grids + up-next placeholders from those seeds + finished heats

Optional fallback file: `dist/data/seeds.json` (empty by default). Live RaceTec seeding events win when present.

## How to try on Byte-Me

```bash
git fetch origin
git checkout test/dan-seeding-bracket
# or: git checkout v0.9.0-test.1
docker compose up -d --build
```

Open `/` and `/seeding/`. When happy, merge to `main` (or cherry-pick) in a normal release.
