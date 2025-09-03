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
  FaChevronDown,
  FaChevronUp,
  FaSave,
  FaBookmark,
  FaHistory,
  FaMagic,
  FaRocket,
  FaStar,
  FaEye
} from "react-icons/fa";
import { Pill, Toggle } from "../shared/atoms/atoms";
import { TYPES, CATS, TAGS } from "../shared/constants";
import { toBytes } from "../shared/utils/query";
import { formatBytes, cls } from "../shared/utils/format";

// Hook personnalisé pour les effets de particules
const useParticleEffect = (trigger) => {
  const [particles, setParticles] = useState([]);
  
  useEffect(() => {
    if (trigger) {
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        scale: Math.random() * 0.5 + 0.5,
        rotation: Math.random() * 360
      }));
      setParticles(newParticles);
      
      setTimeout(() => setParticles([]), 2000);
    }
  }, [trigger]);
  
  return particles;
};

// Hook pour gérer les filtres sauvegardés avec style
const useSavedFilters = () => {
  const [savedFilters, setSavedFilters] = useState(() => {
    const saved = localStorage.getItem('media-library-filters');
    return saved ? JSON.parse(saved) : [];
  });

  const saveFilter = useCallback((name, filters) => {
    const newSaved = [...savedFilters, { 
      name, 
      filters, 
      id: Date.now(),
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      createdAt: new Date().toISOString()
    }];
    setSavedFilters(newSaved);
    localStorage.setItem('media-library-filters', JSON.stringify(newSaved));
  }, [savedFilters]);

  const deleteFilter = useCallback((id) => {
    const newSaved = savedFilters.filter(f => f.id !== id);
    setSavedFilters(newSaved);
    localStorage.setItem('media-library-filters', JSON.stringify(newSaved));
  }, [savedFilters]);

  return { savedFilters, saveFilter, deleteFilter };
};

