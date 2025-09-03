// ------------------------------
// File: media-library/shared/store/markers.js
// ------------------------------
const READ_KEY = "medialib:read"; // { [id]: timestamp }
const FAV_KEY = "medialib:fav";  // { [id]: true }

export function isRead(id) {
  try { return !!JSON.parse(localStorage.getItem(READ_KEY) || '{}')[id]; } catch { return false; }
}
export function markRead(id) {
  try {
    const map = JSON.parse(localStorage.getItem(READ_KEY) || '{}');
    map[id] = Date.now();
    localStorage.setItem(READ_KEY, JSON.stringify(map));
  } catch {}
}
export function isFav(id) {
  try { return !!JSON.parse(localStorage.getItem(FAV_KEY) || '{}')[id]; } catch { return false; }
}
export function toggleFav(id) {
  try {
    const map = JSON.parse(localStorage.getItem(FAV_KEY) || '{}');
    if (map[id]) delete map[id]; else map[id] = true;
    localStorage.setItem(FAV_KEY, JSON.stringify(map));
  } catch {}
}
