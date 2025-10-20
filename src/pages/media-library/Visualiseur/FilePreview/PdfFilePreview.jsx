// PdfFilePreview.jsx
const PDFJS_VIEWER = "/pdfjs/web/viewer.html?file="; // si tu as pdf.js servi côté app

export default function PdfFilePreview({ src, title }) {
  if (!src) return <div className="text-sm text-slate-500">Aucun PDF.</div>;
  const canPdfJs = false; // passe à true si tu as pdf.js servi
  const iframeSrc = canPdfJs ? `${PDFJS_VIEWER}${encodeURIComponent(src)}` : src;

  return (
    <div className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white">
      <div className="px-4 py-2 border-b text-slate-700">{title || "Document PDF"}</div>
      <iframe src={iframeSrc} className="w-full h-[calc(75vh-40px)]" title="PDF" />
    </div>
  );
}
