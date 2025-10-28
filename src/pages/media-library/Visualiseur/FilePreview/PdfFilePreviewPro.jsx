// src/pages/media-library/Visualiseur/FilePreview/PdfFilePreviewPro.jsx
import React, { useEffect, useMemo, useState } from "react";
import { FaFilePdf, FaDownload, FaExternalLinkAlt } from "react-icons/fa";
import { proxify } from "@/utils/fileFetch";
import { toAbsolute } from "./helpers";

// .env (exemples) :
// VITE_PDFJS_VIEWER="/viewer-light.html?file="        <-- ton viewer léger dans /public
// (ou) VITE_PDFJS_VIEWER="/pdfjs/web/viewer.html?file="  si tu utilises le viewer de pdfjs-dist copié en /public
// (ou) VITE_PDFJS_VIEWER="https://cdn.jsdelivr.net/npm/pdfjs-dist@4/web/viewer.html?file="
const PDFJS_VIEWER = import.meta.env.VITE_PDFJS_VIEWER || "";
const DEBUG_DEFAULT = String(import.meta.env.VITE_DEBUG_VIEWERS || "").toLowerCase() === "true";

// 👉 PDF.js par défaut si configuré ; sinon natif
function decideInitialMode(forcedMode) {
  if (forcedMode === "pdfjs" || forcedMode === "native") return forcedMode;
  return PDFJS_VIEWER ? "pdfjs" : "native";
}

function isExternalViewer(u) {
  return /^https?:\/\//i.test(u || "");
}
function absOnThisOrigin(pathOrUrl) {
  try { return new URL(pathOrUrl, window.location.origin).href; }
  catch { return pathOrUrl; }
}

export default function PdfFilePreviewPro({
  src,
  title = "Document PDF",
  height = "75vh",
  mode = "auto",
  debug = DEBUG_DEFAULT,
}) {
  const [viewerMode, setViewerMode] = useState(decideInitialMode(mode));
  const [showDebug] = useState(Boolean(debug));
  const [loadingFrame, setLoadingFrame] = useState(true);

  useEffect(() => { setViewerMode(decideInitialMode(mode)); }, [mode]);

  if (!src) return <div className="text-sm text-gray-500">Aucun PDF.</div>;

  // 1) URL absolue (fichier original)
  const absSrc = useMemo(() => toAbsolute(src), [src]);

  // 2) Proxy (même origine) pour éviter CORS/headers
  const proxySrc = useMemo(() => proxify(absSrc), [absSrc]);

  // 2b) Si viewer externe (CDN), ?file= doit être ABSOLU sur ton origine
  const proxySrcForViewer = useMemo(
    () => (isExternalViewer(PDFJS_VIEWER) ? absOnThisOrigin(proxySrc) : proxySrc),
    [proxySrc]
  );

  // 3) URL iframe finale
  const iframeSrc = useMemo(() => {
    if (viewerMode === "pdfjs") {
      if (!PDFJS_VIEWER) return ""; // sécurité
      const fileParam = encodeURIComponent(proxySrcForViewer);
      return `${PDFJS_VIEWER}${fileParam}`;
    }
    return proxySrc; // natif
  }, [viewerMode, proxySrcForViewer, proxySrc]);

  const pdfjsConfigured = Boolean(PDFJS_VIEWER);

  return (
    <div
      className="relative w-full rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col"
      style={{ height }}
    >
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between gap-3 shrink-0 bg-white">
        <div className="min-w-0 flex items-center gap-2.5 text-gray-800">
          <FaFilePdf className="text-gray-400 shrink-0" size={16} />
          <div className="truncate text-sm font-medium">{title}</div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle PDF.js / Natif (sobre) */}
          <div className="flex items-center gap-2 text-xs text-gray-600 select-none">
            <span className={viewerMode === "native" ? "font-medium text-gray-800" : ""}>Natif</span>
            <label
              className={`relative inline-flex items-center ${pdfjsConfigured ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
              title={pdfjsConfigured ? "Activer PDF.js" : "PDF.js non configuré"}
            >
              <input
                type="checkbox"
                className="sr-only peer"
                checked={viewerMode === "pdfjs"}
                onChange={(e) => pdfjsConfigured && setViewerMode(e.target.checked ? "pdfjs" : "native")}
                disabled={!pdfjsConfigured}
              />
              <div className="w-11 h-6 rounded-full bg-gray-200 peer-checked:bg-gray-800 transition-colors" />
              <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${viewerMode === "pdfjs" ? "translate-x-5" : ""}`} />
            </label>
            <span className={viewerMode === "pdfjs" ? "font-medium text-gray-800" : ""}>PDF.js</span>
          </div>

          {/* Ouvrir (neutre) */}
          <a
            href={viewerMode === "pdfjs" ? (iframeSrc || "#") : proxySrc}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-white border border-gray-300 hover:bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700"
            title="Ouvrir dans un onglet"
          >
            <FaExternalLinkAlt size={12} />
            <span className="hidden sm:inline">Ouvrir</span>
          </a>

          {/* Télécharger (neutre) */}
          <a
            href={absSrc}
            download
            className="inline-flex items-center gap-1.5 rounded-md bg-white border border-gray-300 hover:bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700"
            title="Télécharger le PDF"
          >
            <FaDownload size={12} />
            <span className="hidden sm:inline">Télécharger</span>
          </a>
        </div>
      </div>

      {/* Alerte si PDF.js non configuré */}
      {viewerMode === "pdfjs" && !pdfjsConfigured ? (
        <div className="p-4 text-xs text-gray-700 bg-gray-50 border-t border-gray-200">
          PDF.js n'est pas configuré. Renseigne <code>VITE_PDFJS_VIEWER</code> puis relance <code>npm run dev</code>.
        </div>
      ) : null}

      {/* Contenu */}
      <div className="relative flex-1 min-h-0 bg-white">
        {loadingFrame && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
            <div className="h-8 w-8 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
          </div>
        )}
        <iframe
          src={iframeSrc}
          title="Aperçu PDF"
          className="w-full h-full block"
          style={{ border: "none", background: "transparent" }}
          loading="lazy"
          onLoad={() => setLoadingFrame(false)}
        />
      </div>
    </div>
  );
}
