// src/components/navbar/ArticleSearchBox.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faTimes,
  faHistory,
  faClock,
  faTrash,
  faExclamationTriangle,
  faArrowRotateRight,
  faLock,
  faRightToBracket,
  faFilter,
  faChevronDown,
  faSitemap,
  faArrowUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";

/* ===== Helpers ENV / URL ===== */
const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_API_BASE_URL) ||
  "";

const API_BASE_STORAGE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_STORAGE) ||
  (typeof process !== "undefined" && process.env?.VITE_API_BASE_STORAGE) ||
  "";

/* ===== Token ===== */
const getTokenGuard = () => {
  try {
    return (
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem("tokenGuard")) ||
      (typeof localStorage !== "undefined" && localStorage.getItem("tokenGuard")) ||
      null
    );
  } catch {
    return null;
  }
};

/* ===== URL helpers ===== */
const toStorageUrl = (p) => {
  if (!p) return "";
  const s = String(p).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const base =
    (API_BASE_STORAGE || API_BASE_URL.replace(/\/api(?:\/.*)?$/i, "")).replace(/\/+$/, "");
  const rel = s.startsWith("storage/") ? s.replace(/^\/+/, "") : `storage/${s.replace(/^\/+/, "")}`;
  return `${base}/${rel}`;
};

const articleRoute = (a) => {
  const slug = a?.slug || a?.article_slug || null;
  return slug ? `/articles/${slug}` : a?.id ? `/articles/${a.id}` : null;
};

const pickImage = (a) => {
  const cand =
    a?.featured_image?.url ||
    a?.featured_image ||
    a?.image ||
    a?.thumbnail ||
    a?.media?.[0]?.url ||
    null;
  return cand ? toStorageUrl(cand) : null;
};

const formatDate = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
};

const fullDateTooltip = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch {
    return iso || "";
  }
};

