// src/pages/.../GrapesEditorModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import grapesjs from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";

// =====================
// STARTER (exemple)
// =====================
const STARTER_HTML = `
<section class="mrd-hero">
  <div class="mrd-wrap">
    <p class="mrd-badge">MIRADIA • CMS</p>
    <h1>Section éditable (GrapesJS)</h1>
    <p class="mrd-lead">
      Double-clique ici pour modifier le texte. Tu peux aussi glisser des blocs depuis "Blocks".
    </p>
    <div class="mrd-actions">
      <a class="mrd-btn mrd-primary" href="#contact">Nous contacter</a>
      <a class="mrd-btn mrd-ghost" href="#services">Voir les services</a>
    </div>
  </div>
</section>

<section class="mrd-section" id="services">
  <div class="mrd-wrap">
    <h2>À propos</h2>
    <p>
      Cette zone est un exemple. Remplace par tes contenus (cards, images, etc.).
    </p>
    <div class="mrd-grid">
      <div class="mrd-card"><h3>Bloc 1</h3><p>Texte simple…</p></div>
      <div class="mrd-card"><h3>Bloc 2</h3><p>Texte simple…</p></div>
      <div class="mrd-card"><h3>Bloc 3</h3><p>Texte simple…</p></div>
    </div>
  </div>
</section>

<section class="mrd-section" id="contact">
  <div class="mrd-wrap">
    <h2>Contact</h2>
    <p>Exemple de lien : <a class="mrd-link" href="mailto:contact@miradia.mg">contact@miradia.mg</a></p>
  </div>
</section>
`;

const STARTER_CSS = `
.mrd-wrap{max-width:980px;margin:0 auto;padding:0 16px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto}
.mrd-hero{padding:64px 0;background:radial-gradient(1200px 600px at 20% 10%, #e0f2fe, transparent 60%),radial-gradient(1000px 500px at 80% 20%, #dbeafe, transparent 55%),#fff}
.mrd-badge{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.08em;color:#0f172a;background:#e0f2fe;padding:6px 10px;border-radius:999px}
.mrd-hero h1{margin:14px 0 8px;font-size:40px;line-height:1.1;color:#11528f}
.mrd-lead{margin:0 0 18px;color:#334155;font-size:16px;max-width:64ch}
.mrd-actions{display:flex;gap:10px;flex-wrap:wrap}
.mrd-btn{display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;border-radius:14px;font-weight:800;text-decoration:none;border:1px solid rgba(15,23,42,.12)}
.mrd-primary{border:none;color:#fff;background:linear-gradient(90deg,#11528f,#00a0d6)}
.mrd-ghost{color:#0f172a;background:rgba(255,255,255,.85)}
.mrd-section{padding:36px 0;background:#fff}
.mrd-section h2{margin:0 0 10px;color:#0f172a}
.mrd-section p{margin:0 0 12px;color:#475569;line-height:1.6}
.mrd-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}
.mrd-card{border:1px solid rgba(15,23,42,.12);border-radius:16px;padding:14px;background:#fff}
.mrd-card h3{margin:0 0 6px;color:#0f172a;font-size:14px}
.mrd-card p{margin:0;color:#475569;font-size:13px}
.mrd-link{color:#00a0d6;font-weight:700;text-decoration:none}
.mrd-link:hover{text-decoration:underline}
@media (max-width:720px){
  .mrd-hero{padding:44px 0}
  .mrd-hero h1{font-size:30px}
  .mrd-grid{grid-template-columns:1fr}
}
`;

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

const TAB_BTN =
  "px-3 py-1.5 rounded-xl text-xs font-semibold border transition select-none";
const TAB_ACTIVE = "bg-white text-slate-900 border-slate-200 shadow-sm";
const TAB_IDLE = "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/60";

