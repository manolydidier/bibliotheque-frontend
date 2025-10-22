// src/pages/media-library/Visualiseur/FilePreview/PdfFilePreview.jsx
import React, { useEffect, useMemo, useState } from "react";
import { FaFilePdf, FaDownload, FaExternalLinkAlt, FaBug } from "react-icons/fa";
import { proxify } from "@/utils/fileFetch";        // ⬅️ on importe proxify directement
import { toAbsolute } from "./helpers";

// .env: VITE_PDFJS_VIEWER="/pdfjs/web/viewer.html?file="
const PDFJS_VIEWER = import.meta.env.VITE_PDFJS_VIEWER || "";
const DEBUG_DEFAULT = String(import.meta.env.VITE_DEBUG_VIEWERS || "").toLowerCase() === "true";

function decideInitialMode(forcedMode) {
  if (forcedMode === "pdfjs" || forcedMode === "native") return forcedMode;
  return PDFJS_VIEWER ? "pdfjs" : "native";
}

export default function PdfFilePreviewPro({
  src,
  title = "Document PDF",
  height = "75vh",
  mode = "auto",
  debug = DEBUG_DEFAULT,
}) {
  const [viewerMode, setViewerMode] = useState(decideInitialMode(mode));
  const [showDebug, setShowDebug] = useState(Boolean(debug));
  const [probe, setProbe] = useState({ head: null, get: null, error: "" });

  useEffect(() => { setViewerMode(decideInitialMode(mode)); }, [mode]);

  if (!src) return <div className="text-sm text-slate-500">Aucun PDF.</div>;

  // 1) URL absolue (toujours)
  const absSrc = useMemo(() => {
    const u = toAbsolute(src);
    console.debug("[PDF] absSrc", u);
    return u;
  }, [src]);

  // 2) URL proxy (toujours, même en “natif”) → évite 404/CORS selon l’environnement
  const proxySrc = useMemo(() => {
    const u = proxify(absSrc);           // ⬅️ on proxifie SYSTÉMATIQUEMENT
    console.debug("[PDF] proxySrc", u);
    return u;
  }, [absSrc]);

  // 3) URL iframe finale
  const iframeSrc = useMemo(() => {
    let u = "";
    if (viewerMode === "pdfjs") {
      if (!PDFJS_VIEWER) return "";
      u = `${PDFJS_VIEWER}${encodeURIComponent(proxySrc)}`; // PDF.js charge l’URL proxifiée
    } else {
      u = proxySrc; // ⬅️ natif = via proxy aussi
    }
    console.debug("[PDF] iframeSrc", { viewerMode, u });
    return u;
  }, [viewerMode, proxySrc]);

  // Probe simple sur le proxy (utile pour voir un 404/401/500 côté Laravel)
  useEffect(() => {
    if (!showDebug) return;
    let cancelled = false;
    (async () => {
      try {
        setProbe({ head: "…", get: "…", error: "" });
        const head = await fetch(proxySrc, { method: "HEAD" });
        if (!cancelled) setProbe(p => ({ ...p, head: `${head.status} ${head.statusText}` }));

        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort("probe-timeout"), 5000);
        const get = await fetch(proxySrc, { method: "GET", signal: ctrl.signal, headers: { Range: "bytes=0-0" } });
        clearTimeout(t);
        if (!cancelled) setProbe(p => ({ ...p, get: `${get.status} ${get.statusText}` }));
      } catch (e) {
        if (!cancelled) setProbe(p => ({ ...p, error: String(e?.message || e) }));
      }
    })();
    return () => { cancelled = true; };
  }, [proxySrc, showDebug]);

  return (
    <div
      className="w-full rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col"
      style={{ height }}
    >
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
        <div className="min-w-0 flex items-center gap-2.5 text-slate-700">
          <FaFilePdf className="text-red-500 shrink-0" size={16} />
          <div className="truncate text-sm font-medium">{title}</div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle PDF.js / Natif */}
          <div className="flex items-center gap-2 text-xs text-slate-600 select-none">
            <span className={viewerMode === "native" ? "font-semibold" : ""}>Natif</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={viewerMode === "pdfjs"}
                onChange={(e) => setViewerMode(e.target.checked ? "pdfjs" : "native")}
              />
              <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-slate-800 transition-colors" />
              <div className={`absolute left-1 top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${viewerMode === "pdfjs" ? "translate-x-5" : ""}`} />
            </label>
            <span className={viewerMode === "pdfjs" ? "font-semibold" : ""}>PDF.js</span>
          </div>

          {/* Ouvrir (respecte le mode courant) */}
          <a
            href={viewerMode === "pdfjs"
              ? (iframeSrc || "#")
              : proxySrc /* natif → toujours via proxy */}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-white hover:bg-gray-50 border border-slate-200 transition-colors px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
            title="Ouvrir dans un onglet"
          >
            <FaExternalLinkAlt size={12} />
            <span className="hidden sm:inline">Ouvrir</span>
          </a>

          {/* Télécharger l'original (URL absolue brute) */}
          <a
            href={absSrc}
            download
            className="inline-flex items-center gap-1.5 rounded-md bg-white hover:bg-gray-50 border border-slate-200 transition-colors px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
            title="Télécharger le PDF"
          >
            <FaDownload size={12} />
            <span className="hidden sm:inline">Télécharger</span>
          </a>

          {/* Debug */}
          <button
            type="button"
            onClick={() => setShowDebug(s => !s)}
            title="Afficher/masquer debug"
            className={`inline-flex items-center gap-1.5 rounded-md border transition-colors px-2.5 py-1.5 text-xs font-medium ${
              showDebug ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-gray-50"
            }`}
          >
            <FaBug size={12} />
            Debug
          </button>
        </div>
      </div>

      {/* Alerte si PDF.js demandé mais non configuré */}
      {viewerMode === "pdfjs" && !PDFJS_VIEWER ? (
        <div className="p-4 text-sm text-amber-700 bg-amber-50 border-t border-amber-200">
          PDF.js n’est pas configuré. Ajoute <code>VITE_PDFJS_VIEWER</code> (ex :
          <code>/pdfjs/web/viewer.html?file=</code>) puis relance <code>npm run dev</code>.
        </div>
      ) : null}

      {/* Debug panel */}
      {showDebug && (
        <div className="px-4 py-3 text-xs border-b bg-slate-50 text-slate-700 space-y-1">
          <div><b>origin</b>: {window.location.origin}</div>
          <div className="truncate"><b>absSrc</b>: {absSrc}</div>
          <div className="truncate"><b>proxySrc</b>: {proxySrc}</div>
          <div className="truncate"><b>iframeSrc</b>: {iframeSrc}</div>
          <div><b>mode</b>: {viewerMode} {PDFJS_VIEWER ? "(pdfjs prêt)" : "(pdfjs non configuré)"}</div>
          <div className="pt-1">
            <div><b>Proxy HEAD</b>: {probe.head ?? "…"}</div>
            <div><b>Proxy GET</b>: {probe.get ?? "…"}</div>
            {probe.error ? <div className="text-red-600"><b>Probe error</b>: {probe.error}</div> : null}
          </div>
        </div>
      )}

      {/* Contenu */}
      <div className="flex-1 min-h-0 bg-white">
        <iframe
          src={iframeSrc}
          title="Aperçu PDF"
          className="w-full h-full block"
          style={{ border: "none", background: "transparent" }}
          loading="lazy"
        />
      </div>
    </div>
  );
}
