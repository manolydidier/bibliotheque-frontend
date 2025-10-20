// AudioPreview.jsx
export default function AudioPreview({ src, type }) {
  if (!src) return <div className="text-sm text-slate-500">Aucun audio.</div>;
  return (
    <div className="w-full rounded-2xl border border-slate-200/40 bg-white p-6 text-center">
      <audio controls className="w-full max-w-2xl mx-auto" src={src} type={type || undefined} />
      <div className="mt-3">
        <a href={src} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-blue-600 text-white">Ouvrir</a>
      </div>
    </div>
  );
}
