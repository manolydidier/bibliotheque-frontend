// VideoPreview.jsx
export default function VideoPreview({ src, type }) {
  if (!src) return <div className="text-sm text-slate-500">Aucune vidéo.</div>;
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-200/40 bg-black">
      <video controls controlsList="nodownload" className="w-full max-h-[70vh]" src={src} type={type || undefined} />
    </div>
  );
}
