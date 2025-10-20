// PowerPointPreview.jsx
const officeEmbed = (url) =>
  `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

export default function PowerPointPreview({ src, title }) {
  if (!src) return <div className="text-sm text-slate-500">Aucune présentation.</div>;
  return (
    <div className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white">
      <div className="px-4 py-2 border-b text-slate-700">{title || "Présentation PowerPoint"}</div>
      <iframe src={officeEmbed(src)} className="w-full h-[calc(75vh-40px)]" title="PowerPoint Viewer" />
    </div>
  );
}
