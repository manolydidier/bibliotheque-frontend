// src/pages/UserManagementDashboard/Components/Backoffice/miradia/MiradiaSlidesIndex.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  FaImage,
  FaPlus,
  FaSync,
  FaTrash,
  FaEdit,
  FaEye,
  FaToggleOn,
  FaToggleOff,
  FaPalette,
  FaSearch,
  FaColumns,
} from "react-icons/fa";
import Toaster from "../../../../../../component/toast/Toaster";

axios.defaults.baseURL = axios.defaults.baseURL || "/api";

const STORAGE_BASE =
  import.meta.env.VITE_API_BASE_STORAGE ||
  import.meta.env.VITE_API_BASE_URL ||
  window.location.origin;

// Construit l’URL publique de l’image du slide
const buildSlideImageUrl = (slide) => {
  if (!slide?.image_path) return null;
  const base = STORAGE_BASE.replace(/\/$/, "");
  const path = String(slide.image_path).replace(/^\/?storage\//, "");
  return `${base}/storage/${path}`;
};

// Petit helper pour enlever le HTML
const stripHtml = (html) =>
  typeof html === "string" ? html.replace(/<[^>]+>/g, "").trim() : "";

const MiradiaSlidesIndex = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("position"); // 'position' | 'title'
  const [sortDir, setSortDir] = useState("asc");

  const [isSavingToggle, setIsSavingToggle] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);

  // Vue cartes / tableau
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'table'

  // Pagination
  const [perPage, setPerPage] = useState(12);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    perPage: 12,
    total: 0,
  });

  // Colonnes visibles en vue tableau
  const [visibleColumns, setVisibleColumns] = useState({
    image: true,
    tag: true,
    stat: true,
    icon: true,
    color: true,
    active: true,
    description: true,
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Prévisualisation
  const [previewSlide, setPreviewSlide] = useState(null);

  // Filtre description : all | with | without
  const [filterHasDescription, setFilterHasDescription] = useState("all");

  const toggleColumn = (key) =>
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));

  const loadSlides = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const { data } = await axios.get("/miradia-slides", {
          params: {
            all: 1, // backoffice : tous les slides
            page,
            per_page: perPage,
          },
        });

        setSlides(Array.isArray(data.data) ? data.data : []);

        setPagination({
          currentPage: data.current_page,
          lastPage: data.last_page,
          perPage: data.per_page,
          total: data.total,
        });
      } catch (e) {
        setToast({
          type: "error",
          message:
            e?.response?.data?.message ||
            "Erreur lors du chargement des slides Miradia",
        });
      } finally {
        setLoading(false);
      }
    },
    [perPage]
  );

  useEffect(() => {
    loadSlides(1);
  }, [loadSlides]);

  const handleToggleActive = async (slide) => {
    if (!slide?.id) return;
    const next = !slide.is_active;
    setIsSavingToggle(true);

    // Optimiste
    setSlides((prev) =>
      prev.map((s) => (s.id === slide.id ? { ...s, is_active: next } : s))
    );

    try {
      await axios.patch(`/miradia-slides/${slide.id}`, {
        is_active: next,
      });
      setToast({
        type: "success",
        message: next ? "Slide activé" : "Slide désactivé",
      });
    } catch (e) {
      // rollback
      setSlides((prev) =>
        prev.map((s) =>
          s.id === slide.id ? { ...s, is_active: slide.is_active } : s
        )
      );
      setToast({
        type: "error",
        message:
          e?.response?.data?.message ||
          "Erreur lors de la mise à jour du statut",
      });
    } finally {
      setIsSavingToggle(false);
    }
  };

  const handleDelete = async (slide) => {
    if (!slide?.id) return;
    const confirmed = window.confirm(
      `Supprimer définitivement le slide « ${slide.title || "Sans titre"} » ?`
    );
    if (!confirmed) return;

    setIsDeletingId(slide.id);
    try {
      await axios.delete(`/miradia-slides/${slide.id}`);
      setSlides((prev) => prev.filter((s) => s.id !== slide.id));
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
      setToast({
        type: "success",
        message: "Slide supprimé",
      });
    } catch (e) {
      setToast({
        type: "error",
        message:
          e?.response?.data?.message ||
          "Erreur lors de la suppression du slide",
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredSlides = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...slides];

    if (q) {
      list = list.filter((s) => {
        const title = (s.title || "").toLowerCase();
        const tag = (s.tag || "").toLowerCase();
        const desc = stripHtml(s.description || "").toLowerCase();
        return (
          title.includes(q) ||
          tag.includes(q) ||
          desc.includes(q)
        );
      });
    }

    // Filtre description
    if (filterHasDescription === "with") {
      list = list.filter(
        (s) => stripHtml(s.description || "") !== ""
      );
    } else if (filterHasDescription === "without") {
      list = list.filter(
        (s) => stripHtml(s.description || "") === ""
      );
    }

    list.sort((a, b) => {
      if (sortKey === "title") {
        const ta = (a.title || "").toLowerCase();
        const tb = (b.title || "").toLowerCase();
        if (ta < tb) return sortDir === "asc" ? -1 : 1;
        if (ta > tb) return sortDir === "asc" ? 1 : -1;
        return 0;
      }

      const pa = Number(a.position ?? 9999);
      const pb = Number(b.position ?? 9999);
      if (pa < pb) return sortDir === "asc" ? -1 : 1;
      if (pa > pb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [slides, search, sortKey, sortDir, filterHasDescription]);

  const toggleSort = (key) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevKey;
      }
      setSortDir("asc");
      return key;
    });
  };

  const SortBadge = ({ active }) => (
    <span className="inline-flex items-center justify-center ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/20">
      {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  const columnLabels = {
    image: "Image",
    tag: "Tag",
    stat: "Stat / label",
    icon: "Icône",
    color: "Couleur",
    active: "Actif",
    description: "Description",
  };

  return (
    <div className="relative bg-white rounded-xl shadow-sm ring-1 ring-slate-200/70 flex flex-col">
      {toast && (
        <Toaster {...toast} onClose={() => setToast(null)} />
      )}

      {/* HEADER */}
      <div className="relative overflow-hidden p-5 border-b bg-gradient-to-br from-sky-600 via-indigo-600 to-blue-700 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -right-10 w-52 h-52 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 -left-16 w-72 h-72 rounded-full bg-cyan-300/10 blur-3xl" />
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <FaImage className="opacity-90" />
              <span>Miradia – Slides</span>
            </h2>
            <p className="text-sm text-white/90 mt-1">
              Gestion des slides du carrousel Miradia (page /miradia)
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/90">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
                <FaEye />
                <span>Vue publique :</span>
              </span>
              <Link
                to="/miradia"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-sky-700 text-[11px] font-semibold shadow-sm hover:bg-sky-50"
              >
                Voir /miradia
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 z-10">
            <div className="relative">
              <FaSearch className="absolute left-3 top-2.5 text-sky-700/60 text-xs" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par titre, tag, description…"
                className="pl-8 pr-3 py-2 text-sm rounded-xl bg-white/90 text-slate-800 border border-white/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
              />
            </div>

            <button
              type="button"
              onClick={() => loadSlides(pagination.currentPage)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm inline-flex items-center gap-2 transition text-white"
              title="Rafraîchir"
            >
              <FaSync className={loading ? "animate-spin" : ""} />
              <span>Actualiser</span>
            </button>

            <Link
              to="/miradia-slides/new"
              className="px-3 py-2 rounded-xl bg-white text-sky-700 hover:bg-sky-50 border border-white/40 shadow-sm inline-flex items-center gap-2 transition"
              title="Créer un nouveau slide"
            >
              <FaPlus />
              <span>Nouveau</span>
            </Link>
          </div>
        </div>
      </div>

      {/* CONTENU */}
      <div
        className="flex-1 overflow-y-auto pb-24"
        style={{ maxHeight: "calc(100vh - 220px)" }}
      >
        {loading && (
          <div className="bg-amber-50 border-y border-amber-200 text-amber-800 px-4 py-2">
            Chargement des slides…
          </div>
        )}

        {filteredSlides.length === 0 && !loading ? (
          <div className="p-10 text-center text-slate-500">
            <div className="text-5xl mb-3">🌀</div>
            <p className="text-lg mb-2">
              Aucun slide Miradia trouvé.
            </p>
            <p className="text-sm text-slate-400">
              Utilise le bouton <b>Nouveau</b> pour en créer un, ou vérifie
              que ton API <code>/api/miradia-slides</code> retourne bien des
              données.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {/* barre infos + tri + vue + colonnes + pagination/top */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-600">
                Page{" "}
                <span className="font-semibold">
                  {pagination.currentPage}
                </span>{" "}
                / {pagination.lastPage} —{" "}
                <span className="font-semibold">
                  {pagination.total}
                </span>{" "}
                slide(s) au total —{" "}
                <span className="text-slate-500">
                  {filteredSlides.length} sur cette page (filtrés)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Tri */}
                <button
                  type="button"
                  onClick={() => toggleSort("position")}
                  className={`px-2 py-1 rounded-full border ${
                    sortKey === "position"
                      ? "bg-sky-50 border-sky-200 text-sky-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Ordre <SortBadge active={sortKey === "position"} />
                </button>
                <button
                  type="button"
                  onClick={() => toggleSort("title")}
                  className={`px-2 py-1 rounded-full border ${
                    sortKey === "title"
                      ? "bg-sky-50 border-sky-200 text-sky-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Titre <SortBadge active={sortKey === "title"} />
                </button>

                {/* Vue */}
                <span className="mx-1 text-slate-300">|</span>
                <span className="text-slate-500">Vue :</span>
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`px-2 py-1 rounded-full border text-[11px] ${
                    viewMode === "cards"
                      ? "bg-sky-600 border-sky-700 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Cartes
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`px-2 py-1 rounded-full border text-[11px] ${
                    viewMode === "table"
                      ? "bg-sky-600 border-sky-700 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Tableau
                </button>

                {/* Filtre description */}
                <span className="mx-1 text-slate-300">|</span>
                <span className="text-slate-500">Description :</span>
                <select
                  value={filterHasDescription}
                  onChange={(e) =>
                    setFilterHasDescription(e.target.value)
                  }
                  className="border border-slate-200 rounded-full bg-white px-2 py-1 text-[11px]"
                >
                  <option value="all">Toutes</option>
                  <option value="with">Avec description</option>
                  <option value="without">Sans description</option>
                </select>

                {/* Colonnes */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setShowColumnMenu((prev) => !prev)
                    }
                    className="ml-2 px-2 py-1 rounded-full border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1"
                  >
                    <FaColumns className="text-slate-500" />
                    Colonnes
                  </button>
                  {showColumnMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-20">
                      <div className="text-[11px] font-semibold text-slate-500 mb-2">
                        Colonnes affichées (vue tableau)
                      </div>
                      {Object.entries(columnLabels).map(
                        ([key, label]) => (
                          <label
                            key={key}
                            className="flex items-center gap-2 text-xs text-slate-700 mb-1 last:mb-0"
                          >
                            <input
                              type="checkbox"
                              className="rounded border-slate-300"
                              checked={visibleColumns[key]}
                              onChange={() => toggleColumn(key)}
                            />
                            <span>{label}</span>
                          </label>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Per page */}
                <span className="mx-1 text-slate-300">|</span>
                <span className="text-slate-500">Par page :</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10) || 12;
                    setPerPage(v);
                    loadSlides(1);
                  }}
                  className="border border-slate-200 rounded-full bg-white px-2 py-1 text-[11px]"
                >
                  <option value={6}>6</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                </select>

                {/* Pagination top simple */}
                <span className="mx-1 text-slate-300">|</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                    disabled={pagination.currentPage <= 1}
                    onClick={() =>
                      loadSlides(pagination.currentPage - 1)
                    }
                  >
                    «
                  </button>
                  <span className="text-[11px] text-slate-600">
                    {pagination.currentPage} / {pagination.lastPage}
                  </span>
                  <button
                    type="button"
                    className="px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                    disabled={
                      pagination.currentPage >= pagination.lastPage
                    }
                    onClick={() =>
                      loadSlides(pagination.currentPage + 1)
                    }
                  >
                    »
                  </button>
                </div>
              </div>
            </div>

            {/* Vue cartes OU tableau */}
            {viewMode === "cards" ? (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {filteredSlides.map((slide) => {
                  const imgUrl = buildSlideImageUrl(slide);
                  const color = slide.color || "#0ea5e9";
                  const position = slide.position ?? "—";
                  const isActive = !!slide.is_active;

                  return (
                    <article
                      key={slide.id ?? `${slide.title}-${position}`}
                      className="relative rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 flex flex-col"
                    >
                      {/* Bandeau position & statut */}
                      <div className="flex items-center justify-between px-4 pt-3 pb-2 text-xs">
                        <div className="inline-flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                            #{position}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                            <FaPalette className="text-slate-500" />
                            <span>Couleur</span>
                            <span
                              className="inline-block w-3 h-3 rounded-full border border-slate-300"
                              style={{ backgroundColor: color }}
                            />
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(slide)}
                          disabled={isSavingToggle}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}
                          title={
                            isActive
                              ? "Désactiver ce slide"
                              : "Activer ce slide"
                          }
                        >
                          {isActive ? (
                            <>
                              <FaToggleOn />
                              <span>Actif</span>
                            </>
                          ) : (
                            <>
                              <FaToggleOff />
                              <span>Inactif</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="px-4 pb-3">
                        {/* Image */}
                        <div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-slate-100 mb-3 flex items-center justify-center">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={slide.title || "Slide Miradia"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center text-slate-400 text-sm">
                              <FaImage className="mb-1 text-xl" />
                              <span>Aucune image</span>
                            </div>
                          )}
                        </div>

                        {/* Texte */}
                        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 mb-1">
                          {slide.title || (
                            <span className="italic text-slate-400">
                              Sans titre
                            </span>
                          )}
                        </h3>

                        {slide.description && (
                          <p className="text-xs text-slate-600 line-clamp-3 mb-2">
                            {stripHtml(slide.description)}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1 text-[11px] mb-2">
                          {slide.stat_label && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                              📊 {slide.stat_label}
                            </span>
                          )}
                          {slide.tag && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                              # {slide.tag}
                            </span>
                          )}
                          {slide.icon && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-100">
                              🎯 {slide.icon}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="px-4 pb-3 mt-auto flex items-center justify-between border-t border-slate-100 pt-2">
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <span>
                            ID:{" "}
                            <span className="font-mono text-[10px]">
                              {slide.id ?? "—"}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Prévisualiser */}
                          <button
                            type="button"
                            onClick={() => setPreviewSlide(slide)}
                            className="p-1.5 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs"
                            title="Prévisualiser ce slide"
                          >
                            <FaEye />
                          </button>

                          {/* Éditer */}
                          <Link
                            to={`/miradia-slides/${slide.id}/edit`}
                            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 text-xs"
                            title="Modifier ce slide"
                          >
                            <FaEdit />
                          </Link>

                          {/* Supprimer */}
                          <button
                            type="button"
                            onClick={() => handleDelete(slide)}
                            disabled={isDeletingId === slide.id}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs"
                            title="Supprimer le slide"
                          >
                            {isDeletingId === slide.id ? (
                              <span className="inline-block w-3 h-3 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <FaTrash />
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* Vue tableau */
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-3 py-2 text-left">#</th>
                      {visibleColumns.image && (
                        <th className="px-3 py-2 text-left">Image</th>
                      )}
                      <th className="px-3 py-2 text-left">Titre</th>
                      {visibleColumns.tag && (
                        <th className="px-3 py-2 text-left">Tag</th>
                      )}
                      {visibleColumns.stat && (
                        <th className="px-3 py-2 text-left">Stat</th>
                      )}
                      {visibleColumns.icon && (
                        <th className="px-3 py-2 text-left">Icône</th>
                      )}
                      {visibleColumns.color && (
                        <th className="px-3 py-2 text-left">Couleur</th>
                      )}
                      {visibleColumns.active && (
                        <th className="px-3 py-2 text-left">Actif</th>
                      )}
                      {visibleColumns.description && (
                        <th className="px-3 py-2 text-left">
                          Description
                        </th>
                      )}
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSlides.map((slide) => {
                      const imgUrl = buildSlideImageUrl(slide);
                      const color = slide.color || "#0ea5e9";
                      const position = slide.position ?? "—";
                      const isActive = !!slide.is_active;

                      return (
                        <tr
                          key={slide.id ?? `${slide.title}-${position}`}
                          className="border-b last:border-b-0 border-slate-100 hover:bg-slate-50/60"
                        >
                          <td className="px-3 py-2 align-top text-xs text-slate-700">
                            #{position}
                          </td>
                          {visibleColumns.image && (
                            <td className="px-3 py-2 align-top">
                              <div className="w-20 h-12 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center">
                                {imgUrl ? (
                                  <img
                                    src={imgUrl}
                                    alt={slide.title || "Slide"}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <FaImage className="text-slate-300" />
                                )}
                              </div>
                            </td>
                          )}
                          <td className="px-3 py-2 align-top">
                            <div className="text-xs font-semibold text-slate-900">
                              {slide.title || (
                                <span className="italic text-slate-400">
                                  Sans titre
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              ID: {slide.id ?? "—"}
                            </div>
                          </td>
                          {visibleColumns.tag && (
                            <td className="px-3 py-2 align-top text-xs">
                              {slide.tag ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  # {slide.tag}
                                </span>
                              ) : (
                                <span className="text-slate-300">
                                  —
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.stat && (
                            <td className="px-3 py-2 align-top text-xs">
                              {slide.stat_label ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                                  📊 {slide.stat_label}
                                </span>
                              ) : (
                                <span className="text-slate-300">
                                  —
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.icon && (
                            <td className="px-3 py-2 align-top text-xs">
                              {slide.icon ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-100">
                                  🎯 {slide.icon}
                                </span>
                              ) : (
                                <span className="text-slate-300">
                                  —
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.color && (
                            <td className="px-3 py-2 align-top">
                              <div className="inline-flex items-center gap-1 text-xs text-slate-600">
                                <span
                                  className="inline-block w-4 h-4 rounded-full border border-slate-300"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="font-mono text-[11px]">
                                  {color}
                                </span>
                              </div>
                            </td>
                          )}
                          {visibleColumns.active && (
                            <td className="px-3 py-2 align-top">
                              <button
                                type="button"
                                onClick={() => handleToggleActive(slide)}
                                disabled={isSavingToggle}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${
                                  isActive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-50 text-slate-500 border-slate-200"
                                }`}
                                title={
                                  isActive
                                    ? "Désactiver ce slide"
                                    : "Activer ce slide"
                                }
                              >
                                {isActive ? (
                                  <>
                                    <FaToggleOn />
                                    <span>Actif</span>
                                  </>
                                ) : (
                                  <>
                                    <FaToggleOff />
                                    <span>Inactif</span>
                                  </>
                                )}
                              </button>
                            </td>
                          )}
                          {visibleColumns.description && (
                            <td className="px-3 py-2 align-top text-[11px] text-slate-600 max-w-xs">
                              <span className="line-clamp-3">
                                {stripHtml(slide.description)}
                              </span>
                            </td>
                          )}
                          <td className="px-3 py-2 align-top">
                            <div className="flex flex-col items-end gap-1 text-xs">
                              <button
                                type="button"
                                onClick={() => setPreviewSlide(slide)}
                                className="px-2 py-1 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 inline-flex items-center gap-1"
                                title="Prévisualiser"
                              >
                                <FaEye />
                              </button>
                              <Link
                                to={`/miradia-slides/${slide.id}/edit`}
                                className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1"
                              >
                                <FaEdit />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDelete(slide)}
                                disabled={isDeletingId === slide.id}
                                className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 inline-flex items-center gap-1"
                              >
                                {isDeletingId === slide.id ? (
                                  <span className="inline-block w-3 h-3 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <FaTrash />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination en bas */}
            <div className="flex items-center justify-between mt-4 text-xs text-slate-600">
              <div>
                Affiche{" "}
                <span className="font-semibold">
                  {filteredSlides.length}
                </span>{" "}
                sur{" "}
                <span className="font-semibold">
                  {pagination.total}
                </span>{" "}
                slides (page {pagination.currentPage}/
                {pagination.lastPage})
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  disabled={pagination.currentPage <= 1}
                  onClick={() =>
                    loadSlides(pagination.currentPage - 1)
                  }
                >
                  « Préc
                </button>
                <span className="px-2">
                  {pagination.currentPage} / {pagination.lastPage}
                </span>
                <button
                  type="button"
                  className="px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  disabled={
                    pagination.currentPage >= pagination.lastPage
                  }
                  onClick={() =>
                    loadSlides(pagination.currentPage + 1)
                  }
                >
                  Suiv »
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barre basse – Infos rapides */}
      <div className="absolute w-full bottom-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/95 backdrop-blur border-t rounded-b-xl shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <div className="text-xs text-slate-600">
          Slides Miradia chargés depuis <code>/api/miradia-slides</code>.
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <FaToggleOn className="text-emerald-500" /> Activation /
            désactivation
          </span>
          <span className="hidden sm:inline-block w-px h-4 bg-slate-300" />
          <span className="inline-flex items-center gap-1">
            <FaTrash className="text-rose-500" /> Suppression définitive
          </span>
        </div>
      </div>

      {/* Modal de prévisualisation */}
      {previewSlide && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <h3 className="text-sm font-semibold text-slate-800">
                Aperçu du slide :{" "}
                {previewSlide.title || "Sans titre"}
              </h3>
              <button
                onClick={() => setPreviewSlide(null)}
                className="text-xs px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>
            <div className="p-4 bg-slate-900 relative">
              <div className="relative rounded-2xl overflow-hidden bg-slate-800 text-white min-h-[260px] flex items-center">
                {buildSlideImageUrl(previewSlide) && (
                  <img
                    src={buildSlideImageUrl(previewSlide)}
                    alt={previewSlide.title || "Slide"}
                    className="absolute inset-0 w-full h-full object-cover opacity-70"
                  />
                )}
                <div className="relative z-10 p-6 md:p-10 max-w-xl">
                  {previewSlide.tag && (
                    <div className="inline-flex mb-3 px-3 py-1 rounded-full bg-black/40 text-xs uppercase tracking-wide">
                      {previewSlide.tag}
                    </div>
                  )}
                  <h2 className="text-2xl md:text-3xl font-bold mb-3">
                    {previewSlide.title || "Sans titre"}
                  </h2>
                  {previewSlide.stat_label && (
                    <div className="mb-3 text-sm font-semibold text-cyan-200">
                      {previewSlide.stat_label}
                    </div>
                  )}
                  {previewSlide.description && (
                    <div
                      className="text-sm md:text-base text-slate-100 space-y-2"
                      dangerouslySetInnerHTML={{
                        __html: previewSlide.description,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiradiaSlidesIndex;
