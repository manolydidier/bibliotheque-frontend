// src/media-library/parts/Visualiseur/FilePreview/HtmlPreviewPro.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { fetchTextWithFallback } from "@/utils/fileFetch";

export default function HtmlPreviewPro({ src, title = "Aperçu HTML" }) {
  const [html, setHtml] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setErr(""); setHtml("");
    (async () => {
      try {
        const txt = await fetchTextWithFallback(src, { timeoutMs: 30000 });
        if (cancelled) return;
        setHtml(txt);
      } catch (e) {
        if (!cancelled) setErr(e?.message || String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [src]);

  const cleanedSrcDoc = useMemo(() => {
    if (!html) return "";
    // Nettoyage (retire scripts/event handlers)
    const safe = DOMPurify.sanitize(html, {
      WHOLE_DOCUMENT: true,
      ADD_TAGS: ["base"],
      FORBID_TAGS: ["script"],
      FORBID_ATTR: [/^on/i], // onload, onclick…
      RETURN_TRUSTED_TYPE: false,
    });

    // Injecte <base> pour les chemins relatifs (placé juste après <head> si possible)
    const baseHref = new URL(src, window.location.origin).toString();
    if (safe.includes("<head")) {
      return safe.replace(
        /<head([^>]*)>/i,
        `<head$1><base href="${baseHref}">`
      );
    }
    // sinon, on préfixe tout le doc
    return `<head><base href="${baseHref}"></head>${safe}`;
  }, [html, src]);

  if (err) {
    return <div className="p-4 text-sm text-red-600">Erreur HTML : {err}</div>;
  }
  if (!html) {
    return <div className="p-4 text-sm text-slate-500">Chargement du contenu HTML…</div>;
  }

  return (
    <div className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white">
      <div className="px-4 py-2 border-b text-slate-700">{title}</div>
      <iframe
        title={title}
        className="w-full h-[calc(75vh-40px)]"
        // sandbox durci : pas de scripts, pas de top navigation, lecture seule
        sandbox="allow-forms allow-popups allow-pointer-lock allow-same-origin allow-top-navigation-by-user-activation"
        srcDoc={cleanedSrcDoc}
      />
    </div>
  );
}
