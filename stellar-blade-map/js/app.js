import { createState } from "./state.js";
import { loadMarkersFromFile, renderMarkers, bindPopupDelegation } from "./markers.js";
import { renderFilters, bindFilterClicks } from "./filters.js";
import { bindAuth } from "./auth.js";
import { bindSidebar } from "./sidebar.js";
import { connectCloud, pushProgress } from "./cloud.js";
import { debounce } from "./utils.js";
import { saveJSON, storageKeys } from "./storage.js";

export async function initApp(config) {
  const state = createState(config);
  const tiledMap = Boolean(config.tileLayer);

  // Привязываем элементы управления до загрузки картинки и базы меток:
  // меню карт, поиск и фильтры должны работать даже при медленной сети
  // или ошибке загрузки данных.
  bindPopupDelegation(state);
  bindFilterClicks(state);
  bindSidebar(state);

  const selector = document.getElementById("page-nav-selector");
  if (selector) {
    selector.value = `index.html?map=${config.id}`;
  }

  state.mapInstance = L.map("map", {
    crs: tiledMap ? createTileCRS(config) : L.CRS.Simple,
    minZoom: tiledMap ? config.tileLayer.minZoom : -5,
    maxZoom: tiledMap ? config.tileLayer.maxZoom : 4,
    zoomSnap: 0.25,
    attributionControl: false,
    ...(tiledMap ? {
      maxBounds: createPopupSafeBounds(config),
      maxBoundsViscosity: 1,
    } : {}),
  });
  window.__mapInstance = state.mapInstance;

  if (tiledMap) {
    state.mapInstance.on("zoomstart", () => state.mapInstance.setMaxBounds(null));
    state.mapInstance.on("zoomend", () => {
      state.mapInstance.setMaxBounds(createPopupSafeBounds(config, state.mapInstance.getZoom()));
    });
    state.mapInstance.on("popupopen", ({ popup }) => {
      setTimeout(() => {
        const popupElement = popup.getElement();
        const mapElement = state.mapInstance.getContainer();
        if (!popupElement || !mapElement) return;

        const popupRect = popupElement.getBoundingClientRect();
        const mapRect = mapElement.getBoundingClientRect();
        const padding = 12;
        let offsetX = 0;
        let offsetY = 0;

        if (popupRect.left < mapRect.left + padding) {
          offsetX = popupRect.left - mapRect.left - padding;
        } else if (popupRect.right > mapRect.right - padding) {
          offsetX = popupRect.right - mapRect.right + padding;
        }

        if (popupRect.top < mapRect.top + padding) {
          offsetY = popupRect.top - mapRect.top - padding;
        } else if (popupRect.bottom > mapRect.bottom - padding) {
          offsetY = popupRect.bottom - mapRect.bottom + padding;
        }

        if (offsetX || offsetY) {
          state.mapInstance.stop();
          state.mapInstance.panBy([offsetX, offsetY], { animate: false });
        }
      });
    });
  }

  state.markersLayer = L.layerGroup().addTo(state.mapInstance);
  state.scheduleCloudSync = debounce(() => pushProgress(state), 2000);

  // Сначала грузим картинку, потом маркеры
  await loadMapImage(state);

  await loadMarkersFromFile(state);
  state.markersLoaded = true;

  renderMarkers(state);
  renderFilters(state);

  try {
    bindAuth(state);
  } catch (err) {
    console.warn("Авторизация Firebase недоступна, карта работает в локальном режиме:", err);
  }

  try {
    connectCloud(state);
  } catch (err) {
    console.warn("Облачная синхронизация недоступна:", err);
  }

  state.mapInstance.on("click", (e) => {
    if (state.addMode) {
      import("./markers.js").then((m) =>
        m.openCreateMarkerPopup(state, e.latlng.lat, e.latlng.lng)
      );
    }
  });

  setInterval(() => autosave(state), 3 * 60 * 1000);

  if (window.matchMedia("(max-width: 700px)").matches) {
    document.getElementById("sidebar")?.classList.add("collapsed");
    const btn = document.getElementById("sidebar-toggle-btn");
    if (btn) btn.textContent = "▶";
  }

  return state;
}

