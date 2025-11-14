// src/media-library/utils/filePreviewAdapters.js
const DEV = import.meta?.env?.DEV;

function stripOrigin(u) {
  try {
    const url = new URL(u, window.location.href);
    return decodeURIComponent(url.pathname + url.search + url.hash);
  } catch {
    return decodeURIComponent((u || "").toString());
  }
}
function norm(u) {
  const s = (u || "").toString().trim();
  if (!s) return "";
  let p = stripOrigin(s).replace(/^\/+/, "");
  if (/^public\/storage\//i.test(p)) p = p.replace(/^public\/storage\//i, "storage/");
  return p.toLowerCase();
}
function toAbs(u) {
  if (!u) return null;
  const s = (u || "").toString();
  if (/^https?:\/\//i.test(s)) return s;
  if (DEV && s.startsWith("storage/")) return `/${s}`;
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/i, "");
  return base ? `${base}/${s.replace(/^\/+/, "")}` : `/${s.replace(/^\/+/, "")}`;
}

export function articleLikeFromMedia(m, article) {
  const url = toAbs(m?.fileUrl || m?.url);
  const title =
    m?.title || m?.original_filename || m?.filename || article?.title || "Aperçu";
  return {
    ...(article || {}),
    id: m?.id ?? article?.id, // ⚠️ id pour clé stable si dispo
    title,
    media: [{ url, mime: m?.mime_type }, ...((article?.media || []).filter(x => !!x?.url))],
    featured_image: undefined,
    name: m?.name,
    original_filename: m?.original_filename,
    filename: m?.filename,
    mime_type: m?.mime_type,
    thumbnail: m?.thumbnail,
    thumbnail_url: m?.thumbnail_url,
  };
}

export function buildArticleLikeArray(mediaList = [], article) {
  return mediaList
    .filter((m) => !!(m?.fileUrl || m?.url))
    .map((m) => articleLikeFromMedia(m, article));
}

/**
 * Résout l'index de départ :
 *  1) par id exact si présent
 *  2) sinon par URL normalisée
 *  3) sinon 0
 */
export function resolveStartIndexFromMedia(targetMedia, arr) {
  if (!Array.isArray(arr) || !arr.length || !targetMedia) return 0;

  const targetId = targetMedia?.id;
  if (targetId != null) {
    const i = arr.findIndex((al) => al?.id === targetId);
    if (i >= 0) return i;
  }

  const tUrl = norm(targetMedia?.fileUrl || targetMedia?.url);
  if (tUrl) {
    const i = arr.findIndex((al) => norm(al?.media?.[0]?.url) === tUrl);
    if (i >= 0) return i;
  }

  // fallback
  return 0;
}
