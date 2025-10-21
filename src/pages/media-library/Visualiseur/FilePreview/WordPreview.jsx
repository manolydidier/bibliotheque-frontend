// src/pages/media-library/Visualiseur/FilePreview/WordPreview.jsx
import { useEffect, useState } from "react";
import * as mammoth from "mammoth/mammoth.browser";
import { fetchArrayBufferWithFallback } from "@/utils/fileFetch";

export default function WordPreview({ src, title }) {
  const [html, setHtml] = useState("");
  const [state, setState] = useState("idle");
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!src) return;
      setState("loading"); setErr("");
      try {
        const ab = await fetchArrayBufferWithFallback(src);
        const result = await mammoth.convertToHtml(
          { arrayBuffer: ab },
          { convertImage: mammoth.images.inline(el => el.read("base64").then(b64 => `data:${el.contentType};base64,${b64}`)) }
        );
        if (!alive) return;
        setHtml(result.value || ""); setState("ok");
      } catch (e) { if (!alive) return; setErr(e.message || "Erreur"); setState("err"); }
    })();
    return () => { alive = false; };
  }, [src]);

  if (!src) return <div className="text-sm text-slate-500">Aucun document Word.</div>;

  return (
    <div className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white flex flex-col">
      <div className="px-4 py-2 border-b text-slate-700 flex items-center justify-between">
        <span className="truncate">{title || "Document Word"}</span>
        <a href={src} download className="text-sm px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded">Télécharger</a>
      </div>

      {state === "loading" && <div className="flex-1 grid place-items-center text-slate-500">Chargement…</div>}
      {state === "err" && (
        <div className="flex-1 grid place-items-center p-6 text-center">
          <div className="text-slate-600 mb-2">Impossible d'afficher l’aperçu.</div>
          <div className="text-xs text-slate-400 mb-4">{err}</div>
          <a href={src} download className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Télécharger le document</a>
        </div>
      )}
      {state === "ok" && (
        <div className="flex-1 overflow-auto px-8 py-6">
          <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      )}
    </div>
  );
}
