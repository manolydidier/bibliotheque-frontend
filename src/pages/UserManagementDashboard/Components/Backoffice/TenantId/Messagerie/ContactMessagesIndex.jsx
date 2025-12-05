// src/pages/contact/ContactMessagesIndex.jsx

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  FiMail,
  FiSearch,
  FiRefreshCw,
  FiAlertTriangle,
  FiLoader,
  FiTrash2,
  FiCornerUpLeft,
  FiMenu,
  FiChevronLeft,
  FiChevronRight,
  FiX,
} from 'react-icons/fi';
import api from '../../../../../../services/api';

/* -------- Constantes -------- */

const STATUS_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'new', label: 'Nouveaux' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'processed', label: 'Traités' },
];

/* -------- Helpers -------- */

const buildContactName = (m) => {
  if (m.full_name) return m.full_name;
  if (m.name) return m.name;
  const parts = [m.first_name, m.last_name].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return 'Contact inconnu';
};

const StatusBadge = ({ status }) => {
  if (!status) return null;

  const base =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border';

  if (status === 'new') {
    return (
      <span
        className={`${base} bg-indigo-50 text-indigo-700 border-indigo-200`}
      >
        Nouveau
      </span>
    );
  }

  if (status === 'in_progress') {
    return (
      <span
        className={`${base} bg-amber-50 text-amber-700 border-amber-200`}
      >
        En cours
      </span>
    );
  }

  if (status === 'processed') {
    return (
      <span
        className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}
      >
        Traité
      </span>
    );
  }

  return (
    <span
      className={`${base} bg-slate-50 text-slate-700 border-slate-200`}
    >
      {status}
    </span>
  );
};

const formatRelativeDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const target = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate()
  );
  const diffDays = Math.round(
    (target - today) / (1000 * 60 * 60 * 24)
  );

  const time = d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (diffDays === 0) return `Aujourd'hui · ${time}`;
  if (diffDays === -1) return `Hier · ${time}`;
  return d.toLocaleDateString();
};

/* -------- Composant principal -------- */

