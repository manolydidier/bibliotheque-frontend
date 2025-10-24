import React, { useEffect, useRef, useState } from "react";
import {
  FaFilter, FaEraser, FaDownload,
  FaCalendarAlt, FaThumbsUp, FaTimes, FaSearch, FaStar, FaThumbtack,
  FaUser, FaTag
} from "react-icons/fa";

/* ===== Helpers ===== */
const KBD = ({ children }) => (
  <kbd className="px-2 py-1 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-800 border border-slate-300">
    {children}
  </kbd>
);

const Chip = ({ children, onRemove, title, className = "" }) => (
  <span
    className={`inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-full border bg-white ${className}`}
    title={title}
  >
    {children}
    {onRemove && (
      <button
        onClick={onRemove}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-slate-200"
        aria-label="Supprimer ce filtre"
        type="button"
      >
        <FaTimes className="text-[10px] text-slate-600" />
      </button>
    )}
  </span>
);

const toArrayCsv = (v) =>
  String(v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const isNumLike = (v) => Number.isFinite(Number(v)) && String(Number(v)) === String(v);

/* ===== Component ===== */
export default function FiltersBar({
  search = "",
  setSearch = () => {},
  filters = {},
  setFilters = () => {},
  perPage = 24,
  setPerPage = () => {},
  facets = {},
  onExportClick = () => {}
}) {
  // on garde un "local" pour les champs texte afin d’avoir un debounce propre
  const [local, setLocal] = useState({
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
    status: "published",
    visibility: undefined,
    ...filters
  });

  const [localSearch, setLocalSearch] = useState(search);
  const searchRef = useRef(null);
  const typingTimeout = useRef(null);
  const DEBOUNCE_MS = 450;

  // IMPORTANT : synchroniser quand le parent change (sans écraser la saisie en cours)
  useEffect(() => {
    setLocal((prev) => ({ ...prev, ...filters }));
  }, [filters]);

  useEffect(() => setLocalSearch(search), [search]);

  // Cmd/Ctrl+K => focus
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

  /* ====== Live apply helpers (pas de bouton Appliquer) ====== */
  const applyPatch = (patch) => setFilters((p) => ({ ...p, ...patch }));

  const onChangeSearch = (e) => {
    const value = e.target.value;
    setLocalSearch(value);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setSearch(value), DEBOUNCE_MS);
  };

  const toggle = (key) => {
    setLocal((p) => {
      const val = !p[key];
      applyPatch({ [key]: val });
      return { ...p, [key]: val };
    });
  };

  const setField = (key, value) => {
    setLocal((p) => ({ ...p, [key]: value }));
    applyPatch({ [key]: value });
  };

  const setCsvField = (key, csvStr) => {
    const arr = toArrayCsv(csvStr);
    setLocal((p) => ({ ...p, [key]: arr }));
    applyPatch({ [key]: arr });
  };

  const addToken = (key, token) => {
    setLocal((p) => {
      const next = Array.from(new Set([...(p[key] || []), token]));
      applyPatch({ [key]: next });
      return { ...p, [key]: next };
    });
  };

  const removeToken = (key, token) => {
    setLocal((p) => {
      const next = (p[key] || []).filter((x) => String(x) !== String(token));
      applyPatch({ [key]: next });
      return { ...p, [key]: next };
    });
  };

  const clearGroup = (key) => {
    setLocal((p) => ({ ...p, [key]: [] }));
    applyPatch({ [key]: [] });
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
      ratingMax: 5,
      status: "published",
      visibility: undefined
    };
    setLocal(base);
    setLocalSearch("");
    setSearch("");
    setFilters(base);
  };

  // ===== Chips actifs
  const activeChips = [];
  if (local.featuredOnly) activeChips.push({ k: "featuredOnly", label: "Vedettes" });
  if (local.stickyOnly)   activeChips.push({ k: "stickyOnly", label: "Épinglés" });
  if (local.status && local.status !== "published") activeChips.push({ k: "status", label: `Status: ${local.status}` });
  if (local.visibility)   activeChips.push({ k: "visibility", label: `Visibilité: ${local.visibility}` });
  if (local.dateFrom)     activeChips.push({ k: "dateFrom", label: `Du ${local.dateFrom}` });
  if (local.dateTo)       activeChips.push({ k: "dateTo", label: `Au ${local.dateTo}` });
  if (Number(local.ratingMin) > 0) activeChips.push({ k: "ratingMin", label: `Note ≥ ${local.ratingMin}` });
  if (Number(local.ratingMax) < 5) activeChips.push({ k: "ratingMax", label: `Note ≤ ${local.ratingMax}` });
  (local.categories || []).forEach((v) => activeChips.push({ k: "categories", label: `Cat: ${v}`, value: v }));
  (local.tags || []).forEach((v) => activeChips.push({ k: "tags", label: `Tag: ${v}`, value: v }));
  (local.authors || []).forEach((v) => activeChips.push({ k: "authors", label: `Auteur #${v}`, value: v }));

  const removeChip = (chip) => {
    if (["categories", "tags", "authors"].includes(chip.k)) {
      removeToken(chip.k, chip.value);
    } else {
      const fallback = chip.k === "ratingMin" ? 0 : chip.k === "ratingMax" ? 5 : "";
      setField(chip.k, fallback);
    }
  };

  // ===== Facets
  const fCats = Array.isArray(facets?.categories) ? facets.categories : [];
  const fTags = Array.isArray(facets?.tags) ? facets.tags : [];
  const fAuth = Array.isArray(facets?.authors) ? facets.authors : [];

  const FacetPill = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs transition ${
        active
          ? "bg-blue-600 border-blue-600 text-white"
          : "bg-white hover:bg-slate-50 border-slate-300 text-slate-700"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="relative border-b bg-white">
      <div className="px-6 py-4 flex flex-col gap-4">
        {/* Row 1: search + perPage + export + reset */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[260px]">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="search"
              value={localSearch}
              onChange={onChangeSearch}
              placeholder="Rechercher…"
              aria-label="Rechercher des articles"
              className="w-full h-11 pl-10 pr-9 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 shadow-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => { setLocalSearch(""); setSearch(""); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded hover:bg-slate-100"
                title="Effacer la recherche"
                aria-label="Effacer la recherche"
              >
                <FaTimes className="text-slate-500" />
              </button>
            )}
          </div>

          {/* Par page */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600" htmlFor="perPageSel">Par page</label>
            <select
              id="perPageSel"
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm shadow-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              title="Éléments par page"
            >
              {[12, 24, 48, 96].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="flex-1" />

          {/* Export */}
          <button
            type="button"
            onClick={onExportClick}
            className="h-11 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 inline-flex items-center gap-2 shadow-sm"
            title="Exporter au format CSV"
          >
            <FaDownload /> Export CSV
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={reset}
            className="h-11 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 inline-flex items-center gap-2 shadow-sm"
            title="Réinitialiser les filtres"
          >
            <FaEraser /> Réinitialiser
          </button>
        </div>

        {/* Row 2: toggles + status/visibility + date & rating */}
        <div className="flex flex-col xl:flex-row gap-3">
          {/* Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide inline-flex items-center gap-2">
              <FaFilter className="text-slate-400" /> Filtres rapides
            </span>

            <label className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border cursor-pointer ${
              local.featuredOnly ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}>
              <input
                type="checkbox"
                className="hidden"
                checked={!!local.featuredOnly}
                onChange={() => toggle("featuredOnly")}
              />
              <FaStar className={local.featuredOnly ? "text-amber-500" : "text-slate-500"} />
              Vedettes
            </label>

            <label className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border cursor-pointer ${
              local.stickyOnly ? "bg-indigo-50 border-indigo-300 text-indigo-800" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}>
              <input
                type="checkbox"
                className="hidden"
                checked={!!local.stickyOnly}
                onChange={() => toggle("stickyOnly")}
              />
              <FaThumbtack className={local.stickyOnly ? "text-indigo-600 rotate-12" : "text-slate-500"} />
              Épinglés
            </label>
          </div>

          {/* Status / Visibility */}
          <div className="flex items-center gap-3 flex-wrap">
           

            <div className="flex items-center gap-2">
              <label htmlFor="visSel" className="text-sm text-slate-600">Visibilité</label>
              <select
                id="visSel"
                value={local.visibility || ""}
                onChange={(e) => setField("visibility", e.target.value || undefined)}
                className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              >
                <option value="">(toutes)</option>
                <option value="public">public</option>
                <option value="private">private</option>
                <option value="password_protected">password_protected</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white">
              <FaCalendarAlt className="text-slate-500" />
              <input
                type="date"
                value={local.dateFrom}
                onChange={(e) => setField("dateFrom", e.target.value)}
                className="h-8 px-2 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                aria-label="Date de début"
              />
              <span className="text-slate-400">→</span>
              <input
                type="date"
                value={local.dateTo}
                onChange={(e) => setField("dateTo", e.target.value)}
                className="h-8 px-2 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                aria-label="Date de fin"
              />
            </div>

            {/* Rating */}
            <div className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white">
              <FaThumbsUp className="text-slate-500" />
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={local.ratingMin}
                onChange={(e) => setField("ratingMin", e.target.value)}
                className="h-8 w-20 px-2 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                placeholder="Min"
                aria-label="Note minimale"
              />
              <span className="text-slate-400">→</span>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={local.ratingMax}
                onChange={(e) => setField("ratingMax", e.target.value)}
                className="h-8 w-20 px-2 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                placeholder="Max"
                aria-label="Note maximale"
              />
            </div>
          </div>

          {/* Raccourci */}
          <div className="flex-1" />
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600 border border-slate-200 rounded-full px-3 py-1.5 bg-slate-50">
            <KBD>⌘K</KBD>
            <span>rechercher</span>
          </div>
        </div>

        {/* Row 3: Cat / Tags / Authors + facets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Categories */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Catégories</label>
            <input
              type="text"
              value={(local.categories || []).join(", ")}
              onChange={(e) => setCsvField("categories", e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm shadow-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              placeholder="Ex: 1, IA, Mobile"
            />
            {Array.isArray(facets?.categories) && facets.categories.length > 0 && (
              <FacetList
                items={facets.categories}
                current={local.categories}
                icon={<FaTag />}
                onToggle={(token, active) =>
                  active ? removeToken("categories", token) : addToken("categories", token)
                }
              />
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tags</label>
            <input
              type="text"
              value={(local.tags || []).join(", ")}
              onChange={(e) => setCsvField("tags", e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm shadow-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              placeholder="Ex: 3, startup, dev"
            />
            {Array.isArray(facets?.tags) && facets.tags.length > 0 && (
              <FacetList
                items={facets.tags}
                current={local.tags}
                icon={<FaTag />}
                onToggle={(token, active) =>
                  active ? removeToken("tags", token) : addToken("tags", token)
                }
              />
            )}
          </div>

          {/* Authors */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Auteurs</label>
            <input
              type="text"
              value={(local.authors || []).join(", ")}
              onChange={(e) => setCsvField("authors", e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm shadow-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              placeholder="Ex: 12, 27"
            />
            {Array.isArray(facets?.authors) && facets.authors.length > 0 && (
              <FacetList
                items={facets.authors}
                current={local.authors}
                icon={<FaUser />}
                displayName={(u) => u.name ?? `Auteur #${u.id}`}
                onToggle={(token, active) =>
                  active ? removeToken("authors", token) : addToken("authors", token)
                }
              />
            )}
          </div>
        </div>

        {/* Active filters summary */}
        <div className="border-t border-slate-200 pt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide inline-flex items-center gap-2">
              <FaFilter className="text-slate-400" /> Filtres actifs
            </span>

            {activeChips.length === 0 && (
              <span className="text-sm text-slate-500">Aucun filtre appliqué</span>
            )}

            {activeChips.map((chip, idx) => (
              <Chip key={`${chip.k}-${chip.value ?? "x"}-${idx}`} onRemove={() => removeChip(chip)} title="Supprimer ce filtre">
                {chip.label}
              </Chip>
            ))}

            {activeChips.length > 0 && (
              <button
                type="button"
                onClick={reset}
                className="ml-auto inline-flex items-center gap-2 text-sm text-slate-700 rounded-lg px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50"
                title="Effacer tous les filtres"
              >
                <FaEraser /> Effacer tout
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* === Small subcomponent: FacetList === */
function FacetList({ items, current = [], icon, onToggle, displayName }) {
  const valSet = new Set((current || []).map(String));
  return (
    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-auto pr-1">
      {items.map((it) => {
        const token = isNumLike(it.id) ? Number(it.id) : (it.name ?? it.id);
        const active = valSet.has(String(token));
        return (
          <button
            key={String(it.id)}
            type="button"
            onClick={() => onToggle(token, active)}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs transition ${
              active ? "bg-blue-600 border-blue-600 text-white"
                     : "bg-white hover:bg-slate-50 border-slate-300 text-slate-700"
            }`}
          >
            {icon} {displayName ? displayName(it) : (it.name ?? it.id)}
            {typeof it.count === "number" && <span className="opacity-80">({it.count})</span>}
          </button>
        );
      })}
    </div>
  );
}
