// ------------------------------
// File: media-library/parts/FiltersPanel.jsx
// Light + Blue, épuré, animations pro (CSS-only) + Save Modal minimal
// + z-index historique > filtres + placeholder "typewriter"
// ------------------------------
import { useEffect, useState, useCallback, useMemo, useRef, useLayoutEffect } from "react";
import {
  FaFilter, FaSearch, FaThLarge, FaTable, FaDownload, FaTimes, FaSave, FaBookmark,
  FaHistory, FaStar, FaEye, FaChevronDown, FaRocket, FaTag, FaCalendar, FaThumbsUp,
  FaUser, FaTrash, FaCheck, FaThumbtack, FaEraser,
} from "react-icons/fa";
import { cls } from "../shared/utils/format";

/* -------------------------------------------
   Placeholder animé (typewriter)
------------------------------------------- */
const SEARCH_HINTS = [
  'Ex : ia startup after:2024-01-01',
  'Ex : author:"Auteur #12" tag:mobile',
  'Ex : category:"Intelligence Artificielle" rating>4',
  'Astuce : tape "/" pour focaliser',
];

function useTypewriter(list, enabled) {
  const [text, setText] = useState("");
  const [i, setI] = useState(0);
  const [pos, setPos] = useState(0);
  const [dir, setDir] = useState(1); // 1 = écrit, -1 = efface

  useEffect(() => {
    if (!enabled) { setText(""); return; }
    const full = list[i] || "";
    const atEnd = pos === full.length;
    const atStart = pos === 0 && dir === -1;
    const delay = atEnd ? 900 : atStart ? 400 : (dir === 1 ? 40 : 25);

    const t = setTimeout(() => {
      if (dir === 1) {
        const next = Math.min(full.length, pos + 1);
        setPos(next);
        setText(full.slice(0, next));
        if (next === full.length) setDir(-1);
      } else {
        const next = Math.max(0, pos - 1);
        setPos(next);
        setText(full.slice(0, next));
        if (next === 0) { setDir(1); setI((i + 1) % list.length); }
      }
    }, delay);

    return () => clearTimeout(t);
  }, [list, enabled, i, pos, dir]);

  return text;
}

// ---------- Hooks utilitaires ----------
const useSavedFilters = () => {
  const [saved, setSaved] = useState(() => {
    try {
      const v = localStorage.getItem("article-filters");
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  });

  const saveFilter = useCallback(
    (name, filters) => {
      const entry = { id: Date.now(), name, filters, createdAt: new Date().toISOString() };
      const withoutSameName = saved.filter((f) => f.name !== name);
      const next = [entry, ...withoutSameName].slice(0, 10);
      setSaved(next);
      localStorage.setItem("article-filters", JSON.stringify(next));
    },
    [saved]
  );

  const deleteFilter = useCallback(
    (id) => {
      const next = saved.filter((f) => f.id !== id);
      setSaved(next);
      localStorage.setItem("article-filters", JSON.stringify(next));
    },
    [saved]
  );

  return { savedFilters: saved, saveFilter, deleteFilter };
};

const useSearchHistory = () => {
  const [history, setHistory] = useState(() => {
    try {
      const v = localStorage.getItem("article-search-history");
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  });

  const addToHistory = useCallback(
    (term) => {
      const t = String(term || "").trim();
      if (!t) return;
      const next = [{ id: Date.now(), term: t, timestamp: Date.now() }, ...history.filter((h) => h.term !== t)].slice(0, 8);
      setHistory(next);
      localStorage.setItem("article-search-history", JSON.stringify(next));
    },
    [history]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem("article-search-history");
  }, []);

  return { history, addToHistory, clearHistory };
};

// ---------- UI : Toast léger ----------
function useToast() {
  const [toast, setToast] = useState(null); // { msg, type }
  const show = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 1800);
  }, []);
  const node = toast ? (
    <div
      className={cls(
        "fixed bottom-4 right-4 z-[60] px-4 py-2 rounded-lg shadow-lg border text-sm",
        "backdrop-blur bg-white/95",
        toast.type === "success" ? "border-green-200 text-green-800" : "border-red-200 text-red-800",
        "animate-[toast-in_240ms_ease-out] motion-safe:[animation-fill-mode:both]"
      )}
      role="status"
      aria-live="polite"
    >
      {toast.msg}
    </div>
  ) : null;
  return { show, node };
}

