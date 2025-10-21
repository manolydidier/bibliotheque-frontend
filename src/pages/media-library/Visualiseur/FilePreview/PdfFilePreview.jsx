// src/pages/media-library/Visualiseur/FilePreview/PdfFilePreview.jsx
import { useMemo } from "react";
import { FaFilePdf, FaDownload } from "react-icons/fa";

/**
 * Optionnel: PDF.js hébergé côté front.
 * .env => VITE_PDFJS_VIEWER="/pdfjs/web/viewer.html?file="
 * Puis <PdfFilePreview usePdfJs />
 */
const PDFJS_VIEWER = import.meta.env.VITE_PDFJS_VIEWER || "";

const buildPdfJsUrl = (fileUrl) => `${PDFJS_VIEWER}${encodeURIComponent(fileUrl)}`;

export default function PdfFilePreview({
  src,
  title,
  usePdfJs = false,
  height = "75vh",
}) {
  if (!src) return <div className="text-sm text-slate-500">Aucun PDF.</div>;

  // URL iframe finale (sans proxy)
  const iframeSrc = useMemo(() => {
    if (usePdfJs && PDFJS_VIEWER) return buildPdfJsUrl(src);
    return src;
  }, [src, usePdfJs]);

  return (
    <div
      className="w-full rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col"
      style={{ height }}
    >
      {/* Header minimaliste */}
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
        <div className="min-w-0 flex items-center gap-2.5 text-slate-700">
          <FaFilePdf className="text-red-500 shrink-0" size={16} />
          <div className="truncate text-sm font-medium">{title || "Document PDF"}</div>
        </div>

        <a
          href={src}
          download
          className="inline-flex items-center gap-1.5 rounded-md bg-white hover:bg-gray-50 border border-slate-200 transition-colors px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
          title="Télécharger le PDF"
        >
          <FaDownload size={12} />
          <span className="hidden sm:inline">Télécharger</span>
        </a>
      </div>

      {/* Contenu : iframe sans bordures superflues */}
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