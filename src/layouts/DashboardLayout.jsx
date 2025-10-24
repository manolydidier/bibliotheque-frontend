// src/layouts/DashboardLayout.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FaFolderOpen, FaTachometerAlt, FaImages, FaStar, FaFilePdf,
  FaCamera, FaCog, FaBars, FaBell, FaUser, FaSignOutAlt, FaTrash,
  FaPlus, FaChevronDown,
} from 'react-icons/fa';
import { FaUsersGear } from 'react-icons/fa6';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import i18n from '../i18n';
import { logoutUser } from '../features/auth/authActions';

const STORAGE_KEY         = 'dashboard:activeTabId';
const ACCORDION_STORE_KEY = 'dashboard:openSections';

/* ========================= Helpers ========================= */
const getTokenGuard = () => {
  try {
    return (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tokenGuard')) ||
           (typeof localStorage !== 'undefined' && localStorage.getItem('tokenGuard')) || null;
  } catch { return null; }
};

const buildAvatarUrl = (rawUrl, updatedAt, baseStorage) => {
  const placeholder = 'https://randomuser.me/api/portraits/women/44.jpg';
  if (!rawUrl) return placeholder;
  const url = String(rawUrl).trim();
  const isAbs = /^https?:\/\//i.test(url);
  const base = (baseStorage || '').replace(/\/+$/, '');
  const abs = isAbs ? url : `${base}/storage/${url.replace(/^\/+/, '')}`;
  const stamp = [];
  if (updatedAt) stamp.push(`t=${encodeURIComponent(updatedAt)}`);
  stamp.push(`cb=${Date.now()}`);
  return `${abs}${abs.includes('?') ? '&' : '?'}${stamp.join('&')}`;
};

const isAbsoluteUrl = (u) => /^https?:\/\//i.test(String(u || ''));
const toFrontPath = (input) => {
  if (!input) return null;
  if (String(input).startsWith('/')) return input;
  try {
    const u = new URL(input);
    return `${u.pathname}${u.search}${u.hash}`;
  } catch { return input; }
};

const LS_KEY = (uid) => `act_seen_ts:${uid}`;
const getLastSeenTs = (uid) => { try { return localStorage.getItem(LS_KEY(uid)); } catch { return null; } };
const setLastSeenNow = (uid) => { try { localStorage.setItem(LS_KEY(uid), new Date().toISOString()); } catch {} };

const fetchJson = async (url, params = {}, token) => {
  const q = new URLSearchParams(params);
  const res = await fetch(`${url}?${q.toString()}`, {
    headers: { 'Accept': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const typeIconName = (type) => {
  switch (type) {
    case 'permission_changed': return '🔑';
    case 'role_assigned':      return '🛡️';
    case 'article_created':    return '📰';
    case 'comment_approved':   return '💬';
    default:                   return '🔔';
  }
};

const buildActivityLink = (a) => {
  const articleSlug = a.article_slug || a.slug;

  switch (a.type) {
    case 'article_created':
      return articleSlug ? `/articles/${articleSlug}` : null;
    case 'comment_approved': {
      if (!articleSlug) return null;
      const commentId =
        a.comment_id ||
        (typeof a.id === 'string' && a.id.startsWith('comment-approve-')
          ? a.id.replace('comment-approve-', '')
          : null);
      return commentId
        ? `/articles/${articleSlug}#comment-${commentId}`
        : `/articles/${articleSlug}`;
    }
    case 'role_assigned':
    case 'permission_changed':
      return '/settings';
    default:
      if (a.url && isAbsoluteUrl(a.url)) {
        try {
          const u = new URL(a.url);
          return `${u.pathname}${u.hash || ''}`;
        } catch {}
      }
      return a.url || a.link || null;
  }
};

const buildPendingLink = (item) => {
  const articleSlug =
    item.article_slug ||
    item.slug ||
    item.article?.slug ||
    null;

  const commentId =
    item.comment_id ||
    (item.type && String(item.type).includes('comment') && item.id) ||
    null;

  if (item.url)  return item.url;
  if (item.link) return item.link;

  if (articleSlug) {
    return commentId
      ? `/articles/${articleSlug}#comment-${commentId}`
      : `/articles/${articleSlug}`;
  }
  return '/settings';
};

const timeAgo = (iso, t) => {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return t('just_now','à l\'instant');
  if (diff < 3600) return t('x_min_ago','il y a {{x}} min', { x: Math.floor(diff/60) });
  if (diff < 86400) return t('x_h_ago','il y a {{x}} h', { x: Math.floor(diff/3600) });
  return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
};
/* ========================= /Helpers ========================= */

const DashboardLayout = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const API_BASE_STORAGE = import.meta.env.VITE_API_BASE_STORAGE;
  const API_BASE_URL     = import.meta.env.VITE_API_BASE_URL || '';

  const { isAuthenticated, user } = useSelector((s) => s.library?.auth || {});
  const userId = user?.id;

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [title, setTitle] = useState("");
  const [activeTabId, setActiveTabId] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'dashboard'; } catch { return 'dashboard'; }
  });

  const toggleSidebar = () => setIsSidebarOpen(v => !v);

  // Langues
  const LanguageSelector = () => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => i18n.changeLanguage('fr')}
        className={`px-3 py-1 rounded-lg text-sm ${i18n.language === 'fr' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        aria-pressed={i18n.language === 'fr'}
      >
        FR
      </button>
      <button
        onClick={() => i18n.changeLanguage('en')}
        className={`px-3 py-1 rounded-lg text-sm ${i18n.language === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        aria-pressed={i18n.language === 'en'}
      >
        EN
      </button>
    </div>
  );

  // === MENU : groupes (avec accordéon) ===
  const menuSections = useMemo(() => ([
    {
      id: 'root',
      titleKey: null,
      items: [
        { id: 'dashboard',  tKey: 'layout.menu.dashboard',    icon: <FaTachometerAlt className="text-blue-500 mr-3" />, link: '/dashboard' },
      ],
    },
    {
      id: 'content',
      titleKey: 'layout.sections.media',
      items: [
        { id: 'platform',     tKey: 'layout.menu.platform',   icon: <FaImages className="text-blue-500 mr-3" />, link: '/articles' },
        { id: 'articlesBo',   tKey: 'layout.menu.articlesBo', icon: <FaStar className="text-blue-500 mr-3" />, link: '/articlescontroler' },
        { id: 'articleNew',   tKey: 'layout.menu.articleNew', icon: <FaPlus className="text-blue-500 mr-3" />, link: '/articles/new' },
        { id: 'trashed',      tKey: 'layout.menu.trashed',    icon: <FaTrash className="text-blue-500 mr-3" />, link: '/articles/trashed' },
      ],
    },
    {
      id: 'system',
      titleKey: 'layout.sections.settings',
      items: [
        {
          id: 'categoriesTags',
          tKey: 'layout.menu.categoriesTags',
          // 🔵 Harmonisation du style (même bleu que les autres)
          icon: <FaCog className="text-blue-500 mr-3" />,
          link: '/configuration',
        },
        { id: 'users', tKey: 'layout.menu.users', icon: <FaUsersGear className="text-blue-500 mr-3" />, onClick: () => {} },
      ],
    },
  ]), []);

  // Accordéon: état + persistance
  const [openSections, setOpenSections] = useState(() => {
    try {
      const raw = localStorage.getItem(ACCORDION_STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    // par défaut: tous ouverts
    return { root: true, content: true, system: true };
  });

  const toggleSection = (sid) => {
    setOpenSections((prev) => {
      const next = { ...prev, [sid]: !prev[sid] };
      try { localStorage.setItem(ACCORDION_STORE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser(i18n.language));
      navigate('/auth');
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, activeTabId); } catch {}
  }, [activeTabId]);

  useEffect(() => {
    if (!title) {
      if (location.pathname.startsWith('/configuration')) setTitle(t('layout.titles.settings'));
      else if (location.pathname.startsWith('/articlescontroler')) setTitle(t('layout.titles.articlesBo'));
      else if (location.pathname.startsWith('/articles/trashed')) setTitle(t('layout.titles.trashed'));
      else if (location.pathname.startsWith('/articles/new')) setTitle(t('layout.titles.articleNew'));
      else if (location.pathname.startsWith('/articles')) setTitle(t('layout.titles.platform'));
      else if (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/backoffice')) setTitle(t('layout.titles.dashboard'));
      else setTitle(t('layout.titles.dashboard'));
    }
  }, [location.pathname, title, t]);

  const baseItemClass = (isActive) =>
    `flex items-center sidebar-item rounded-lg p-3 mb-1 cursor-pointer transition-colors duration-300
     ${isActive ? "bg-[#eff6ff] border-l-2 border-blue-500 font-semibold" : "hover:bg-gray-100/70"}`;

  /* ===== Profil ===== */
  const computedAvatarSrc = useMemo(() => {
    const raw = user?.avatar_url || user?.avatar || '';
    const updatedAt = user?.updated_at || user?.avatar_updated_at || null;
    return buildAvatarUrl(raw, updatedAt, API_BASE_STORAGE);
  }, [user?.avatar_url, user?.avatar, user?.updated_at, user?.avatar_updated_at, API_BASE_STORAGE]);

  const [avatarSrc, setAvatarSrc] = useState(computedAvatarSrc);
  useEffect(() => { setAvatarSrc(computedAvatarSrc); }, [computedAvatarSrc]);
  const onAvatarError = () => setAvatarSrc('https://randomuser.me/api/portraits/women/44.jpg');

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  useEffect(() => {
    const onClick = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  /* ===== Notifications (avec z-index haut) ===== */
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState('news');
  const notifRef = useRef(null);

  const [newCount, setNewCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const [news, setNews] = useState({ items: [], page: 1, last: 1, loading: false, error: null });
  const [pending, setPending] = useState({ items: [], page: 1, last: 1, loading: false, error: null });

  const recomputeNewCount = useCallback(async () => {
    if (!isAuthenticated || !userId) { setNewCount(0); return; }
    const token = getTokenGuard();
    const lastSeen = getLastSeenTs(userId);
    if (!lastSeen) { setLastSeenNow(userId); setNewCount(0); return; }
    try {
      const head = await fetchJson(`${API_BASE_URL}/users/${userId}/activities`, { per_page: 1, page: 1 }, token);
      const latest = head?.data?.[0];
      if (!latest?.created_at) { setNewCount(0); return; }
      const latestTs = Date.parse(latest.created_at);
      const lastSeenTs = Date.parse(lastSeen);
      if (isNaN(latestTs) || isNaN(lastSeenTs) || latestTs <= lastSeenTs) { setNewCount(0); return; }

      const day = new Date(lastSeenTs);
      const fromStr = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
      const page1 = await fetchJson(`${API_BASE_URL}/users/${userId}/activities`, { per_page: 100, page: 1, from: fromStr }, token);
      const items = Array.isArray(page1?.data) ? page1.data : [];
      const precise = items.filter(it => {
        const ts = Date.parse(it?.created_at); return !isNaN(ts) && ts > lastSeenTs;
      }).length;
      const approxMore = (page1?.meta?.total || 0) > 100;
      setNewCount(approxMore ? 99 : precise);
    } catch {}
  }, [API_BASE_URL, isAuthenticated, userId]);

  const recomputePendingCount = useCallback(async () => {
    if (!isAuthenticated) { setPendingCount(0); return; }
    try {
      const token = getTokenGuard();
      const resp = await fetchJson(`${API_BASE_URL}/moderation/pending-count`, {}, token);
      setPendingCount(Number(resp?.pending || 0));
    } catch {}
  }, [API_BASE_URL, isAuthenticated]);

  useEffect(() => {
    const tick = () => { recomputeNewCount(); recomputePendingCount(); };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [recomputeNewCount, recomputePendingCount]);

  const openNotifications = async () => {
    setNotifOpen((v) => !v);
    if (!notifOpen) {
      loadNews(1, true);
      loadPending(1, true);
      if (userId) { setLastSeenNow(userId); setNewCount(0); }
    }
  };

  const loadNews = async (page, replace = false) => {
    if (!isAuthenticated || !userId) return;
    const token = getTokenGuard();
    setNews((s) => ({ ...s, loading: true, error: null }));
    try {
      const resp = await fetchJson(`${API_BASE_URL}/users/${userId}/activities`, { per_page: 10, page }, token);
      const items = Array.isArray(resp?.data) ? resp.data : [];
      setNews({
        items: replace ? items : [...(replace ? [] : news.items), ...items],
        page: resp?.meta?.current_page || page,
        last: resp?.meta?.last_page || page,
        loading: false,
        error: null
      });
    } catch (e) {
      setNews((s) => ({ ...s, loading: false, error: e?.message || 'Load failed' }));
    }
  };

  const loadPending = async (page, replace = false) => {
    if (!isAuthenticated) return;
    const token = getTokenGuard();
    setPending((s) => ({ ...s, loading: true, error: null }));
    try {
      const resp = await fetchJson(`${API_BASE_URL}/moderation/pending`, { per_page: 10, page }, token);
      const raw = Array.isArray(resp?.data) ? resp.data : [];
      const items = raw.map(x => ({ ...x }));
      setPending({
        items: replace ? items : [...(replace ? [] : pending.items), ...items],
        page: resp?.meta?.current_page || page,
        last: resp?.meta?.last_page || page,
        loading: false,
        error: null
      });
    } catch (e) {
      setPending((s) => ({ ...s, loading: false, error: e?.message || 'Load failed' }));
    }
  };

  const markAllRead = () => {
    if (userId) { setLastSeenNow(userId); setNewCount(0); }
  };

  useEffect(() => {
    const onClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  /* ========================= Rendu ========================= */
  return (
    <div className="flex h-screen w-full overflow-hidden bg-bgDefault">
      {/* Sidebar */}
      <div
        id="sidebar"
        className={`sidebar w-64 bg-white/80 backdrop-blur-xl flex-shrink-0 overflow-y-auto transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-64'
        } will-change-transform`}
        aria-hidden={!isSidebarOpen}
      >
        <div className="p-5 border-b border-gray-200/60">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/90 backdrop-blur flex items-center justify-center mr-3 shadow-sm">
              <FaFolderOpen className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">{t('layout.brand')}</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">{t('layout.subtitle')}</p>
        </div>

        <nav className="p-3">
          {menuSections.map((section) => {
            const isRoot = !section.titleKey;
            const open = openSections[section.id] ?? true;

            return (
              <div key={section.id} className="mb-1">
                {section.titleKey && (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between text-left px-3 py-2 mt-4 mb-2
                               text-xs font-semibold text-gray-600 uppercase tracking-wider
                               hover:text-gray-800 transition"
                    aria-expanded={open}
                    aria-controls={`sec-${section.id}`}
                  >
                    <span>{t(section.titleKey)}</span>
                    <FaChevronDown
                      className={`transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
                    />
                  </button>
                )}

                <div
                  id={`sec-${section.id}`}
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    open || isRoot ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-70'
                  }`}
                >
                  {section.items.map((item) => {
                    const isActive = activeTabId === item.id;
                    const content = (
                      <>
                        {item.icon}
                        <span className="font-medium">
                          {t(item.tKey, item.tKey === 'layout.menu.categoriesTags' ? 'Catégories & Tags' : undefined)}
                        </span>
                      </>
                    );

                    if (item.link) {
                      return (
                        <Link
                          key={item.id}
                          to={item.link}
                          onClick={() => setActiveTabId(item.id)}
                          className={`${baseItemClass(isActive)} group relative`}
                        >
                          {content}
                          <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg bg-gradient-to-r from-blue-50/0 via-blue-50/40 to-blue-100/0" />
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTabId(item.id);
                          item.onClick?.();
                        }}
                        className={`${baseItemClass(isActive)} group relative w-full text-left`}
                      >
                        {content}
                        <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg bg-gradient-to-r from-blue-50/0 via-blue-50/40 to-blue-100/0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Déconnexion + stockage */}
        <div className="mt-auto p-4 border-t border-gray-200/70 bg-white/60 backdrop-blur">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            <FaSignOutAlt className="text-gray-600" />
            <span className="text-sm font-medium text-gray-800">
              {t('logout', 'Déconnexion')}
            </span>
          </button>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{t('layout.storage.used')}</span>
              <span className="text-sm font-medium">42%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5" aria-hidden>
              <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: "42%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col relative z-0">
        {/* Header avec z-index élevé pour les dropdowns */}
        <header className="relative z-40 bg-white/70 backdrop-blur-xl shadow-sm p-4 flex justify-between items-center border-b border-white/60">
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="mr-4 text-gray-700 hover:text-gray-900"
              aria-label={isSidebarOpen ? t('layout.a11y.closeSidebar') : t('layout.a11y.openSidebar')}
              aria-expanded={isSidebarOpen}
              aria-controls="sidebar"
            >
              <FaBars />
            </button>
            <h1 className="text-xl font-bold text-gray-800 animate-fadeSlide">{title}</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            {isAuthenticated && (
              <div className="relative z-50" ref={notifRef}>
                <button
                  onClick={openNotifications}
                  className="relative text-gray-700 hover:text-gray-900 transition-colors p-2 rounded-full hover:bg-white/60"
                  aria-label={t('layout.a11y.notifications')}
                >
                  <FaBell />
                  {(newCount > 0 || pendingCount > 0) && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-semibold rounded-full min-w-4 h-4 flex items-center justify-center">
                      {(newCount + pendingCount) > 99 ? '99+' : (newCount + pendingCount)}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl ring-1 ring-black/5 overflow-hidden z-[60] animate-dropIn">
                    <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{t('notifications','Notifications')}</span>
                        {newCount > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{newCount}</span>}
                        {pendingCount > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{pendingCount} {t('to_moderate','à modérer')}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={()=>{ setNotifOpen(false); navigate('/settings'); }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {t('see_all','Tout voir')}
                        </button>
                        <button
                          onClick={markAllRead}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          {t('mark_all_read','Tout marquer lu')}
                        </button>
                      </div>
                    </div>

                    <div className="px-4 pt-3 flex gap-2">
                      <button
                        className={`px-3 py-1.5 rounded-full text-sm ${notifTab==='news' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                        onClick={()=>setNotifTab('news')}
                      >
                        {t('activities','Activités')}
                      </button>
                      <button
                        className={`px-3 py-1.5 rounded-full text-sm ${notifTab==='pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                        onClick={()=>setNotifTab('pending')}
                      >
                        {t('to_moderate','À modérer')}
                      </button>
                    </div>

                    <div className="max-h-96 overflow-auto">
                      {notifTab==='news' ? (
                        <>
                          {news.items.length === 0 && !news.loading && <div className="p-4 text-sm text-gray-500">{t('no_activity','Aucune activité')}</div>}
                          {news.items.map((a)=> {
                            const href = toFrontPath(buildActivityLink(a) || a.url || a.link) || '/settings';
                            const isRel = String(href).startsWith('/');
                            const Row = (
                              <div className="flex items-start gap-3 p-4 hover:bg-gray-50 transition">
                                <div className="flex-shrink-0 w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600">{typeIconName(a.type)}</span>
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm text-gray-900 line-clamp-2">{a.title || t('notification','Notification')}</div>
                                  {a.subtitle && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.subtitle}</div>}
                                  <div className="text-xs text-gray-400 mt-1">{timeAgo(a.created_at, t)}</div>
                                </div>
                              </div>
                            );
                            return isRel ? (
                              <Link key={a.id} to={href} onClick={()=> setNotifOpen(false)}>{Row}</Link>
                            ) : (
                              <a key={a.id} href={href} onClick={()=> setNotifOpen(false)}>{Row}</a>
                            );
                          })}
                          <div className="p-3 border-t flex justify-center">
                            <button
                              disabled={news.loading || news.page >= news.last}
                              onClick={()=> loadNews(news.page + 1)}
                              className={`text-sm px-3 py-1.5 rounded border ${news.page >= news.last ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                              {news.loading ? t('loading','Chargement…') : (news.page < news.last ? t('see_more','Voir plus') : t('no_more','Fin'))}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {pending.items.length === 0 && !pending.loading && <div className="p-4 text-sm text-gray-500">{t('nothing_to_moderate','Rien à modérer')}</div>}
                          {pending.items.map((p)=> {
                            const hrefCandidate = buildPendingLink(p);
                            const href = toFrontPath(hrefCandidate) || '/settings';
                            const isRel = String(href).startsWith('/');
                            const Row = (
                              <div className="flex items-start gap-3 p-4 hover:bg-gray-50 transition">
                                <div className="flex-shrink-0 w-9 h-9 bg-amber-50 rounded-full flex items-center justify-center">
                                  <span className="text-amber-600">💬</span>
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm text-gray-900 line-clamp-2">{p.title || t('pending_item','Élément à modérer')}</div>
                                  {p.subtitle && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.subtitle}</div>}
                                  <div className="text-xs text-gray-400 mt-1">{timeAgo(p.created_at, t)}</div>
                                </div>
                              </div>
                            );
                            return isRel ? (
                              <Link key={p.id} to={href} onClick={()=> setNotifOpen(false)}>{Row}</Link>
                            ) : (
                              <a key={p.id} href={href} onClick={()=> setNotifOpen(false)}>{Row}</a>
                            );
                          })}
                          <div className="p-3 border-t flex justify-center">
                            <button
                              disabled={pending.loading || pending.page >= pending.last}
                              onClick={()=> loadPending(pending.page + 1)}
                              className={`text-sm px-3 py-1.5 rounded border ${pending.page >= pending.last ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                              {pending.loading ? t('loading','Chargement…') : (pending.page < pending.last ? t('see_more','Voir plus') : t('no_more','Fin'))}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profil */}
            <div className="relative z-50" ref={profileRef}>
              <button
                onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/50 hover:border-blue-500 transition-shadow shadow-sm"
                aria-label={t('layout.a11y.profile')}
              >
                <img
                  src={avatarSrc}
                  alt="User"
                  className="w-full h-full object-cover"
                  onError={onAvatarError}
                />
              </button>

              <div
                className={`absolute right-0 mt-2 bg-white rounded-xl shadow-2xl ring-1 ring-black/5 w-56 overflow-hidden z-[60] animate-dropIn
                  ${profileOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'}`}
              >
                <Link
                  to="/settings"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-gray-800 transition"
                  onClick={() => setProfileOpen(false)}
                >
                  <FaUser className="text-blue-600" />
                  <span>{t('profile','Profil')}</span>
                </Link>
                <button
                  onClick={() => { setProfileOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-gray-800 transition text-left"
                >
                  <FaSignOutAlt className="text-blue-600" />
                  <span>{t('logout','Déconnexion')}</span>
                </button>
              </div>
            </div>

            {/* Langue */}
            <LanguageSelector />
          </div>
        </header>

        <main className="bg-bgDefault p-6 overflow-y-auto relative z-10">
          <Outlet context={{ setTitle }} />
        </main>
      </div>

      {/* Animations pro */}
      <style>{`
        @keyframes fadeSlide {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeSlide { animation: fadeSlide .4s ease-out both; }

        @keyframes dropIn {
          0% { opacity: 0; transform: translateY(-6px) scale(.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-dropIn { animation: dropIn .18s ease-out both; }
      `}</style>
    </div>
  );
};

export default DashboardLayout;
