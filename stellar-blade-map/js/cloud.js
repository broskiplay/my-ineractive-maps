import { saveJSON, storageKeys } from "./storage.js";
import { makeUniqueId } from "./utils.js";

function currentUser() {
  try {
    return typeof firebase !== "undefined" && firebase.apps?.length
      ? firebase.auth().currentUser
      : null;
  } catch (_) {
    return null;
  }
}

function normalizeIds(state, ids) {
  const known = new Map(state.markers.map((m) => [String(m.id), String(m.id)]));
  return Array.from(new Set(
    (Array.isArray(ids) ? ids : []).map((id) => known.get(String(id)) ?? String(id))
  ));
}

function normalizeCustomMarkers(list, uid) {
  return (Array.isArray(list) ? list : []).map((marker) => ({
    ...marker,
    id: String(marker.id ?? makeUniqueId()),
    imported: false,
    ownerUid: uid,
  }));
}

// Сохраняем и локальные метки текущего пользователя (включая гостя),
// чтобы они не пропадали после перезагрузки и переходили в аккаунт при входе.
function mergeCustomMarkers(saved, carried, uid) {
  const byId = new Map();
  for (const marker of normalizeCustomMarkers(saved, uid)) {
    byId.set(String(marker.id), marker);
  }
  for (const marker of normalizeCustomMarkers(carried, uid)) {
    byId.set(String(marker.id), marker);
  }
  return Array.from(byId.values());
}

async function rerender(state) {
  const m = await import("./markers.js");
  const f = await import("./filters.js");
  m.renderMarkers(state);
  f.renderFilters(state);
}

export function pushProgress(state) {
  if (typeof window.saveMapProgressToCloud !== "function") return;
  return window.saveMapProgressToCloud(state.config.id, state.foundIds);
}

export async function syncProgressToCloud(state) {
  const btn = document.getElementById("cloud-sync-btn");
  const status = document.getElementById("cloud-sync-status");
  if (btn) btn.disabled = true;
  if (status) status.textContent = "Синхронизация с Google...";

  try {
    if (typeof window.syncMapProgressToCloud !== "function") {
      throw new Error("Функция синхронизации недоступна");
    }
    const ids = await window.syncMapProgressToCloud(
      state.config.id,
      () => state.foundIds,
      (syncedIds) => {
        const normalized = normalizeIds(state, syncedIds);
        state.foundIds = normalized;
        saveJSON(storageKeys(state.config.id).found, normalized);
        rerender(state);
      }
    );
    if (status) status.textContent = `Синхронизировано: ${(ids || state.foundIds).length} меток`;
  } catch (err) {
    if (status) status.textContent = `Ошибка: ${err.message || "проверьте вход"}`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

export function connectCloud(state) {
  if (typeof window.connectMapProgressSync !== "function") return;
  window.connectMapProgressSync(
    state.config.id,
    () => state.foundIds,
    (ids) => {
      const normalized = normalizeIds(state, ids);
      state.foundIds = normalized;
      saveJSON(storageKeys(state.config.id).found, normalized);
      rerender(state);
      const status = document.getElementById("cloud-sync-status");
      if (status) status.textContent = `☁️ Прогресс из Google: ${normalized.length} меток`;
    },
    (err) => {
      const status = document.getElementById("cloud-sync-status");
      if (status) status.textContent = `Ошибка загрузки: ${err.message || ""}`;
    }
  );
}

export async function syncUserMarkers(state) {
  const user = currentUser();
  if (!user || typeof window.syncUserMarkersToCloud !== "function") return;
  if (state.syncingCustomMarkers) return;
  state.syncingCustomMarkers = true;
  try {
    const localMarkers = state.markers.filter((m) => !m.imported && m.ownerUid === user.uid);
    const synced = await window.syncUserMarkersToCloud(state.config.id, localMarkers);
    if (currentUser()?.uid !== user.uid) return;
    state.markers = state.markers.filter((m) => m.imported)
      .concat(normalizeCustomMarkers(synced, user.uid));
    saveJSON(storageKeys(state.config.id).markers, state.markers);
    rerender(state);
  } catch (err) {
    console.error("Ошибка синхронизации личных меток:", err);
  } finally {
    state.syncingCustomMarkers = false;
  }
}

export async function activateUserMarkers(state, user) {
  const uid = user?.uid || "guest";
  if (state.activeCustomMarkerUid === uid) return;
  const key = storageKeys(state.config.id).userMarkers(uid);
  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch { return null; }
  })();
  const carried = state.markers.filter((marker) => !marker.imported && (
    !marker.ownerUid ||
    marker.ownerUid === uid ||
    (Boolean(user) && marker.ownerUid === "guest")
  ));
  const custom = mergeCustomMarkers(saved, carried, uid);
  state.markers = state.markers.filter((m) => m.imported).concat(custom);
  state.activeCustomMarkerUid = uid;
  saveJSON(key, custom);
  saveJSON(storageKeys(state.config.id).markers, state.markers);
  rerender(state);
  if (user) await syncUserMarkers(state);
}