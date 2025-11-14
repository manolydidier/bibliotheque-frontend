// src/pages/articles/ArticleMediaManager.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
  FiUpload, FiEdit3, FiTrash2, FiImage, FiRefreshCw, FiStar,
  FiToggleLeft, FiToggleRight, FiAlertTriangle, FiX, FiGrid, FiList,
  FiSearch, FiFilter, FiChevronDown, FiChevronUp, FiRotateCcw, FiCheckSquare,
  FiSquare, FiCornerDownLeft, FiLink, FiExternalLink, FiEye, FiVideo, FiMusic,
  FiFile, FiFileText, FiArchive
} from "react-icons/fi";
import { useSearchParams, useLocation } from "react-router-dom";

/* =========================================================
   Portal util (placé en haut pour éviter toute surprise)
   ========================================================= */
const ModalPortal = ({ children }) => {
  const target =
    (typeof document !== "undefined" &&
      (document.getElementById("modal-root") || document.body)) ||
    null;
  return target ? createPortal(children, target) : null;
};

/* =========================================================
   AXIOS LOCAL
   ========================================================= */
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) ||
  '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  try {
    const token =
      (typeof localStorage !== "undefined" && localStorage.getItem("tokenGuard")) ||
      null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else {
    if (!config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }
  }
  config.headers.Accept = "application/json";
  return config;
});

const ROUTES = {
  byArticle: (articleId) => `/article-media/by-article/${articleId}`,
  index: `/article-media`,
  upload: `/article-media/upload`,
  update: (id) => `/article-media/${id}`,
  destroy: (id) => `/article-media/${id}`,
  toggleActive: (id) => `/article-media/${id}/toggle-active`,
  toggleFeatured: (id) => `/article-media/${id}/toggle-featured`,
  restore: (id) => `/article-media/${id}/restore`,
  force: (id) => `/article-media/${id}/force`,
};

const http = {
  async listByArticle(articleId, params = {}) {
    return api.get(ROUTES.byArticle(articleId), { params });
  },
  async listTrashedByArticle(articleId, params = {}) {
    return api.get(ROUTES.index, { params: { article_id: articleId, trashed: 'only', ...params } });
  },
  async upload(fd, onProgress) {
    return api.post(ROUTES.upload, fd, { onUploadProgress: onProgress });
  },
  async update(id, payload) {
    return api.put(ROUTES.update(id), payload);
  },
  async destroy(id) {
    return api.delete(ROUTES.destroy(id));
  },
  async toggleActive(id) {
    return api.post(ROUTES.toggleActive(id));
  },
  async toggleFeatured(id) {
    return api.post(ROUTES.toggleFeatured(id));
  },
  async restore(id) {
    return api.post(ROUTES.restore(id));
  },
  async forceDelete(id) {
    return api.delete(ROUTES.force(id));
  },
};

/* =========================================================
   URL Helpers — affichage via VITE_API_BASE_STORAGE
   ========================================================= */
const RAW_STORAGE_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_STORAGE) ||
  (typeof process !== 'undefined' && process.env?.VITE_API_BASE_STORAGE) ||
  "";
const ABS_STORAGE_BASE = (() => {
  let base = (RAW_STORAGE_BASE || "").trim();
  if (!base) {
    if (API_BASE_URL) base = API_BASE_URL.replace(/\/api(?:\/.*)?$/i, "");
  }
  try { return base.replace(/\/+$/, ""); } catch { return ""; }
})();

const isAbsoluteLike = (u = "") =>
  /^https?:\/\//i.test(u) || /^blob:/i.test(u) || /^data:/i.test(u);

const fixMediaPath = (u) => {
  if (!u) return u;
  let s = String(u).trim();
  if (isAbsoluteLike(s)) return s;
  s = s.replace(/^\/+/, '');
  if (s.startsWith('storage/')) return s;
  if (s.startsWith('articles/') || s.startsWith('thumbnails/') || s.startsWith('uploads/')) {
    return `storage/${s}`;
  }
  return s;
};

const toAbsoluteMedia = (u) => {
  if (!u) return null;
  const s = String(u).trim();
  if (isAbsoluteLike(s)) return s;
  const fixed = fixMediaPath(s);
  const rel = fixed.replace(/^\/+/, '');
  return ABS_STORAGE_BASE ? `${ABS_STORAGE_BASE}/${rel}` : `/${rel}`;
};

const isImageMime = (mt = "") => /^image\//i.test(mt);
const isVideoMime = (mt = "") => /^video\//i.test(mt);
const isAudioMime = (mt = "") => /^audio\//i.test(mt);
const isPdfMime   = (mt = "") => /^application\/pdf$/i.test(mt);
const looksLikeImagePath = (u = "") => /\.(png|jpe?g|webp|gif|avif|bmp|svg)$/i.test(u || "");

/* =========================================================
   ❗️Thumb logic révisé : JAMAIS de thumb pour non-images
   ========================================================= */
const mediaHref = (m) => toAbsoluteMedia(m?.path ?? m?.url ?? "");

/**
 * Retourne une miniature uniquement si c'est une image.
 */
const mediaThumb = (m) => {
  const mt = (m?.mime_type || m?.mime || "").toLowerCase();
  if (!isImageMime(mt)) return null;
  const rawThumb = m?.thumbnail_path ?? m?.thumbnail_url ?? "";
  const rawFull  = m?.path ?? m?.url ?? "";
  if (rawThumb && looksLikeImagePath(rawThumb)) return toAbsoluteMedia(rawThumb);
  if (looksLikeImagePath(rawFull)) return toAbsoluteMedia(rawFull);
  return null;
};

/* =========================================================
   Helpers "type" (icônes & étiquettes)
   ========================================================= */
const getExt = (m) => {
  const n = (m?.name || "").toLowerCase();
  const p = (m?.path || m?.url || "").toLowerCase();
  const s = n || p;
  const match = s.match(/\.([a-z0-9]+)(?:\?.*)?$/i);
  return match ? match[1] : "";
};

const mediaKind = (m) => {
  const mt = (m?.mime_type || m?.mime || "").toLowerCase();
  const ext = getExt(m);
  if (isImageMime(mt) || ["png","jpg","jpeg","webp","gif","svg","bmp","avif"].includes(ext)) return "image";
  if (isVideoMime(mt) || ["mp4","webm","ogg","mov","m4v","avi","mkv"].includes(ext)) return "video";
  if (isAudioMime(mt) || ["mp3","wav","ogg","m4a","aac","flac"].includes(ext)) return "audio";
  if (isPdfMime(mt) || ext === "pdf") return "pdf";
  if (["doc","docx","rtf"].includes(ext)) return "word";
  if (["xls","xlsx"].includes(ext)) return "excel";
  if (["ppt","pptx"].includes(ext)) return "ppt";
  if (["csv"].includes(ext)) return "csv";
  if (["zip","rar","7z"].includes(ext)) return "zip";
  if (["txt","md"].includes(ext)) return "text";
  return "file";
};

