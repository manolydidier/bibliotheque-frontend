// src/components/search/ArticleSearchBox.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faSearch, 
  faSpinner, 
  faTimes, 
  faHistory,
  faClock,
  faTrash
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

const getTokenGuard = () => {
  try {
    return (
      (typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem("tokenGuard")) ||
      (typeof localStorage !== "undefined" &&
        localStorage.getItem("tokenGuard")) ||
      null
    );
  } catch {
    return null;
  }
};

const toStorageUrl = (p) => {
  if (!p) return "";
  const s = String(p).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const base = (API_BASE_STORAGE || API_BASE_URL.replace(/\/api(?:\/.*)?$/i, "")).replace(/\/+$/, "");
  const rel =
    s.startsWith("storage/")
      ? s.replace(/^\/+/, "")
      : `storage/${s.replace(/^\/+/, "")}`;
  return `${base}/${rel}`;
};

const articleRoute = (a) => {
  const slug = a?.slug || a?.article_slug || null;
  return slug ? `/articles/${slug}` : (a?.id ? `/articles/${a.id}` : null);
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
    return d.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
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
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short"
  });
};

/* ===== Gestion de l'historique ===== */
const SEARCH_HISTORY_KEY = "article_search_history";
const MAX_HISTORY_ITEMS = 10;

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
  } catch (error) {
    console.warn("Impossible de sauvegarder l'historique:", error);
  }
};

const addToSearchHistory = (query) => {
  if (!query.trim()) return;
  
  const history = getSearchHistory();
  const normalizedQuery = query.trim().toLowerCase();
  
  // Retirer les doublons et l'ancienne occurrence
  const filteredHistory = history.filter(
    item => item.query.toLowerCase() !== normalizedQuery
  );
  
  // Ajouter la nouvelle recherche en tête
  const newHistory = [
    {
      query: query.trim(),
      timestamp: Date.now(),
      id: Date.now().toString()
    },
    ...filteredHistory
  ].slice(0, MAX_HISTORY_ITEMS);
  
  saveSearchHistory(newHistory);
};

const removeFromSearchHistory = (id) => {
  const history = getSearchHistory();
  const filteredHistory = history.filter(item => item.id !== id);
  saveSearchHistory(filteredHistory);
  return filteredHistory;
};

const clearSearchHistory = () => {
  saveSearchHistory([]);
};

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
    const arr =
      Array.isArray(json) ? json
      : Array.isArray(json?.data) ? json.data
      : Array.isArray(json?.results) ? json.results
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
    const j = await tryFetch(`${API_BASE_URL}/articles/search`, {
      q: query,
      per_page: perPage,
    });
    return parsePayload(j);
  } catch {}
  try {
    const j = await tryFetch(`${API_BASE_URL}/articles`, {
      q: query,
      per_page: perPage,
    });
    return parsePayload(j);
  } catch {}
  try {
    const j = await tryFetch(`${API_BASE_URL}/search`, {
      q: query,
      type: "articles",
      per_page: perPage,
    });
    return parsePayload(j);
  } catch {
    return [];
  }
}

