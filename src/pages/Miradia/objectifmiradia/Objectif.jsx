// ✅ src/pages/.../Objectif.jsx (INTÉGRAL) — fixe le scroll interne en supprimant les height:928/953px
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import CmsSectionRenderer from "../../UserManagementDashboard/Components/Backoffice/Miradia/cms/CmsSectionRenderer";

// ✅ Vite génère une URL valide (dev/prod)
import appCssPath from "/src/index.css?url";

const CMS_OBJECTIF_ID = 1;

const CMS_RESET = `
  html, body { margin: 0 !important; padding: 0 !important; }
  body { min-height: auto !important; height: auto !important; display: flow-root !important; }
  body > *:first-child { margin-top: 0 !important; }
  body > *:last-child { margin-bottom: 0 !important; padding-bottom: 0 !important; }

  /* ✅ kill 100vh / screen heights (au cas où) */
  .h-screen{ height:auto !important; }
  .min-h-screen{ min-height:auto !important; }
  [style*="height: 100vh"],[style*="height:100vh"]{ height:auto !important; }
  [style*="min-height: 100vh"],[style*="min-height:100vh"]{ min-height:auto !important; }
  [style*="height:calc(100vh"],[style*="height: calc(100vh"]{ height:auto !important; }
  [style*="min-height:calc(100vh"],[style*="min-height: calc(100vh"]{ min-height:auto !important; }
`;

const OBJECTIF_PATCH_CSS = `
  #mrd-objectif{ position:relative; z-index:0; isolation:isolate; }

  /* ✅ le HTML CMS met min-h-screen, on neutralise */
  #mrd-objectif{ min-height:auto !important; }
  #mrd-objectif > div{ min-height:auto !important; }

  /* ✅ si le CSS DB cache le stickybg */
  #mrd-stickybg{ display:block !important; z-index:0 !important; }
  #mrd-bg-image{ display:block !important; }

  /* ✅ si le CSS DB force un fond blanc, on respecte dark */
  html.dark #i2gu9{ background: rgba(11,22,38,.99) !important; }

  #mrd-objectif, #mrd-objectif * { box-sizing: border-box; }

  /* =========================================================
     ✅ LA CAUSE DU SCROLL : le CSS DB fixe height:928px/953px
     On override ce “wrapper rounded-[28px]”
     ========================================================= */
  #i2gu9 > div[class*="rounded-[28px]"]{
    height: auto !important;
    min-height: 0 !important;
  }
  #i2gu9 div[class*="rounded-[28px]"][class*="overflow-hidden"]{
    height: auto !important;
    min-height: 0 !important;
  }

  /* ✅ optionnel: enlève scroll interne si jamais un conteneur a overflow */
  #i2gu9, #mrd-objectif{
    overflow: visible !important;
  }
`;

// ✅ Normalise + enlève les règles DB qui cassent le layout
function normalizeCss(input) {
  let s = String(input ?? "");

  // retire <style>...</style>
  s = s.replace(/<style[^>]*>/gi, "").replace(/<\/style>/gi, "");

  // retire backticks
  const t = s.trim();
  if ((t.startsWith("`") && t.endsWith("`")) || (t.startsWith("```") && t.endsWith("```"))) {
    s = t.replace(/^`{1,3}/, "").replace(/`{1,3}$/, "");
  }

  // ✅ retire règles qui cassent l'objectif
  s = s
    // sticky bg caché par le builder
    .replace(/#mrd-stickybg\s*\{[^}]*display\s*:\s*none\s*!?important?;?[^}]*\}/gi, "")
    // fond blanc forcé
    .replace(/#i2gu9\s*\{[^}]*background-color\s*:\s*rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)\s*;?[^}]*\}/gi, "")
    // ✅ SUPPRIME les règles du builder qui fixent height: XXXpx sur rounded-[28px]
    // marche pour rounded-[28px] ET rounded-\[28px\]
    .replace(/\.relative\.overflow-hidden\.rounded-\\?\[28px\\?\][^{]*\{[^}]*height\s*:\s*\d+px\s*;?[^}]*\}/gi, "");

  return s.trim();
}

export default function Objectif() {
  const API_BASE = useMemo(
    () => import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
    []
  );

  const [state, setState] = useState({ loading: true, error: "", section: null });

  useEffect(() => {
    const controller = new AbortController();

    const apiBase = String(API_BASE).replace(/\/api\/?$/, "").replace(/\/$/, "");
    const url = `${apiBase}/api/cms-sectionspublic/${CMS_OBJECTIF_ID}`;

    setState({ loading: true, error: "", section: null });

    axios
      .get(url, { headers: { Accept: "application/json" }, signal: controller.signal })
      .then((res) => {
        const json = res.data;
        const okStatus = String(json?.status || "").toLowerCase() === "published";
        if (!okStatus) {
          setState({ loading: false, error: "Section CMS non publiée.", section: null });
          return;
        }

        setState({
          loading: false,
          error: "",
          section: { ...json, css: normalizeCss(json?.css || "") },
        });
      })
      .catch((e) => {
        if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return;
        const msg = e?.response?.status
          ? `Erreur CMS: HTTP ${e.response.status}`
          : e?.message || "Erreur chargement CMS";
        setState({ loading: false, error: msg, section: null });
      });

    return () => controller.abort();
  }, [API_BASE]);

  if (state.loading) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Chargement…</div>;
  }

  if (!state.section) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-950/30 dark:text-slate-200">
        {state.error || "Aucune section CMS disponible."}
      </div>
    );
  }

  const apiBase = String(API_BASE).replace(/\/api\/?$/, "").replace(/\/$/, "");

  // ✅ URL ABSOLUE vers le FRONT (évite /src/index.css qui part vers le backend)
  const frontOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const tailwindCssUrl = frontOrigin ? new URL(appCssPath, frontOrigin).href : appCssPath;

  return (
    <div className="w-full " >
      <CmsSectionRenderer
        key={`cms-${CMS_OBJECTIF_ID}`}
        mode="iframe"
        html={state.section.html || ""}
        css={state.section.css || ""}
        js={state.section.js || ""}
        allowJs
        autoHeight
        heightStrategy="lastElement"
        minHeight={910}
        extraBottom={0}
        extraCss={`${CMS_RESET}\n${OBJECTIF_PATCH_CSS}`}
        syncParentTheme
        className="w-full "
        canvasCssUrls={[tailwindCssUrl]}
        baseHref={apiBase + "/"} // ✅ backend pour assets CMS (/images/..)
        previewBackground="transparent"
      />
    </div>
  );
}
