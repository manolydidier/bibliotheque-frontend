// src/components/navbar/Navbar.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSignInAlt, faUserPlus, faUserCircle, faCog, faSignOutAlt,
  faFileAlt, faVideo, faPodcast, faSitemap, faBullseye, faUsers, faEnvelope,
  faChevronDown, faBell, faCommentDots, faKey, faUserShield, faNewspaper,
} from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../features/auth/authActions';
import LanguageSwitcher from '../langue/LanguageSwitcher';
import ArticleSearchBox from './ArticleSearchBox';

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

const isAbsoluteUrl = (u) => /^https?:\/\//i.test(String(u || ''));
const toFrontPath = (input) => {
  if (!input) return null;
  if (String(input).startsWith('/')) return input;
  try {
    const u = new URL(input);
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return input;
  }
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

const typeIcon = (type) => {
  switch (type) {
    case 'permission_changed': return faKey;
    case 'role_assigned':      return faUserShield;
    case 'article_created':    return faNewspaper;
    case 'comment_approved':   return faCommentDots;
    default:                   return faBell;
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
        try { const u = new URL(a.url); return `${u.pathname}${u.hash || ''}`; } catch {}
      }
      return a.url || a.link || null;
  }
};

const buildPendingLink = (item) => {
  const articleSlug = item.article_slug || item.slug || item.article?.slug || null;
  const commentId = item.comment_id || (item.type && String(item.type).includes('comment') && item.id) || null;
  if (item.url)  return item.url;
  if (item.link) return item.link;
  if (articleSlug) {
    return commentId ? `/articles/${articleSlug}#comment-${commentId}` : `/articles/${articleSlug}`;
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

/* ========================= Logo (Book) ========================= */
const BookLogo = ({ title = 'Library' }) => (
  <div
    className="group relative w-10 h-10 grid place-items-center"
    aria-hidden="true"
  >
    <style>
      {`
        @media (prefers-reduced-motion:no-preference) {
          .book-3d:hover { transform: rotateY(-8deg) rotateX(4deg); }
        }
      `}
    </style>
    <div className="book-3d transition-transform duration-300 will-change-transform">
      <svg width="36" height="36" viewBox="0 0 64 64" className="drop-shadow-[0_4px_12px_rgba(255,255,255,.25)]">
        {/* Cover */}
        <path d="M12 8h34a6 6 0 0 1 6 6v34a6 6 0 0 1-6 6H12z" fill="url(#g1)" />
        {/* Page */}
        <path d="M18 14h26a4 4 0 0 1 4 4v26a4 4 0 0 1-4 4H18z" fill="#fff" />
        {/* Bookmark */}
        <path d="M40 14v18l-4-3-4 3V14z" fill="#2563eb" />
        {/* Lines */}
        <rect x="20" y="20" width="20" height="2" rx="1" fill="#cbd5e1" />
        <rect x="20" y="26" width="18" height="2" rx="1" fill="#cbd5e1" />
        <rect x="20" y="32" width="16" height="2" rx="1" fill="#cbd5e1" />
        <rect x="20" y="38" width="14" height="2" rx="1" fill="#cbd5e1" />
        <defs>
          <linearGradient id="g1" x1="12" y1="8" x2="52" y2="54" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1e3a8a"/>
            <stop offset="1" stopColor="#3b82f6"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
    <span className="sr-only">{title}</span>
  </div>
);

/* ========================= Component ========================= */
const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const API_BASE_STORAGE = import.meta.env.VITE_API_BASE_STORAGE;
  const API_BASE_URL     = import.meta.env.VITE_API_BASE_URL || '';

  const { isAuthenticated, user } = useSelector((s) => s.library?.auth || {});
  const userId = user?.id;

  // Avatar
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

  /* ===== Badges ===== */
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

  /* ===== Notifications ===== */
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState('news');
  const [news, setNews] = useState({ items: [], page: 1, last: 1, loading: false, error: null });
  const [pending, setPending] = useState({ items: [], page: 1, last: 1, loading: false, error: null });

  const toggleNotifications = () => {
    setNotifOpen(prev => {
      const next = !prev;
      if (next) {
        loadNews(1, true);
        loadPending(1, true);
        if (userId) { setLastSeenNow(userId); setNewCount(0); }
      }
      return next;
    });
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
      const resp = await fetchJson(`${API_BASE_URL}/moderation/pending`, { per_page: 10, page }, token);
      const raw = Array.isArray(resp?.data) ? resp.data : [];
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

  const markAllRead = () => { if (userId) { setLastSeenNow(userId); setNewCount(0); } };

  /* ===== Responsive / A11y state ===== */
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const userProfileRef = useRef(null);
  const notifRef = useRef(null);
  const navRef = useRef(null);
  const burgerRef = useRef(null);
  const drawerFirstFocusRef = useRef(null);
  const drawerLastFocusRef = useRef(null);
  const submenuRefs = useRef([]);

  useEffect(() => {
    const handleResize = () => {
      const d = window.innerWidth >= 1024;
      setIsDesktop(d);
      if (d) {
        setIsMenuOpen(false);
      } else {
        setActiveSubmenu(null);
        setIsProfileOpen(false);
        setNotifOpen(false);
      }
    };

    const handleClickOutside = (event) => {
      if (userProfileRef.current && !userProfileRef.current.contains(event.target)) setIsProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
      if (isMenuOpen && navRef.current && !navRef.current.contains(event.target)) {
        if (burgerRef.current && !burgerRef.current.contains(event.target)) {
          setIsMenuOpen(false);
          setActiveSubmenu(null);
        }
      }
      if (isDesktop) {
        const isClickInSubmenu = submenuRefs.current.some(ref => ref && ref.contains(event.target));
        const isClickInNavLink = event.target.closest && event.target.closest('.nav-links li');
        if (!isClickInSubmenu && !isClickInNavLink) setActiveSubmenu(null);
      }
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        setActiveSubmenu(null);
        setIsProfileOpen(false);
        setNotifOpen(false);
      }
      // Focus trap for drawer
      if (!isDesktop && isMenuOpen && e.key === 'Tab') {
        const first = drawerFirstFocusRef.current;
        const last = drawerLastFocusRef.current;
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isMenuOpen, isDesktop]);

  // Swipe-to-close on mobile drawer
  useEffect(() => {
    if (!isMenuOpen) return;
    let startX = null;
    const onTouchStart = (e) => { startX = e.touches?.[0]?.clientX ?? null; };
    const onTouchMove  = (e) => {
      if (startX == null) return;
      const x = e.touches?.[0]?.clientX ?? startX;
      if (x - startX < -48) { setIsMenuOpen(false); startX = null; }
    };
    const el = navRef.current;
    el?.addEventListener('touchstart', onTouchStart, { passive: true });
    el?.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      el?.removeEventListener('touchstart', onTouchStart);
      el?.removeEventListener('touchmove', onTouchMove);
    };
  }, [isMenuOpen]);

  const toggleMenu = () => {
    const next = !isMenuOpen;
    setIsMenuOpen(next);
    if (next) {
      setActiveSubmenu(null);
      setIsProfileOpen(false);
      setNotifOpen(false);
      setTimeout(() => drawerFirstFocusRef.current?.focus(), 0);
    }
  };

  const toggleProfile = () => {
    const next = !isProfileOpen;
    setIsProfileOpen(next);
    if (next) {
      setNotifOpen(false);
      if (!isDesktop) setIsMenuOpen(false);
    }
  };

  const toggleSubmenu = (i) => { if (!isDesktop) setActiveSubmenu(activeSubmenu === i ? null : i); };
  const handleNavLinkClick = () => { if (!isDesktop) { setIsMenuOpen(false); setActiveSubmenu(null); } };
  const handleSubmenuHover = (index, isHovering) => {
    if (!isDesktop) return;
    setActiveSubmenu(isHovering ? index : null);
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser(i18n.language));
      setIsProfileOpen(false);
      setIsMenuOpen(false);
      setNotifOpen(false);
      navigate('/auth');
    } catch (e) { console.error('Logout failed:', e); }
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
    <nav
      className="fixed top-0 left-0 w-full bg-gradient-to-r from-blue-900 via-indigo-700 to-blue-700 shadow-md flex items-center h-20 z-50 border-b border-white/10"
      role="navigation"
      aria-label="Main"
    >
      <div className="w-full px-4 md:px-6 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-lg">
          <BookLogo />
          <span className="text-white text-2xl font-extrabold tracking-tight">
            <span className="text-blue-200">UI</span> <span className="hidden sm:inline">Library</span>
          </span>
        </Link>

        {/* Desktop nav */}
        {isDesktop && (
          <div className="flex-1 flex justify-center">
            <ul className="nav-links flex gap-6 font-medium mx-auto" role="menubar" aria-label="Primary">
              {navLinks.map((link, i) => (
                <li
                  key={i}
                  className={`relative ${link.submenu ? 'has-submenu' : ''}`}
                  onMouseEnter={() => link.submenu && handleSubmenuHover(i, true)}
                  onMouseLeave={() => link.submenu && handleSubmenuHover(i, false)}
                >
                  <Link
                    to={link.path}
                    className="flex items-center py-3 px-2 text-white/90 hover:text-white transition-colors whitespace-nowrap rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    role="menuitem"
                    onFocus={() => link.submenu && setActiveSubmenu(i)}
                    onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setActiveSubmenu(null); }}
                  >
                    {link.name}
                    {link.submenu && <FontAwesomeIcon icon={faChevronDown} className="ml-2 text-xs opacity-80" />}
                  </Link>

                  {link.submenu && (
                    <div
                      ref={el => submenuRefs.current[i] = el}
                      className={`submenu absolute top-full left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl w-64 py-2 transition-all duration-200 border border-gray-100 ${
                        activeSubmenu === i ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-1 pointer-events-none'
                      }`}
                      role="menu"
                      aria-label={`${link.name} submenu`}
                    >
                      {link.submenu.map((sub, j) => (
                        <div key={j}>
                          <Link
                            to={sub.path}
                            className="flex items-center px-5 py-3 text-gray-800 hover:text-blue-600 hover:bg-blue-50 transition-all focus:outline-none focus-visible:bg-blue-50"
                            onClick={() => setActiveSubmenu(null)}
                            role="menuitem"
                          >
                            <FontAwesomeIcon icon={sub.icon} className="mr-3 text-blue-600 w-4" />
                            <span className="flex-1">{sub.name}</span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Right section */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
          {/* Search */}
          <div className="relative hidden sm:block">
            <ArticleSearchBox placeholder={t('search')} perPage={8} />
          </div>

          {/* Lang */}
          <LanguageSwitcher />

          {/* Chip nom user */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center">
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">
                {t('hello','Bonjour')}{' '}{user?.username || '—'}
              </span>
            </div>
          )}

          {/* Notifications */}
          {isAuthenticated && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={toggleNotifications}
                className="relative text-white hover:text-blue-100 transition-colors p-2 rounded-full hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                aria-haspopup="dialog"
                aria-expanded={notifOpen}
                aria-label={t('notifications','Notifications')}
              >
                <FontAwesomeIcon icon={faBell} />
                {(newCount > 0 || pendingCount > 0) && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-semibold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                    {(newCount + pendingCount) > 99 ? '99+' : (newCount + pendingCount)}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  className="absolute right-0 mt-2 w-[26rem] max-w-[92vw] bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden z-50"
                  role="dialog"
                  aria-label={t('notifications','Notifications')}
                >
                  {/* Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{t('notifications','Notifications')}</span>
                      {newCount > 0 && <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{newCount}</span>}
                      {pendingCount > 0 && <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{pendingCount} {t('to_moderate','à modérer')}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={()=>{ setNotifOpen(false); navigate('/settings'); }}
                        className="text-xs underline decoration-white/50 underline-offset-2 hover:decoration-white"
                      >
                        {t('see_all','Tout voir')}
                      </button>
                      <button
                        onClick={markAllRead}
                        className="text-xs bg-white/10 hover:bg-white/20 transition rounded-full px-2 py-0.5"
                      >
                        {t('mark_all_read','Tout marquer lu')}
                      </button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="px-4 pt-3 flex gap-2">
                    <button
                      className={`px-3 py-1.5 rounded-full text-sm ${notifTab==='news' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      onClick={()=>setNotifTab('news')}
                    >
                      {t('activities','Activités')}
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded-full text-sm ${notifTab==='pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      onClick={()=>setNotifTab('pending')}
                    >
                      {t('to_moderate','À modérer')}
                    </button>
                  </div>

                  {/* List */}
                  <div className="max-h-96 overflow-auto">
                    {notifTab==='news' ? (
                      <>
                        {news.items.length === 0 && !news.loading && (
                          <div className="p-6 text-sm text-gray-500 flex items-center justify-center gap-2">
                            <span>🥳</span> <span>{t('no_activity','Aucune activité pour le moment')}</span>
                          </div>
                        )}
                        {news.items.map((a)=> {
                          const href = toFrontPath(buildActivityLink(a) || a.url || a.link) || '/settings';
                          const isRel = String(href).startsWith('/');
                          const Row = (
                            <div className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex-shrink-0 w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center">
                                <FontAwesomeIcon icon={typeIcon(a.type)} className="text-blue-600" />
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
                        {pending.items.length === 0 && !pending.loading && (
                          <div className="p-6 text-sm text-gray-500 flex items-center justify-center gap-2">
                            <span>🧹</span> <span>{t('nothing_to_moderate','Rien à modérer')}</span>
                          </div>
                        )}
                        {pending.items.map((p)=> {
                          const hrefCandidate = buildPendingLink(p);
                          const href = toFrontPath(hrefCandidate) || '/settings';
                          const isRel = String(href).startsWith('/');
                          const Row = (
                            <div className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex-shrink-0 w-9 h-9 bg-amber-50 rounded-full flex items-center justify-center">
                                <FontAwesomeIcon icon={faCommentDots} className="text-amber-600" />
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

          {/* Auth (non connecté) */}
          {!isAuthenticated && (
            <div className="hidden sm:flex gap-2">
              <Link
                to="/auth"
                className="border border-white/30 rounded-lg px-3 py-2 text-white hover:bg-white/10 hover:border-white/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <FontAwesomeIcon icon={faSignInAlt} />
              </Link>
              <Link
                to="/auth"
                className="bg-blue-500 text-white rounded-lg px-3 py-2 hover:bg-blue-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <FontAwesomeIcon icon={faUserPlus} />
              </Link>
            </div>
          )}

          {/* Profile (connecté) */}
          {isAuthenticated && (
            <div className="relative" ref={userProfileRef}>
              <button
                onClick={toggleProfile}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-full"
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
              >
                <img
                  src={avatarSrc}
                  alt={t('profile','Profil')}
                  className="w-10 h-10 rounded-full border-2 border-white/40 hover:border-white object-cover transition-colors"
                  onError={handleImgError}
                />
              </button>
              <div
                className={`absolute top-full right-0 bg-white rounded-2xl shadow-2xl w-72 overflow-hidden border border-gray-100 transition-all duration-200 ${
                  isProfileOpen ? 'opacity-100 visible translate-y-2' : 'opacity-0 invisible translate-y-1 pointer-events-none'
                }`}
                role="menu"
                aria-label="Profile menu"
              >
                <div className="px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white">
                  <div className="flex items-center gap-3">
                    <img src={avatarSrc} alt="avatar" className="w-9 h-9 rounded-full ring-2 ring-white/30 object-cover" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{user?.name || t('profile','Profil')}</div>
                      <div className="text-xs text-white/80 truncate">{user?.email || '—'}</div>
                    </div>
                  </div>
                </div>

                <Link
                  to="/settings"
                  className="flex items-center px-6 py-3 text-gray-800 hover:text-blue-600 hover:bg-blue-50 transition-all focus:outline-none focus-visible:bg-blue-50"
                  onClick={() => setIsProfileOpen(false)}
                  role="menuitem"
                >
                  <FontAwesomeIcon icon={faUserCircle} className="mr-3 text-blue-600 w-4" />
                  <span className="flex-1">{t('profile')}</span>
                </Link>
                <Link
                  to="/articlescontroler"
                  className="flex items-center px-6 py-3 text-gray-800 hover:text-blue-600 hover:bg-blue-50 transition-all focus:outline-none focus-visible:bg-blue-50"
                  onClick={() => setIsProfileOpen(false)}
                  role="menuitem"
                >
                  <FontAwesomeIcon icon={faCog} className="mr-3 text-blue-600 w-4" />
                  <span className="flex-1">{t('settings')}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-6 py-3 text-gray-800 hover:text-blue-600 hover:bg-blue-50 transition-all text-left focus:outline-none focus-visible:bg-blue-50"
                  role="menuitem"
                >
                  <FontAwesomeIcon icon={faSignOutAlt} className="mr-3 text-blue-600 w-4" />
                  <span className="flex-1">{t('logout')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Burger (mobile) */}
          {!isDesktop && (
            <button
              ref={burgerRef}
              className="flex flex-col justify-between w-8 h-6 relative z-50 ml-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-md"
              onClick={toggleMenu}
              aria-label={isMenuOpen ? t('close','Fermer') : t('open','Ouvrir')}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-drawer"
            >
              <span className={`h-0.5 rounded transition-all ${isMenuOpen ? 'rotate-45 translate-y-2 bg-white' : 'bg-white'}`} />
              <span className={`h-0.5 rounded transition-all ${isMenuOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100 bg-white'}`} />
              <span className={`h-0.5 rounded transition-all ${isMenuOpen ? '-rotate-45 -translate-y-2 bg-white' : 'bg-white'}`} />
            </button>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {!isDesktop && (
        <>
          <div
            id="mobile-drawer"
            ref={navRef}
            className={`fixed top-0 left-0 w-[82vw] max-w-[360px] h-screen bg-white flex flex-col items-start p-6 pt-20 gap-0 shadow-2xl transform transition-transform duration-300 z-40 ${
              isMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            role="dialog"
            aria-label="Mobile menu"
          >
            {/* Focus trap sentinels */}
            <button ref={drawerFirstFocusRef} className="sr-only" aria-hidden />
            <div className="w-full">
              {/* Inline search for mobile */}
              <div className="mb-4">
                <ArticleSearchBox placeholder={t('search')} perPage={6} />
              </div>
              <ul className="w-full">
                {navLinks.map((link, i) => (
                  <li key={i} className="w-full border-b border-gray-100 last:border-b-0">
                    {link.submenu ? (
                      <>
                        <button
                          className={`w-full flex items-center justify-between py-4 text-gray-800 ${activeSubmenu === i ? 'bg-blue-50' : ''}`}
                          onClick={() => toggleSubmenu(i)}
                          aria-expanded={activeSubmenu === i}
                          aria-controls={`submenu-${i}`}
                        >
                          <span className="font-medium">{link.name}</span>
                          <FontAwesomeIcon
                            icon={faChevronDown}
                            className={`ml-2 transition-transform duration-200 ${activeSubmenu === i ? 'rotate-180' : ''}`}
                          />
                        </button>
                        <div
                          id={`submenu-${i}`}
                          className={`overflow-hidden transition-all duration-300 bg-blue-50 bg-opacity-30 rounded-lg mx-2 ${
                            activeSubmenu === i ? 'max-h-96 py-2' : 'max-h-0'
                          }`}
                        >
                          {link.submenu.map((sub,j) => (
                            <div key={j}>
                              <Link
                                to={sub.path}
                                className="flex items-center px-6 py-3 text-gray-800 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                onClick={handleNavLinkClick}
                              >
                                <FontAwesomeIcon icon={sub.icon} className="mr-3 text-blue-600 w-4" />
                                <span className="flex-1">{sub.name}</span>
                              </Link>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <Link
                        to={link.path}
                        className="flex items-center py-4 text-gray-800 font-medium hover:text-blue-600 transition-colors"
                        onClick={handleNavLinkClick}
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Auth quick actions */}
            {!isAuthenticated && (
              <div className="mt-auto flex gap-2 w-full">
                <Link
                  to="/auth"
                  onClick={handleNavLinkClick}
                  className="flex-1 border border-blue-200 text-blue-700 rounded-lg px-3 py-2 text-center"
                >
                  <FontAwesomeIcon icon={faSignInAlt} className="mr-2" />
                  {t('login','Connexion')}
                </Link>
                <Link
                  to="/auth"
                  onClick={handleNavLinkClick}
                  className="flex-1 bg-blue-600 text-white rounded-lg px-3 py-2 text-center"
                >
                  <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                  {t('register','Inscription')}
                </Link>
              </div>
            )}

            {/* Trap sentinel */}
            <button ref={drawerLastFocusRef} className="sr-only" aria-hidden />
          </div>

          {/* Overlay */}
          <button
            className={`fixed inset-0 bg-black/50 backdrop-blur-[1px] transition-opacity z-30 ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
            onClick={toggleMenu}
            aria-label={t('close','Fermer')}
          />
        </>
      )}
    </nav>
  );
};

export default Navbar;
