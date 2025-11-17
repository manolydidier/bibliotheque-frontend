// src/media-library/parts/Visualiseur/FilePreview/HtmlPreviewPro.jsx
import React, { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { ensureCorsSafe, fetchTextWithFallback } from "@/utils/fileFetch";

function getOriginalHref(u) {
  // Si u est du type /api/file-proxy?url=..., on récupère le param "url".
  try {
    const url = new URL(u, window.location.origin);
    return url.searchParams.get("url") || u;
  } catch {
    return u;
  }
}

export default function HtmlPreviewPro({ src, title = "Aperçu HTML" }) {
  const [html, setHtml] = useState("");
  const [err, setErr] = useState("");
  const [trusted, setTrusted] = useState(true); // <- mode Confiance (scripts autorisés)

  useEffect(() => {
    let cancelled = false;
    setErr("");
    setHtml("");

    // En mode "trusted", on ne fetch pas : on laisse l'iframe charger l’URL directement.
    if (trusted) return () => { cancelled = true; };

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
  }, [src, trusted]);

  const cleanedSrcDoc = useMemo(() => {
    if (!html) return "";

    // URL "réelle" du fichier (pour résoudre les chemins relatifs)
    const originalHref = getOriginalHref(src);
    const baseHref = new URL(originalHref, window.location.origin).toString();

    // Nettoyage (supprime <script> et on* handlers)
    const safe = DOMPurify.sanitize(html, {
      WHOLE_DOCUMENT: true,
      ADD_TAGS: ["base"],
      FORBID_TAGS: ["script"],
      FORBID_ATTR: [/^on/i], // onload, onclick, etc.
      RETURN_TRUSTED_TYPE: false,
    });

    // Injecter <base href="..."> le plus tôt possible
    if (safe.match(/<head[^>]*>/i)) {
      return safe.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
    }
    // Si pas de <head>, on en ajoute un
    return `<head><base href="${baseHref}"></head>${safe}`;
  }, [html, src]);

  // Barre de titre + toggle
  const Header = (
    <div className="px-4 py-2 border-b text-slate-700 flex items-center justify-between">
      <span>{title}</span>
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={trusted}
            onChange={(e) => setTrusted(e.target.checked)}
          />
          Activer scripts (confiance)
        </label>
      </div>
    </div>
  );

  if (err && !trusted) {
    return (
      <div className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white flex flex-col">
        {Header}
        <div className="p-4 text-sm text-red-600 overflow-auto">
          Erreur HTML : {err}
        </div>
      </div>
    );
  }

  // Mode Confiance : on laisse l’HTML s’exécuter tel quel (via proxy si nécessaire)
  if (trusted) {
    const iframeSrc = ensureCorsSafe(src);
    return (
      <div className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white">
        {Header}
        <iframe
          title={title}
          className="w-full h-[calc(75vh-40px)]"
          // En mode confiance : on autorise scripts + same-origin pour que la page fonctionne.
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox"
          src={iframeSrc}
        />
      </div>
    );
  }

  // Mode Safe (par défaut) : pas de scripts, mais chemins relatifs corrigés par <base>
  if (!html) {
    return (
      <div className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white">
        {Header}
        <div className="p-4 text-sm text-slate-500">Chargement du contenu HTML…</div>
      </div>
    );
  }

  return (
    <div className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white">
      {Header}
      <iframe
        title={title}
        className="w-full h-[calc(75vh-40px)]"
        // Pas de scripts en mode safe :
        sandbox="allow-forms allow-popups allow-pointer-lock allow-same-origin allow-top-navigation-by-user-activation"
        srcDoc={cleanedSrcDoc}
      />
    </div>
  );
}
