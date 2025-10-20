// src/media-library/parts/Visualiseur/FilePreview/helpers.js
export const toAbsolute = (u) => {
  if (!u) return null;
  const s = String(u);
  if (/^https?:\/\//i.test(s)) return s;
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/i, "");
  return base ? `${base}/${s.replace(/^\/+/, "")}` : `/${s.replace(/^\/+/, "")}`;
};

// essaie de récupérer le média principal (featured, puis 1er media)
export const pickPrimaryMedia = (file) => {
  if (!file) return { url: null, mime: "" };
  if (typeof file?.featured_image === "string") {
    return { url: file.featured_image, mime: file?.featured_image_mime || "" };
  }
  if (file?.featured_image?.url) {
    return { url: file.featured_image.url, mime: file?.featured_image?.mime || file?.featured_image?.type || "" };
  }
  const m = Array.isArray(file?.media) ? file.media[0] : null;
  if (m?.url) return { url: m.url, mime: m.mime || m.type || "" };
  return { url: null, mime: "" };
};

// déduit la “famille” à partir du mime/extension
export const guessKind = (media, file) => {
  const mime = (media?.mime || "").toLowerCase();
  const url  = (media?.url || "").toLowerCase();
  const ext  = url.split("?")[0].split("#")[0].split(".").pop() || "";

  if (mime.startsWith("image/") || /^(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(ext)) return "image";
  if (mime.startsWith("video/") || /^(mp4|webm|ogg|mov|mkv)$/i.test(ext))        return "video";
  if (mime.startsWith("audio/") || /^(mp3|wav|ogg|aac|m4a)$/i.test(ext))         return "audio";
  if (mime === "application/pdf" || ext === "pdf")                               return "pdf";

  // Office
  if (
    mime.includes("word") ||
    ["doc", "docx"].includes(ext)
  ) return "word";

  if (
    mime.includes("excel") ||
    ["xls", "xlsx", "csv"].includes(ext)
  ) return "excel";

  if (
    mime.includes("powerpoint") ||
    ["ppt", "pptx"].includes(ext)
  ) return "powerpoint";

  // SIG
  if (ext === "shp" || ext === "dbf" || ext === "shx" || ext === "prj" || ext === "cpg" || ext === "zip") {
    return "shapefile";
  }

  // Pas de média mais contenu textuel
  if (!media?.url && typeof file?.content === "string" && file.content.trim()) return "article";
  return "unknown";
};
