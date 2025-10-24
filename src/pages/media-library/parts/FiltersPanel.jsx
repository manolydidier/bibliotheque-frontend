// src/media-library/parts/FiltersPanel.jsx
// Improved + robust + i18n (NO <style jsx>, NO jsx prop)
// - Normalise options (categories/tags/authors)
// - Valeurs par défaut sûres
// - Aucun badge/compteur numérique en UI
// - i18n complet
import { useEffect, useState, useCallback, useMemo, useRef, useLayoutEffect } from "react";
import { useTranslation } from 'react-i18next';
import {
  FaFilter, FaSearch, FaThLarge, FaTable, FaDownload, FaTimes, FaSave, FaBookmark,
  FaHistory, FaStar, FaEye, FaChevronDown, FaRocket, FaTag, FaCalendar, FaThumbsUp,
  FaUser, FaTrash, FaCheck, FaThumbtack, FaEraser,
} from "react-icons/fa";
import { cls } from "../shared/utils/format";
import "./FiltersPanel.css"; // 👈 styles externes (remplace <style jsx>)

// -------------------------------------------
// Constants
// -------------------------------------------
const ANIMATION_DELAYS = {
  TYPEWRITER_END: 900,
  TYPEWRITER_START: 400,
  TYPEWRITER_WRITE: 40,
  TYPEWRITER_ERASE: 25,
  TOAST_DURATION: 1800,
  CHIP_STAGGER: 12,
  HISTORY_STAGGER: 15,
};

const STORAGE_KEYS = {
  FILTERS: "article-filters",
  SEARCH_HISTORY: "article-search-history",
};

const DEFAULT_FILTERS = {
  categories: [],
  tags: [],
  authors: [],
  featuredOnly: false,
  stickyOnly: false,
  unreadOnly: false,
  dateFrom: "",
  dateTo: "",
  ratingMin: 0,
  ratingMax: 5,
};

// -------------------------------------------
// Hooks utilitaires
// -------------------------------------------
function useTypewriter(textList, enabled) {
  const [state, setState] = useState({ text: "", currentIndex: 0, position: 0, direction: 1 });

  useEffect(() => {
    if (!enabled || !textList.length) {
      setState(prev => ({ ...prev, text: "" }));
      return;
    }
    const currentText = textList[state.currentIndex] || "";
    const { position, direction } = state;

    const isAtEnd = position === currentText.length && direction === 1;
    const isAtStart = position === 0 && direction === -1;

    const getDelay = () => {
      if (isAtEnd) return ANIMATION_DELAYS.TYPEWRITER_END;
      if (isAtStart) return ANIMATION_DELAYS.TYPEWRITER_START;
      return direction === 1 ? ANIMATION_DELAYS.TYPEWRITER_WRITE : ANIMATION_DELAYS.TYPEWRITER_ERASE;
    };

    const timer = setTimeout(() => {
      setState(prev => {
        if (prev.direction === 1) {
          const nextPos = Math.min(currentText.length, prev.position + 1);
          return {
            ...prev, position: nextPos, text: currentText.slice(0, nextPos),
            direction: nextPos === currentText.length ? -1 : 1,
          };
        } else {
          const nextPos = Math.max(0, prev.position - 1);
          return {
            ...prev, position: nextPos, text: currentText.slice(0, nextPos),
            direction: nextPos === 0 ? 1 : -1,
            currentIndex: nextPos === 0 ? (prev.currentIndex + 1) % textList.length : prev.currentIndex,
          };
        }
      });
    }, getDelay());

    return () => clearTimeout(timer);
  }, [textList, enabled, state.currentIndex, state.position, state.direction]);

  return state.text;
}

function useLocalStorage(key, defaultValue, validator = null) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return defaultValue;
      const parsed = JSON.parse(stored);
      return validator ? validator(parsed) : parsed;
    } catch {
      return defaultValue;
    }
  });

  const updateValue = useCallback((newValue) => {
    try {
      setValue(newValue);
      localStorage.setItem(key, JSON.stringify(newValue));
    } catch {}
  }, [key]);

  const removeValue = useCallback(() => {
    try {
      setValue(defaultValue);
      localStorage.removeItem(key);
    } catch {}
  }, [key, defaultValue]);

  return [value, updateValue, removeValue];
}

