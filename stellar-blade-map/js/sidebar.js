const ACTIONS = {
  "toggle-google-auth": (s) => import("./auth.js").then((m) => m.toggleGoogleAuth()),
  "sync-progress-cloud": (s) => import("./cloud.js").then((m) => m.syncProgressToCloud(s)),
  "toggle-add-mode": (s) => import("./markers.js").then((m) => m.toggleAddMode(s)),
  "toggle-found-visibility": (s) => import("./markers.js").then((m) => m.toggleFoundVisibility(s)),

  "shift-all": (s, el) => import("./calibration.js")
    .then((m) => m.shiftAll(s, Number(el.dataset.dx), Number(el.dataset.dy))),
  "scale-axis": (s, el) => import("./calibration.js")
    .then((m) => m.scaleAxis(s, Number(el.dataset.fx), Number(el.dataset.fy))),
  "shift-imported": (s, el) => import("./calibration.js")
    .then((m) => m.shiftImported(s, Number(el.dataset.dx), Number(el.dataset.dy))),
  "mirror-x": (s) => import("./calibration.js").then((m) => m.mirrorX(s)),
  "mirror-y": (s) => import("./calibration.js").then((m) => m.mirrorY(s)),
  "reset-imported-transforms": (s) => import("./calibration.js").then((m) => m.resetTransforms(s)),
  "reload-default-markers": (s) => import("./calibration.js").then((m) => m.reloadFromFile(s)),
  "delete-imported-markers": (s) => import("./calibration.js").then((m) => m.deleteImported(s)),

  "export-data": (s) => import("./io.js").then((m) => m.exportData(s)),
  "trigger-import-markers": () => document.getElementById("import-file")?.click(),
  "export-found": (s) => import("./io.js").then((m) => m.exportFound(s)),
  "trigger-import-found": () => document.getElementById("import-found-file")?.click(),
  "save-checkpoint": (s) => import("./io.js").then((m) => m.saveCheckpoint(s)),
  "load-checkpoint": (s) => import("./io.js").then((m) => m.loadCheckpoint(s)),
  "reset-found": (s) => import("./io.js").then((m) => m.resetFoundProgress(s)),

  "set-all-categories": (s, el) => import("./filters.js")
    .then((m) => m.setAllCategories(s, el.dataset.state === "true")),

  "toggle-sidebar": () => toggleSidebar(),
};

export function bindSidebar(state) {
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    e.preventDefault();
    ACTIONS[el.dataset.action]?.(state, el);
  });

  document.addEventListener("change", (e) => {
    if (e.target.id === "import-file") {
      import("./io.js").then((m) => m.importData(state, e));
    } else if (e.target.id === "import-found-file") {
      import("./io.js").then((m) => m.importFoundProgress(state, e));
    }
  });

  document.getElementById("search-input")?.addEventListener("input", () =>
    import("./markers.js").then((m) => m.renderMarkers(state))
  );
}

export function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const btn = document.getElementById("sidebar-toggle-btn");
  if (!sidebar) return;
  const collapsed = sidebar.classList.toggle("collapsed");
  if (btn) btn.textContent = collapsed ? "▶" : "◀";
  setTimeout(() => {
    window.__mapInstance?.invalidateSize?.();
  }, 320);
}