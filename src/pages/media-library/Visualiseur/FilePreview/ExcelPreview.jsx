import React, { useEffect, useMemo, useRef, useState } from "react";
import { ensureCorsSafe, fetchArrayBufferWithFallback, isLikelyPublicHttp } from "@/utils/fileFetch";
import * as XLSX from "xlsx";

/* =========================
   Helpers
   ========================= */
const DS_URL = (import.meta.env.VITE_ONLYOFFICE_DS_URL || "").replace(/\/$/, "");

function getXlsxFileType(url = "") {
  const s = url.toLowerCase();
  if (s.endsWith(".xlsx")) return "xlsx";
  if (s.endsWith(".xls")) return "xls";
  if (s.endsWith(".csv")) return "csv";
  // fallback “xlsx” si inconnu : OnlyOffice a besoin d’un fileType
  return "xlsx";
}

/** charge dynamiquement un <script> (OnlyOffice) */
function useExternalScript(src) {
  const [state, setState] = useState(src ? "loading" : "idle");
  useEffect(() => {
    if (!src) return;
    let el = document.querySelector(`script[data-dynamic="${src}"]`);
    if (el && el.getAttribute("data-loaded") === "1") { setState("ready"); return; }
    if (!el) {
      el = document.createElement("script");
      el.src = src;
      el.async = true;
      el.dataset.dynamic = src;
      el.onload = () => { el.setAttribute("data-loaded","1"); setState("ready"); };
      el.onerror = () => setState("error");
      document.head.appendChild(el);
    } else {
      el.addEventListener("load", () => setState("ready"), { once: true });
      el.addEventListener("error", () => setState("error"), { once: true });
    }
    return () => {};
  }, [src]);
  return state; // "idle" | "loading" | "ready" | "error"
}

/* =========================
   Office Online (si URL publique)
   ========================= */
