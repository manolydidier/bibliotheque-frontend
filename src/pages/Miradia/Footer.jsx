import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

// ✅ Vite donne l'URL réelle du CSS (dev/prod)
import tailwindCssPath from "/src/index.css?url";
import CmsSectionRenderer from "../UserManagementDashboard/Components/Backoffice/Miradia/cms/CmsSectionRenderer";

// 🔁 Mets ici l'ID CMS de ta section "Footer" => ID 6
const CMS_FOOTER_ID = 6;

// Définition de CMS_RESET pour iframe
const CMS_RESET = `
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important; /* Permet la hauteur automatique */
    min-height: auto !important; /* Assurez-vous qu'il n'y a pas de hauteur minimale forcée */
    overflow-x: hidden !important;
    overflow-y: auto !important;
    display: block !important;
    background: transparent !important;
  }

  /* Fond BLEU en mode dark (dans l’iframe) */
  html.dark body {
    background: radial-gradient(1200px circle at 20% 0%, rgba(14,165,233,0.18), transparent 55%),
                radial-gradient(900px circle at 80% 20%, rgba(2,132,199,0.14), transparent 55%),
                linear-gradient(180deg, #020a1a 0%, #041a33 45%, #020a1a 100%) !important;
  }

  body > *:first-child { margin-top: 0 !important; }
  body > *:last-child { margin-bottom: 0 !important; }
`;

// Fonction pour normaliser le CSS
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

export default function FooterCMS() {
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

    const apiBase = String(API_BASE).replace(/\/api\/?$/, "").replace(/\/$/, "");
    const url = `${apiBase}/api/cms-sectionspublic/${CMS_FOOTER_ID}`;

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

  const apiBase = String(API_BASE).replace(/\/api\/?$/, "").replace(/\/$/, "");
  const frontOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const tailwindCssUrl = frontOrigin ? new URL(tailwindCssPath, frontOrigin).href : tailwindCssPath;

  if (state.loading) {
    return <div>Chargement du footer...</div>;
  }

  if (state.error) {
    return <div>Erreur : {state.error}</div>;
  }

  if (!state.section) {
    return <div>Aucune section CMS disponible.</div>;
  }

  return (
    <div className="w-full">
      <CmsSectionRenderer
        mode="iframe"
        html={state.section.html || ""}
        css={state.section.css || ""}
        js={state.section.js || ""}
        allowJs
        autoHeight={true} /* Permet à l'iframe de s'ajuster automatiquement */
        minHeight={620}
        extraBottom={0}
        extraCss={`${CMS_RESET}`}
        syncParentTheme
        className="w-full h-full"
        canvasCssUrls={[tailwindCssUrl]}
        baseHref={apiBase + "/"}
        previewBackground="transparent"
      />
    </div>
  );
}