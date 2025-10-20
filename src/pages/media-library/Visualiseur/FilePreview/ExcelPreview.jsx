// ExcelPreview.jsx
import { FaFileExcel } from "react-icons/fa";

export default function ExcelPreview({ src, title, size, date }) {
  if (!src) return <div className="text-sm text-slate-500">Aucun fichier Excel.</div>;
  const officeEmbed = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(src)}`;

  return (
    <div className="w-full flex flex-col">
      <div className="w-full h-[64vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white">
        <div className="px-4 py-2 border-b flex items-center gap-2 text-slate-700">
          <FaFileExcel className="text-emerald-600" />
          <span className="font-medium">{title || "Tableur"}</span>
        </div>
        <iframe src={officeEmbed} className="w-full h-[calc(64vh-40px)]" title="Excel Viewer" />
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <a href={src} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-emerald-600 text-white">
          Ouvrir dans Excel
        </a>
        <div className="text-xs text-slate-500">
          {size ? <>Taille&nbsp;: {size} • </> : null}
          {date ? <>Date&nbsp;: {new Date(date).toLocaleDateString()}</> : null}
        </div>
      </div>
    </div>
  );
}
