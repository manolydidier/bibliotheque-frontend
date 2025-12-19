// ✅ src/components/cms/CmsSectionRenderer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * CmsSectionRenderer (GENERIC)
 * - iframe srcDoc
 * - allowJs=false => strip scripts + on* handlers
 * - autoHeight via postMessage (calc corrigé)
 * - syncParentTheme (Tailwind dark:) optionnel
 * - cssFallbackFromJs optionnel (extraction BG_BY_SECTION)
 * - patchCss optionnel (au lieu de hardcoder "Miradia")
 */

const DEFAULT_CANVAS_CSS =
  typeof process !== "undefined" && process.env?.NODE_ENV === "production"
    ? "/assets/index.css"
    : "/src/index.css";

/* -------------------------
   Sanitizers (simple & utile)
------------------------- */
function stripHtmlShell(input = "") {
  const s = String(input || "");
  return s
    .replace(/<!doctype[\s\S]*?>/gi, "")
    .replace(/<html[\s\S]*?>/gi, "")
    .replace(/<\/html>/gi, "")
    .replace(/<head[\s\S]*?>[\s\S]*?<\/head>/gi, "")
    .replace(/<body[\s\S]*?>/gi, "")
    .replace(/<\/body>/gi, "");
}

function stripScripts(input = "") {
  return String(input || "").replace(/<script\b[\s\S]*?>[\s\S]*?<\/script>/gi, "");
}

function stripOnHandlers(input = "") {
  return String(input || "").replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "");
}

function sanitizeHtmlForNoJs(html = "") {
  let out = stripHtmlShell(html);
  out = stripScripts(out);
  out = stripOnHandlers(out);
  return out;
}

/* -------------------------
   Extract BG map from JS (optional fallback)
   target: const BG_BY_SECTION = { vision:"...", mission:"...", valeurs:"..." };
------------------------- */
function extractBgBySection(js = "") {
  const s = String(js || "");
  const blockMatch = s.match(/BG_BY_SECTION\s*=\s*\{([\s\S]*?)\}\s*;/m);
  if (!blockMatch) return null;

  const inside = blockMatch[1] || "";
  const out = {};

  const re = /["']?([a-zA-Z0-9_-]+)["']?\s*:\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(inside))) {
    const key = m[1];
    const url = m[2];
    if (key && url) out[key] = url;
  }
  return Object.keys(out).length ? out : null;
}

function buildBgFallbackCss(bgMap, template) {
  if (!bgMap || !template) return "";
  // template: (pick)=> string CSS ; pick(key) => url(...)
  const pick = (k) => (bgMap[k] ? `url(${bgMap[k]})` : "none");
  return template(pick) || "";
}

