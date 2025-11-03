import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faSpinner,
  faTimes,
  faHistory,
  faClock,
  faTrash,
  faExclamationTriangle,
  faArrowRotateRight,
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
  } catch (e) {}
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
    clear() {
      map.clear();
    },
  };
}
const queryCache = createLRU();

/* ====== API search ====== */
async function searchArticles(query, signal, perPage = 8) {
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

  try {
    const j = await tryFetch(`${API_BASE_URL}/articles/search`, { q: query, per_page: perPage });
    return parsePayload(j);
  } catch {}
  try {
    const j = await tryFetch(`${API_BASE_URL}/articles`, { q: query, per_page: perPage });
    return parsePayload(j);
  } catch {}
  try {
    const j = await tryFetch(`${API_BASE_URL}/search`, { q: query, type: "articles", per_page: perPage });
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
}) {
  const navigate = useNavigate();
  const isCompact = useIsCompact();
  const useCompact = compactOnMobile && isCompact;

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [highlight, setHighlight] = useState(-1);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [animate, setAnimate] = useState(false);

  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const debRef = useRef(null);
  const listRef = useRef(null);

  const hasQuery = q.trim().length > 0;
  const hasResults = items.length > 0;
  const hasHistory = searchHistory.length > 0;

  /* ===== Charger l'historique ===== */
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  /* ===== Raccourcis globaux (désactivés en compact visible) ===== */
  useEffect(() => {
    if (useCompact) return; // en compact, le champ est visible; pas besoin d’ouvrir l’overlay
    const onKey = (e) => {
      const isInInput =
        ["INPUT", "TEXTAREA"].includes(e.target?.tagName) || e.target?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === hotkey) {
        e.preventDefault();
        openAndFocus();
        return;
      }
      if (openOnSlash && !open && !isInInput && e.key === "/") {
        e.preventDefault();
        openAndFocus();
        return;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, hotkey, openOnSlash, useCompact]);

  /* ===== Verrouillage scroll si overlay ouvert ===== */
  useEffect(() => {
    if (!open || useCompact) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, [open, useCompact]);

  /* ===== Recherche avec cache + debounce ===== */
  const doSearch = useCallback(
    async (query) => {
      const key = `${query}::${perPage}`;
      const cached = queryCache.get(key);
      if (cached) {
        setItems(cached);
        setErr("");
        setLoading(false);
        return;
      }
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setErr("");
      setShowHistory(false);

      try {
        const arr = await searchArticles(query, ctrl.signal, perPage);
        setItems(arr);
        queryCache.set(key, arr);
        if (arr.length > 0) {
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
    [perPage]
  );

  useEffect(() => {
    if (!hasQuery) {
      setItems([]);
      setLoading(false);
      setErr("");
      setShowHistory((useCompact || open) && hasHistory);
      return;
    }
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => doSearch(q.trim()), 300);
    return () => debRef.current && clearTimeout(debRef.current);
  }, [q, hasQuery, doSearch, open, hasHistory, useCompact]);

  /* ===== Clic extérieur ===== */
  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) {
        if (useCompact) {
          // en compact, on garde le champ visible, juste fermer la liste
          setShowHistory(false);
          setItems([]);
          setErr("");
        } else {
          setOpen(false);
          setShowHistory(false);
        }
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [useCompact]);

  /* ===== Clavier (overlay & compact) ===== */
  const totalItems = showHistory ? searchHistory.length : items.length;
  const scrollIntoView = useCallback((idx) => {
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
    if (!totalItems && !showHistory) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => {
        const nh = (h + 1 + totalItems) % totalItems;
        setTimeout(() => scrollIntoView(nh), 0);
        return nh;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => {
        const nh = (h - 1 + totalItems) % totalItems;
        setTimeout(() => scrollIntoView(nh), 0);
        return nh;
      });
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
      setTimeout(() => scrollIntoView(0), 0);
    } else if (e.key === "End") {
      e.preventDefault();
      const last = totalItems - 1;
      setHighlight(last);
      setTimeout(() => scrollIntoView(last), 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showHistory && searchHistory[highlight]) {
        const historyItem = searchHistory[highlight];
        setQ(historyItem.query);
        doSearch(historyItem.query);
      } else if (!showHistory && items[highlight]) {
        const newTab = e.ctrlKey || e.metaKey;
        goTo(items[highlight], newTab);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (useCompact) {
        setShowHistory(false);
        setItems([]);
        setErr("");
      } else {
        handleClose();
      }
    }
  };

  /* ===== Navigation ===== */
  const goTo = (it, newTab = false) => {
    const href = articleRoute(it._raw) || articleRoute(it) || null;
    if (href) {
      if (useCompact) {
        setShowHistory(false);
      } else {
        setOpen(false);
      }
      setQ("");
      setItems([]);
      if (newTab) window.open(href, "_blank", "noopener,noreferrer");
      else navigate(href);
    }
  };

  /* ===== Ouvrir / fermer (overlay) ===== */
  const openAndFocus = () => {
    if (useCompact) {
      // en compact, le champ est déjà visible : focus + dérouler l’historique
      setShowHistory(!hasQuery && hasHistory);
      setTimeout(() => inputRef.current?.focus(), 60);
      return;
    }
    setOpen(true);
    setAnimate(true);
    setShowHistory(!hasQuery && hasHistory);
    setTimeout(() => inputRef.current?.focus(), 60);
  };
  const handleClose = () => {
    setAnimate(false);
    setTimeout(() => {
      setOpen(false);
      setShowHistory(false);
      setQ("");
      setItems([]);
      setErr("");
      setHighlight(-1);
    }, 180);
  };

  /* ===== ARIA ids ===== */
  const listboxId = "article-search-listbox";
  const activeId = highlight >= 0 ? `article-option-${highlight}` : undefined;

  /* ===================== RENDER ===================== */
  if (useCompact) {
    // ✅ Variante COMPACTE : champ directement visible dans la navbar,
    // liste en "drawer" fixe sous la barre (top = navbarHeightPx)
    return (
      <div ref={rootRef} className={`relative ${className}`} onKeyDown={onKeyDown}>
        <div className="relative">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setHighlight(-1);
              setShowHistory(!e.target.value.trim() && hasHistory);
            }}
            onFocus={() => {
              if (!hasQuery && hasHistory) setShowHistory(true);
            }}
            placeholder={placeholder}
            className="w-[60vw] max-w-[340px] pl-10 pr-9 py-2 rounded-lg bg-white/15 text-white placeholder-white/70 border border-white/25 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition"
            aria-label="Rechercher un article"
            aria-controls={listboxId}
            aria-activedescendant={activeId}
          />
          {!!q && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition p-1"
              onClick={() => {
                setQ("");
                setItems([]);
                setHighlight(-1);
                setShowHistory(hasHistory);
                inputRef.current?.focus();
              }}
              aria-label="Effacer"
              title="Effacer"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>

        {(showHistory || hasQuery) && (
          <div
            className="fixed left-1/2 -translate-x-1/2 w-[96vw] max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 z-[9998]"
            style={{ top: navbarHeightPx + 8 }}
            role="listbox"
            id={listboxId}
          >
            {/* Bandeau titre */}
            <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b">
              {showHistory ? "Recherches récentes" : "Résultats"}
            </div>

            <div ref={listRef} className="max-h-[70vh] overflow-auto">
              {/* Historique */}
              {showHistory && hasHistory && (
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
                      onClick={() => {
                        clearSearchHistory();
                        setSearchHistory([]);
                        setShowHistory(false);
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                      Tout effacer
                    </button>
                  </li>
                </ul>
              )}

              {/* Résultats */}
              {!showHistory && (
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

                  {hasResults && (
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
                          onClick={(e) => goTo(it, e.ctrlKey || e.metaKey)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 flex-shrink-0 rounded bg-gray-100 overflow-hidden border">
                              {it.image ? (
                                <img
                                  src={it.image}
                                  alt={it.title}
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 bg-gray-50">
                                  <FontAwesomeIcon icon={faSearch} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[15px] font-medium text-gray-900 line-clamp-2 mb-1">
                                {it.title}
                              </div>
                              <div className="text-xs text-gray-500 mb-0.5">
                                {(it.category ? `${it.category} • ` : "") +
                                  (it.published_at ? formatDate(it.published_at) : "")}
                              </div>
                              {it.excerpt && (
                                <div className="text-xs text-gray-500 line-clamp-2">
                                  {it.excerpt}
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Styles compacts supplémentaires */}
        <style jsx>{`
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          .search-drawer-enter { animation: fadeIn .2s ease-out }
        `}</style>
      </div>
    );
  }

  /* ======== Version OVERLAY (desktop & mobile non-compact) ======== */
  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* Bouton loupe (navbar) */}
      <button
        className="text-white hover:text-blue-200 transition-all duration-300 p-2 rounded-full hover:bg-white/10 hover:scale-110"
        onClick={openAndFocus}
        aria-label="Ouvrir la recherche (Ctrl/Cmd+K)"
        title="Recherche (Ctrl/Cmd+K)"
      >
        <FontAwesomeIcon icon={faSearch} className="text-lg" />
      </button>

      {/* Overlay plein écran */}
      {open && (
        <div className={`fixed inset-0 z-[9999] animate-fadeIn`}>
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={handleClose}
          />
          <div
            className="absolute top-8 left-1/2 -translate-x-1/2 w-[95vw] max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
            role="dialog"
            aria-label="Recherche d’articles"
            onKeyDown={onKeyDown}
          >
            {/* Barre recherche */}
            <div className="p-4 border-b border-gray-100 bg-white">
              <div className="relative" role="combobox" aria-expanded={true} aria-owns="article-search-listbox" aria-haspopup="listbox">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setHighlight(-1);
                    setShowHistory(!e.target.value.trim() && hasHistory);
                  }}
                  onFocus={() => {
                    if (!hasQuery && hasHistory) setShowHistory(true);
                  }}
                  placeholder={placeholder}
                  className="w-full pl-12 pr-12 py-4 border-0 focus:outline-none focus:ring-0 text-lg bg-transparent placeholder-gray-400 text-gray-900"
                  aria-label="Saisissez votre recherche"
                  aria-controls="article-search-listbox"
                  aria-activedescendant={activeId}
                  autoFocus
                />
                {!!q && (
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-2"
                    onClick={() => {
                      setQ("");
                      setItems([]);
                      setHighlight(-1);
                      setShowHistory(hasHistory);
                      inputRef.current?.focus();
                    }}
                    aria-label="Effacer"
                    title="Effacer"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                )}
              </div>

              <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-4 px-1">
                <span>Entrée: ouvrir</span>
                <span>Ctrl/Cmd+Entrée: nouvel onglet</span>
                <span>↑/↓ Home/End: naviguer</span>
                <span>Échap: fermer</span>
              </div>
            </div>

            {/* Liste */}
            <div ref={listRef} id="article-search-listbox" role="listbox" className="max-h-[70vh] overflow-auto">
              {/* Historique */}
              {showHistory && hasHistory && (
                <div>
                  <div className="flex items-center justify-between px-6 py-3 bg-gray-50">
                    <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                      <FontAwesomeIcon icon={faHistory} className="text-gray-500" />
                      <span>Recherches récentes</span>
                    </div>
                    <button
                      onClick={() => {
                        clearSearchHistory();
                        setSearchHistory([]);
                        setShowHistory(false);
                      }}
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
                          doSearch(item.query);
                          inputRef.current?.focus();
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <FontAwesomeIcon icon={faClock} className="text-gray-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-base text-gray-900 truncate font-medium">
                                {item.query}
                              </div>
                              <div className="text-sm text-gray-400 mt-1">
                                {formatTimeAgo(item.timestamp)}
                              </div>
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
              {!showHistory && (
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

                  {hasResults && (
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
                          onClick={(e) => goTo(it, e.ctrlKey || e.metaKey)}
                          title="Entrée pour ouvrir, Ctrl/Cmd+Entrée: nouvel onglet"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                              {it.image ? (
                                <img
                                  src={it.image}
                                  alt={it.title}
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 bg-gray-50">
                                  <FontAwesomeIcon icon={faSearch} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-lg font-medium text-gray-900 line-clamp-2 mb-2">
                                {it.title}
                              </div>
                              <div className="text-sm text-gray-500 mb-1">
                                {(it.category ? `${it.category} • ` : "") +
                                  (it.published_at ? formatDate(it.published_at) : "")}
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
              )}
            </div>
          </div>

          {/* Animations minimales */}
          <style jsx>{`
            @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
            .animate-fadeIn { animation: fadeIn .28s ease-out forwards }
          `}</style>
        </div>
      )}
    </div>
  );
}