function autosave(state) {
  saveJSON(storageKeys(state.config.id).markers, state.markers);
  saveJSON(storageKeys(state.config.id).found, state.foundIds);
  pushProgress(state);
  const timeEl = document.getElementById("autosave-time");
  if (timeEl) {
    timeEl.textContent = `(${new Date().toLocaleTimeString("ru-RU", {
      hour: "2-digit", minute: "2-digit",
    })})`;
  }
}

function loadMapImage(state) {
  const cfg = state.config;
  if (cfg.tileLayer) {
    const bounds = L.latLngBounds([[0, 0], [cfg.height, cfg.width]]);
    const url = cfg.tileLayer.url;
    const transparentTile = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
    const layer = L.tileLayer(url, {
      bounds,
      minZoom: cfg.tileLayer.minZoom,
      maxZoom: cfg.tileLayer.maxZoom,
      maxNativeZoom: cfg.tileLayer.maxZoom,
      noWrap: true,
    });

    layer.getTileUrl = (coords) => {
      const zoomScale = Math.pow(2, coords.z - cfg.tileLayer.maxZoom);
      const expectedColumns = Math.ceil((cfg.width * zoomScale) / 256);
      // The supplied GDAL tiles stop at pixel 8192; the source image is 8194 px wide.
      const availableColumns = Math.max(1, expectedColumns - 1);
      if (coords.x >= availableColumns) return transparentTile;
      return L.Util.template(url, coords);
    };

    state.imageOverlay = layer.addTo(state.mapInstance);
    state.mapInstance.fitBounds(bounds);
    return;
  }

  const candidates = [cfg.image, ...(cfg.altImages || [])];
  let i = 0;

  console.log(`🖼️ App: Ищу картинку для карты "${cfg.name}". Первый путь: ${cfg.image}`);

  return new Promise((resolve) => {
    const tryNext = () => {
      if (i >= candidates.length) {
        console.warn("⚠️ App: Картинки не найдены! Рисую черную сетку.");
        const url = makeFallbackGrid(cfg.width, cfg.height, cfg.image);
        const bounds = [[0, 0], [cfg.height, cfg.width]];
        state.imageOverlay = L.imageOverlay(url, bounds).addTo(state.mapInstance);
        state.mapInstance.fitBounds(bounds);
        resolve();
        return;
      }
      const src = candidates[i++];
      
      const img = new Image();
      img.onload = () => {
        console.log(`✅ App: Картинка успешно загружена: ${src}`);
        if (img.naturalWidth && img.naturalHeight) {
          cfg.width = img.naturalWidth;
          cfg.height = img.naturalHeight;
        }
        const bounds = [[0, 0], [cfg.height, cfg.width]];
        state.imageOverlay = L.imageOverlay(src, bounds).addTo(state.mapInstance);
        state.mapInstance.fitBounds(bounds);
        resolve();
      };
      img.onerror = () => {
        console.error(`❌ App: Ошибка 404. Не найден файл: ${src}`);
        tryNext();
      };
      img.src = src;
    };
    tryNext();
  });
}

function createTileCRS(config) {
  const maxZoom = config.tileLayer.maxZoom;
  return L.extend({}, L.CRS.Simple, {
    scale: (zoom) => Math.pow(2, zoom - maxZoom),
    zoom: (scale) => Math.log(scale) / Math.LN2 + maxZoom,
    transformation: new L.Transformation(1, 0, -1, config.height),
  });
}

function createPopupSafeBounds(config, zoom = config.tileLayer.maxZoom) {
  const scale = Math.pow(2, zoom - config.tileLayer.maxZoom);
  const horizontalPadding = 360 / scale;
  const verticalPadding = 460 / scale;

  return L.latLngBounds([
    [-verticalPadding, -horizontalPadding],
    [config.height + verticalPadding, config.width + horizontalPadding],
  ]);
}

function makeFallbackGrid(w, h, fileName) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = Math.round(1024 * (h / w));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0a0d14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#162238";
  ctx.lineWidth = 2;
  for (let x = 0; x <= canvas.width; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
  ctx.fillStyle = "#00f0ff";
  ctx.font = "600 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Положите файл "${fileName}" в папку`, canvas.width / 2, canvas.height / 2);
  return canvas.toDataURL();
}