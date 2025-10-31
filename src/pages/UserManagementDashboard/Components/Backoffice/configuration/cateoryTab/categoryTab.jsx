// src/pages/categories/CategoryIndex.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useCategories } from './useCategory';
import CategoryModal from './CategoryModal';
import Toast from "../../../../../../component/toast/Toaster";
// import Pagination from "../../../../../../component/pagination/Pagination"; // ← supprimé
import LoadingComponent from "../../../../../../component/loading/LoadingComponent";
import {
  FaPenAlt, FaTrashAlt, FaSortAlphaDown, FaSortAlphaUp,
  FaRecycle, FaUndo, FaTrash, FaArrowLeft, FaFilter,
  FaClock, FaThLarge, FaTable, FaPlus, FaColumns,
  FaSort, FaSortUp, FaSortDown, FaTimes, FaSpinner, FaCheck,
  FaEye, FaCalendarAlt, FaTag, FaUser, FaEdit, FaExternalLinkAlt
} from 'react-icons/fa';
import {
  FiRefreshCw, FiFilter as FiFilterIcon,
  FiChevronDown, FiChevronUp, FiGrid, FiList, FiSave,
  FiTrash2
} from 'react-icons/fi';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar, faBook, faLeaf, faHeart, faCoffee, faCamera,
  faGlobe, faMusic, faPen, faFilm, faFolder, faCode, faChartPie,
  faBriefcase, faCar, faLaptop, faGamepad, faShoppingCart,
  faBicycle, faPlane, faTree, faUserFriends, faHandshake,
  faBell, faFlag, faTools, faLightbulb, faMicrochip, faCloud, faGift
} from "@fortawesome/free-solid-svg-icons";

import "./CategoryTab.css";

// Configuration Axios
axios.defaults.baseURL = axios.defaults.baseURL || '/api';

// Helpers
const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
};

const playSound = (type) => {
  const audio = new Audio(
    type === "delete" ? "/sounds/delete-woosh.mp3" : "/sounds/restore-pop.mp3"
  );
  audio.volume = 0.7;
  audio.play().catch(() => {});
};

