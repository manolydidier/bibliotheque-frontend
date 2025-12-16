import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  FaPlus,
  FaSync,
  FaTrash,
  FaEdit,
  FaEye,
  FaToggleOn,
  FaToggleOff,
  FaSearch,
  FaColumns,
  FaSitemap,
  FaUserTie,
  FaIdBadge,
  FaEnvelope,
  FaPhone,
} from "react-icons/fa";
import Toaster from "../../../../../../component/toast/Toaster";

axios.defaults.baseURL = axios.defaults.baseURL || "/api";

const STORAGE_BASE =
  import.meta.env.VITE_API_BASE_STORAGE ||
  import.meta.env.VITE_API_BASE_URL ||
  window.location.origin;

const isAbs = (u) => /^https?:\/\//i.test(String(u || ""));

const buildAvatarUrl = (node) => {
  const raw = node?.avatar_path || node?.avatar_url || node?.avatar || "";
  if (!raw) return null;
  const url = String(raw).trim();
  if (isAbs(url)) return url;
  const base = String(STORAGE_BASE).replace(/\/$/, "");
  const path = url.replace(/^\/?storage\//, "");
  return `${base}/storage/${path}`;
};

const stripHtml = (html) =>
  typeof html === "string" ? html.replace(/<[^>]+>/g, "").trim() : "";

export default function OrgNodesIndex() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("position"); // position | name
  const [sortDir, setSortDir] = useState("asc");

  const [isSavingToggle, setIsSavingToggle] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);

  const [viewMode, setViewMode] = useState("cards"); // cards | table

  const [perPage, setPerPage] = useState(12);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    perPage: 12,
    total: 0,
  });

  const [visibleColumns, setVisibleColumns] = useState({
    avatar: true,
    role: true,
    department: true,
    email: true,
    phone: false,
    parent: true,
    active: true,
    bio: true,
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const [previewNode, setPreviewNode] = useState(null);

  const columnLabels = {
    avatar: "Avatar",
    role: "Rôle",
    department: "Département",
    email: "Email",
    phone: "Téléphone",
    parent: "Parent",
    active: "Actif",
    bio: "Bio",
  };

  const toggleColumn = (key) =>
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));

  const loadNodes = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const { data } = await axios.get("/orgnodes", {
          params: { all: 1, page, per_page: perPage },
        });

        setNodes(Array.isArray(data.data) ? data.data : []);
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
            "Erreur lors du chargement des OrgNodes",
        });
      } finally {
        setLoading(false);
      }
    },
    [perPage]
  );

  useEffect(() => {
    loadNodes(1);
  }, [loadNodes]);

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

  const idToNode = useMemo(() => {
    const m = new Map();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  const getParentName = (parentId) => {
    if (!parentId) return "—";
    const p = idToNode.get(parentId);
    return p?.name || p?.title || `#${parentId}`;
  };

  const filteredNodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...nodes];

    if (q) {
      list = list.filter((n) => {
        const name = (n.name || "").toLowerCase();
        const role = (n.role || "").toLowerCase();
        const dep = (n.department || "").toLowerCase();
        const email = (n.email || "").toLowerCase();
        const bio = stripHtml(n.bio || "").toLowerCase();
        return (
          name.includes(q) ||
          role.includes(q) ||
          dep.includes(q) ||
          email.includes(q) ||
          bio.includes(q)
        );
      });
    }

    list.sort((a, b) => {
      if (sortKey === "name") {
        const na = (a.name || "").toLowerCase();
        const nb = (b.name || "").toLowerCase();
        if (na < nb) return sortDir === "asc" ? -1 : 1;
        if (na > nb) return sortDir === "asc" ? 1 : -1;
        return 0;
      }
      const pa = Number(a.position ?? 9999);
      const pb = Number(b.position ?? 9999);
      if (pa < pb) return sortDir === "asc" ? -1 : 1;
      if (pa > pb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [nodes, search, sortKey, sortDir]);

  const handleToggleActive = async (node) => {
    if (!node?.id) return;
    const next = !node.is_active;
    setIsSavingToggle(true);

    setNodes((prev) =>
      prev.map((x) => (x.id === node.id ? { ...x, is_active: next } : x))
    );

    try {
      await axios.patch(`/org-nodes/${node.id}`, { is_active: next });
      setToast({
        type: "success",
        message: next ? "Noeud activé" : "Noeud désactivé",
      });
    } catch (e) {
      setNodes((prev) =>
        prev.map((x) =>
          x.id === node.id ? { ...x, is_active: node.is_active } : x
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

  const handleDelete = async (node) => {
    if (!node?.id) return;
    const confirmed = window.confirm(
      `Supprimer définitivement « ${node.name || "Sans nom"} » ?`
    );
    if (!confirmed) return;

    setIsDeletingId(node.id);
    try {
      await axios.delete(`/org-nodes/${node.id}`);
      setNodes((prev) => prev.filter((x) => x.id !== node.id));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      setToast({ type: "success", message: "Noeud supprimé" });
    } catch (e) {
      setToast({
        type: "error",
        message: e?.response?.data?.message || "Erreur lors de la suppression",
      });
    } finally {
      setIsDeletingId(null);
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
              <FaSitemap className="opacity-90" />
              <span>Organigramme – OrgNodes</span>
            </h2>
            <p className="text-sm text-white/90 mt-1">
              Gestion des noeuds (personnes / postes) de l’organigramme
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 z-10">
            <div className="relative">
              <FaSearch className="absolute left-3 top-2.5 text-sky-700/60 text-xs" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher nom, rôle, département, email, bio…"
                className="pl-8 pr-3 py-2 text-sm rounded-xl bg-white/90 text-slate-800 border border-white/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
              />
            </div>

            <button
              type="button"
              onClick={() => loadNodes(pagination.currentPage)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm inline-flex items-center gap-2 transition text-white"
              title="Rafraîchir"
            >
              <FaSync className={loading ? "animate-spin" : ""} />
              <span>Actualiser</span>
            </button>

            <Link
              to="/orgnodes/new"
              className="px-3 py-2 rounded-xl bg-white text-sky-700 hover:bg-sky-50 border border-white/40 shadow-sm inline-flex items-center gap-2 transition"
              title="Créer un noeud"
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
            Chargement des noeuds…
          </div>
        )}

        {filteredNodes.length === 0 && !loading ? (
          <div className="p-10 text-center text-slate-500">
            <div className="text-5xl mb-3">🧩</div>
            <p className="text-lg mb-2">Aucun noeud trouvé.</p>
            <p className="text-sm text-slate-400">
              Vérifie l’API <code>/api/org-nodes</code> ou crée un noeud avec <b>Nouveau</b>.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {/* barre infos + tri + vue + colonnes + pagination/top */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-600">
                Page <span className="font-semibold">{pagination.currentPage}</span> / {pagination.lastPage} —{" "}
                <span className="font-semibold">{pagination.total}</span> noeud(x) au total —{" "}
                <span className="text-slate-500">{filteredNodes.length} sur cette page (filtrés)</span>
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
                  onClick={() => toggleSort("name")}
                  className={`px-2 py-1 rounded-full border ${
                    sortKey === "name"
                      ? "bg-sky-50 border-sky-200 text-sky-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Nom <SortBadge active={sortKey === "name"} />
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
                    onClick={() => setShowColumnMenu((prev) => !prev)}
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
                      {Object.entries(columnLabels).map(([key, label]) => (
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
                      ))}
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
                    loadNodes(1);
                  }}
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
                    onClick={() => loadNodes(pagination.currentPage - 1)}
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
                    onClick={() => loadNodes(pagination.currentPage + 1)}
                  >
                    »
                  </button>
                </div>
              </div>
            </div>

            {/* Vue cartes ou tableau */}
            {viewMode === "cards" ? (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {filteredNodes.map((node) => {
                  const avatar = buildAvatarUrl(node);
                  const isActive = !!node.is_active;
                  const position = node.position ?? "—";
                  const parentName = getParentName(node.parent_id);

                  return (
                    <article
                      key={node.id ?? `${node.name}-${position}`}
                      className="relative rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 flex flex-col"
                    >
                      <div className="flex items-center justify-between px-4 pt-3 pb-2 text-xs">
                        <div className="inline-flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                            #{position}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px]">
                            Parent: {parentName}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(node)}
                          disabled={isSavingToggle}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}
                          title={isActive ? "Désactiver" : "Activer"}
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
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={node.name || "Avatar"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FaUserTie className="text-slate-300 text-xl" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-slate-900 truncate">
                              {node.name || <span className="italic text-slate-400">Sans nom</span>}
                            </h3>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                              <span className="inline-flex items-center gap-1">
                                <FaIdBadge /> {node.role || "—"}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="truncate">{node.department || "—"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 text-[11px] mb-2">
                          {node.email && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                              <FaEnvelope /> {node.email}
                            </span>
                          )}
                          {node.phone && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-100">
                              <FaPhone /> {node.phone}
                            </span>
                          )}
                        </div>

                        {node.bio && (
                          <p className="text-xs text-slate-600 line-clamp-3">
                            {stripHtml(node.bio)}
                          </p>
                        )}
                      </div>

                      <div className="px-4 pb-3 mt-auto flex items-center justify-between border-t border-slate-100 pt-2">
                        <div className="text-[11px] text-slate-500">
                          ID: <span className="font-mono text-[10px]">{node.id ?? "—"}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewNode(node)}
                            className="p-1.5 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs"
                            title="Prévisualiser"
                          >
                            <FaEye />
                          </button>

                          <Link
                            to={`/orgnodes/${node.id}/edit`}
                            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 text-xs"
                            title="Modifier"
                          >
                            <FaEdit />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDelete(node)}
                            disabled={isDeletingId === node.id}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs"
                            title="Supprimer"
                          >
                            {isDeletingId === node.id ? (
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
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-3 py-2 text-left">#</th>
                      {visibleColumns.avatar && <th className="px-3 py-2 text-left">Avatar</th>}
                      <th className="px-3 py-2 text-left">Nom</th>
                      {visibleColumns.role && <th className="px-3 py-2 text-left">Rôle</th>}
                      {visibleColumns.department && <th className="px-3 py-2 text-left">Département</th>}
                      {visibleColumns.email && <th className="px-3 py-2 text-left">Email</th>}
                      {visibleColumns.phone && <th className="px-3 py-2 text-left">Téléphone</th>}
                      {visibleColumns.parent && <th className="px-3 py-2 text-left">Parent</th>}
                      {visibleColumns.active && <th className="px-3 py-2 text-left">Actif</th>}
                      {visibleColumns.bio && <th className="px-3 py-2 text-left">Bio</th>}
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNodes.map((node) => {
                      const avatar = buildAvatarUrl(node);
                      const isActive = !!node.is_active;
                      const position = node.position ?? "—";
                      const parentName = getParentName(node.parent_id);

                      return (
                        <tr
                          key={node.id ?? `${node.name}-${position}`}
                          className="border-b last:border-b-0 border-slate-100 hover:bg-slate-50/60"
                        >
                          <td className="px-3 py-2 align-top text-xs text-slate-700">#{position}</td>

                          {visibleColumns.avatar && (
                            <td className="px-3 py-2 align-top">
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                                {avatar ? (
                                  <img src={avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <FaUserTie className="text-slate-300" />
                                )}
                              </div>
                            </td>
                          )}

                          <td className="px-3 py-2 align-top">
                            <div className="text-xs font-semibold text-slate-900">{node.name || "—"}</div>
                            <div className="text-[11px] text-slate-400">ID: {node.id ?? "—"}</div>
                          </td>

                          {visibleColumns.role && (
                            <td className="px-3 py-2 align-top text-xs">{node.role || <span className="text-slate-300">—</span>}</td>
                          )}
                          {visibleColumns.department && (
                            <td className="px-3 py-2 align-top text-xs">{node.department || <span className="text-slate-300">—</span>}</td>
                          )}
                          {visibleColumns.email && (
                            <td className="px-3 py-2 align-top text-xs">{node.email || <span className="text-slate-300">—</span>}</td>
                          )}
                          {visibleColumns.phone && (
                            <td className="px-3 py-2 align-top text-xs">{node.phone || <span className="text-slate-300">—</span>}</td>
                          )}
                          {visibleColumns.parent && (
                            <td className="px-3 py-2 align-top text-xs">{parentName}</td>
                          )}
                          {visibleColumns.active && (
                            <td className="px-3 py-2 align-top">
                              <button
                                type="button"
                                onClick={() => handleToggleActive(node)}
                                disabled={isSavingToggle}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${
                                  isActive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-50 text-slate-500 border-slate-200"
                                }`}
                              >
                                {isActive ? (
                                  <>
                                    <FaToggleOn /> <span>Actif</span>
                                  </>
                                ) : (
                                  <>
                                    <FaToggleOff /> <span>Inactif</span>
                                  </>
                                )}
                              </button>
                            </td>
                          )}
                          {visibleColumns.bio && (
                            <td className="px-3 py-2 align-top text-[11px] text-slate-600 max-w-xs">
                              <span className="line-clamp-3">{stripHtml(node.bio)}</span>
                            </td>
                          )}

                          <td className="px-3 py-2 align-top">
                            <div className="flex flex-col items-end gap-1 text-xs">
                              <button
                                type="button"
                                onClick={() => setPreviewNode(node)}
                                className="px-2 py-1 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 inline-flex items-center gap-1"
                                title="Prévisualiser"
                              >
                                <FaEye />
                              </button>
                              <Link
                                to={`/orgnodes/${node.id}/edit`}
                                className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1"
                                title="Modifier"
                              >
                                <FaEdit />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDelete(node)}
                                disabled={isDeletingId === node.id}
                                className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 inline-flex items-center gap-1"
                                title="Supprimer"
                              >
                                {isDeletingId === node.id ? (
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

            {/* Pagination bas */}
            <div className="flex items-center justify-between mt-4 text-xs text-slate-600">
              <div>
                Affiche <span className="font-semibold">{filteredNodes.length}</span> sur{" "}
                <span className="font-semibold">{pagination.total}</span> noeuds (page{" "}
                {pagination.currentPage}/{pagination.lastPage})
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  disabled={pagination.currentPage <= 1}
                  onClick={() => loadNodes(pagination.currentPage - 1)}
                >
                  « Préc
                </button>
                <span className="px-2">
                  {pagination.currentPage} / {pagination.lastPage}
                </span>
                <button
                  type="button"
                  className="px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  disabled={pagination.currentPage >= pagination.lastPage}
                  onClick={() => loadNodes(pagination.currentPage + 1)}
                >
                  Suiv »
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barre basse */}
      <div className="absolute w-full bottom-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/95 backdrop-blur border-t rounded-b-xl shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <div className="text-xs text-slate-600">
          OrgNodes chargés depuis <code>/api/orgnodes</code>.
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <FaToggleOn className="text-emerald-500" /> Activation / désactivation
          </span>
          <span className="hidden sm:inline-block w-px h-4 bg-slate-300" />
          <span className="inline-flex items-center gap-1">
            <FaTrash className="text-rose-500" /> Suppression définitive
          </span>
        </div>
      </div>

      {/* Modal preview */}
      {previewNode && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <h3 className="text-sm font-semibold text-slate-800">
                Aperçu : {previewNode.name || "Sans nom"}
              </h3>
              <button
                onClick={() => setPreviewNode(null)}
                className="text-xs px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>

            <div className="p-5 bg-slate-900">
              <div className="rounded-2xl bg-white/10 border border-white/10 text-white p-5 flex gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center">
                  {buildAvatarUrl(previewNode) ? (
                    <img
                      src={buildAvatarUrl(previewNode)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FaUserTie className="text-white/60 text-2xl" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-xl font-bold">{previewNode.name || "—"}</div>
                  <div className="text-sm text-cyan-200 font-semibold mt-1">
                    {previewNode.role || "—"}
                  </div>
                  <div className="text-xs text-white/70 mt-1">
                    {previewNode.department || "—"} • Parent:{" "}
                    {getParentName(previewNode.parent_id)}
                  </div>

                  {(previewNode.email || previewNode.phone) && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/85">
                      {previewNode.email && (
                        <span className="px-2 py-1 rounded-full bg-white/10 border border-white/10">
                          ✉️ {previewNode.email}
                        </span>
                      )}
                      {previewNode.phone && (
                        <span className="px-2 py-1 rounded-full bg-white/10 border border-white/10">
                          ☎️ {previewNode.phone}
                        </span>
                      )}
                    </div>
                  )}

                  {previewNode.bio && (
                    <div className="mt-4 text-sm text-white/90 leading-relaxed">
                      {stripHtml(previewNode.bio)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
