// ------------------------------
// File: media-library/parts/FiltersPanel.jsx
// ------------------------------
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { 
  FaFilter, 
  FaSearch, 
  FaThLarge, 
  FaTable, 
  FaDownload, 
  FaTimes, 
  FaSave,
  FaBookmark,
  FaHistory,
  FaStar,
  FaEye,
  FaChevronDown,
  FaChevronRight,
  FaRocket,
  FaMagic
} from "react-icons/fa";
import { Toggle } from "../shared/atoms/atoms";
import { TYPES, CATS, TAGS } from "../shared/constants";
import { toBytes } from "../shared/utils/query";
import { formatBytes, cls } from "../shared/utils/format";

// Hook optimisé pour filtres sauvegardés avec style
const useSavedFilters = () => {
  const [savedFilters, setSavedFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('media-filters');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const saveFilter = useCallback((name, filters) => {
    const newFilter = { 
      name, 
      filters, 
      id: Date.now(),
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      createdAt: new Date().toISOString()
    };
    const updated = [newFilter, ...savedFilters.slice(0, 4)]; // Max 5 filtres
    setSavedFilters(updated);
    localStorage.setItem('media-filters', JSON.stringify(updated));
  }, [savedFilters]);

  const deleteFilter = useCallback((id) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem('media-filters', JSON.stringify(updated));
  }, [savedFilters]);

  return { savedFilters, saveFilter, deleteFilter };
};

// Hook pour l'historique avec style
const useSearchHistory = () => {
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('media-search-history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const addToHistory = useCallback((search) => {
    if (!search.trim()) return;
    const newHistory = [
      { term: search, timestamp: Date.now(), id: Date.now() },
      ...history.filter(h => h.term !== search)
    ].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('media-search-history', JSON.stringify(newHistory));
  }, [history]);

  return { history, addToHistory };
};

