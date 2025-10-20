// OtherPreview.jsx
export default function OtherPreview({ src, title }) {
  return (
    <div className="text-center py-10 bg-white/60 border border-slate-200/40 rounded-2xl">
      <div className="text-slate-600 mb-3">Aperçu non disponible</div>
      {src && (
        <a href={src} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-blue-600 text-white">
          Ouvrir “{title || "Fichier"}”
        </a>
      )}
    </div>
  );
}