/* ================= Component ================= */
export default function ArticleSearchBox({
  placeholder = "Rechercher…",
  perPage = 8,
  className = "",
}) {
  const navigate = useNavigate();
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

  const hasQuery = q.trim().length > 0;
  const hasResults = items.length > 0;
  const hasHistory = searchHistory.length > 0;

  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  const doSearch = useCallback(
    (query) => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setErr("");
      setShowHistory(false);
      
      searchArticles(query, ctrl.signal, perPage)
        .then((arr) => {
          setItems(arr);
          if (arr.length > 0) {
            addToSearchHistory(query);
            setSearchHistory(getSearchHistory());
          }
        })
        .catch(() => setErr("Erreur de recherche"))
        .finally(() => {
          setLoading(false);
          abortRef.current = null;
        });
    },
    [perPage]
  );

  useEffect(() => {
    if (!hasQuery) {
      setItems([]);
      setLoading(false);
      setErr("");
      setShowHistory(open && hasHistory);
      return;
    }
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => doSearch(q.trim()), 350);
    return () => debRef.current && clearTimeout(debRef.current);
  }, [q, hasQuery, doSearch, open, hasHistory]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) {
        setOpen(false);
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onKeyDown = (e) => {
    if (!open) return;
    
    const totalItems = showHistory ? searchHistory.length : items.length;
    if (!totalItems) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % totalItems);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + totalItems) % totalItems);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showHistory && searchHistory[highlight]) {
        const historyItem = searchHistory[highlight];
        setQ(historyItem.query);
        doSearch(historyItem.query);
      } else if (!showHistory && items[highlight]) {
        goTo(items[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setShowHistory(false);
    }
  };

  const goTo = (it) => {
    const href = articleRoute(it._raw) || articleRoute(it) || null;
    if (href) {
      setOpen(false);
      setShowHistory(false);
      setQ("");
      setItems([]);
      navigate(href);
    }
  };

  const openAndFocus = () => {
    setOpen(true);
    setAnimate(true);
    setShowHistory(!hasQuery && hasHistory);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClose = () => {
    setAnimate(false);
    setTimeout(() => {
      setOpen(false);
      setShowHistory(false);
      setQ("");
      setItems([]);
    }, 200);
  };

  const handleHistoryItemClick = (historyItem) => {
    setQ(historyItem.query);
    doSearch(historyItem.query);
    inputRef.current?.focus();
  };

  const handleRemoveHistoryItem = (e, id) => {
    e.stopPropagation();
    const newHistory = removeFromSearchHistory(id);
    setSearchHistory(newHistory);
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
    setShowHistory(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* Bouton loupe seule - toujours dans la navbar */}
      <button
        className="text-white hover:text-blue-200 transition-all duration-300 p-2 rounded-full hover:bg-white/10 hover:scale-110"
        onClick={openAndFocus}
        aria-label="Recherche"
      >
        <FontAwesomeIcon icon={faSearch} className="text-lg" />
      </button>

      {/* Overlay complet pour la recherche déployée - HORS de la navbar */}
      {open && (
        <div className={`fixed inset-0 z-[9999] ${animate ? 'animate-fadeIn' : 'animate-fadeOut'}`}>
          {/* Overlay de fond avec animation */}
          <div 
            className={`absolute inset-0 transition-all duration-500 ${
              animate 
                ? 'bg-black/40 backdrop-blur-md' 
                : 'bg-black/30 backdrop-blur-sm'
            }`}
            onClick={handleClose}
          />
          
          {/* Conteneur principal de recherche - avec animation d'échelle et de slide */}
          <div 
            className={`absolute top-8 left-1/2 transform -translate-x-1/2 w-[95vw] max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 ${
              animate 
                ? 'animate-searchSlideIn scale-100 opacity-100' 
                : 'animate-searchSlideOut scale-95 opacity-0'
            }`}
          >
            {/* Barre de recherche en haut */}
            <div className="p-4 border-b border-gray-100 bg-white">
              <div className="relative">
                <FontAwesomeIcon 
                  icon={faSearch} 
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 transition-colors duration-300" 
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
                    if (!hasQuery && hasHistory) {
                      setShowHistory(true);
                    }
                  }}
                  placeholder={placeholder}
                  className="w-full pl-12 pr-12 py-4 border-0 focus:outline-none focus:ring-0 text-lg bg-transparent placeholder-gray-400 text-gray-900 transition-colors duration-300"
                  aria-label="Saisissez votre recherche"
                  autoFocus
                />
                {!!q && (
                  <button
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-300 p-2 hover:scale-110"
                    onClick={() => {
                      setQ("");
                      setItems([]);
                      setHighlight(-1);
                      setShowHistory(hasHistory);
                      inputRef.current?.focus();
                    }}
                    aria-label="Effacer"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                )}
              </div>
            </div>

            {/* Contenu déroulant des résultats */}
            <div 
              className="max-h-[70vh] overflow-auto transition-all duration-300"
              onKeyDown={onKeyDown}
            >
              {/* Historique */}
              {showHistory && hasHistory && (
                <div className="animate-fadeInUp">
                  <div className="flex items-center justify-between px-6 py-3 bg-gray-50">
                    <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                      <FontAwesomeIcon icon={faHistory} className="text-gray-500" />
                      <span>Recherches récentes</span>
                    </div>
                    <button
                      onClick={handleClearHistory}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-all duration-300 flex items-center gap-2 hover:scale-105"
                    >
                      <FontAwesomeIcon icon={faTrash} size="sm" />
                      Tout effacer
                    </button>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {searchHistory.map((item, idx) => (
                      <li
                        key={item.id}
                        className={`px-6 py-4 cursor-pointer transition-all duration-300 ${
                          highlight === idx 
                            ? 'bg-blue-50 transform scale-[1.02] shadow-sm' 
                            : 'hover:bg-gray-50 hover:transform hover:scale-[1.01]'
                        }`}
                        onMouseEnter={() => setHighlight(idx)}
                        onMouseLeave={() => setHighlight(-1)}
                        onClick={() => handleHistoryItemClick(item)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <FontAwesomeIcon 
                              icon={faClock} 
                              className="text-gray-400 flex-shrink-0 transition-colors duration-300" 
                            />
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
                            onClick={(e) => handleRemoveHistoryItem(e, item.id)}
                            className="text-gray-300 hover:text-gray-500 transition-all duration-300 p-2 ml-2 hover:scale-110"
                            aria-label="Supprimer de l'historique"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Résultats de recherche */}
              {!showHistory && (
                <div className={animate ? 'animate-fadeInUp' : ''}>
                  {loading && (
                    <div className="px-6 py-8 text-gray-500 flex items-center justify-center gap-3">
                      <FontAwesomeIcon 
                        icon={faSpinner} 
                        spin 
                        size="lg" 
                        className="text-gray-500"
                      />
                      <span className="text-lg">Recherche en cours...</span>
                    </div>
                  )}

                  {err && !loading && (
                    <div className="px-6 py-8 text-red-600 text-center text-lg">
                      {err}
                    </div>
                  )}

                  {!loading && hasQuery && items.length === 0 && !err && (
                    <div className="px-6 py-12 text-gray-500 text-center animate-fadeIn">
                      <div className="text-gray-400 mb-4">
                        <FontAwesomeIcon icon={faSearch} size="2x" />
                      </div>
                      <div className="text-lg">
                        Aucun résultat pour "<span className="text-gray-900 font-medium">{q}</span>"
                      </div>
                      <div className="text-sm text-gray-400 mt-2">
                        Essayez avec d'autres termes de recherche
                      </div>
                    </div>
                  )}

                  {hasResults && (
                    <ul className="divide-y divide-gray-100">
                      {items.map((it, idx) => (
                        <li
                          key={it.id ?? `${it.slug}-${idx}`}
                          className={`px-6 py-4 cursor-pointer transition-all duration-300 ${
                            highlight === idx 
                              ? 'bg-blue-50 transform scale-[1.02] shadow-sm border-l-4 border-blue-500' 
                              : 'hover:bg-gray-50 hover:transform hover:scale-[1.01] hover:border-l-4 hover:border-blue-300'
                          }`}
                          onMouseEnter={() => setHighlight(idx)}
                          onMouseLeave={() => setHighlight(-1)}
                          onClick={() => goTo(it)}
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 transition-all duration-300 hover:shadow-md">
                              {it.image ? (
                                <img
                                  src={it.image}
                                  alt={it.title}
                                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 bg-gray-50">
                                  <FontAwesomeIcon icon={faSearch} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-lg font-medium text-gray-900 line-clamp-2 mb-2 transition-colors duration-300">
                                {it.title}
                              </div>
                              <div className="text-sm text-gray-500 mb-1">
                                {(it.category ? `${it.category} • ` : "") +
                                  (it.published_at ? formatDate(it.published_at) : "")}
                              </div>
                              {it.excerpt && (
                                <div className="text-sm text-gray-500 line-clamp-2">
                                  {it.excerpt}
                                </div>
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
        </div>
      )}

      {/* Styles d'animation CSS */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes searchSlideIn {
          from { 
            opacity: 0;
            transform: translate(-50%, -20px) scale(0.9);
          }
          to { 
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
        @keyframes searchSlideOut {
          from { 
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
          to { 
            opacity: 0;
            transform: translate(-50%, -20px) scale(0.9);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-fadeOut {
          animation: fadeOut 0.2s ease-in forwards;
        }
        .animate-searchSlideIn {
          animation: searchSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-searchSlideOut {
          animation: searchSlideOut 0.3s ease-in forwards;
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}