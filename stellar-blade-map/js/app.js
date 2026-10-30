import { createState } from "./state.js";
import { loadMarkersFromFile, renderMarkers, bindPopupDelegation } from "./markers.js";
import { renderFilters, bindFilterClicks } from "./filters.js";
import { bindAuth } from "./auth.js";
import { bindSidebar } from "./sidebar.js";
import { connectCloud, pushProgress } from "./cloud.js";
import { debounce } from "./utils.js";
import { saveJSON, storageKeys } from "./storage.js";

// ВАЖНО: Leaflet подключается в index.html обычным тегом <script> и живёт
// в глобальной переменной window.L. Здесь нельзя писать `import L from "leaflet"`:
// в браузере без import map такая строка ломает загрузку всего модуля
// («Failed to resolve module specifier "leaflet"»), и карта с метками не рисуется.
const ZOOM_SNAP = 0.25;
const DEFAULT_MAX_ZOOM = 1;
const LEAFLET_CDNS = [
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js",
];

let L = window.L || null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Не удалось загрузить ${src}`));
    document.head.appendChild(script);
  });
}

// Если CDN в <head> не ответил (сеть/блокировщик), пробуем резервные зеркала.
async function ensureLeaflet() {
  if (L) return L;
  for (const src of LEAFLET_CDNS) {
    try {
      await loadScript(src);
    } catch (err) {
      console.warn("Leaflet:", err.message);
    }
    if (window.L) {
      L = window.L;
      return L;
    }
  }
  return null;
}

export async function initApp(config) {
  const state = createState(config);

  const leaflet = await ensureLeaflet();
  if (!leaflet) {
    showMapError(
      "Не удалось загрузить библиотеку Leaflet. Проверьте соединение с интернетом и обновите страницу."
    );
    return null;
  }

  // Инициализируем карту ПРОВЕРЕННО: Leaflet должен быть загружен,
  // а state.config.width/height уже известны.
  state.mapInstance = L.map("map", {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: config.maxZoom ?? DEFAULT_MAX_ZOOM,
    zoomSnap: ZOOM_SNAP,
    zoomDelta: ZOOM_SNAP,
    maxBoundsViscosity: 1.0,
    attributionControl: false,
  });
  window.__mapInstance = state.mapInstance;

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

function showMapError(message) {
  const container = document.getElementById("map");
  if (!container) return;
  container.innerHTML = "";
  const box = document.createElement("div");
  box.style.cssText = [
    "position:absolute", "inset:0", "display:flex", "align-items:center",
    "justify-content:center", "padding:32px", "text-align:center",
    "font:500 16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif",
    "color:#edf2f7", "background:#0a0d14",
  ].join(";");
  box.textContent = message;
  container.appendChild(box);
}

// ---------- Пределы зума ----------
// Ключевое: минимальный зум считается от размеров окна, поэтому карту нельзя
// отдалить до крошечного пятна, а максимальный берётся из config.js, чтобы
// не разглядывать растянутые пиксели.
function snapFloor(value) {
  return Math.round((Math.floor(value / ZOOM_SNAP) * ZOOM_SNAP) * 100) / 100;
}

export function applyZoomLimits(state) {
  const map = state.mapInstance;
  const cfg = state.config;
  if (!map || !cfg || !cfg.width || !cfg.height) return null;

  const size = map.getSize();
  if (!size.x || !size.y) return null;

  // Зум, при котором карта целиком вписывается в видимую область окна.
  const fitZoom = Math.min(
    Math.log2(size.x / cfg.width),
    Math.log2(size.y / cfg.height)
  );

  // Отдаление: не дальше, чем «вся карта на экране» (с минимальным отступом).
  const minZoom = snapFloor(fitZoom - ZOOM_SNAP / 2);

  // Приближение: по умолчанию не более 2× от нативной чёткости картинки.
  const maxZoom = Math.max(cfg.maxZoom ?? DEFAULT_MAX_ZOOM, minZoom + ZOOM_SNAP);

  state.zoomLimits = { minZoom, maxZoom, fitZoom };
  map.setMinZoom(minZoom);
  map.setMaxZoom(maxZoom);
  applyMaxBounds(state);
  return state.zoomLimits;
}

// ---------- Область видимости ----------
// Ограничивает перемещение карты прямоугольником картинки (плюс небольшой отступ),
// чтобы её нельзя было утащить в пустоту. Отступ — доля от размера карты,
// настраивается через config.boundsPadding (по умолчанию 5%).
// «Жёсткость» границы задаётся maxBoundsViscosity: 1 в параметрах L.map.
const DEFAULT_BOUNDS_PADDING = 0.05;

function applyMaxBounds(state) {
  const map = state.mapInstance;
  const cfg = state.config;
  if (!map || !cfg || !cfg.width || !cfg.height) return;

  const pad = cfg.boundsPadding ?? DEFAULT_BOUNDS_PADDING;
  const padX = cfg.width * pad;
  const padY = cfg.height * pad;
  const bounds = L.latLngBounds(
    [-padY, -padX],
    [cfg.height + padY, cfg.width + padX]
  );

  state.maxBounds = bounds;
  // setMaxBounds сам вернёт карту внутрь границ, если вид уже задан;
  // до первого fitBounds (центра ещё нет) он ничего не двигает и не падает.
  map.setMaxBounds(bounds);
}

function bindZoomLimitSync(state) {
  const sync = () => applyZoomLimits(state);
  state.mapInstance.on("resize", sync);
  window.addEventListener("resize", sync);
  window.addEventListener("orientationchange", () => setTimeout(sync, 250));
}

function loadMapImage(state) {
  const cfg = state.config;
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
        bindZoomLimitSync(state);
        applyZoomLimits(state);
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
        bindZoomLimitSync(state);
        applyZoomLimits(state);
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
