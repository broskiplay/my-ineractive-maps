import { saveJSON, storageKeys } from "./storage.js";
import { isMapOwner } from "./utils.js";

async function rerender(state) {
  saveJSON(storageKeys(state.config.id).markers, state.markers);
  const m = await import("./markers.js");
  m.renderMarkers(state);
}

const guard = (fn) => (state, ...args) => {
  if (!isMapOwner()) return;
  return fn(state, ...args);
};

export const shiftAll = guard((state, dx, dy) => {
  state.markers.forEach((m) => {
    m.lng = Number((m.lng + dx).toFixed(2));
    m.lat = Number((m.lat + dy).toFixed(2));
  });
  rerender(state);
});

export const scaleAxis = guard((state, fx, fy) => {
  if (!state.markers.length) return;
  const minLat = Math.min(...state.markers.map((m) => m.lat));
  const minLng = Math.min(...state.markers.map((m) => m.lng));
  state.markers.forEach((m) => {
    m.lat = Number((minLat + (m.lat - minLat) * fy).toFixed(2));
    m.lng = Number((minLng + (m.lng - minLng) * fx).toFixed(2));
  });
  rerender(state);
});

export const shiftImported = guard((state, dx, dy) => {
  const stepInput = document.getElementById("shift-step");
  const step = Number(stepInput?.value);
  if (!Number.isFinite(step) || step <= 0) { alert("Шаг сдвига должен быть больше нуля."); return; }
  const list = state.markers.filter((m) => m.imported);
  if (!list.length) { alert("Нет импортированных меток."); return; }
  list.forEach((m) => {
    m.lng = Number((m.lng + dx * step).toFixed(2));
    m.lat = Number((m.lat + dy * step).toFixed(2));
  });
  rerender(state);
});

export const mirrorX = guard((state) => {
  const list = state.markers.filter((m) => m.imported);
  if (!list.length) { alert("Нет импортированных меток."); return; }
  list.forEach((m) => { m.lng = Number((state.config.width - m.lng).toFixed(2)); });
  rerender(state);
});

export const mirrorY = guard((state) => {
  const list = state.markers.filter((m) => m.imported);
  if (!list.length) { alert("Нет импортированных меток."); return; }
  list.forEach((m) => { m.lat = Number((state.config.height - m.lat).toFixed(2)); });
  rerender(state);
});

export const resetTransforms = guard((state) => {
  const list = state.markers.filter((m) => m.imported
    && Number.isFinite(m._importBaseLat) && Number.isFinite(m._importBaseLng));
  if (!list.length) { alert("Нет исходных координат для сброса."); return; }
  list.forEach((m) => { m.lat = m._importBaseLat; m.lng = m._importBaseLng; });
  rerender(state);
});

export const deleteImported = guard((state) => {
  const list = state.markers.filter((m) => m.imported);
  if (!list.length) { alert("Нет импортированных меток."); return; }
  if (!confirm(`Удалить ${list.length} импортированных меток?`)) return;
  const ids = new Set(list.map((m) => String(m.id)));
  state.markers = state.markers.filter((m) => !m.imported);
  state.foundIds = state.foundIds.filter((id) => !ids.has(String(id)));
  saveJSON(storageKeys(state.config.id).found, state.foundIds);
  rerender(state);
});

export const reloadFromFile = guard(async (state) => {
  if (!confirm("Перезагрузить все метки из исходного файла карты?")) return;
  localStorage.removeItem(storageKeys(state.config.id).markers);
  const m = await import("./markers.js");
  await m.loadMarkersFromFile(state);
  m.renderMarkers(state);
  const f = await import("./filters.js");
  f.renderFilters(state);
  alert("✅ Метки перезагружены из файла карты!");
});