const useSavedFilters = () => {
  const validateFilters = useCallback((data) => {
    if (!Array.isArray(data)) return [];
    return data.filter(item =>
      item && typeof item === 'object' && typeof item.name === 'string' && item.filters && typeof item.id !== 'undefined'
    ).slice(0, 10);
  }, []);

  const [savedFilters, setSavedFilters] = useLocalStorage(STORAGE_KEYS.FILTERS, [], validateFilters);

  const saveFilter = useCallback((name, filters) => {
    if (!name?.trim()) return false;
    const entry = { id: Date.now(), name: name.trim(), filters, createdAt: new Date().toISOString() };
    const updated = [entry, ...savedFilters.filter(f => f.name !== name.trim())].slice(0, 10);
    setSavedFilters(updated);
    return true;
  }, [savedFilters, setSavedFilters]);

  const deleteFilter = useCallback((id) => {
    setSavedFilters(prev => prev.filter(f => f.id !== id));
  }, [setSavedFilters]);

  return { savedFilters, saveFilter, deleteFilter };
};

const useSearchHistory = () => {
  const validateHistory = useCallback((data) => {
    if (!Array.isArray(data)) return [];
    return data.filter(item =>
      item && typeof item === 'object' && typeof item.term === 'string' && item.term.trim() && typeof item.timestamp === 'number'
    ).slice(0, 8);
  }, []);

  const [history, setHistory, clearHistory] = useLocalStorage(STORAGE_KEYS.SEARCH_HISTORY, [], validateHistory);

  const addToHistory = useCallback((term) => {
    const clean = String(term || "").trim();
    if (!clean) return;
    const entry = { id: Date.now(), term: clean, timestamp: Date.now() };
    const updated = [entry, ...history.filter(h => h.term !== clean)].slice(0, 8);
    setHistory(updated);
  }, [history, setHistory]);

  return { history, addToHistory, clearHistory };
};

function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ANIMATION_DELAYS.TOAST_DURATION);
  }, []);
  const toastElements = toasts.map((t, i) => (
    <div
      key={t.id}
      className={cls(
        "fixed right-4 z-[60] px-4 py-2 rounded-lg shadow-lg border text-sm",
        "backdrop-blur bg-white/95 transition-all duration-300",
        t.type === "success" ? "border-green-200 text-green-800" : "border-red-200 text-red-800",
        "animate-[toast-in_240ms_ease-out]"
      )}
      style={{ bottom: `${16 + i * 60}px` }}
      role="status"
      aria-live="polite"
    >
      {t.message}
    </div>
  ));
  return { show, toastElements };
}

function useAutoHeight(isOpen, dependencies = []) {
  const wrapperRef = useRef(null);
  const contentRef = useRef(null);
  const [height, setHeight] = useState(0);
  const resizeObserverRef = useRef(null);

  const updateHeight = useCallback(() => {
    if (!isOpen || !contentRef.current) {
      setHeight(0);
      return;
    }
    setHeight(contentRef.current.scrollHeight);
  }, [isOpen]);

  useLayoutEffect(updateHeight, [isOpen, updateHeight, ...dependencies]);

  useEffect(() => {
    if (!isOpen || !contentRef.current) return;
    if (window.ResizeObserver) {
      resizeObserverRef.current = new ResizeObserver(updateHeight);
      resizeObserverRef.current.observe(contentRef.current);
      return () => resizeObserverRef.current?.disconnect();
    } else {
      const onResize = () => updateHeight();
      window.addEventListener("resize", onResize);
      const it = setInterval(updateHeight, 200);
      return () => { window.removeEventListener("resize", onResize); clearInterval(it); };
    }
  }, [isOpen, updateHeight]);

  return { wrapperRef, contentRef, height };
}

// -------------------------------------------
// Normalizers
// -------------------------------------------
const extractArray = (src) => {
  if (Array.isArray(src)) return src;
  if (src && Array.isArray(src.data)) return src.data;
  if (src && Array.isArray(src.items)) return src.items;
  if (src && Array.isArray(src.records)) return src.records;
  return [];
};

