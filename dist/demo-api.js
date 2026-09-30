/** Static-demo API shim for Vercel (no Python server). */
(function () {
  if (!window.OWAR_DEMO || !window.OWAR_DEMO.enabled) return;
  const base = (window.OWAR_DEMO.dataBase || "/demo-data").replace(/\/$/, "");
  const originalFetch = window.fetch.bind(window);

  function safeId(id) {
    return String(id).replace(/:/g, "_").replace(/\//g, "_");
  }

  function rewrite(url) {
    const u = typeof url === "string" ? url : url.url;
    const path = u.replace(/^https?:\/\/[^/]+/, "");
    if (path === "/api/public/events" || path.startsWith("/api/public/events?")) {
      return base + "/events.json";
    }
    const results = path.match(/^\/api\/public\/events\/([^/]+)\/results\/?$/);
    if (results) {
      return base + "/results/" + safeId(decodeURIComponent(results[1])) + ".json";
    }
    const search = path.match(/^\/api\/public\/riders\/search\/?\?(.*)$/);
    if (search) {
      return { kind: "search", query: new URLSearchParams(search[1]).get("name") || "" };
    }
    const rider = path.match(/^\/api\/public\/riders\/([^/?]+)\/?$/);
    if (rider) {
      return { kind: "rider", id: decodeURIComponent(rider[1]) };
    }
    return null;
  }

  async function loadRiders() {
    if (window.__OWAR_RIDERS) return window.__OWAR_RIDERS;
    const rows = await originalFetch(base + "/riders.json", { cache: "no-store" }).then((r) => r.json());
    window.__OWAR_RIDERS = rows;
    return rows;
  }

  function matchName(a, b) {
    return String(a || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  window.fetch = async function (input, init) {
    const mapped = rewrite(typeof input === "string" ? input : input.url);
    if (!mapped) return originalFetch(input, init);
    if (typeof mapped === "string") return originalFetch(mapped, init);
    if (mapped.kind === "search") {
      const riders = await loadRiders();
      const q = (mapped.query || "").trim();
      let rows = [];
      if (/^\d+$/.test(q)) {
        rows = riders.filter((r) => String(r.bib || "").startsWith(q)).slice(0, 10);
      } else if (q.length >= 2) {
        const key = matchName(q);
        rows = riders
          .map((r) => ({ r, score: matchName(r.name).includes(key) ? 1 : 0 }))
          .filter((x) => x.score)
          .slice(0, 10)
          .map((x) => x.r);
      }
      return new Response(JSON.stringify(rows), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (mapped.kind === "rider") {
      // Minimal rider payload for demo: name + empty records filled from events client-side if needed
      const riders = await loadRiders();
      const rider = riders.find((r) => String(r.id) === String(mapped.id));
      if (!rider) {
        return new Response(JSON.stringify({ error: "Rider not found" }), { status: 404 });
      }
      return new Response(
        JSON.stringify({
          id: rider.id,
          name: rider.name,
          records: [],
          historical: [],
          registered: false,
          chipCode: "",
          chipReturnInfo: "",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return originalFetch(input, init);
  };
})();
