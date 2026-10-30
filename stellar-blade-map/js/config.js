// width / height — реальные размеры PNG-карты в пикселях (ширина × высота).
// sourceWidth / sourceHeight — размер исходного холста, в координатах которого
// записаны метки в JSON. Если они не заданы, координаты уже в пикселях картинки.
// При загрузке картинки app.js дополнительно сверяет width/height с naturalWidth/naturalHeight.
//
// maxZoom — предел приближения относительно нативной чёткости картинки
// (CRS.Simple: 0 = 1 пиксель карты на 1 пиксель экрана, 1 = двукратное увеличение).
// Минимальный зум жёстко не задаётся: app.js рассчитывает его от размера окна,
// чтобы карту нельзя было отдалить меньше, чем «вся карта на экране».
// Для маленьких картинок (Атлесс Левуар) предел приближения выше — иначе их не рассмотреть.
export const MAP_CONFIGS = {
  eidos7: {
    id: "eidos7",
    name: "Эйдос 7 (Eidos 7)",
    htmlFile: "eidos7.html",
    markersFile: "data/eidos7_data.json",
    image: "maps/eidos7.png",
    altImages: ["maps/eidos-7.png"],
    width: 8194, height: 7809,
    maxZoom: 1,
  },
  xion: {
    id: "xion",
    name: "Город Ксион (Xion City)",
    htmlFile: "xion.html",
    markersFile: "data/xion_data.json",
    image: "maps/xion.png",
    altImages: [],
    width: 9104, height: 7028,
    maxZoom: 1,
  },
  wasteland: {
    id: "wasteland",
    name: "Пустошь (Wasteland)",
    htmlFile: "wasteland.html",
    markersFile: "data/wasteland_data.json",
    image: "maps/wasteland.png",
    altImages: [],
    width: 7159, height: 8937,
    maxZoom: 1,
  },
  "altess-levoire": {
    id: "altess-levoire",
    name: "Атлесс Левуар (Altess Levoire)",
    htmlFile: "altess_levoire.html",
    markersFile: "data/altess_levoire_data.json",
    image: "maps/altess_levoire.png",
    altImages: ["maps/altess-levoire.png"],
    width: 768, height: 780,
    // Картинка небольшая — разрешаем приближение до 4× от нативной чёткости.
    maxZoom: 2,
  },
  "matrix-11": {
    id: "matrix-11",
    name: "Матрица 11 (Matrix 11)",
    htmlFile: "matrix11.html",
    markersFile: "data/stellar_blade_matrix-11_markers.json",
    image: "maps/matrix11.png",
    altImages: ["maps/matrix-11.png"],
    width: 7630, height: 8385,
    sourceWidth: 8192, sourceHeight: 8192,
    maxZoom: 1,
  },
  "great-desert": {
    id: "great-desert",
    name: "Великая пустыня (Great Desert)",
    htmlFile: "great_desert.html",
    markersFile: "data/stellar_blade_great-desert_markers.json",
    image: "maps/great_desert.png",
    altImages: ["maps/great-desert.png", "maps/Great Desert.png"],
    width: 8806, height: 7266,
    sourceWidth: 8192, sourceHeight: 8192,
    maxZoom: 1,
  },
  "abyss-levoire": {
    id: "abyss-levoire",
    name: "Бездна Левуар (Abyss Levoire)",
    htmlFile: "abyss_levoire.html",
    markersFile: "data/stellar_blade_abyss-levoire_markers.json",
    image: "maps/abyss_levoire.png",
    altImages: ["maps/abyss-levoire.png"],
    width: 6585, height: 9716,
    sourceWidth: 8192, sourceHeight: 8192,
    maxZoom: 1,
  },
  "spire-4": {
    id: "spire-4",
    name: "Шпиль 4 (Spire 4)",
    htmlFile: "spire4.html",
    markersFile: "data/stellar_blade_spire-4_markers.json",
    image: "maps/spire4.png",
    altImages: ["maps/spire-4.png"],
    width: 8333, height: 7678,
    sourceWidth: 8192, sourceHeight: 8192,
    maxZoom: 1,
  },
  "eidos-9": {
    id: "eidos-9",
    name: "Эйдос 9 (Eidos 9)",
    htmlFile: "eidos9.html",
    markersFile: "data/stellar_blade_eidos-9_markers.json",
    image: "maps/eidos9.png",
    altImages: ["maps/eidos-9.png"],
    width: 8283, height: 7725,
    sourceWidth: 8192, sourceHeight: 8192,
    maxZoom: 1,
  },
};

export function migrateLegacyStorage() {
  try {
    const map = {
      altess_levoire: "altess-levoire",
      matrix11: "matrix-11",
      great_desert: "great-desert",
      abyss_levoire: "abyss-levoire",
      spire4: "spire-4",
      eidos9: "eidos-9",
    };
    for (const [oldId, newId] of Object.entries(map)) {
      ["markers", "found", "checkpoint"].forEach((kind) => {
        const oldKey = `sb_${kind}_${oldId}`;
        const newKey = `sb_${kind}_${newId}`;
        const oldVal = localStorage.getItem(oldKey);
        if (oldVal && !localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, oldVal);
        }
      });
    }
  } catch (error) {
    console.warn("Не удалось перенести старые данные карт в localStorage:", error);
  }
}