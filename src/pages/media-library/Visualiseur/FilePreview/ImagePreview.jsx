// ImagePreview.jsx
export default function ImagePreview({ src, alt }) {
  if (!src) return <div className="text-sm text-slate-500">Aucune image.</div>;
  return (
    <div className="w-full bg-slate-50/60 rounded-2xl border border-slate-200/40 p-4">
      <img src={src} alt={alt || "Image"} className="max-h-[70vh] w-auto mx-auto rounded-xl object-contain" />
      <div className="mt-3 text-center">
        <a href={src} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-blue-600 text-white">Ouvrir</a>
      </div>
    </div>
  );
}
