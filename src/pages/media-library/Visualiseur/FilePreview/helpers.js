// src/media-library/parts/Visualiseur/FilePreview/helpers.js
export function toAbsolute(u) {
  if (!u) return u;
  const s = String(u).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/i, "");
  return base ? `${base}/${s.replace(/^\/+/, "")}` : `/${s.replace(/^\/+/, "")}`;
}

// Retourne {url, mime, title?} à partir d'un article ou d'un media
export function pickPrimaryMedia(file) {
  if (!file) return { url: "", mime: "" };

  const fromMedia =
    Array.isArray(file.media) && file.media.length ? file.media[0] : null;

  const url =
    (fromMedia && (fromMedia.url || fromMedia.fileUrl)) ||
    (typeof file.featured_image === "string" && file.featured_image) ||
    (file.featured_image && file.featured_image.url) ||
    "";

  const mime =
    (fromMedia && (fromMedia.mime || fromMedia.mime_type)) ||
    file.mime ||
    file.mime_type ||
    "";

  const title = file.title || fromMedia?.name || fromMedia?.filename || "";
  return { url, mime, title };
}

// Détecte le "kind" à partir de l'URL et/ou du MIME
export function guessKind(media, file) {
  const url = (media?.url || "").toLowerCase();
  const mime = (media?.mime || "").toLowerCase();

  // HTML (ajout)
  if (mime.includes("text/html") || /\.(x?html?)($|\?|\#)/i.test(url)) {
    return "html";
  }

  // GeoJSON (ajout)
  if (mime.includes("geo+json") || /\.geojson($|\?|\#)/i.test(url)) {
    return "geojson";
  }

  // Shapefile zippé
  if (url.endsWith(".zip") && !mime) return "shapefile";
  if (mime.includes("zip") && /(?:\/|\.)(shp|shx|dbf)(?:$|\?|\#)/i.test(url)) return "shapefile";

  // Documents
  if (mime.includes("pdf") || url.endsWith(".pdf")) return "pdf";
  if (mime.includes("presentation") || /\.(pptx?|ppsx?)($|\?|\#)/i.test(url)) return "powerpoint";
  if (mime.includes("spreadsheet") || /\.(xlsx?|csv)($|\?|\#)/i.test(url)) return "excel";
  if (mime.includes("msword") || mime.includes("word") || /\.(docx?|rtf)($|\?|\#)/i.test(url)) return "word";

  // Médias
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|avif)($|\?|\#)/i.test(url)) return "image";
  if (mime.startsWith("video/") || /\.(mp4|webm|ogg|mov)($|\?|\#)/i.test(url)) return "video";
  if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|flac)($|\?|\#)/i.test(url)) return "audio";

  // "article" si pas de média mais contenu texte
  const hasContent = (file?.content || "").toString().trim().length > 0;
  if (!url && hasContent) return "article";

  return "other";
}
