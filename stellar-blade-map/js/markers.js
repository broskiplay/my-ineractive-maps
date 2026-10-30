import { CATEGORIES } from "./categories.js";
import { escapeHtml as esc, makeUniqueId, isMapOwner } from "./utils.js";
import { loadJSON, saveJSON, storageKeys } from "./storage.js";

function currentUid() {
  try {
    return typeof firebase !== "undefined" && firebase.apps?.length
      ? firebase.auth().currentUser?.uid || "guest"
      : "guest";
  } catch (_) {
    return "guest";
  }
}

// ---------- Load markers from file ----------
export async function loadMarkersFromFile(state) {
  const cfg = state.config;
  const file = cfg.markersFile;
  const urls = [
    file,
    encodeURI(file),
    encodeURIComponent(file).replace(/!/g, "%21"),
    "./" + file.replace(/ /g, "%20").replace(/!/g, "%21"),
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url + "?v=" + Date.now(), { cache: "no-store" });
      if (!res.ok) continue;
      const json = await res.json();
      const list = Array.isArray(json) ? json : json.markers;
      if (!Array.isArray(list) || !list.length) continue;

      const fileMarkers = sanitizeMarkersList(list, cfg, true);
      const cached = loadJSON(storageKeys(cfg.id).markers, []);
      const customUserMarkers = Array.isArray(cached)
        ? sanitizeMarkersList(cached.filter((m) => m && m.imported === false), cfg)
        : [];
      state.markers = fileMarkers.concat(customUserMarkers);
      state.foundIds = normalizeFoundIds(state);
      saveJSON(storageKeys(cfg.id).markers, state.markers);
      return;
    } catch (_) { /* try next */ }
  }

  // Fallback to cache
  const cached = loadJSON(storageKeys(cfg.id).markers, []);
  if (Array.isArray(cached) && cached.length) {
    // В кэше координаты уже пересчитаны под реальный размер картинки.
    state.markers = sanitizeMarkersList(cached, cfg);
    state.foundIds = normalizeFoundIds(state);
  }
}

export function sanitizeMarkersList(list, config, scaleFromSource = false) {
  const mapId = config.id;
  const scaleX = scaleFromSource && config.sourceWidth
    ? config.width / config.sourceWidth
    : 1;
  const scaleY = scaleFromSource && config.sourceHeight
    ? config.height / config.sourceHeight
    : 1;

  return list
    .filter((m) => m && typeof m === "object"
      && Number.isFinite(Number(m.lat)) && Number.isFinite(Number(m.lng)))
    .map((m) => ({
      ...m,
      id: String(m.id ?? makeUniqueId()),
      map: mapId,
      lat: Number((Number(m.lat) * scaleY).toFixed(2)),
      lng: Number((Number(m.lng) * scaleX).toFixed(2)),
      category: CATEGORIES[m.category] ? m.category : "miscellaneous",
      title: String(m.title || CATEGORIES[m.category]?.name || "Метка"),
      desc: String(m.desc || ""),
    }));
}

export function normalizeFoundIds(state) {
  const markerIds = new Map(state.markers.map((m) => [String(m.id), String(m.id)]));
  const ids = Array.isArray(state.foundIds) ? state.foundIds : [];
  return Array.from(new Set(ids.map((id) => markerIds.get(String(id)) ?? String(id))));
}

// ---------- Popup visibility ----------
// Метки у края карты: maxBounds (вязкость 1) не даёт сдвинуть карту настолько,
// чтобы попап целиком поместился. На время показа попапа расширяем границы
// на его высоту и повторяем автопрокрутку (в т.ч. после загрузки картинки).
function revealPopup(state, popup) {
  const map = state.mapInstance;
  if (!map || !state.maxBounds) return;
  clearTimeout(state.popupBoundsTimer);

  const fit = () => {
    if (!map.hasLayer(popup)) return;
    const el = popup.getElement();
    const px = (el ? el.offsetHeight : 320) + 100;
    const pad = px / Math.pow(2, map.getZoom());
    const sw = state.maxBounds.getSouthWest();
    const ne = state.maxBounds.getNorthEast();
    map.setMaxBounds(L.latLngBounds(
      [sw.lat - pad, sw.lng - pad],
      [ne.lat + pad, ne.lng + pad]
    ));
    popup.update();
    popup._adjustPan?.();
  };

  fit();
  popup.getElement()?.querySelectorAll("img").forEach((img) => {
    if (!img.complete) img.addEventListener("load", fit, { once: true });
  });
}