export default function FiltersPanel({
  open,
  setOpen,
  search,
  setSearch,
  filters,
  setFilters,
  view,
  setView,
  perPage,
  setPerPage,
  loadMode,
  setLoadMode,
  ownersOptions,
}) {
  const [local, setLocal] = useState(filters);
  const [q, setQ] = useState(search);
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [expandedSections, setExpandedSections] = useState({ main: true });
  const [searchFocused, setSearchFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const searchRef = useRef(null);
  const { savedFilters, saveFilter, deleteFilter } = useSavedFilters();
  const { history, addToHistory } = useSearchHistory();

  // Sync avec props
  useEffect(() => setLocal(filters), [filters]);
  useEffect(() => setQ(search), [search]);

  // Stats des filtres actifs
  const activeFiltersCount = useMemo(() => {
    return local.types.length + local.categories.length + local.tags.length + 
           local.owners.length + (local.favoritesOnly ? 1 : 0) + (local.unreadOnly ? 1 : 0) +
           (local.dateFrom ? 1 : 0) + (local.dateTo ? 1 : 0) + 
           (local.sizeMin > 0 ? 1 : 0) + (local.sizeMax > 0 ? 1 : 0);
  }, [local]);

  // Actions
  const applyFilters = () => {
    setFilters(local);
    setOpen(false);
  };

  const resetFilters = () => {
    const empty = { 
      types: [], categories: [], tags: [], owners: [], 
      favoritesOnly: false, unreadOnly: false, 
      dateFrom: "", dateTo: "", sizeMin: 0, sizeMax: 0 
    };
    setLocal(empty);
    setFilters(empty);
  };

  const handleSearch = () => {
    setSearch(q);
    addToHistory(q);
    setShowHistory(false);
  };

  const saveCurrentFilter = () => {
    if (saveName.trim()) {
      saveFilter(saveName.trim(), local);
      setSaveName("");
      setShowSave(false);
    }
  };

  // Toggle section
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Composant Chip avec animations et couleurs vibrantes
  const AnimatedChip = ({ active, onClick, children, size = 'sm' }) => (
    <button
      onClick={onClick}
      className={cls(
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        'rounded-full font-medium transition-all duration-200 border-2 overflow-hidden relative',
        'transform hover:scale-105 active:scale-95',
        active 
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25' 
          : 'bg-white/80 backdrop-blur-sm text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/80 shadow-sm'
      )}
    >
      <span className="flex items-center gap-1 relative z-10">
        {active && <FaStar className="text-xs animate-pulse" />}
        {children}
      </span>
      {/* Effet shimmer sur hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 transform -skew-x-12" />
    </button>
  );

  // Composant Section glass avec animations
  const GlassSection = ({ title, children, sectionKey, defaultExpanded = false, icon: Icon, color = "blue" }) => {
    const isExpanded = expandedSections[sectionKey] ?? defaultExpanded;
    
    const colorClasses = {
      blue: "from-blue-500/90 to-blue-600/90",
      purple: "from-purple-500/90 to-purple-600/90", 
      emerald: "from-emerald-500/90 to-emerald-600/90",
      orange: "from-orange-500/90 to-orange-600/90"
    };
    
    return (
      <div className={cls(
        "backdrop-blur-lg bg-white/10 border border-white/20 rounded-xl overflow-hidden",
        "hover:shadow-xl transition-all duration-300 hover:bg-white/15 hover:border-white/30",
        isExpanded && "ring-2 ring-blue-400/50 bg-white/20"
      )}>
        <button
          onClick={() => toggleSection(sectionKey)}
          className={cls(
            "w-full p-4 bg-gradient-to-br text-white relative overflow-hidden",
            colorClasses[color],
            "hover:from-opacity-80 hover:to-opacity-80 transition-all duration-200"
          )}
        >
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {Icon && <Icon className="text-lg" />}
              <span className="font-bold text-lg">{title}</span>
            </div>
            <div className={cls(
              "transition-transform duration-200",
              isExpanded && "rotate-180"
            )}>
              <FaChevronDown />
            </div>
          </div>
          {/* Effet de brillance subtile */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
        </button>
        
        <div className={cls(
          "transition-all duration-300 ease-out overflow-hidden",
          isExpanded 
            ? "max-h-96 opacity-100 transform translate-y-0" 
            : "max-h-0 opacity-0 transform -translate-y-2"
        )}>
          <div className="p-6 bg-gradient-to-br from-white/30 to-white/20 backdrop-blur-xl">
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Barre de recherche glass futuriste */}
      <div className="backdrop-blur-xl bg-gradient-to-r from-white/90 via-white/80 to-white/70 border-b border-white/30 sticky top-0 z-40 px-6 py-4 shadow-lg">
        {/* Effet de grid en arrière-plan */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, #3B82F6 2px, transparent 2px),
              radial-gradient(circle at 75% 75%, #3B82F6 2px, transparent 2px)
            `,
            backgroundSize: '50px 50px'
          }} />
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          
          {/* Recherche futuriste */}
          <div className="flex-1 relative max-w-md">
            <div className="relative">
              <input
                ref={searchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                onFocus={() => {
                  setSearchFocused(true);
                  setShowHistory(history.length > 0);
                }}
                onBlur={() => {
                  setSearchFocused(false);
                  setTimeout(() => setShowHistory(false), 200);
                }}
                placeholder="Rechercher dans la médiathèque... 🔍"
                className={cls(
                  "w-full pl-12 pr-12 py-3 rounded-xl font-medium",
                  "bg-white/80 backdrop-blur-sm border-2 border-white/50",
                  "focus:outline-none focus:border-blue-400 focus:bg-white/90",
                  "transition-all duration-200 text-slate-800 placeholder-slate-500",
                  "shadow-lg focus:shadow-xl",
                  searchFocused && "scale-105 ring-2 ring-blue-400/30"
                )}
              />
              
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <FaSearch className={cls(
                  "text-lg transition-all duration-200",
                  searchFocused ? "text-blue-500 animate-pulse" : "text-slate-400"
                )} />
              </div>
              
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full bg-slate-200/80 hover:bg-red-200/80 transition-all duration-200 hover:scale-110"
                >
                  <FaTimes className="text-slate-600 hover:text-red-600 text-sm" />
                </button>
              )}
              
              {/* Dropdown historique glass */}
              {showHistory && (
                <div className="absolute top-full left-0 right-0 mt-2 backdrop-blur-lg bg-white/90 border border-white/50 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                  <div className="p-3 border-b border-white/30 text-xs text-slate-600 flex items-center gap-2 bg-blue-50/50">
                    <FaHistory />
                    Recherches récentes
                  </div>
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSearch(item.term)}
                      className="w-full text-left px-4 py-2 hover:bg-white/60 transition-all duration-200 text-slate-700 flex items-center gap-3 hover:scale-[1.02]"
                    >
                      <FaSearch className="text-slate-400 text-xs" />
                      <span className="flex-1">{item.term}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bouton recherche animé */}
          {q !== search && (
            <button 
              onClick={handleSearch}
              className="px-6 py-3 bg-gradient-to-r from-blue-800 to-blue-900 text-white rounded-xl font-bold shadow-lg hover:from-blue-500 hover:to-blue-600 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <FaRocket className="animate-bounce" />
              GO
            </button>
          )}

          {/* Contrôles vue avec glass */}
          <div className="flex bg-slate-900/80 backdrop-blur-sm rounded-xl p-1.5 shadow-lg">
            {[
              { key: 'grid', icon: FaThLarge, label: 'Grille' },
              { key: 'list', icon: FaTable, label: 'Liste' }
            ].map(({ key, icon: Icon, label }) => (
              <button 
                key={key}
                onClick={() => setView(key)}
                className={cls(
                  'px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-semibold transition-all duration-200',
                  view === key 
                    ? 'bg-blue-500 text-white shadow-lg transform scale-105' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                )}
              >
                <Icon />
                {label}
              </button>
            ))}
          </div>

          {/* Selects avec style */}
          <select 
            value={perPage} 
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="px-4 py-3 border-2 border-white/50 rounded-xl text-sm bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {[12, 24, 48, 96].map(n => <option key={n} value={n}>{n}/page</option>)}
          </select>

          {/* Bouton filtres magique */}
          <button 
            onClick={() => setOpen(!open)}
            className={cls(
              'flex items-center gap-3 px-6 py-3 rounded-xl font-bold transition-all duration-200 relative overflow-hidden shadow-lg',
              activeFiltersCount > 0
                ? 'bg-gradient-to-r from-blue-800 to-blue-900 text-white shadow-blue-500/25 animate-pulse'
                : 'bg-white/80 text-slate-700 border-2 border-white/50 hover:bg-white/90 hover:border-blue-300'
            )}
          >
            <FaFilter className={activeFiltersCount > 0 ? "animate-spin" : ""} />
            <span>Filtres</span>
            {activeFiltersCount > 0 && (
              <span className="bg-white text-blue-900 text-xs px-2 py-1 rounded-full font-black min-w-[24px] text-center animate-bounce">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Export avec style */}
          <button hidden
            onClick={() => window.dispatchEvent(new CustomEvent("medialib:export"))}
            className="p-3 text-slate-600 hover:text-slate-900 transition-all duration-200 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-white/50 hover:bg-white/90 hover:scale-110 shadow-lg"
            title="Export CSV"
          >
            <FaDownload />
          </button>
        </div>
      </div>

      {/* Panel filtres sidebar glass */}
      <div className={cls(
        'fixed right-0 top-[80px] h-full w-96 z-50 transform transition-all duration-500 ease-out overflow-auto',
        'backdrop-blur-xl bg-gradient-to-br from-white/90 via-white/80 to-white/70',
        'shadow-2xl border-l border-white/30',
        open ? 'translate-x-0' : 'translate-x-full'
      )}>
        
        {/* Effet de grid en arrière-plan */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, #3B82F6 2px, transparent 2px),
              radial-gradient(circle at 75% 75%, #3B82F6 2px, transparent 2px)
            `,
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        {/* Header glass */}
        <div className="overflow-auto relative z-10 px-6 py-5 border-b border-white/30  text-blue-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaFilter className="text-xl animate-pulse" />
              <h2 className="text-xl font-bold">Filtres</h2>
            </div>
            <button 
              onClick={() => setOpen(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 relative z-10">
          
          {/* Filtres sauvegardés avec couleurs */}
          {savedFilters.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FaBookmark className="text-blue-500 animate-pulse" />
                Filtres Sauvegardés
              </h3>
              <div className="flex flex-wrap gap-3">
                {savedFilters.map(saved => (
                  <div key={saved.id} className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-500/20 to-blue-600/20 backdrop-blur-sm border border-white/30 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                    <button
                      onClick={() => {
                        setLocal(saved.filters);
                        setFilters(saved.filters);
                        // Scroll vers le haut après application d'un filtre sauvegardé
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-4 py-2 text-slate-700 hover:text-slate-900 transition-colors font-medium flex items-center gap-2"
                    >
                      <div 
                        className="w-3 h-3 rounded-full animate-pulse" 
                        style={{ backgroundColor: saved.color }}
                      />
                      {saved.name}
                    </button>
                    <button
                      onClick={() => deleteFilter(saved.id)}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sections glass avec animations */}
          <GlassSection 
            title="Filtres Principaux" 
            sectionKey="main" 
            defaultExpanded={true}
            icon={FaMagic}
            color="blue"
          >
            <div className="space-y-6 pb-10  overflow-auto max-h-96 pr-2 w-80">
              
              {/* Types */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xs">📄</span>
                  </div>
                  <label className="font-semibold text-slate-800 text-sm">Types de fichiers</label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TYPES.map(t => (
                    <AnimatedChip
                      key={t}
                      active={local.types.includes(t)}
                      onClick={() => setLocal(s => ({ 
                        ...s, 
                        types: s.types.includes(t) ? s.types.filter(x => x !== t) : [...s.types, t] 
                      }))}
                    >
                      {t}
                    </AnimatedChip>
                  ))}
                </div>
              </div>

              {/* Catégories */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xs">📁</span>
                  </div>
                  <label className="font-semibold text-slate-800 text-sm">Catégories</label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CATS.map(c => (
                    <AnimatedChip
                      key={c}
                      active={local.categories.includes(c)}
                      onClick={() => setLocal(s => ({ 
                        ...s, 
                        categories: s.categories.includes(c) ? s.categories.filter(x => x !== c) : [...s.categories, c] 
                      }))}
                    >
                      {c}
                    </AnimatedChip>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xs">🏷️</span>
                  </div>
                  <label className="font-semibold text-slate-800 text-sm">Tags</label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TAGS.map(t => (
                    <AnimatedChip
                      key={t}
                      active={local.tags.includes(t)}
                      onClick={() => setLocal(s => ({ 
                        ...s, 
                        tags: s.tags.includes(t) ? s.tags.filter(x => x !== t) : [...s.tags, t] 
                      }))}
                    >
                      {t}
                    </AnimatedChip>
                  ))}
                </div>
              </div>

              {/* Propriétaires */}
              {ownersOptions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">👤</span>
                    </div>
                    <label className="font-semibold text-slate-800 text-sm">Propriétaires</label>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ownersOptions.map(o => (
                      <AnimatedChip
                        key={o}
                        active={local.owners.includes(o)}
                        onClick={() => setLocal(s => ({ 
                          ...s, 
                          owners: s.owners.includes(o) ? s.owners.filter(x => x !== o) : [...s.owners, o] 
                        }))}
                      >
                        {o}
                      </AnimatedChip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </GlassSection>

          {/* Filtres avancés */}
          <GlassSection 
            title="Critères Avancés" 
            sectionKey="advanced"
            icon={FaRocket}
            color="blue"
          >
            <div className="space-y-6 overflow-auto max-h-96 pr-2 w-96 pb-10">
              
              {/* Toggles avec animations */}
              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm border border-white/30">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-700 to-blue-800 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xs">⚡</span>
                  </div>
                  <h5 className="font-semibold text-slate-800 text-sm">Préférences rapides</h5>
                </div>
                
                <div className="space-y-3">
                  {[
                    { key: "favoritesOnly", label: "Favoris uniquement", icon: FaStar, desc: "Afficher seulement mes favoris", color: "text-yellow-500" },
                    { key: "unreadOnly", label: "Non lus seulement", icon: FaEye, desc: "Fichiers pas encore consultés", color: "text-green-500" }
                  ].map(({ key, label, icon: Icon, desc, color }) => (
                    <div key={key} className="flex items-start gap-3 p-3 bg-white/30 rounded-lg hover:bg-white/40 transition-all duration-200 hover:scale-[1.02]">
                      <div className="flex-shrink-0 pt-0.5">
                        <Toggle 
                          on={!!local[key]} 
                          setOn={(v) => setLocal((s) => ({ ...s, [key]: v }))}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium text-slate-800 flex items-center gap-2 cursor-pointer mb-0.5">
                          <Icon className={cls("text-sm transition-all duration-200", local[key] ? `${color} animate-pulse` : "text-slate-400")} />
                          {label}
                        </label>
                        <p className="text-xs text-slate-600">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Champs avec glass effect */}
              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm border border-white/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xs">📊</span>
                  </div>
                  <h5 className="font-semibold text-slate-800 text-sm">Critères de taille et date</h5>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Taille min", key: "sizeMin", placeholder: "10MB", icon: "📏" },
                    { label: "Taille max", key: "sizeMax", placeholder: "500MB", icon: "📐" },
                    { label: "Date début", key: "dateFrom", type: "date", icon: "📅" },
                    { label: "Date fin", key: "dateTo", type: "date", icon: "📆" }
                  ].map(({ label, key, placeholder, type = "text", icon }) => (
                    <div key={key} className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700 flex items-center gap-1">
                        <span className="text-xs">{icon}</span>
                        {label}
                      </label>
                      <input 
                        type={type}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 rounded-lg bg-white/80 backdrop-blur-sm border border-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/90 transition-all duration-200 text-sm shadow-sm hover:shadow-md"
                        value={
                          key === "sizeMin" ? (local.sizeMin ? formatBytes(local.sizeMin) : "") :
                          key === "sizeMax" ? (local.sizeMax ? formatBytes(local.sizeMax) : "") :
                          local[key]
                        }
                        onChange={(e) => setLocal(s => ({ 
                          ...s, 
                          [key]: key.includes("size") 
                            ? toBytes(e.target.value) || 0 
                            : e.target.value 
                        }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassSection>
        </div>

        {/* Footer actions glass */}
        <div className="relative z-10 border-t border-white/30 px-6 py-4 space-y-4 bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-xl">
          
          {/* Statut et sauvegarde */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center justify-between p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-slate-800">
                  {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => setShowSave(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/80 to-green-600/80 text-white font-bold shadow-lg hover:from-green-400 hover:to-green-500 transition-all duration-200 hover:scale-105 backdrop-blur-sm rounded-lg"
              >
                <FaSave />
                Sauvegarder
              </button>
            </div>
          )}

          {/* Actions principales */}
          <div className="flex gap-3">
            <button
              onClick={resetFilters}
              disabled={activeFiltersCount === 0}
              className={cls(
                'flex-1 py-3 rounded-xl font-bold transition-all duration-200 shadow-lg border-2 backdrop-blur-sm',
                activeFiltersCount > 0
                  ? 'bg-red-500/80 border-red-400 text-white hover:bg-red-400 hover:scale-105'
                  : 'bg-white/60 border-white/50 text-slate-400 cursor-not-allowed'
              )}
            >
              Réinitialiser
            </button>
            <button
              onClick={applyFilters}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold shadow-lg hover:from-blue-500 hover:to-blue-600 transform hover:scale-105 transition-all duration-200 relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <FaRocket />
                APPLIQUER
              </span>
              {/* Effet shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 transform -skew-x-12" />
            </button>
          </div>
        </div>
      </div>

      {/* Overlay glass avec blur */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-all duration-300"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Modal sauvegarde glass */}
      {showSave && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/30 transform animate-in zoom-in duration-300">
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
                <FaSave className="text-white text-2xl" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Sauvegarder le filtre
              </h3>
              <p className="text-slate-600 text-sm mt-2">Donnez un nom magique à cette configuration</p>
            </div>
            
            {/* Input avec design futuriste */}
            <div className="relative mb-6">
              <input
                type="text"
                placeholder="Nom du filtre magique..."
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveCurrentFilter()}
                className="w-full px-6 py-4 rounded-xl bg-white/80 backdrop-blur-sm border-2 border-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/90 transition-all duration-200 font-medium text-lg shadow-lg focus:scale-105"
                autoFocus
              />
              
              {/* Indicateur de validation animé */}
              <div className={cls(
                "absolute right-4 top-1/2 transform -translate-y-1/2 transition-all duration-200",
                saveName.trim() ? "opacity-100 scale-100" : "opacity-0 scale-50"
              )}>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              </div>
            </div>
            
            {/* Actions avec animations */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowSave(false)}
                className="flex-1 px-6 py-3 text-slate-600 bg-white/60 backdrop-blur-sm rounded-xl font-semibold hover:bg-white/80 transition-all duration-200 border border-white/50 hover:scale-105"
              >
                Annuler
              </button>
              <button
                onClick={saveCurrentFilter}
                disabled={!saveName.trim()}
                className={cls(
                  "flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all duration-200 shadow-lg relative overflow-hidden",
                  saveName.trim()
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 hover:scale-105"
                    : "bg-slate-400 cursor-not-allowed"
                )}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <FaMagic className={saveName.trim() ? "animate-spin" : ""} />
                  Sauvegarder
                </span>
                {/* Effet shimmer pour le bouton actif */}
                {saveName.trim() && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 transform -skew-x-12" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}