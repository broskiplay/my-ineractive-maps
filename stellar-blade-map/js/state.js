import { loadJSON } from "./storage.js";
import { CATEGORIES } from "./categories.js";

export function createState(config) {
  const activeCategories = Object.fromEntries(
    Object.keys(CATEGORIES).map((k) => [k, true])
  );

  return {
    config,
    markers: [],
    foundIds: loadJSON(`sb_found_${config.id}`, []),
    activeCategories,
    hideFoundMarkers: false,
    addMode: false,
    markersLoaded: false,
    activeCustomMarkerUid: null,
    syncingCustomMarkers: false,
    mapInstance: null,
    imageOverlay: null,
    markersLayer: null,
    scheduleCloudSync: () => {},
  };
}