const normalizeOptionsList = (input, kind) => {
  return extractArray(input)
    .map((o) => {
      if (typeof o === "string") return { id: o, name: o };
      if (!o || typeof o !== "object") return null;
      const id =
        o.id ?? o.value ?? o.slug ?? o.code ?? o.key ?? null;
      const displayName =
        o.name ??
        o.title ??
        o.label ??
        (kind === "authors"
          ? [o.first_name, o.last_name].filter(Boolean).join(" ").trim()
          : o.slug) ??
        (id != null ? `#${id}` : null);
      if (id == null || !displayName) return null;
      return { id, name: displayName };
    })
    .filter(Boolean);
};

// -------------------------------------------
// UI atoms
// -------------------------------------------
const Chip = ({ active, onClick, children, index = 0, disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cls(
      "px-3 py-1.5 text-xs rounded-lg font-medium border transition-all",
      "hover:shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200",
      active
        ? "bg-blue-600 text-white border-blue-600"
        : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
    )}
    style={{ transitionDelay: `${Math.min(index, 12) * ANIMATION_DELAYS.CHIP_STAGGER}ms` }}
    aria-pressed={active}
  >
    <span className="inline-flex items-center gap-1.5">
      {active && <FaCheck className="text-[10px]" aria-hidden="true" />}
      {children}
    </span>
  </button>
);

const Pill = ({ label, icon, open, onToggle, disabled = false }) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={disabled}
    aria-expanded={open}
    className={cls(
      "h-10 px-3 rounded-xl border inline-flex items-center gap-2 whitespace-nowrap",
      "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200",
      open ? "ring-2 ring-blue-100" : "",
      "active:scale-[0.98]"
    )}
  >
    <span className="text-sm text-slate-700" aria-hidden="true">{icon}</span>
    <span className="text-sm font-medium">{label}</span>
    <FaChevronDown
      className={cls("text-xs opacity-70 transition-transform", open ? "rotate-180" : "")}
      aria-hidden="true"
    />
  </button>
);

const ToggleButton = ({ active, onClick, icon, label, disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cls(
      "h-10 px-3 rounded-lg border inline-flex items-center gap-2 transition-colors",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200",
      active ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
    )}
    aria-pressed={active}
  >
    <span aria-hidden="true">{icon}</span>
    <span>{label}</span>
  </button>
);

const InputWithIcon = ({ icon, onChange, label, ...props }) => (
  <div className="relative">
    <label className="sr-only">{label}</label>
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" aria-hidden="true">
      {icon}
    </span>
    <input
      {...props}
      onChange={(e) => onChange?.(e.target.value)}
      className={cls(
        "w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200",
        "focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300",
        "transition-all placeholder:text-slate-400"
      )}
      aria-label={label}
    />
  </div>
);

