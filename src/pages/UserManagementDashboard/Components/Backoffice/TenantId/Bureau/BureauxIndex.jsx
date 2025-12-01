// src/pages/bureaux/BureauxIndex.jsx
// ⚠️ Adapte les chemins (api, backofficeStyles) selon ton projet

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiHome,
  FiPlus,
  FiSearch,
  FiRefreshCw,
  FiLayers,
  FiAlertTriangle,
  FiLoader,
  FiEye,
  FiEdit,
  FiX,
  FiFilter,
  FiTrash2,
} from 'react-icons/fi';
import api from '../../../../../../services/api';
import { card, inputBase, sectionTitle } from '../ui/backofficeStyles';

/* -------- Constantes -------- */

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'active', label: 'Actifs' },
  { value: 'inactive', label: 'Inactifs' },
];

/* -------- Helpers -------- */

const getCountryFlag = (country) => {
  if (!country) return '🌍';
  const c = country.toLowerCase();

  if (c.includes('madagascar')) return '🇲🇬';
  if (c.includes('france')) return '🇫🇷';
  if (c.includes('canada')) return '🇨🇦';
  if (
    c.includes('usa') ||
    c.includes('united states') ||
    c.includes('états-unis')
  )
    return '🇺🇸';

  return '🌍';
};

const StatusBadge = ({ statut }) => {
  if (!statut) return null;

  const base =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border';

  if (statut === 'active' || statut === 'actif') {
    return (
      <span
        className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}
      >
        Actif
      </span>
    );
  }

  if (statut === 'inactive' || statut === 'inactif') {
    return (
      <span
        className={`${base} bg-slate-50 text-slate-700 border-slate-200`}
      >
        Inactif
      </span>
    );
  }

  return (
    <span
      className={`${base} bg-amber-50 text-amber-700 border-amber-200`}
    >
      {statut}
    </span>
  );
};

/* -------- Modal de visualisation -------- */

