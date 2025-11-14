// src/media-library/parts/FiltersPanel.jsx
// Improved + robust + i18n (NO <style jsx>, NO jsx prop)
// + Toggle global: désactiver/activer la couleur de toutes les cards
// + Fetch direct depuis API Laravel pour catégories & tags (categorieAdvance/tagsadvance -> fallback index)
// + Mobile bottom-sheet affiné (header/footer collants, swipe-to-close, accordéons, chips 2 colonnes, palette icon-only)
// + FIX Firefox/iOS: min-h-0, h-[85vh], unmount complet quand fermé (pas de flou résiduel), pas de wrapper autour du modal
// + (NEW) 1) Scroll-shadows sur les pills, 2) badges animés, 3) empty state + skeletons,
//         4) aperçu “cards” des filtres sauvegardés, 5) sélecteur de thème (neutre / pro / coloré)

import { useEffect, useState, useCallback, useMemo, useRef, useLayoutEffect } from "react";
import { useTranslation } from 'react-i18next';
import {
  FaFilter, FaSearch, FaThLarge, FaTable, FaDownload, FaTimes, FaSave, FaBookmark,
  FaHistory, FaStar, FaEye, FaChevronDown, FaRocket, FaTag, FaCalendar, FaThumbsUp,
  FaUser, FaTrash, FaCheck, FaThumbtack, FaEraser, FaBars, FaPalette, FaSyncAlt
} from "react-icons/fa";
import { cls } from "../shared/utils/format";
import "./FiltersPanel.css";
import api from "../../../services/api";

// -------------------------------------------
// Constants & defaults
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
  CARD_COLOR_ENABLED: "gridcard-color-enabled",
  THEME: "filters-theme",
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

// Thèmes (classes explicitement listées pour Tailwind)
const THEME_STYLES = {
  neutral: {
    accentIcon: "text-blue-600",
    headerFrom: "from-blue-50",
    primaryBg: "bg-blue-600 hover:bg-blue-700",
    primaryRing: "focus-visible:ring-blue-200",
    toggleActive: "bg-blue-50 text-blue-700 border-blue-200",
    ringSoft: "ring-2 ring-blue-100",
    borderSoft: "border-blue-200",
    textAccent: "text-blue-900",
    badgeBg: "bg-red-600",
  },
  pro: {
    accentIcon: "text-indigo-600",
    headerFrom: "from-indigo-50",
    primaryBg: "bg-indigo-600 hover:bg-indigo-700",
    primaryRing: "focus-visible:ring-indigo-200",
    toggleActive: "bg-indigo-50 text-indigo-700 border-indigo-200",
    ringSoft: "ring-2 ring-indigo-100",
    borderSoft: "border-indigo-200",
    textAccent: "text-indigo-900",
    badgeBg: "bg-rose-600",
  },
  colored: {
    accentIcon: "text-emerald-600",
    headerFrom: "from-emerald-50",
    primaryBg: "bg-emerald-600 hover:bg-emerald-700",
    primaryRing: "focus-visible:ring-emerald-200",
    toggleActive: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ringSoft: "ring-2 ring-emerald-100",
    borderSoft: "border-emerald-200",
    textAccent: "text-emerald-900",
    badgeBg: "bg-orange-600",
  },
};

// -------------------------------------------
// Helpers
// -------------------------------------------
function arraysEqualShallowStrings(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (String(a[i]) !== String(b[i])) return false;
  }
  return true;
}
function shallowFiltersEqual(a = {}, b = {}) {
  return (
    arraysEqualShallowStrings(a.categories, b.categories) &&
    arraysEqualShallowStrings(a.tags, b.tags) &&
    arraysEqualShallowStrings(a.authors, b.authors) &&
    !!(a.featuredOnly === b.featuredOnly) &&
    !!(a.stickyOnly === b.stickyOnly) &&
    !!(a.unreadOnly === b.unreadOnly) &&
    String(a.dateFrom || "") === String(b.dateFrom || "") &&
    String(a.dateTo || "") === String(b.dateTo || "") &&
    Number(a.ratingMin || 0) === Number(b.ratingMin || 0) &&
    Number(a.ratingMax || 5) === Number(b.ratingMax || 5)
  );
}

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
      <div>{t.message}</div>
      {/* Mini barre de progression */}
      <div className="relative mt-2 h-[2px] w-full bg-slate-200 overflow-hidden rounded">
        <div className={cls("absolute inset-y-0 left-0 w-full", t.type === "success" ? "bg-green-600" : "bg-rose-600", "animate-[toastbar_1.8s_linear]")} />
      </div>
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
// Fetch direct API - catégories & tags
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
      if (typeof o === "string") return { id: String(o), name: o };
      if (!o || typeof o !== "object") return null;
      const rawId = (o.id ?? o.value ?? o.slug ?? o.code ?? o.key ?? null);
      const id = rawId != null ? String(rawId) : null;
      const displayName =
        o.name ?? o.title ?? o.label ??
        (kind === "authors"
          ? [o.first_name, o.last_name].filter(Boolean).join(" ").trim()
          : o.slug) ??
        (id != null ? `#${id}` : null);
      if (id == null || !displayName) return null;
      return { id: String(id), name: String(displayName) };
    })
    .filter(Boolean);
};

const __cache = new Map();
const mkKey = (url, params) => `${url}?${new URLSearchParams(params || {}).toString()}`;

async function getWithCache(url, params = {}) {
  const key = mkKey(url, params);
  if (__cache.has(key)) return __cache.get(key);
  const res = await api.get(url, { params });
  const data = res?.data ?? [];
  __cache.set(key, data);
  return data;
}

async function fetchCategoriesOptions(params = {}) {
  const common = { only_active: true, per_page: 200, ...params };
  try {
    const data = await getWithCache("/categories/categorieAdvance", common);
    return normalizeOptionsList(data, "categories");
  } catch {
    const data = await getWithCache("/categories", common);
    return normalizeOptionsList(data, "categories");
  }
}

async function fetchTagsOptions(params = {}) {
  const common = { only_active: true, per_page: 200, ...params };
  try {
    const data = await getWithCache("/tags/tagsadvance", common);
    return normalizeOptionsList(data, "tags");
  } catch {
    const data = await getWithCache("/tags", common);
    return normalizeOptionsList(data, "tags");
  }
}

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

const Pill = ({ label, icon, open, onToggle, disabled = false, badge, theme = THEME_STYLES.neutral }) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={disabled}
    aria-expanded={open}
    className={cls(
      "h-10 px-3 rounded-xl border inline-flex items-center gap-2 whitespace-nowrap relative",
      "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      "focus:outline-none",
      theme.primaryRing,
      open ? theme.ringSoft : "",
      "active:scale-[0.98]"
    )}
  >
    <span className="text-sm text-slate-700" aria-hidden="true">{icon}</span>
    <span className="text-sm font-medium">{label}</span>
    <FaChevronDown className={cls("text-xs opacity-70 transition-transform", open ? "rotate-180" : "")} aria-hidden="true" />
    {badge > 0 && (
      <span
        className={cls(
          "absolute -top-1 -right-2 inline-flex items-center justify-center text-[11px] font-semibold px-1.5 py-0.5 rounded-full text-white",
          "animate-bounce",
          theme.badgeBg
        )}
      >
        {badge}
      </span>
    )}
  </button>
);