// Hook pour l'historique avec animations
const useSearchHistory = () => {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('media-library-search-history');
    return saved ? JSON.parse(saved) : [];
  });

  const addToHistory = useCallback((search) => {
    if (!search.trim()) return;
    const newHistory = [
      { term: search, timestamp: Date.now(), id: Date.now() },
      ...history.filter(h => h.term !== search)
    ].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('media-library-search-history', JSON.stringify(newHistory));
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
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [appliedTrigger, setAppliedTrigger] = useState(false);
  const [hoverEffect, setHoverEffect] = useState(null);
  
  const searchRef = useRef(null);
  const { savedFilters, saveFilter, deleteFilter } = useSavedFilters();
  const { history, addToHistory } = useSearchHistory();
  const particles = useParticleEffect(appliedTrigger);

  // Synchronisation avec les props
  useEffect(() => setLocal(filters), [filters]);
  useEffect(() => setQ(search), [search]);

  // Effet de pulsation pour les filtres actifs
  const [pulseFilters, setPulseFilters] = useState(false);
  useEffect(() => {
    const hasFilters = Object.values(local).some(v => 
      Array.isArray(v) ? v.length > 0 : v !== "" && v !== 0 && v !== false
    );
    if (hasFilters) {
      setPulseFilters(true);
      setTimeout(() => setPulseFilters(false), 600);
    }
  }, [local]);

  // Mémorisation des statistiques
  const stats = useMemo(() => {
    const activeCount = local.types.length + 
                       local.categories.length + 
                       local.tags.length + 
                       local.owners.length + 
                       (local.favoritesOnly ? 1 : 0) + 
                       (local.unreadOnly ? 1 : 0) + 
                       (local.dateFrom ? 1 : 0) + 
                       (local.dateTo ? 1 : 0) + 
                       (local.sizeMin > 0 ? 1 : 0) + 
                       (local.sizeMax > 0 ? 1 : 0);
    
    return {
      activeCount,
      hasFilters: activeCount > 0,
      intensity: Math.min(activeCount / 5, 1) // Pour les effets visuels
    };
  }, [local]);

  // Actions avec effets
  const apply = useCallback(() => {
    setFilters(local);
    setAppliedTrigger(true);
    setTimeout(() => {
      setOpen(false);
      setAppliedTrigger(false);
    }, 800);
  }, [local, setFilters, setOpen]);

  const reset = useCallback(() => {
    const emptyFilters = { 
      types: [], categories: [], tags: [], owners: [], 
      favoritesOnly: false, unreadOnly: false, 
      dateFrom: "", dateTo: "", sizeMin: 0, sizeMax: 0 
    };
    setLocal(emptyFilters);
    setFilters(emptyFilters);
  }, [setFilters]);

  const handleSearch = useCallback((searchTerm) => {
    setSearch(searchTerm);
    addToHistory(searchTerm);
    setShowHistory(false);
  }, [setSearch, addToHistory]);

  // Animation de typing pour le placeholder
  const [placeholder, setPlaceholder] = useState("");
  const fullPlaceholder = "Rechercher... ✨ type:pdf 📄 tag:Rapport 🏷️ size>10MB 📊";
  
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i <= fullPlaceholder.length) {
        setPlaceholder(fullPlaceholder.slice(0, i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Composant section avec effets glassmorphism
  const GlassSection = ({ title, children, sectionKey, icon: Icon }) => {
    const isActive = activeSection === sectionKey;
    
    return (
      <div className={cls(
        "backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl overflow-hidden",
        "shadow-xl hover:shadow-2xl transition-all duration-500",
        "hover:bg-white/15 hover:border-white/30",
        isActive && "ring-2 ring-blue-400/50 bg-white/20"
      )}>
        <button
          onClick={() => setActiveSection(isActive ? null : sectionKey)}
          onMouseEnter={() => setHoverEffect(sectionKey)}
          onMouseLeave={() => setHoverEffect(null)}
          className={cls(
            "w-full px-6 py-4 flex items-center justify-between text-left",
            "bg-gradient-to-r from-slate-900/80 to-slate-800/80 hover:from-slate-800/90 hover:to-slate-700/90",
            "text-white font-semibold transition-all duration-300",
            "relative overflow-hidden group"
          )}
        >
          {/* Effet de brillance au hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          
          <div className="flex items-center gap-3 relative z-10">
            <Icon className={cls(
              "text-lg transition-all duration-300",
              isActive ? "text-blue-400 scale-110" : "text-white/70",
              hoverEffect === sectionKey && "animate-pulse"
            )} />
            <span className="text-lg">{title}</span>
          </div>
          
          <div className={cls(
            "transition-transform duration-300",
            isActive && "rotate-180"
          )}>
            <FaChevronDown className="text-white/70" />
          </div>
        </button>
        
        <div className={cls(
          "transition-all duration-500 ease-out overflow-hidden",
          isActive 
            ? "max-h-[500px] opacity-100 translate-y-0" 
            : "max-h-0 opacity-0 -translate-y-4"
        )}>
          <div className="p-6 bg-white/5">
            {children}
          </div>
        </div>
      </div>
    );
  };

  // Pill animée custom
  const AnimatedPill = ({ active, onClick, children, color }) => (
    <button
      onClick={onClick}
      className={cls(
        "relative px-4 py-2 rounded-full font-medium text-sm transition-all duration-300",
        "border-2 backdrop-blur-sm overflow-hidden group",
        active 
          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white border-transparent shadow-lg scale-105" 
          : "bg-white/80 text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-white/90 hover:scale-105"
      )}
      style={{
        ...(active && color && {
          background: `linear-gradient(135deg, ${color}, ${color}dd)`,
        })
      }}
    >
      {/* Effet de vague au clic */}
      <div className="absolute inset-0 bg-white/20 rounded-full scale-0 group-active:scale-110 transition-transform duration-200" />
      
      {/* Texte */}
      <span className="relative z-10 flex items-center gap-1">
        {active && <FaStar className="text-xs animate-spin" />}
        {children}
      </span>
      
      {/* Effet de brillance */}
      {active && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-pulse" />
      )}
    </button>
  );

  return (
    <div className="relative">
      {/* Effet de particules */}
      {particles.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-2 h-2 bg-blue-400 rounded-full animate-ping"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                transform: `scale(${particle.scale}) rotate(${particle.rotation}deg)`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: '2s'
              }}
            />
          ))}
        </div>
      )}

      {/* Container principal avec effet de verre */}
      <div className={cls(
        "relative backdrop-blur-2xl bg-gradient-to-br from-white/90 via-white/80 to-white/70",
        "rounded-3xl shadow-2xl border border-white/30 p-6 mb-6 overflow-hidden",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-50/20 before:to-purple-50/20 before:pointer-events-none",
        appliedTrigger && "animate-pulse"
      )}>
        
        {/* Effet de grid en arrière-plan */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, #3B82F6 2px, transparent 2px),
              radial-gradient(circle at 75% 75%, #8B5CF6 2px, transparent 2px)
            `,
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Header principal avec dégradé spectaculaire */}
        <div className="relative z-10 mb-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            
            {/* Zone de recherche futuriste */}
            <div className="flex items-center gap-4 flex-1">
              <div className={cls(
                "relative flex-1 max-w-lg group",
                searchFocused && "scale-105"
              )}>
                <div className={cls(
                  "absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-sm transition-opacity duration-300",
                  searchFocused ? "opacity-100" : "opacity-0"
                )} />
                
                <div className="relative">
                  <input
                    ref={searchRef}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch(q)}
                    onFocus={() => {
                      setSearchFocused(true);
                      setShowHistory(history.length > 0);
                    }}
                    onBlur={() => {
                      setSearchFocused(false);
                      setTimeout(() => setShowHistory(false), 200);
                    }}
                    placeholder={placeholder}
                    className={cls(
                      "w-full pl-14 pr-12 py-4 rounded-2xl font-medium",
                      "bg-white/80 backdrop-blur-sm border-2 border-white/50",
                      "focus:outline-none focus:border-blue-400 focus:bg-white/90",
                      "transition-all duration-300 text-slate-800 placeholder-slate-500",
                      "shadow-lg focus:shadow-xl"
                    )}
                  />
                  
                  {/* Icône de recherche animée */}
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <FaSearch className={cls(
                      "text-xl transition-all duration-300",
                      searchFocused 
                        ? "text-blue-500 scale-110 animate-pulse" 
                        : "text-slate-400"
                    )} />
                  </div>
                  
                  {/* Bouton clear avec effet */}
                  {q && (
                    <button
                      onClick={() => setQ("")}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full bg-slate-200/80 hover:bg-red-200/80 transition-all duration-200 hover:scale-110"
                    >
                      <FaTimes className="text-slate-600 hover:text-red-600" />
                    </button>
                  )}
                  
                  {/* Dropdown historique avec glassmorphism */}
                  {showHistory && (
                    <div className="absolute top-full left-0 right-0 mt-2 backdrop-blur-xl bg-white/90 border border-white/50 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                      <div className="p-3 border-b border-white/30 text-xs text-slate-600 flex items-center gap-2 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                        <FaHistory className="animate-spin" />
                        Recherches récentes
                      </div>
                      {history.map((item, index) => (
                        <button
                          key={item.id || index}
                          onClick={() => handleSearch(item.term || item)}
                          className="w-full text-left px-4 py-3 hover:bg-white/60 transition-all duration-200 text-slate-700 border-b border-white/20 last:border-b-0 flex items-center gap-3"
                        >
                          <FaSearch className="text-slate-400 text-xs" />
                          <span className="flex-1">{item.term || item}</span>
                          <span className="text-xs text-slate-400">
                            {item.timestamp && new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bouton recherche avec effet néon */}
              {q !== search && (
                <button 
                  className={cls(
                    "px-6 py-3 rounded-2xl font-bold text-white shadow-lg",
                    "bg-gradient-to-r from-blue-600 to-purple-600",
                    "hover:from-blue-500 hover:to-purple-500",
                    "transform hover:scale-105 transition-all duration-300",
                    "hover:shadow-xl hover:shadow-blue-500/25",
                    "relative overflow-hidden group"
                  )}
                  onClick={() => handleSearch(q)}
                >
                  <FaRocket className="inline mr-2 group-hover:animate-bounce" />
                  Rechercher
                </button>
              )}
            </div>

            {/* Section contrôles avec design futuriste */}
            <div className="flex items-center gap-3 flex-wrap">
              
              {/* Bouton filtres principal */}
              <button 
                onClick={() => setOpen(!open)} 
                className={cls(
                  "flex items-center gap-3 px-6 py-3 rounded-2xl font-bold transition-all duration-300",
                  "relative overflow-hidden group shadow-lg",
                  stats.hasFilters 
                    ? cls(
                        "bg-gradient-to-r from-emerald-500 to-blue-500 text-white",
                        "hover:from-emerald-400 hover:to-blue-400",
                        "shadow-emerald-500/25 hover:shadow-xl",
                        pulseFilters && "animate-pulse"
                      )
                    : "bg-white/80 text-slate-700 border-2 border-white/50 hover:bg-white/90 hover:border-blue-300"
                )}
              >
                <FaFilter className={cls(
                  "transition-all duration-300",
                  stats.hasFilters ? "animate-spin" : "group-hover:rotate-12"
                )} />
                
                <span>Filtres</span>
                
                {stats.activeCount > 0 && (
                  <div className="relative">
                    <div className="absolute -inset-1 bg-white/30 rounded-full animate-ping" />
                    <span className="relative bg-white text-slate-900 text-xs px-2 py-1 rounded-full font-black min-w-[24px] text-center">
                      {stats.activeCount}
                    </span>
                  </div>
                )}
              </button>

              {/* Sélecteurs de vue avec effet néon */}
              <div className="flex bg-slate-900/80 backdrop-blur-sm rounded-2xl p-1.5 shadow-lg">
                {[
                  { key: 'grid', icon: FaThLarge, label: 'Grille' },
                  { key: 'list', icon: FaTable, label: 'Liste' }
                ].map(({ key, icon: Icon, label }) => (
                  <button 
                    key={key}
                    className={cls(
                      "px-4 py-2 rounded-xl text-sm flex items-center gap-2 font-semibold transition-all duration-300",
                      view === key 
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg transform scale-105" 
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    )} 
                    onClick={() => setView(key)}
                  >
                    <Icon className={view === key ? "animate-pulse" : ""} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Contrôles pagination avec style */}
              <select 
                className="px-4 py-3 border-2 border-white/50 rounded-2xl text-sm bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium shadow-lg" 
                value={perPage} 
                onChange={(e) => setPerPage(Number(e.target.value))}
              >
                {[12, 24, 48, 96].map((n) => (
                  <option key={n} value={n}>{n}/page</option>
                ))}
              </select>

              <select 
                className="px-4 py-3 border-2 border-white/50 rounded-2xl text-sm bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium shadow-lg" 
                value={loadMode} 
                onChange={(e) => setLoadMode(e.target.value)}
              >
                <option value="pagination">📄 Pagination</option>
                <option value="infinite">♾️ Infini</option>
              </select>

              {/* Bouton export avec effet holographique */}
              <button 
                className="px-6 py-3 rounded-2xl border-2 border-white/50 flex items-center gap-3 bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-all duration-300 font-semibold text-slate-700 shadow-lg hover:shadow-xl hover:scale-105 group"
                onClick={() => window.dispatchEvent(new CustomEvent("medialib:export"))}
              >
                <FaDownload className="group-hover:animate-bounce" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Panneau de filtres avec design spectaculaire */}
        <div className={cls(
          "transition-all duration-700 ease-out overflow-hidden",
          open 
            ? "max-h-[1200px] opacity-100 transform translate-y-0" 
            : "max-h-0 opacity-0 transform -translate-y-8"
        )}>
          <div className="pt-6 border-t border-white/30 space-y-6">
            
            {/* Filtres sauvegardés avec effet arc-en-ciel */}
            {savedFilters.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FaBookmark className="text-yellow-500 animate-pulse" />
                  Filtres Sauvegardés
                </h3>
                <div className="flex flex-wrap gap-3">
                  {savedFilters.map((saved) => (
                    <div 
                      key={saved.id} 
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500/20 to-violet-500/20 backdrop-blur-sm border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <button
                        onClick={() => {
                          setLocal(saved.filters);
                          setFilters(saved.filters);
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
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          <div className="flex w-full">
                {/* Sections de filtres en ligne */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                  {/* GlassSection 1 - Types & Catégories */}
                  <GlassSection title="Types & Catégories" sectionKey="types" icon={FaMagic}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-sm font-bold mb-4 text-white/90">Types de fichiers</label>
                        <div className="flex flex-wrap gap-3">
                          {TYPES.map((t) => (
                            <AnimatedPill
                              key={t}
                              active={local.types.includes(t)}
                              onClick={() => setLocal((s) => ({ 
                                ...s, 
                                types: s.types.includes(t) 
                                  ? s.types.filter((x) => x !== t) 
                                  : [...s.types, t] 
                              }))}
                            >
                              {t}
                            </AnimatedPill>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-4 text-white/90">Catégories</label>
                        <div className="flex flex-wrap gap-3">
                          {CATS.map((c) => (
                            <AnimatedPill
                              key={c}
                              active={local.categories.includes(c)}
                              onClick={() => setLocal((s) => ({ 
                                ...s, 
                                categories: s.categories.includes(c) 
                                  ? s.categories.filter((x) => x !== c) 
                                  : [...s.categories, c] 
                              }))}
                            >
                              {c}
                            </AnimatedPill>
                          ))}
                        </div>
                      </div>
                    </div>
                  </GlassSection>

                  {/* GlassSection 2 - Tags & Propriétaires */}
                  <GlassSection title="Tags & Propriétaires" sectionKey="tags" icon={FaStar}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-sm font-bold mb-4 text-white/90">Tags</label>
                        <div className="flex flex-wrap gap-3">
                          {TAGS.map((tg) => (
                            <AnimatedPill
                              key={tg}
                              active={local.tags.includes(tg)}
                              onClick={() => setLocal((s) => ({ 
                                ...s, 
                                tags: s.tags.includes(tg) 
                                  ? s.tags.filter((x) => x !== tg) 
                                  : [...s.tags, tg] 
                              }))}
                            >
                              {tg}
                            </AnimatedPill>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-4 text-white/90">Propriétaires</label>
                        <div className="flex flex-wrap gap-3">
                          {ownersOptions.map((o) => (
                            <AnimatedPill
                              key={o}
                              active={local.owners.includes(o)}
                              onClick={() => setLocal((s) => ({ 
                                ...s, 
                                owners: s.owners.includes(o) 
                                  ? s.owners.filter((x) => x !== o) 
                                  : [...s.owners, o] 
                              }))}
                            >
                              {o}
                            </AnimatedPill>
                          ))}
                        </div>
                      </div>
                    </div>
                  </GlassSection>

                  {/* GlassSection 3 - Filtres Avancés */}
                  <GlassSection title="Filtres Avancés" sectionKey="advanced" icon={FaRocket}>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { label: "Taille min", key: "sizeMin", placeholder: "ex: 10MB" },
                          { label: "Taille max", key: "sizeMax", placeholder: "ex: 500MB" },
                          { label: "Date début", key: "dateFrom", type: "date" },
                          { label: "Date fin", key: "dateTo", type: "date" }
                        ].map(({ label, key, placeholder, type = "text" }) => (
                          <div key={key}>
                            <label className="block text-sm font-bold mb-2 text-white/90">{label}</label>
                            <input 
                              type={type}
                              placeholder={placeholder}
                              className="w-full px-4 py-3 rounded-2xl bg-white/80 backdrop-blur-sm border-2 border-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/90 transition-all duration-300 font-medium shadow-lg"
                              value={
                                key === "sizeMin" ? (local.sizeMin ? formatBytes(local.sizeMin) : "") :
                                key === "sizeMax" ? (local.sizeMax ? formatBytes(local.sizeMax) : "") :
                                local[key]
                              }
                              onChange={(e) => setLocal((s) => ({ 
                                ...s, 
                                [key]: key.includes("size") 
                                  ? toBytes(e.target.value) || 0 
                                  : e.target.value 
                              }))}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Toggles avec design futuriste */}
                      <div className="flex flex-wrap items-center gap-8">
                        {[
                          { key: "favoritesOnly", label: "⭐ Favoris uniquement", icon: FaStar },
                          { key: "unreadOnly", label: "👁️ Non lus seulement", icon: FaEye }
                        ].map(({ key, label, icon: Icon }) => (
                          <div key={key} className="flex items-center gap-4 group">
                            <div className="relative">
                              <Toggle 
                                on={!!local[key]} 
                                setOn={(v) => setLocal((s) => ({ ...s, [key]: v }))}
                                className="scale-125"
                              />
                              {local[key] && (
                                <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping" />
                              )}
                            </div>
                            <label className="text-sm font-bold text-white/90 flex items-center gap-2 cursor-pointer group-hover:text-white transition-colors">
                              <Icon className={cls(
                                "transition-all duration-300",
                                local[key] ? "text-yellow-400 animate-pulse scale-110" : "text-white/50"
                              )} />
                              {label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </GlassSection>
                </div>
              </div>

            {/* Actions avec design épique */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/30">
              
              {/* Zone gauche - Statistiques et sauvegarde */}
              <div className="flex flex-wrap items-center gap-4">
                {stats.hasFilters && (
                  <>
                    <button 
                      className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-green-500/80 to-emerald-500/80 text-white font-bold shadow-lg hover:from-green-400 hover:to-emerald-400 transition-all duration-300 hover:scale-105 backdrop-blur-sm group"
                      onClick={() => setShowSaveDialog(true)}
                    >
                      <FaSave className="group-hover:animate-spin" />
                      Sauvegarder
                    </button>
                    
                    <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 text-white font-semibold flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      {stats.activeCount} filtre{stats.activeCount > 1 ? 's' : ''} actif{stats.activeCount > 1 ? 's' : ''}
                    </div>
                  </>
                )}
              </div>
              
              {/* Zone droite - Actions principales */}
              <div className="flex gap-4">
                <button 
                  className={cls(
                    "px-6 py-3 rounded-2xl font-bold transition-all duration-300 shadow-lg",
                    "border-2 backdrop-blur-sm",
                    stats.hasFilters 
                      ? "bg-red-500/80 border-red-400 text-white hover:bg-red-400 hover:scale-105 hover:shadow-red-500/25"
                      : "bg-white/60 border-white/50 text-slate-400 cursor-not-allowed"
                  )}
                  onClick={reset}
                  disabled={!stats.hasFilters}
                >
                  💥 Réinitialiser
                </button>
                
                <button 
                  className={cls(
                    "px-8 py-3 rounded-2xl font-bold text-white shadow-xl transition-all duration-300",
                    "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600",
                    "hover:from-blue-500 hover:via-purple-500 hover:to-pink-500",
                    "transform hover:scale-110 hover:rotate-1",
                    "relative overflow-hidden group",
                    appliedTrigger && "animate-pulse scale-110"
                  )}
                  onClick={apply}
                >
                  {/* Effet de brillance */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  
                  <span className="relative z-10 flex items-center gap-2">
                    <FaRocket className={cls(
                      "transition-transform duration-300",
                      appliedTrigger ? "animate-bounce" : "group-hover:rotate-12"
                    )} />
                    🚀 APPLIQUER LES FILTRES
                  </span>
                </button>
              </div>
            </div>
          
          </div>
        </div>
      </div>

      {/* Modal de sauvegarde avec design glassmorphism */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/30 transform animate-in zoom-in-50 duration-300">
            
            {/* Header avec effet */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <FaSave className="text-white text-2xl animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                💾 Sauvegarder le filtre
              </h3>
              <p className="text-slate-600 text-sm mt-2">Donnez un nom à cette combinaison de filtres</p>
            </div>
            
            {/* Input avec design futuriste */}
            <div className="relative mb-6">
              <input
                type="text"
                placeholder="🏷️ Nom du filtre magique..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveFilter()}
                className="w-full px-6 py-4 rounded-2xl bg-white/80 backdrop-blur-sm border-2 border-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/90 transition-all duration-300 font-medium text-lg shadow-lg"
                autoFocus
              />
              
              {/* Indicateur de validation */}
              <div className={cls(
                "absolute right-4 top-1/2 transform -translate-y-1/2 transition-all duration-300",
                filterName.trim() ? "opacity-100 scale-100" : "opacity-0 scale-50"
              )}>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-6 py-3 text-slate-600 bg-white/60 backdrop-blur-sm rounded-2xl font-semibold hover:bg-white/80 transition-all duration-300 border border-white/50"
              >
                ❌ Annuler
              </button>
              <button
                onClick={handleSaveFilter}
                disabled={!filterName.trim()}
                className={cls(
                  "flex-1 px-6 py-3 rounded-2xl font-bold text-white transition-all duration-300 shadow-lg",
                  filterName.trim()
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 hover:scale-105"
                    : "bg-slate-400 cursor-not-allowed"
                )}
              >
                ✨ Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}