const BureauViewModal = ({ bureau, onClose }) => {
  if (!bureau) return null;

  const labelSociete =
    bureau.societe?.nom ||
    bureau.societe?.name ||
    (bureau.societe ? `ID ${bureau.societe.id}` : '—');

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 p-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
        >
          <FiX className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <FiHome className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              {bureau.name || 'Bureau / lieu'}
              {bureau.country && (
                <span className="text-base">
                  {getCountryFlag(bureau.country)}
                </span>
              )}
              {bureau.is_primary && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Principal
                </span>
              )}
            </h2>
            {bureau.type && (
              <p className="text-xs text-slate-500 mt-1">
                Type : <span className="font-medium">{bureau.type}</span>
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">
              Société rattachée
            </p>
            <p className="mt-0.5 text-slate-800">
              {labelSociete}
              {bureau.societe?.sigle ? ` (${bureau.societe.sigle})` : ''}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">
              Adresse
            </p>
            <p className="mt-0.5 text-slate-800">
              {bureau.address || '—'}
              {bureau.city ? `, ${bureau.city}` : ''}
              {bureau.country ? ` (${bureau.country})` : ''}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">
                Téléphone
              </p>
              <p className="mt-0.5 text-slate-800">
                {bureau.phone || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">
                Email
              </p>
              <p className="mt-0.5 text-slate-800">
                {bureau.email || '—'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">
                Latitude
              </p>
              <p className="mt-0.5 text-slate-800">
                {bureau.latitude ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">
                Longitude
              </p>
              <p className="mt-0.5 text-slate-800">
                {bureau.longitude ?? '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Statut
              </span>
              <StatusBadge statut={bureau.statut} />
            </div>
            <p className="text-[11px] text-slate-400">
              ID : <span className="font-mono">{bureau.id}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------- Dialog de confirmation de suppression -------- */

const DeleteConfirmDialog = ({
  bureau,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}) => {
  if (!bureau) return null;

  const label = bureau.name || `ID ${bureau.id}`;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-5">
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
        >
          <FiX className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <FiAlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Supprimer ce bureau ?
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Vous êtes sur le point de supprimer&nbsp;
              <span className="font-semibold">{label}</span>. Cette action est
              irréversible.
            </p>
            {error && (
              <p className="mt-2 text-[11px] text-red-600">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Non, annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-xl border border-red-600 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isDeleting ? 'Suppression…' : 'Oui, supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------- Composant principal -------- */

const BureauxIndex = () => {
  const navigate = useNavigate();
  const [bureaux, setBureaux] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [viewBureau, setViewBureau] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 10;

  // Suppression
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadBureaux = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/bureaux', {
        params: { status: 'all' }, // on récupère tout
      });
      const raw = res?.data?.data || res?.data || [];

      const list = (Array.isArray(raw) ? raw : []).map((b) => {
        const isActive =
          b.is_active === 1 ||
          b.is_active === true ||
          b.is_active === '1';

        const statut = isActive ? 'active' : 'inactive';

        // Normalisation de la société liée
        const s = b.societe || {};
        const societe = {
          ...s,
          nom: s.nom ?? s.name ?? '',
          sigle: s.sigle ?? s.slug ?? '',
          pays: s.pays ?? '',
        };

        return {
          ...b,
          name: b.name ?? b.nom ?? '',
          city: b.city ?? '',
          address: b.address ?? '',
          phone: b.phone ?? '',
          email: b.email ?? '',
          country: b.country ?? '',
          statut,
          is_active: isActive,
          societe,
        };
      });

      setBureaux(list);
      setFiltered(list);
    } catch (err) {
      console.error('Erreur chargement bureaux', err);
      setError(
        err?.response?.data?.message ||
          "Impossible de charger la liste des bureaux."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBureaux();
  }, []);

  // Stats par statut pour header
  const statusStats = useMemo(() => {
    const stats = {
      total: bureaux.length,
      active: 0,
      inactive: 0,
    };

    bureaux.forEach((b) => {
      const normalized = (b.statut || '').toLowerCase();
      const isActiveStatus = ['active', 'actif'].includes(normalized);
      const isInactiveStatus = ['inactive', 'inactif'].includes(normalized);

      if (isActiveStatus) stats.active += 1;
      else if (isInactiveStatus) stats.inactive += 1;
    });

    return stats;
  }, [bureaux]);

  // Filtre global : recherche + statut
  useEffect(() => {
    const q = search.trim().toLowerCase();

    const next = bureaux.filter((b) => {
      const name = (b.name || '').toLowerCase();
      const city = (b.city || '').toLowerCase();
      const address = (b.address || '').toLowerCase();
      const societeNom = (b.societe?.nom || '').toLowerCase();
      const societeSigle = (b.societe?.sigle || '').toLowerCase();

      const matchSearch =
        !q ||
        name.includes(q) ||
        city.includes(q) ||
        address.includes(q) ||
        societeNom.includes(q) ||
        societeSigle.includes(q);

      const normalizedStatus = (b.statut || '').toLowerCase();
      const isActiveStatus = ['active', 'actif'].includes(normalizedStatus);
      const isInactiveStatus = ['inactive', 'inactif'].includes(
        normalizedStatus
      );

      const matchStatus =
        statusFilter === 'all' ||
        !statusFilter ||
        (statusFilter === 'active' && isActiveStatus) ||
        (statusFilter === 'inactive' && isInactiveStatus);

      return matchSearch && matchStatus;
    });

    setFiltered(next);
    setCurrentPage(1);
  }, [search, statusFilter, bureaux]);

  const handleNew = () => {
    // aligne avec BureauEditCreate => /bureaux/create
    navigate('/bureaux/create');
  };

  const handleEdit = (bureau) => {
    // aligne avec BureauEditCreate => /bureaux/:id/edit
    navigate(`/bureaux/${bureau.id}/edit`, {
      state: { bureau },
    });
  };

  const askDelete = (bureau) => {
    setDeleteTarget(bureau);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError('');

    try {
      await api.delete(`/bureaux/${deleteTarget.id}`);

      setBureaux((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setFiltered((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Erreur suppression bureau', err);
      setDeleteError(
        err?.response?.data?.message ||
          'Une erreur est survenue lors de la suppression.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeleteError('');
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PER_PAGE;
  const pageItems = filtered.slice(startIndex, startIndex + PER_PAGE);

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 overflow-auto">
      {/* Overlay loading global */}
      {isLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-lg">
            <FiLoader className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-sm text-slate-700">
              Chargement des bureaux…
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-[100] bg-white/70 backdrop-blur-2xl border-b border-slate-200/70 shadow-sm">
        <div className="mx-auto max-w-screen-2xl px-4 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 flex items-start gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-sky-600 rounded-2xl blur opacity-40" />
                <div className="relative p-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-600 text-white shadow-lg">
                  <FiHome className="w-5 h-5" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight">
                  Bureaux
                </h1>
                <p className="mt-1 text-xs md:text-sm text-slate-600 flex items-center gap-2">
                  <FiLayers className="w-3.5 h-3.5" />
                  <span>
                    Points de service / agences rattachés à une société.
                  </span>
                </p>

                {/* Badges de stats */}
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    Total&nbsp;: {statusStats.total}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Actifs&nbsp;: {statusStats.active}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    Inactifs&nbsp;: {statusStats.inactive}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadBureaux}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FiRefreshCw
                  className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                />
                Rafraîchir
              </button>
              <button
                type="button"
                onClick={handleNew}
                className="inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow"
              >
                <FiPlus className="w-4 h-4" />
                Nouveau bureau
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-screen-2xl px-4 lg:px-8 py-6 space-y-6">
        {/* Error boundary */}
        {error && (
          <section>
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-3">
              <FiAlertTriangle className="w-4 h-4 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-0.5">
                  Erreur lors du chargement des bureaux
                </p>
                <p className="text-xs md:text-sm">{error}</p>
                <button
                  type="button"
                  onClick={loadBureaux}
                  className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 text-red-700 border border-red-200 text-xs font-semibold hover:bg-white"
                >
                  <FiRefreshCw className="w-3.5 h-3.5" />
                  Réessayer
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Barre de recherche + filtre */}
        <section className={`${card} p-4 md:p-5`}>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex-1 space-y-2">
              <label className={sectionTitle}>Recherche</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <FiSearch className="w-4 h-4" />
                </span>
                <input
                  className={`${inputBase} pl-9`}
                  placeholder="Filtrer par bureau, ville, adresse ou société…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div>
                <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <FiFilter className="w-3 h-3" />
                  Statut
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-500">
                {filtered.length} bureau(x) trouvé(s)
              </div>
            </div>
          </div>
        </section>

        {/* Liste */}
        <section className={`${card} p-0 overflow-hidden`}>
          <div className="hidden md:grid grid-cols-[1.5fr,1.3fr,1.4fr,1fr,0.7fr,0.7fr] gap-3 px-6 py-3 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">
            <span>Bureau</span>
            <span>Société</span>
            <span>Adresse</span>
            <span>Contact</span>
            <span>Statut</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="divide-y divide-slate-100">
            {!isLoading && filtered.length === 0 && !error && (
              <div className="px-6 py-6 text-sm text-slate-500">
                Aucun bureau trouvé.
              </div>
            )}

            {!isLoading &&
              pageItems.map((bureau) => (
                <div
                  key={bureau.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleEdit(bureau)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleEdit(bureau);
                    }
                  }}
                  className="w-full text-left px-4 md:px-6 py-4 hover:bg-slate-50/80 transition flex flex-col md:grid md:grid-cols-[1.5fr,1.3fr,1.4fr,1fr,0.7fr,0.7fr] gap-2 md:gap-3 text-sm"
                >
                  {/* Bureau */}
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 flex items-center gap-2">
                      {bureau.name || '—'}
                      {bureau.is_primary && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Principal
                        </span>
                      )}
                    </span>
                    {bureau.type && (
                      <span className="text-xs text-slate-500">
                        Type : {bureau.type}
                      </span>
                    )}
                  </div>

                  {/* Société */}
                  <div className="text-xs md:text-sm text-slate-700 flex flex-col">
                    <span className="font-medium">
                      {bureau.societe?.nom || bureau.societe?.name || '—'}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      {bureau.societe?.sigle && (
                        <span>{bureau.societe.sigle}</span>
                      )}
                      {bureau.societe?.pays && (
                        <span className="text-base">
                          {getCountryFlag(bureau.societe.pays)}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Adresse */}
                  <div className="text-xs md:text-sm text-slate-700">
                    {bureau.address || '-'}
                    {bureau.city ? `, ${bureau.city}` : ''}
                    {bureau.country ? ` (${bureau.country})` : ''}
                  </div>

                  {/* Contact */}
                  <div className="text-xs md:text-sm text-slate-700 flex flex-col">
                    {bureau.phone && (
                      <span className="truncate">{bureau.phone}</span>
                    )}
                    {bureau.email && (
                      <span className="truncate text-slate-500">
                        {bureau.email}
                      </span>
                    )}
                  </div>

                  {/* Statut */}
                  <div className="flex items-center md:justify-start">
                    <StatusBadge statut={bureau.statut} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center md:justify-end">
                    <div className="flex items-center gap-1 md:gap-2">
                      {/* Voir (modal) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewBureau(bureau);
                        }}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                        title="Voir la fiche"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>

                      {/* Modifier */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(bureau);
                        }}
                        className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700 hover:bg-blue-100"
                        title="Modifier"
                      >
                        <FiEdit className="w-4 h-4" />
                      </button>

                      {/* Supprimer */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          askDelete(bureau);
                        }}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-100"
                        title="Supprimer"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 md:px-6 py-3 border-t border-slate-100 bg-slate-50/60">
              <p className="text-xs text-slate-500">
                Page {safePage} sur {totalPages} • {filtered.length} bureau(x)
              </p>
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-[11px] ${
                          page === safePage
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={safePage === totalPages}
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Modal de visualisation */}
      {viewBureau && (
        <BureauViewModal
          bureau={viewBureau}
          onClose={() => setViewBureau(null)}
        />
      )}

      {/* Dialog de suppression */}
      <DeleteConfirmDialog
        bureau={deleteTarget}
        isDeleting={isDeleting}
        error={deleteError}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default BureauxIndex;