export default function GrapesEditorModal({
  initialProject = "",
  initialHtml = "",
  initialCss = "",
  initialJs = "",
  onSave,
  onCancel,
}) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const jsTimerRef = useRef(null);
  const cssTimerRef = useRef(null);

  const [ready, setReady] = useState(false);

  // Onglets
  const [tab, setTab] = useState("css"); // "html" | "css" | "js"

  // Code panels
  const [htmlCode, setHtmlCode] = useState("");
  const [cssCode, setCssCode] = useState("");
  const [jsCode, setJsCode] = useState(String(initialJs || ""));

  // Options
  const [liveCss, setLiveCss] = useState(true);
  const [liveJs, setLiveJs] = useState(false); // par défaut OFF (sécurité)

  const safeProject = useMemo(() => {
    if (!initialProject) return null;
    try {
      const obj = JSON.parse(initialProject);
      return obj && typeof obj === "object" ? obj : null;
    } catch {
      return null;
    }
  }, [initialProject]);

  const openBlocks = (ed) => {
    try {
      ed.runCommand("core:open-blocks");
      return;
    } catch {}
    try {
      ed.runCommand("open-blocks");
    } catch {}
  };

  const syncFromEditor = () => {
    const ed = editorRef.current;
    if (!ed) return;
    setHtmlCode(ed.getHtml() || "");
    setCssCode(ed.getCss() || "");
  };

  const applyToEditor = () => {
    const ed = editorRef.current;
    if (!ed) return;

    // ⚠️ Remplace le contenu (comportement attendu pour un “éditeur code”)
    ed.setComponents(htmlCode || "");
    ed.setStyle(cssCode || "");

    // Si liveJs est activé on peut injecter
    if (liveJs) injectJsToCanvas();
  };

  const injectJsToCanvas = () => {
    const ed = editorRef.current;
    if (!ed) return;

    try {
      const win = ed.Canvas.getWindow();
      const doc = ed.Canvas.getDocument();
      if (!win || !doc) return;

      // enlever ancien script
      const old = doc.getElementById("mrd-js-runtime");
      if (old) old.remove();

      // si vide, rien à injecter
      const code = String(jsCode || "").trim();
      if (!code) return;

      const s = doc.createElement("script");
      s.id = "mrd-js-runtime";
      s.type = "text/javascript";
      s.text = code;

      doc.body.appendChild(s);
    } catch (e) {
      // silence : tu peux logger si tu veux
      // console.error("JS inject error", e);
    }
  };

  const insertExample = () => {
    const ed = editorRef.current;
    if (!ed) return;

    // Ajoute (append) un exemple sans remplacer toute la page
    ed.addComponents(STARTER_HTML);

    // CSS si vide
    const currentCss = (ed.getCss() || "").trim();
    if (!currentCss) ed.setStyle(STARTER_CSS);

    syncFromEditor();
    openBlocks(ed);
  };

  // INIT GrapesJS
  useEffect(() => {
    if (!containerRef.current) return;

    // conteneur stable
    containerRef.current.style.height = "100%";
    containerRef.current.style.width = "100%";

    const ed = grapesjs.init({
      container: containerRef.current,
      height: "100%",
      fromElement: false,
      storageManager: false,

      // Sans plugin => on garde simple
      plugins: [],
      pluginsOpts: {},

      canvas: {
        styles: [],
        scripts: [],
      },

      domComponents: {
        avoidInlineStyle: false,
      },
    });

    editorRef.current = ed;

    // Hydratation
    if (safeProject) {
      ed.loadProjectData(safeProject);
    } else {
      const hasHtml = Boolean(String(initialHtml || "").trim());
      const hasCss = Boolean(String(initialCss || "").trim());

      ed.setComponents(hasHtml ? initialHtml : STARTER_HTML);
      ed.setStyle(hasCss ? initialCss : STARTER_CSS);
    }

    // Blocks MIRADIA
    ed.BlockManager.add("mrd-hero", {
      label: "Hero MIRADIA",
      category: "MIRADIA",
      content: STARTER_HTML,
    });

    ed.BlockManager.add("mrd-card", {
      label: "Card simple",
      category: "MIRADIA",
      content: `<div class="mrd-card"><h3>Titre</h3><p>Texte…</p></div>`,
    });

    ed.BlockManager.add("mrd-footer", {
      label: "Footer simple",
      category: "MIRADIA",
      content: `
        <footer style="padding:28px 0;border-top:1px solid rgba(15,23,42,.12)">
          <div class="mrd-wrap">
            <p style="margin:0;color:#64748b;font-size:14px">© ${new Date().getFullYear()} MIRADIA — Tous droits réservés</p>
          </div>
        </footer>
      `,
    });

    // Quand l’éditeur est prêt
    ed.on("load", () => {
      setReady(true);
      openBlocks(ed);
      syncFromEditor();
      // inject JS si existant et liveJs
      if (liveJs && String(jsCode || "").trim()) injectJsToCanvas();
    });

    // Fallback si “load” tardif
    const t = setTimeout(() => {
      setReady(true);
      openBlocks(ed);
      syncFromEditor();
    }, 250);

    return () => {
      clearTimeout(t);
      if (jsTimerRef.current) clearTimeout(jsTimerRef.current);
      if (cssTimerRef.current) clearTimeout(cssTimerRef.current);
      try {
        ed.destroy();
      } catch {}
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // LIVE CSS (optionnel)
  useEffect(() => {
    if (!liveCss) return;
    if (!ready) return;

    // debounce
    if (cssTimerRef.current) clearTimeout(cssTimerRef.current);
    cssTimerRef.current = setTimeout(() => {
      const ed = editorRef.current;
      if (!ed) return;
      try {
        ed.setStyle(cssCode || "");
      } catch {}
    }, 250);

    return () => {
      if (cssTimerRef.current) clearTimeout(cssTimerRef.current);
    };
  }, [cssCode, liveCss, ready]);

  // LIVE JS (optionnel)
  useEffect(() => {
    if (!liveJs) return;
    if (!ready) return;

    if (jsTimerRef.current) clearTimeout(jsTimerRef.current);
    jsTimerRef.current = setTimeout(() => {
      injectJsToCanvas();
    }, 350);

    return () => {
      if (jsTimerRef.current) clearTimeout(jsTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsCode, liveJs, ready]);

  const doSave = () => {
    const ed = editorRef.current;
    if (!ed) return;

    // Important : on applique d’abord pour être sûr que le code panel est synchronisé
    applyToEditor();

    const project = JSON.stringify(ed.getProjectData());
    const html = ed.getHtml();
    const css = ed.getCss();

    onSave?.({
      project,
      html,
      css,
      js: jsCode || "",
    });
  };

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Top bar (épuré + actions code) */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-white">
        <div className="text-xs text-slate-600 flex items-center gap-2">
          <span
            className={cx(
              "inline-block w-2 h-2 rounded-full",
              ready ? "bg-emerald-500" : "bg-amber-400"
            )}
          />
          {ready ? "GrapesJS prêt" : "Chargement…"}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={syncFromEditor}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white hover:bg-slate-50"
            title="Récupère HTML/CSS depuis le canvas"
          >
            Sync
          </button>

          <button
            type="button"
            onClick={applyToEditor}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white hover:bg-slate-50"
            title="Applique HTML/CSS (et JS si activé) au canvas"
          >
            Appliquer
          </button>

          <button
            type="button"
            onClick={insertExample}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white hover:bg-slate-50"
            title="Ajoute un exemple dans la page"
          >
            + Exemple
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white hover:bg-slate-50"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={doSave}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: "linear-gradient(90deg,#11528f,#00a0d6)" }}
          >
            Enregistrer
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_420px]">
        {/* Grapes Canvas */}
        <div className="min-h-0">
          <div ref={containerRef} className="h-full w-full" />
        </div>

        {/* Code Panel */}
        <div className="border-l bg-slate-50 min-h-0 flex flex-col">
          {/* Tabs */}
          <div className="px-3 pt-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab("html")}
                className={cx(TAB_BTN, tab === "html" ? TAB_ACTIVE : TAB_IDLE)}
              >
                HTML
              </button>
              <button
                type="button"
                onClick={() => setTab("css")}
                className={cx(TAB_BTN, tab === "css" ? TAB_ACTIVE : TAB_IDLE)}
              >
                CSS
              </button>
              <button
                type="button"
                onClick={() => setTab("js")}
                className={cx(TAB_BTN, tab === "js" ? TAB_ACTIVE : TAB_IDLE)}
              >
                JS
              </button>
            </div>

            {/* toggles */}
            <div className="mt-3 flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  checked={liveCss}
                  onChange={(e) => setLiveCss(e.target.checked)}
                />
                Live CSS
              </label>

              <label className="flex items-center gap-2 text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  checked={liveJs}
                  onChange={(e) => setLiveJs(e.target.checked)}
                />
                Live JS (test)
              </label>

              <button
                type="button"
                onClick={injectJsToCanvas}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold hover:bg-slate-50"
                title="Injecte le JS dans le canvas pour tester"
              >
                Exécuter JS
              </button>
            </div>

            <p className="mt-2 text-[11px] text-slate-500 leading-snug">
              Astuce : clique dans la zone de code puis <b>Ctrl+V</b>. Ensuite <b>Appliquer</b> pour pousser vers le canvas.
            </p>
          </div>

          <div className="px-3 pb-3 flex-1 min-h-0">
            {tab === "html" && (
              <textarea
                value={htmlCode}
                onChange={(e) => setHtmlCode(e.target.value)}
                className="mt-3 h-full w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                placeholder="Colle ton HTML ici…"
              />
            )}

            {tab === "css" && (
              <textarea
                value={cssCode}
                onChange={(e) => setCssCode(e.target.value)}
                className="mt-3 h-full w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                placeholder="Colle ton CSS ici…"
              />
            )}

            {tab === "js" && (
              <textarea
                value={jsCode}
                onChange={(e) => setJsCode(e.target.value)}
                className="mt-3 h-full w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                placeholder={`// Colle ton JS ici…\n// Exemple:\n// console.log("hello");`}
              />
            )}
          </div>

          <div className="px-3 pb-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-[11px] text-slate-600">
              <b>Note sécurité</b> : le JS injecté sert juste à tester. En production, applique des règles (rôles, CSP, validation).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