function OfficeOnlineExcel({ src, title }) {
  const officeSrc = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(src)}`;
  return (
    <div className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white">
      <div className="px-4 py-2 border-b text-slate-700">{title || "Classeur Excel"}</div>
      <iframe
        src={officeSrc}
        className="w-full h-[calc(75vh-40px)]"
        title={title || "Excel"}
        allowFullScreen
      />
    </div>
  );
}

/* =========================
   OnlyOffice (Document Server)
   ========================= */
function OnlyOfficeExcel({ src, title }) {
  const state = useExternalScript(`${DS_URL}/web-apps/apps/api/documents/api.js`);
  const holderRef = useRef(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (state !== "ready" || !holderRef.current) return;
    if (!window.DocsAPI) { setErr("DocsAPI non chargé"); return; }

    const cfg = {
      document: {
        fileType: getXlsxFileType(src), // xlsx/xls/csv
        title: title || "Classeur",
        url: src, // ⚠️ DS doit pouvoir télécharger directement cette URL
      },
      documentType: "spreadsheet",
      editorConfig: { mode: "view", lang: "fr" },
      height: "100%",
      width: "100%",
      type: "embedded",
    };

    // eslint-disable-next-line no-undef
    const editor = new DocsAPI.DocEditor(holderRef.current, cfg);
    return () => { try { editor && editor.destroyEditor?.(); } catch {} };
  }, [state, src, title]);

  if (!DS_URL) {
    return <div className="p-4 text-sm text-slate-600">OnlyOffice Document Server non configuré.</div>;
  }
  if (state === "loading" || state === "idle") {
    return <div className="p-4 text-sm text-slate-500">Chargement du viewer…</div>;
  }
  if (state === "error" || err) {
    return <div className="p-4 text-sm text-red-600">Erreur viewer OnlyOffice : {err || "script"}</div>;
  }

  return (
    <div className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white">
      <div className="px-4 py-2 border-b text-slate-700">{title || "Classeur"}</div>
      <div ref={holderRef} style={{ width: "100%", height: "calc(75vh - 40px)" }} />
    </div>
  );
}

/* =========================
   Fallback local (SheetJS)
   ========================= */
function SheetTabs({ sheets, active, onChange }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b bg-slate-50">
      {sheets.map((name, i) => (
        <button
          key={name}
          onClick={() => onChange(i)}
          className={`px-3 py-1.5 rounded-lg text-sm border transition ${
            active === i
              ? "bg-white border-slate-300 text-slate-800"
              : "bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200"
          }`}
          title={name}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

function SheetTable({ sheet, maxRows = 2000, maxCols = 200 }) {
  // Convertit la feuille en tableau 2D (SheetJS util)
  const rows = useMemo(() => XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }), [sheet]);
  const display = rows.slice(0, maxRows).map(r => r.slice(0, maxCols));

  // Détecter nb colonnes (par sécurité si 1ère ligne plus courte)
  const colsCount = display.reduce((m, r) => Math.max(m, r.length), 0);
  const colLetters = [...Array(colsCount)].map((_, i) => XLSX.utils.encode_col(i));

  return (
    <div className="w-full h-[calc(75vh-40px-40px)] overflow-auto">
      <table className="min-w-full border-collapse">
        <thead className="sticky top-0 bg-white">
          <tr>
            <th className="text-xs font-semibold text-slate-500 border-b px-2 py-2 text-right w-12">#</th>
            {colLetters.map((c) => (
              <th key={c} className="text-xs font-semibold text-slate-600 border-b px-3 py-2 text-left">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {display.map((r, ri) => (
            <tr key={ri} className="odd:bg-white even:bg-slate-50/50">
              <td className="text-xs text-slate-500 border-b px-2 py-2 text-right pr-3">{ri + 1}</td>
              {colLetters.map((_, ci) => (
                <td key={ci} className="text-sm text-slate-800 border-b px-3 py-2 whitespace-pre">
                  {r[ci] != null ? String(r[ci]) : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > maxRows && (
        <div className="p-2 text-xs text-slate-500">
          Affichage limité à {maxRows} lignes (performance). Filtre/échantillonne si besoin.
        </div>
      )}
    </div>
  );
}

function ExcelLocalViewer({ src, title }) {
  const [wb, setWb] = useState(null);
  const [err, setErr] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setErr(""); setWb(null); setActive(0);

    (async () => {
      try {
        // on passe par ensureCorsSafe pour éviter CORS
        const safe = ensureCorsSafe(src);
        const buf = await fetchArrayBufferWithFallback(safe, { timeoutMs: 60000 });
        if (cancelled) return;
        const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
        setWb(wb);
      } catch (e) {
        if (!cancelled) setErr(e?.message || String(e));
      }
    })();

    return () => { cancelled = true; };
  }, [src]);

  if (err) return <div className="p-4 text-sm text-red-600">Erreur Excel : {err}</div>;
  if (!wb) return <div className="p-4 text-sm text-slate-500">Chargement du classeur…</div>;

  const sheets = wb.SheetNames || [];
  const sheet = wb.Sheets[sheets[active]];

  return (
    <div className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white flex flex-col">
      <div className="px-4 py-2 border-b text-slate-700">{title || "Classeur"}</div>
      <SheetTabs sheets={sheets} active={active} onChange={setActive} />
      <SheetTable sheet={sheet} />
    </div>
  );
}

/* =========================
   Export principal
   ========================= */
export default function ExcelPreviewPro({ src, title = "Classeur Excel" }) {
  // 1) Si l'URL est publique HTTPS → Office Online
  if (isLikelyPublicHttp(src)) {
    return <OfficeOnlineExcel src={src} title={title} />;
  }
  // 2) Sinon, si OnlyOffice est configuré → OnlyOffice
  if (DS_URL) {
    return <OnlyOfficeExcel src={src} title={title} />;
  }
  // 3) Sinon, fallback local SheetJS (léger & correct)
  return <ExcelLocalViewer src={src} title={title} />;
}
