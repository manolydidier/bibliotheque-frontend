const KEY_PREFIX = "article_pwd_";

export function makeKey(slugOrId) {
  const key = (slugOrId ?? "").toString().trim();
  return KEY_PREFIX + key;
}

export function getStoredPassword(slugOrId) {
  try { return sessionStorage.getItem(makeKey(slugOrId)) || ""; }
  catch { return ""; }
}

export function setStoredPassword(slugOrId, value) {
  try { sessionStorage.setItem(makeKey(slugOrId), value || ""); }
  catch {}
}

export function clearStoredPassword(slugOrId) {
  try { sessionStorage.removeItem(makeKey(slugOrId)); }
  catch {}
}