const ToggleButton = ({ active, onClick, icon, label, disabled = false, theme = THEME_STYLES.neutral }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cls(
      "h-10 px-3 rounded-lg border inline-flex items-center gap-2 transition-colors",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      "focus:outline-none",
      theme.primaryRing,
      active ? theme.toggleActive : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
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

  const [themeKey, setThemeKey] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.THEME)) || "neutral"; }
    catch { return "neutral"; }
  });
  const theme = THEME_STYLES[themeKey] || THEME_STYLES.neutral;
  const saveTheme = useCallback((key) => {
    setThemeKey(key);
    try { localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(key)); } catch {}
  }, []);

  const SEARCH_HINTS = useMemo(() => [
    t('filters.searchHints.example1'),
    t('filters.searchHints.example2'),
    t('filters.searchHints.example3'),
    t('filters.searchHints.tip'),
  ], [t]);

  // FETCH options direct si props vides
  const [catLoading, setCatLoading] = useState(false);
  const [tagLoading, setTagLoading] = useState(false);
  const [catError, setCatError] = useState(null);
  const [tagError, setTagError] = useState(null);
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [dynamicTags, setDynamicTags] = useState([]);

  const [catQuery, setCatQuery] = useState("");
  const [tagQuery, setTagQuery] = useState("");

  useEffect(() => {
    let aborted = false;

    async function loadCats(q) {
      if (categoriesOptions && categoriesOptions.length) return;
      setCatLoading(true); setCatError(null);
      try {
        const items = await fetchCategoriesOptions(q ? { q } : undefined);
        if (!aborted) setDynamicCategories(items);
      } catch (e) {
        if (!aborted) setCatError("categories");
      } finally {
        if (!aborted) setCatLoading(false);
      }
    }

    async function loadTags(q) {
      if (tagsOptions && tagsOptions.length) return;
      setTagLoading(true); setTagError(null);
      try {
        const items = await fetchTagsOptions(q ? { q } : undefined);
        if (!aborted) setDynamicTags(items);
      } catch (e) {
        if (!aborted) setTagError("tags");
      } finally {
        if (!aborted) setTagLoading(false);
      }
    }

    loadCats();
    loadTags();

    const catDeb = setTimeout(() => { if (!categoriesOptions?.length) loadCats(catQuery); }, 300);
    const tagDeb = setTimeout(() => { if (!tagsOptions?.length) loadTags(tagQuery); }, 300);

    return () => { aborted = true; clearTimeout(catDeb); clearTimeout(tagDeb); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catQuery, tagQuery, categoriesOptions?.length, tagsOptions?.length]);

  // safe lists
  const safeAuthors    = useMemo(() => normalizeOptionsList(authorsOptions, "authors"), [authorsOptions]);
  const safeCategories = useMemo(() => {
    const src = (categoriesOptions && categoriesOptions.length) ? categoriesOptions : dynamicCategories;
    return normalizeOptionsList(src, "categories");
  }, [categoriesOptions, dynamicCategories]);
  const safeTags       = useMemo(() => {
    const src = (tagsOptions && tagsOptions.length) ? tagsOptions : dynamicTags;
    return normalizeOptionsList(src, "tags");
  }, [tagsOptions, dynamicTags]);

  // Filters & UI state
  const normalizeFilters = useMemo(() => {
    const normalizeArrayToStringIds = (v) => Array.isArray(v) ? v.map(x => x == null ? "" : String(x)).filter(Boolean) : [];
    const normalizeBool  = (v) => !!v;
    const normalizeStr   = (v) => (typeof v === "string" ? v : "");
    const normalizeNum   = (v, min, max) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
    };
    return (f = {}) => ({
      categories: normalizeArrayToStringIds(f.categories),
      tags:       normalizeArrayToStringIds(f.tags),
      authors:    normalizeArrayToStringIds(f.authors),
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

  // ✅ Tablet utilise le modal mobile aussi
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 1024px)").matches);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReduced(!!mq.matches);
    update();
    mq.addEventListener ? mq.addEventListener("change", update) : mq.addListener(update);
    return () => mq.removeEventListener ? mq.removeEventListener("change", update) : mq.removeListener(update);
  }, []);


  // 🎨 Global card color toggle
  const [cardColorEnabled, setCardColorEnabled] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CARD_COLOR_ENABLED);
      return raw == null ? true : JSON.parse(raw);
    } catch { return true; }
  });
  const toggleCardColor = useCallback(() => {
    const next = !cardColorEnabled;
    setCardColorEnabled(next);
    try { localStorage.setItem(STORAGE_KEYS.CARD_COLOR_ENABLED, JSON.stringify(next)); } catch {}
    window.dispatchEvent(new CustomEvent("gridcard:colorpref", { detail: { enabled: next } }));
  }, [cardColorEnabled]);

  const dropdownRef = useRef(null);
  const searchWrapperRef = useRef(null);
  const pillsScrollerRef = useRef(null);

  const { savedFilters, saveFilter, deleteFilter } = useSavedFilters();
  const { history: searchHistory, addToHistory, clearHistory } = useSearchHistory();
  const { show: showToast, toastElements } = useToast();
  const { wrapperRef, contentRef, height } = useAutoHeight(isExpanded && !isMobile, [activeMenu, localFilters, savedFilters, cardColorEnabled, themeKey]);

  // Responsive listener
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener ? mq.addEventListener("change", handler) : mq.addListener(handler);
    return () => mq.removeEventListener ? mq.removeEventListener("change", handler) : mq.removeListener(handler);
  }, []);

  // Empêche le scroll du body quand le modal mobile est ouvert
  useEffect(() => {
    if (!showMobileModal) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevDocOverflow  = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevDocOverflow;
      try { window.scrollTo(window.scrollX, window.scrollY); } catch {}
    };
  }, [showMobileModal]);


  // Sync rawFilters -> localFilters
  useEffect(() => {
    const cleaned = normalizeFilters(rawFilters);
    if (!shallowFiltersEqual(cleaned, localFilters)) setLocalFilters(cleaned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawFilters, normalizeFilters]);

  // Sync search prop -> local search input
  useEffect(() => {
    if (String(search || "") !== searchQuery) setSearchQuery(String(search || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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
        if (isMobile && showMobileModal) setShowMobileModal(false);
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
  }, [showSaveModal, activeMenu, isExpanded, isMobile, showMobileModal]);

  const handleApplyFilters = useCallback(() => {
    const cleaned = normalizeFilters(localFilters);
    setFilters(cleaned);
    if (isMobile) setShowMobileModal(false);
    else setActiveMenu(null);
    showToast(t('filters.toasts.filtersApplied'), "success");
  }, [localFilters, setFilters, normalizeFilters, showToast, t, isMobile]);

  const handleResetFilters = useCallback(() => {
    const empty = normalizeFilters(DEFAULT_FILTERS);
    setLocalFilters(empty);
    setFilters(empty);
    setActiveMenu(null);
    if (isMobile) setShowMobileModal(false);
    showToast(t('filters.toasts.filtersReset'), "success");
  }, [setFilters, normalizeFilters, showToast, t, isMobile]);

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

  const activeFiltersCount = useMemo(() => {
    const base = normalizeFilters(DEFAULT_FILTERS);
    let count = 0;
    if (!arraysEqualShallowStrings(localFilters.categories, base.categories)) count += localFilters.categories.length;
    if (!arraysEqualShallowStrings(localFilters.tags, base.tags)) count += localFilters.tags.length;
    if (!arraysEqualShallowStrings(localFilters.authors, base.authors)) count += localFilters.authors.length;
    if (localFilters.featuredOnly) count += 1;
    if (localFilters.stickyOnly) count += 1;
    if (localFilters.unreadOnly) count += 1;
    if (localFilters.dateFrom || localFilters.dateTo) count += 1;
    if (localFilters.ratingMin > base.ratingMin) count += 1;
    if (localFilters.ratingMax < base.ratingMax) count += 1;
    return count;
  }, [localFilters, normalizeFilters]);

  const renderOptionChips = (options = [], type) => {
    // Empty state illustré quand aucune option
    if (!options || options.length === 0) {
      return (
        <div className="text-center p-8">
          <div className="mx-auto mb-2 h-16 w-16 rounded-full bg-slate-100" aria-hidden="true" />
          <p className="text-sm text-slate-500">{t('filters.noOptions', { type: t(`filters.types.${type}`) })}</p>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((opt, index) => {
          const id = String(opt.id);
          const label = opt.name ?? `#${id}`;
          const isActive = (localFilters[type] || []).some((v) => String(v) === id);
          return (
            <Chip
              key={id}
              index={index}
              active={isActive}
              onClick={() => setLocalFilters(prev => {
                const existing = Array.isArray(prev[type]) ? prev[type].map(x => String(x)) : [];
                if (existing.includes(id)) {
                  return { ...prev, [type]: existing.filter(x => x !== id) };
                } else {
                  return { ...prev, [type]: [...existing, id] };
                }
              })}
            >
              <span className="inline-flex items-center gap-2">
                {!isActive && <span className="h-2 w-2 rounded-full bg-slate-300" aria-hidden="true" />}
                {isActive && <span className="h-2 w-2 rounded-full bg-blue-200" aria-hidden="true" />}
                {label}
              </span>
            </Chip>
          );
        })}
      </div>
    );
  };

  const animatedHint = useTypewriter(SEARCH_HINTS, !searchQuery.length);
  const animatedHintText = animatedHint || t('filters.search.placeholder');

  // --- UI ---
  return (
    <div className="bg-white/20 border-b border-slate-200/20 sticky top-0 z-40 backdrop:blur-sm">
      {/* Header */}
    <div className="px-4 md:px-6 py-3">
  <div className="flex items-center justify-between gap-4">
    {/* Search */}
    <div
      ref={searchWrapperRef}
      className={cls(
        "relative flex-1 min-w-[220px] max-w-[640px] transition-all duration-200 z-[70]",
        // ⬇️ Glass plus visible sur fond blanc
        "rounded-2xl border border-slate-200/70 bg-slate-50/80 backdrop-blur-xl",
        isSearchFocused
          ? "scale-[1.01] shadow-[0_12px_35px_rgba(15,23,42,0.22)]"
          : "scale-[1] shadow-[0_4px_18px_rgba(15,23,42,0.12)]"
      )}
    >
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        onFocus={() => { setIsSearchFocused(true); setShowSearchHistory(true); }}
        onBlur={() => { setIsSearchFocused(false); if (!isHistoryPinned) setShowSearchHistory(false); }}
        placeholder={isMobile ? t('filters.search.placeholder') : ""}
        className={cls(
          "w-full pl-10 pr-20 h-10 rounded-2xl border-0 bg-transparent text-slate-900",
          "placeholder:text-slate-400",
          "transition-[box-shadow,border-color,transform] duration-200",
          "focus:outline-none",
          theme.primaryRing,
          isSearchFocused
            ? "shadow-[inset_0_0_0_1px_rgba(59,130,246,.35)]"
            : "shadow-none"
        )}
        aria-label={t('filters.search.ariaLabel')}
        autoComplete="off"
      />

      {!isMobile && !searchQuery.length && (
        <div className="pointer-events-none absolute left-10 right-20 top-1/2 -translate-y-1/2 text-slate-500 text-[13px] select-none">
          <span className="inline-flex items-center gap-2">
            <span className="whitespace-nowrap">
              {animatedHintText}
              {!prefersReduced && (
                <span className="ml-0.5 inline-block w-[1px] h-[1.2em] align-middle bg-slate-400 animate-caret-blink" />
              )}
            </span>
            <span className="hidden md:inline text-[11px] px-2 py-0.5 rounded-full bg-slate-50/90 border border-slate-200/80 backdrop-blur-sm">
              {t('filters.search.tip')}
            </span>
          </span>
        </div>
      )}

      <FaSearch
        className={cls(
          "absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200",
          isSearchFocused ? `${theme.accentIcon} translate-x-[1px] scale-110` : "text-slate-400 translate-x-0 scale-100"
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
            "h-8 w-8 rounded-xl border inline-flex items-center justify-center transition-all duration-200",
            "active:scale-95 focus:outline-none",
            theme.primaryRing,
            isHistoryPinned
              ? "bg-slate-50/95 text-slate-900 border-slate-200/90 shadow-sm"
              : "bg-slate-50/60 text-slate-600 border-slate-200/80 hover:bg-slate-50/90 hover:text-slate-800"
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
            className={cls(
              "h-8 w-8 rounded-xl border inline-flex items-center justify-center transition-all duration-200 active:scale-95 focus:outline-none",
              theme.primaryRing,
              "bg-slate-50/60 text-slate-600 border-slate-200/80 hover:bg-slate-50/90 hover:text-slate-800"
            )}
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
            className={cls(
              "h-8 px-3 rounded-xl text-white font-medium inline-flex items-center gap-2 transition-all duration-200 active:scale-[0.98] focus:outline-none",
              theme.primaryRing,
              "bg-blue-600/95 hover:bg-blue-700 shadow-[0_8px_24px_rgba(37,99,235,0.45)] hover:-translate-y-[1px]"
            )}
            title={t('filters.search.execute')}
          >
            <FaRocket />
          </button>
        )}
      </div>

      {showSearchHistory && searchHistory.length > 0 && (
        <div className="absolute left-0 right-0 top-[44px] transition-all duration-200 z-[80] opacity-100 translate-y-0 pointer-events-auto animate-[dropdown-in_.14s_ease-out]">
          <div className="bg-slate-50/95 backdrop-blur-xl border border-slate-200/80 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-3 py-2 text-xs text-slate-600 border-b border-slate-100/80 flex items-center justify-between">
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
                    "hover:bg-slate-50/80 focus-visible:outline-none focus-visible:bg-slate-100 active:scale-[0.98]"
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
    <div className="flex items-center gap-2 ml-3">
      {/* Thème (desktop – toujours caché pour l’instant) */}
      <label className="relative hidden md:hidden">
        <span className="sr-only">Theme</span>
        <select
          value={themeKey}
          onChange={(e) => saveTheme(e.target.value)}
          className={cls(
            "h-10 px-3 rounded-xl border bg-slate-50/80 backdrop-blur-md text-sm cursor-pointer",
            "border-slate-200/80 focus:outline-none",
            theme.primaryRing
          )}
          title="Theme"
        >
          <option value="neutral">Neutral</option>
          <option value="pro">Pro</option>
          <option value="colored">Coloré</option>
        </select>
      </label>

      {/* Vue grid / list */}
      <div
        className="hidden sm:flex bg-slate-50/80 backdrop-blur-md rounded-2xl border border-slate-200/80 p-1 shadow-sm"
        role="tablist"
      >
        {[
          { key: "grid", icon: FaThLarge, label: t('filters.view.grid') },
          { key: "list", icon: FaTable,   label: t('filters.view.list') },
        ].map(({ key, icon: Icon, label }) => {
          const active = view === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={cls(
                "h-8 px-3 rounded-xl text-sm inline-flex items-center gap-2 transition-all",
                "focus:outline-none",
                theme.primaryRing,
                active
                  ? "bg-white text-slate-900 shadow-[0_8px_18px_rgba(15,23,42,0.20)] font-semibold"
                  : "text-slate-500 hover:bg-white/60"
              )}
              title={label}
              role="tab"
              aria-selected={active}
            >
              <Icon aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {/* Per page */}
      <label className="relative hidden sm:block">
        <span className="sr-only">{t('filters.itemsPerPage')}</span>
        <select
          value={perPage}
          onChange={(e) => setPerPage(Number(e.target.value))}
          className={cls(
            "h-10 px-3 rounded-xl border bg-slate-50/80 backdrop-blur-md text-sm focus:outline-none cursor-pointer",
            "border-slate-200/80",
            theme.primaryRing
          )}
          title={t('filters.itemsPerPage')}
        >
          {[12, 24, 48, 96].map((count) => (
            <option key={count} value={count}>{count}/page</option>
          ))}
        </select>
      </label>

      {/* Mode de chargement : pagination classique / scroll infini */}
      <div
        className={cls(
          "hidden sm:flex relative items-center rounded-2xl border border-slate-200/80",
          "bg-slate-50/80 backdrop-blur-md p-1 shadow-sm",
          theme.primaryRing
        )}
        role="tablist"
        aria-label={t('filters.loadMode.label') || 'Mode de chargement'}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const mode = e.dataTransfer.getData("text/plain");
          if (mode === "page" || mode === "infinite") {
            setLoadMode?.(mode);
          }
        }}
      >
        {/* Knob glass + bleu clair pour bien ressortir */}
        <div
          className={cls(
            "absolute inset-y-1 left-1 rounded-xl bg-blue-50/95 backdrop-blur-xl",
            "shadow-[0_0_0_1px_rgba(191,219,254,0.9),0_12px_25px_rgba(15,23,42,0.18)]",
            "transition-transform duration-200"
          )}
          style={{
            width: "calc(50% - 4px)",
            transform: loadMode === "infinite" ? "translateX(100%)" : "translateX(0%)",
          }}
          aria-hidden="true"
        />

        {/* Pagination */}
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", "page");
          }}
          onClick={() => setLoadMode?.("page")}
          className={cls(
            "relative z-10 flex-1 h-8 px-3 rounded-xl text-xs inline-flex items-center justify-center gap-1.5",
            "transition-all focus:outline-none",
            loadMode === "page"
              ? "text-slate-900 font-semibold"
              : "text-slate-500"
          )}
          aria-pressed={loadMode === "page"}
          title={t('paginated') || 'Pagination par pages'}
        >
          <FaBars aria-hidden="true" />
          <span className="hidden xl:inline">
            {t('paginated') || 'Pages'}
          </span>
        </button>

        {/* Infini */}
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", "infinite");
          }}
          onClick={() => setLoadMode?.("infinite")}
          className={cls(
            "relative z-10 flex-1 h-8 px-3 rounded-xl text-xs inline-flex items-center justify-center gap-1.5",
            "transition-all focus:outline-none",
            loadMode === "infinite"
              ? "text-slate-900 font-semibold"
              : "text-slate-500"
          )}
          aria-pressed={loadMode === "infinite"}
          title={t('infinite') || 'Scroll infini'}
        >
          <FaSyncAlt aria-hidden="true" />
          <span className="hidden xl:inline">
            {t('infinite') || 'Infini'}
          </span>
        </button>
      </div>

      {/* Bouton Filters (desktop / mobile) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            if (isMobile) setShowMobileModal(true);
            else setIsExpanded(prev => !prev);
          }}
          className={cls(
            "h-10 px-4 rounded-2xl font-medium inline-flex items-center gap-2 border transition-all",
            "focus:outline-none",
            theme.primaryRing,
            (isExpanded && !isMobile)
              ? "bg-blue-600/95 text-white border-blue-500 shadow-[0_10px_30px_rgba(37,99,235,0.55)]"
              : "bg-slate-50/80 text-slate-800 border-slate-200/80 hover:bg-slate-50/95 hover:border-slate-300 shadow-sm"
          )}
          title={t('filters.toggleFilters')}
          aria-expanded={isExpanded}
          aria-controls="filters-panel"
          aria-pressed={isExpanded}
        >
          <FaFilter aria-hidden="true" />
          <span className="hidden sm:inline">{t('filters.filters')}</span>
          {activeFiltersCount > 0 && (
            <span
              className={cls(
                "inline-flex ml-1 items-center justify-center text-[11px] font-semibold px-2 py-0.5 rounded-full text-white",
                "animate-bounce bg-red-500/90 shadow-[0_0_0_1px_rgba(248,113,113,0.6)]"
              )}
            >
              {activeFiltersCount}
            </span>
          )}
          <span className="sm:hidden inline-flex items-center ml-1">
            <FaBars />
          </span>
        </button>
      </div>

      {/* Export */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("articlelib:export"))}
        className={cls(
          "h-10 w-10 rounded-2xl border inline-flex items-center justify-center transition-all",
          "bg-slate-50/80 text-slate-800 border-slate-200/80 hover:bg-slate-50/95 hover:border-slate-300 shadow-sm active:scale-[0.97]",
          theme.primaryRing
        )}
        title={t('filters.export')}
      >
        <FaDownload aria-hidden="true" />
      </button>
    </div>
  </div>
</div>




      {/* Panneau des filtres (desktop) */}
      <div
        id="filters-panel"
        ref={wrapperRef}
        style={{ height: !isMobile ? (isExpanded ? height : 0) : 0 }}
        className={cls(
          "transition-[height] duration-300 ease-out overflow-hidden border-t",
          theme.borderSoft
        )}
        aria-hidden={!isExpanded || isMobile}
      >
        <div ref={contentRef}>
          {isExpanded && !isMobile && (
            <div ref={dropdownRef} className={cls("bg-gradient-to-b to-white", theme.headerFrom)}>
              {/* Pills + Scroll-shadows */}
              <div className="relative">
                {/* Gradients left/right (scroll-shadows) */}
                <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-white to-transparent" />
                <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-white to-transparent" />

                <div
                  ref={pillsScrollerRef}
                  className="px-6 pt-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar"
                  style={{ scrollbarWidth: "none" }}
                >
                  <Pill theme={theme} label={t('filters.categories')} icon={<FaTag />} open={activeMenu === "categories"} onToggle={() => setActiveMenu(activeMenu === "categories" ? null : "categories")} badge={(localFilters.categories || []).length} />
                  <Pill theme={theme} label={t('filters.tags')}        icon={<FaTag />} open={activeMenu === "tags"}        onToggle={() => setActiveMenu(activeMenu === "tags" ? null : "tags")}       badge={(localFilters.tags || []).length} />
                  <Pill theme={theme} label={t('filters.authors')}     icon={<FaUser />} open={activeMenu === "authors"}     onToggle={() => setActiveMenu(activeMenu === "authors" ? null : "authors")} badge={(localFilters.authors || []).length} />
                  <Pill theme={theme} label={t('filters.options')}     icon={<FaFilter />} open={activeMenu === "options"}   onToggle={() => setActiveMenu(activeMenu === "options" ? null : "options")} />
                  <Pill theme={theme} label={t('filters.dates')}       icon={<FaCalendar />} open={activeMenu === "dates"}   onToggle={() => setActiveMenu(activeMenu === "dates" ? null : "dates")}     badge={localFilters.dateFrom || localFilters.dateTo ? 1 : 0} />
                  <Pill theme={theme} label={t('filters.rating')}      icon={<FaThumbsUp />} open={activeMenu === "rating"}  onToggle={() => setActiveMenu(activeMenu === "rating" ? null : "rating")}   badge={(localFilters.ratingMin > 0 || localFilters.ratingMax < 5) ? 1 : 0} />
                  <Pill theme={theme} label={t('filters.saved')}       icon={<FaBookmark />} open={activeMenu === "saved"}   onToggle={() => setActiveMenu(activeMenu === "saved" ? null : "saved")} />

                  <div className="ml-auto flex gap-2 pl-4">
                    <button
                      type="button"
                      onClick={toggleCardColor}
                      className={cls(
                        "h-10 w-10 rounded-xl border inline-flex items-center justify-center transition-colors",
                        "bg-white border-slate-200 hover:bg-slate-50",
                        theme.primaryRing
                      )}
                      title={
                        cardColorEnabled
                          ? (t('filters.cardsColor.disable') || 'Désactiver les couleurs')
                          : (t('filters.cardsColor.enable')  || 'Activer les couleurs')
                      }
                      aria-pressed={cardColorEnabled}
                    >
                      <FaPalette className={cls("text-base", theme.accentIcon)} />
                    </button>

                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className={cls(
                        "h-10 px-3 rounded-xl border inline-flex items-center gap-2 transition-colors bg-white text-slate-700 hover:bg-slate-100 focus:outline-none",
                        theme.primaryRing,
                        "border-slate-200"
                      )}
                      title={t('filters.resetAll')}
                    >
                      <FaEraser aria-hidden="true" />
                      <span className="hidden sm:inline">{t('filters.resetAll')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyFilters}
                      className={cls(
                        "h-10 px-4 rounded-xl text-white font-medium inline-flex items-center gap-2 transition-colors focus:outline-none",
                        theme.primaryRing,
                        theme.primaryBg
                      )}
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
                <FilterSection
                  theme={theme}
                  visible={activeMenu === "categories"}
                  title={`${t('filters.categories')} ${localFilters.categories.length ? `(${localFilters.categories.length})` : ''}`}
                  onClear={localFilters.categories.length ? () => setLocalFilters(p => ({ ...p, categories: [] })) : undefined}
                >
                  <div className="mb-2 max-w-sm">
                    <InputWithIcon
                      icon={<FaSearch />}
                      label={t('filters.searchCategory')}
                      placeholder={t('filters.searchCategoryPlaceholder')}
                      onChange={setCatQuery}
                    />
                  </div>
                  {catLoading ? (
                    <SkeletonChips />
                  ) : catError ? (
                    <div className="text-sm text-rose-600">{t('filters.errors.loadCategories') || "Impossible de charger les catégories."}</div>
                  ) : (
                    renderOptionChips(safeCategories, 'categories')
                  )}
                </FilterSection>

                <FilterSection
                  theme={theme}
                  visible={activeMenu === "tags"}
                  title={`${t('filters.tags')} ${localFilters.tags.length ? `(${localFilters.tags.length})` : ''}`}
                  onClear={localFilters.tags.length ? () => setLocalFilters(p => ({ ...p, tags: [] })) : undefined}
                >
                  <div className="mb-2 max-w-sm">
                    <InputWithIcon
                      icon={<FaSearch />}
                      label={t('filters.searchTag') || "Rechercher un tag"}
                      placeholder={t('filters.searchTagPlaceholder') || "Nom de tag…"}
                      onChange={setTagQuery}
                    />
                  </div>
                  {tagLoading ? (
                    <SkeletonChips />
                  ) : tagError ? (
                    <div className="text-sm text-rose-600">{t('filters.errors.loadTags') || "Impossible de charger les tags."}</div>
                  ) : (
                    renderOptionChips(safeTags, 'tags')
                  )}
                </FilterSection>

                <FilterSection
                  theme={theme}
                  visible={activeMenu === "authors"}
                  title={`${t('filters.authors')} ${localFilters.authors.length ? `(${localFilters.authors.length})` : ''}`}
                  onClear={localFilters.authors.length ? () => setLocalFilters(p => ({ ...p, authors: [] })) : undefined}
                >
                  {renderOptionChips(safeAuthors, 'authors')}
                </FilterSection>

                <FilterSection
                  theme={theme}
                  visible={activeMenu === "options"}
                  title={t('filters.quickOptions')}
                  onClear={(localFilters.featuredOnly || localFilters.stickyOnly || localFilters.unreadOnly)
                    ? () => setLocalFilters(p => ({ ...p, featuredOnly: false, stickyOnly: false, unreadOnly: false }))
                    : undefined}
                >
                  <div className="flex flex-wrap gap-3">
                    <ToggleButton theme={theme} active={localFilters.featuredOnly} onClick={() => setLocalFilters(prev => ({ ...prev, featuredOnly: !prev.featuredOnly }))} icon={<FaStar />} label={t('filters.featuredOnly')} />
                    <ToggleButton theme={theme} active={localFilters.stickyOnly}   onClick={() => setLocalFilters(prev => ({ ...prev, stickyOnly: !prev.stickyOnly }))}   icon={<FaThumbtack />} label={t('filters.pinnedOnly')} />
                    <ToggleButton theme={theme} active={localFilters.unreadOnly}   onClick={() => setLocalFilters(prev => ({ ...prev, unreadOnly: !prev.unreadOnly }))}   icon={<FaEye />} label={t('filters.unreadOnly')} />
                  </div>
                </FilterSection>

                <FilterSection
                  theme={theme}
                  visible={activeMenu === "dates"}
                  title={t('filters.dates')}
                  onClear={(localFilters.dateFrom || localFilters.dateTo) ? () => setLocalFilters(p => ({ ...p, dateFrom: "", dateTo: "" })) : undefined}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InputWithIcon icon={<FaCalendar />} type="date" label={t('filters.startDate')} value={localFilters.dateFrom} onChange={(value) => setLocalFilters(prev => ({ ...prev, dateFrom: value }))} />
                    <InputWithIcon icon={<FaCalendar />} type="date" label={t('filters.endDate')}   value={localFilters.dateTo}   onChange={(value) => setLocalFilters(prev => ({ ...prev, dateTo: value }))} />
                  </div>
                </FilterSection>

                <FilterSection
                  theme={theme}
                  visible={activeMenu === "rating"}
                  title={t('filters.rating')}
                  onClear={(localFilters.ratingMin > 0 || localFilters.ratingMax < 5) ? () => setLocalFilters(p => ({ ...p, ratingMin: 0, ratingMax: 5 })) : undefined}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InputWithIcon icon={<FaThumbsUp />} type="number" min="0" max="5" step="0.1" placeholder={t('filters.minRating')} label={t('filters.minRating')} value={localFilters.ratingMin}
                      onChange={(value) => setLocalFilters(prev => ({ ...prev, ratingMin: Math.min(5, Math.max(0, parseFloat(value) || 0)) }))} />
                    <InputWithIcon icon={<FaThumbsUp />} type="number" min="0" max="5" step="0.1" placeholder={t('filters.maxRating')} label={t('filters.maxRating')} value={localFilters.ratingMax}
                      onChange={(value) => setLocalFilters(prev => ({ ...prev, ratingMax: Math.min(5, Math.max(0, parseFloat(value) || 5)) }))} />
                  </div>
                </FilterSection>

                <FilterSection
                  theme={theme}
                  visible={activeMenu === "saved"}
                  title={t('filters.savedFilters')}
                  action={
                    <button
                      type="button"
                      onClick={() => { setSaveModalName(generateSuggestedName()); setShowSaveModal(true); }}
                      className={cls(
                        "h-9 px-3 rounded-lg text-white inline-flex items-center gap-2 transition-colors focus:outline-none",
                        theme.primaryRing,
                        theme.primaryBg
                      )}
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
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {savedFilters.map((sf) => (
                        <div
                          key={sf.id}
                          className="rounded-xl border border-slate-200 bg-white p-3 hover:shadow-md transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{sf.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {t('filters.createdOn')} {new Date(sf.createdAt).toLocaleDateString()}
                              </div>
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

                          {/* Aperçu des conditions */}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {sf.filters?.featuredOnly && <span className="px-2 h-6 rounded bg-slate-100 text-xs inline-flex items-center gap-1"><FaStar className="text-[10px]" /> featured</span>}
                            {sf.filters?.stickyOnly && <span className="px-2 h-6 rounded bg-slate-100 text-xs inline-flex items-center gap-1"><FaThumbtack className="text-[10px]" /> pinned</span>}
                            {sf.filters?.unreadOnly && <span className="px-2 h-6 rounded bg-slate-100 text-xs inline-flex items-center gap-1"><FaEye className="text-[10px]" /> unread</span>}
                            {!!(sf.filters?.categories?.length) && <span className="px-2 h-6 rounded bg-slate-100 text-xs">{sf.filters.categories.length} cat.</span>}
                            {!!(sf.filters?.tags?.length) && <span className="px-2 h-6 rounded bg-slate-100 text-xs">{sf.filters.tags.length} tags</span>}
                            {(sf.filters?.ratingMin > 0 || sf.filters?.ratingMax < 5) && (
                              <span className="px-2 h-6 rounded bg-slate-100 text-xs">
                                {sf.filters.ratingMin}–{sf.filters.ratingMax}★
                              </span>
                            )}
                            {(sf.filters?.dateFrom || sf.filters?.dateTo) && (
                              <span className="px-2 h-6 rounded bg-slate-100 text-xs">
                                {sf.filters.dateFrom || "—"} → {sf.filters.dateTo || "—"}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const cleaned = normalizeFilters(sf.filters);
                                setLocalFilters(cleaned);
                                setFilters(cleaned);
                                setActiveMenu(null);
                                showToast(t('filters.toasts.filterLoaded', { name: sf.name }), "success");
                              }}
                              className={cls(
                                "h-9 px-3 rounded-lg text-white text-sm inline-flex items-center gap-2 transition-colors focus:outline-none",
                                theme.primaryRing,
                                theme.primaryBg
                              )}
                              title={t('filters.loadFilter', { name: sf.name })}
                            >
                              <FaRocket className="text-xs" />
                              {t('filters.apply')}
                            </button>
                          </div>
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

      {/* Mobile bottom-sheet modal (AUCUN WRAPPER AUTOUR) */}
      {isMobile && (
        <MobileFiltersModal
          open={showMobileModal}
          onClose={() => setShowMobileModal(false)}
          safeCategories={safeCategories}
          safeTags={safeTags}
          safeAuthors={safeAuthors}
          localFilters={localFilters}
          setLocalFilters={setLocalFilters}
          handleApplyFilters={handleApplyFilters}
          handleResetFilters={handleResetFilters}
          cardColorEnabled={cardColorEnabled}
          toggleCardColor={toggleCardColor}
          t={t}
          theme={theme}
          themeKey={themeKey}
          onThemeChange={saveTheme}
          loadMode={loadMode}
          setLoadMode={setLoadMode}
        />
      )}

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
// Sub-components (desktop shared)
// -------------------------------------------
function FilterSection({ visible, title, children, onClear, action, theme = THEME_STYLES.neutral }) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <div className="transition-all origin-top opacity-100 translate-y-0 scale-[1]">
      <section className={cls("rounded-2xl bg-white shadow-sm p-4 border", theme.borderSoft)}>
        <header className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <div className="flex items-center gap-2">
            {action}
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className={cls(
                  "text-sm inline-flex items-center gap-2 text-slate-700 transition-colors focus:outline-none rounded px-2 py-1 hover:bg-slate-50",
                  "focus-visible:ring-2",
                  theme.primaryRing
                )}
                title={t('filters.resetSection', { section: String(title).toLowerCase?.() || "" })}
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

/* =========================
   Mobile bottom-sheet (wrapper sans hooks) + contenu avec hooks
========================= */
function MobileFiltersModal(props) {
  // ⚠️ AUCUN HOOK ICI
  const { open } = props;
  if (!open) return null;
  return <MobileFiltersModalContent {...props} />;
}

function MobileFiltersModalContent({
  open, onClose,
  safeCategories, safeTags, safeAuthors,
  localFilters, setLocalFilters,
  handleApplyFilters, handleResetFilters,
  cardColorEnabled, toggleCardColor,
  t, theme, themeKey, onThemeChange, loadMode, setLoadMode
}) {
  const sheetRef = useRef(null);
  const [openSection, setOpenSection] = useState("quick");

  // Petites recherches locales par section (client-side)
  const [catLocalQuery, setCatLocalQuery] = useState("");
  const [tagLocalQuery, setTagLocalQuery] = useState("");
  const [authLocalQuery, setAuthLocalQuery] = useState("");

  // Focus initial + swipe-to-close
  useEffect(() => {
    sheetRef.current?.querySelector("button, input, select")?.focus?.();

    let startY = null;
    const onTouchStart = (e) => { startY = e.touches?.[0]?.clientY ?? null; };
    const onTouchMove  = (e) => {
      if (!startY) return;
      const y = e.touches?.[0]?.clientY ?? startY;
      const dy = y - startY;
      if (dy > 36) { onClose?.(); startY = null; }
    };
    const el = sheetRef.current;
    el?.addEventListener("touchstart", onTouchStart, { passive: true });
    el?.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      el?.removeEventListener("touchstart", onTouchStart);
      el?.removeEventListener("touchmove", onTouchMove);
    };
  }, [onClose]);

  const toggle = (key) => setOpenSection((prev) => (prev === key ? null : key));
  const filterBy = (items = [], q = "") =>
    (items || []).filter(o => String(o?.name || "").toLowerCase().includes(String(q).toLowerCase()));

  const catFiltered  = filterBy(safeCategories, catLocalQuery);
  const tagFiltered  = filterBy(safeTags,      tagLocalQuery);
  const authFiltered = filterBy(safeAuthors,   authLocalQuery);

  return (
    <div className="fixed inset-0 z-[80]">
      {/* Overlay */}
      <button
        type="button"
        onClick={onClose}
        aria-label={t('common.close')}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('filters.filters')}
        className="
          fixed inset-x-0 bottom-0 w-full
          bg-white rounded-t-2xl shadow-2xl
          animate-sheet-in
          flex flex-col
          h-[85vh] max-h-[92vh] md:max-h-[92svh]
          overflow-hidden
          will-change:transform
        "
      >
        {/* Handle + Header sticky */}
        <div className="sticky top-0 bg-white rounded-t-2xl pt-2 px-4 pb-3 border-b border-slate-200">
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-slate-200" aria-hidden="true" />
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">{t('filters.filters')}</h3>
            <div className="flex items-center gap-2">
              {/* Mode page / infini (mobile) */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setLoadMode?.("pagination")}
                  className={cls(
                    "h-8 w-8 rounded-lg border inline-flex items-center justify-center text-xs",
                    loadMode !== "infinite"
                      ? "bg-slate-100 text-slate-800 border-slate-300"
                      : "bg-white text-slate-500 border-slate-200"
                  )}
                  title={t('filters.loadMode.paginated') || 'Pages'}
                >
                  <FaBars />
                </button>
                <button
                  type="button"
                  onClick={() => setLoadMode?.("infinite")}
                  className={cls(
                    "h-8 w-8 rounded-lg border inline-flex items-center justify-center text-xs",
                    loadMode === "infinite"
                      ? "bg-slate-100 text-slate-800 border-slate-300"
                      : "bg-white text-slate-500 border-slate-200"
                  )}
                  title={t('filters.loadMode.infinite') || 'Infini'}
                >
                  <FaSyncAlt />
                </button>
              </div>
              {/* Select thème (mobile) */}
              <label className="relative">
                <span className="sr-only">Theme</span>
                <select
                  value={themeKey}
                  onChange={(e) => onThemeChange?.(e.target.value)}
                  className="h-9 px-2 rounded-lg border border-slate-200 bg-white text-sm"
                  title="Theme"
                >
                  <option value="neutral">Neutral</option>
                  <option value="pro">Pro</option>
                  <option value="colored">Coloré</option>
                </select>
              </label>

              <button
                type="button"
                onClick={toggleCardColor}
                className="h-9 w-9 rounded-lg border border-slate-200 bg-white inline-flex items-center justify-center hover:bg-slate-50"
                title="Couleurs cartes"
                aria-pressed={cardColorEnabled}
              >
                <FaPalette className={cls("text-base", theme.accentIcon)} />
              </button>
              <button
                onClick={onClose}
                className="h-9 w-9 rounded-lg border border-slate-200 bg-white inline-flex items-center justify-center hover:bg-slate-50"
                aria-label={t('common.close')}
              >
                <FaTimes />
              </button>
            </div>
          </div>
        </div>

        {/* Contenu scrollable (min-h-0 indispensable pour Firefox) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
          {/* Quick options */}
          <AccordionItem
            open={openSection === "quick"}
            onToggle={() => toggle("quick")}
            title={t('filters.quickOptions')}
          >
            <div className="flex gap-2 flex-wrap">
              <ToggleButton
                theme={theme}
                active={localFilters.featuredOnly}
                onClick={() => setLocalFilters(p => ({ ...p, featuredOnly: !p.featuredOnly }))}
                icon={<FaStar />} label={t('filters.featuredOnly')}
              />
              <ToggleButton
                theme={theme}
                active={localFilters.stickyOnly}
                onClick={() => setLocalFilters(p => ({ ...p, stickyOnly: !p.stickyOnly }))}
                icon={<FaThumbtack />} label={t('filters.pinnedOnly')}
              />
              <ToggleButton
                theme={theme}
                active={localFilters.unreadOnly}
                onClick={() => setLocalFilters(p => ({ ...p, unreadOnly: !p.unreadOnly }))}
                icon={<FaEye />} label={t('filters.unreadOnly')}
              />
            </div>
          </AccordionItem>

          {/* Categories */}
          <AccordionItem
            open={openSection === "categories"}
            onToggle={() => toggle("categories")}
            title={`${t('filters.categories')} ${localFilters.categories.length ? `(${localFilters.categories.length})` : ''}`}
            onClear={localFilters.categories.length ? () => setLocalFilters(p => ({ ...p, categories: [] })) : undefined}
          >
            <div className="mb-2">
              <InputWithIcon
                icon={<FaSearch />}
                label={t('filters.searchCategory')}
                placeholder={t('filters.searchCategoryPlaceholder')}
                onChange={setCatLocalQuery}
              />
            </div>
            <ChipsGrid
              options={catFiltered}
              type="categories"
              localFilters={localFilters}
              setLocalFilters={setLocalFilters}
            />
          </AccordionItem>

          {/* Tags */}
          <AccordionItem
            open={openSection === "tags"}
            onToggle={() => toggle("tags")}
            title={`${t('filters.tags')} ${localFilters.tags.length ? `(${localFilters.tags.length})` : ''}`}
            onClear={localFilters.tags.length ? () => setLocalFilters(p => ({ ...p, tags: [] })) : undefined}
          >
            <div className="mb-2">
              <InputWithIcon
                icon={<FaSearch />}
                label={t('filters.searchTag')}
                placeholder={t('filters.searchTagPlaceholder')}
                onChange={setTagLocalQuery}
              />
            </div>
            <ChipsGrid
              options={tagFiltered}
              type="tags"
              localFilters={localFilters}
              setLocalFilters={setLocalFilters}
            />
          </AccordionItem>

          {/* Authors */}
          <AccordionItem
            open={openSection === "authors"}
            onToggle={() => toggle("authors")}
            title={`${t('filters.authors')} ${localFilters.authors.length ? `(${localFilters.authors.length})` : ''}`}
            onClear={localFilters.authors.length ? () => setLocalFilters(p => ({ ...p, authors: [] })) : undefined}
          >
            <div className="mb-2">
              <InputWithIcon
                icon={<FaSearch />}
                label={t('filters.searchAuthor') || "Rechercher un auteur"}
                placeholder={t('filters.searchAuthorPlaceholder') || "Nom d'auteur…"}
                onChange={setAuthLocalQuery}
              />
            </div>
            <ChipsGrid
              options={authFiltered}
              type="authors"
              localFilters={localFilters}
              setLocalFilters={setLocalFilters}
            />
          </AccordionItem>

          {/* Dates */}
          <AccordionItem
            open={openSection === "dates"}
            onToggle={() => toggle("dates")}
            title={t('filters.dates')}
            onClear={(localFilters.dateFrom || localFilters.dateTo) ? () => setLocalFilters(p => ({ ...p, dateFrom: "", dateTo: "" })) : undefined}
          >
            <div className="grid grid-cols-2 gap-2">
              <InputWithIcon icon={<FaCalendar />} type="date" label={t('filters.startDate')}
                value={localFilters.dateFrom}
                onChange={(value) => setLocalFilters(prev => ({ ...prev, dateFrom: value }))} />
              <InputWithIcon icon={<FaCalendar />} type="date" label={t('filters.endDate')}
                value={localFilters.dateTo}
                onChange={(value) => setLocalFilters(prev => ({ ...prev, dateTo: value }))} />
            </div>
          </AccordionItem>

          {/* Rating */}
          <AccordionItem
            open={openSection === "rating"}
            onToggle={() => toggle("rating")}
            title={t('filters.rating')}
            onClear={(localFilters.ratingMin > 0 || localFilters.ratingMax < 5) ? () => setLocalFilters(p => ({ ...p, ratingMin: 0, ratingMax: 5 })) : undefined}
          >
            <div className="grid grid-cols-2 gap-2">
              <InputWithIcon icon={<FaThumbsUp />} type="number" min="0" max="5" step="0.1"
                placeholder={t('filters.minRating')} label={t('filters.minRating')}
                value={localFilters.ratingMin}
                onChange={(value) => setLocalFilters(prev => ({ ...prev, ratingMin: Math.min(5, Math.max(0, parseFloat(value) || 0)) }))} />
              <InputWithIcon icon={<FaThumbsUp />} type="number" min="0" max="5" step="0.1"
                placeholder={t('filters.maxRating')} label={t('filters.maxRating')}
                value={localFilters.ratingMax}
                onChange={(value) => setLocalFilters(prev => ({ ...prev, ratingMax: Math.min(5, Math.max(0, parseFloat(value) || 5)) }))} />
            </div>
          </AccordionItem>
        </div>

        {/* Footer sticky */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-3 flex gap-2">
          <button
            onClick={handleResetFilters}
            className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-slate-700 active:scale-[0.98] transition"
          >
            {t('filters.resetAll')}
          </button>
          <button
            onClick={handleApplyFilters}
            className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 active:scale-[0.98] transition"
          >
            {t('filters.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccordionItem({ open, onToggle, title, children, onClear }) {
  return (
    <section className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full h-12 px-3 flex items-center justify-between bg-white"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-slate-900">{title}</span>
        <div className="flex items-center gap-2">
          {onClear && (
            <span
              onClick={(e) => { e.stopPropagation(); onClear?.(); }}
              className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Reset
            </span>
          )}
          <FaChevronDown className={cls("transition-transform", open ? "rotate-180" : "rotate-0")} />
        </div>
      </button>
      <div
        className={cls(
          "transition-[grid-template-rows,opacity] duration-200",
          open ? "grid grid-rows-[1fr] opacity-100" : "grid grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden p-3 bg-slate-50">
          {children}
        </div>
      </div>
    </section>
  );
}

function ChipsGrid({ options = [], type, localFilters, setLocalFilters }) {
  if (!options || options.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="mx-auto mb-2 h-16 w-16 rounded-full bg-slate-100" aria-hidden="true" />
        <p className="text-sm text-slate-500">—</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((opt) => {
        const id = String(opt.id);
        const label = opt.name ?? `#${id}`;
        const isActive = (localFilters[type] || []).some((v) => String(v) === id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => setLocalFilters(prev => {
              const existing = Array.isArray(prev[type]) ? prev[type].map(x => String(x)) : [];
              return existing.includes(id)
                ? { ...prev, [type]: existing.filter(x => x !== id) }
                : { ...prev, [type]: [...existing, id] };
            })}
            className={cls(
              "h-9 px-3 rounded-lg border text-xs font-medium text-left",
              "active:scale-[0.98] transition-all",
              isActive
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
            )}
            aria-pressed={isActive}
          >
            <span className="inline-flex items-center gap-2">
              {!isActive && <span className="h-2 w-2 rounded-full bg-slate-300" aria-hidden="true" />}
              {isActive && <span className="h-2 w-2 rounded-full bg-blue-200" aria-hidden="true" />}
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SkeletonChips() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-7 w-20 rounded-lg bg-slate-200 animate-pulse" />
      ))}
    </div>
  );
}
