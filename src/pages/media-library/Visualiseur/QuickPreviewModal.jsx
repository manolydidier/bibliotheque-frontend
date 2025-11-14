// src/media-library/QuickPreviewModal.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  FaTimes, FaChevronLeft, FaChevronRight,
  FaExternalLinkAlt, FaDownload,
  FaFile, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint,
  FaImage, FaFileVideo, FaFileAudio
} from "react-icons/fa";
import FilePreview from "./FilePreview/FilePreview";

/* ================= Helpers ================= */
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
function firstUrlFromArticleLike(al) {
  return al?.media?.[0]?.url || al?.url || al?.fileUrl || null;
}
function filenameFrom(u, fallback = "fichier") {
  try {
    const p = new URL(u, window.location.href).pathname;
    const name = decodeURIComponent(p.split("/").pop() || "");
    return name || fallback;
  } catch { return fallback; }
}

/** Détecte le type pour l’icône des vignettes */
function typeFrom(mime, url = "") {
  const m = (mime || "").toLowerCase();
  const s = (url || "").toLowerCase();
  if (m.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|avif)$/.test(s)) return "image";
  if (m.startsWith("video/") || /\.(mp4|webm|ogg|mov)$/i.test(s)) return "video";
  if (m.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|flac)$/i.test(s)) return "audio";
  if (m.includes("pdf") || s.endsWith(".pdf")) return "pdf";
  if (m.includes("presentation") || /\.(pptx?|ppsx?)$/.test(s)) return "ppt";
  if (m.includes("spreadsheet") || /\.(xlsx?|csv)$/.test(s)) return "excel";
  if (m.includes("word") || m.includes("msword") || /\.(docx?|rtf|doc)$/.test(s)) return "word";
  return "other";
}

function iconFor(type, className = "") {
  const common = `shrink-0 ${className}`;
  switch (type) {
    case "image": return <FaImage className={`${common} text-amber-500`} />;
    case "video": return <FaFileVideo className={`${common} text-blue-500`} />;
    case "audio": return <FaFileAudio className={`${common} text-emerald-500`} />;
    case "pdf":   return <FaFilePdf className={`${common} text-red-500`} />;
    case "word":  return <FaFileWord className={`${common} text-blue-600`} />;
    case "excel": return <FaFileExcel className={`${common} text-emerald-600`} />;
    case "ppt":   return <FaFilePowerpoint className={`${common} text-orange-500`} />;
    default:      return <FaFile className={`${common} text-slate-500`} />;
  }
}

/**
 * Modal d'aperçu rapide
 *  - Single mode  : passer `file`
 *  - Carousel mode: passer `files` + `startIndex`
 */
