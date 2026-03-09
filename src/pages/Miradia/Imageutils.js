/**
 * imageUtils.js
 * Utilitaire partagé — résolution d'URLs d'images MIRADIA
 *
 * Règle unique : toute URL (relative ou absolue) est normalisée vers
 * STORAGE_BASE défini dans le .env.
 *
 * Cas critique couvert :
 *   Les URLs stockées en base de données peuvent contenir un host différent
 *   du serveur de production (ex : 127.0.0.1:8000 en dev, 84.247.x.x en prod).
 *   On extrait le chemin et on le recolle sur le bon STORAGE_BASE.
 */

/* ─── Base URL ─────────────────────────────────────────────────────────────── */
export const getStorageBase = () =>
  String(
    import.meta?.env?.VITE_API_BASE_STORAGE ||
    import.meta?.env?.VITE_API_BASE_URL     ||
    (typeof window !== "undefined" ? window.location.origin : "")
  )
    .replace(/\/api\/?$/i, "") // retire le segment /api s'il est présent
    .replace(/\/$/, "");       // retire le slash final

/**
 * Normalise n'importe quelle valeur vers un chemin relatif canonique
 * (sans scheme, sans host).
 *
 * - Retourne null si vide / falsy
 * - Pour une URL absolue : extrait le pathname et le normalise
 * - Pour un chemin relatif : le normalise directement
 */
export const normalizePath = (value) => {
  if (!value) return null;

  let s = String(value).trim();
  if (!s) return null;

  // URL absolue (http/https) → on extrait uniquement le pathname
  // Cela corrige les URLs avec un host incorrect stockées en base de données
  if (/^https?:\/\//i.test(s)) {
    try {
      s = new URL(s).pathname; // ex: "/storage/miradia-slides/abc.webp"
    } catch {
      return null; // URL malformée
    }
  }

  // Nettoie les slashes en tête
  s = s.replace(/^\/+/, "");

  // Cas déjà préfixés correctement
  if (s.startsWith("storage/"))        return s;
  if (s.startsWith("slides/"))         return `storage/${s}`;
  if (s.startsWith("miradia-slides/")) return `storage/${s}`;
  if (s.startsWith("articles/"))       return `storage/${s}`;
  if (s.startsWith("uploads/"))        return `storage/${s}`;

  // Cas générique : on suppose que c'est sous storage/
  return `storage/${s}`;
};

/**
 * Transforme n'importe quelle valeur de champ image en URL absolue
 * pointant toujours vers STORAGE_BASE (défini dans .env).
 * Retourne null si aucune valeur utilisable.
 */
export const toAbsoluteUrl = (value) => {
  const path = normalizePath(value);
  if (!path) return null;

  return `${getStorageBase()}/${path}`;
};

/**
 * Extrait l'URL d'image d'un slide en testant tous les champs connus,
 * dans l'ordre de priorité.
 */
export const extractSlideImage = (slide) => {
  if (!slide) return null;

  const candidates = [
    slide.image_url,
    slide.image_path,
    slide.image,
    slide.background_image,
    slide.background_image_url,
    slide.background_image_path,
    slide.media_url,
    slide.media_path,
    slide.photo,
    slide.photo_url,
    slide.photo_path,
    slide.featured_image,
    slide.featured_image_url,
    slide.featured_image_path,
  ];

  for (const candidate of candidates) {
    const url = toAbsoluteUrl(candidate);
    if (url) return url;
  }

  return null;
};

/**
 * Extrait l'URL d'image d'un article en testant tous les champs connus.
 * Gère aussi les champs imbriqués (objet avec .url / .path).
 */
export const extractArticleImage = (article) => {
  if (!article) return null;

  const candidates = [
    // Champs plats
    article.featured_image,
    article.featured_image_url,
    article.featured_image_path,
    article.image,
    article.image_url,
    article.image_path,
    article.cover,
    article.cover_url,
    article.thumbnail,
    article.thumbnail_url,
    // Champs imbriqués (objet)
    article.featured_image?.url,
    article.featured_image?.path,
    article.image?.url,
    article.image?.path,
  ];

  for (const candidate of candidates) {
    const url = toAbsoluteUrl(candidate);
    if (url) return url;
  }

  return null;
};