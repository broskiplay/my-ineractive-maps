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
    crs: L.CRS.Simple,
    minZoom: -5,
    maxZoom: 4,
    zoomSnap: 0.25,
    attributionControl: false,
  });
  window.__mapInstance = state.mapInstance;

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
  ctx.font = "bold 20px 'Orbitron', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Положите файл "${fileName}" в папку`, canvas.width / 2, canvas.height / 2);
  return canvas.toDataURL();
}