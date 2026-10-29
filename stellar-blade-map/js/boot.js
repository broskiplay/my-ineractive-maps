import { MAP_CONFIGS, migrateLegacyStorage } from "./config.js";
import { initApp } from "./app.js";
import { escapeHtml } from "./utils.js";

migrateLegacyStorage();

const urlMapId = new URLSearchParams(location.search).get("map");
const mapId = urlMapId || document.body.dataset.map || "eidos7";

console.log("🚀 Boot: Запуск карты с ID:", mapId);

// Переключатель карт привязываем сразу, не дожидаясь загрузки изображения,
// меток и Firebase. Иначе выбор другой карты в меню может «не сработать».
const navSelector = document.getElementById("page-nav-selector");
if (navSelector) {
  navSelector.value = `index.html?map=${mapId}`;
  navSelector.addEventListener("change", () => {
    if (navSelector.value) window.location.assign(navSelector.value);
  });
}

const config = MAP_CONFIGS[mapId];
if (!config) {
  document.body.innerHTML = `
    <div style="padding:40px;color:#edf2f7;font-family:sans-serif">
      <h1>Карта не найдена</h1>
      <p>ID «${escapeHtml(mapId)}» отсутствует в config.js</p>
      <a href="index.html?map=eidos7" style="color:#c7ff3f">Вернуться на Эйдос 7</a>
    </div>`;
  throw new Error(`Неизвестная карта: ${mapId}`);
}

try {
  localStorage.setItem("sb_last_map", config.htmlFile);
} catch (error) {
  console.warn("Не удалось запомнить последнюю открытую карту:", error);
}
document.title = `Интерактивная карта Stellar Blade — ${config.name}`;

initApp(config).catch((err) => {
  console.error("Ошибка инициализации карты:", err);
});