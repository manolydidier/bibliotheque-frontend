import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch, faSignInAlt, faUserPlus, faUserCircle, faCog, faSignOutAlt,
  faFileAlt, faVideo, faPodcast, faSitemap, faBullseye, faUsers, faEnvelope,
  faChevronDown, faBell, faArrowRotateRight, faCheckDouble, faCommentDots,
  faKey, faUserShield, faNewspaper
} from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../features/auth/authActions';
import LanguageSwitcher from '../langue/LanguageSwitcher';

/* ========================= Utils ========================= */
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

// URLs
const isAbsoluteUrl = (u) => /^https?:\/\//i.test(String(u || ''));
const toFrontPath = (input) => {
  if (!input) return null;
  // si c'est déjà un chemin relatif
  if (String(input).startsWith('/')) return input;
  // si le back a renvoyé une URL absolue → garder seulement pathname+hash
  try {
    const u = new URL(input);
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    // on garde tel quel si on ne peut pas parser (rare)
    return input;
  }
};

// “dernière consultation” pour compter les non-lus
const LS_KEY = (uid) => `act_seen_ts:${uid}`;
const getLastSeenTs = (uid) => { try { return localStorage.getItem(LS_KEY(uid)); } catch { return null; } };
const setLastSeenNow = (uid) => { try { localStorage.setItem(LS_KEY(uid), new Date().toISOString()); } catch {} };