// -------------------------------------------
// Main component
// -------------------------------------------
export default function FiltersPanel({
  search, setSearch,
  filters: rawFilters = DEFAULT_FILTERS,
  setFilters,
  view, setView,
  perPage, setPerPage,
  loadMode, setLoadMode,
  authorsOptions = [],
  categoriesOptions = [],
  tagsOptions = [],
}) {
  const { t } = useTranslation();

  const SEARCH_HINTS = useMemo(() => [
    t('filters.searchHints.example1'),
    t('filters.searchHints.example2'),
    t('filters.searchHints.example3'),
    t('filters.searchHints.tip'),
  ], [t]);

  const safeAuthors    = useMemo(() => normalizeOptionsList(authorsOptions, "authors"), [authorsOptions]);
  const safeCategories = useMemo(() => normalizeOptionsList(categoriesOptions, "categories"), [categoriesOptions]);
  const safeTags       = useMemo(() => normalizeOptionsList(tagsOptions, "tags"), [tagsOptions]);

  const normalizeFilters = useMemo(() => {
    const normalizeArray = (v) => Array.isArray(v) ? v : [];
    const normalizeBool  = (v) => !!v;
    const normalizeStr   = (v) => (typeof v === "string" ? v : "");
    const normalizeNum   = (v, min, max) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
    };
    return (f = {}) => ({
      categories: normalizeArray(f.categories),
      tags:       normalizeArray(f.tags),
      authors:    normalizeArray(f.authors),
      featuredOnly: normalizeBool(f.featuredOnly),
      stickyOnly:   normalizeBool(f.stickyOnly),
      unreadOnly:   normalizeBool(f.unreadOnly),
      dateFrom:   normalizeStr(f.dateFrom),
      dateTo:     normalizeStr(f.dateTo),
      ratingMin:  normalizeNum(f.ratingMin, 0, 5),
      ratingMax:  normalizeNum(f.ratingMax, 0, 5),
    });
  }, []);

  const [localFilters, setLocalFilters] = useState(() => normalizeFilters(rawFilters));
  const [searchQuery, setSearchQuery]   = useState(String(search || ""));
  const [isExpanded, setIsExpanded]     = useState(false);
  const [activeMenu, setActiveMenu]     = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalName, setSaveModalName] = useState("");

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [isHistoryPinned, setIsHistoryPinned] = useState(false);

  const dropdownRef = useRef(null);
  const searchWrapperRef = useRef(null);
  const pillsScrollerRef = useRef(null);

  const { savedFilters, saveFilter, deleteFilter } = useSavedFilters();
  const { history: searchHistory, addToHistory, clearHistory } = useSearchHistory();
  const { show: showToast, toastElements } = useToast();
  const { wrapperRef, contentRef, height } = useAutoHeight(isExpanded, [activeMenu, localFilters, savedFilters]);

  useEffect(() => setLocalFilters(normalizeFilters(rawFilters)), [rawFilters, normalizeFilters]);
  useEffect(() => setSearchQuery(String(search || "")), [search]);

  const handleOutsideClick = useCallback((e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setActiveMenu(null);
    if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target) && !isHistoryPinned) {
      setShowSearchHistory(false);
    }
  }, [isHistoryPinned]);
  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [handleOutsideClick]);

  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key === "Escape") {
        if (showSaveModal) setShowSaveModal(false);
        else if (activeMenu) setActiveMenu(null);
        else if (isExpanded) setIsExpanded(false);
        setShowSearchHistory(false);
        setIsHistoryPinned(false);
      }
      if (ev.key === "/" && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
        const ae = document.activeElement;
        const typing = ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.contentEditable === "true");
        if (!typing) {
          ev.preventDefault();
          searchWrapperRef.current?.querySelector("input")?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showSaveModal, activeMenu, isExpanded]);

  const handleApplyFilters = useCallback(() => {
    setFilters(normalizeFilters(localFilters));
    setActiveMenu(null);
    showToast(t('filters.toasts.filtersApplied'), "success");
  }, [localFilters, setFilters, normalizeFilters, showToast, t]);

  const handleResetFilters = useCallback(() => {
    const empty = normalizeFilters(DEFAULT_FILTERS);
    setLocalFilters(empty);
    setFilters(empty);
    setActiveMenu(null);
    showToast(t('filters.toasts.filtersReset'), "success");
  }, [setFilters, normalizeFilters, showToast, t]);

  const handleSearch = useCallback(() => {
    setSearch(searchQuery);
    addToHistory(searchQuery);
    setShowSearchHistory(false);
    setIsHistoryPinned(false);
  }, [searchQuery, setSearch, addToHistory]);

  const generateSuggestedName = useCallback(() => {
    const parts = [];
    if (localFilters.featuredOnly) parts.push(t('filters.suggestedNames.featured'));
    if (localFilters.stickyOnly) parts.push(t('filters.suggestedNames.pinned'));
    if (localFilters.unreadOnly) parts.push(t('filters.suggestedNames.unread'));
    if (localFilters.dateFrom || localFilters.dateTo) parts.push(t('filters.suggestedNames.period'));
    if (localFilters.ratingMin > 0 || localFilters.ratingMax < 5) parts.push(t('filters.suggestedNames.rating'));
    const base = parts.length ? parts.join(' • ') : t('filters.suggestedNames.custom');
    return base.length > 32 ? base.slice(0, 32) + "…" : base;
  }, [localFilters, t]);

  const handleSaveFilter = useCallback((name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return false;
    const ok = saveFilter(trimmed, normalizeFilters(localFilters));
    showToast(
      ok ? t('filters.toasts.filterSaved', { name: trimmed }) : t('filters.toasts.saveError'),
      ok ? "success" : "error"
    );
    return ok;
  }, [localFilters, saveFilter, normalizeFilters, showToast, t]);

  const renderOptionChips = (options, type) => {
    if (!options.length) {
      return <div className="text-sm text-slate-500">{t('filters.noOptions', { type: t(`filters.types.${type}`) })}</div>;
    }
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((opt, index) => {
          const label = typeof opt === "string" ? opt : (opt.name ?? `#${opt.id}`);
          const value = typeof opt === "string" ? opt : opt.id;
          const isActive = (localFilters[type] || []).some((v) => String(v) === String(value));
          return (
            <Chip
              key={String(value)}
              index={index}
              active={isActive}
              onClick={() => setLocalFilters(prev => ({
                ...prev,
                [type]: isActive
                  ? prev[type].filter((x) => String(x) !== String(value))
                  : [...prev[type], value]
              }))}
            >
              {label}
            </Chip>
          );
        })}
      </div>
    );
  };

  const animatedHint = useTypewriter(SEARCH_HINTS, !searchQuery.length);

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
      {/* Header */}
      <div className="px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          <div
            ref={searchWrapperRef}
            className={cls(
              "relative flex-1 min-w-[320px] max-w-[560px] transition-all duration-200 z-[70]",
              isSearchFocused ? "scale-[1.01] drop-shadow-[0_8px_24px_rgba(59,130,246,.10)]" : "scale-[1] drop-shadow-none"
            )}
          >
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              onFocus={() => { setIsSearchFocused(true); setShowSearchHistory(true); }}
              onBlur={() => { setIsSearchFocused(false); if (!isHistoryPinned) setShowSearchHistory(false); }}
              placeholder=""
              className={cls(
                "w-full pl-10 pr-20 h-10 rounded-xl border bg-white text-slate-900",
                "placeholder:text-slate-400 border-slate-200",
                "transition-[box-shadow,border-color,transform] duration-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300",
                isSearchFocused ? "shadow-[inset_0_0_0_1px_rgba(59,130,246,.2)]" : "shadow-none"
              )}
              aria-label={t('filters.search.ariaLabel')}
              autoComplete="off"
            />
            {!searchQuery.length && (
              <div className="pointer-events-none absolute left-10 right-20 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
                <span className="inline-flex items-center gap-2">
                  <span className="whitespace-nowrap">
                    {animatedHint || t('filters.search.placeholder')}
                    <span className="ml-0.5 inline-block w-[1px] h-[1.2em] align-middle bg-slate-400 animate-caret-blink" />
                  </span>
                  <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                    {t('filters.search.tip')}
                  </span>
                </span>
              </div>
            )}
            <FaSearch
              className={cls(
                "absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200",
                isSearchFocused ? "text-blue-500 translate-x-[1px] scale-110" : "text-slate-400 translate-x-0 scale-100"
              )}
              aria-hidden="true"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setIsHistoryPinned((p) => !p); setShowSearchHistory((p) => !p); }}
                title={isHistoryPinned ? t('filters.search.hideHistory') : t('filters.search.showHistory')}
                className={cls(
                  "h-8 w-8 rounded-lg border inline-flex items-center justify-center transition-all duration-200",
                  "active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200",
                  isHistoryPinned ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
                aria-pressed={isHistoryPinned}
              >
                <FaHistory />
              </button>

              {searchQuery && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSearchQuery("")}
                  className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 inline-flex items-center justify-center transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                  title={t('filters.search.clear')}
                >
                  <FaTimes />
                </button>
              )}

              {searchQuery !== String(search || "") && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleSearch}
                  className="h-8 px-3 rounded-lg bg-blue-600 text-white font-medium inline-flex items-center gap-2 transition-all duration-200 hover:bg-blue-700 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                  title={t('filters.search.execute')}
                >
                  <FaRocket />
                </button>
              )}
            </div>

            {showSearchHistory && searchHistory.length > 0 && (
              <div className="absolute left-0 right-0 top-[44px] transition-all duration-200 z-[80] opacity-100 translate-y-0 pointer-events-auto animate-[dropdown-in_.14s_ease-out]">
                <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  <div className="px-3 py-2 text-xs text-slate-600 border-b border-slate-100 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <FaHistory aria-hidden="true" /> {t('filters.search.recentSearches')}
                    </span>
                    <button
                      onClick={clearHistory}
                      className="text-red-500 hover:text-red-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 rounded"
                      title={t('filters.search.clearHistory')}
                    >
                      <FaTrash />
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {searchHistory.map((h, index) => (
                      <button
                        key={h.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setSearchQuery(h.term); setTimeout(handleSearch, 0); }}
                        className={cls(
                          "w-full text-left px-3 py-2 text-sm text-slate-700 flex items-center gap-2 transition-all duration-150",
                          "hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-100 active:scale-[0.98]"
                        )}
                        style={{ transitionDelay: `${Math.min(index, 6) * ANIMATION_DELAYS.HISTORY_STAGGER}ms` }}
                      >
                        <FaSearch className="text-slate-400 text-xs" aria-hidden="true" />
                        <span className="flex-1 truncate">{h.term}</span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(h.timestamp).toLocaleDateString()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            <div className="flex bg-white rounded-xl border border-slate-200 p-1" role="tablist">
              {[
                { key: "grid", icon: FaThLarge, label: t('filters.view.grid') },
                { key: "list", icon: FaTable, label: t('filters.view.list') },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  className={cls(
                    "h-8 px-3 rounded-lg text-sm inline-flex items-center gap-2 transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200",
                    view === key ? "bg-blue-900 text-white" : "text-slate-700 hover:bg-slate-100"
                  )}
                  title={label}
                  role="tab"
                  aria-selected={view === key}
                >
                  <Icon aria-hidden="true" />
                </button>
              ))}
            </div>

            <label className="relative">
              <span className="sr-only">{t('filters.itemsPerPage')}</span>
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all appearance-none cursor-pointer"
                title={t('filters.itemsPerPage')}
              >
                {[12, 24, 48, 96].map((count) => (
                  <option key={count} value={count}>{count}/page</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              className={cls(
                "h-10 px-4 rounded-xl font-medium inline-flex items-center gap-2 border transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200",
                isExpanded ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300"
              )}
              title={t('filters.toggleFilters')}
              aria-expanded={isExpanded}
              aria-controls="filters-panel"
            >
              <FaFilter aria-hidden="true" />
              <span>{t('filters.filters')}</span>
            </button>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("articlelib:export"))}
              className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center transition-transform active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
              title={t('filters.export')}
            >
              <FaDownload aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Panneau des filtres */}
      <div
        id="filters-panel"
        ref={wrapperRef}
        style={{ height: isExpanded ? height : 0 }}
        className="transition-[height] duration-300 ease-out overflow-hidden border-t border-blue-100"
        aria-hidden={!isExpanded}
      >
        <div ref={contentRef}>
          {isExpanded && (
            <div ref={dropdownRef} className="bg-gradient-to-b from-blue-50 to-white">
              {/* Pills */}
              <div className="relative">
                <div
                  ref={pillsScrollerRef}
                  className="px-6 pt-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar"
                  style={{ scrollbarWidth: "none" }}
                >
                  <Pill label={t('filters.categories')} icon={<FaTag />} open={activeMenu === "categories"} onToggle={() => setActiveMenu(activeMenu === "categories" ? null : "categories")} />
                  <Pill label={t('filters.tags')}        icon={<FaTag />} open={activeMenu === "tags"}        onToggle={() => setActiveMenu(activeMenu === "tags" ? null : "tags")} />
                  <Pill label={t('filters.authors')}     icon={<FaUser />} open={activeMenu === "authors"}     onToggle={() => setActiveMenu(activeMenu === "authors" ? null : "authors")} />
                  <Pill label={t('filters.options')}     icon={<FaFilter />} open={activeMenu === "options"}   onToggle={() => setActiveMenu(activeMenu === "options" ? null : "options")} />
                  <Pill label={t('filters.dates')}       icon={<FaCalendar />} open={activeMenu === "dates"}   onToggle={() => setActiveMenu(activeMenu === "dates" ? null : "dates")} />
                  <Pill label={t('filters.rating')}      icon={<FaThumbsUp />} open={activeMenu === "rating"}  onToggle={() => setActiveMenu(activeMenu === "rating" ? null : "rating")} />
                  <Pill label={t('filters.saved')}       icon={<FaBookmark />} open={activeMenu === "saved"}   onToggle={() => setActiveMenu(activeMenu === "saved" ? null : "saved")} />

                  <div className="ml-auto flex gap-2 pl-4">
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="h-10 px-3 rounded-xl border inline-flex items-center gap-2 transition-colors bg-white text-slate-700 border-slate-200 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                      title={t('filters.resetAll')}
                    >
                      <FaEraser aria-hidden="true" />
                      <span>{t('filters.resetAll')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyFilters}
                      className="h-10 px-4 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 inline-flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                      title={t('filters.apply')}
                    >
                      <FaRocket aria-hidden="true" />
                      <span>{t('filters.apply')}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sections */}
              <div className="px-6 pb-6 space-y-3">
                <FilterSection visible={activeMenu === "categories"} title={t('filters.categories')} onClear={localFilters.categories.length ? () => setLocalFilters(p => ({ ...p, categories: [] })) : undefined}>
                  {renderOptionChips(safeCategories, 'categories')}
                </FilterSection>

                <FilterSection visible={activeMenu === "tags"} title={t('filters.tags')} onClear={localFilters.tags.length ? () => setLocalFilters(p => ({ ...p, tags: [] })) : undefined}>
                  {renderOptionChips(safeTags, 'tags')}
                </FilterSection>

                <FilterSection visible={activeMenu === "authors"} title={t('filters.authors')} onClear={localFilters.authors.length ? () => setLocalFilters(p => ({ ...p, authors: [] })) : undefined}>
                  {renderOptionChips(safeAuthors, 'authors')}
                </FilterSection>

                <FilterSection
                  visible={activeMenu === "options"}
                  title={t('filters.quickOptions')}
                  onClear={(localFilters.featuredOnly || localFilters.stickyOnly || localFilters.unreadOnly)
                    ? () => setLocalFilters(p => ({ ...p, featuredOnly: false, stickyOnly: false, unreadOnly: false }))
                    : undefined}
                >
                  <div className="flex flex-wrap gap-3">
                    <ToggleButton active={localFilters.featuredOnly} onClick={() => setLocalFilters(prev => ({ ...prev, featuredOnly: !prev.featuredOnly }))} icon={<FaStar />} label={t('filters.featuredOnly')} />
                    <ToggleButton active={localFilters.stickyOnly}   onClick={() => setLocalFilters(prev => ({ ...prev, stickyOnly: !prev.stickyOnly }))}   icon={<FaThumbtack />} label={t('filters.pinnedOnly')} />
                    <ToggleButton active={localFilters.unreadOnly}   onClick={() => setLocalFilters(prev => ({ ...prev, unreadOnly: !prev.unreadOnly }))}   icon={<FaEye />} label={t('filters.unreadOnly')} />
                  </div>
                </FilterSection>

                <FilterSection visible={activeMenu === "dates"} title={t('filters.dates')} onClear={(localFilters.dateFrom || localFilters.dateTo) ? () => setLocalFilters(p => ({ ...p, dateFrom: "", dateTo: "" })) : undefined}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InputWithIcon icon={<FaCalendar />} type="date" label={t('filters.startDate')} value={localFilters.dateFrom} onChange={(value) => setLocalFilters(prev => ({ ...prev, dateFrom: value }))} />
                    <InputWithIcon icon={<FaCalendar />} type="date" label={t('filters.endDate')}   value={localFilters.dateTo}   onChange={(value) => setLocalFilters(prev => ({ ...prev, dateTo: value }))} />
                  </div>
                </FilterSection>

                <FilterSection visible={activeMenu === "rating"} title={t('filters.rating')} onClear={(localFilters.ratingMin > 0 || localFilters.ratingMax < 5) ? () => setLocalFilters(p => ({ ...p, ratingMin: 0, ratingMax: 5 })) : undefined}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InputWithIcon icon={<FaThumbsUp />} type="number" min="0" max="5" step="0.1" placeholder={t('filters.minRating')} label={t('filters.minRating')} value={localFilters.ratingMin}
                      onChange={(value) => setLocalFilters(prev => ({ ...prev, ratingMin: Math.min(5, Math.max(0, parseFloat(value) || 0)) }))} />
                    <InputWithIcon icon={<FaThumbsUp />} type="number" min="0" max="5" step="0.1" placeholder={t('filters.maxRating')} label={t('filters.maxRating')} value={localFilters.ratingMax}
                      onChange={(value) => setLocalFilters(prev => ({ ...prev, ratingMax: Math.min(5, Math.max(0, parseFloat(value) || 5)) }))} />
                  </div>
                </FilterSection>

                <FilterSection
                  visible={activeMenu === "saved"}
                  title={t('filters.savedFilters')}
                  action={
                    <button
                      type="button"
                      onClick={() => { setSaveModalName(generateSuggestedName()); setShowSaveModal(true); }}
                      className="h-9 px-3 rounded-lg bg-blue-600 text-white inline-flex items-center gap-2 hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                      title={t('filters.saveCurrent')}
                    >
                      <FaSave aria-hidden="true" />
                      <span>{t('filters.saveCurrent')}</span>
                    </button>
                  }
                >
                  {savedFilters.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      {t('filters.noSavedFilters')}
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {savedFilters.map((sf) => (
                        <div key={sf.id} className="py-2 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                const cleaned = normalizeFilters(sf.filters);
                                setLocalFilters(cleaned);
                                setFilters(cleaned);
                                setActiveMenu(null);
                                showToast(t('filters.toasts.filterLoaded', { name: sf.name }), "success");
                              }}
                              className="text-left text-sm text-slate-800 hover:text-slate-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 rounded"
                              title={t('filters.loadFilter', { name: sf.name })}
                            >
                              <div className="font-medium truncate">{sf.name}</div>
                              <div className="text-xs text-slate-500">
                                {t('filters.createdOn')} {new Date(sf.createdAt).toLocaleDateString()}
                              </div>
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => { deleteFilter(sf.id); showToast(t('filters.toasts.filterDeleted'), "success"); }}
                            className="text-red-500 hover:text-red-700 transition-colors p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                            title={t('filters.deleteFilter', { name: sf.name })}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </FilterSection>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save modal */}
      {showSaveModal && (
        <SaveModal
          initialValue={saveModalName}
          onClose={() => setShowSaveModal(false)}
          onSave={(name) => { if (handleSaveFilter(name)) setShowSaveModal(false); }}
        />
      )}

      {toastElements}
    </div>
  );
}

// -------------------------------------------
// Sub-components
// -------------------------------------------
function FilterSection({ visible, title, children, onClear, action }) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <div className="transition-all origin-top opacity-100 translate-y-0 scale-[1]">
      <section className="rounded-2xl border border-blue-200 bg-white shadow-sm p-4">
        <header className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <div className="flex items-center gap-2">
            {action}
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="text-sm inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 rounded px-2 py-1"
                title={t('filters.resetSection', { section: title.toLowerCase() })}
              >
                <FaEraser aria-hidden="true" />
                <span>{t('filters.reset')}</span>
              </button>
            )}
          </div>
        </header>
        {children}
      </section>
    </div>
  );
}

