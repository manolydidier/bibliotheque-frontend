import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import CmsSectionRenderer from "../../UserManagementDashboard/Components/Backoffice/Miradia/cms/CmsSectionRenderer";

import NavBarMiradia from "../../../component/navbar/NavbarMiradia";
import Footer from "../Footer";

import tailwindCssPath from "/src/index.css?url";

const CMS_RESET = `
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    height: 100% !important;
  }

  body {
    height: 100% !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    display: block !important;
    background: transparent !important;
  }

  html.dark body{
    background:
      radial-gradient(1200px circle at 20% 0%, rgba(14,165,233,0.18), transparent 55%),
      radial-gradient(900px circle at 80% 20%, rgba(2,132,199,0.14), transparent 55%),
      linear-gradient(180deg, #020a1a 0%, #041a33 45%, #020a1a 100%) !important;
  }

  body > *:first-child { margin-top: 0 !important; }
  body > *:last-child  { margin-bottom: 0 !important; }
`;

const DOMAINES_PATCH_CSS = `
  #mrd-domains, #mrd-domaines, #mrd-domains-root, #mrd-domains-intervention {
    position: relative;
    isolation: isolate;
    min-height: 100% !important;
    overflow: visible !important;
  }

  #mrd-bg { z-index: -10 !important; }

  html.dark .mrd-card,
  html.dark .mrd-section,
  html.dark .mrd-row-card{
    background-color: rgba(2, 16, 34, 0.72) !important;
    border-color: rgba(56, 189, 248, 0.14) !important;
  }
`;

function normalizeCss(input) {
  let s = String(input ?? "");
  s = s.replace(/<style[^>]*>/gi, "").replace(/<\/style>/gi, "");
  const t = s.trim();
  if (
    (t.startsWith("`") && t.endsWith("`")) ||
    (t.startsWith("```") && t.endsWith("```"))
  ) {
    s = t.replace(/^`{1,3}/, "").replace(/`{1,3}$/, "");
  }
  return s;
}

export default function Autres() {
  const { id } = useParams(); // Récupère l'ID à partir du paramètre de l'URL

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
    if (!id) {
      setState({ loading: false, error: "Aucun identifiant fourni.", section: null });
      return;
    }

    const controller = new AbortController();

    const apiBase = String(API_BASE).replace(/\/api\/?$/, "").replace(/\/$/, "");
    const url = `${apiBase}/api/cms-sectionspublic/${id}`; // Utilise l'ID dans l'URL API

    setState({ loading: true, error: "", section: null });

    axios
      .get(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      })
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
  }, [API_BASE, id]);

  const apiBase = String(API_BASE).replace(/\/api\/?$/, "").replace(/\/$/, "");

  const frontOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const tailwindCssUrl = frontOrigin ? new URL(tailwindCssPath, frontOrigin).href : tailwindCssPath;

  return (
    <div
      className="
        min-h-[100dvh] flex flex-col
        bg-white
        dark:bg-[#020a1a]
        dark:bg-[radial-gradient(1200px_circle_at_20%_0%,rgba(14,165,233,0.18),transparent_55%),radial-gradient(900px_circle_at_80%_20%,rgba(2,132,199,0.14),transparent_55%),linear-gradient(180deg,#020a1a_0%,#041a33_45%,#020a1a_100%)]
      "
    >
      <NavBarMiradia />

      <main className="flex-1 pt-20">
        <div className="w-full md:px-0 p-0">
          {state.loading ? (
            <div className="text-sm text-slate-500 dark:text-slate-200/80 px-4 py-6">
              Chargement…
            </div>
          ) : !state.section ? (
            <div className="px-4 py-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-blue-50/90">
                {state.error || "Aucune section CMS disponible."}
              </div>
            </div>
          ) : (
            <div className="w-full h-[calc(100dvh-80px)]">
              <CmsSectionRenderer
                mode="iframe"
                html={state.section.html || ""}
                css={state.section.css || ""}
                js={state.section.js || ""}
                allowJs
                autoHeight={false}
                minHeight={0}
                extraBottom={0}
                extraCss={`${CMS_RESET}\n${DOMAINES_PATCH_CSS}`}
                syncParentTheme
                className="w-full h-full"
                canvasCssUrls={[tailwindCssUrl]}
                baseHref={apiBase + "/"}
                previewBackground="transparent"
              />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}