// Collapse Component
function Collapse({ open, children, duration = 260 }) {
  return (
    <div
      className="grid transition-[grid-template-rows] ease-in-out"
      style={{ gridTemplateRows: open ? '1fr' : '0fr', transitionDuration: `${duration}ms` }}
      aria-hidden={!open}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

// Portal Component
const Portal = ({ children }) => {
  const el = React.useMemo(() => document.createElement('div'), []);
  useEffect(() => {
    document.body.appendChild(el);
    return () => { document.body.removeChild(el); };
  }, [el]);
  return ReactDOM.createPortal(children, el);
};

export default function CategoryIndex() {
  const navigate = useNavigate();
  const location = useLocation();

  // States principaux
  const [add, setAdd] = useState(false);
  const [category, setCategory] = useState(null);
  const [toast, setToast] = useState(null);

  // Recherche & Filtres
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    color: '',
    status: 'active'
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [trashPage, setTrashPage] = useState(1);
  const [perPage, setPerPage] = useState(12);

  // Tri
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const sortableCols = [
    { key: 'name', label: 'Nom' },
    { key: 'created_at', label: 'Date de création' },
    { key: 'items_count', label: 'Nombre d\'articles' },
  ];

  // Vue
  const [viewMode, setViewMode] = useState('table');
  const [showTrash, setShowTrash] = useState(false);

  // Drag & Drop
  const [overSoft, setOverSoft] = useState(false);
  const [overHard, setOverHard] = useState(false);
  const [shakeHard, setShakeHard] = useState(false);

  // Sélection multiple
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Accordéon Filtres
  const [showFilters, setShowFilters] = useState(() => {
    try { return localStorage.getItem('categories_filters_open') === '1'; } catch { return false; }
  });

  // Colonnes configurables
  const COLS_KEY = 'categories_visible_cols_v1';
  const defaultCols = { 
    select: true, name: true, description: true, icon: true, 
    color: true, created_at: true, items_count: true, actions: true 
  };
  const [visibleCols, setVisibleCols] = useState(() => {
    try { return { ...defaultCols, ...(JSON.parse(localStorage.getItem(COLS_KEY) || '{}')) }; }
    catch { return defaultCols; }
  });

  // Vues enregistrées
  const VIEWS_KEY = 'categories_saved_views_v1';
  const [viewsModal, setViewsModal] = useState(false);
  const [views, setViews] = useState([]);
  const [newViewName, setNewViewName] = useState('');

  // UI States
  const [colsOpen, setColsOpen] = useState(false);
  const colsBtnRef = useRef(null);
  const colsMenuRef = useRef(null);
  const [colsPos, setColsPos] = useState({ top: 0, left: 0, width: 0 });

  // Hook categories
  const {
    categories,
    trashList,
    loading,
    pageNbr,
    deleteCategory,
    loadCategories,
    loadTrashedCategories,
    restoreCategory,
    forceDeleteCategory,
  } = useCategories();

  // Icon mapping
  const ICON_MAP = {
    "fa-star": faStar, "fa-book": faBook, "fa-leaf": faLeaf, "fa-heart": faHeart,
    "fa-coffee": faCoffee, "fa-camera": faCamera, "fa-globe": faGlobe,
    "fa-music": faMusic, "fa-pen": faPen, "fa-film": faFilm, "fa-folder": faFolder,
    "fa-code": faCode, "fa-chart-pie": faChartPie, "fa-briefcase": faBriefcase,
    "fa-car": faCar, "fa-laptop": faLaptop, "fa-gamepad": faGamepad,
    "fa-shopping-cart": faShoppingCart, "fa-bicycle": faBicycle, "fa-plane": faPlane,
    "fa-tree": faTree, "fa-user-friends": faUserFriends, "fa-handshake": faHandshake,
    "fa-bell": faBell, "fa-flag": faFlag, "fa-tools": faTools,
    "fa-lightbulb": faLightbulb, "fa-microchip": faMicrochip, "fa-cloud": faCloud,
    "fa-gift": faGift,
  };

  // Compteur de filtres actifs
  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (search?.trim()) c++;
    if (filters.color) c++;
    if (filters.status && filters.status !== 'active') c++;
    return c;
  }, [filters, search]);

  // Référence pour suivre les dépendances précédentes
  const previousDeps = useRef({});

  // Chargement des données avec debouncing
  const loadData = useCallback(async () => {
    try {
      if (showTrash) {
        await loadTrashedCategories(trashPage, search);
      } else {
        await loadCategories(search, page, perPage);
      }
    } catch (error) {
      // Les erreurs d'annulation sont déjà gérées dans le hook
      if (error.name !== 'AbortError' && error.code !== 'ECONNABORTED') {
        setToast({ type: 'error', message: 'Erreur de chargement' });
      }
    }
  }, [showTrash, search, page, perPage, trashPage, loadCategories, loadTrashedCategories]);

  // useEffect principal avec protection contre les boucles
  useEffect(() => {
    const currentDeps = { showTrash, search, page, trashPage, perPage };
    if (JSON.stringify(previousDeps.current) === JSON.stringify(currentDeps)) return;
    previousDeps.current = currentDeps;
    const timeoutId = setTimeout(() => { loadData(); }, 300);
    return () => clearTimeout(timeoutId);
  }, [showTrash, search, page, perPage, trashPage, loadData]);

  // Réinitialiser la page quand on change de vue ou de recherche
  useEffect(() => {
    if (showTrash) setTrashPage(1);
    else setPage(1);
  }, [showTrash, search]);

  // Gestion du tri
  const toggleSort = (key) => {
    if (sortBy === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }) =>
    (sortBy !== col ? <FaSort className="opacity-40" /> : (sortDir === 'asc' ? <FaSortUp /> : <FaSortDown />));

  // Filtrage et tri des catégories
  const filteredCategories = useMemo(() => {
    let filtered = [...categories].filter(cat => 
      cat.name?.toLowerCase().includes(search.toLowerCase()) &&
      (filters.color ? cat.color === filters.color : true) &&
      (filters.status === 'active' ? !cat.deleted_at : true)
    );

    // Tri
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case 'created_at':
          aVal = new Date(a.created_at || 0);
          bVal = new Date(b.created_at || 0);
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        case 'items_count':
          aVal = a.items_count || 0;
          bVal = b.items_count || 0;
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        default:
          return 0;
      }
    });

    return filtered;
  }, [categories, search, filters, sortBy, sortDir]);

  // Gestion des modals et actions
  const handleModalSuccess = () => {
    setAdd(false);
    setCategory(null);
    loadData();
    setToast({ type: "success", message: "Catégorie enregistrée avec succès" });
  };

  const handleDelete = async (id, mode = "soft") => {
    try {
      if (mode === "soft") {
        await deleteCategory(id);
        playSound("delete");
        setToast({ type: "success", message: "Catégorie envoyée à la corbeille" });
      } else {
        await forceDeleteCategory(id);
        playSound("delete");
        setToast({ type: "success", message: "Catégorie supprimée définitivement" });
      }
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: "Erreur lors de la suppression" });
    }
  };

  const handleRestore = async (id) => {
    try {
      await restoreCategory(id);
      playSound("restore");
      setToast({ type: "success", message: "Catégorie restaurée" });
    } catch {
      setToast({ type: "error", message: "Erreur lors de la restauration" });
    }
  };

  // Drag & Drop
  const onDragStart = (e, cat) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: cat.id, name: cat.name }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDropSoft = async (e) => {
    e.preventDefault(); 
    setOverSoft(false);
    try {
      const payload = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
      if (!payload?.id) return;
      await handleDelete(payload.id, 'soft');
    } catch { 
      setToast({ type: 'error', message: 'Erreur lors de l\'envoi à la corbeille' }); 
    }
  };

  const onDropHard = async (e) => {
    e.preventDefault(); 
    setOverHard(false);
    try {
      const payload = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
      if (!payload?.id) return;
      await handleDelete(payload.id, 'hard');
    } catch { 
      setToast({ type: 'error', message: 'Erreur lors de la suppression' }); 
    }
  };

  // Gestion des colonnes
  useEffect(() => {
    localStorage.setItem(COLS_KEY, JSON.stringify(visibleCols));
  }, [visibleCols]);

  useEffect(() => {
    if (!colsOpen || !colsBtnRef.current) return;
    const updatePosition = () => {
      const rect = colsBtnRef.current.getBoundingClientRect();
      setColsPos({ 
        top: rect.bottom + window.scrollY + 8, 
        left: rect.left + window.scrollX, 
        width: rect.width 
      });
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [colsOpen]);

  useEffect(() => {
    if (!colsOpen) return;
    const handleClickOutside = (e) => {
      if (colsMenuRef.current?.contains(e.target)) return;
      if (colsBtnRef.current?.contains(e.target)) return;
      setColsOpen(false);
    };
    const handleEsc = (e) => { if (e.key === 'Escape') setColsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [colsOpen]);

  // Vues enregistrées
  const loadViews = () => {
    try { return JSON.parse(localStorage.getItem(VIEWS_KEY) || '[]'); } 
    catch { return []; }
  };

  const saveViews = (list) => {
    localStorage.setItem(VIEWS_KEY, JSON.stringify(list.slice(0, 30)));
  };

  const saveCurrentView = () => {
    const payload = { 
      name: newViewName || `Vue ${new Date().toLocaleString()}`, 
      search, filters, sortBy, sortDir, perPage, viewMode, 
      createdAt: Date.now() 
    };
    const next = [payload, ...views];
    setViews(next); 
    saveViews(next);
    setNewViewName(''); 
    setViewsModal(false);
    setToast({ type: 'success', message: 'Vue enregistrée' });
  };

  const applyView = (v) => {
    setSearch(v.search || '');
    setFilters(v.filters || {});
    setSortBy(v.sortBy || 'name');
    setSortDir(v.sortDir || 'asc');
    setPerPage(v.perPage || 24);
    setViewMode(v.viewMode || 'table');
    setViewsModal(false);
  };

  const deleteView = (idx) => {
    const next = views.filter((_, i) => i !== idx);
    setViews(next); 
    saveViews(next);
  };

  // Rendu
  return (
    <div className="relative bg-white rounded-xl shadow-sm ring-1 ring-slate-200/70 flex flex-col">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="relative overflow-hidden p-5 border-b bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-600 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-cyan-300/10 blur-3xl" />
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Catégories</h2>
            <p className="text-sm text-white/90 mt-1">Gestion des catégories du backoffice</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!showTrash && (
              <button
                onClick={() => setAdd(true)}
                className="px-3 py-2 rounded-xl bg-white text-blue-700 hover:bg-white/95 border border-white/40 shadow-sm inline-flex items-center gap-2 transition"
                title="Créer une catégorie"
              >
                <FaPlus /> Créer
              </button>
            )}

            {/* Colonnes */}
            <div className="relative z-50">
              <button
                ref={colsBtnRef}
                onClick={() => setColsOpen(v => !v)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm inline-flex items-center gap-2 transition text-white"
                title="Colonnes visibles"
                type="button"
              >
                <FaColumns className="opacity-90" />
                <span>Colonnes</span>
              </button>

              {colsOpen && (
                <Portal>
                  <div
                    ref={colsMenuRef}
                    style={{ 
                      position: 'absolute', 
                      top: colsPos.top, 
                      left: colsPos.left, 
                      minWidth: Math.max(256, colsPos.width), 
                      zIndex: 9999 
                    }}
                    className="rounded-xl border bg-white/95 backdrop-blur shadow-xl p-3 text-slate-800"
                    role="menu"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">Colonnes visibles</span>
                      <div className="flex gap-2">
                        <button 
                          className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                          onClick={() => setVisibleCols(prev => 
                            Object.fromEntries(Object.keys(prev).map(k => [k, true]))
                          )}
                        >
                          Tout
                        </button>
                        <button 
                          className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                          onClick={() => setVisibleCols(prev => {
                            const allOff = Object.fromEntries(Object.keys(prev).map(k => [k, false]));
                            allOff.select = true;
                            allOff.actions = true;
                            return allOff;
                          })}
                        >
                          Aucun
                        </button>
                        <button 
                          className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50" 
                          onClick={() => setVisibleCols(defaultCols)}
                          title="Réinitialiser"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-1 text-sm">
                      {[
                        ['select', 'Sélection'],
                        ['name', 'Nom'],
                        ['description', 'Description'],
                        ['icon', 'Icône'],
                        ['color', 'Couleur'],
                        ['created_at', 'Date de création'],
                        ['items_count', 'Nb articles'],
                        ['actions', 'Actions'],
                      ].map(([key, label]) => (
                        <label key={key} className="inline-flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="accent-blue-600" 
                            checked={!!visibleCols[key]} 
                            onChange={() => setVisibleCols(p => ({ ...p, [key]: !p[key] }))} 
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </Portal>
              )}
            </div>

            <button onClick={loadData} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm inline-flex items-center gap-2 transition" title="Actualiser">
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>

            <button onClick={() => setViewsModal(true)} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm inline-flex items-center gap-2 transition" title="Vues enregistrées">
              <FiSave /> Vues
            </button>

            <button
              onClick={() => setShowFilters(v => !v)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm inline-flex items-center gap-2 transition"
              title="Afficher/Masquer les filtres"
            >
              <FiFilterIcon />
              <span>Filtres</span>
              <span className="inline-flex items-center justify-center min-w-5 h-5 text-[11px] font-semibold rounded-full bg-white/20 px-1">
                {activeFiltersCount}
              </span>
              {showFilters ? <FiChevronUp /> : <FiChevronDown />}
            </button>

            <div className="ml-2 inline-flex rounded-xl bg-white/10 p-1 border border-white/20 backdrop-blur-sm">
              <button 
                className={`px-3 py-2 rounded-lg flex items-center gap-2 transition ${viewMode === 'table' ? 'bg-white text-blue-700 shadow-sm' : 'text-white/90 hover:bg-white/10'}`} 
                onClick={() => setViewMode('table')} 
                title="Vue table"
              >
                <FiList /> Table
              </button>
              <button 
                className={`px-3 py-2 rounded-lg flex items-center gap-2 transition ${viewMode === 'grid' ? 'bg-white text-blue-700 shadow-sm' : 'text-white/90 hover:bg-white/10'}`} 
                onClick={() => setViewMode('grid')} 
                title="Vue grid"
              >
                <FiGrid /> Grid
              </button>
            </div>

            <button
              onClick={() => setShowTrash(!showTrash)}
              className={`px-4 py-2 rounded-xl inline-flex items-center gap-2 transition ${
                showTrash ? "bg-white/20 text-white" : "bg-white/10 hover:bg-white/20 text-white"
              } border border-white/20 backdrop-blur-sm`}
            >
              {showTrash ? <><FaArrowLeft /> Retour</> : <><FaRecycle /> Corbeille</>}
            </button>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="border-b bg-white">
        <button
          type="button"
          onClick={() => setShowFilters(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-slate-700 hover:bg-slate-50 transition"
          aria-expanded={showFilters}
        >
          <span className="inline-flex items-center gap-2 font-medium">
            <FaFilter className="text-slate-500" /> Filtres
            <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700 px-1">
              {activeFiltersCount}
            </span>
          </span>
          <span className="text-slate-500">{showFilters ? <FiChevronUp /> : <FiChevronDown />}</span>
        </button>

        <Collapse open={showFilters}>
          <div className="p-4 border-t bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Recherche */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recherche</label>
                <input
                  type="text"
                  placeholder="Rechercher une catégorie..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Filtre par couleur */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Couleur</label>
                <select
                  value={filters.color}
                  onChange={(e) => setFilters(f => ({ ...f, color: e.target.value }))}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Toutes les couleurs</option>
                  <option value="#ef4444">Rouge</option>
                  <option value="#3b82f6">Bleu</option>
                  <option value="#10b981">Vert</option>
                  <option value="#8b5cf6">Violet</option>
                  <option value="#f59e0b">Orange</option>
                  <option value="#ec4899">Rose</option>
                </select>
              </div>

              {/* Items par page */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Éléments par page</label>
                <select
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                  <option value={96}>96</option>
                </select>
              </div>
            </div>
          </div>
        </Collapse>
      </div>

      {/* Contenu principal avec gestion du loading */}
      <div className="flex-1 overflow-y-auto pb-36 mb-96" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <LoadingComponent />
          </div>
        ) : showTrash ? (
          // Vue Corbeille (sans pagination interne)
          <div className="p-4">
            <h3 className="font-semibold text-lg text-gray-700 mb-4">
              Catégories supprimées ({trashList?.length || 0})
            </h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Nom</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Description</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Icône</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Supprimée le</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {trashList?.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-3 py-8 text-center text-slate-500">
                        Aucune catégorie dans la corbeille
                      </td>
                    </tr>
                  ) : (
                    trashList.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-4 text-sm font-medium text-slate-900">{cat.name}</td>
                        <td className="px-3 py-4 text-sm text-slate-600">{cat.description}</td>
                        <td className="px-3 py-4">
                          <FontAwesomeIcon 
                            icon={ICON_MAP[cat.icon] || faFolder} 
                            style={{ color: cat.color }} 
                            className="text-lg"
                          />
                        </td>
                        <td className="px-3 py-4 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <FaClock className="text-slate-400" size={12} />
                            {formatDate(cat.deleted_at)}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleRestore(cat.id)}
                              className="p-2 rounded-lg border text-green-600 bg-green-50 border-green-200 hover:bg-green-100 transition"
                              title="Restaurer"
                            >
                              <FaUndo size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(cat.id, "hard")}
                              className="p-2 rounded-lg border text-red-600 bg-red-50 border-red-200 hover:bg-red-100 transition"
                              title="Supprimer définitivement"
                            >
                              <FaTrash size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          // Vue Table (sans pagination interne)
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {visibleCols.select && (
                    <th className="px-3 py-3 text-xs font-medium text-slate-600 w-12">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        onChange={(e) => {
                          const ids = filteredCategories.map(c => c.id);
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            if (ids.length && ids.every(id => next.has(id))) {
                              ids.forEach(id => next.delete(id));
                            } else {
                              ids.forEach(id => next.add(id));
                            }
                            return next;
                          });
                        }}
                      />
                    </th>
                  )}

                  {visibleCols.name && (
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">
                      <button 
                        onClick={() => toggleSort('name')} 
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        Nom <SortIcon col="name" />
                      </button>
                    </th>
                  )}

                  {visibleCols.description && (
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Description</th>
                  )}

                  {visibleCols.icon && (
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Icône</th>
                  )}

                  {visibleCols.color && (
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Couleur</th>
                  )}

                  {visibleCols.created_at && (
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">
                      <button 
                        onClick={() => toggleSort('created_at')} 
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        Créée le <SortIcon col="created_at" />
                      </button>
                    </th>
                  )}

                  {visibleCols.items_count && (
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">
                      <button 
                        onClick={() => toggleSort('items_count')} 
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        Articles <SortIcon col="items_count" />
                      </button>
                    </th>
                  )}

                  {visibleCols.actions && (
                    <th className="px-3 py-3 text-right text-xs font-medium text-slate-600">Actions</th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={Object.values(visibleCols).filter(Boolean).length} 
                      className="px-3 py-8 text-center text-slate-500"
                    >
                      Aucune catégorie trouvée
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => (
                    <tr 
                      key={cat.id} 
                      className="hover:bg-slate-50/50 transition-colors group"
                      draggable
                      onDragStart={(e) => onDragStart(e, cat)}
                      style={{ borderLeft: `4px solid ${cat.color}` }}
                    >
                      {visibleCols.select && (
                        <td className="px-3 py-4">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedIds.has(cat.id)}
                            onChange={() => setSelectedIds(prev => {
                              const next = new Set(prev);
                              next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id);
                              return next;
                            })}
                          />
                        </td>
                      )}

                      {visibleCols.name && (
                        <td className="px-3 py-4">
                          <div className="font-medium" style={{ color: cat.color }}>
                            {cat.name}
                          </div>
                        </td>
                      )}

                      {visibleCols.description && (
                        <td className="px-3 py-4 text-sm text-slate-600">
                          {cat.description}
                        </td>
                      )}

                      {visibleCols.icon && (
                        <td className="px-3 py-4">
                          <FontAwesomeIcon 
                            icon={ICON_MAP[cat.icon] || faFolder} 
                            style={{ color: cat.color }} 
                            className="text-lg"
                          />
                        </td>
                      )}

                      {visibleCols.color && (
                        <td className="px-3 py-4">
                          <div 
                            className="w-6 h-6 rounded-full border border-slate-200"
                            style={{ backgroundColor: cat.color }}
                            title={cat.color}
                          />
                        </td>
                      )}

                      {visibleCols.created_at && (
                        <td className="px-3 py-4 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <FaCalendarAlt className="text-slate-400" size={12} />
                            {formatDate(cat.created_at)}
                          </div>
                        </td>
                      )}

                      {visibleCols.items_count && (
                        <td className="px-3 py-4 text-sm text-slate-600">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {cat.items_count || 0}
                          </span>
                        </td>
                      )}

                      {visibleCols.actions && (
                        <td className="px-3 py-4 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => { setCategory(cat); setAdd(true); }}
                              className="p-2 rounded-lg border text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 transition"
                              title="Modifier"
                            >
                              <FaPenAlt size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(cat.id, "soft")}
                              className="p-2 rounded-lg border text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100 transition"
                              title="Envoyer à la corbeille"
                            >
                              <FaTrashAlt size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          // Vue Grid (sans pagination interne)
          <div className="p-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCategories.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-500">
                  <div className="text-6xl mb-2">📁</div>
                  <p className="text-lg">Aucune catégorie trouvée</p>
                </div>
              ) : (
                filteredCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="relative rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 border-slate-200 hover:shadow-md"
                    draggable
                    onDragStart={(e) => onDragStart(e, cat)}
                    style={{ borderLeft: `4px solid ${cat.color}` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <FontAwesomeIcon 
                        icon={ICON_MAP[cat.icon] || faFolder} 
                        style={{ color: cat.color }} 
                        className="text-2xl"
                      />
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedIds.has(cat.id)}
                        onChange={() => setSelectedIds(prev => {
                          const next = new Set(prev);
                          next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id);
                          return next;
                        })}
                      />
                    </div>

                    <h3 className="font-semibold text-slate-900 mb-2" style={{ color: cat.color }}>
                      {cat.name}
                    </h3>

                    {cat.description && (
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                        {cat.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <div className="flex items-center gap-1">
                        <FaCalendarAlt size={10} />
                        {formatDate(cat.created_at)}
                      </div>
                      <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                        {cat.items_count || 0} articles
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setCategory(cat); setAdd(true); }}
                        className="p-2 rounded-lg border text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 transition"
                        title="Modifier"
                      >
                        <FaPenAlt size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, "soft")}
                        className="p-2 rounded-lg border text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100 transition"
                        title="Envoyer à la corbeille"
                      >
                        <FaTrashAlt size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pagination sticky unique (seule pagination de la page) */}
      <div className="fixed bottom-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/95 backdrop-blur border-t rounded-b-xl shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <div className="text-sm text-slate-600">
          Total : <b>{showTrash ? (trashList?.length || 0) : (filteredCategories.length || 0)}</b>
          {!showTrash && (
            <> • Page <b>{page}</b> / <b>{pageNbr || 1}</b></>
          )}
        </div>
        {!showTrash && (
          <div className="flex items-center gap-2">
            <button 
              className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-50" 
              disabled={page <= 1} 
              onClick={() => {
                if (page > 1) {
                  const newPage = page - 1;
                  setPage(newPage);
                  loadCategories(search, newPage, perPage);
                }
              }}
            >
              Préc.
            </button>
            <button 
              className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-50" 
              disabled={page >= (pageNbr || 1)} 
              onClick={() => {
                if (page < pageNbr) {
                  const newPage = page + 1;
                  setPage(newPage);
                  loadCategories(search, newPage, perPage);
                }
              }}
            >
              Suiv.
            </button>
          </div>
        )}
      </div>

      {/* Modal Category */}
      <CategoryModal
        isOpen={add}
        onClose={() => { setCategory(null); setAdd(false); }}
        category={category}
        onSuccess={handleModalSuccess}
      />

      {/* Dock DnD */}
      {!showTrash && (
        <div className="fixed right-10 bottom-10 flex flex-col gap-3 z-40">
          <div 
            onDragOver={(e) => e.preventDefault()} 
            onDragEnter={() => setOverSoft(true)} 
            onDragLeave={() => setOverSoft(false)}
            onDrop={onDropSoft}
            className={`dock-btn ${overSoft ? "active-soft" : ""}`}
          >
            🗑 Corbeille
          </div>
          <div 
            onDragOver={(e) => e.preventDefault()} 
            onDragEnter={() => setOverHard(true)} 
            onDragLeave={() => { setOverHard(false); setShakeHard(true); setTimeout(() => setShakeHard(false), 400); }}
            onDrop={onDropHard}
            className={`dock-btn danger ${overHard ? "active-hard" : ""} ${shakeHard ? "wiggle" : ""}`}
          >
            ❌ Supprimer
          </div>
        </div>
      )}
    </div>
  );
}
