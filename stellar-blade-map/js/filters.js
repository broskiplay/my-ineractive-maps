import { CATEGORIES } from "./categories.js";
import { escapeHtml as esc } from "./utils.js";

export function renderFilters(state) {
  const container = document.getElementById("filters-container");
  if (!container) return;
  container.innerHTML = "";
  const foundSet = new Set((state.foundIds || []).map(String));

  Object.keys(CATEGORIES).forEach((catKey) => {
    const cat = CATEGORIES[catKey];
    const inCat = state.markers.filter((m) => m.category === catKey);
    if (!inCat.length) return;

    const foundCount = inCat.filter((m) => foundSet.has(String(m.id))).length;
    const isActive = state.activeCategories[catKey];
    const div = document.createElement("div");
    div.className = `filter-item ${isActive ? "" : "disabled"}`;
    div.dataset.category = catKey;
    div.innerHTML = `
      <div class="filter-left">
        <div class="filter-icon-box" style="background-color:${cat.color}">
          ${cat.svg}
        </div>
        <span class="cat-label" title="${esc(cat.name)}">${esc(cat.name)}</span>
      </div>
      <span class="badge">${foundCount}/${inCat.length}</span>`;
    container.appendChild(div);
  });
}

export function toggleCategory(state, key, value) {
  state.activeCategories[key] = value;
  renderFilters(state);
  import("./markers.js").then((m) => m.renderMarkers(state)).catch(() => {});
}

export function setAllCategories(state, value) {
  Object.keys(CATEGORIES).forEach((k) => { state.activeCategories[k] = value; });
  renderFilters(state);
  import("./markers.js").then((m) => m.renderMarkers(state)).catch(() => {});
}

export function bindFilterClicks(state) {
  document.getElementById("filters-container")?.addEventListener("click", (e) => {
    const item = e.target.closest("[data-category]");
    if (!item) return;
    const key = item.dataset.category;
    toggleCategory(state, key, !state.activeCategories[key]);
  });
}