export default function CmsSectionRenderer({
  html = "",
  css = "",
  js = "",
  mode = "iframe",
  className = "",
  style = undefined,

  minHeight = 120,
  autoHeight = true,
  heightRendered, // (optional) fixed height if autoHeight=false
heightRenderer,
  allowJs = false,

  sandbox,
  headHtml = "",
  canvasCssUrls = [DEFAULT_CANVAS_CSS],
  baseHref = `${typeof window !== "undefined" ? window.location.origin : ""}/`,
  previewBackground = "transparent",

  // ✅ optional helpers
  syncParentTheme = true,
  extraBottom = 8,

  // ✅ optional: neutralise min-h-screen & h-screen from CMS
  neutralizeFullHeightUtilities = true,

  // ✅ optional: append additional CSS from parent
  extraCss = "",

  // ✅ optional: build fallback css from BG_BY_SECTION in js (useful when allowJs=false)
  cssFallbackFromJs = false,
  bgFallbackCssTemplate = null,
}) {
  const safeHtml = useMemo(() => {
    if (allowJs) return stripHtmlShell(html);
    return sanitizeHtmlForNoJs(html);
  }, [html, allowJs]);

  const safeCss = String(css || "");
  const safeJs = allowJs ? String(js || "") : "";

  const bgFallbackCss = useMemo(() => {
    if (allowJs) return "";
    if (!cssFallbackFromJs || !bgFallbackCssTemplate) return "";
    const map = extractBgBySection(js);
    return buildBgFallbackCss(map, bgFallbackCssTemplate);
  }, [allowJs, cssFallbackFromJs, bgFallbackCssTemplate, js]);

  const iframeRef = useRef(null);
  const [frameH, setFrameH] = useState(minHeight);
  const frameId = useMemo(() => `cms_iframe_${Math.random().toString(16).slice(2)}`, []);

  // scripts needed if autoHeight OR allowJs OR theme sync
  const needsScripts = !!autoHeight || !!allowJs || !!syncParentTheme;

  const iframeSandbox = useMemo(() => {
    if (sandbox) return sandbox;
    if (needsScripts) return "allow-scripts allow-same-origin allow-forms allow-popups";
    return "allow-same-origin";
  }, [sandbox, needsScripts]);

  const srcDoc = useMemo(() => {
    const linksCss = (Array.isArray(canvasCssUrls) ? canvasCssUrls : [])
      .filter(Boolean)
      .map((href) => `<link rel="stylesheet" href="${String(href)}" />`)
      .join("\n");

    const baseTag = baseHref ? `<base href="${String(baseHref).replace(/\/?$/, "/")}" />` : "";

    const bodyMinHeightCss = autoHeight ? "min-height:0 !important;" : `min-height:${minHeight}px;`;

    const fullHeightFixCss = neutralizeFullHeightUtilities
      ? `
        .min-h-screen{min-height:auto !important;}
        .h-screen{height:auto !important;}
        [style*="min-height: 100vh"],[style*="min-height:100vh"]{min-height:auto !important;}
      `
      : "";

    // ✅ AutoHeight script
    const autoHeightScript = autoHeight
      ? `
        <script>
          (function() {
            const ID = ${JSON.stringify(frameId)};
            const EXTRA = ${Number(extraBottom || 0)};
            let raf=null;

            function computeHeight() {
              const doc = document.documentElement;
              const body = document.body;
              const h = Math.max(
                body ? body.scrollHeight : 0,
                body ? body.offsetHeight : 0,
                doc ? doc.scrollHeight : 0,
                doc ? doc.offsetHeight : 0
              );
              return (h || 0) + EXTRA;
            }

            function sendH() {
              if (raf) cancelAnimationFrame(raf);
              raf = requestAnimationFrame(function(){
                const h = computeHeight();
                window.parent && window.parent.postMessage({ __cms_iframe: true, id: ID, h: h }, "*");
              });
            }

            window.addEventListener("load", function() {
              sendH();
              setTimeout(sendH, 120);
              setTimeout(sendH, 420);
              setTimeout(sendH, 900);
            });

            window.addEventListener("resize", sendH);

            const mo = new MutationObserver(sendH);
            mo.observe(document.documentElement, {
              childList: true,
              subtree: true,
              attributes: true,
              characterData: true
            });

            setInterval(sendH, 1200);
          })();
        </script>
      `
      : "";

    // ✅ Theme sync: parent html.dark => iframe html.dark
    const themeSyncScript = syncParentTheme
      ? `
        <script>
          (function(){
            function applyThemeFromParent(){
              try{
                var p = window.parent && window.parent.document && window.parent.document.documentElement;
                if(!p) return;
                var dark = p.classList.contains('dark');
                document.documentElement.classList.toggle('dark', dark);
                document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
              }catch(e){}
            }
            window.addEventListener('load', applyThemeFromParent);
            try{
              var pHtml = window.parent && window.parent.document && window.parent.document.documentElement;
              if(pHtml){
                applyThemeFromParent();
                new MutationObserver(applyThemeFromParent).observe(pHtml, {
                  attributes:true,
                  attributeFilter:['class']
                });
              }
            }catch(e){}
          })();
        </script>
      `
      : "";

    const cmsJs = allowJs && safeJs ? `<script>${safeJs}<\/script>` : "";

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  ${baseTag}
  ${headHtml || ""}
  ${linksCss}
  <style>
    html,body{margin:0;padding:0;height:auto;}
    html{
      background:${previewBackground};
      color-scheme: light;
    }
    html.dark{ color-scheme: dark; }

    body{
      background:transparent !important;
      ${bodyMinHeightCss}
    }
    img{max-width:100%;height:auto}

    ${fullHeightFixCss}

    /* ✅ CSS from DB */
    ${safeCss || ""}

    /* ✅ extraCss from parent (page-specific tweaks) */
    ${String(extraCss || "")}

    /* ✅ optional BG fallback from JS */
    ${bgFallbackCss || ""}
  </style>
</head>
<body>
  ${safeHtml || ""}
  ${autoHeightScript}
  ${themeSyncScript}
  ${cmsJs}
</body>
</html>`;
  }, [
    safeHtml,
    safeCss,
    safeJs,
    allowJs,
    autoHeight,
    frameId,
    minHeight,
    canvasCssUrls,
    baseHref,
    previewBackground,
    headHtml,
    syncParentTheme,
    extraBottom,
    neutralizeFullHeightUtilities,
    extraCss,
    bgFallbackCss,
  ]);

  useEffect(() => {
    if (mode !== "iframe") return;

    const onMsg = (e) => {
      const d = e?.data;
      if (!d || !d.__cms_iframe) return;
      if (d.id !== frameId) return;

      const h = Number(d.h || 0);
      if (!Number.isFinite(h)) return;

      setFrameH(Math.max(minHeight, Math.min(h, 12000)));
    };

    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [mode, frameId, minHeight]);

  if (mode === "inline") {
    return (
      <div className={className} style={style}>
        {Array.isArray(canvasCssUrls) &&
          canvasCssUrls.filter(Boolean).map((href) => <link key={href} rel="stylesheet" href={href} />)}
        {safeCss ? <style>{safeCss}</style> : null}
        {extraCss ? <style>{extraCss}</style> : null}
        {!allowJs && bgFallbackCss ? <style>{bgFallbackCss}</style> : null}
        <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
      </div>
    );
  }

  const iframeHeight = autoHeight ? `${frameH}px` : heightRendered || `${minHeight}px`;

  return (
    <div className={className} style={style}>
      <iframe
        ref={iframeRef}
        title="cms-section"
        className="w-full rounded-2xl border-slate-200 bg-white dark:bg-slate-950"
        style={{ height: heightRenderer }}
        sandbox={iframeSandbox}
        srcDoc={srcDoc}
      />
    </div>
  );
}
