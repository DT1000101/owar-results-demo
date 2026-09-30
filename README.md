# OWAR Results Demo

UI polish + seeding board on top of [adamrfreeman644/Results-Page](https://github.com/adamrfreeman644/Results-Page).

This fork is for **static Vercel previews** using RaceTec RDF snapshots (not live Byte-Me timing).

## Preview branches

| Branch | Data | Purpose |
|--------|------|---------|
| `demo/partial-data` | Incomplete OWAR2025 export | Validate “up next” / NA finish rows |
| `demo/full-data` | Complete OWAR2025 export | Validate full weekend boards |

## Local static preview

```bash
# after checking out a demo branch
cd dist && python3 -m http.server 4173
# open http://127.0.0.1:4173/
```

`demo-config.js` enables the static API shim (`demo-api.js`).

## Rebuild snapshots from RDF

```bash
# requires the RDF files in ../test-rdf/
python3 scripts/export_demo_snapshot.py partial /tmp/snap-partial
python3 scripts/export_demo_snapshot.py full /tmp/snap-full
```

## Original live stack

Adam’s production path remains RaceTec → private folder → Python/SQLite on Byte-Me. This demo does not replace that.
