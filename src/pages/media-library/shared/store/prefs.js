// ------------------------------
// File: media-library/shared/store/prefs.js
// ------------------------------
export function getStore(k, def) {
  try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(def)); }
  catch { return def; }
}