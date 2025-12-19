// src/components/cms/CmsSectionRenderer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * CmsSectionRenderer
 * - mode="iframe" (recommandé): isole CSS + JS, évite de casser ton app React
 * - mode="inline" (optionnel): injecte HTML + CSS dans le DOM (JS désactivé par défaut)
 *
 * Props:
 * - html, css, js: strings (depuis ta DB)
 * - mode: "iframe" | "inline"
 * - className: classes wrapper
 * - style: style wrapper
 * - minHeight: number (px) -> hauteur mini iframe
 * - autoHeight: boolean -> ajuste hauteur iframe au contenu
 * - allowJs: boolean -> autorise l'exécution JS (iframe: true par défaut / inline: false par défaut)
 * - sandbox: string -> override sandbox iframe
 * - headHtml: string -> extra tags dans <head> (fonts, meta, etc.)
 */
export default function CmsSectionRenderer({
  html = "",
  css = "",
  js = "",
  mode = "iframe",
  className = "",
  style = undefined,
  minHeight = 240,
  autoHeight = true,
  allowJs = true,
  sandbox,
  headHtml = "",
}) {
  const safeHtml = String(html || "");
  const safeCss = String(css || "");
  const safeJs = String(js || "");

  // --- IFRAME MODE ---
  const iframeRef = useRef(null);
  const [frameH, setFrameH] = useState(minHeight);

  // identifiant pour postMessage
  const frameId = useMemo(() => `cms_iframe_${Math.random().toString(16).slice(2)}`, []);

  const iframeSandbox = useMemo(() => {
    // Par défaut : scripts + same-origin pour que certaines libs marchent.
    // Si tu veux + sécurisé : enlève allow-same-origin (mais certaines choses cassent)
    if (sandbox) return sandbox;

    if (!allowJs) return "allow-same-origin"; // pas de scripts
    return "allow-scripts allow-same-origin"; // recommandé en CMS interne
  }, [sandbox, allowJs]);

  const srcDoc = useMemo(() => {
    // Script auto height + base CSS
    const autoHeightScript = autoHeight
      ? `
        <script>
          (function() {
            const ID = ${JSON.stringify(frameId)};
            function sendH() {
              const doc = document.documentElement;
              const body = document.body;
              const h = Math.max(
                body ? body.scrollHeight : 0,
                body ? body.offsetHeight : 0,
                doc ? doc.clientHeight : 0,
                doc ? doc.scrollHeight : 0,
                doc ? doc.offsetHeight : 0
              );
              window.parent && window.parent.postMessage({ __cms_iframe: true, id: ID, h: h }, "*");
            }
            window.addEventListener("load", sendH);
            window.addEventListener("resize", sendH);
            const mo = new MutationObserver(sendH);
            mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
            setInterval(sendH, 800);
          })();
        </script>
      `
      : "";

    const runJs = allowJs
      ? `<script>${safeJs}<\/script>`
      : "";

    // IMPORTANT: <base> aide pour liens relatifs dans certains cas
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  ${headHtml || ""}
  <style>
    /* reset minimal */
    html,body{margin:0;padding:0}
    body{min-height:${minHeight}px}
    ${safeCss || ""}
  </style>
</head>
<body>
  ${safeHtml || ""}
  ${autoHeightScript}
  ${runJs}
</body>
</html>`;
  }, [safeHtml, safeCss, safeJs, allowJs, autoHeight, headHtml, frameId, minHeight]);

  useEffect(() => {
    if (mode !== "iframe") return;

    const onMsg = (e) => {
      const d = e?.data;
      if (!d || !d.__cms_iframe) return;
      if (d.id !== frameId) return;
      const h = Number(d.h || 0);
      if (!Number.isFinite(h)) return;

      // garde une hauteur mini
      setFrameH(Math.max(minHeight, Math.min(h + 8, 4000)));
    };

    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [mode, frameId, minHeight]);

  // --- INLINE MODE ---
  // NOTE: ici on n’exécute PAS le JS par défaut (trop risqué pour l’app).
  // Si tu veux, je peux te fournir un mode inline + JS via new Function(), mais c’est à éviter.
  const inlineContent = useMemo(() => {
    return {
      __html: safeHtml,
    };
  }, [safeHtml]);

  if (mode === "inline") {
    return (
      <div className={className} style={style}>
        {/* CSS inline */}
        {safeCss ? <style>{safeCss}</style> : null}

        {/* HTML inline */}
        <div dangerouslySetInnerHTML={inlineContent} />

        {/* JS inline désactivé par défaut */}
        {!allowJs && safeJs ? null : null}
      </div>
    );
  }

  // IFRAME (recommandé)
  return (
    <div className={className} style={style}>
      <iframe
        ref={iframeRef}
        title="cms-section"
        className="w-full rounded-2xl border border-slate-200 bg-white"
        style={{ height: frameH }}
        sandbox={iframeSandbox}
        srcDoc={srcDoc}
      />
    </div>
  );
}
