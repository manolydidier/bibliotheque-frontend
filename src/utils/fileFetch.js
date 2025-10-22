// ⚠️ Mets dans .env vite l'URL de ton proxy Laravel.
// Exemple sans /api : VITE_FILE_PROXY=/file-proxy?url=
// Exemple avec /api  : VITE_FILE_PROXY=/api/file-proxy?url=
export const PROXY_PATH =
  (import.meta.env.VITE_FILE_PROXY ?? "/file-proxy?url=")
    // garantis qu'on finit par ?url=
    .replace(/\?url=?$/, "") + "?url=";

/** Extensions qui nécessitent souvent un proxy (CORS) ou sont lues par des viewers */
const PROXY_EXT = [
  "geojson", "json",
  "zip", "shp", "shx", "dbf", "prj", "cpg",
  // facultatif : active si tu veux forcer le proxy aussi pour Office local
  "doc", "docx", "ppt", "pptx", "xls", "xlsx",
];

const isBlobLike = (u) => /^blob:|^data:/i.test(u || "");
const isAlreadyProxied = (u) =>
  typeof u === "string" && u.startsWith(PROXY_PATH);

/** Retourne true si l'URL est cross-origin par rapport à la page courante */
export function isCrossOrigin(u) {
  try {
    const url = new URL(u, window.location.origin);
    return url.origin !== window.location.origin;
  } catch {
    return false;
  }
}

/** Heuristique: l’URL semble publique (HTTP(S), pas localhost/127, pas réseau privé) */
export function isLikelyPublicHttp(u) {
  try {
    const url = new URL(u, window.location.origin);
    if (!/^https?:$/i.test(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    // Local/loopback
    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return false;
    // Réseaux privés communs
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Doit-on proxifier ? */
export function shouldProxy(u) {
  if (!u || isBlobLike(u) || isAlreadyProxied(u)) return false;
  if (isCrossOrigin(u)) return true;
  // même origin mais certaines extensions ont souvent de mauvais headers en dev
  const m = String(u).toLowerCase().match(/\.([a-z0-9]+)(?:\?|#|$)/i);
  const ext = m?.[1] || "";
  return PROXY_EXT.includes(ext);
}

/** Ajoute /file-proxy?url=… (évite les doublons) */
export function proxify(u) {
  if (!u || isBlobLike(u) || isAlreadyProxied(u)) return u;
  return `${PROXY_PATH}${encodeURIComponent(u)}`;
}

/** Retourne une URL “safe CORS” (proxifiée si nécessaire) */
export function ensureCorsSafe(u) {
  return shouldProxy(u) ? proxify(u) : u;
}

/** Timeout simple via AbortController */
function wrapWithTimeout(signal, timeoutMs) {
  if (!timeoutMs) return signal || undefined;
  const ctrl = new AbortController();
  const timer = setTimeout(
    () => ctrl.abort(new DOMException("Timeout", "AbortError")),
    timeoutMs
  );
  if (signal) {
    signal.addEventListener(
      "abort",
      () => ctrl.abort(signal.reason),
      { once: true }
    );
  }
  ctrl._clear = () => clearTimeout(timer);
  return ctrl;
}

/**
 * Tente d’abord un fetch direct/ensureCorsSafe ; en cas d’échec (CORS, réseau, 4xx/5xx),
 * retente automatiquement via le proxy Laravel (proxify(url)).
 */
export async function fetchArrayBufferWithFallback(url, opts = {}) {
  const { timeoutMs = 30000, signal, fetchInit = {} } = opts;

  // 1) tentative “safe” (peut déjà être proxifiée selon shouldProxy)
  const firstUrl = ensureCorsSafe(url);
  const firstCtrl = wrapWithTimeout(signal, timeoutMs);
  try {
    const res = await fetch(firstUrl, {
      mode: "cors",
      credentials: "omit",
      signal: firstCtrl?.signal,
      ...fetchInit,
    });
    firstCtrl?._clear?.();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.arrayBuffer();
  } catch (e) {
    firstCtrl?._clear?.();

    // Si on a déjà tenté via proxy, blob/data, on remonte l’erreur
    if (isAlreadyProxied(firstUrl) || isBlobLike(firstUrl)) throw e;

    // 2) tentative explicite via proxy
    const proxied = proxify(url);
    const secondCtrl = wrapWithTimeout(signal, timeoutMs);
    const res2 = await fetch(proxied, {
      mode: "cors",
      credentials: "omit",
      signal: secondCtrl?.signal,
      ...fetchInit,
    });
    secondCtrl?._clear?.();
    if (!res2.ok) throw new Error(`Proxy HTTP ${res2.status}`);
    return await res2.arrayBuffer();
  }
}

/** Conveniences */
export async function fetchTextWithFallback(url, opts = {}) {
  const buf = await fetchArrayBufferWithFallback(url, opts);
  return new TextDecoder().decode(new Uint8Array(buf));
}

export async function fetchJsonWithFallback(url, opts = {}) {
  const txt = await fetchTextWithFallback(url, opts);
  return JSON.parse(txt);
}
// src/utils/fileFetch.js (ajoute ceci en bas)