export default function QuickPreviewModal({
  file,
  files,
  startIndex = 0,
  onClose,
  onOpenInNew,
  onDownload,
  autoPlayMs = 0,
  onIndexChange,
}) {
  const list = useMemo(() => {
    if (Array.isArray(files) && files.length) return files;
    return file ? [file] : [];
  }, [files, file]);

  const isCarousel = list.length > 1;

  // index courant + resync si props changent
  const [idx, setIdx] = useState(() => Math.min(Math.max(0, startIndex), Math.max(0, list.length - 1)));
  useEffect(() => {
    setIdx(Math.min(Math.max(0, startIndex), Math.max(0, list.length - 1)));
  }, [startIndex, list]);

  const cur = list[idx] || null;

  const prev = useCallback(() => setIdx((i) => (i - 1 + list.length) % list.length), [list.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % list.length), [list.length]);

  // clavier
  useEffect(() => {
    function onKey(e) {
      const k = (e.key || "").toLowerCase();
      if (k === "escape") onClose?.();
      if (!isCarousel) return;
      if (k === "arrowleft")  { e.preventDefault(); prev(); }
      if (k === "arrowright") { e.preventDefault(); next(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isCarousel, prev, next, onClose]);

  // swipe
  const swipeRef = useRef(null);
  useEffect(() => {
    if (!isCarousel) return;
    const el = swipeRef.current;
    if (!el) return;
    let x0 = null;
    const onTouchStart = (e) => { x0 = e.touches?.[0]?.clientX ?? null; };
    const onTouchEnd = (e) => {
      if (x0 == null) return;
      const x1 = e.changedTouches?.[0]?.clientX ?? x0;
      const dx = x1 - x0;
      if (Math.abs(dx) > 40) { if (dx > 0) prev(); else next(); }
      x0 = null;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [isCarousel, prev, next]);

  // auto-play
  useEffect(() => {
    if (!isCarousel || !autoPlayMs || autoPlayMs < 1) return;
    const id = setInterval(next, autoPlayMs);
    return () => clearInterval(id);
  }, [isCarousel, autoPlayMs, next]);

  // notifier parent
  useEffect(() => { onIndexChange?.(idx); }, [idx, onIndexChange]);

  if (!cur) return null;

  const title   = cur?.title || cur?.name || "Aperçu";
  const mainUrl = firstUrlFromArticleLike(cur);
  const fileKey = (cur?.id != null ? `id:${cur.id}` : `url:${norm(mainUrl)}`) || `i:${idx}`;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div ref={swipeRef} className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
          aria-label="Fermer"
          title="Fermer"
        >
          <FaTimes />
        </button>

        {/* Header actions */}
        <div className="absolute left-4 right-12 top-3 z-10 flex items-center justify-between pointer-events-none">
          <div className="px-2 py-1.5 rounded-lg bg-white/80 border border-slate-200/70 text-slate-700 text-sm font-medium truncate pointer-events-auto max-w-[75%]">
            {title}
            {isCarousel && <span className="ml-2 text-xs text-slate-500">({idx + 1}/{list.length})</span>}
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => onOpenInNew?.(cur)}
              className="rounded-lg px-2.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50"
              title="Ouvrir dans un nouvel onglet"
            >
              <FaExternalLinkAlt />
            </button>
            <button
              onClick={() => onDownload?.(cur)}
              className="rounded-lg px-2.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50"
              title="Télécharger"
            >
              <FaDownload />
            </button>
          </div>
        </div>

        {/* Prev/Next */}
        {isCarousel && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full p-3 bg-white/80 hover:bg-white border border-slate-200 shadow"
              aria-label="Précédent"
              title="Précédent"
            >
              <FaChevronLeft />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full p-3 bg-white/80 hover:bg-white border border-slate-200 shadow"
              aria-label="Suivant"
              title="Suivant"
            >
              <FaChevronRight />
            </button>
          </>
        )}

        {/* Content */}
        <div className="max-h-[90vh] overflow-auto p-4 sm:p-6">
          {/* 🔑 key pour forcer le re-mount (utile pour <video>) */}
          <FilePreview key={fileKey} file={cur} activeTab="Aperçu" />
        </div>

        {/* Thumbnails / Choix du bas */}
        {isCarousel && (
          <div className="border-t border-slate-200 bg-white/80 px-2 sm:px-3 py-2 overflow-x-auto">
            <div className="flex items-center gap-2">
              {list.map((it, i) => {
                const u = firstUrlFromArticleLike(it) || "";
                const mime = it?.media?.[0]?.mime || it?.mime || it?.mime_type;
                const tp = typeFrom(mime, u);
                const sel = i === idx;

                // vignette pour IMAGE: miniature
                if (tp === "image") {
                  return (
                    <button
                      key={(it?.id ?? i) + ":" + norm(u)}
                      onClick={() => setIdx(i)}
                      className={`shrink-0 rounded-xl border ${sel ? "border-blue-400 ring-2 ring-blue-200" : "border-slate-200"} p-1 bg-white`}
                      title={it?.title || filenameFrom(u)}
                    >
                      <img
                        src={u}
                        onError={(e) => { e.currentTarget.src = "/favicon.ico"; }}
                        alt=""
                        className="w-16 h-12 object-cover rounded-md"
                      />
                    </button>
                  );
                }

                // vignette pour NON-IMAGE: icône + petit nom
                const short = filenameFrom(u);
                return (
                  <button
                    key={(it?.id ?? i) + ":" + norm(u)}
                    onClick={() => setIdx(i)}
                    className={`shrink-0 max-w-[11rem] flex items-center gap-2 rounded-xl border px-2 py-1.5 bg-white ${
                      sel ? "border-blue-400 ring-2 ring-blue-200" : "border-slate-200"
                    }`}
                    title={it?.title || short}
                  >
                    <div className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-50 border border-slate-200">
                      {iconFor(tp, "text-base")}
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="text-[11px] leading-tight font-medium text-slate-700 truncate">
                        {it?.title || short}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase truncate">{tp}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