const kindMeta = (kind) => {
  const icons = {
    image: FiImage, video: FiVideo, audio: FiMusic, pdf: FiFileText,
    word: FiFileText, excel: FiFileText, ppt: FiFileText, csv: FiFileText,
    zip: FiArchive, text: FiFileText, file: FiFile,
  };
  const labels = {
    image: "Image", video: "Vidéo", audio: "Audio", pdf: "PDF",
    word: "Word", excel: "Excel", ppt: "PPT", csv: "CSV",
    zip: "ZIP", text: "Texte", file: "Document"
  };
  const colors = {
    image: "bg-blue-50 border-blue-200 text-blue-800",
    video: "bg-violet-50 border-violet-200 text-violet-800",
    audio: "bg-amber-50 border-amber-200 text-amber-800",
    pdf: "bg-rose-50 border-rose-200 text-rose-800",
    word: "bg-sky-50 border-sky-200 text-sky-800",
    excel: "bg-emerald-50 border-emerald-200 text-emerald-800",
    ppt: "bg-orange-50 border-orange-200 text-orange-800",
    csv: "bg-teal-50 border-teal-200 text-teal-800",
    zip: "bg-slate-50 border-slate-200 text-slate-700",
    text: "bg-slate-50 border-slate-200 text-slate-700",
    file: "bg-slate-50 border-slate-200 text-slate-700",
  };
  const Icon = icons[kind] || FiFile;
  return { label: labels[kind] || "Document", Icon, cls: colors[kind] || "bg-slate-50 border-slate-200 text-slate-700" };
};

const TypeChip = ({ kind, className = "" }) => {
  const { label, Icon, cls } = kindMeta(kind);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${cls} ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
};

/* =========================================================
   Fallback covers (extension/kind) + onError helper
   ========================================================= */
const COVERS_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MEDIA_COVERS_BASE) ||
  '/covers';

const COVER_BY_EXT = {
  png: 'image.png', jpg: 'image.png', jpeg: 'image.png', webp: 'image.png', gif: 'image.png', svg: 'image.png', bmp: 'image.png', avif: 'image.png',
  mp4: 'video.png', webm: 'video.png', ogg: 'video.png', mov: 'video.png', m4v: 'video.png', avi: 'video.png', mkv: 'video.png',
  mp3: 'audio.png', wav: 'audio.png', m4a: 'audio.png', aac: 'audio.png', flac: 'audio.png',
  pdf: 'pdf.png',
  doc: 'office-word.png', docx: 'office-word.png', rtf: 'office-word.png',
  xls: 'office-excel.png', xlsx: 'office-excel.png',
  ppt: 'office-powerpoint.png', pptx: 'office-powerpoint.png',
  csv: 'csv.png',
  txt: 'text.png', md: 'text.png',
  zip: 'zip.png', rar: 'zip.png', '7z': 'zip.png'
};

const COVER_BY_KIND = {
  image: 'image.png',
  video: 'video.png',
  audio: 'audio.png',
  pdf: 'pdf.png',
  word: 'office-word.png',
  excel: 'office-excel.png',
  ppt: 'office-powerpoint.png',
  csv: 'csv.png',
  zip: 'zip.png',
  text: 'text.png',
  file: 'file.png',
};

function coverSrc(file) {
  const url = `${COVERS_BASE}/${file}`;
  return url;
}

const coverForMedia = (m) => {
  const ext = getExt(m);
  if (ext && COVER_BY_EXT[ext]) return coverSrc(COVER_BY_EXT[ext]);
  const kind = mediaKind(m);
  if (COVER_BY_KIND[kind]) return coverSrc(COVER_BY_KIND[kind]);
  return coverSrc('file.png');
};

const onImgErrorToCover = (m) => (e) => {
  const el = e?.currentTarget;
  if (!el) return;
  el.onerror = null;
  const k = mediaKind(m);
  const mapOfficeFallback = {
    word: 'word.png',
    excel: 'excel.png',
    ppt: 'ppt.png',
  };
  const wanted = coverForMedia(m);
  const final = wanted.includes('office-') ? `${COVERS_BASE}/${mapOfficeFallback[k] || 'file.png'}` : wanted;
  el.src = final;
};

/* =========================================================
   UI Utils
   ========================================================= */
const fmtBytes = (b = 0) => {
  const n = Number(b) || 0;
  if (n < 1024) return `${n} o`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} Ko`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} Mo`;
  return `${(n / 1024 ** 3).toFixed(1)} Go`;
};

const Badge = ({ children, className = "" }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${className}`}>
    {children}
  </span>
);

const IconBtn = ({ title, onClick, className = "", children, disabled }) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center rounded-xl border-2 px-2.5 py-2 text-sm font-semibold transition-colors
      ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50"}
      ${className}`}
  >
    {children}
  </button>
);

const TinyIconBtn = ({ title, onClick, className = "", children, disabled }) => (
  <button
    title={title}
    onClick={(e) => { e.stopPropagation?.(); onClick?.(e); }}
    disabled={disabled}
    className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border-2 text-sm font-semibold transition-colors
      ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50"}
      ${className}`}
  >
    {children}
  </button>
);

const Toast = ({ open, kind = "success", msg = "" }) => {
  const color =
    kind === "error" ? "bg-rose-600"
      : kind === "warn" ? "bg-amber-600"
      : "bg-emerald-600";
  return (
    <div
      className={`fixed right-4 top-4 z-[10000] transition-all duration-300 ${
        open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
      }`}
    >
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${color} text-white shadow-lg`}>
        {kind === "error" ? <FiX className="w-5 h-5" /> : <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">✓</span>}
        <span className="text-sm font-semibold">{msg}</span>
      </div>
    </div>
  );
};

/* =========================================================
   Modal universel de visualisation
   ========================================================= */
const ViewerModal = ({ open, media, onClose }) => {
  const src = media ? mediaHref(media) : "";
  const mt  = (media?.mime_type || media?.mime || "").toLowerCase();
  const name = media?.name || "";
  const size = media?.size;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !media) return null;

  const header = (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="font-bold text-slate-900 truncate">{name || "(fichier)"}</div>
        <div className="text-xs text-slate-500 truncate">{mt || "document"}{size ? ` • ${fmtBytes(size)}` : ""}</div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold inline-flex items-center gap-2"
          title="Ouvrir dans un nouvel onglet"
        >
          <FiExternalLink /> Ouvrir
        </a>
        <a
          href={src}
          download
          className="px-3 py-1.5 rounded-xl border-2 border-blue-200 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
        >
          Télécharger
        </a>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
        >
          Fermer
        </button>
      </div>
    </div>
  );

  const body = (() => {
    if (isImageMime(mt)) {
      const imgSrc = mediaThumb(media) || src || coverForMedia(media);
      return (
        <img
          src={imgSrc}
          alt={name || "aperçu"}
          className="w-full h-auto max-h-[78vh] object-contain rounded-xl"
          onError={onImgErrorToCover(media)}
        />
      );
    }
    if (isVideoMime(mt)) return <video src={src} controls className="w-full max-h-[78vh] rounded-xl" />;
    if (isAudioMime(mt)) {
      return (
        <div className="w-full rounded-xl bg-slate-50 border border-slate-200 p-4">
          <audio src={src} controls className="w-full" />
        </div>
      );
    }
    if (isPdfMime(mt)) return <iframe src={src} title={name || "PDF"} className="w-full h-[78vh] rounded-xl bg-white" />;
    return (
      <div className="w-full h-[50vh] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-600">
        <img
          src={coverForMedia(media)}
          alt="icône fichier"
          className="w-24 h-24 mb-3"
          onError={onImgErrorToCover(media)}
        />
        <div className="text-sm font-semibold">Aucun aperçu disponible pour ce type. Utilisez “Ouvrir” ou “Télécharger”.</div>
      </div>
    );
  })();

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100050] flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-[100051] w-full max-w-6xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
          {header}
          {body}
        </div>
      </div>
    </ModalPortal>
  );
};