function SaveModal({ initialValue = "", onSave, onClose }) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValue);
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const outside = (e) => { if (modalRef.current && !modalRef.current.contains(e.target)) onClose?.(); };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      else if (e.key === "Enter" && name.trim()) onSave?.(name.trim());
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [name, onSave, onClose]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (name.trim()) onSave?.(name.trim());
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="save-modal-title">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-fade-in" />
      <div ref={modalRef} className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in">
        <form onSubmit={submit} className="p-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 inline-flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
            aria-label={t('common.close')}
          >
            <FaTimes />
          </button>

          <div className="space-y-4 pt-2">
            <div>
              <h2 id="save-modal-title" className="text-base font-semibold text-slate-900">{t('filters.saveModal.title')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('filters.saveModal.description')}</p>
            </div>

            <div>
              <label htmlFor="filter-name" className="block text-sm font-medium text-slate-700 mb-1">
                {t('filters.saveModal.filterName')}
              </label>
              <input
                id="filter-name"
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('filters.saveModal.placeholder')}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                maxLength={50}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className={cls(
                  "h-9 px-4 rounded-lg font-medium transition-colors inline-flex items-center gap-2",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200",
                  name.trim() ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-200 text-slate-500 cursor-not-allowed"
                )}
              >
                <FaSave className="text-xs" aria-hidden="true" />
                <span>{t('common.save')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
