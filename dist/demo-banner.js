(function () {
  const el = document.getElementById("demo-banner");
  if (!el || !window.OWAR_DEMO || !window.OWAR_DEMO.enabled) return;
  el.hidden = false;
  el.textContent =
    window.OWAR_DEMO.label ||
    "Demo preview — static RaceTec snapshot (not live timing)";
})();