const ContactMessagesIndex = () => {
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // 🔹 Ce que tape l'utilisateur
  const [searchInput, setSearchInput] = useState('');
  // 🔹 Ce qui part vraiment à l'API (après délai)
  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination côté Laravel
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    perPage: 20,
    total: 0,
    from: 0,
    to: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [error, setError] = useState('');

  const [isDeleting, setIsDeleting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(null);

  const [showList, setShowList] = useState(true);

  // Toast
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const showToast = (type, message) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ type, message });
    toastTimeoutRef.current = setTimeout(
      () => setToast(null),
      3000
    );
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  /* ----- Debounce de la recherche ----- */
  useEffect(() => {
    // ⏳ On attend 500 ms après la dernière frappe
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  /* ----- Chargement des messages (API Laravel) ----- */

  const loadMessages = useCallback(
    async (page = 1, { showGlobalLoader = false } = {}) => {
      if (showGlobalLoader) setIsLoading(true);
      else setIsPageLoading(true);

      setError('');

      try {
        const res = await api.get('/contact-messages', {
          params: {
            status: statusFilter, // "all" ou new|in_progress|processed
            q: search || undefined,
            page,
          },
        });

        const payload = res?.data || {};
        const raw = payload.data || [];

        const list = (Array.isArray(raw) ? raw : []).map(
          (m) => ({
            id: m.id,
            subject: m.subject ?? '',
            message: m.message ?? '',
            email: m.email ?? '',
            phone: m.phone ?? '',
            full_name: m.full_name ?? m.name ?? '',
            first_name: m.first_name ?? '',
            last_name: m.last_name ?? '',
            status: m.status ?? 'new',
            topic: m.topic ?? '',
            ip_address: m.ip_address ?? '',
            user_agent: m.user_agent ?? '',
            sent_to_email: m.sent_to_email ?? '',
            created_at: m.created_at ?? null,
          })
        );

        setMessages(list);

        const currentPage =
          payload.current_page ?? page ?? 1;
        const lastPage = payload.last_page ?? 1;

        setPagination({
          currentPage,
          lastPage,
          perPage: payload.per_page ?? list.length,
          total: payload.total ?? list.length,
          from: payload.from ?? 0,
          to: payload.to ?? list.length,
        });

        // garder la sélection si possible
        setSelectedMessage((prev) => {
          if (!list.length) return null;
          if (prev) {
            const exists = list.find(
              (m) => m.id === prev.id
            );
            return exists || list[0];
          }
          return list[0];
        });
      } catch (err) {
        console.error('Erreur chargement messages', err);
        setError(
          err?.response?.data?.message ||
            "Impossible de charger la liste des messages de contact."
        );
      } finally {
        setIsLoading(false);
        setIsPageLoading(false);
      }
    },
    [statusFilter, search]
  );

  // Chargement initial
  useEffect(() => {
    loadMessages(1, { showGlobalLoader: true });
  }, [loadMessages]);

  // Quand la recherche (debounced) ou le filtre de statut changent → rechargement
  useEffect(() => {
    // On évite d'afficher encore le gros overlay, juste le petit loader de page
    loadMessages(1);
  }, [search, statusFilter, loadMessages]);

  /* ----- Actions ----- */

  const handleSelectMessage = (msg) => {
    setSelectedMessage(msg);
  };

  const handleToggleList = () => {
    setShowList((prev) => !prev);
  };

  const handleReply = () => {
    if (!selectedMessage || !selectedMessage.email) return;

    const subject = encodeURIComponent(
      `Re: ${
        selectedMessage.subject || 'Votre message'
      }`
    );
    const name = buildContactName(selectedMessage);
    const body = encodeURIComponent(
      `Bonjour ${name},\n\n`
    );

    window.location.href = `mailto:${selectedMessage.email}?subject=${subject}&body=${body}`;
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedMessage) return;
    if (selectedMessage.status === newStatus) return;

    setStatusUpdating(newStatus);
    try {
      const res = await api.put(
        `/contact-messages/${selectedMessage.id}/status`,
        { status: newStatus }
      );

      const updated =
        res?.data?.data || selectedMessage;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === selectedMessage.id
            ? { ...m, status: updated.status }
            : m
        )
      );
      setSelectedMessage((prev) =>
        prev
          ? { ...prev, status: updated.status }
          : prev
      );

      showToast(
        'success',
        'Statut du message mis à jour.'
      );
    } catch (err) {
      console.error('Erreur update statut', err);
      showToast(
        'error',
        "Impossible de mettre à jour le statut."
      );
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleOpenDeleteModal = () => {
    if (!selectedMessage) return;
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    if (isDeleting) return;
    setShowDeleteModal(false);
  };

  const handleDeleteSelected = async () => {
    if (!selectedMessage) return;

    setIsDeleting(true);
    try {
      await api.delete(
        `/contact-messages/${selectedMessage.id}`
      );

      showToast(
        'success',
        'Message supprimé avec succès.'
      );
      setShowDeleteModal(false);

      await loadMessages(pagination.currentPage);
    } catch (err) {
      console.error('Erreur suppression message', err);
      showToast(
        'error',
        'Une erreur est survenue lors de la suppression.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePageChange = (direction) => {
    const next =
      direction === 'prev'
        ? pagination.currentPage - 1
        : pagination.currentPage + 1;

    if (
      next < 1 ||
      next > pagination.lastPage ||
      isPageLoading
    )
      return;

    loadMessages(next);
  };

  /* -------- Rendu -------- */

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-slate-50 via-sky-50/30 to-indigo-50/40 overflow-hidden">
      {/* Overlay loading global */}
      {isLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-lg">
            <FiLoader className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-sm text-slate-700">
              Chargement des messages…
            </span>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[250]">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl shadow-lg text-sm ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? '✅' : '⚠️'}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-[100] bg-white/70 backdrop-blur-2xl border-b border-slate-200/70">
        <div className="mx-auto max-w-screen-2xl px-4 lg:px-8 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <FiMail className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-sm md:text-base font-semibold text-slate-900">
                Messages de contact
              </h1>
              <p className="text-[11px] text-slate-500 truncate">
                Gestion des messages reçus via le formulaire
                public.
              </p>
            </div>
          </div>

          {/* Barre de recherche inline header */}
          <div className="hidden md:flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) =>
                  setSearchInput(e.target.value)
                }
                placeholder="Rechercher (sujet, nom, email, message…) "
                className="w-full rounded-full border border-slate-200 bg-slate-50 px-9 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                loadMessages(1, { showGlobalLoader: true })
              }
              disabled={isLoading || isPageLoading}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <FiRefreshCw
                className={`w-3.5 h-3.5 ${
                  isLoading || isPageLoading
                    ? 'animate-spin'
                    : ''
                }`}
              />
              Rafraîchir
            </button>

            {/* Recherche mobile */}
            <div className="md:hidden">
              <div className="relative w-32">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) =>
                    setSearchInput(e.target.value)
                  }
                  placeholder="Rechercher…"
                  className="w-full rounded-full border border-slate-200 bg-slate-50 px-8 py-1.5 text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Barre de filtres de statut */}
        <div className="mx-auto max-w-screen-2xl px-4 lg:px-8 pb-2 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {STATUS_FILTERS.map((f) => {
              const isActive =
                statusFilter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() =>
                    setStatusFilter(f.value)
                  }
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 border text-[11px] transition ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500">
            <span>
              {pagination.from || 0}–{pagination.to || 0} sur{' '}
              {pagination.total || 0}
            </span>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  handlePageChange('prev')
                }
                disabled={
                  pagination.currentPage <= 1 ||
                  isPageLoading
                }
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50 disabled:opacity-50"
              >
                <FiChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  handlePageChange('next')
                }
                disabled={
                  pagination.currentPage >=
                    pagination.lastPage ||
                  isPageLoading
                }
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50 disabled:opacity-50"
              >
                <FiChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-screen-2xl px-0 lg:px-4 py-4">
        {/* Erreur globale */}
        {error && (
          <div className="mx-4 lg:mx-8 mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-3">
            <FiAlertTriangle className="w-4 h-4 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-0.5">
                Erreur lors du chargement des messages
              </p>
              <p className="text-xs md:text-sm">
                {error}
              </p>
            </div>
          </div>
        )}

        <section className="mx-4 lg:mx-8 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex h-[620px]">
            {/* Liste des messages */}
            {showList && (
              <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50/60">
                <div className="px-3 py-2 text-[11px] text-slate-500 border-b border-slate-200 flex items-center justify-between">
                  <span>Messages</span>
                  <span>
                    Page {pagination.currentPage}/
                    {pagination.lastPage}
                  </span>
                </div>

                <div className="flex-1 overflow-auto">
                  {!messages.length && !isLoading && (
                    <div className="px-4 py-6 text-xs text-slate-500">
                      Aucun message trouvé.
                    </div>
                  )}

                  {messages.map((m) => {
                    const isActive =
                      selectedMessage &&
                      selectedMessage.id === m.id;
                    const contactName =
                      buildContactName(m);
                    const snippet =
                      m.message?.length > 80
                        ? m.message.slice(0, 80) +
                          '…'
                        : m.message;

                    const isUnread = m.status === 'new';

                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          handleSelectMessage(m)
                        }
                        className={`w-full text-left px-4 py-3 border-b border-slate-100 transition flex flex-col gap-1 ${
                          isActive
                            ? 'bg-blue-50'
                            : 'bg-transparent hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isUnread && (
                              <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
                            )}
                            <span
                              className={`text-xs font-medium truncate ${
                                isUnread
                                  ? 'text-slate-900'
                                  : 'text-slate-800'
                              }`}
                            >
                              {m.subject || '(Sans sujet)'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {formatRelativeDate(
                              m.created_at
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500 truncate">
                            {contactName}
                          </span>
                          <StatusBadge status={m.status} />
                        </div>
                        {snippet && (
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            {snippet}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Pagination bas de liste */}
                <div className="flex items-center justify_between px-3 py-2 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                  <span>
                    {pagination.from || 0}–
                    {pagination.to || 0} sur{' '}
                    {pagination.total || 0}
                  </span>
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        handlePageChange('prev')
                      }
                      disabled={
                        pagination.currentPage <= 1 ||
                        isPageLoading
                      }
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <FiChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handlePageChange('next')
                      }
                      disabled={
                        pagination.currentPage >=
                          pagination.lastPage ||
                        isPageLoading
                      }
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <FiChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pane de lecture */}
            <div className="flex-1 flex flex-col">
              {/* Barre d'actions style email */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/70">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={handleToggleList}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
                    title={
                      showList
                        ? 'Masquer la liste'
                        : 'Afficher la liste'
                    }
                  >
                    <FiMenu className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {selectedMessage
                        ? selectedMessage.subject ||
                          '(Sans sujet)'
                        : 'Aucun message sélectionné'}
                    </span>
                    {selectedMessage && (
                      <span className="text-[11px] text-slate-500">
                        {formatRelativeDate(
                          selectedMessage.created_at
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {selectedMessage && (
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={selectedMessage.status}
                    />
                    <button
                      type="button"
                      onClick={handleReply}
                      disabled={
                        !selectedMessage.email
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-blue-600 bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      <FiCornerUpLeft className="w-3.5 h-3.5" />
                      Répondre
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenDeleteModal}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-600 bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                      Supprimer
                    </button>
                  </div>
                )}
              </div>

              {/* Barre de changement de statut */}
              {selectedMessage && (
                <div className="px-4 py-2 border-b border-slate-200 bg-white flex flex_wrap gap-1.5 items-center">
                  <span className="text-[11px] text-slate-500">
                    Statut du message :
                  </span>
                  {STATUS_FILTERS.filter(
                    (f) => f.value !== 'all'
                  ).map((f) => {
                    const isActive =
                      selectedMessage.status === f.value;
                    const isLoadingStatus =
                      statusUpdating === f.value;
                    return (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() =>
                          handleUpdateStatus(f.value)
                        }
                        disabled={
                          isLoadingStatus ||
                          selectedMessage.status ===
                            f.value
                        }
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] border transition ${
                          isActive
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        } disabled:opacity-60`}
                      >
                        {isLoadingStatus && (
                          <FiLoader className="w-3 h-3 animate-spin" />
                        )}
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Contenu du message */}
              <div className="flex-1 overflow-auto px-4 py-4">
                {selectedMessage ? (
                  <div className="max-w-3xl mx-auto space-y-4">
                    {/* Expéditeur */}
                    <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/70">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                        Expéditeur
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900">
                            {buildContactName(
                              selectedMessage
                            )}
                          </span>
                          {selectedMessage.topic && (
                            <span className="text-[11px] text-slate-500">
                              Sujet / catégorie :{' '}
                              {selectedMessage.topic}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 flex flex-col sm:items-end gap-1">
                          {selectedMessage.email && (
                            <span className="break-all">
                              📧{' '}
                              {
                                selectedMessage.email
                              }
                            </span>
                          )}
                          {selectedMessage.phone && (
                            <span>
                              📞{' '}
                              {
                                selectedMessage.phone
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="border border-slate-200 rounded-2xl p-3 bg-white">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                        Message
                      </p>
                      <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {selectedMessage.message || '—'}
                      </div>
                    </div>

                    {/* Détails techniques */}
                    <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/60 space-y-2">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase">
                        Détails techniques
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-600">
                        <div>
                          <span className="font-semibold">
                            IP :{' '}
                          </span>
                          <span>
                            {selectedMessage.ip_address ||
                              '—'}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold">
                            Envoyé à :{' '}
                          </span>
                          <span>
                            {selectedMessage.sent_to_email ||
                              '—'}
                          </span>
                        </div>
                      </div>
                      {selectedMessage.user_agent && (
                        <div className="text-[11px] text-slate-500 mt-1">
                          <span className="font-semibold">
                            Navigateur / device :
                          </span>{' '}
                          <span className="break-words">
                            {selectedMessage.user_agent}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm text-slate-500">
                    Sélectionnez un message dans la
                    liste pour afficher son contenu.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Modal de suppression */}
      {showDeleteModal && selectedMessage && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseDeleteModal();
            }
          }}
        >
          <div className="relative w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-5">
            <button
              type="button"
              onClick={handleCloseDeleteModal}
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
                  Supprimer ce message ?
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Vous êtes sur le point de supprimer le
                  message de{' '}
                  <span className="font-semibold">
                    {buildContactName(selectedMessage)}
                  </span>
                  . Cette action est irréversible.
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-xl border border-red-600 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <FiLoader className="w-3.5 h-3.5 animate-spin" />
                    Suppression…
                  </>
                ) : (
                  'Supprimer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactMessagesIndex;
