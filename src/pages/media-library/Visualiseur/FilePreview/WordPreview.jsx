// src/media-library/parts/Visualiseur/FilePreview/WordPreview.jsx
import React, { useEffect, useRef, useState } from "react";
import { ensureCorsSafe, fetchArrayBufferWithFallback, isLikelyPublicHttp } from "@/utils/fileFetch";
// npm i docx-preview
import { renderAsync } from "docx-preview"; // https://github.com/VolodymyrBaydalka/docxjs

export default function WordPreview({ src, title }) {
  const containerRef = useRef(null);
  const [mode, setMode] = useState("auto"); // auto | office | local
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setErr("");

    // Si l’URL a l’air publique (https, pas localhost/127, pas réseau privé) => on préfère Office
    if (isLikelyPublicHttp(src)) {
      setMode("office");
      return;
    }

    // Sinon rendu local via docx-preview
    setMode("local");

    (async () => {
      try {
        const safe = ensureCorsSafe(src); // proxifie si besoin
        const buf = await fetchArrayBufferWithFallback(safe, { timeoutMs: 60000 });
        if (cancelled) return;

        // Nettoie avant rendu
        const el = containerRef.current;
        if (!el) return;
        el.innerHTML = "";

        await renderAsync(buf, el, undefined, {
          // options docx-preview (facultatif)
          className: "docx", // classe CSS racine
          inWrapper: true,
          ignoreHeight: false,
          ignoreWidth: false,
          ignoreFonts: false,
          breakPages: true,
          useBase64URL: false,
          useMathMLPolyfill: false,
        });
      } catch (e) {
        if (!cancelled) setErr(e?.message || String(e));
      }
    })();

    return () => { cancelled = true; };
  }, [src]);

  if (mode === "office") {
    const officeSrc = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(src)}`;
    return (
      <div className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white">
        <div className="px-4 py-2 border-b text-slate-700">{title || "Document Word"}</div>
        <iframe
          src={officeSrc}
          className="w-full h-[calc(75vh-40px)]"
          title={title || "Word Viewer"}
          allowFullScreen
        />
      </div>
    );
  }

  // mode local (docx-preview)
  return (
    <div className="w-full h-[75vh] rounded-2xl overflow-auto border border-slate-200/40 bg-white">
      <div className="px-4 py-2 border-b text-slate-700">{title || "Document Word"}</div>
      {err ? (
        <div className="p-4 text-sm text-red-600">
          Impossible d’afficher le .docx en local : {err}
        </div>
      ) : (
        <div ref={containerRef} className="p-4 docx-wrapper" />
      )}
    </div>
  );
}
