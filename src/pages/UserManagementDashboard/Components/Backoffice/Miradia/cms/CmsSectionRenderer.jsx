// ✅ src/components/cms/CmsSectionRenderer.jsx (INTÉGRAL) — garde cette version si tu veux heightStrategy="lastElement"
import React, { useMemo, useRef, useEffect, useState } from "react";

const DEFAULT_CANVAS_CSS =
  typeof process !== "undefined" && process.env?.NODE_ENV === "production"
    ? "/assets/index.css"
    : "/src/index.css";

/* -------------------------
   Sanitizers
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

  allowJs = false,
  sandbox,

  headHtml = "",
  canvasCssUrls = [DEFAULT_CANVAS_CSS],
  baseHref = `${typeof window !== "undefined" ? window.location.origin : ""}/`,
  previewBackground = "transparent",

  // ✅ Auto-height mode
  autoHeight = false,
  minHeight = 80,
  extraBottom = 0,

  // ✅ helpers
  syncParentTheme = true,
  neutralizeFullHeightUtilities = true,
  extraCss = "",

  // ✅ Height strategy
  heightStrategy = "lastElement", // "lastElement" | "scroll"

  // ✅ optional: build fallback css from BG_BY_SECTION in js
  cssFallbackFromJs = false,
  bgFallbackCssTemplate = null,
}) {
  const iframeRef = useRef(null);

  // ✅ stable unique id per instance
  const instanceIdRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `cms_${Math.random().toString(36).slice(2)}_${Date.now()}`
  );
  const instanceId = instanceIdRef.current;

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

  const [iframeHeight, setIframeHeight] = useState(minHeight);

  const needsScripts = Boolean(allowJs) || Boolean(syncParentTheme) || Boolean(autoHeight);

  const iframeSandbox = useMemo(() => {
    if (sandbox) return sandbox;
    if (needsScripts) return "allow-scripts allow-same-origin allow-forms allow-popups";
    return "allow-same-origin";
  }, [sandbox, needsScripts]);

  // ✅ Reset height when content changes
  useEffect(() => {
    if (!autoHeight) return;
    setIframeHeight(minHeight);
  }, [autoHeight, minHeight, safeHtml, safeCss, safeJs, extraCss, bgFallbackCss]);

  const srcDoc = useMemo(() => {
    const linksCss = (Array.isArray(canvasCssUrls) ? canvasCssUrls : [])
      .filter(Boolean)
      .map((href) => `<link rel="stylesheet" href="${String(href)}" />`)
      .join("\n");

    const baseTag = baseHref ? `<base href="${String(baseHref).replace(/\/?$/, "/")}" />` : "";

    const fullHeightFixCss = neutralizeFullHeightUtilities
      ? `
        .min-h-screen{min-height:auto !important;}
        .h-screen{height:auto !important;}

        [style*="min-height: 100vh"],[style*="min-height:100vh"]{min-height:auto !important;}
        [style*="height: 100vh"],[style*="height:100vh"]{height:auto !important;}
        [style*="height:calc(100vh"],[style*="height: calc(100vh"]{height:auto !important;}
        [style*="min-height:calc(100vh"],[style*="min-height: calc(100vh"]{min-height:auto !important;}
      `
      : "";

    const themeSyncScript = syncParentTheme
      ? `
        <script>
          (function(){
            function isParentDark(){
              try{
                var pd = window.parent && window.parent.document;
                if(!pd) return null;
                var pHtml = pd.documentElement;
                var pBody = pd.body;
                var dark =
                  (pHtml && pHtml.classList && pHtml.classList.contains('dark')) ||
                  (pBody && pBody.classList && pBody.classList.contains('dark'));
                return !!dark;
              }catch(e){ return null; }
            }

            function applyTheme(){
              try{
                var dark = isParentDark();
                if(dark === null){
                  dark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
                }
                document.documentElement.classList.toggle('dark', dark);
                if(document.body) document.body.classList.toggle('dark', dark);
                document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
                if(document.body) document.body.style.colorScheme = dark ? 'dark' : 'light';
              }catch(e){}
            }

            window.addEventListener('load', applyTheme);

            try{
              var pd = window.parent && window.parent.document;
              if(pd){
                var pHtml = pd.documentElement;
                var pBody = pd.body;
                applyTheme();
                if(pHtml){
                  new MutationObserver(applyTheme).observe(pHtml, { attributes:true, attributeFilter:['class'] });
                }
                if(pBody){
                  new MutationObserver(applyTheme).observe(pBody, { attributes:true, attributeFilter:['class'] });
                }
              }
            }catch(e){}
          })();
        </script>
      `
      : "";

    const autoHeightScript = autoHeight
      ? `
        <script>
          (function(){
            var ID = ${JSON.stringify(instanceId)};
            var STRATEGY = ${JSON.stringify(heightStrategy)};

            function measureScroll(){
              try{
                var body = document.body;
                var html = document.documentElement;
                var h = Math.max(
                  body ? body.scrollHeight : 0,
                  body ? body.offsetHeight : 0,
                  html ? html.scrollHeight : 0,
                  html ? html.offsetHeight : 0
                );
                return Math.max(0, Math.ceil(h || 0));
              }catch(e){ return 0; }
            }

            function measureLastElement(){
              try{
                var body = document.body;
                if(!body) return 0;

                var els = Array.prototype.slice.call(body.querySelectorAll("*"));
                var last = null;

                for (var i = els.length - 1; i >= 0; i--) {
                  var el = els[i];
                  var st = window.getComputedStyle(el);
                  if (!st) continue;
                  if (st.display === "none" || st.visibility === "hidden") continue;
                  last = el;
                  break;
                }

                var target = last || body;
                var rect = target.getBoundingClientRect();
                var h = rect.bottom + window.scrollY;

                var bs = window.getComputedStyle(body);
                h += parseFloat(bs.paddingBottom || "0") + parseFloat(bs.marginBottom || "0");

                return Math.max(0, Math.ceil(h || 0));
              }catch(e){ return 0; }
            }

            function measure(){
              return (STRATEGY === "scroll") ? measureScroll() : measureLastElement();
            }

            function sendHeight(){
              try{
                window.parent.postMessage({ type:'cms-iframe-height', id: ID, height: measure() }, '*');
              }catch(e){}
            }

            window.addEventListener('load', function(){
              sendHeight();
              requestAnimationFrame(sendHeight);
              setTimeout(sendHeight, 120);
              setTimeout(sendHeight, 500);
              setTimeout(sendHeight, 900);
            });

            var t = 0;
            var iv = setInterval(function(){
              t += 1;
              sendHeight();
              if(t > 15) clearInterval(iv);
            }, 200);

            if(window.ResizeObserver){
              var ro = new ResizeObserver(function(){ sendHeight(); });
              ro.observe(document.documentElement);
              if(document.body) ro.observe(document.body);
            }

            try{
              var mo = new MutationObserver(function(){ sendHeight(); });
              mo.observe(document.documentElement, { childList:true, subtree:true, attributes:true });
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
    html{ background:${previewBackground}; color-scheme: light; }
    html.dark{ color-scheme: dark; }

    body{ background:transparent !important; min-height:0 !important; }
    img{max-width:100%;height:auto}
    body > *:last-child{ margin-bottom: 0 !important; padding-bottom: 0 !important; }

    ${fullHeightFixCss}

    ${safeCss || ""}
    ${String(extraCss || "")}
    ${bgFallbackCss || ""}
  </style>
</head>
<body>
  ${safeHtml || ""}
  ${themeSyncScript}
  ${autoHeightScript}
  ${cmsJs}
</body>
</html>`;
  }, [
    instanceId,
    safeHtml,
    safeCss,
    safeJs,
    allowJs,
    canvasCssUrls,
    baseHref,
    previewBackground,
    headHtml,
    syncParentTheme,
    autoHeight,
    neutralizeFullHeightUtilities,
    extraCss,
    bgFallbackCss,
    heightStrategy,
  ]);

  useEffect(() => {
    if (!autoHeight) return;

    const handleMessage = (event) => {
      if (event.data?.type !== "cms-iframe-height") return;
      if (event.data?.id !== instanceId) return;

      const height = Number(event.data?.height);
      if (!Number.isFinite(height)) return;

      setIframeHeight(Math.max(height + extraBottom, minHeight));
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [autoHeight, minHeight, extraBottom, instanceId]);

  if (mode === "inline") {
    return (
      <div className={className} style={style}>
        {Array.isArray(canvasCssUrls) &&
          canvasCssUrls.filter(Boolean).map((href) => (
            <link key={href} rel="stylesheet" href={href} />
          ))}
        {safeCss ? <style>{safeCss}</style> : null}
        {extraCss ? <style>{extraCss}</style> : null}
        {!allowJs && bgFallbackCss ? <style>{bgFallbackCss}</style> : null}
        <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <iframe
        ref={iframeRef}
        title="cms-section"
        sandbox={iframeSandbox}
        srcDoc={srcDoc}
        className="w-full rounded-2xl border border-slate-200 bg-white dark:bg-slate-950"
        style={{
          width: "100%",
          height: autoHeight ? `${iframeHeight}px` : "100%",
          display: "block",
          border: "none",
        }}
      />
    </div>
  );
}
