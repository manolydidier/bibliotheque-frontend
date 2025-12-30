// ✅ src/pages/.../DomainesIntervention.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import CmsSectionRenderer from "../../UserManagementDashboard/Components/Backoffice/Miradia/cms/CmsSectionRenderer";

// ✅ Vite donne l'URL réelle du CSS (dev/prod)
import tailwindCssPath from "/src/index.css?url";

const CMS_DOMAINES_ID = 2;

const CMS_RESET = `
  html, body { margin: 0 !important; padding: 0 !important; }
  body { min-height: auto !important; height: auto !important; display: flow-root !important; }
  body > *:first-child { margin-top: 0 !important; }
  body > *:last-child { margin-bottom: 0 !important; }
`;

const DOMAINES_PATCH_CSS = `
  /* ✅ évite les soucis de superposition / z-index dans l'iframe */
  #mrd-domains{ position:relative; z-index:0; isolation:isolate; }
  #mrd-bg{ z-index:-10 !important; }
`;

function normalizeCss(input) {
  let s = String(input ?? "");
  s = s.replace(/<style[^>]*>/gi, "").replace(/<\/style>/gi, "");
  const t = s.trim();
  if ((t.startsWith("`") && t.endsWith("`")) || (t.startsWith("```") && t.endsWith("```"))) {
    s = t.replace(/^`{1,3}/, "").replace(/`{1,3}$/, "");
  }
  return s;
}

export default function DomainesIntervention() {
  const API_BASE = useMemo(
    () => import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
    []
  );

  const [state, setState] = useState({
    loading: true,
    error: "",
    section: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    // ✅ base backend propre + endpoint API (corrige les erreurs /api manquant)
    const apiBase = String(API_BASE).replace(/\/api\/?$/, "").replace(/\/$/, "");
    const url = `${apiBase}/api/cms-sectionspublic/${CMS_DOMAINES_ID}`;

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

  // ✅ IMPORTANT: URL ABSOLUE vers le FRONT (évite 8000/src/index.css)
  const frontOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const tailwindCssUrl = frontOrigin ? new URL(tailwindCssPath, frontOrigin).href : tailwindCssPath;

  return (
    <div className="w-full lg:px-28 md:px-0 min-h-[1800px]  bg-white dark:bg-slate-950 p-0">
      <CmsSectionRenderer
        mode="iframe"
        html={state.section.html || ""}
        css={state.section.css || ""}
        js={state.section.js || ""}
        allowJs
        autoHeight
        minHeight={80}
        extraBottom={0}
        extraCss={`${CMS_RESET}\n${DOMAINES_PATCH_CSS}`}
        syncParentTheme
        className="w-full"
        canvasCssUrls={[tailwindCssUrl]} // ✅ URL ABSOLUE FRONT
        baseHref={apiBase + "/"}         // ✅ baseHref backend (images/ressources CMS)
        previewBackground="transparent"
      />
    </div>
  );
}