// Fetch JSON helper
const fetchJson = async (url, params = {}, token) => {
  const q = new URLSearchParams(params);
  const res = await fetch(`${url}?${q.toString()}`, {
    headers: { 'Accept': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// Icône selon type d’activité
const typeIcon = (type) => {
  switch (type) {
    case 'permission_changed': return faKey;
    case 'role_assigned':      return faUserShield;
    case 'article_created':    return faNewspaper;
    case 'comment_approved':   return faCommentDots;
    default:                   return faBell;
  }
};

// Lien intelligent (Activités)
const buildActivityLink = (a) => {
  const articleSlug = a.article_slug || a.slug;

  switch (a.type) {
    case 'article_created':
      // 👉 toujours chemin relatif pour le router Vite
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
      // Dernier recours: si back a renvoyé une URL absolue → on la réécrit en chemin relatif
      if (a.url && isAbsoluteUrl(a.url)) {
        try {
          const u = new URL(a.url);
          return `${u.pathname}${u.hash || ''}`;
        } catch { /* noop */ }
      }
      return a.url || a.link || null;
  }
};

// Lien intelligent (À modérer)
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

  // priorité à url/link si fournis par le back
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
  if (diff < 60) return t('just_now','à l’instant');
  if (diff < 3600) return t('x_min_ago','il y a {{x}} min', { x: Math.floor(diff/60) });
  if (diff < 86400) return t('x_h_ago','il y a {{x}} h', { x: Math.floor(diff/3600) });
  return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
};

/* ========================= Component ========================= */
const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const API_BASE_STORAGE = import.meta.env.VITE_API_BASE_STORAGE;
  const API_BASE_URL     = import.meta.env.VITE_API_BASE_URL || '';

  // Auth
  const { isAuthenticated, user } = useSelector((s) => s.library?.auth || {});
  const userId = user?.id;

  // Avatar dynamique
  const triedAuthFetchRef = useRef(false);
  const objectUrlRef = useRef(null);
  const computedAvatarSrc = useMemo(() => {
    const raw = user?.avatar_url || user?.avatar || '';
    const updatedAt = user?.updated_at || user?.avatar_updated_at || null;
    return buildAvatarUrl(raw, updatedAt, API_BASE_STORAGE);
  }, [user?.avatar_url, user?.avatar, user?.updated_at, user?.avatar_updated_at, API_BASE_STORAGE]);
  const [avatarSrc, setAvatarSrc] = useState(computedAvatarSrc);

  useEffect(() => {
    triedAuthFetchRef.current = false;
    if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
    setAvatarSrc(computedAvatarSrc);
  }, [computedAvatarSrc]);

  const handleImgError = useCallback(async () => {
    if (triedAuthFetchRef.current) { setAvatarSrc('https://randomuser.me/api/portraits/women/44.jpg'); return; }
    triedAuthFetchRef.current = true;
    try {
      const token = getTokenGuard();
      const raw = user?.avatar_url || user?.avatar || '';
      if (!token || !raw) throw new Error('no token or url');
      const abs = /^https?:\/\//i.test(raw) ? raw : `${String(API_BASE_STORAGE || '').replace(/\/+$/, '')}/storage/${String(raw).replace(/^\/+/, '')}`;
      const res = await fetch(abs, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('fetch failed');
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      objectUrlRef.current = objUrl;
      setAvatarSrc(objUrl);
    } catch { setAvatarSrc('https://randomuser.me/api/portraits/women/44.jpg'); }
  }, [API_BASE_STORAGE, user?.avatar_url, user?.avatar]);

  useEffect(() => () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); }, []);

  /* ===== Compteurs badges ===== */
  const [newCount, setNewCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

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

  /* ===== Panneau notifications façon FB ===== */
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState('news'); // 'news' | 'pending'

  // listes
  const [news, setNews] = useState({ items: [], page: 1, last: 1, loading: false, error: null });
  const [pending, setPending] = useState({ items: [], page: 1, last: 1, loading: false, error: null });

  const openNotifications = async () => {
    setNotifOpen((v) => !v);
    if (!notifOpen) {
      // première ouverture → charger les deux onglets (page 1)
      loadNews(1, true);
      loadPending(1, true);
      // marquer comme lu côté client
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
        items: replace ? items : [...news.items, ...items],
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
      // Endpoint listant les éléments à modérer
      const resp = await fetchJson(`${API_BASE_URL}/moderation/pending`, { per_page: 10, page }, token);
      const raw = Array.isArray(resp?.data) ? resp.data : [];
      // on ne force pas ici; on construira l'URL fiable au rendu avec buildPendingLink + toFrontPath
      const items = raw.map(x => ({ ...x }));
      setPending({
        items: replace ? items : [...pending.items, ...items],
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

  // UI générale
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 1024);

  const searchRef = useRef(null);
  const userProfileRef = useRef(null);
  const notifRef = useRef(null);
  const navRef = useRef(null);
  const burgerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const isNowDesktop = window.innerWidth > 1024;
      setIsDesktop(isNowDesktop);
      if (isNowDesktop) {
        setIsMenuOpen(false); setActiveSubmenu(null); setIsProfileOpen(false);
      }
    };
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setIsSearchOpen(false);
      if (userProfileRef.current && !userProfileRef.current.contains(event.target)) setIsProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
      if (isMenuOpen && navRef.current && !navRef.current.contains(event.target)) {
        if (burgerRef.current && !burgerRef.current.contains(event.target)) setIsMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);
    return () => { window.removeEventListener('resize', handleResize); document.removeEventListener('mousedown', handleClickOutside); };
  }, [isMenuOpen]);

  const toggleMenu = () => { setIsMenuOpen(!isMenuOpen); if (!isMenuOpen) { setActiveSubmenu(null); setIsProfileOpen(false); } };
  const toggleProfile = () => setIsProfileOpen((v) => !v);
  const toggleSearch = () => { setIsSearchOpen((v) => !v); if (!isSearchOpen && searchRef.current) searchRef.current.focus(); };
  const toggleSubmenu = (i) => { if (!isDesktop) setActiveSubmenu(activeSubmenu === i ? null : i); };
  const handleNavLinkClick = () => { if (!isDesktop) setIsMenuOpen(false); };

  // Déconnexion
  const handleLogout = async () => {
    try { await dispatch(logoutUser(i18n.language)); setIsProfileOpen(false); setIsMenuOpen(false); navigate('/auth'); }
    catch (e) { console.error('Logout failed:', e); }
  };

  /* ========================= Rendu ========================= */
  const navLinks = [
    { name: t('home'), path: '/', submenu: null },
    { name: t('platform'), path: '/articles', submenu: [
      { icon: faFileAlt, name: t('sumary'), path: '/platform/summary' },
      { icon: faVideo, name: t('video'), path: '/platform/video' },
      { icon: faPodcast, name: t('audio'), path: '/platform/audio' }
    ]},
    { name: t('genre'), path: '/genre', submenu: [
      { icon: faFileAlt, name: t('playdoier'), path: '/genre/playdoier' },
      { icon: faVideo, name: t('fundraising'), path: '/genre/fundraising' },
      { icon: faPodcast, name: t('technical'), path: '/genre/technical' }
    ]},
    { name: t('about'), path: '/about', submenu: [
      { icon: faSitemap, name: t('structure'), path: '/about/structure' },
      { icon: faBullseye, name: t('goals'), path: '/about/goals' },
      { icon: faUsers, name: t('members'), path: '/about/members' },
      { icon: faEnvelope, name: t('contact'), path: '/about/contact' }
    ]}
  ];

  return (
    <nav className="fixed top-0 left-0 w-full bg-gradient-to-r from-blue-900 to-blue-700 shadow-md flex justify-between items-center px-6 h-20 z-50">
      {/* Logo */}
      <Link to="/" className="logo flex items-center gap-3">
        <div className="logo-icon w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg transition-all duration-500 hover:rotate-y-180">B</div>
        <span className="logo-text text-white text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">BlueUI</span>
      </Link>

      {/* Desktop nav */}
      {isDesktop && (
        <ul className="nav-links flex gap-8 font-medium">
          {navLinks.map((link, i) => (
            <li key={i} className={`${link.submenu ? 'has-submenu relative' : ''}`}
                onMouseEnter={() => link.submenu && setActiveSubmenu(i)}
                onMouseLeave={() => link.submenu && setActiveSubmenu(null)}>
              <Link to={link.path} className="flex items-center py-3 text-white hover:text-white">{link.name}</Link>
              {link.submenu && (
                <ul className={`submenu absolute top-full left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl w-60 py-2 transition-all ${
                  activeSubmenu === i ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2'
                }`}>
                  {link.submenu.map((sub, j) => (
                    <li key={j}>
                      <Link to={sub.path} className="flex items-center px-6 py-3 text-gray-800 hover:text-blue-500 hover:bg-blue-50 transition-all">
                        <FontAwesomeIcon icon={sub.icon} className="mr-3 text-blue-600" />{sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Mobile drawer */}
      {!isDesktop && (
        <>
          <ul ref={navRef}
              className={`fixed top-0 left-0 w-80 h-screen bg-white flex-col items-start p-24 gap-0 shadow-lg transform transition-all duration-300 z-40 ${
                isMenuOpen ? 'translate-x-0' : '-translate-x-full'
              }`}>
            {navLinks.map((link, i) => (
              <li key={i} className={`${link.submenu ? 'has-submenu relative' : ''} w-full border-b border-gray-100`}>
                {link.submenu ? (
                  <>
                    <Link to={link.path} className={`flex items-center py-3 text-gray-800 ${!isDesktop && link.submenu ? 'justify-between' : ''}`}
                          onClick={(e)=>{e.preventDefault(); toggleSubmenu(i);}}>
                      {link.name}
                      <FontAwesomeIcon icon={faChevronDown} className={`ml-2 transition-transform ${activeSubmenu === i ? 'rotate-180' : ''}`} />
                    </Link>
                    <ul className={`w-full overflow-hidden transition-all duration-300 bg-blue-50 bg-opacity-30 rounded-lg m-2 ${
                      activeSubmenu === i ? 'max-h-96 py-2' : 'max-h-0'
                    }`}>
                      {link.submenu.map((sub,j)=>(
                        <li key={j}>
                          <Link to={sub.path} className="flex items-center px-6 py-3 text-gray-800 hover:text-blue-500 hover:bg-blue-50 transition-all" onClick={handleNavLinkClick}>
                            <FontAwesomeIcon icon={sub.icon} className="mr-3 text-blue-600" />{sub.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <Link to={link.path} className="flex items-center py-3 text-gray-800" onClick={handleNavLinkClick}>{link.name}</Link>
                )}
              </li>
            ))}
          </ul>
          <div className={`fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 backdrop-blur-sm transition-all z-30 ${
              isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`} onClick={toggleMenu}/>
        </>
      )}

      {/* Right section */}
      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="relative mt-2">
          <button className="text-white text-lg hover:text-blue-200" onClick={toggleSearch}><FontAwesomeIcon icon={faSearch} /></button>
          <input type="text" ref={searchRef}
            className={`fixed top-24 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-md px-5 py-4 rounded-lg border-none shadow-lg transition-all ${
              isSearchOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2'
            }`} placeholder={t('search')} />
        </div>

        {/* Lang */}
        <LanguageSwitcher />

        {/* Notifs bell */}
        {isAuthenticated && (
          <div className="relative" ref={notifRef}>
            <button onClick={openNotifications}
              className="relative text-white hover:text-blue-200">
              <FontAwesomeIcon icon={faBell} />
              {(newCount > 0 || pendingCount > 0) && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[11px] font-semibold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                  {(newCount + pendingCount) > 99 ? '99+' : (newCount + pendingCount)}
                </span>
              )}
            </button>

            {/* Panel type “FB” */}
            {notifOpen && (
              <div className="absolute right-0 mt-3 w-96 bg-white rounded-xl shadow-2xl ring-1 ring-black/5 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between border-b">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{t('notifications','Notifications')}</span>
                    {newCount > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{newCount}</span>}
                    {pendingCount > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{pendingCount} {t('to_moderate','à modérer')}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>{ setNotifOpen(false); navigate('/settings'); }}
                            className="text-xs text-blue-600 hover:underline">
                      {t('see_all','Tout voir')}
                    </button>
                    <button onClick={markAllRead}
                            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                      <FontAwesomeIcon icon={faCheckDouble} /> {t('mark_all_read','Tout marquer lu')}
                    </button>
                    <button onClick={()=>{ loadNews(1,true); loadPending(1,true); }}
                            className="text-xs text-gray-500 hover:text-gray-700">
                      <FontAwesomeIcon icon={faArrowRotateRight} />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
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

                {/* Lists */}
                <div className="max-h-96 overflow-auto">
                  {notifTab==='news' ? (
                    <>
                      {news.items.length === 0 && !news.loading && <div className="p-4 text-sm text-gray-500">{t('no_activity','Aucune activité')}</div>}
                      {news.items.map((a)=> {
                        // 👉 lien front robuste
                        const href = toFrontPath(buildActivityLink(a) || a.url || a.link) || '/settings';
                        const isRel = String(href).startsWith('/');
                        return isRel ? (
                          <Link key={a.id} to={href} onClick={()=> setNotifOpen(false)}
                                className="flex items-start gap-3 p-4 hover:bg-gray-50 transition">
                            <div className="flex-shrink-0 w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center">
                              <FontAwesomeIcon icon={typeIcon(a.type)} className="text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm text-gray-900 line-clamp-2">{a.title || t('notification','Notification')}</div>
                              {a.subtitle && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.subtitle}</div>}
                              <div className="text-xs text-gray-400 mt-1">{timeAgo(a.created_at, t)}</div>
                            </div>
                          </Link>
                        ) : (
                          <a key={a.id} href={href} onClick={()=> setNotifOpen(false)}
                             className="flex items-start gap-3 p-4 hover:bg-gray-50 transition">
                            <div className="flex-shrink-0 w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center">
                              <FontAwesomeIcon icon={typeIcon(a.type)} className="text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm text-gray-900 line-clamp-2">{a.title || t('notification','Notification')}</div>
                              {a.subtitle && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.subtitle}</div>}
                              <div className="text-xs text-gray-400 mt-1">{timeAgo(a.created_at, t)}</div>
                            </div>
                          </a>
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
                        return isRel ? (
                          <Link key={p.id} to={href} onClick={()=> setNotifOpen(false)}
                                className="flex items-start gap-3 p-4 hover:bg-gray-50 transition">
                            <div className="flex-shrink-0 w-9 h-9 bg-amber-50 rounded-full flex items-center justify-center">
                              <FontAwesomeIcon icon={faCommentDots} className="text-amber-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm text-gray-900 line-clamp-2">{p.title || t('pending_item','Élément à modérer')}</div>
                              {p.subtitle && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.subtitle}</div>}
                              <div className="text-xs text-gray-400 mt-1">{timeAgo(p.created_at, t)}</div>
                            </div>
                          </Link>
                        ) : (
                          <a key={p.id} href={href} onClick={()=> setNotifOpen(false)}
                             className="flex items-start gap-3 p-4 hover:bg-gray-50 transition">
                            <div className="flex-shrink-0 w-9 h-9 bg-amber-50 rounded-full flex items-center justify-center">
                              <FontAwesomeIcon icon={faCommentDots} className="text-amber-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm text-gray-900 line-clamp-2">{p.title || t('pending_item','Élément à modérer')}</div>
                              {p.subtitle && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.subtitle}</div>}
                              <div className="text-xs text-gray-400 mt-1">{timeAgo(p.created_at, t)}</div>
                            </div>
                          </a>
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

        {/* Auth (non connecté) */}
        {!isAuthenticated && (
          <div className="flex gap-3">
            <Link to="/auth" className="border border-white/30 rounded-md px-2 py-1 text-white hover:bg-white/10 hover:border-white/50">
              <FontAwesomeIcon icon={faSignInAlt} />
            </Link>
            <Link to="/auth" className="bg-blue-500 text-white rounded-md px-2 py-1 hover:bg-blue-600">
              <FontAwesomeIcon icon={faUserPlus} />
            </Link>
          </div>
        )}

        {/* Profile (connecté) */}
        {isAuthenticated && (
          <div className="relative" ref={userProfileRef}>
            <img
              src={avatarSrc}
              alt="User"
              className="w-10 h-10 rounded-full border-2 border-white/30 hover:border-blue-500 cursor-pointer object-cover"
              onClick={toggleProfile}
              onError={handleImgError}
            />
            <div className={`absolute top-full right-0 bg-white rounded-lg shadow-lg w-56 py-2 transition-all ${
              isProfileOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2'
            }`}>
              <Link to="/settings" className="flex items-center px-6 py-3 text-gray-800 hover:text-blue-500 hover:bg-blue-50" onClick={toggleProfile}>
                <FontAwesomeIcon icon={faUserCircle} className="mr-3 text-blue-600" /> {t('profile')}
              </Link>
              <Link to="/articlescontroler" className="flex items-center px-6 py-3 text-gray-800 hover:text-blue-500 hover:bg-blue-50" onClick={toggleProfile}>
                <FontAwesomeIcon icon={faCog} className="mr-3 text-blue-600" /> {t('settings')}
              </Link>
              <button onClick={handleLogout} className="w-full flex items-center px-6 py-3 text-gray-800 hover:text-blue-500 hover:bg-blue-50 text-left">
                <FontAwesomeIcon icon={faSignOutAlt} className="mr-3 text-blue-600" /> {t('logout')}
              </button>
            </div>
          </div>
        )}

        {/* Burger */}
        {!isDesktop && (
          <div ref={burgerRef} className="flex flex-col justify-between w-7 h-5 cursor-pointer relative z-50" onClick={toggleMenu}>
            <div className={`h-1 bg-white rounded transition-all ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <div className={`h-1 bg-white rounded transition-all ${isMenuOpen ? 'opacity-0 scale-x-0' : ''}`} />
            <div className={`h-1 bg-white rounded transition-all ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