const formatTimeAgo = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours} h`;
  if (days < 7) return `Il y a ${days} j`;

  const date = new Date(timestamp);
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

/* ===== Historique ===== */
const SEARCH_HISTORY_KEY = "article_search_history";
const MAX_HISTORY_ITEMS = 15;

const getSearchHistory = () => {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};
const saveSearchHistory = (history) => {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch {}
};
const addToSearchHistory = (query) => {
  const q = String(query || "").trim();
  if (!q) return;
  const normalized = q.toLowerCase();
  const history = getSearchHistory();
  const filtered = history.filter((h) => h.query.toLowerCase() !== normalized);
  const item = { query: q, timestamp: Date.now(), id: String(Date.now()) };
  saveSearchHistory([item, ...filtered].slice(0, MAX_HISTORY_ITEMS));
};
const removeFromSearchHistory = (id) => {
  const history = getSearchHistory();
  const filtered = history.filter((h) => h.id !== id);
  saveSearchHistory(filtered);
  return filtered;
};
const clearSearchHistory = () => saveSearchHistory([]);

/* ====== LRU cache (mémoire) pour requêtes ====== */
function createLRU(max = 30, ttlMs = 5 * 60 * 1000) {
  const map = new Map(); // key -> { value, ts }
  return {
    get(k) {
      const v = map.get(k);
      if (!v) return undefined;
      if (Date.now() - v.ts > ttlMs) {
        map.delete(k);
        return undefined;
      }
      map.delete(k);
      map.set(k, v);
      return v.value;
    },
    set(k, value) {
      if (map.has(k)) map.delete(k);
      map.set(k, { value, ts: Date.now() });
      if (map.size > max) {
        const first = map.keys().next().value;
        map.delete(first);
      }
    },
    clear() { map.clear(); },
    setTtl(ms) { /* optionnel si tu veux changer dynamiquement */ }
  };
}
const queryCache = createLRU();

/* ===== Utils routes ===== */
const toFrontPath = (input) => {
  if (!input) return null;
  const s = String(input).trim();
  if (s.startsWith("/")) return s;
  try {
    const u = new URL(s, window.location.origin);
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return s;
  }
};

const uniqBy = (arr, keyFn) => {
  const m = new Map();
  for (const it of arr) {
    const k = keyFn(it);
    if (!m.has(k)) m.set(k, it);
  }
  return Array.from(m.values());
};

const normalizeRoute = (label, path, section) => {
  const p = toFrontPath(path);
  if (!p) return null;
  return {
    label: String(label || p).trim(),
    path: p,
    section: section ? String(section).trim() : null,
  };
};

/* ====== API search (articles) ====== */
async function searchArticles(query, signal, perPage = 8, filters = {}) {
  const token = getTokenGuard();
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const tryFetch = async (url, params) => {
    const qs = new URLSearchParams(params);
    const res = await fetch(`${url}?${qs.toString()}`, { headers, signal });
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  };

  const parsePayload = (json) => {
    const arr = Array.isArray(json)
      ? json
      : Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.results)
      ? json.results
      : [];
    return arr.map((x) => ({
      id: x.id,
      slug: x.slug,
      title: x.title || x.name || "(sans titre)",
      excerpt: x.excerpt || x.summary || "",
      published_at: x.published_at || x.created_at,
      category:
        (Array.isArray(x.categories) && x.categories[0]?.name) ||
        x.category?.name ||
        null,
      image: pickImage(x),
      _raw: x,
    }));
  };

  const params = {
    q: query,
    per_page: perPage,
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.dateFrom ? { date_from: filters.dateFrom } : {}),
    ...(filters.dateTo ? { date_to: filters.dateTo } : {}),
  };

  try {
    const j = await tryFetch(`${API_BASE_URL}/articles/search`, params);
    return parsePayload(j);
  } catch {}
  try {
    const j = await tryFetch(`${API_BASE_URL}/articles`, params);
    return parsePayload(j);
  } catch {}
  try {
    const j = await tryFetch(`${API_BASE_URL}/search`, { ...params, type: "articles" });
    return parsePayload(j);
  } catch {
    return [];
  }
}

/* ===== Hook breakpoint très simple (<=480px) ===== */
function useIsCompact() {
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 480px)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 480px)");
    const onChange = () => setIsCompact(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return isCompact;
}

/* ================= Component ================= */
export default function ArticleSearchBox({
  placeholder = "Rechercher…",
  perPage = 8,
  className = "",
  hotkey = "k",               // Ctrl/Cmd + K
  openOnSlash = true,         // "/" pour ouvrir si pas dans un input
  cacheTtlMs = 5 * 60 * 1000, // TTL cache
  compactOnMobile = false,    // ✅ Variante compacte sous 480px
  navbarHeightPx = 80,        // hauteur nav (h-20 = 80px)

  /* ====== Auth guard ====== */
  requireAuth = false,
  isAuthenticated = false,
  onRequireAuth = () => {},
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isCompact = useIsCompact();
  const useCompact = compactOnMobile && isCompact;
  const disabled = requireAuth && !isAuthenticated;

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [highlight, setHighlight] = useState(-1);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showAuthHint, setShowAuthHint] = useState(false);

  // 🔎 Filtres articles
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // 🧭 Mode : articles | routes
  const [mode, setMode] = useState("articles");

  // 📚 Routes intégrées
  const [routeItems, setRouteItems] = useState([]);

  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const debRef = useRef(null);
  const listRef = useRef(null);
  const overlayRef = useRef(null);

  const hasQuery = q.trim().length > 0;
  const hasArticleResults = items.length > 0;
  const hasHistory = searchHistory.length > 0;

  /* ===== Charger l'historique ===== */
  useEffect(() => { setSearchHistory(getSearchHistory()); }, []);

  /* ===== Fermer la bulle login après navigation ===== */
  useEffect(() => { setShowAuthHint(false); }, [location.pathname]);

  /* ===== Construire le catalogue de routes (auto) ===== */
  useEffect(() => {
    const fromDom = () => {
      const out = [];
      try {
        // Desktop nav
        document.querySelectorAll(".nav-links a[href]").forEach((a) => {
          const label = a.textContent?.trim() || a.getAttribute("aria-label") || "Page";
          const path = a.getAttribute("href");
          const wrapLi = a.closest("li.has-submenu");
          const section = wrapLi ? wrapLi.querySelector(":scope > a, :scope > button")?.textContent?.trim() : null;
          const r = normalizeRoute(label, path, section);
          if (r) out.push(r);
        });
        // Drawer / quick access (mobile)
        document.querySelectorAll('#mobile-drawer a[href]').forEach((a) => {
          const label = a.textContent?.trim() || a.getAttribute("aria-label") || "Page";
          const path = a.getAttribute("href");
          // Essayer d'inférer une section “Mobile”
          const section = a.closest('#mobile-drawer') ? 'Mobile' : null;
          const r = normalizeRoute(label, path, section);
          if (r) out.push(r);
        });
      } catch {}
      return out;
    };

    const fromGlobal = () => {
      try {
        const arr = Array.isArray(window.__ROUTE_CATALOG__) ? window.__ROUTE_CATALOG__ : [];
        return arr.map(x => normalizeRoute(x.label, x.path, x.section)).filter(Boolean);
      } catch { return []; }
    };

    const fallback = [
      normalizeRoute("Accueil", "/"),
      normalizeRoute("Articles", "/articles", "Platform"),
      normalizeRoute("Vidéo", "/platform/video", "Platform"),
      normalizeRoute("Audio", "/platform/audio", "Platform"),
      normalizeRoute("Structure", "/about/structure", "About"),
      normalizeRoute("Objectifs", "/about/goals", "About"),
      normalizeRoute("Membres", "/about/members", "About"),
      normalizeRoute("Contact", "/about/contact", "About"),
    ].filter(Boolean);

    const merged = uniqBy(
      [...fromDom(), ...fromGlobal(), ...fallback],
      (r) => `${r.path}::${(r.section||"").toLowerCase()}::${r.label.toLowerCase()}`
    );
    setRouteItems(merged);
  }, [location.pathname]);

  /* ===== Raccourcis globaux ===== */
  useEffect(() => {
    if (useCompact) return;
    const onKey = (e) => {
      const isInInput =
        ["INPUT", "TEXTAREA"].includes(e.target?.tagName) || e.target?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === hotkey) {
        e.preventDefault();
        if (disabled) { setShowAuthHint(true); return onRequireAuth(); }
        openAndFocus();
        return;
      }
      if (openOnSlash && !open && !isInInput && e.key === "/") {
        e.preventDefault();
        if (disabled) { setShowAuthHint(true); return onRequireAuth(); }
        openAndFocus();
        return;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, hotkey, openOnSlash, useCompact, disabled, onRequireAuth]);

  /* ===== Verrouillage scroll si overlay ouvert ===== */
  useEffect(() => {
    if (!open || useCompact) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => { root.style.overflow = prev; };
  }, [open, useCompact]);

  /* ===== Recherche articles avec cache + debounce ===== */
  const doSearch = useCallback(
    async (query, f = { category, dateFrom, dateTo }) => {
      if (mode !== "articles") return;
      if (disabled) {
        setItems([]); setErr(""); setLoading(false); setShowAuthHint(true); onRequireAuth(); return;
      }

      const key = `${query}::${perPage}::${f.category||''}::${f.dateFrom||''}::${f.dateTo||''}`;
      const cached = queryCache.get(key);
      if (cached) { setItems(cached); setErr(""); setLoading(false); return; }

      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true); setErr(""); setShowHistory(false);

      try {
        const arr = await searchArticles(query, ctrl.signal, perPage, f);
        const filtered = arr.filter(it => {
          const okCat = !f.category || (it.category || '').toLowerCase() === f.category.toLowerCase();
          const ts = it.published_at ? Date.parse(it.published_at) : null;
          const okFrom = !f.dateFrom || (ts && ts >= Date.parse(f.dateFrom));
          const okTo   = !f.dateTo   || (ts && ts <= Date.parse(f.dateTo + 'T23:59:59'));
          return okCat && okFrom && okTo;
        });
        setItems(filtered);
        queryCache.set(key, filtered);
        if (arr.length > 0 && query.trim()) {
          addToSearchHistory(query);
          setSearchHistory(getSearchHistory());
        }
      } catch {
        setErr("Erreur de recherche");
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [perPage, disabled, onRequireAuth, category, dateFrom, dateTo, mode]
  );

  /* ===== Debounce ===== */
  useEffect(() => {
    if (!hasQuery) {
      setItems([]);
      setLoading(false);
      setErr("");
      setShowHistory((useCompact || open) && hasHistory);
      return;
    }
    if (debRef.current) clearTimeout(debRef.current);

    debRef.current = setTimeout(() => {
      if (mode === "articles") {
        doSearch(q.trim());
      } else {
        // mode routes : rien à fetch
        setLoading(false);
        setErr("");
      }
    }, 300);
    return () => debRef.current && clearTimeout(debRef.current);
  }, [q, hasQuery, doSearch, open, hasHistory, useCompact, category, dateFrom, dateTo, mode]);

  /* ===== Clic extérieur ===== */
  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && rootRef.current.contains(e.target)) return;
      if (overlayRef.current && overlayRef.current.contains(e.target)) return;

      if (useCompact) {
        setShowHistory(false);
        setItems([]);
        setErr("");
        setShowAuthHint(false);
        setFiltersOpen(false);
      } else {
        handleClose();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [useCompact]);

  /* ===== Clavier (overlay & compact) ===== */
  const filteredRoutes = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const base = Array.isArray(routeItems) ? routeItems : [];
    if (!ql) return base.slice(0, 20);
    return base.filter(it => {
      const L = (it.label || "").toLowerCase();
      const S = (it.section || "").toLowerCase();
      const P = (it.path || "").toLowerCase();
      return L.includes(ql) || S.includes(ql) || P.includes(ql);
    }).slice(0, 50);
  }, [q, routeItems]);

  const totalItems = mode === "articles"
    ? (showHistory ? searchHistory.length : items.length)
    : filteredRoutes.length;

  const listRefScrollIntoView = useCallback((idx) => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector(`[data-idx="${idx}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const lr = list.getBoundingClientRect();
    if (r.top < lr.top) list.scrollTop -= lr.top - r.top + 4;
    else if (r.bottom > lr.bottom) list.scrollTop += r.bottom - lr.bottom + 4;
  }, []);

  const onKeyDown = (e) => {
    const active = useCompact || open;
    if (!active) return;
    if (!totalItems && !(mode === "articles" && showHistory)) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => {
        const nh = (h + 1 + totalItems) % totalItems;
        setTimeout(() => listRefScrollIntoView(nh), 0);
        return nh;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => {
        const nh = (h - 1 + totalItems) % totalItems;
        setTimeout(() => listRefScrollIntoView(nh), 0);
        return nh;
      });
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
      setTimeout(() => listRefScrollIntoView(0), 0);
    } else if (e.key === "End") {
      e.preventDefault();
      const last = totalItems - 1;
      setHighlight(last);
      setTimeout(() => listRefScrollIntoView(last), 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (disabled) { setShowAuthHint(true); return onRequireAuth(); }

      if (mode === "routes") {
        const target = filteredRoutes[highlight] || filteredRoutes[0];
        if (target) goToRoute(target, e.ctrlKey || e.metaKey);
        return;
      }

      // mode articles
      if (showHistory && searchHistory[highlight]) {
        const historyItem = searchHistory[highlight];
        setQ(historyItem.query);
        doSearch(historyItem.query);
      } else if (!showHistory && items[highlight]) {
        const newTab = e.ctrlKey || e.metaKey;
        goToArticle(items[highlight], newTab);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (useCompact) {
        setShowHistory(false);
        setItems([]);
        setErr("");
        setShowAuthHint(false);
        setFiltersOpen(false);
      } else {
        handleClose();
      }
    }
  };

  /* ===== Navigation ===== */
  const goToArticle = (it, newTab = false) => {
    if (disabled) { setShowAuthHint(true); return onRequireAuth(); }
    const href = articleRoute(it._raw) || articleRoute(it) || null;
    if (href) {
      if (useCompact) setShowHistory(false); else setOpen(false);
      setQ(""); setItems([]);
      if (newTab) window.open(href, "_blank", "noopener,noreferrer");
      else navigate(href);
    }
  };
  const goToRoute = (item, newTab = false) => {
    if (!item?.path) return;
    if (useCompact) setShowHistory(false); else setOpen(false);
    setQ(""); setItems([]);
    if (newTab) window.open(item.path, "_blank", "noopener,noreferrer");
    else navigate(item.path);
  };

  /* ===== Ouvrir / fermer (overlay) ===== */
  const openAndFocus = () => {
    if (disabled) { setShowAuthHint(true); return onRequireAuth(); }
    if (useCompact) {
      setShowHistory(!hasQuery && hasHistory && mode === "articles");
      setTimeout(() => inputRef.current?.focus(), 60);
      return;
    }
    setOpen(true);
    setShowHistory(!hasQuery && hasHistory && mode === "articles");
    setTimeout(() => inputRef.current?.focus(), 60);
  };
  const handleClose = () => {
    setOpen(false);
    setShowHistory(false);
    setQ("");
    setItems([]);
    setErr("");
    setHighlight(-1);
    setShowAuthHint(false);
    setFiltersOpen(false);
    setCategory("");
    setDateFrom("");
    setDateTo("");
  };

  /* ===== ARIA ids ===== */
  const listboxId = "article-search-listbox";
  const activeId = highlight >= 0 ? `article-option-${highlight}` : undefined;

  const allCategories = useMemo(() => {
    const set = new Set(items.map(i => i.category).filter(Boolean));
    return Array.from(set);
  }, [items]);

  /* ===================== RENDER – COMPACT ===================== */
  if (useCompact) {
    return (
      <div
        ref={rootRef}
        className={`relative ${className} flex justify-center w-full`}
        onKeyDown={onKeyDown}
      >
        <div className="relative w-full max-w-[360px]">
          <FontAwesomeIcon
            icon={disabled ? faLock : (mode === "routes" ? faSitemap : faSearch)}
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${disabled ? "text-white/80" : "text-white/70"}`}
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              if (disabled) { setShowAuthHint(true); return onRequireAuth(); }
              setQ(e.target.value);
              setHighlight(-1);
              setShowHistory(!e.target.value.trim() && hasHistory && mode === "articles");
            }}
            onFocus={() => {
              if (disabled) { setShowAuthHint(true); return onRequireAuth(); }
              if (!hasQuery && hasHistory && mode === "articles") setShowHistory(true);
            }}
            readOnly={disabled}
            placeholder={disabled ? "Connexion requise pour rechercher" : (mode === "routes" ? "Rechercher une page…" : placeholder)}
            className={`w-full pl-10 pr-12 py-2 rounded-lg border transition
              ${disabled
                ? "bg-white/10 text-white/80 placeholder-white/80 border-white/25 cursor-pointer"
                : "bg-white/15 text-white placeholder-white/70 border-white/25 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20"}`}
            aria-label="Rechercher"
            aria-controls={listboxId}
            aria-activedescendant={activeId}
            onClick={() => { if (disabled) { setShowAuthHint(true); onRequireAuth(); } }}
          />
          {/* Toggle mode */}
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
            <button
              className={`text-[11px] px-2 py-1 rounded ${mode==='articles'?'bg-white/90 text-blue-700':'bg-white/15 text-white/85'} border border-white/30`}
              onClick={() => setMode('articles')}
              title="Articles"
            >Art.</button>
            <button
              className={`text-[11px] px-2 py-1 rounded ${mode==='routes'?'bg-white/90 text-blue-700':'bg-white/15 text-white/85'} border border-white/30`}
              onClick={() => setMode('routes')}
              title="Navigation"
            >Nav.</button>
          </div>

          {!!q && !disabled && (
            <button
              className="absolute right-16 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition p-1"
              onClick={() => {
                setQ("");
                setItems([]);
                setHighlight(-1);
                setShowHistory(hasHistory && mode==='articles');
              }}
              aria-label="Effacer"
              title="Effacer"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}

          {/* ⭐ Bulle login */}
          {disabled && showAuthHint && (
            <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-[96%] bg-white/95 text-blue-900 border border-blue-200 rounded-xl shadow-lg p-3 z-[9999]">
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-full bg-blue-50 p-2 border border-blue-100">
                  <FontAwesomeIcon icon={faLock} />
                </div>
                <div className="text-sm">
                  <div className="font-semibold">Connectez-vous pour utiliser la recherche</div>
                  <div className="text-blue-700/80 text-xs">Accédez aux articles et à votre historique.</div>
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => onRequireAuth()}
                >
                  <FontAwesomeIcon icon={faRightToBracket} />
                  Se connecter
                </button>
              </div>
            </div>
          )}
        </div>

        {(showHistory || hasQuery) && !disabled && createPortal(
          <div
            ref={overlayRef}
            className="fixed left-1/2 -translate-x-1/2 w-[96vw] max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 z-[9998] search-drawer-enter"
            style={{ top: navbarHeightPx + 8 }}
            role="listbox"
            id={listboxId}
          >
            {/* Header + toggle + bouton filtres */}
            <div className="px-4 py-2 text-xs text-gray-600 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  className={`px-2 py-1 rounded-full ${mode==='articles'?'bg-blue-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={()=> setMode('articles')}
                >
                  Articles
                </button>
                <button
                  className={`px-2 py-1 rounded-full ${mode==='routes'?'bg-blue-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={()=> setMode('routes')}
                >
                  Navigation
                </button>
              </div>
              {mode==='articles' && !showHistory && (
                <button
                  className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800"
                  onClick={() => setFiltersOpen(v => !v)}
                >
                  <FontAwesomeIcon icon={faFilter} />
                  Filtres
                  <FontAwesomeIcon icon={faChevronDown} className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {/* Filtres (articles) */}
            {mode==='articles' && !showHistory && filtersOpen && (
              <div className="px-4 py-3 border-b bg-white grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select value={category} onChange={(e)=> setCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Toutes catégories</option>
                  {allCategories.map((c)=> <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="date" value={dateFrom} onChange={(e)=> setDateFrom(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Du" />
                <input type="date" value={dateTo}   onChange={(e)=> setDateTo(e.target.value)}   className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Au" />
              </div>
            )}

            <div ref={listRef} className="max-h-[70vh] overflow-auto">
              {/* Historique (articles uniquement) */}
              {mode==='articles' && showHistory && hasHistory && (
                <ul className="divide-y divide-gray-100">
                  {searchHistory.map((item, idx) => (
                    <li
                      key={item.id}
                      id={`article-option-${idx}`}
                      role="option"
                      aria-selected={highlight === idx}
                      data-idx={idx}
                      className={`px-4 py-3 cursor-pointer transition ${
                        highlight === idx ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                      onMouseEnter={() => setHighlight(idx)}
                      onMouseLeave={() => setHighlight(-1)}
                      onClick={() => {
                        setQ(item.query);
                        setShowHistory(false);
                        doSearch(item.query);
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 truncate">
                          <FontAwesomeIcon icon={faClock} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate">{item.query}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>{formatTimeAgo(item.timestamp)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const nh = removeFromSearchHistory(item.id);
                              setSearchHistory(nh);
                            }}
                            className="text-gray-300 hover:text-gray-500"
                            title="Supprimer"
                            aria-label="Supprimer"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                  <li className="px-4 py-2">
                    <button
                      onClick={() => { clearSearchHistory(); setSearchHistory([]); setShowHistory(false); }}
                      className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                      Tout effacer
                    </button>
                  </li>
                </ul>
              )}

              {/* Résultats */}
              {mode==='articles' ? (
                <>
                  {loading && (
                    <ul className="divide-y divide-gray-100">
                      {Array.from({ length: Math.max(3, Math.min(perPage, 6)) }).map((_, i) => (
                        <li key={i} className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded bg-gray-100 animate-pulse" />
                            <div className="flex-1">
                              <div className="h-4 bg-gray-100 rounded w-3/4 mb-2 animate-pulse" />
                              <div className="h-3 bg-gray-100 rounded w-1/3 mb-1 animate-pulse" />
                              <div className="h-3 bg-gray-100 rounded w-5/6 animate-pulse" />
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {err && !loading && (
                    <div className="px-4 py-6 text-center text-red-600">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <FontAwesomeIcon icon={faExclamationTriangle} />
                        <span>{err}</span>
                      </div>
                      <button
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 transition"
                        onClick={() => doSearch(q.trim())}
                      >
                        <FontAwesomeIcon icon={faArrowRotateRight} />
                        Réessayer
                      </button>
                    </div>
                  )}

                  {!loading && hasQuery && items.length === 0 && !err && (
                    <div className="px-4 py-8 text-gray-500 text-center">
                      <div className="text-gray-400 mb-3">
                        <FontAwesomeIcon icon={faSearch} size="lg" />
                      </div>
                      Aucun résultat pour "<span className="text-gray-900 font-medium">{q}</span>"
                    </div>
                  )}

                  {hasArticleResults && (
                    <ul className="divide-y divide-gray-100">
                      {items.map((it, idx) => (
                        <li
                          key={it.id ?? `${it.slug}-${idx}`}
                          id={`article-option-${idx}`}
                          role="option"
                          aria-selected={highlight === idx}
                          data-idx={idx}
                          className={`px-4 py-3 cursor-pointer transition ${
                            highlight === idx
                              ? "bg-blue-50 border-l-4 border-blue-500"
                              : "hover:bg-gray-50 hover:border-l-4 hover:border-blue-300"
                          }`}
                          onMouseEnter={() => setHighlight(idx)}
                          onMouseLeave={() => setHighlight(-1)}
                          onClick={(e) => goToArticle(it, e.ctrlKey || e.metaKey)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 flex-shrink-0 rounded bg-gray-100 overflow-hidden border">
                              {it.image ? (
                                <img src={it.image} alt={it.title} loading="lazy" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 bg-gray-50">
                                  <FontAwesomeIcon icon={faSearch} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[15px] font-medium text-gray-900 line-clamp-2 mb-1">{it.title}</div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-0.5">
                                {it.category && <span className="truncate">{it.category}</span>}
                                {it.category && <span aria-hidden="true">•</span>}
                                {it.published_at && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700" title={fullDateTooltip(it.published_at)}>
                                    {formatDate(it.published_at)}
                                  </span>
                                )}
                                {it.published_at && (
                                  <span className="ml-1 text-[11px] text-gray-400">
                                    {formatTimeAgo(Date.parse(it.published_at))}
                                  </span>
                                )}
                              </div>
                              {it.excerpt && <div className="text-xs text-gray-500 line-clamp-2">{it.excerpt}</div>}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                // === Mode ROUTES ===
                <ul className="divide-y divide-gray-100">
                  {filteredRoutes.length === 0 ? (
                    <li className="px-4 py-6 text-center text-gray-500">Aucune route trouvée</li>
                  ) : filteredRoutes.map((r, idx) => (
                    <li
                      key={`${r.path}-${idx}`}
                      data-idx={idx}
                      className={`px-4 py-3 cursor-pointer transition ${
                        highlight === idx ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                      onMouseEnter={() => setHighlight(idx)}
                      onMouseLeave={() => setHighlight(-1)}
                      onClick={(e)=> goToRoute(r, e.ctrlKey || e.metaKey)}
                      role="option"
                      id={`article-option-${idx}`}
                      aria-selected={highlight === idx}
                      title={r.path}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded bg-blue-50 border border-blue-100 grid place-items-center text-blue-600">
                          <FontAwesomeIcon icon={faSitemap} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">{r.label}</div>
                          <div className="text-[11px] text-gray-500 truncate">{r.section || "Navigation"} • {r.path}</div>
                        </div>
                        <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-gray-400" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* Styles compacts supplémentaires */}
        <style>{`
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          .search-drawer-enter { animation: fadeIn .2s ease-out }
        `}</style>
      </div>
    );
  }

  /* ===================== RENDER – OVERLAY ===================== */
  const overlay = open ? (
    <div ref={overlayRef}>
      <div className="fixed inset-0 z-[9999] animate-fadeIn">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={handleClose} />
        <div
          className="absolute top-8 left-1/2 -translate-x-1/2 w-[95vw] max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
          role="dialog"
          aria-label="Recherche"
          onKeyDown={onKeyDown}
        >
          {/* Header: champ + onglets + filtres */}
          <div className="p-4 border-b border-gray-100 bg-white">
            <div className="relative" role="combobox" aria-expanded={true} aria-owns="article-search-listbox" aria-haspopup="listbox">
              <FontAwesomeIcon
                icon={mode === "routes" ? faSitemap : faSearch}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setHighlight(-1);
                  if (mode === "articles") setShowHistory(!e.target.value.trim() && hasHistory);
                }}
                onFocus={() => { if (mode === "articles" && !hasQuery && hasHistory) setShowHistory(true); }}
                placeholder={mode === "routes" ? "Rechercher une page…" : placeholder}
                className="w-full pl-12 pr-20 py-4 border-0 focus:outline-none focus:ring-0 text-lg bg-transparent placeholder-gray-400 text-gray-900"
                aria-label="Saisissez votre recherche"
                aria-controls="article-search-listbox"
                aria-activedescendant={activeId}
                autoFocus
              />
              {!!q && (
                <button
                  className="absolute right-14 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-2"
                  onClick={() => {
                    setQ("");
                    setItems([]);
                    setHighlight(-1);
                    setShowHistory(hasHistory && mode==='articles');
                  }}
                  aria-label="Effacer"
                  title="Effacer"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}

              {/* Onglets */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button
                  className={`text-[12px] px-2 py-1 rounded ${mode==='articles'?'bg-blue-600 text-white':'bg-gray-100 text-gray-700'} border`}
                  onClick={()=> setMode('articles')}
                  title="Articles"
                >Articles</button>
                <button
                  className={`text-[12px] px-2 py-1 rounded ${mode==='routes'?'bg-blue-600 text-white':'bg-gray-100 text-gray-700'} border`}
                  onClick={()=> setMode('routes')}
                  title="Navigation"
                >Navigation</button>
              </div>
            </div>

            {/* Raccourcis + bouton filtres */}
            <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-4 px-1 justify-between">
              <div className="flex items-center gap-4">
                <span>Entrée: ouvrir</span>
                <span>Ctrl/Cmd+Entrée: nouvel onglet</span>
                <span>↑/↓ Home/End: naviguer</span>
                <span>Échap: fermer</span>
              </div>
              {mode==='articles' && !showHistory && (
                <button
                  onClick={() => setFiltersOpen(v => !v)}
                  className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800"
                  title="Afficher les filtres"
                >
                  <FontAwesomeIcon icon={faFilter} />
                  Filtres
                  <FontAwesomeIcon icon={faChevronDown} className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          </div>

          {/* Panneau filtres (articles) */}
          {mode==='articles' && !showHistory && filtersOpen && (
            <div className="px-4 py-3 border-b bg-white grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select value={category} onChange={(e)=> setCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Toutes catégories</option>
                {allCategories.map((c)=> <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="date" value={dateFrom} onChange={(e)=> setDateFrom(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Du" />
              <input type="date" value={dateTo}   onChange={(e)=> setDateTo(e.target.value)}   className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Au" />
            </div>
          )}

          {/* Liste */}
          <div ref={listRef} id="article-search-listbox" role="listbox" className="max-h-[70vh] overflow-auto">
            {/* Historique */}
            {mode==='articles' && showHistory && hasHistory && (
              <div>
                <div className="flex items-center justify-between px-6 py-3 bg-gray-50">
                  <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                    <FontAwesomeIcon icon={faHistory} className="text-gray-500" />
                    <span>Recherches récentes</span>
                  </div>
                  <button
                    onClick={() => { clearSearchHistory(); setSearchHistory([]); setShowHistory(false); }}
                    className="text-sm text-gray-500 hover:text-gray-700 transition flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faTrash} size="sm" />
                    Tout effacer
                  </button>
                </div>
                <ul className="divide-y divide-gray-100">
                  {searchHistory.map((item, idx) => (
                    <li
                      key={item.id}
                      id={`article-option-${idx}`}
                      role="option"
                      aria-selected={highlight === idx}
                      data-idx={idx}
                      className={`px-6 py-4 cursor-pointer transition ${
                        highlight === idx ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                      onMouseEnter={() => setHighlight(idx)}
                      onMouseLeave={() => setHighlight(-1)}
                      onClick={() => {
                        setQ(item.query);
                        setShowHistory(false);
                        doSearch(item.query);
                        inputRef.current?.focus();
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <FontAwesomeIcon icon={faClock} className="text-gray-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-base text-gray-900 truncate font-medium">{item.query}</div>
                            <div className="text-sm text-gray-400 mt-1">{formatTimeAgo(item.timestamp)}</div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const nh = removeFromSearchHistory(item.id);
                            setSearchHistory(nh);
                          }}
                          className="text-gray-300 hover:text-gray-500 p-2 ml-2"
                          aria-label="Supprimer de l'historique"
                          title="Supprimer"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Résultats */}
            {mode==='articles' ? (
              <div>
                {loading && (
                  <ul className="divide-y divide-gray-100">
                    {Array.from({ length: Math.max(3, Math.min(perPage, 6)) }).map((_, i) => (
                      <li key={i} className="px-6 py-4">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-lg bg-gray-100 animate-pulse" />
                          <div className="flex-1">
                            <div className="h-4 bg-gray-100 rounded w-3/4 mb-2 animate-pulse" />
                            <div className="h-3 bg-gray-100 rounded w-1/3 mb-2 animate-pulse" />
                            <div className="h-3 bg-gray-100 rounded w-5/6 animate-pulse" />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {err && !loading && (
                  <div className="px-6 py-8 text-center text-red-600">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <FontAwesomeIcon icon={faExclamationTriangle} />
                      <span>{err}</span>
                    </div>
                    <button
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 transition"
                      onClick={() => doSearch(q.trim())}
                    >
                      <FontAwesomeIcon icon={faArrowRotateRight} />
                      Réessayer
                    </button>
                  </div>
                )}

                {!loading && hasQuery && items.length === 0 && !err && (
                  <div className="px-6 py-12 text-gray-500 text-center">
                    <div className="text-gray-400 mb-4">
                      <FontAwesomeIcon icon={faSearch} size="2x" />
                    </div>
                    <div className="text-lg">
                      Aucun résultat pour "<span className="text-gray-900 font-medium">{q}</span>"
                    </div>
                    <div className="text-sm text-gray-400 mt-2">Essayez avec d'autres termes</div>
                  </div>
                )}

                {hasArticleResults && (
                  <ul className="divide-y divide-gray-100">
                    {items.map((it, idx) => (
                      <li
                        key={it.id ?? `${it.slug}-${idx}`}
                        id={`article-option-${idx}`}
                        role="option"
                        aria-selected={highlight === idx}
                        data-idx={idx}
                        className={`px-6 py-4 cursor-pointer transition ${
                          highlight === idx
                            ? "bg-blue-50 transform scale-[1.02] shadow-sm border-l-4 border-blue-500"
                            : "hover:bg-gray-50 hover:transform hover:scale-[1.01] hover:border-l-4 hover:border-blue-300"
                        }`}
                        onMouseEnter={() => setHighlight(idx)}
                        onMouseLeave={() => setHighlight(-1)}
                        onClick={(e) => goToArticle(it, e.ctrlKey || e.metaKey)}
                        title="Entrée pour ouvrir, Ctrl/Cmd+Entrée: nouvel onglet"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                            {it.image ? (
                              <img src={it.image} alt={it.title} loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 bg-gray-50">
                                <FontAwesomeIcon icon={faSearch} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-lg font-medium text-gray-900 line-clamp-2 mb-2">{it.title}</div>

                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                              {it.category && <span className="truncate">{it.category}</span>}
                              {it.category && <span aria-hidden="true">•</span>}
                              {it.published_at && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700"
                                  title={fullDateTooltip(it.published_at)}
                                >
                                  {formatDate(it.published_at)}
                                </span>
                              )}
                              {it.published_at && (
                                <span className="ml-1 text-[11px] text-gray-400">
                                  {formatTimeAgo(Date.parse(it.published_at))}
                                </span>
                              )}
                            </div>

                            {it.excerpt && (
                              <div className="text-sm text-gray-500 line-clamp-2">{it.excerpt}</div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              // === Mode ROUTES ===
              <ul className="divide-y divide-gray-100">
                {filteredRoutes.length === 0 ? (
                  <li className="px-6 py-10 text-center text-gray-500">Aucune route trouvée</li>
                ) : filteredRoutes.map((r, idx) => (
                  <li
                    key={`${r.path}-${idx}`}
                    data-idx={idx}
                    className={`px-6 py-4 cursor-pointer transition ${
                      highlight === idx ? "bg-blue-50 transform scale-[1.01]" : "hover:bg-gray-50"
                    }`}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseLeave={() => setHighlight(-1)}
                    onClick={(e)=> goToRoute(r, e.ctrlKey || e.metaKey)}
                    role="option"
                    id={`article-option-${idx}`}
                    aria-selected={highlight === idx}
                    title={r.path}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-lg bg-blue-50 border border-blue-100 grid place-items-center text-blue-600">
                        <FontAwesomeIcon icon={faSitemap} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-medium text-gray-900 truncate">{r.label}</div>
                        <div className="text-[12px] text-gray-500 truncate">{r.section || "Navigation"} • {r.path}</div>
                      </div>
                      <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-gray-400" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Animations minimales */}
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .animate-fadeIn { animation: fadeIn .28s ease-out forwards }
      `}</style>
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* Bouton loupe (navbar) */}
      <button
        className={`transition-all duration-300 p-2 rounded-full hover:scale-110 ${
          disabled
            ? "text-white/80 hover:text-white/90 hover:bg-white/10"
            : "text-white hover:text-blue-200 hover:bg-white/10"
        }`}
        onClick={() => (disabled ? (setShowAuthHint(true), onRequireAuth()) : openAndFocus())}
        aria-label={disabled ? "Connexion requise" : "Ouvrir la recherche (Ctrl/Cmd+K)"}
        title={disabled ? "Connexion requise" : "Recherche (Ctrl/Cmd+K)"}
      >
        <FontAwesomeIcon icon={disabled ? faLock : (mode === "routes" ? faSitemap : faSearch)} className="text-lg" />
      </button>

      {/* Tooltip incitation si désactivé */}
      {disabled && showAuthHint && (
        <div className="absolute right-0 mt-2 w-72 bg-white/95 text-blue-900 border border-blue-200 rounded-xl shadow-xl p-3 z-[9999]">
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-full bg-blue-50 p-2 border border-blue-100">
              <FontAwesomeIcon icon={faLock} />
            </div>
            <div className="text-sm">
              <div className="font-semibold">Connectez-vous pour rechercher</div>
              <div className="text-blue-700/80 text-xs">Découvrez les articles et votre historique.</div>
              <button
                className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => onRequireAuth()}
              >
                <FontAwesomeIcon icon={faRightToBracket} />
                Se connecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay plein écran via Portal */}
      {open && !disabled && createPortal(overlay, document.body)}
    </div>
  );
}
