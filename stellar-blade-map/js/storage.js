export const loadJSON = (key, fallback) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

export const saveJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Не удалось сохранить данные «${key}» в localStorage:`, error);
    return false;
  }
};

export const storageKeys = (mapId) => ({
  markers: `sb_markers_${mapId}`,
  found: `sb_found_${mapId}`,
  checkpoint: `sb_checkpoint_${mapId}`,
  userMarkers: (uid) => `sb_user_markers_${mapId}_${uid}`,
});