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
  FaCog,
  FaTags,
  FaUsers,
  FaStar,
  FaEye
} from "react-icons/fa";
import { Pill, Toggle } from "../shared/atoms/atoms";
import { TYPES, CATS, TAGS } from "../shared/constants";
import { toBytes } from "../shared/utils/query";
import { formatBytes, cls } from "../shared/utils/format";

// Hook pour gérer les filtres sauvegardés
const useSavedFilters = () => {
  const [savedFilters, setSavedFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('media-library-filters');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveFilter = useCallback((name, filters) => {
    const newSaved = [...savedFilters, { 
      name, 
      filters, 
      id: Date.now(),
      createdAt: new Date().toISOString()
    }];
    setSavedFilters(newSaved);
    try {
      localStorage.setItem('media-library-filters', JSON.stringify(newSaved));
    } catch (error) {
      console.warn('Could not save filters to localStorage:', error);
    }
  }, [savedFilters]);

  const deleteFilter = useCallback((id) => {
    const newSaved = savedFilters.filter(f => f.id !== id);
    setSavedFilters(newSaved);
    try {
      localStorage.setItem('media-library-filters', JSON.stringify(newSaved));
    } catch (error) {
      console.warn('Could not update localStorage:', error);
    }
  }, [savedFilters]);

  return { savedFilters, saveFilter, deleteFilter };
};

// Hook pour l'historique de recherche
const useSearchHistory = () => {
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('media-library-search-history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addToHistory = useCallback((search) => {
    if (!search.trim()) return;
    const newHistory = [
      { term: search, timestamp: Date.now(), id: Date.now() },
      ...history.filter(h => h.term !== search)
    ].slice(0, 10);
    setHistory(newHistory);
    try {
      localStorage.setItem('media-library-search-history', JSON.stringify(newHistory));
    } catch (error) {
      console.warn('Could not save search history:', error);
    }
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
  
  const searchRef = useRef(null);
  const { savedFilters, saveFilter, deleteFilter } = useSavedFilters();
  const { history, addToHistory } = useSearchHistory();

  // Synchronisation avec les props
  useEffect(() => setLocal(filters), [filters]);
  useEffect(() => setQ(search), [search]);

  // Calcul des statistiques
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
      hasFilters: activeCount > 0
    };
  }, [local]);

  // Actions
  const apply = useCallback(() => {
    setFilters(local);
    setOpen(false);
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

  const handleSaveFilter = useCallback(() => {
    if (filterName.trim()) {
      saveFilter(filterName.trim(), local);
      setFilterName("");
      setShowSaveDialog(false);
    }
  }, [filterName, local, saveFilter]);

  // Composant section collapsible
  const FilterSection = ({ title, children, sectionKey, icon: Icon }) => {
    const isActive = activeSection === sectionKey;
    
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <button
          onClick={() => setActiveSection(isActive ? null : sectionKey)}
          className="w-full px-4 py-3 flex items-center justify-between text-left bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200"
        >
          <div className="flex items-center gap-3">
            <Icon className="text-gray-600" />
            <span className="font-medium text-gray-900">{title}</span>
          </div>
          <FaChevronDown className={cls(
            "text-gray-400 transition-transform duration-200",
            isActive && "rotate-180"
          )} />
        </button>
        
        <div className={cls(
          "transition-all duration-300 ease-out overflow-hidden",
          isActive 
            ? "max-h-[500px] opacity-100" 
            : "max-h-0 opacity-0"
        )}>
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    );
  };

  // Pill simple
  const FilterPill = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={cls(
        "px-3 py-1.5 rounded-md text-sm font-medium transition-colors border",
        active 
          ? "bg-blue-50 text-blue-700 border-blue-200" 
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
      
      {/* Header principal */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Zone de recherche */}
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <div className="relative">
                <input
                  ref={searchRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch(q)}
                  onFocus={() => setShowHistory(history.length > 0)}
                  onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                  placeholder="Rechercher..."
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                
                {q && (
                  <button
                    onClick={() => setQ("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes className="text-sm" />
                  </button>
                )}
                
                {/* Dropdown historique */}
                {showHistory && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    <div className="p-2 border-b border-gray-100 text-xs text-gray-600 flex items-center gap-2 bg-gray-50">
                      <FaHistory />
                      Recherches récentes
                    </div>
                    {history.map((item, index) => (
                      <button
                        key={item.id || index}
                        onClick={() => handleSearch(item.term || item)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
                      >
                        {item.term || item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bouton recherche */}
            {q !== search && (
              <button 
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                onClick={() => handleSearch(q)}
              >
                Rechercher
              </button>
            )}
          </div>

          {/* Contrôles */}
          <div className="flex items-center gap-3 flex-wrap">
            
            {/* Bouton filtres */}
            <button 
              onClick={() => setOpen(!open)} 
              className={cls(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors",
                stats.hasFilters 
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
              )}
            >
              <FaFilter />
              <span>Filtres</span>
              
              {stats.activeCount > 0 && (
                <span className="bg-white text-blue-600 text-xs px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">
                  {stats.activeCount}
                </span>
              )}
            </button>

            {/* Sélecteurs de vue */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { key: 'grid', icon: FaThLarge, label: 'Grille' },
                { key: 'list', icon: FaTable, label: 'Liste' }
              ].map(({ key, icon: Icon, label }) => (
                <button 
                  key={key}
                  className={cls(
                    "px-3 py-1.5 rounded-md text-sm flex items-center gap-2 font-medium transition-colors",
                    view === key 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  )} 
                  onClick={() => setView(key)}
                >
                  <Icon />
                  {label}
                </button>
              ))}
            </div>

            {/* Contrôles pagination */}
            <select 
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={perPage} 
              onChange={(e) => setPerPage(Number(e.target.value))}
            >
              {[12, 24, 48, 96].map((n) => (
                <option key={n} value={n}>{n}/page</option>
              ))}
            </select>

            <select 
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={loadMode} 
              onChange={(e) => setLoadMode(e.target.value)}
            >
              <option value="pagination">Pagination</option>
              <option value="infinite">Défilement infini</option>
            </select>

            {/* Bouton export */}
            <button 
              className="px-4 py-2.5 border border-gray-300 rounded-lg flex items-center gap-2 bg-white hover:bg-gray-50 transition-colors font-medium text-gray-700"
              onClick={() => window.dispatchEvent(new CustomEvent("medialib:export"))}
            >
              <FaDownload />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Panneau de filtres */}
      <div className={cls(
        "transition-all duration-300 ease-out overflow-hidden",
        open 
          ? "max-h-[1000px] opacity-100" 
          : "max-h-0 opacity-0"
      )}>
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          
          {/* Filtres sauvegardés */}
          {savedFilters.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FaBookmark className="text-gray-600" />
                Filtres Sauvegardés
              </h3>
              <div className="flex flex-wrap gap-2">
                {savedFilters.map((saved) => (
                  <div 
                    key={saved.id} 
                    className="group relative bg-white border border-gray-200 rounded-lg"
                  >
                    <button
                      onClick={() => {
                        setLocal(saved.filters);
                        setFilters(saved.filters);
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors flex items-center gap-2"
                    >
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      {saved.name}
                    </button>
                    <button
                      onClick={() => deleteFilter(saved.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sections de filtres */}
          <div className="space-y-4">
            
            {/* Types & Catégories */}
            <FilterSection title="Types & Catégories" sectionKey="types" icon={FaCog}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900">Types de fichiers</label>
                  <div className="flex flex-wrap gap-2">
                    {TYPES.map((t) => (
                      <FilterPill
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
                      </FilterPill>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900">Catégories</label>
                  <div className="flex flex-wrap gap-2">
                    {CATS.map((c) => (
                      <FilterPill
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
                      </FilterPill>
                    ))}
                  </div>
                </div>
              </div>
            </FilterSection>

            {/* Tags & Propriétaires */}
            <FilterSection title="Tags & Propriétaires" sectionKey="tags" icon={FaTags}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {TAGS.map((tg) => (
                      <FilterPill
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
                      </FilterPill>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900">Propriétaires</label>
                  <div className="flex flex-wrap gap-2">
                    {ownersOptions.map((o) => (
                      <FilterPill
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
                      </FilterPill>
                    ))}
                  </div>
                </div>
              </div>
            </FilterSection>

            {/* Filtres Avancés */}
            <FilterSection title="Filtres Avancés" sectionKey="advanced" icon={FaUsers}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Taille min", key: "sizeMin", placeholder: "ex: 10MB" },
                    { label: "Taille max", key: "sizeMax", placeholder: "ex: 500MB" },
                    { label: "Date début", key: "dateFrom", type: "date" },
                    { label: "Date fin", key: "dateTo", type: "date" }
                  ].map(({ label, key, placeholder, type = "text" }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-1 text-gray-900">{label}</label>
                      <input 
                        type={type}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                {/* Toggles */}
                <div className="flex flex-wrap items-center gap-6">
                  {[
                    { key: "favoritesOnly", label: "Favoris uniquement", icon: FaStar },
                    { key: "unreadOnly", label: "Non lus seulement", icon: FaEye }
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center gap-3">
                      <Toggle 
                        on={!!local[key]} 
                        setOn={(v) => setLocal((s) => ({ ...s, [key]: v }))}
                      />
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Icon className="text-gray-500" />
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </FilterSection>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Zone gauche - Statistiques et sauvegarde */}
            <div className="flex flex-wrap items-center gap-3">
              {stats.hasFilters && (
                <>
                  <button 
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    onClick={() => setShowSaveDialog(true)}
                  >
                    <FaSave />
                    Sauvegarder
                  </button>
                  
                  <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-sm font-medium">
                    {stats.activeCount} filtre{stats.activeCount > 1 ? 's' : ''} actif{stats.activeCount > 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
            
            {/* Zone droite - Actions principales */}
            <div className="flex gap-3">
              <button 
                className={cls(
                  "px-4 py-2 rounded-lg font-medium transition-colors",
                  stats.hasFilters 
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
                onClick={reset}
                disabled={!stats.hasFilters}
              >
                Réinitialiser
              </button>
              
              <button 
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                onClick={apply}
              >
                Appliquer les filtres
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de sauvegarde */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FaSave className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Sauvegarder le filtre
              </h3>
              <p className="text-gray-600 text-sm mt-1">Donnez un nom à cette combinaison de filtres</p>
            </div>
            
            <div className="mb-6">
              <input
                type="text"
                placeholder="Nom du filtre..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveFilter()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveFilter}
                disabled={!filterName.trim()}
                className={cls(
                  "flex-1 px-4 py-2 rounded-lg font-medium transition-colors",
                  filterName.trim()
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                )}
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}