// ---------- UI : Chip ----------
const Chip = ({ active, onClick, children, index = 0 }) => (
  <button
    onClick={onClick}
    className={cls(
      "px-3 py-1.5 text-xs rounded-lg font-medium border transition-all",
      "hover:shadow-sm active:scale-[0.98]",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200",
      active
        ? "bg-blue-600 text-white border-blue-600"
        : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
    )}
    style={{ transitionDelay: `${Math.min(index, 12) * 12}ms` }}
  >
    <span className="inline-flex items-center gap-1.5">
      {active && <FaCheck className="text-[10px]" />}
      {children}
    </span>
  </button>
);

// ---------- UI : Pill ----------
const Pill = ({ label, icon, count = 0, open, onToggle }) => (
  <button
    onClick={onToggle}
    aria-expanded={open}
    className={cls(
      "h-10 px-3 rounded-xl border inline-flex items-center gap-2 whitespace-nowrap",
      "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all",
      open ? "ring-2 ring-blue-100" : "",
      "active:scale-[0.98]"
    )}
  >
    <span className="text-sm text-slate-700">{icon}</span>
    <span className="text-sm font-medium">{label}</span>
    {count > 0 && (
      <span className="text-[11px] px-1.5 py-0.5 rounded-md font-bold bg-blue-600 text-white">
        {count}
      </span>
    )}
    <FaChevronDown className={cls("text-xs opacity-70 transition-transform", open ? "rotate-180" : "")} />
  </button>
);

// ---------- Hook : auto-height animé ----------
function useAutoHeight(isOpen, deps = []) {
  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  const [height, setHeight] = useState(0);

  const recalc = useCallback(() => {
    const h = innerRef.current ? innerRef.current.scrollHeight : 0;
    setHeight(h);
  }, []);

  useLayoutEffect(() => { recalc(); }, [isOpen, recalc, ...deps]);
  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => recalc();
    window.addEventListener("resize", onResize);
    const id = setInterval(recalc, 200);
    return () => { window.removeEventListener("resize", onResize); clearInterval(id); };
  }, [isOpen, recalc]);

  return { wrapRef, innerRef, height };
}

