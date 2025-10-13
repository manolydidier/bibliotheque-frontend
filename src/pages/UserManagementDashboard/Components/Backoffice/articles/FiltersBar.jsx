import React, { useEffect, useRef, useState } from "react";
import {
  FaFilter, FaEraser, FaRocket, FaDownload,
  FaCalendarAlt, FaThumbsUp, FaTimes, FaSearch, FaStar, FaThumbtack
} from "react-icons/fa";

const KBD = ({ children }) => (
  <kbd className="px-2 py-1 rounded-md bg-gradient-to-br from-blue-100 to-blue-200 text-[11px] font-semibold text-blue-900 border border-blue-300 shadow-sm">
    {children}
  </kbd>
);

export default function FiltersBar({
  search = "",
  setSearch = () => {},
  filters = {},
  setFilters = () => {},
  perPage = 12,
  setPerPage = () => {},
  facets = {},
  onExportClick = () => {}
}) {
  const [local, setLocal] = useState(filters);
  const [localSearch, setLocalSearch] = useState(search);
  const searchRef = useRef(null);
  const typingTimeout = useRef(null);
  const DEBOUNCE_MS = 450;

  useEffect(() => setLocal(filters), [filters]);
  useEffect(() => setLocalSearch(search), [search]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const apply = () => {
    setSearch(localSearch);
    setFilters({
      ...local,
      ratingMin: local.ratingMin === "" ? 0 : Number(local.ratingMin),
      ratingMax: local.ratingMax === "" ? 5 : Number(local.ratingMax),
    });
  };

  const reset = () => {
    const base = {
      categories: [],
      tags: [],
      authors: [],
      featuredOnly: false,
      stickyOnly: false,
      unreadOnly: false,
      dateFrom: "",
      dateTo: "",
      ratingMin: 0,
      ratingMax: 5
    };
    setLocal(base);
    setLocalSearch("");
    setSearch("");
    setFilters(base);
  };

  const onChangeSearch = (e) => {
    const value = e.target.value;
    setLocalSearch(value);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setSearch(value), DEBOUNCE_MS);
  };

  return (
    <div className="relative bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 border-b border-blue-200/40 backdrop-blur-sm overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
      </div>

      <div className="relative px-6 py-5 flex flex-col gap-5">
        {/* Barre principale */}
        <div className="flex items-center gap-3">
          {/* Champ recherche avec halo bleu animé */}
          <div className="relative flex-1 min-w-[260px] group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 via-blue-400/30 to-blue-600/30 rounded-2xl opacity-0 group-focus-within:opacity-100 blur-2xl transition-all duration-700 animate-pulse" />
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 group-focus-within:text-blue-600 group-focus-within:scale-110 transition-all duration-300 pointer-events-none z-10" />
              <input
                ref={searchRef}
                type="search"
                value={localSearch}
                onChange={onChangeSearch}
                onKeyDown={(e) => e.key === "Enter" && apply()}
                placeholder="Rechercher des articles incroyables..."
                className="relative w-full h-14 pl-12 pr-4 rounded-2xl bg-white/90 backdrop-blur-sm border-2 border-blue-200/60 text-slate-900 placeholder-blue-300 shadow-lg shadow-blue-200/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 focus:shadow-2xl focus:shadow-blue-300/50 transition-all duration-300"
              />
              {localSearch && (
                <button
                  onClick={() => {
                    setLocalSearch("");
                    setSearch("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 hover:rotate-90 rounded-full transition-all duration-300"
                  title="Effacer"
                >
                  <FaTimes className="text-sm" />
                </button>
              )}
            </div>
          </div>

          {/* Sélecteur de pagination avec effet shimmer */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/40 to-blue-400/0 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="relative h-14 pl-4 pr-10 rounded-2xl bg-white/90 backdrop-blur-sm border-2 border-blue-200/60 text-sm font-semibold text-blue-900 appearance-none cursor-pointer shadow-lg shadow-blue-200/40 hover:shadow-xl hover:shadow-blue-300/50 hover:border-blue-400 hover:scale-105 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all duration-300"
              title="Éléments par page"
            >
              {[12, 24, 48, 96].map((n) => (
                <option key={n} value={n}>
                  {n} par page
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-blue-500 group-hover:text-blue-600 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Export CSV avec vague lumineuse */}
          <button
            type="button"
            onClick={onExportClick}
            className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50 hover:shadow-2xl hover:shadow-blue-600/60 inline-flex items-center justify-center transition-all duration-300 hover:scale-110 group overflow-hidden"
            title="Exporter CSV"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <FaDownload className="text-lg relative z-10 group-hover:animate-bounce" />
          </button>

          {/* Appliquer avec gradient bleu dynamique */}
          <button
            type="button"
            onClick={apply}
            className="relative h-14 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white font-bold inline-flex items-center gap-2 shadow-lg shadow-blue-500/50 hover:shadow-2xl hover:shadow-blue-600/70 transition-all duration-300 hover:scale-105 group overflow-hidden"
            title="Appliquer les filtres"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <FaRocket className="relative z-10 group-hover:-translate-y-1 group-hover:rotate-12 transition-transform duration-300" />
            <span className="relative z-10">Appliquer</span>
          </button>

          {/* Reset avec effet doux */}
          <button
            type="button"
            onClick={reset}
            className="h-14 px-5 rounded-2xl bg-white/90 backdrop-blur-sm border-2 border-blue-200/60 text-blue-700 font-semibold inline-flex items-center gap-2 shadow-lg shadow-blue-200/40 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-800 hover:shadow-xl hover:shadow-blue-300/50 hover:scale-105 transition-all duration-300 group"
            title="Réinitialiser"
          >
            <FaEraser className="group-hover:rotate-12 transition-transform duration-300" />
            <span>Réinitialiser</span>
          </button>
        </div>

        {/* Filtres rapides avec chips bleus */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 mr-2">
            <FaFilter className="text-blue-500 animate-pulse" style={{ animationDuration: '3s' }} />
            Filtres rapides
          </div>

          {/* Featured Chip */}
          <label
            className={`inline-flex items-center gap-2 text-sm font-semibold rounded-full px-5 py-2.5 cursor-pointer transition-all duration-300 hover:scale-105 ${
              local.featuredOnly
                ? "bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50 ring-4 ring-blue-400/30 ring-offset-2 animate-pulse"
                : "bg-white/90 backdrop-blur-sm border-2 border-blue-200/60 text-blue-900 shadow-md shadow-blue-100/50 hover:bg-blue-50 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-200/50"
            }`}
            style={local.featuredOnly ? { animationDuration: '2s' } : {}}
          >
            <input
              type="checkbox"
              className="hidden"
              checked={!!local.featuredOnly}
              onChange={(e) => setLocal((p) => ({ ...p, featuredOnly: e.target.checked }))}
            />
            <FaStar className={local.featuredOnly ? "text-yellow-300 drop-shadow-lg animate-spin" : "text-blue-500"} style={{ animationDuration: '3s' }} />
            Vedettes
          </label>

          {/* Sticky Chip */}
          <label
            className={`inline-flex items-center gap-2 text-sm font-semibold rounded-full px-5 py-2.5 cursor-pointer transition-all duration-300 hover:scale-105 ${
              local.stickyOnly
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-lg shadow-blue-500/50 ring-4 ring-blue-400/30 ring-offset-2"
                : "bg-white/90 backdrop-blur-sm border-2 border-blue-200/60 text-blue-900 shadow-md shadow-blue-100/50 hover:bg-blue-50 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-200/50"
            }`}
          >
            <input
              type="checkbox"
              className="hidden"
              checked={!!local.stickyOnly}
              onChange={(e) => setLocal((p) => ({ ...p, stickyOnly: e.target.checked }))}
            />
            <FaThumbtack className={local.stickyOnly ? "text-white drop-shadow-lg rotate-12" : "text-blue-600"} />
            Épinglés
          </label>

          {/* Date range */}
          <div className="inline-flex items-center gap-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-blue-200/60 rounded-full px-5 py-2.5 shadow-md shadow-blue-100/50 hover:shadow-lg hover:shadow-blue-200/50 hover:border-blue-400 hover:scale-105 transition-all duration-300 group">
            <FaCalendarAlt className="text-blue-600 group-hover:scale-110 transition-transform duration-300" />
            <input
              type="date"
              value={local.dateFrom}
              onChange={(e) => setLocal((p) => ({ ...p, dateFrom: e.target.value }))}
              className="h-8 px-3 rounded-xl bg-blue-50/50 border-2 border-blue-200/60 text-sm font-medium text-blue-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white transition-all duration-200"
            />
            <span className="text-blue-400 font-bold">→</span>
            <input
              type="date"
              value={local.dateTo}
              onChange={(e) => setLocal((p) => ({ ...p, dateTo: e.target.value }))}
              className="h-8 px-3 rounded-xl bg-blue-50/50 border-2 border-blue-200/60 text-sm font-medium text-blue-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white transition-all duration-200"
            />
          </div>

          {/* Rating */}
          <div className="inline-flex items-center gap-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-blue-200/60 rounded-full px-5 py-2.5 shadow-md shadow-blue-100/50 hover:shadow-lg hover:shadow-blue-200/50 hover:border-blue-400 hover:scale-105 transition-all duration-300 group">
            <FaThumbsUp className="text-blue-600 group-hover:scale-110 transition-transform duration-300" />
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={local.ratingMin}
              onChange={(e) => setLocal((p) => ({ ...p, ratingMin: e.target.value }))}
              className="h-8 w-20 px-3 rounded-xl bg-blue-50/50 border-2 border-blue-200/60 text-sm font-medium text-blue-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white transition-all duration-200"
              placeholder="Min"
            />
            <span className="text-blue-400 font-bold">→</span>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={local.ratingMax}
              onChange={(e) => setLocal((p) => ({ ...p, ratingMax: e.target.value }))}
              className="h-8 w-20 px-3 rounded-xl bg-blue-50/50 border-2 border-blue-200/60 text-sm font-medium text-blue-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white transition-all duration-200"
              placeholder="Max"
            />
          </div>

          {/* Aide raccourcis */}
          <div className="ml-auto hidden md:flex items-center gap-2 text-xs text-blue-700 bg-blue-50/80 backdrop-blur-sm rounded-full px-4 py-2 border border-blue-200/40 shadow-sm">
            <KBD>⌘K</KBD>
            <span className="font-semibold">pour rechercher</span>
          </div>
        </div>

        {/* Filtres avancés avec animations au focus */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2 group">
            <label className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Catégories
            </label>
            <input
              type="text"
              value={(filters.categories || []).join(", ")}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  categories: String(e.target.value)
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              className="h-12 px-4 rounded-xl bg-white/90 backdrop-blur-sm border-2 border-blue-200/60 text-sm font-medium text-slate-900 placeholder-blue-300 shadow-md shadow-blue-100/30 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 focus:shadow-xl focus:shadow-blue-200/50 hover:border-blue-400 transition-all duration-300"
              placeholder="Ex: 1, IA, Mobile"
            />
          </div>
          <div className="flex flex-col gap-2 group">
            <label className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
              Tags
            </label>
            <input
              type="text"
              value={(filters.tags || []).join(", ")}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  tags: String(e.target.value)
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              className="h-12 px-4 rounded-xl bg-white/90 backdrop-blur-sm border-2 border-blue-200/60 text-sm font-medium text-slate-900 placeholder-blue-300 shadow-md shadow-blue-100/30 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 focus:shadow-xl focus:shadow-blue-200/50 hover:border-blue-400 transition-all duration-300"
              placeholder="Ex: 3, startup, dev"
            />
          </div>
          <div className="flex flex-col gap-2 group">
            <label className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '1s' }} />
              Auteurs
            </label>
            <input
              type="text"
              value={(filters.authors || []).join(", ")}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  authors: String(e.target.value)
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              className="h-12 px-4 rounded-xl bg-white/90 backdrop-blur-sm border-2 border-blue-200/60 text-sm font-medium text-slate-900 placeholder-blue-300 shadow-md shadow-blue-100/30 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 focus:shadow-xl focus:shadow-blue-200/50 hover:border-blue-400 transition-all duration-300"
              placeholder="Ex: 12, 27"
            />
          </div>
        </div>
      </div>
    </div>
  );
}