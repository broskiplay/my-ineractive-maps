import { saveJSON, storageKeys, loadJSON } from "./storage.js";
import { makeUniqueId } from "./utils.js";
import { normalizeFoundIds } from "./markers.js";

async function rerender(state) {
  const m = await import("./markers.js");
  const f = await import("./filters.js");
  m.renderMarkers(state);
  f.renderFilters(state);
}

// ---------- File save helper ----------
async function saveJsonWithDialog(dataObj, suggestedName) {
  const jsonString = JSON.stringify(dataObj, null, 2);
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: "JSON файл", accept: { "application/json": [".json"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(jsonString);
      await writable.close();
      showStatus(`✅ Файл «${handle.name}» сохранён!`);
      return;
    } catch (err) {
      if (err.name === "AbortError") return;
    }
  }
  const customName = prompt("Введите имя файла:", suggestedName);
  if (!customName) return;
  const finalName = customName.endsWith(".json") ? customName : customName + ".json";
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = finalName; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function showStatus(text) {
  const el = document.getElementById("status-msg");
  if (!el) return;
  el.style.display = "block";
  el.textContent = text;
}

// ---------- Markers DB ----------
export async function exportData(state) {
  const markers = state.markers.filter((m) => m.imported);
  saveJsonWithDialog({ markers }, state.config.markersFile);
}

export async function importData(state, event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  try {
    const imported = JSON.parse(text);
    const rawList = Array.isArray(imported) ? imported : imported.markers;
    if (!Array.isArray(rawList)) throw new Error("В JSON нет массива markers");

    let valid = rawList.map((m, i) => {
      if (!m || typeof m !== "object"
        || !Number.isFinite(Number(m.lat)) || !Number.isFinite(Number(m.lng))) {
        throw new Error(`Некорректные координаты у метки ${i + 1}`);
      }
      return {
        ...m,
        id: String(m.id ?? makeUniqueId()),
        map: state.config.id,
        lat: Number(m.lat),
        lng: Number(m.lng),
        imported: true,
        _importBaseLat: Number(m.lat),
        _importBaseLng: Number(m.lng),
      };
    });

    const maxLat = Math.max(...valid.map((m) => m.lat));
    const maxLng = Math.max(...valid.map((m) => m.lng));
    if (state.config.width > 1800 && maxLat <= 1500 && maxLng <= 1500) {
      const sx = state.config.width / 1024;
      const sy = state.config.height / 1024;
      valid = valid.map((m) => ({
        ...m,
        lat: Number((m.lat * sy).toFixed(2)),
        lng: Number((m.lng * sx).toFixed(2)),
        _importBaseLat: Number((m.lat * sy).toFixed(2)),
        _importBaseLng: Number((m.lng * sx).toFixed(2)),
      }));
    }

    state.markers = state.markers.filter((m) => !m.imported).concat(valid);
    if (Array.isArray(imported.found)) {
      state.foundIds = normalizeFoundIds({
        markers: state.markers,
        foundIds: [...state.foundIds, ...imported.found],
      });
    }
    saveJSON(storageKeys(state.config.id).markers, state.markers);
    saveJSON(storageKeys(state.config.id).found, state.foundIds);
    state.scheduleCloudSync();
    await rerender(state);
    alert(`Импортировано меток: ${valid.length}`);
  } catch (err) {
    alert("Ошибка чтения JSON: " + (err.message || "неверный формат"));
  } finally {
    event.target.value = "";
  }
}

// ---------- Progress ----------
function buildProgressPayload(state) {
  return {
    app: "stellar_blade_map_progress",
    map: state.config.id,
    updatedAt: new Date().toISOString(),
    foundCount: state.foundIds.length,
    found: state.foundIds,
  };
}

export async function exportFound(state) {
  saveJsonWithDialog(
    buildProgressPayload(state),
    `stellar_blade_${state.config.id}_progress.json`
  );
}

export async function importFoundProgress(state, event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : (Array.isArray(data.found) ? data.found : null);
    if (!list) throw new Error("Файл не содержит found");
    state.foundIds = normalizeFoundIds({
      markers: state.markers,
      foundIds: [...state.foundIds, ...list],
    });
    saveJSON(storageKeys(state.config.id).found, state.foundIds);
    state.scheduleCloudSync();
    await rerender(state);
    alert(`Прогресс загружен. Всего: ${state.foundIds.length}`);
  } catch (err) {
    alert("Ошибка загрузки: " + (err.message || "неверный файл"));
  } finally {
    event.target.value = "";
  }
}

// ---------- Checkpoints ----------
export async function saveCheckpoint(state) {
  const payload = buildProgressPayload(state);
  localStorage.setItem(storageKeys(state.config.id).checkpoint, JSON.stringify(payload));
  saveJsonWithDialog(payload, `stellar_blade_${state.config.id}_checkpoint.json`);
}

export async function loadCheckpoint(state) {
  const raw = localStorage.getItem(storageKeys(state.config.id).checkpoint);
  if (!raw) { alert("Быстрый сейв ещё не создан."); return; }
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data.found)) return;
    state.foundIds = normalizeFoundIds({ markers: state.markers, foundIds: data.found });
    saveJSON(storageKeys(state.config.id).found, state.foundIds);
    state.scheduleCloudSync();
    await rerender(state);
    showStatus(`✅ Восстановлено меток: ${state.foundIds.length}`);
  } catch { alert("Ошибка чтения сейва."); }
}

export async function resetFoundProgress(state) {
  if (!confirm("Сбросить все отметки выполненных меток?")) return;
  state.foundIds = [];
  saveJSON(storageKeys(state.config.id).found, []);
  state.scheduleCloudSync();
  await rerender(state);
}