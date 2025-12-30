// ✅ src/pages/.../Beneficiaires.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import CmsSectionRenderer from "../../UserManagementDashboard/Components/Backoffice/Miradia/cms/CmsSectionRenderer";

// ✅ Navbar + Footer
import NavBarMiradia from "../../../component/navbar/NavBarMiradia"; // ✅ adapte si besoin
import Footer from "../Footer"; // ✅ adapte si besoin

// ✅ Vite donne l'URL réelle du CSS (dev/prod)
import tailwindCssPath from "/src/index.css?url";

// 🔁 Mets ici l'ID CMS de ta section "Bénéficiaires"
const CMS_BENEFICIAIRES_ID = 3;

/**
 * ✅ Sticky + Iframe:
 * - sticky fonctionne si le scroll se fait DANS l’iframe
 * - donc autoHeight = false + iframe = hauteur écran
 * - et dans l’iframe: html/body height:100% + overflow-y:auto
 */

// ✅ Reset pour iframe (scroll interne + pas de marges + fond dark bleu)
const CMS_RESET = `
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    height: 100% !important;
  }

  body {
    height: 100% !important;
    overflow-x: hidden !important;
    overflow-y: auto !important; /* ✅ scroll DANS l’iframe */
    display: block !important;
    background: transparent !important;
  }

  /* ✅ Fond BLEU en mode dark (dans l’iframe) */
  html.dark body{
    background:
      radial-gradient(1200px circle at 20% 0%, rgba(14,165,233,0.18), transparent 55%),
      radial-gradient(900px circle at 80% 20%, rgba(2,132,199,0.14), transparent 55%),
      linear-gradient(180deg, #020a1a 0%, #041a33 45%, #020a1a 100%) !important;
  }

  body > *:first-child { margin-top: 0 !important; }
  body > *:last-child  { margin-bottom: 0 !important; }
`;

// ✅ Patch iframe (sticky safe + lightbox + couleurs dark plus bleues)
const BENEF_PATCH_CSS = `
  /* ✅ Root: pas d'overflow hidden sinon sticky casse */
  #mrd-beneficiaires-root, .mrd-root, .mrd-container, .mrd-layout {
    overflow: visible !important;
  }

  #mrd-beneficiaires-root {
    position: relative;
    isolation: isolate;
    min-height: 100% !important;
  }

  /* ✅ background derrière */
  #mrd-bg { z-index: -10 !important; }

  /* ✅ Sticky menu gauche */
  .mrd-timeline {
    position: sticky !important;
    top: 92px !important;   /* ✅ sous la navbar (ajuste si besoin) */
    z-index: 20 !important;
  }

  /* ✅ Header sticky dans la timeline */
  .mrd-tl-head {
    position: sticky !important;
    top: 0 !important;
    z-index: 30 !important;
  }

  /* ✅ Force “bleu” en mode dark (évite le gris slate) */
  html.dark .mrd-timeline,
  html.dark .mrd-row-card{
    background-color: rgba(2, 16, 34, 0.72) !important;  /* bleu nuit */
    border-color: rgba(56, 189, 248, 0.14) !important;   /* cyan léger */
    box-shadow: rgba(0,0,0,0.55) 0px 22px 70px !important;
  }

  html.dark .mrd-tl-item:hover{
    background-color: rgba(56,189,248,0.08) !important;
  }

  html.dark .mrd-tl-title,
  html.dark .mrd-tl-hint,
  html.dark .mrd-tl-small{
    color: rgba(219, 234, 254, 0.72) !important;
  }

  /* ✅ Lightbox plus haut + image plus grande */
  .mrd-lightbox{
    align-items:flex-start !important;
    padding-top:10px !important;
    padding-bottom:10px !important;
  }

  .mrd-lb-inner{
    width: min(1240px, 96vw) !important;
    margin-top:0 !important;
  }

  .mrd-lb-inner img{
    max-height: calc(100vh - 90px) !important;
    object-fit: contain !important;
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

export default function Beneficiaires() {
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

    // ✅ base backend propre + endpoint API
    const apiBase = String(API_BASE).replace(/\/api\/?$/, "").replace(/\/$/, "");
    const url = `${apiBase}/api/cms-sectionspublic/${CMS_BENEFICIAIRES_ID}`;

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

  // ✅ URL ABSOLUE vers le FRONT (évite 8000/src/index.css)
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
      {/* ✅ Navbar (fixe) */}
      <NavBarMiradia />

      {/* ✅ Main: padding-top pour compenser la navbar fixe */}
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
            // ✅ Hauteur écran => scroll DANS l’iframe => sticky OK
            <div className="w-full h-[calc(100dvh-80px)]">
              <CmsSectionRenderer
                mode="iframe"
                html={state.section.html || ""}
                css={state.section.css || ""}
                js={state.section.js || ""}
                allowJs
                autoHeight={false} // ✅ IMPORTANT
                minHeight={0}
                extraBottom={0}
                extraCss={`${CMS_RESET}\n${BENEF_PATCH_CSS}`}
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

      {/* ✅ Footer */}
      <Footer />
    </div>
  );
}
