import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function buildApiBase() {
  const raw = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
  const base = String(raw).replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

/**
 * AccordionItem — intégré dans NavBarMiradia
 *
 * Props :
 *   title   {string}  — libellé du bouton (ex: "Communication")
 *   apiUrl  {string}  — réservé / déclenche le re-fetch si change
 *   isDark  {boolean} — hérité de NavBarMiradia pour synchroniser le thème
 *   compact {boolean} — hérité pour ajuster le padding vertical
 */
const AccordionItem = ({ title = "Autres", apiUrl, isDark = false, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [subMenuItems, setSubMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const wrapperRef = useRef(null);

  /* ── fermeture au clic extérieur ── */
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── fetch ── */
  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const apiBase = buildApiBase();
        const response = await axios.get(`${apiBase}/pagemiradia`);
        const data = response.data.data;

        // Ajouter un élément par défaut si le tableau est vide
        const defaultItem = {
          key: "plateform",
          label: "Plateforme",
          id: "plateform",
          active: false // Ajoutez la logique de votre routeFlags ici
        };
        if (data.length === 0) {
          setSubMenuItems([defaultItem]);
        } else {
          setSubMenuItems(data);
        }
      } catch {
        setError("Impossible de charger les données.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [apiUrl, isOpen]);

  /* ── classes thème ── */
  const btnBase = isDark
    ? "text-blue-50/90 hover:text-white hover:bg-white/10"
    : "text-[#0b5a82] hover:text-[#082f49] hover:bg-sky-50";

  const btnActive = isDark
    ? "bg-white/10 text-white"
    : "bg-sky-100 text-[#0b5a82]";

  const panelBg = isDark
    ? "bg-slate-900 border-slate-700/80"
    : "bg-white border-slate-200/90";

  const itemBase = isDark
    ? "hover:bg-white/10 hover:text-white text-blue-50/85"
    : "hover:bg-sky-50 hover:text-[#082f49] text-[#0b5a82]";

  const dividerColor = isDark ? "bg-slate-700/60" : "bg-slate-100";

  const errorStyle = isDark
    ? "text-red-300 bg-red-900/30"
    : "text-red-600 bg-red-50";

  const dotColor = isDark ? "bg-sky-400" : "bg-[#22c55e]";

  const paddingY = compact ? "py-2" : "py-2.5";

  return (
    <div ref={wrapperRef} className="relative">

      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`
          relative inline-flex items-center justify-center gap-1.5
          ${paddingY} px-4
          text-[15px] font-semibold whitespace-nowrap rounded-lg
          transition-all duration-200
          ${btnBase} ${isOpen ? btnActive : ""}
        `}
      >
        <span>{title}</span>

        {/* Chevron */}
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200
            ${isOpen ? "rotate-180" : "rotate-0"}
            ${isDark ? "text-sky-400" : "text-[#0b5a82]/60"}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="4 6 8 10 12 6" />
        </svg>
      </button>

      {/* ── Dropdown panel ── */}
      {isOpen && (
        <div
          role="listbox"
          className={`
            absolute top-[calc(100%+8px)] left-0
            min-w-[220px] w-max max-w-[300px]
            border rounded-xl
            shadow-2xl backdrop-blur-xl
            z-[60]
            ${panelBg}
          `}
          style={{
            transformOrigin: 'top center',
            animation: 'miradiaDropIn 0.2s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* Flèche décorative */}
          <span
            className={`
              absolute -top-[7px] left-6
              w-3 h-3 rotate-45
              border-l border-t
              ${isDark ? "bg-slate-900 border-slate-700/80" : "bg-white border-slate-200/90"}
            `}
            aria-hidden="true"
          />

          <div className="py-2 px-1.5">

            {/* Loading */}
            {loading && (
              <div className={`flex items-center gap-2.5 px-3 py-3 text-sm font-medium
                ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                <span className={`
                  w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin
                  ${isDark ? "border-sky-400" : "border-[#0b5a82]"}
                `} />
                Chargement…
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className={`flex items-start gap-2 mx-1 my-0.5 px-3 py-2.5 rounded-lg text-sm ${errorStyle}`}>
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 16 16" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="8" r="6.5" />
                  <line x1="8" y1="5" x2="8" y2="8.5" />
                  <circle cx="8" cy="10.5" r="0.5" fill="currentColor" />
                </svg>
                {error}
              </div>
            )}

            {/* Empty */}
            {!loading && !error && subMenuItems.length === 0 && (
              <p className={`px-4 py-3 text-sm italic ${isDark ? "text-slate-400" : "text-slate-400"}`}>
                Aucun élément disponible
              </p>
            )}

            {/* Items */}
            {!loading && !error && subMenuItems.map((item, idx) => (
              <React.Fragment key={item.id}>
                <a
                  href={`/autres/${item.id}`}
                  role="option"
                  className={`
                    flex items-center gap-2.5 px-3 py-2.5 rounded-lg
                    text-[15px] font-medium no-underline
                    transition-all duration-150 group capitalize
                    ${itemBase}
                  `}
                >
                  <span className={`
                    w-1.5 h-1.5 rounded-full flex-shrink-0
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-150
                    ${dotColor}
                  `} />
                  {item.category}
                </a>
                {idx < subMenuItems.length - 1 && (
                  <div className={`h-px mx-3 my-0.5 ${dividerColor}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes miradiaDropIn {
          from { opacity: 0; transform: translateY(-6px) scaleY(0.96); }
          to   { opacity: 1; transform: translateY(0)   scaleY(1);    }
        }
      `}</style>
    </div>
  );
};

export default AccordionItem;