function restoreBounds(state) {
  clearTimeout(state.popupBoundsTimer);
  // Отложено: при переключении между метками popupopen отменит возврат.
  state.popupBoundsTimer = setTimeout(() => {
    if (state.maxBounds) state.mapInstance.setMaxBounds(state.maxBounds);
  }, 0);
}

// ---------- Render ----------
export function renderMarkers(state) {
  if (!state.markersLayer) return;
  state.markersLayer.clearLayers();
  const input = document.getElementById("search-input");
  const query = (input?.value || "").toLowerCase().trim();
  const foundSet = new Set((state.foundIds || []).map(String));
  let foundCount = 0;

  for (const marker of state.markers) {
    const isFound = foundSet.has(String(marker.id));
    if (isFound) foundCount++;
    if (!state.activeCategories[marker.category]) continue;
    if (state.hideFoundMarkers && isFound) continue;
    if (query
      && !(marker.title || "").toLowerCase().includes(query)
      && !(marker.desc || "").toLowerCase().includes(query)) continue;

    const cat = CATEGORIES[marker.category] || CATEGORIES.miscellaneous;
    
    // Метка в форме капельки
    const icon = L.divIcon({
      html: `<div class="custom-pin ${isFound ? "found" : ""}" style="background-color:${cat.color}">${cat.svg}</div>`,
      className: "",
      iconSize: [28, 32],
      iconAnchor: [14, 32],
      popupAnchor: [0, -32],
    });
    
    const lMarker = L.marker([marker.lat, marker.lng], { icon });

    const popupHtml = `
      <div class="popup-card ${isFound ? "is-found" : ""}" style="--cat:${cat.color}">
        <div class="popup-head">
          <span class="popup-icon">${cat.svg}</span>
          <div class="popup-head-text">
            <div class="popup-cat">${esc(cat.name)}</div>
            <div class="popup-title">${esc(marker.title || cat.name)}</div>
          </div>
        </div>
        ${isFound ? `<div class="popup-status">✔ Найдено</div>` : ""}
        ${marker.img ? `<img src="${esc(marker.img)}" class="popup-img" alt="" onclick="window.open(this.src,'_blank')">` : ""}
        ${marker.desc ? `<div class="popup-desc">${esc(marker.desc)}</div>` : ""}
        <div class="popup-actions">
          <button class="btn-found" data-found-id="${esc(marker.id)}">
            ${isFound ? "✖ Снять отметку" : "✔ Найдено!"}
          </button>
        </div>
      </div>`;

    lMarker.bindPopup(popupHtml, {
      maxWidth: 320,
      maxHeight: 400,
      autoPanPaddingTopLeft: [20, 60],
      autoPanPaddingBottomRight: [20, 20]
    });

    lMarker.on("popupopen", (e) => revealPopup(state, e.popup));
    lMarker.on("popupclose", () => restoreBounds(state));

    lMarker.on("contextmenu", (e) => {
      e.originalEvent?.preventDefault();
      toggleFound(state, marker.id);
    });

    // Drag-n-drop (Ctrl + перетаскивание, только владелец)
    lMarker.on("mousedown", (e) => {
      const orig = e.originalEvent;
      if (!isMapOwner() || !orig || !orig.ctrlKey || orig.button !== 0) return;
      L.DomEvent.stopPropagation(e);
      L.DomEvent.preventDefault(e);
      lMarker.closePopup();
      state.mapInstance.dragging.disable();

      const onMove = (ev) => lMarker.setLatLng(ev.latlng);
      const onUp = () => {
        state.mapInstance.off("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        state.mapInstance.dragging.enable();
        const pos = lMarker.getLatLng();
        marker.lat = Number(pos.lat.toFixed(2));
        marker.lng = Number(pos.lng.toFixed(2));
        saveJSON(storageKeys(state.config.id).markers, state.markers);
      };
      state.mapInstance.on("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });

    state.markersLayer.addLayer(lMarker);
  }

  const counter = document.getElementById("progress-counter");
  if (counter) counter.textContent = `${foundCount} / ${state.markers.length}`;
}

// ---------- Actions ----------
export function toggleFound(state, id) {
  const key = String(id);
  const foundIds = (state.foundIds || []).map(String);
  state.foundIds = foundIds.includes(key)
    ? foundIds.filter((x) => x !== key)
    : [...foundIds, key];
  saveJSON(storageKeys(state.config.id).found, state.foundIds);
  state.scheduleCloudSync();
  renderMarkers(state);
  import("./filters.js").then((m) => m.renderFilters(state)).catch(() => {});
}

export function deleteMarker(state, id) {
  if (!isMapOwner()) return;
  const key = String(id);
  if (!state.markers.some((m) => String(m.id) === key && m.imported)) return;
  if (!confirm("Удалить эту метку?")) return;
  state.markers = state.markers.filter((m) => String(m.id) !== key);
  state.foundIds = (state.foundIds || []).filter((x) => String(x) !== key);
  saveJSON(storageKeys(state.config.id).markers, state.markers);
  saveJSON(storageKeys(state.config.id).found, state.foundIds);
  state.scheduleCloudSync();
  renderMarkers(state);
  import("./filters.js").then((m) => m.renderFilters(state)).catch(() => {});
}

export function toggleAddMode(state) {
  state.addMode = !state.addMode;
  const btn = document.getElementById("toggle-add-btn");
  const mapEl = document.getElementById("map");
  if (state.addMode) {
    btn?.classList.add("active-mode");
    if (btn) btn.textContent = "🎯 Кликните на карту для добавления";
    if (mapEl) mapEl.style.cursor = "crosshair";
  } else {
    btn?.classList.remove("active-mode");
    if (btn) btn.textContent = "+ Добавить свою метку на карту";
    if (mapEl) mapEl.style.cursor = "grab";
  }
}

export function toggleFoundVisibility(state) {
  state.hideFoundMarkers = !state.hideFoundMarkers;
  const btn = document.getElementById("hide-found-markers-btn");
  if (btn) {
    btn.textContent = state.hideFoundMarkers ? "👁 Показать отмеченные" : "🙈 Скрыть отмеченные";
    btn.setAttribute("aria-pressed", String(state.hideFoundMarkers));
  }
  renderMarkers(state);
}

export function openCreateMarkerPopup(state, lat, lng) {
  const options = Object.keys(CATEGORIES)
    .map((k) => `<option value="${k}">${esc(CATEGORIES[k].name)}</option>`)
    .join("");
  const html = `
    <div>
      <div class="popup-title" style="margin-bottom:12px;">Добавить метку</div>
      <select id="new-cat">${options}</select>
      <input type="text" id="new-title" placeholder="Название предмета">
      <textarea id="new-desc" rows="2" placeholder="Описание..."></textarea>
      <button class="primary" id="save-new-marker">Сохранить</button>
    </div>`;
  L.popup({ maxHeight: 360 }).setLatLng([lat, lng]).setContent(html).openOn(state.mapInstance);
  setTimeout(() => {
    document.getElementById("save-new-marker")?.addEventListener("click", () => {
      saveNewMarker(state, lat, lng);
    });
  }, 0);
}

function saveNewMarker(state, lat, lng) {
  const category = document.getElementById("new-cat")?.value || "miscellaneous";
  const title = (document.getElementById("new-title")?.value || "").trim()
    || CATEGORIES[category].name;
  const desc = (document.getElementById("new-desc")?.value || "").trim();
  const owner = isMapOwner();
  const uid = owner ? null : currentUid();

  state.markers.push({
    id: String(makeUniqueId()),
    map: state.config.id,
    lat: Number(lat.toFixed(2)),
    lng: Number(lng.toFixed(2)),
    category,
    title,
    desc,
    imported: owner,
    ...(owner ? {} : { ownerUid: uid }),
  });
  saveJSON(storageKeys(state.config.id).markers, state.markers);
  if (!owner) {
    saveJSON(
      storageKeys(state.config.id).userMarkers(uid),
      state.markers.filter((m) => !m.imported && m.ownerUid === uid)
    );
  }
  state.mapInstance.closePopup();
  renderMarkers(state);
  import("./filters.js").then((m) => m.renderFilters(state)).catch(() => {});
  import("./cloud.js").then((m) => m.syncUserMarkers(state)).catch(() => {});
}

// ---------- Popup click delegation ----------
export function bindPopupDelegation(state) {
  document.addEventListener("click", (e) => {
    const foundBtn = e.target.closest("[data-found-id]");
    if (foundBtn) {
      toggleFound(state, foundBtn.dataset.foundId);
      return;
    }
    const delBtn = e.target.closest("[data-delete-id]");
    if (delBtn) {
      deleteMarker(state, delBtn.dataset.deleteId);
    }
  });
}