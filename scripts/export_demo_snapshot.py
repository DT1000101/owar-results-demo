#!/usr/bin/env python3
"""Export a static public-API snapshot for Vercel demos (no Python server needed)."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEST_RDF = ROOT.parent / "test-rdf"
EXPORT_DIR = Path("/tmp/owar-demo-export")
PORT = int(os.getenv("PORT", "6547"))
TOKEN = "dev-local-token"


def req(path: str, body=None):
    data = None if body is None else json.dumps(body).encode()
    r = urllib.request.Request(
        f"http://127.0.0.1:{PORT}{path}",
        data=data,
        method="GET" if body is None else "POST",
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(r, timeout=60) as res:
        return json.load(res)


def wait_up(timeout=20):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{PORT}/", timeout=1)
            return
        except Exception:
            time.sleep(0.2)
    raise RuntimeError("server did not start")


def bucket(name: str) -> str:
    n = name.lower()
    if n.startswith("wild") and "women" in n:
        return "Wild Women"
    if n.startswith("wild"):
        return "Wild Men"
    if "grom" in n:
        return "Groms"
    if "women" in n:
        return "Women"
    if n.startswith("men") or "men's" in n or "mens" in n:
        return "Open"
    return "Specials"


def map_events():
    d = req("/api/admin/status")
    events = d["events"]
    tournaments = {t["name"]: t["id"] for t in d["tournaments"]}
    levels = {}
    for l in d["levels"]:
        tn = next(t["name"] for t in d["tournaments"] if t["id"] == l["tournament_id"])
        levels[tn] = l["id"]

    for e in events:
        tname = bucket(e["name"])
        if tname not in tournaments:
            req("/api/admin/tournaments", {"name": tname})
            d = req("/api/admin/status")
            tournaments = {t["name"]: t["id"] for t in d["tournaments"]}
        if tname not in levels:
            req("/api/admin/levels", {"tournamentId": tournaments[tname], "name": "Bracket"})
            d = req("/api/admin/status")
            levels = {}
            for l in d["levels"]:
                tn = next(t["name"] for t in d["tournaments"] if t["id"] == l["tournament_id"])
                levels[tn] = l["id"]

    d = req("/api/admin/status")
    tournaments = {t["name"]: t["id"] for t in d["tournaments"]}
    levels = {}
    for l in d["levels"]:
        tn = next(t["name"] for t in d["tournaments"] if t["id"] == l["tournament_id"])
        levels[tn] = l["id"]
    race_map = {}
    for r in d["races"]:
        tn = next(t["name"] for t in d["tournaments"] if t["id"] == r["tournament_id"])
        race_map[(tn, r["name"])] = r

    for e in events:
        tname = bucket(e["name"])
        if (tname, e["name"]) not in race_map:
            req(
                "/api/admin/races",
                {"tournamentId": tournaments[tname], "levelId": levels[tname], "name": e["name"]},
            )
    d = req("/api/admin/status")
    race_map = {}
    for r in d["races"]:
        tn = next(t["name"] for t in d["tournaments"] if t["id"] == r["tournament_id"])
        race_map[(tn, r["name"])] = r

    assignments = [
        {
            "eventId": e["id"],
            "tournament": bucket(e["name"]),
            "level": "Bracket",
            "race": e["name"],
            "raceId": race_map[(bucket(e["name"]), e["name"])]["id"],
            "name": e["name"],
        }
        for e in events
    ]
    req("/api/admin/assignments", {"assignments": assignments})
    req("/api/admin/import-now", {})


def export_snapshot(out: Path):
    out.mkdir(parents=True, exist_ok=True)
    (out / "results").mkdir(exist_ok=True)
    events = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/public/events"))
    (out / "events.json").write_text(json.dumps(events, indent=2))
    riders = {}
    for e in events["events"]:
        eid = e["id"]
        safe = eid.replace(":", "_").replace("/", "_")
        results = json.load(
            urllib.request.urlopen(
                f"http://127.0.0.1:{PORT}/api/public/events/{urllib.parse.quote(eid, safe='')}/results"
            )
        )
        (out / "results" / f"{safe}.json").write_text(json.dumps(results, indent=2))
        for r in results:
            riders[str(r["athlete_id"])] = {"id": str(r["athlete_id"]), "name": r["name"], "bib": r.get("bib")}
    (out / "riders.json").write_text(json.dumps(list(riders.values()), indent=2))
    meta = {
        "eventCount": len(events["events"]),
        "finisherSlots": sum(e.get("count") or 0 for e in events["events"]),
        "riderCount": len(riders),
        "updatedAt": events.get("updatedAt"),
    }
    (out / "meta.json").write_text(json.dumps(meta, indent=2))
    print(json.dumps(meta))


def main():
    if len(sys.argv) < 3:
        print("usage: export_demo_snapshot.py <partial|full> <out-dir>")
        sys.exit(2)
    kind, out_s = sys.argv[1], sys.argv[2]
    rdf = TEST_RDF / (
        "OWAR2025-test-half-missing.rdf" if kind == "partial" else "OWAR2025.rdf"
    )
    if not rdf.exists():
        raise SystemExit(f"missing {rdf}")

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    target = EXPORT_DIR / "results.rdf"
    target.write_bytes(rdf.read_bytes())
    db = f"/tmp/owar-demo-{kind}.sqlite"
    Path(db).unlink(missing_ok=True)

    env = os.environ.copy()
    env.update(
        {
            "DATABASE_FILE": db,
            "RACE_EXPORT_DIR": str(EXPORT_DIR),
            "RACE_EXPORT_FILENAME": "results.rdf",
            "ADMIN_TOKEN": TOKEN,
            "PORT": str(PORT),
        }
    )
    log = Path(f"/tmp/owar-demo-{kind}.log")
    proc = subprocess.Popen(
        [sys.executable, str(ROOT / "server" / "app.py")],
        cwd=str(ROOT),
        env=env,
        stdout=log.open("w"),
        stderr=subprocess.STDOUT,
    )
    try:
        wait_up()
        req("/api/admin/import-now", {})
        map_events()
        export_snapshot(Path(out_s))
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    main()
