import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaPlus,
  FaSync,
  FaTrash,
  FaEdit,
  FaEye,
  FaSearch,
  FaColumns,
  FaRegClock,
  FaCheckCircle,
  FaToggleOn,
  FaToggleOff,
} from "react-icons/fa";
import api from "../../../../../../services/api";
import Toaster from "../../../../../../component/toast/Toaster";

const stripHtml = (html) =>
  typeof html === "string" ? html.replace(/<[^>]+>/g, "").trim() : "";

const pill =
  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] border";

const statusBadge = (s) => {
  const v = String(s || "draft").toLowerCase();
  if (v === "published")
    return `${pill} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (v === "pending")
    return `${pill} bg-amber-50 text-amber-800 border-amber-200`;
  return `${pill} bg-slate-50 text-slate-600 border-slate-200`;
};

export default function CmsSectionsIndex() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("updated_at"); // updated_at | title | sort_order
  const [sortDir, setSortDir] = useState("desc");

  const [viewMode, setViewMode] = useState("cards"); // cards | table
  const [perPage, setPerPage] = useState(12);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    perPage: 12,
    total: 0,
  });

  const [visibleColumns, setVisibleColumns] = useState({
    category: true,
    template: true,
    section: true,
    locale: true,
    status: true,
    sort_order: true,
    updated_at: true,
    preview: true,
  });

  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  const loadItems = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await api.get("/cms-sections", {
          params: { page, per_page: perPage },
          headers: { "Cache-Control": "no-store" },
        });

        // paginate Laravel: {data, current_page, last_page, per_page, total}
        const data = res?.data;
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

        setItems(list);

        if (data?.current_page) {
          setPagination({
            currentPage: data.current_page,
            lastPage: data.last_page,
            perPage: data.per_page,
            total: data.total,
          });
        } else {
          // fallback non paginé
          setPagination({ currentPage: 1, lastPage: 1, perPage, total: list.length });
        }
      } catch (e) {
        setToast({
          type: "error",
          message: e?.response?.data?.message || "Erreur lors du chargement des CMS sections",
        });
      } finally {
        setLoading(false);
      }
    },
    [perPage]
  );

  useEffect(() => {
    loadItems(1);
  }, [loadItems]);

  const toggleColumn = (key) =>
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...items];

    if (q) {
      list = list.filter((x) => {
        const title = String(x.title || "").toLowerCase();
        const cat = String(x.category || "").toLowerCase();
        const tpl = String(x.template || "").toLowerCase();
        const sec = String(x.section || "").toLowerCase();
        const loc = String(x.locale || "").toLowerCase();
        const st = String(x.status || "").toLowerCase();
        return (
          title.includes(q) ||
          cat.includes(q) ||
          tpl.includes(q) ||
          sec.includes(q) ||
          loc.includes(q) ||
          st.includes(q)
        );
      });
    }

    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;

      if (sortKey === "title") {
        return String(a.title || "").localeCompare(String(b.title || "")) * dir;
      }
      if (sortKey === "sort_order") {
        return (Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)) * dir;
      }
      // updated_at default
      const da = new Date(a.updated_at || 0).getTime();
      const db = new Date(b.updated_at || 0).getTime();
      return (da - db) * dir;
    });

    return list;
  }, [items, search, sortKey, sortDir]);

  const doPublish = async (row) => {
    try {
      await api.post(`/cms-sections/${row.id}/publish`);
      setToast({ type: "success", message: "Publié ✅" });
      loadItems(pagination.currentPage);
    } catch (e) {
      setToast({
        type: "error",
        message: e?.response?.data?.message || "Erreur publish",
      });
    }
  };

  const doUnpublish = async (row) => {
    try {
      await api.post(`/cms-sections/${row.id}/unpublish`);
      setToast({ type: "success", message: "Repassé en brouillon ✅" });
      loadItems(pagination.currentPage);
    } catch (e) {
      setToast({
        type: "error",
        message: e?.response?.data?.message || "Erreur unpublish",
      });
    }
  };

  const doDelete = async (row) => {
    const ok = window.confirm(`Supprimer définitivement « ${row.title || "Sans titre"} » ?`);
    if (!ok) return;

    try {
      await api.delete(`/cms-sections/${row.id}`);
      setToast({ type: "success", message: "Supprimé ✅" });
      loadItems(pagination.currentPage);
    } catch (e) {
      setToast({
        type: "error",
        message: e?.response?.data?.message || "Erreur suppression",
      });
    }
  };

  return (
    <div className="relative bg-white rounded-xl shadow-sm ring-1 ring-slate-200/70 flex flex-col">
      {toast && <Toaster {...toast} onClose={() => setToast(null)} />}

      {/* HEADER */}
      <div className="relative overflow-hidden p-5 border-b bg-gradient-to-br from-sky-600 via-indigo-600 to-blue-700 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -right-10 w-52 h-52 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 -left-16 w-72 h-72 rounded-full bg-cyan-300/10 blur-3xl" />
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <FaEye className="opacity-90" />
              <span>CMS Sections (GrapesJS)</span>
            </h2>
            <p className="text-sm text-white/90 mt-1">
              Gestion des blocs (template+section+locale) • draft/pending/published.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 z-10">
            <div className="relative">
              <FaSearch className="absolute left-3 top-2.5 text-sky-700/60 text-xs" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher titre, category, template, section, locale, status…"
                className="pl-8 pr-3 py-2 text-sm rounded-xl bg-white/90 text-slate-800 border border-white/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
              />
            </div>

            <button
              type="button"
              onClick={() => loadItems(pagination.currentPage)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm inline-flex items-center gap-2 transition text-white"
              title="Rafraîchir"
            >
              <FaSync className={loading ? "animate-spin" : ""} />
              <span>Actualiser</span>
            </button>

            <Link
              to="/cms-sections/new"
              className="px-3 py-2 rounded-xl bg-white text-sky-700 hover:bg-sky-50 border border-white/40 shadow-sm inline-flex items-center gap-2 transition"
              title="Créer une section"
            >
              <FaPlus />
              <span>Nouveau</span>
            </Link>
          </div>
        </div>
      </div>

      {/* CONTENU */}
      <div className="flex-1 overflow-y-auto pb-24" style={{ maxHeight: "calc(100vh - 220px)" }}>
        {loading && (
          <div className="bg-amber-50 border-y border-amber-200 text-amber-800 px-4 py-2">
            Chargement des sections…
          </div>
        )}

        {filtered.length === 0 && !loading ? (
          <div className="p-10 text-center text-slate-500">
            <div className="text-5xl mb-3">🧱</div>
            <p className="text-lg mb-2">Aucune section trouvée.</p>
            <p className="text-sm text-slate-400">
              Crée un bloc avec <b>Nouveau</b>.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {/* TOOLBAR */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-600">
                Page <span className="font-semibold">{pagination.currentPage}</span> /{" "}
                {pagination.lastPage} — <span className="font-semibold">{pagination.total}</span>{" "}
                élément(s)
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Tri */}
                <button
                  type="button"
                  onClick={() => toggleSort("updated_at")}
                  className={`px-2 py-1 rounded-full border ${
                    sortKey === "updated_at"
                      ? "bg-sky-50 border-sky-200 text-sky-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  MAJ <SortBadge active={sortKey === "updated_at"} />
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
                <button
                  type="button"
                  onClick={() => toggleSort("sort_order")}
                  className={`px-2 py-1 rounded-full border ${
                    sortKey === "sort_order"
                      ? "bg-sky-50 border-sky-200 text-sky-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Ordre <SortBadge active={sortKey === "sort_order"} />
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

                {/* Colonnes */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowColumnMenu((p) => !p)}
                    className="ml-2 px-2 py-1 rounded-full border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1"
                  >
                    <FaColumns className="text-slate-500" />
                    Colonnes
                  </button>
                  {showColumnMenu && (
                    <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-20">
                      <div className="text-[11px] font-semibold text-slate-500 mb-2">
                        Colonnes affichées (vue tableau)
                      </div>
                      {Object.entries(visibleColumns).map(([key, val]) => (
                        <label key={key} className="flex items-center gap-2 text-xs text-slate-700 mb-1">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300"
                            checked={val}
                            onChange={() => toggleColumn(key)}
                          />
                          <span>{key}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Per page */}
                <span className="mx-1 text-slate-300">|</span>
                <span className="text-slate-500">Par page :</span>
                <select
                  value={perPage}
                  onChange={(e) => setPerPage(parseInt(e.target.value, 10) || 12)}
                  className="border border-slate-200 rounded-full bg-white px-2 py-1 text-[11px]"
                >
                  <option value={6}>6</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                </select>

                {/* Pagination top */}
                <span className="mx-1 text-slate-300">|</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                    disabled={pagination.currentPage <= 1}
                    onClick={() => loadItems(pagination.currentPage - 1)}
                  >
                    «
                  </button>
                  <span className="text-[11px] text-slate-600">
                    {pagination.currentPage} / {pagination.lastPage}
                  </span>
                  <button
                    type="button"
                    className="px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                    disabled={pagination.currentPage >= pagination.lastPage}
                    onClick={() => loadItems(pagination.currentPage + 1)}
                  >
                    »
                  </button>
                </div>
              </div>
            </div>

            {/* CARDS */}
            {viewMode === "cards" ? (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((row) => {
                  const st = String(row.status || "draft");
                  return (
                    <article
                      key={row.id}
                      className="relative rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 flex flex-col"
                    >
                      <div className="flex items-center justify-between px-4 pt-3 pb-2 text-xs">
                        <div className="inline-flex items-center gap-2">
                          <span className={`${pill} bg-slate-100 text-slate-700 border-slate-200 font-semibold`}>
                            #{row.id}
                          </span>
                          <span className={statusBadge(st)}>
                            {st === "published" ? <FaCheckCircle /> : st === "pending" ? <FaRegClock /> : <FaToggleOff />}
                            {st}
                          </span>
                        </div>

                        <span className={`${pill} bg-indigo-50 text-indigo-700 border-indigo-100`}>
                          ordre: {Number(row.sort_order ?? 0)}
                        </span>
                      </div>

                      <div className="px-4 pb-3">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">
                          {row.title || <span className="italic text-slate-400">Sans titre</span>}
                        </h3>

                        <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                          <span className={`${pill} bg-sky-50 text-sky-700 border-sky-100`}>
                            cat: {row.category || "—"}
                          </span>
                          <span className={`${pill} bg-slate-50 text-slate-600 border-slate-200`}>
                            tpl: {row.template || "—"}
                          </span>
                          <span className={`${pill} bg-slate-50 text-slate-600 border-slate-200`}>
                            sec: {row.section || "—"}
                          </span>
                          <span className={`${pill} bg-slate-50 text-slate-600 border-slate-200`}>
                            loc: {row.locale || "fr"}
                          </span>
                        </div>

                        {(row.html || row.css) && (
                          <p className="mt-3 text-xs text-slate-600 line-clamp-3">
                            {stripHtml(row.html || "") || "Contenu (html/css) enregistré."}
                          </p>
                        )}
                      </div>

                      <div className="px-4 pb-3 mt-auto flex items-center justify-between border-t border-slate-100 pt-2">
                        <div className="text-[11px] text-slate-500">
                          MAJ:{" "}
                          <span className="font-mono text-[10px]">
                            {row.updated_at ? String(row.updated_at).slice(0, 19) : "—"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewItem(row)}
                            className="p-1.5 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs"
                            title="Prévisualiser"
                          >
                            <FaEye />
                          </button>

                          <Link
                            to={`/cms-sections/${row.id}/edit`}
                            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 text-xs"
                            title="Modifier"
                          >
                            <FaEdit />
                          </Link>

                          {st !== "published" ? (
                            <button
                              type="button"
                              onClick={() => doPublish(row)}
                              className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs"
                              title="Publier"
                            >
                              <FaToggleOn />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => doUnpublish(row)}
                              className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs"
                              title="Repasser en brouillon"
                            >
                              <FaToggleOff />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => doDelete(row)}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs"
                            title="Supprimer"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* TABLE */
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-3 py-2 text-left">ID</th>
                      <th className="px-3 py-2 text-left">Titre</th>
                      {visibleColumns.category && <th className="px-3 py-2 text-left">Catégorie</th>}
                      {visibleColumns.template && <th className="px-3 py-2 text-left">Template</th>}
                      {visibleColumns.section && <th className="px-3 py-2 text-left">Section</th>}
                      {visibleColumns.locale && <th className="px-3 py-2 text-left">Locale</th>}
                      {visibleColumns.status && <th className="px-3 py-2 text-left">Status</th>}
                      {visibleColumns.sort_order && <th className="px-3 py-2 text-left">Ordre</th>}
                      {visibleColumns.updated_at && <th className="px-3 py-2 text-left">MAJ</th>}
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => {
                      const st = String(row.status || "draft");
                      return (
                        <tr key={row.id} className="border-b last:border-b-0 border-slate-100 hover:bg-slate-50/60">
                          <td className="px-3 py-2 align-top text-xs text-slate-700">#{row.id}</td>
                          <td className="px-3 py-2 align-top">
                            <div className="text-xs font-semibold text-slate-900">{row.title || "—"}</div>
                            <div className="text-[11px] text-slate-400">
                              {row.template || "—"} / {row.section || "—"} / {row.locale || "fr"}
                            </div>
                          </td>

                          {visibleColumns.category && <td className="px-3 py-2 align-top text-xs">{row.category || "—"}</td>}
                          {visibleColumns.template && <td className="px-3 py-2 align-top text-xs">{row.template || "—"}</td>}
                          {visibleColumns.section && <td className="px-3 py-2 align-top text-xs">{row.section || "—"}</td>}
                          {visibleColumns.locale && <td className="px-3 py-2 align-top text-xs">{row.locale || "fr"}</td>}
                          {visibleColumns.status && (
                            <td className="px-3 py-2 align-top">
                              <span className={statusBadge(st)}>{st}</span>
                            </td>
                          )}
                          {visibleColumns.sort_order && (
                            <td className="px-3 py-2 align-top text-xs">{Number(row.sort_order ?? 0)}</td>
                          )}
                          {visibleColumns.updated_at && (
                            <td className="px-3 py-2 align-top text-xs font-mono">
                              {row.updated_at ? String(row.updated_at).slice(0, 19) : "—"}
                            </td>
                          )}

                          <td className="px-3 py-2 align-top">
                            <div className="flex flex-col items-end gap-1 text-xs">
                              <button
                                type="button"
                                onClick={() => setPreviewItem(row)}
                                className="px-2 py-1 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 inline-flex items-center gap-1"
                                title="Prévisualiser"
                              >
                                <FaEye />
                              </button>
                              <Link
                                to={`/cms-sections/${row.id}/edit`}
                                className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1"
                                title="Modifier"
                              >
                                <FaEdit />
                              </Link>

                              {st !== "published" ? (
                                <button
                                  type="button"
                                  onClick={() => doPublish(row)}
                                  className="px-2 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 inline-flex items-center gap-1"
                                  title="Publier"
                                >
                                  <FaToggleOn />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => doUnpublish(row)}
                                  className="px-2 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 inline-flex items-center gap-1"
                                  title="Repasser en brouillon"
                                >
                                  <FaToggleOff />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => doDelete(row)}
                                className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 inline-flex items-center gap-1"
                                title="Supprimer"
                              >
                                <FaTrash />
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
          </div>
        )}
      </div>

      {/* Modal preview */}
      {previewItem && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <h3 className="text-sm font-semibold text-slate-800">
                Aperçu : {previewItem.title || "Sans titre"}
              </h3>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-xs px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>

            <div className="p-5 bg-slate-900">
              <div className="rounded-2xl bg-white/10 border border-white/10 text-white p-5">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={statusBadge(previewItem.status)}>{previewItem.status}</span>
                  <span className={`${pill} bg-white/10 text-white/90 border-white/10`}>
                    {previewItem.template}/{previewItem.section}/{previewItem.locale || "fr"}
                  </span>
                </div>

                <div className="rounded-xl bg-white text-slate-900 overflow-hidden">
                  <iframe
                    title="preview"
                    className="w-full h-[520px]"
                    sandbox="allow-scripts allow-same-origin"
                    srcDoc={`<!doctype html><html><head><style>${previewItem.css || ""}</style></head><body>${previewItem.html || ""}<script>${previewItem.js || ""}</script></body></html>`}
                  />
                </div>

                <p className="text-xs text-white/70 mt-3">
                  ⚠️ Preview en iframe sandbox (scripts autorisés). En prod, ajoute CSP selon ton niveau de confiance.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barre basse */}
      <div className="absolute w-full bottom-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/95 backdrop-blur border-t rounded-b-xl">
        <div className="text-xs text-slate-600">
          CMS chargé depuis <code>/api/cms-sections</code>.
        </div>
      </div>
    </div>
  );
}