// ---------- Composant principal ----------
export default function FiltersPanel({
  open, setOpen, // compat
  search, setSearch,
  filters, setFilters,
  view, setView,
  perPage, setPerPage,
  loadMode, setLoadMode,
  authorsOptions,
  categoriesOptions,
  tagsOptions,
}) {
  const safeAuthors    = Array.isArray(authorsOptions) ? authorsOptions : [];
  const safeCategories = Array.isArray(categoriesOptions) ? categoriesOptions : [];
  const safeTags       = Array.isArray(tagsOptions) ? tagsOptions : [];

  const normalizeFilters = useCallback((f) => ({
    categories: f?.categories ?? [],
    tags:       f?.tags ?? [],
    authors:    f?.authors ?? [],
    featuredOnly: !!f?.featuredOnly,
    stickyOnly:   !!f?.stickyOnly,
    unreadOnly:   !!f?.unreadOnly,
    dateFrom:     f?.dateFrom ?? "",
    dateTo:       f?.dateTo ?? "",
    ratingMin:    Number.isFinite(f?.ratingMin) ? f.ratingMin : 0,
    ratingMax:    Number.isFinite(f?.ratingMax) ? f.ratingMax : 5,
  }), []);

  const [local, setLocal] = useState(() => normalizeFilters(filters));
  const [q, setQ] = useState(String(search || ""));
  const [expanded, setExpanded] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const dropdownRef = useRef(null);

  // Modal sauvegarde
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState("");

  // Pills shadows
  const pillsScrollerRef = useRef(null);
  const [showLShadow, setShowLShadow] = useState(false);
  const [showRShadow, setShowRShadow] = useState(false);
  const updatePillShadows = useCallback(() => {
    const el = pillsScrollerRef.current;
    if (!el) return;
    setShowLShadow(el.scrollLeft > 4);
    setShowRShadow(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);
  useEffect(() => { updatePillShadows(); }, [expanded, openMenu, updatePillShadows]);

  // Recherche / historique
  const [searchFocused, setSearchFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pinHistory, setPinHistory] = useState(false);
  const searchWrapRef = useRef(null);

  const { savedFilters, saveFilter, deleteFilter } = useSavedFilters();
  const { history, addToHistory, clearHistory } = useSearchHistory();
  const { show: showToast, node: toastNode } = useToast();

  // Placeholder animé (actif quand q est vide)
  const animatedHint = useTypewriter(SEARCH_HINTS, (!q || q.length === 0));

  // Sync
  useEffect(() => setLocal(normalizeFilters(filters)), [filters, normalizeFilters]);
  useEffect(() => setQ(String(search || "")), [search]);

  // Close panels on outside
  useEffect(() => {
    const onClick = (e) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Close history on outside (unless pinned)
  useEffect(() => {
    const onClick = (e) => {
      if (!searchWrapRef.current) return;
      if (!searchWrapRef.current.contains(e.target) && !pinHistory) {
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [pinHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (showSave) setShowSave(false);
        else if (openMenu) setOpenMenu(null);
        else if (expanded) setExpanded(false);
        setShowHistory(false);
        setPinHistory(false);
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const input = searchWrapRef.current?.querySelector("input");
        if (input) { e.preventDefault(); input.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded, openMenu, showSave]);

  // Counters & total actifs
  const counters = useMemo(() => ({
    categories: local.categories.length,
    tags:       local.tags.length,
    authors:    local.authors.length,
    options:    (local.featuredOnly ? 1 : 0) + (local.stickyOnly ? 1 : 0) + (local.unreadOnly ? 1 : 0),
    dates:      local.dateFrom || local.dateTo ? 1 : 0,
    rating:     (local.ratingMin > 0 || local.ratingMax < 5) ? 1 : 0,
  }), [local]);
  const activeTotal = useMemo(
    () => Object.values(counters).reduce((s, n) => s + (Number(n) || 0), 0),
    [counters]
  );

  // Actions
  const applyFilters = useCallback(() => {
    setFilters(normalizeFilters(local));
    setOpenMenu(null);
    showToast("Filtres appliqués ✅", "success");
  }, [local, setFilters, normalizeFilters, showToast]);

  const resetAll = useCallback(() => {
    const empty = normalizeFilters({});
    setLocal(empty);
    setFilters(empty);
    setOpenMenu(null);
    showToast("Filtres réinitialisés", "success");
  }, [setFilters, normalizeFilters, showToast]);

  const handleSearch = useCallback(() => {
    setSearch(q);
    addToHistory(q);
    setShowHistory(false);
    setPinHistory(false);
  }, [q, setSearch, addToHistory]);

  const suggestedName = useCallback(() => {
    const p = [];
    if (local.categories.length) p.push(`${local.categories.length} cat`);
    if (local.tags.length)       p.push(`${local.tags.length} tags`);
    if (local.authors.length)    p.push(`${local.authors.length} auteurs`);
    if (local.featuredOnly)      p.push("vedettes");
    if (local.stickyOnly)        p.push("épinglés");
    if (local.unreadOnly)        p.push("non lus");
    if (local.dateFrom || local.dateTo) p.push("période");
    if (local.ratingMin > 0 || local.ratingMax < 5) p.push("note");
    const base = p.length ? p.join(" • ") : "Filtre";
    return base.length > 32 ? base.slice(0, 32) + "…" : base;
  }, [local]);

  const saveCurrentFilter = useCallback((name) => {
    const n = String(name || "").trim();
    if (!n) return;
    saveFilter(n, normalizeFilters(local));
    showToast("Filtre sauvegardé ⭐", "success");
  }, [local, saveFilter, normalizeFilters, showToast]);

  // Clear per section
  const clearCategories = () => setLocal((s) => ({ ...s, categories: [] }));
  const clearTags       = () => setLocal((s) => ({ ...s, tags: [] }));
  const clearAuthors    = () => setLocal((s) => ({ ...s, authors: [] }));
  const clearOptions    = () => setLocal((s) => ({ ...s, featuredOnly: false, stickyOnly: false, unreadOnly: false }));
  const clearDates      = () => setLocal((s) => ({ ...s, dateFrom: "", dateTo: "" }));
  const clearRating     = () => setLocal((s) => ({ ...s, ratingMin: 0, ratingMax: 5 }));

  // Auto-height
  const { wrapRef, innerRef, height } = useAutoHeight(expanded, [openMenu, local, savedFilters]);

  // ----- RENDER -----
  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
      {/* Bandeau principal */}
      <div className="px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* ------- GAUCHE : Recherche ------- */}
          <div
            ref={searchWrapRef}
            className={cls(
              "relative flex-1 min-w-[320px] max-w-[560px] transition-all duration-200 z-[70]",
              searchFocused
                ? "scale-[1.01] drop-shadow-[0_8px_24px_rgba(59,130,246,.10)]"
                : "scale-[1] drop-shadow-none"
            )}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              onFocus={() => { setSearchFocused(true); setShowHistory(true); }}
              onBlur={() => { setSearchFocused(false); if (!pinHistory) setShowHistory(false); }}
              placeholder=""
              className={cls(
                "w-full pl-10 pr-20 h-10 rounded-xl border bg-white text-slate-900 placeholder:text-slate-400",
                "border-slate-200 transition-[box-shadow,border-color,transform] duration-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300",
                searchFocused ? "shadow-[inset_0_0_0_1px_rgba(59,130,246,.2)]" : "shadow-none"
              )}
              aria-label="Recherche d'articles"
            />

            {/* Placeholder animé (affiché tant que q est vide) */}
            {(!q || q.length === 0) && (
              <div className="pointer-events-none absolute left-10 right-20 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
                <span className="inline-flex items-center gap-2">
                  <span className="whitespace-nowrap">
                    {animatedHint || "Tapez pour rechercher…"}
                    <span className="ml-0.5 inline-block w-[1px] h-[1.2em] align-middle bg-slate-400 animate-caret-blink" />
                  </span>
                  <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                    Astuce : « / » pour focus
                  </span>
                </span>
              </div>
            )}

            <FaSearch
              className={cls(
                "absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200",
                searchFocused ? "text-blue-500 translate-x-[1px] scale-110" : "text-slate-400 translate-x-0 scale-100"
              )}
            />

            {/* Actions à droite de l'input */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setPinHistory((p) => !p); setShowHistory((v) => !v); }}
                title={pinHistory ? "Masquer l'historique" : "Afficher l'historique"}
                className={cls(
                  "h-8 w-8 rounded-lg border inline-flex items-center justify-center transition-all duration-200",
                  "active:scale-95",
                  pinHistory
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
                aria-pressed={pinHistory}
              >
                <FaHistory />
              </button>

              {q && (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setQ("")}
                  className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 inline-flex items-center justify-center transition-all duration-200 active:scale-95"
                  title="Effacer"
                >
                  <FaTimes />
                </button>
              )}

              {q !== String(search || "") && (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleSearch}
                  className="h-8 px-3 rounded-lg bg-blue-600 text-white font-medium inline-flex items-center gap-2 transition-all duration-200 hover:bg-blue-700 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98]"
                  title="Rechercher"
                >
                  <FaRocket />
                </button>
              )}
            </div>

            {/* Dropdown historique — z-index plus élevé que le panneau de filtres */}
            <div
              className={cls(
                "absolute left-0 right-0 top-[44px] transition-all duration-200 z-[80]",
                showHistory && history.length > 0
                  ? "opacity-100 translate-y-0 pointer-events-auto motion-safe:animate-[dropdown-in_.14s_ease-out]"
                  : "opacity-0 -translate-y-1 pointer-events-none motion-safe:animate-[dropdown-out_.12s_ease-in]"
              )}
            >
              <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                <div className="px-3 py-2 text-xs text-slate-600 border-b border-slate-100 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2">
                    <FaHistory /> Recherches récentes
                  </span>
                  <button onClick={clearHistory} className="text-red-500 hover:text-red-700 transition-colors">
                    <FaTrash />
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {history.map((h, idx) => (
                    <button
                      key={h.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setQ(h.term); setTimeout(handleSearch, 0); }}
                      className={cls(
                        "w-full text-left px-3 py-2 text-sm text-slate-700 flex items-center gap-2 transition-all duration-150",
                        "hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-100 active:scale-[0.98]"
                      )}
                      style={{ transitionDelay: `${Math.min(idx, 6) * 15}ms` }}
                    >
                      <FaSearch className="text-slate-400 text-xs" />
                      <span className="flex-1 truncate">{h.term}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(h.timestamp).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ------- DROITE : Vue / Par page / Filtres / Export ------- */}
          <div className="flex items-center gap-3">
            <div className="flex bg-white rounded-xl border border-slate-200 p-1">
              {[
                { key: "grid", icon: FaThLarge, label: "Grille" },
                { key: "list", icon: FaTable, label: "Liste" },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={cls(
                    "h-8 px-3 rounded-lg text-sm inline-flex items-center gap-2 transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200",
                    view === key ? "bg-blue-900 text-white" : "text-slate-700 hover:bg-slate-100"
                  )}
                  title={label}
                >
                  <Icon />
                </button>
              ))}
            </div>

            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
              title="Éléments par page"
            >
              {[12, 24, 48, 96].map((n) => <option key={n} value={n}>{n}/page</option>)}
            </select>

            <button
              onClick={() => setExpanded((v) => !v)}
              className={cls(
                "h-10 px-4 rounded-xl font-medium inline-flex items-center gap-2 border transition-colors",
                expanded ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300"
              )}
              title="Afficher/Masquer les filtres"
              aria-expanded={expanded}
            >
              <FaFilter />
              Filtres
              {activeTotal > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-md font-bold bg-white text-blue-700">
                  {activeTotal}
                </span>
              )}
            </button>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent("articlelib:export"))}
              className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center transition-transform active:scale-[0.97]"
              title="Exporter CSV"
            >
              <FaDownload />
            </button>
          </div>
        </div>
      </div>

      {/* Panneau filtres — auto-height animé */}
      <div ref={wrapRef} style={{ height: expanded ? height : 0 }} className={cls("transition-[height] duration-300 ease-out overflow-hidden border-t border-blue-100")}>
        <div ref={innerRef}>
          {expanded && (
            <div ref={dropdownRef} className="bg-gradient-to-b from-blue-50 to-white">
              {/* Pills + actions */}
              <div className="relative">
                {showLShadow && <div className="pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-white via-white/70 to-transparent" />}
                {showRShadow && <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white via-white/70 to-transparent" />}

                <div ref={pillsScrollerRef} onScroll={updatePillShadows} className="px-6 pt-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: "none" }}>
                  <Pill label="Catégories" icon={<FaTag />} count={counters.categories} open={openMenu === "categories"} onToggle={() => setOpenMenu(openMenu === "categories" ? null : "categories")} />
                  <Pill label="Tags"        icon={<FaTag />} count={counters.tags}       open={openMenu === "tags"}       onToggle={() => setOpenMenu(openMenu === "tags" ? null : "tags")} />
                  <Pill label="Auteurs"     icon={<FaUser />} count={counters.authors}    open={openMenu === "authors"}    onToggle={() => setOpenMenu(openMenu === "authors" ? null : "authors")} />
                  <Pill label="Options"     icon={<FaFilter />} count={counters.options}  open={openMenu === "options"}    onToggle={() => setOpenMenu(openMenu === "options" ? null : "options")} />
                  <Pill label="Période"     icon={<FaCalendar />} count={counters.dates}  open={openMenu === "dates"}      onToggle={() => setOpenMenu(openMenu === "dates" ? null : "dates")} />
                  <Pill label="Note"        icon={<FaThumbsUp />} count={counters.rating} open={openMenu === "rating"}     onToggle={() => setOpenMenu(openMenu === "rating" ? null : "rating")} />
                  <Pill label="Sauvegardes" icon={<FaBookmark />} count={savedFilters.length} open={openMenu === "saved"} onToggle={() => setOpenMenu(openMenu === "saved" ? null : "saved")} />

                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={resetAll}
                      className={cls(
                        "h-10 px-3 rounded-xl border inline-flex items-center gap-2 transition-colors",
                        activeTotal > 0 ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-100" : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      )}
                      disabled={activeTotal === 0}
                    >
                      <FaEraser /> Tout réinitialiser
                    </button>
                    <button
                      onClick={applyFilters}
                      className="h-10 px-4 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 inline-flex items-center gap-2 transition-colors"
                    >
                      <FaRocket /> Appliquer
                    </button>
                  </div>
                </div>
              </div>

              {/* Sous-panneaux */}
              <div className="px-6 pb-6 space-y-3">
                {/* Catégories */}
                <PanelSection visible={openMenu === "categories"} title="Catégories" onClear={counters.categories > 0 ? clearCategories : undefined}>
                  <div className="flex flex-wrap gap-2">
                    {safeCategories.length ? safeCategories.map((c, i) => {
                      const label = typeof c === 'string' ? c : c.name;
                      const value = typeof c === 'string' ? c : c.id;   // on stocke l'ID si dispo
                      const count = typeof c === 'string' ? null : c.count;
                      const active = local.categories.includes(value);
                      return (
                        <Chip key={`${value}`} index={i} active={active}
                          onClick={() => setLocal((s) => ({
                            ...s,
                            categories: active ? s.categories.filter((x) => x !== value) : [...s.categories, value]
                          }))}>
                          {label}{typeof count === 'number' ? ` (${count})` : ''}
                        </Chip>
                      );
                    }) : <div className="text-sm text-slate-500">Aucune catégorie</div>}
                  </div>
                </PanelSection>

                {/* Tags */}
                <PanelSection visible={openMenu === "tags"} title="Tags" onClear={counters.tags > 0 ? clearTags : undefined}>
                  <div className="flex flex-wrap gap-2">
                    {safeTags.length ? safeTags.map((t, i) => {
                      const label = typeof t === 'string' ? t : t.name;
                      const value = typeof t === 'string' ? t : t.id;
                      const count = typeof t === 'string' ? null : t.count;
                      const active = local.tags.includes(value);
                      return (
                        <Chip key={`${value}`} index={i} active={active}
                          onClick={() => setLocal((s) => ({
                            ...s,
                            tags: active ? s.tags.filter((x) => x !== value) : [...s.tags, value]
                          }))}>
                          {label}{typeof count === 'number' ? ` (${count})` : ''}
                        </Chip>
                      );
                    }) : <div className="text-sm text-slate-500">Aucun tag</div>}
                  </div>
                </PanelSection>

                {/* Auteurs */}
                <PanelSection visible={openMenu === "authors"} title="Auteurs" onClear={counters.authors > 0 ? clearAuthors : undefined}>
                  <div className="flex flex-wrap gap-2">
                    {safeAuthors.length ? safeAuthors.map((a, i) => {
                      const label = typeof a === 'string' ? a : (a.name || `Auteur #${a.id}`);
                      const value = typeof a === 'string' ? a : a.id;
                      const count = typeof a === 'string' ? null : a.count;
                      const active = local.authors.includes(value);
                      return (
                        <Chip key={`${value}`} index={i} active={active}
                          onClick={() => setLocal((s) => ({
                            ...s,
                            authors: active ? s.authors.filter((x) => x !== value) : [...s.authors, value]
                          }))}>
                          {label}{typeof count === 'number' ? ` (${count})` : ''}
                        </Chip>
                      );
                    }) : <div className="text-sm text-slate-500">Aucun auteur</div>}
                  </div>
                </PanelSection>

                {/* Options */}
                <PanelSection visible={openMenu === "options"} title="Options rapides" onClear={counters.options > 0 ? clearOptions : undefined}>
                  <div className="flex flex-wrap gap-3">
                    <ToggleBtn active={local.featuredOnly} onClick={() => setLocal((s) => ({ ...s, featuredOnly: !s.featuredOnly }))} icon={<FaStar />} label="Vedettes" />
                    <ToggleBtn active={local.stickyOnly}   onClick={() => setLocal((s) => ({ ...s, stickyOnly: !s.stickyOnly }))}   icon={<FaThumbtack />} label="Épinglés" />
                    <ToggleBtn active={local.unreadOnly}   onClick={() => setLocal((s) => ({ ...s, unreadOnly: !s.unreadOnly }))}   icon={<FaEye />} label="Non lus (local)" />
                  </div>
                </PanelSection>

                {/* Période */}
                <PanelSection visible={openMenu === "dates"} title="Période" onClear={counters.dates > 0 ? clearDates : undefined}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InputWithIcon icon={<FaCalendar />} type="date" value={local.dateFrom} onChange={(v) => setLocal((s) => ({ ...s, dateFrom: v }))} />
                    <InputWithIcon icon={<FaCalendar />} type="date" value={local.dateTo}   onChange={(v) => setLocal((s) => ({ ...s, dateTo: v }))} />
                  </div>
                </PanelSection>

                {/* Note */}
                <PanelSection visible={openMenu === "rating"} title="Note moyenne" onClear={counters.rating > 0 ? clearRating : undefined}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InputWithIcon icon={<FaThumbsUp />} type="number" min="0" max="5" step="0.1" placeholder="Min" value={local.ratingMin}
                      onChange={(v) => setLocal((s) => ({ ...s, ratingMin: Math.min(5, Math.max(0, parseFloat(v) || 0)) }))} />
                    <InputWithIcon icon={<FaThumbsUp />} type="number" min="0" max="5" step="0.1" placeholder="Max" value={local.ratingMax}
                      onChange={(v) => setLocal((s) => ({ ...s, ratingMax: Math.min(5, Math.max(0, parseFloat(v) || 5)) }))} />
                  </div>
                </PanelSection>

                {/* Sauvegardes */}
                <PanelSection
                  visible={openMenu === "saved"}
                  title="Filtres sauvegardés"
                  action={
                    <button
                      onClick={() => { setSaveName(suggestedName()); setShowSave(true); }}
                      className="h-9 px-3 rounded-lg bg-blue-600 text-white inline-flex items-center gap-2 hover:bg-blue-700 transition-colors"
                    >
                      <FaSave /> Sauvegarder l'état actuel
                    </button>
                  }
                >
                  {savedFilters.length === 0 ? (
                    <div className="text-sm text-slate-500">Aucun filtre sauvegardé.</div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {savedFilters.map((sf) => (
                        <div key={sf.id} className="py-2 flex items-center justify-between">
                          <button
                            onClick={() => {
                              setLocal(normalizeFilters(sf.filters));
                              setFilters(normalizeFilters(sf.filters));
                              setOpenMenu(null);
                              showToast(`“${sf.name}” chargé ✅`, "success");
                            }}
                            className="text-sm text-slate-800 hover:text-slate-900 truncate transition-colors"
                            title={sf.name}
                          >
                            {sf.name}
                          </button>
                          <button
                            onClick={() => { deleteFilter(sf.id); showToast("Filtre supprimé", "success"); }}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Supprimer"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </PanelSection>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Modal (ultra-épuré) */}
      {showSave && (
        <SaveModal
          initialValue={saveName}
          onClose={() => setShowSave(false)}
          onSave={(name) => { saveCurrentFilter(name); setShowSave(false); }}
        />
      )}

      {toastNode}
    </div>
  );
}

/* ---------------- Sub-UI elements ---------------- */

function PanelSection({ visible, title, children, onClear, action }) {
  return (
    <div className={cls("transition-all origin-top", visible ? "opacity-100 translate-y-0 scale-[1]" : "opacity-0 -translate-y-1 scale-[0.995] hidden")}>
      <section className="rounded-2xl border border-blue-200 bg-white shadow-sm p-4">
        <header className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-slate-800">{title}</h4>
          <div className="flex items-center gap-2">
            {action}
            {onClear && (
              <button onClick={onClear} className="text-sm inline-flex items-center gap-2 text-slate-700 hover:text-slate-900">
                <FaEraser /> Réinitialiser
              </button>
            )}
          </div>
        </header>
        {children}
      </section>
    </div>
  );
}

function ToggleBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={cls(
        "h-10 px-3 rounded-lg border inline-flex items-center gap-2 transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200",
        active ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
      )}
    >
      {icon} {label}
    </button>
  );
}

function InputWithIcon({ icon, onChange, ...rest }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{icon}</span>
      <input
        {...rest}
        onChange={(e) => onChange?.(e.target.value)}
        className={cls(
          "w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all placeholder:text-slate-400"
        )}
      />
    </div>
  );
}

/* -------- Modal épuré -------- */
function SaveModal({ initialValue = "", onSave, onClose }) {
  const boxRef = useRef(null);
  const [name, setName] = useState(initialValue || "");

  // Close on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [onClose]);

  // Esc / Enter
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Enter" && name.trim()) onSave?.(name.trim());
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [name, onSave, onClose]);

  // Auto focus
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Sauvegarder le filtre">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-fade-in" />
      <div ref={boxRef} className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl p-4 animate-scale-in">
        <button onClick={onClose} className="absolute right-2 top-2 h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 inline-flex items-center justify-center" aria-label="Fermer">
          <FaTimes />
        </button>

        <div className="space-y-3 pt-2">
          <h3 className="text-base font-semibold text-slate-900">Sauvegarder le filtre</h3>
          <p className="text-sm text-slate-500">Donnez un nom court et clair.</p>

          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Vedettes • 2 cat • période"
            className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={onClose} className="h-9 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">Annuler</button>
            <button
              onClick={() => name.trim() && onSave?.(name.trim())}
              disabled={!name.trim()}
              className={cls("h-9 px-4 rounded-lg font-medium transition-colors",
                name.trim() ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-200 text-slate-500 cursor-not-allowed")}
            >
              <FaSave className="inline -mt-[2px] mr-2" />
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------- Petites animations utilitaires -------- */
const _style = `
@keyframes toast-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes fade-in{from{opacity:0}to{opacity:1}}
@keyframes scale-in{from{opacity:.6;transform:scale(.98)}to{opacity:1;transform:scale(1)}}
/* Ajouts pour l’historique + placeholder animé */
@keyframes dropdown-in{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes dropdown-out{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(-4px) scale(.98)}}
@keyframes caret-blink{0%,49%{opacity:1}50%,100%{opacity:0}}
`;
if (typeof document !== "undefined" && !document.getElementById("filterspanel-keyframes")) {
  const tag = document.createElement("style");
  tag.id = "filterspanel-keyframes";
  tag.innerHTML = `
    .animate-[toast-in_240ms_ease-out]{animation:toast-in .24s ease-out both}
    .animate-fade-in{animation:fade-in .16s ease-out both}
    .animate-scale-in{animation:scale-in .18s ease-out both}
    /* mappings utilitaires */
    .animate-[dropdown-in_.14s_ease-out]{animation:dropdown-in .14s ease-out both}
    .animate-[dropdown-out_.12s_ease-in]{animation:dropdown-out .12s ease-in both}
    .animate-caret-blink{animation:caret-blink 1s steps(2,start) infinite}
    ${_style}
  `;
  document.head.appendChild(tag);
}