/* =========================================================
   Dialog de confirmation
   ========================================================= */
const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, danger = false }) => {
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflowY;
    html.style.overflowY = "hidden";
    return () => { html.style.overflowY = prev; };
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
      if (e.key === "Enter") onConfirm?.();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4" aria-modal="true" role="alertdialog">
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative z-[100001] w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${danger ? "bg-rose-100" : "bg-blue-100"}`}>
              {danger ? <FiAlertTriangle className="w-6 h-6 text-rose-600" /> : <FiImage className="w-6 h-6 text-blue-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-xl text-white font-semibold shadow transition-colors ${
                danger ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
/* =========================================================
   Modal Upload — multi-fichiers + switch Parallèle/File d’attente
   ========================================================= */
const UploadModal = ({ open, onClose, onUploaded, articleId }) => {
  const [files, setFiles] = useState([]);              // <— plusieurs fichiers
  const [previews, setPreviews] = useState([]);        // [{url, type, name, size}]
  const [names, setNames] = useState([]);              // noms par fichier
  const [alts, setAlts] = useState([]);                // alt fr par fichier
  const [captions, setCaptions] = useState([]);        // légende fr par fichier
  const [isFeatured, setIsFeatured] = useState(false); // option commune
  const [submitting, setSubmitting] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0); // 0-100 global
  const [perFileProgress, setPerFileProgress] = useState([]); // 0-100 par index
  const [err, setErr] = useState("");

  // ⚡️ Nouveau : switch de stratégie d’envoi
  const [uploadParallel, setUploadParallel] = useState(true); // true = Parallèle, false = File d'attente

  const dropRef = useRef(null);

  const revokeIfBlob = (url) => {
    try { if (url && typeof url === "string" && url.startsWith("blob:")) URL.revokeObjectURL(url); } catch {}
  };

  // Gestion scroll body
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflowY;
    html.style.overflowY = "hidden";
    return () => { html.style.overflowY = prev; };
  }, [open]);

  // DnD
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    const drop = (e) => {
      prevent(e);
      const list = Array.from(e.dataTransfer?.files || []);
      if (list.length) onPickMany(list);
    };
    ["dragenter","dragover","dragleave","drop"].forEach((evt) => el.addEventListener(evt, prevent));
    el.addEventListener("drop", drop);
    return () => {
      ["dragenter","dragover","dragleave","drop"].forEach((evt) => el.removeEventListener(evt, prevent));
      el.removeEventListener("drop", drop);
    };
  }, []);

  // Reset à la fermeture
  useEffect(() => {
    if (!open) {
      previews.forEach(p => revokeIfBlob(p?.url));
      setFiles([]); setPreviews([]); setNames([]); setAlts([]); setCaptions([]);
      setIsFeatured(false); setSubmitting(false);
      setOverallProgress(0); setPerFileProgress([]); setErr("");
      setUploadParallel(true);
    }
  }, [open]);

  useEffect(() => () => previews.forEach(p => revokeIfBlob(p?.url)), [previews]);

  const onPickMany = (list) => {
    const maxSize = 100 * 1024 * 1024; // 100 MB/file
    const rejected = list.filter(f => f.size > maxSize);
    if (rejected.length) {
      setErr(`Fichier trop volumineux (>${fmtBytes(maxSize)}): ${rejected.map(f=>f.name).join(", ")}`);
      return;
    }
    const nextFiles = [...files, ...list];
    setFiles(nextFiles);
    // Préviews
    const addPreviews = list.map((f) => ({
      url: URL.createObjectURL(f),
      type: f.type || "",
      name: f.name,
      size: f.size
    }));
    setPreviews((prev) => [...prev, ...addPreviews]);
    // Champs texte initiaux
    setNames((prev) => [...prev, ...list.map(f => f.name.replace(/\.[^.]+$/, ""))]);
    setAlts((prev) => [...prev, ...list.map(() => "")]);
    setCaptions((prev) => [...prev, ...list.map(() => "")]);
    // Progress par fichier
    setPerFileProgress((prev) => [...prev, ...list.map(() => 0)]);
    setErr("");
  };

  const onInputFiles = (e) => {
    const list = Array.from(e.target.files || []);
    if (list.length) onPickMany(list);
  };

  const removeAt = (idx) => {
    const p = previews[idx]; revokeIfBlob(p?.url);
    setFiles((arr) => arr.filter((_,i)=>i!==idx));
    setPreviews((arr) => arr.filter((_,i)=>i!==idx));
    setNames((arr) => arr.filter((_,i)=>i!==idx));
    setAlts((arr) => arr.filter((_,i)=>i!==idx));
    setCaptions((arr) => arr.filter((_,i)=>i!==idx));
    setPerFileProgress((arr) => arr.filter((_,i)=>i!==idx));
  };

  const uploadOne = async (file, idx) => {
    const fd = new FormData();
    fd.append("file", file, file.name);
    fd.append("article_id", String(articleId));
    fd.append("name", names[idx] || file.name);
    const alt = alts[idx]; if (alt) fd.append("alt_text[fr]", alt);
    const cap = captions[idx]; if (cap) fd.append("caption[fr]", cap);
    fd.append("is_featured", isFeatured ? "1" : "0");

    let lastLoaded = 0, lastTotal = file.size || 1;
    const onProg = (pe) => {
      const loaded = pe.loaded ?? lastLoaded;
      const total = pe.total ?? lastTotal;
      setPerFileProgress((prev) => {
        const copy = [...prev];
        copy[idx] = Math.min(100, Math.round((loaded * 100) / total));
        return copy;
      });
      // progress global = moyenne pondérée (simple moyenne ici)
      setOverallProgress((_) => {
        const arr = (prev => prev)([]); // dummy pour lisibilité
        const local = (perFileProgress => perFileProgress)([]); // no-op
        // on recalcule depuis state le plus frais via callback:
        return setPerFileProgress((current) => {
          const avg = current.length
            ? Math.round(current.reduce((a,b)=>a+b,0) / current.length)
            : 0;
          // retourner la même valeur, mais on est dans un setState imbriqué,
          // on ne veut pas changer perFileProgress ici; du coup on “triche” :
          // on met à jour overall en dehors :
          setOverallProgress(avg);
          return current;
        }), 0;
      });
      lastLoaded = loaded; lastTotal = total;
    };

    const res = await http.upload(fd, onProg);
    const payload = res?.data?.data || res?.data;
    // notifier le parent pour rafraîchir
    onUploaded?.(payload);
  };

  const submit = async () => {
    setErr("");
    if (!files.length) { setErr("Ajoutez au moins un fichier."); return; }
    try {
      setSubmitting(true);
      setOverallProgress(0);
      setPerFileProgress((arr) => arr.map(() => 0));

      if (uploadParallel) {
        // Envois simultanés
        await Promise.all(files.map((f, i) => uploadOne(f, i)));
      } else {
        // Envois séquentiels (file d'attente)
        for (let i = 0; i < files.length; i++) {
          await uploadOne(files[i], i);
        }
      }
      onClose?.();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Erreur lors du téléversement";
      setErr(msg);
    } finally {
      setSubmitting(false);
      setOverallProgress(0);
      setPerFileProgress((arr) => arr.map(() => 0));
    }
  };

  if (!open) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4" aria-modal="true" role="dialog">
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={!submitting ? onClose : undefined} />
        <div className="relative z-[100001] w-full max-w-3xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Ajouter des médias</h3>
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-3 py-1.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-50"
            >
              Fermer
            </button>
          </div>

          {/* Switch stratégie */}
          <div className="flex items-center justify-between rounded-2xl border-2 border-slate-200 p-3">
            <div className="text-sm font-semibold text-slate-700">
              Mode d’envoi : <span className="text-slate-900">{uploadParallel ? "Parallèle (plus rapide)" : "File d’attente (plus fiable)"}</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs text-slate-600">File d’attente</span>
              <input
                type="checkbox"
                className="sr-only"
                checked={uploadParallel}
                onChange={(e) => setUploadParallel(e.target.checked)}
                disabled={submitting}
              />
              <span className={`relative inline-flex h-6 w-11 items-center rounded-full ${uploadParallel ? "bg-blue-600" : "bg-slate-300"}`}>
                <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${uploadParallel ? "translate-x-5" : "translate-x-0"}`} />
              </span>
              <span className="text-xs text-slate-600">Parallèle</span>
            </label>
          </div>

          {/* Zone de dépôt */}
          <div ref={dropRef} className="rounded-2xl border-2 border-dashed border-slate-300 p-6 bg-slate-50/60 text-center">
            {!files.length ? (
              <div className="text-slate-600">
                <FiUpload className="w-8 h-8 mx-auto mb-3" />
                <div className="font-semibold">Déposez des fichiers ici</div>
                <div className="text-xs mt-1 text-slate-500">Max: 100 MB par fichier</div>
              </div>
            ) : (
              <div className="text-left">
                <div className="text-sm font-semibold text-slate-700 mb-2">
                  {files.length} fichier{files.length>1?'s':''} sélectionné{files.length>1?'s':''}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-auto pr-1">
                  {files.map((f, idx) => {
                    const prev = previews[idx];
                    const mt = prev?.type || "";
                    const ext = (f.name.split('.').pop() || "").toLowerCase();
                    const cover = COVER_BY_EXT[ext] ? coverSrc(COVER_BY_EXT[ext]) : `${COVERS_BASE}/file.png`;
                    const imgLike = isImageMime(mt);
                    return (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3 flex gap-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                          {imgLike ? (
                            <img
                              src={prev?.url}
                              alt={f.name}
                              className="w-full h-full object-cover"
                              onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src = `${COVERS_BASE}/image.png`; }}
                            />
                          ) : (
                            <img
                              src={cover}
                              alt="icône fichier"
                              className="w-12 h-12"
                              onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src = `${COVERS_BASE}/file.png`; }}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-800 truncate">{f.name}</div>
                          <div className="text-[11px] text-slate-500 mb-2">{fmtBytes(f.size)}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              value={names[idx] || ""}
                              onChange={(e)=> setNames(arr => { const c=[...arr]; c[idx]=e.target.value; return c; })}
                              className="w-full px-3 py-1.5 rounded-lg border-2 border-slate-200 text-sm"
                              placeholder="Nom interne"
                              disabled={submitting}
                            />
                            <input
                              value={alts[idx] || ""}
                              onChange={(e)=> setAlts(arr => { const c=[...arr]; c[idx]=e.target.value; return c; })}
                              className="w-full px-3 py-1.5 rounded-lg border-2 border-slate-200 text-sm"
                              placeholder="Texte alternatif (FR)"
                              disabled={submitting}
                            />
                            <input
                              value={captions[idx] || ""}
                              onChange={(e)=> setCaptions(arr => { const c=[...arr]; c[idx]=e.target.value; return c; })}
                              className="w-full px-3 py-1.5 rounded-lg border-2 border-slate-200 text-sm sm:col-span-2"
                              placeholder="Légende (FR)"
                              disabled={submitting}
                            />
                          </div>
                          {/* Progress individuel */}
                          {submitting && (
                            <div className="mt-2">
                              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${perFileProgress[idx] || 0}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => removeAt(idx)}
                          disabled={submitting}
                          className="self-start w-8 h-8 rounded-lg border-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                          title="Retirer"
                        >
                          <FiX className="m-auto" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mt-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold cursor-pointer">
                <FiUpload />
                Choisir des fichiers
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.zip,.txt,.md,.rtf"
                  className="sr-only"
                  disabled={submitting}
                  onChange={onInputFiles}
                />
              </label>
            </div>
          </div>

          {/* Options communes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 text-sm text-slate-600">
              Astuce : utilisez le mode <span className="font-semibold">Parallèle</span> pour gagner du temps (connexion stable), et
              la <span className="font-semibold">File d’attente</span> si votre connexion est fragile ou si le serveur impose un
              débit limité.
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Options</label>
              <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border-2 border-slate-200 bg-white cursor-pointer text-sm">
                <span className="flex items-center gap-2">
                  <FiStar className="text-amber-500" />
                  Mettre en vedette
                </span>
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  disabled={submitting}
                  className="sr-only"
                />
                <span className={`relative inline-flex h-5 w-9 items-center rounded-full ${isFeatured ? "bg-blue-600" : "bg-slate-300"}`}>
                  <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isFeatured ? "translate-x-4" : "translate-x-0"}`} />
                </span>
              </label>
            </div>
          </div>

          {/* Progress global */}
          {submitting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Téléversement en cours...</span>
                <span className="font-semibold text-blue-600">{overallProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>
          )}

          {err && <p className="text-sm text-rose-600 flex items-center gap-2">
            <FiAlertTriangle className="w-4 h-4" />
            {err}
          </p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={submit}
              disabled={submitting || files.length === 0}
              className={`px-4 py-2 rounded-xl text-white font-semibold shadow ${
                submitting || files.length === 0 ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {submitting ? `Envoi... ${overallProgress}%` : `Téléverser ${files.length ? `(${files.length})` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

/* =========================================================
   Modal Édition
   ========================================================= */
const EditModal = ({ open, media, onClose, onSaved }) => {
  const [name, setName] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflowY;
    html.style.overflowY = "hidden";
    return () => { html.style.overflowY = prev; };
  }, [open]);

  useEffect(() => {
    if (open && media) {
      setName(media.name || "");
      setAlt((media.alt_text?.fr ?? media.alt_text?.[0] ?? "") || "");
      setCaption((media.caption?.fr ?? media.caption?.[0] ?? "") || "");
      setSortOrder(media.sort_order ?? 0);
      setIsActive(Boolean(media.is_active));
      setIsFeatured(Boolean(media.is_featured));
      setErr("");
    }
  }, [open, media]);

  const submit = async () => {
    if (!media) return;
    try {
      setSaving(true);
      setErr("");
      const body = {
        name,
        sort_order: Number(sortOrder) || 0,
        is_active: !!isActive,
        is_featured: !!isFeatured,
        alt_text: alt ? { fr: alt } : {},
        caption: caption ? { fr: caption } : {},
      };
      const res = await http.update(media.id, body);
      onSaved?.(res?.data?.data || res?.data);
      onClose?.();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Erreur lors de la mise à jour";
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open || !media) return null;

  const imgThumb = mediaThumb(media) || coverForMedia(media);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4" aria-modal="true" role="dialog">
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-[100001] w-full max-w-2xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Modifier le média</h3>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
            >
              Fermer
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <div className="w-full rounded-xl border overflow-hidden bg-slate-50 flex items-center justify-center p-2">
                <img
                  src={imgThumb}
                  alt={media.alt_text?.fr || media.alt_text?.[0] || media.name || "aperçu"}
                  className="w-full h-auto object-cover"
                  onError={onImgErrorToCover(media)}
                />
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {(media.mime_type || media.mime) || "document"} • {fmtBytes(media.size)}
              </div>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nom</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Texte alternatif (FR)</label>
                  <input
                    value={alt}
                    onChange={(e) => setAlt(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Légende (FR)</label>
                  <input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Ordre</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border-2 border-slate-200"
                  />
                </div>
                <label className="flex items-center justify-between gap-2 mt-6 px-3 py-2 rounded-xl border-2 border-slate-200 bg-white cursor-pointer text-sm">
                  <span className="flex items-center gap-2">
                    {isActive ? <FiToggleRight /> : <FiToggleLeft />} Actif
                  </span>
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="sr-only" />
                  <span className={`relative inline-flex h-5 w-9 items-center rounded-full ${isActive ? "bg-blue-600" : "bg-slate-300"}`}>
                    <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                </label>
                <label className="flex items-center justify-between gap-2 mt-6 px-3 py-2 rounded-xl border-2 border-slate-200 bg-white cursor-pointer text-sm">
                  <span className="flex items-center gap-2">
                    <FiStar className="text-amber-500" /> Vedette
                  </span>
                  <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="sr-only" />
                  <span className={`relative inline-flex h-5 w-9 items-center rounded-full ${isFeatured ? "bg-blue-600" : "bg-slate-300"}`}>
                    <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isFeatured ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                </label>
              </div>
            </div>
          </div>
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold">
              Annuler
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className={`px-4 py-2 rounded-xl text-white font-semibold shadow ${
                saving ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

/* =========================================================
   Composant principal
   ========================================================= */
const ArticleMediaManager = ({ articleId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerMedia, setViewerMedia] = useState(null);

  const [viewMode, setViewMode] = useState("grid");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const selectedCount = selected.size;
  const isSelected = (id) => selected.has(id);
  const toggleSelect = (id) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const clearSelection = () => setSelected(new Set());
  const toggleSelectAll = () => {
    if (selected.size === filteredItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredItems.map(it => it.id)));
    }
  };

  const [trashMode, setTrashMode] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [isActive, setIsActive] = useState("");
  const [isFeatured, setIsFeatured] = useState("");
  const [sortBy, setSortBy] = useState("sort_order");
  const [sortDir, setSortDir] = useState("asc");

  const [confirmDialog, setConfirmDialog] = useState({
    open: false, title: "", message: "", onConfirm: null, danger: false
  });

  const [toast, setToast] = useState({ open: false, kind: "success", msg: "" });
  const toastTimer = useRef(null);
  const showToast = (msg, kind = "success") => {
    setToast({ open: true, kind, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ open: false, kind, msg: "" }), 2600);
  };
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const location = useLocation();

  // init depuis l'URL une seule fois
  useEffect(() => {
    const p = Object.fromEntries(urlSearchParams.entries());
    if (p.type) setType(p.type);
    if (p.q != null) setSearch(p.q);
    if (p.is_active === "1" || p.is_active === "0") setIsActive(p.is_active);
    if (p.is_featured === "1" || p.is_featured === "0") setIsFeatured(p.is_featured);
    if (p.sort_by) setSortBy(p.sort_by);
    if (p.sort_dir) setSortDir(p.sort_dir === "desc" ? "desc" : "asc");
    if (p.view === "list" || p.view === "grid") setViewMode(p.view);
    if (p.trash === "1") setTrashMode(true);
  }, []); 

  useEffect(() => {
    const p = new URLSearchParams();
    if (type) p.set("type", type);
    if (search.trim()) p.set("q", search.trim());
    if (isActive !== "") p.set("is_active", isActive);
    if (isFeatured !== "") p.set("is_featured", isFeatured);
    if (sortBy && sortBy !== "sort_order") p.set("sort_by", sortBy);
    if (sortDir && sortDir !== "asc") p.set("sort_dir", sortDir);
    if (viewMode !== "grid") p.set("view", viewMode);
    if (trashMode) p.set("trash", "1");
    setUrlSearchParams(p, { replace: true });
  }, [type, search, isActive, isFeatured, sortBy, sortDir, viewMode, trashMode, setUrlSearchParams]);

  const shareUrl = useMemo(() => {
    const qs = urlSearchParams.toString();
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}${location.pathname}${qs ? `?${qs}` : ""}`;
  }, [location.pathname, urlSearchParams]);

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Lien copié ✅");
    } catch {
      showToast("Impossible de copier le lien", "error");
    }
  };

  const load = async () => {
    if (!articleId) { setItems([]); setLoading(false); return; }
    try {
      setLoading(true);
      setErr("");
      const params = {
        ...(type ? { type: type.toUpperCase() } : {}),
        ...(isActive !== "" ? { is_active: isActive === "1" } : {}),
        ...(isFeatured !== "" ? { is_featured: isFeatured === "1" } : {}),
        ...(search.trim() ? { q: search.trim() } : {}),
        sort_by: sortBy,
        sort_dir: sortDir,
        per_page: 9999,
      };
      let res;
      if (trashMode) {
        res = await http.listTrashedByArticle(articleId, params);
        const payload = res?.data?.data ?? res?.data ?? [];
        setItems(Array.isArray(payload?.data) ? payload.data : payload);
      } else {
        res = await http.listByArticle(articleId, params);
        const data = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
        setItems(data);
      }
    } catch (e) {
      const msg = e?.response?.status === 403
        ? "Non autorisé (403). Vérifie l'authentification/Policy."
        : (e?.response?.data?.message || e?.message || "Erreur de chargement");
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [articleId, refreshKey, type, isActive, isFeatured, sortBy, sortDir, trashMode, search]);

  const filteredItems = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) =>
      (it.name || '').toLowerCase().includes(s) ||
      String(it.id || '').includes(s) ||
      ((it.mime_type || it.mime || '')).toLowerCase().includes(s)
    );
  }, [items, search]);

  // 🔁 adapté pour recevoir un tableau lors d'upload multiple
  const onUploaded = (res) => {
    const count = Array.isArray(res) ? res.length : 1;
    showToast(`${count} média${count>1?'s':''} téléversé${count>1?'s':''} ✅`);
    setRefreshKey((k) => k + 1);
  };

  const askEdit = (m) => {
    setConfirmDialog({
      open: true,
      title: "Modifier le média",
      message: `Voulez-vous modifier « ${m.name} » ?`,
      danger: false,
      onConfirm: () => {
        setCurrent(m);
        setEditOpen(true);
        setConfirmDialog(prev => ({ ...prev, open: false }));
      }
    });
  };
  const onSaved = () => { showToast("Média mis à jour ✅"); setRefreshKey((k) => k + 1); };
  const askDelete = (m) => {
    setConfirmDialog({
      open: true,
      title: "Supprimer le média",
      message: `Supprimer « ${m.name} » ? Cette action est réversible (corbeille).`,
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try {
          await http.destroy(m.id);
          showToast("Média supprimé ✅");
          setItems((arr) => arr.filter((x) => x.id !== m.id));
          setSelected((s) => { const n = new Set(s); n.delete(m.id); return n; });
        } catch (e) {
          const msg = e?.response?.data?.message || e?.message || "Suppression impossible";
          showToast(msg, "error");
        }
      }
    });
  };
  const doToggleActive = async (m) => {
    try {
      const res = await http.toggleActive(m.id);
      const upd = res?.data?.data || res?.data;
      setItems((arr) => arr.map((it) => (it.id === m.id ? { ...it, ...upd } : it)));
      showToast(`Média ${m.is_active ? "désactivé" : "activé"} ✅`);
    } catch { showToast("Erreur statut actif", "error"); }
  };
  const doToggleFeatured = async (m) => {
    try {
      const res = await http.toggleFeatured(m.id);
      const upd = res?.data?.data || res?.data;
      setItems((arr) => arr.map((it) => (it.id === m.id ? { ...it, ...upd } : it)));
      showToast(`Média ${m.is_featured ? "retiré de" : "mis en"} vedette ✅`);
    } catch { showToast("Erreur statut vedette", "error"); }
  };
  const openViewer = (m) => { setViewerMedia(m); setViewerOpen(true); };
  const doRestore = async (id) => {
    try { await http.restore(id); showToast("Média restauré ✅"); setRefreshKey((k) => k + 1); setSelected((s)=>{const n=new Set(s); n.delete(id); return n;}); }
    catch { showToast("Restauration impossible", "error"); }
  };
  const doForceDelete = async (id) => {
    setConfirmDialog({
      open: true,
      title: "Suppression définitive",
      message: "Cette action est irréversible. Continuer ?",
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try { await http.forceDelete(id); showToast("Supprimé définitivement ✅"); setRefreshKey((k)=>k+1); setSelected((s)=>{const n=new Set(s); n.delete(id); return n;}); }
        catch { showToast("Suppression définitive impossible", "error"); }
      }
    });
  };

  const bulkToggleActive = async (active) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setConfirmDialog({
      open: true, title: active ? "Activer la sélection" : "Désactiver la sélection",
      message: `${ids.length} élément(s) seront ${active ? "activés" : "désactivés"}.`,
      danger: !active,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try {
          for (const id of ids) {
            const m = items.find(x => x.id === id);
            if (!m) continue;
            if (!!m.is_active !== active) await http.toggleActive(id);
          }
          showToast("Statut mis à jour ✅"); clearSelection(); setRefreshKey(k => k + 1);
        } catch { showToast("Échec sur au moins un élément", "error"); }
      }
    });
  };

  const bulkToggleFeatured = async (featured) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setConfirmDialog({
      open: true, title: featured ? "Mettre en vedette" : "Retirer la vedette",
      message: `${ids.length} élément(s) seront ${featured ? "mis" : "retirés"} en vedette.`,
      danger: false,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try {
          for (const id of ids) {
            const m = items.find(x => x.id === id);
            if (!m) continue;
            if (!!m.is_featured !== featured) await http.toggleFeatured(id);
          }
          showToast("Vedette mise à jour ✅"); clearSelection(); setRefreshKey(k => k + 1);
        } catch { showToast("Échec sur au moins un élément", "error"); }
      }
    });
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setConfirmDialog({
      open: true, title: "Supprimer la sélection",
      message: `${ids.length} élément(s) iront dans la corbeille.`,
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try { for (const id of ids) await http.destroy(id);
          showToast("Sélection supprimée ✅"); clearSelection(); setRefreshKey(k => k + 1);
        } catch { showToast("Échec sur au moins un élément", "error"); }
      }
    });
  };

  const bulkRestore = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setConfirmDialog({
      open: true, title: "Restaurer la sélection",
      message: `${ids.length} élément(s) seront restaurés.`,
      danger: false,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try { for (const id of ids) await http.restore(id);
          showToast("Sélection restaurée ✅"); clearSelection(); setRefreshKey(k => k + 1);
        } catch { showToast("Échec sur au moins un élément", "error"); }
      }
    });
  };

  const bulkForceDelete = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setConfirmDialog({
      open: true, title: "Suppression DÉFINITIVE",
      message: `${ids.length} élément(s) seront supprimés de manière irréversible.`,
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try { for (const id of ids) await http.forceDelete(id);
          showToast("Sélection supprimée définitivement ✅"); clearSelection(); setRefreshKey(k => k + 1);
        } catch { showToast("Échec sur au moins un élément", "error"); }
      }
    });
  };

  const header = useMemo(
    () => (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl blur opacity-40" />
            <div className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
              <FiImage className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {trashMode ? "Corbeille des médias" : "Médias de l'article"}
            </h2>
            <div className="text-xs text-slate-500">
              {trashMode
                ? `Éléments supprimés pour l'article #${articleId}`
                : `Gestion des fichiers liés à l'article #${articleId}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {trashMode ? (
            <IconBtn
              title="Retour à la bibliothèque"
              onClick={() => { setTrashMode(false); clearSelection(); }}
              className="border-blue-200 text-blue-700"
            >
              <FiCornerDownLeft className="w-4 h-4" />
            </IconBtn>
          ) : (
            <IconBtn
              title="Ouvrir la corbeille"
              onClick={() => { setTrashMode(true); clearSelection(); }}
              className="border-rose-200 text-rose-700"
            >
              <FiTrash2 className="w-4 h-4" />
            </IconBtn>
          )}
          <IconBtn
            title="Rafraîchir"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="border-slate-200 text-slate-700"
          >
            <FiRefreshCw className="w-4 h-4" />
          </IconBtn>
          {!trashMode && (
            <IconBtn
              title="Ajouter un média"
              onClick={() => setUploadOpen(true)}
              className="border-blue-200 text-blue-700"
            >
              <FiUpload className="w-4 h-4" />
            </IconBtn>
          )}
        </div>
      </div>
    ),
    [articleId, trashMode]
  );

  const FilterPill = ({ label, onClear, title }) => (
    <span
      title={title || label}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold
               bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200"
    >
      {label}
      <button
        onClick={onClear}
        className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded hover:bg-blue-100 transition"
        aria-label="retirer le filtre"
      >
        <FiX className="w-3 h-3" />
      </button>
    </span>
  );

  const resetAllFilters = () => {
    setType(""); setIsActive(""); setIsFeatured(""); setSearch("");
    setSortBy("sort_order"); setSortDir("asc");
  };

  const activePills = useMemo(() => {
    const pills = [];
    if (type) {
      const map = { image: "Image", video: "Vidéo", audio: "Audio", document: "Document" };
      pills.push({ id: "type", label: `Type: ${map[type] || type}`, clear: () => setType("") });
    }
    if (isActive !== "") pills.push({ id: "is_active", label: `Actif: ${isActive === "1" ? "Oui" : "Non"}`, clear: () => setIsActive("") });
    if (isFeatured !== "") pills.push({ id: "is_featured", label: `Vedette: ${isFeatured === "1" ? "Oui" : "Non"}`, clear: () => setIsFeatured("") });
    if (search.trim()) pills.push({ id: "q", label: `Recherche: “${search.trim()}”`, clear: () => setSearch("") });
    if (sortBy !== "sort_order" || sortDir !== "asc") {
      const map = { sort_order: "Ordre", name: "Nom", created_at: "Création", size: "Taille" };
      pills.push({
        id: "sort",
        label: `Tri: ${map[sortBy] || sortBy} ${sortDir.toUpperCase()}`,
        clear: () => { setSortBy("sort_order"); setSortDir("asc"); }
      });
    }
    return pills;
  }, [type, isActive, isFeatured, search, sortBy, sortDir]);

  const activeFiltersCount = activePills.length;

  const toolbar = (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-[260px]">
        <div className="relative flex-1">
          <FiSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, #id, type MIME…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
        <IconBtn
          title={filtersOpen ? "Masquer les filtres" : "Afficher les filtres"}
          onClick={() => setFiltersOpen(o => !o)}
          className={`border-slate-200 ${filtersOpen ? "text-blue-700 border-blue-200" : "text-slate-700"}`}
        >
          <div className="relative inline-flex items-center">
            <FiFilter className="w-4 h-4" />
            {activeFiltersCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-5 px-1.5 rounded-full text-[11px] font-bold bg-blue-600 text-white">
                {activeFiltersCount}
              </span>
            )}
            {filtersOpen ? <FiChevronUp className="w-4 h-4 ml-1" /> : <FiChevronDown className="w-4 h-4 ml-1" />}
          </div>
        </IconBtn>
        <IconBtn
          title="Copier le lien de cette vue (filtres inclus)"
          onClick={copyShareUrl}
          className="border-slate-200 text-slate-700"
        >
          <FiLink className="w-4 h-4" />
        </IconBtn>
      </div>
      <div className="flex items-center gap-2">
        <IconBtn
          title="Mode grille"
          onClick={() => setViewMode("grid")}
          className={`border-slate-200 ${viewMode === 'grid' ? "text-blue-700 border-blue-200" : "text-slate-700"}`}
        >
          <FiGrid className="w-4 h-4" />
        </IconBtn>
        <IconBtn
          title="Mode liste"
          onClick={() => setViewMode("list")}
          className={`border-slate-200 ${viewMode === 'list' ? "text-blue-700 border-blue-200" : "text-slate-700"}`}
        >
          <FiList className="w-4 h-4" />
        </IconBtn>
        <IconBtn
          title={selectMode ? "Quitter la multi-sélection" : "Activer la multi-sélection"}
          onClick={() => { setSelectMode(v => !v); if (selectMode) clearSelection(); }}
          className={`border-slate-200 ${selectMode ? "text-blue-700 border-blue-200" : "text-slate-700"}`}
        >
          {selectMode ? <FiCheckSquare className="w-4 h-4" /> : <FiSquare className="w-4 h-4" />}
        </IconBtn>
      </div>
    </div>
  );

  const filtersBlock = filtersOpen && (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 rounded-xl border-2 border-slate-200">
            <option value="">Tous</option>
            <option value="image">Image</option>
            <option value="video">Vidéo</option>
            <option value="audio">Audio</option>
            <option value="document">Document</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Actif</label>
          <select value={isActive} onChange={(e) => setIsActive(e.target.value)} className="w-full px-3 py-2 rounded-xl border-2 border-slate-200">
            <option value="">Tous</option>
            <option value="1">Actifs</option>
            <option value="0">Inactifs</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Vedette</label>
          <select value={isFeatured} onChange={(e) => setIsFeatured(e.target.value)} className="w-full px-3 py-2 rounded-xl border-2 border-slate-200">
            <option value="">Tous</option>
            <option value="1">En vedette</option>
            <option value="0">Non vedette</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Tri par</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full px-3 py-2 rounded-xl border-2 border-slate-200">
            <option value="sort_order">Ordre</option>
            <option value="name">Nom</option>
            <option value="created_at">Création</option>
            <option value="size">Taille</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Direction</label>
          <select value={sortDir} onChange={(e) => setSortDir(e.target.value)} className="w-full px-3 py-2 rounded-xl border-2 border-slate-200">
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderCard = (m) => {
    const thumb = mediaThumb(m) || coverForMedia(m);
    const kind = mediaKind(m);
    return (
      <div key={m.id} className={`rounded-2xl border ${isSelected(m.id) ? "border-blue-400 ring-2 ring-blue-200" : "border-slate-200"} bg-white p-4 flex flex-col`}>
        <div className="relative rounded-xl overflow-hidden bg-slate-100 border mb-3 aspect-square flex items-center justify-center">
          <img
            src={thumb}
            alt={m.alt_text?.fr || m.alt_text?.[0] || m.name || "aperçu"}
            className="w-full h-full object-cover object-center"
            onError={onImgErrorToCover(m)}
          />
          <button
            onClick={() => openViewer(m)}
            className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
            title="Aperçu"
          >
            <div className="bg-white/90 rounded-full p-2 shadow-lg">
              <FiEye className="w-5 h-5 text-slate-800" />
            </div>
          </button>
          <div className="absolute top-2 left-2 flex flex-col gap-1.5">
            <TypeChip kind={kind} />
            {m.is_featured && (
              <Badge className="bg-amber-50 border-amber-200 text-amber-700">
                <FiStar className="mr-1" /> Vedette
              </Badge>
            )}
          </div>
          {!m.is_active && (
            <Badge className="absolute top-2 right-2 bg-slate-100 border-slate-300 text-slate-700">
              Inactif
            </Badge>
          )}
          {selectMode && (
            <button
              title={isSelected(m.id) ? "Désélectionner" : "Sélectionner"}
              onClick={(e) => { e.stopPropagation(); toggleSelect(m.id); }}
              className={`absolute bottom-2 left-2 w-9 h-9 rounded-xl border-2 bg-white/90 flex items-center justify-center ${isSelected(m.id) ? "border-blue-400 text-blue-700" : "border-slate-300 text-slate-600"}`}
            >
              {isSelected(m.id) ? <FiCheckSquare /> : <FiSquare />}
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <div className="font-semibold text-slate-800 truncate" title={m.name}>
            {m.name || "(sans nom)"}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {(m.mime_type || m.mime) || "document"} • {fmtBytes(m.size)}
            {m.dimensions?.width && m.dimensions?.height ? ` • ${m.dimensions.width}×${m.dimensions.height}` : ""}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge className="bg-slate-50 border-slate-200 text-slate-700">#{m.id}</Badge>
            <Badge className="bg-slate-50 border-slate-200 text-slate-700">ordre {m.sort_order ?? 0}</Badge>
          </div>
        </div>
        <div className="mt-3 flex justify-center gap-1">
          <TinyIconBtn title="Modifier" onClick={() => askEdit(m)} className="border-slate-200 text-slate-700">
            <FiEdit3 />
          </TinyIconBtn>
          <TinyIconBtn title={m.is_active ? "Désactiver" : "Activer"} onClick={() => doToggleActive(m)} className="border-slate-200 text-slate-700">
            {m.is_active ? <FiToggleRight /> : <FiToggleLeft />}
          </TinyIconBtn>
          <TinyIconBtn title={m.is_featured ? "Retirer vedette" : "Mettre vedette"} onClick={() => doToggleFeatured(m)} className="border-slate-200 text-slate-700">
            <FiStar className={m.is_featured ? "" : "opacity-50"} />
          </TinyIconBtn>
          {!trashMode ? (
            <TinyIconBtn title="Supprimer" onClick={() => askDelete(m)} className="border-rose-200 text-rose-700">
              <FiTrash2 />
            </TinyIconBtn>
          ) : (
            <>
              <TinyIconBtn title="Restaurer" onClick={() => doRestore(m.id)} className="border-blue-200 text-blue-700">
                <FiRotateCcw />
              </TinyIconBtn>
              <TinyIconBtn title="Supprimer définitivement" onClick={() => doForceDelete(m.id)} className="border-rose-200 text-rose-700">
                <FiTrash2 />
              </TinyIconBtn>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderRow = (m) => {
    const thumb = mediaThumb(m) || coverForMedia(m);
    const kind = mediaKind(m);
    return (
      <div key={m.id} className={`flex items-center gap-3 rounded-2xl border ${isSelected(m.id) ? "border-blue-400 ring-2 ring-blue-200" : "border-slate-200"} bg-white p-3`}>
        {selectMode ? (
          <button
            title={isSelected(m.id) ? "Désélectionner" : "Sélectionner"}
            onClick={() => toggleSelect(m.id)}
            className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center ${isSelected(m.id) ? "border-blue-400 text-blue-700" : "border-slate-300 text-slate-600"}`}
          >
            {isSelected(m.id) ? <FiCheckSquare /> : <FiSquare />}
          </button>
        ) : null}
        <div
          className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center cursor-pointer"
          title="Aperçu"
          onClick={() => openViewer(m)}
        >
          <img
            src={thumb}
            alt={m.name || "aperçu"}
            className="w-full h-full object-cover"
            onError={onImgErrorToCover(m)}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-slate-800 truncate" title={m.name}>
              {m.name || "(sans nom)"}
            </div>
            <TypeChip kind={kind} />
          </div>
          <div className="text-[12px] text-slate-500 truncate">
            #{m.id} • {(m.mime_type || m.mime) || "document"} • {fmtBytes(m.size)}
            {m.dimensions?.width && m.dimensions?.height ? ` • ${m.dimensions.width}×${m.dimensions.height}` : ""}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {m.is_featured && <Badge className="bg-amber-50 border-amber-200 text-amber-700"><FiStar className="mr-1" />Vedette</Badge>}
            {!m.is_active && <Badge className="bg-slate-100 border-slate-300 text-slate-700">Inactif</Badge>}
            <Badge className="bg-slate-50 border-slate-200 text-slate-700">ordre {m.sort_order ?? 0}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!trashMode ? (
            <>
              <TinyIconBtn title="Modifier" onClick={() => askEdit(m)} className="border-slate-200 text-slate-700">
                <FiEdit3 />
              </TinyIconBtn>
              <TinyIconBtn title={m.is_active ? "Désactiver" : "Activer"} onClick={() => doToggleActive(m)} className="border-slate-200 text-slate-700">
                {m.is_active ? <FiToggleRight /> : <FiToggleLeft />}
              </TinyIconBtn>
              <TinyIconBtn title={m.is_featured ? "Retirer vedette" : "Mettre vedette"} onClick={() => doToggleFeatured(m)} className="border-slate-200 text-slate-700">
                <FiStar className={m.is_featured ? "" : "opacity-50"} />
              </TinyIconBtn>
              <TinyIconBtn title="Supprimer" onClick={() => askDelete(m)} className="border-rose-200 text-rose-700">
                <FiTrash2 />
              </TinyIconBtn>
            </>
          ) : (
            <>
              <TinyIconBtn title="Restaurer" onClick={() => doRestore(m.id)} className="border-blue-200 text-blue-700">
                <FiRotateCcw />
              </TinyIconBtn>
              <TinyIconBtn title="Supprimer définitivement" onClick={() => doForceDelete(m.id)} className="border-rose-200 text-rose-700">
                <FiTrash2 />
              </TinyIconBtn>
            </>
          )}
        </div>
      </div>
    );
  };

  const bulkBar = selectedCount > 0 && (
    <div className="sticky top-[64px] z-[30] mt-4 rounded-2xl border-2 border-blue-200 bg-blue-50/70 backdrop-blur p-3 flex items-center justify-between">
      <div className="text-sm font-semibold text-blue-900">
        {selectedCount} élément{selectedCount>1?'s':''} sélectionné{selectedCount>1?'s':''}
      </div>
      <div className="flex items-center gap-2">
        <IconBtn
          title={selected.size === filteredItems.length ? "Tout désélectionner" : "Tout sélectionner"}
          onClick={toggleSelectAll}
          className="border-blue-200 text-blue-700"
        >
          {selected.size === filteredItems.length ? <FiSquare className="w-4 h-4" /> : <FiCheckSquare className="w-4 h-4" />}
        </IconBtn>
        {!trashMode ? (
          <>
            <IconBtn title="Activer" onClick={() => bulkToggleActive(true)} className="border-blue-200 text-blue-700"><FiToggleRight className="w-4 h-4" /></IconBtn>
            <IconBtn title="Désactiver" onClick={() => bulkToggleActive(false)} className="border-blue-200 text-blue-700"><FiToggleLeft className="w-4 h-4" /></IconBtn>
            <IconBtn title="Mettre en vedette" onClick={() => bulkToggleFeatured(true)} className="border-blue-200 text-blue-700"><FiStar className="w-4 h-4" /></IconBtn>
            <IconBtn title="Retirer la vedette" onClick={() => bulkToggleFeatured(false)} className="border-blue-200 text-blue-700"><FiStar className="w-4 h-4 opacity-50" /></IconBtn>
            <IconBtn title="Supprimer" onClick={bulkDelete} className="border-rose-200 text-rose-700"><FiTrash2 className="w-4 h-4" /></IconBtn>
          </>
        ) : (
          <>
            <IconBtn title="Restaurer" onClick={bulkRestore} className="border-blue-200 text-blue-700"><FiRotateCcw className="w-4 h-4" /></IconBtn>
            <IconBtn title="Supprimer définitivement" onClick={bulkForceDelete} className="border-rose-200 text-rose-700"><FiTrash2 className="w-4 h-4" /></IconBtn>
          </>
        )}
        <IconBtn title="Vider la sélection" onClick={clearSelection} className="border-slate-200 text-slate-700"><FiX className="w-4 h-4" /></IconBtn>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {header}
      <div className="mt-1" />
      {toolbar}
      {activeFiltersCount > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {activePills.map(p => (<FilterPill key={p.id} label={p.label} onClear={p.clear} />))}
          <button onClick={resetAllFilters} className="ml-1 text-[11px] font-semibold underline text-blue-700">Tout réinitialiser</button>
        </div>
      )}
      {filtersBlock}
      {bulkBar}
      {loading ? (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {new Array(6).fill(0).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 animate-pulse">
              <div className="h-40 bg-slate-100 rounded-xl" />
              <div className="h-3 bg-slate-100 rounded mt-4 w-2/3" />
              <div className="h-3 bg-slate-100 rounded mt-2 w-1/2" />
            </div>
          ))}
        </div>
      ) : err ? (
        <div className="mt-6 rounded-2xl border-2 border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm flex items-center gap-2">
          <FiAlertTriangle className="w-4 h-4" />
          {err}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="mt-6 rounded-2xl border-2 border-slate-200 bg-white px-4 py-6 text-center text-slate-600">
          {trashMode ? "Corbeille vide." : "Aucun média pour cet article."}
          {!trashMode && (
            <div className="mt-3">
              <button
                onClick={() => setUploadOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow"
              >
                <FiUpload />
                Ajouter un média
              </button>
            </div>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map(renderCard)}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3">
          {filteredItems.map(renderRow)}
        </div>
      )}
      {/* Modaux */}
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={onUploaded} articleId={articleId} />
      <EditModal open={editOpen} media={current} onClose={() => setEditOpen(false)} onSaved={() => onSaved()} />
      <ViewerModal open={viewerOpen} media={viewerMedia} onClose={() => setViewerOpen(false)} />
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        danger={confirmDialog.danger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />
      <Toast open={toast.open} kind={toast.kind} msg={toast.msg} />
    </div>
  );
};

export default ArticleMediaManager;
