// src/components/navbar/Navbar.jsx
import React, {
  useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect
} from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRightToBracket, faSignInAlt,
  faUserPlus, faUserCircle, faCog,
  faBell, faCommentDots, faKey, faUserShield, faNewspaper,
  faFileAlt, faVideo, faPodcast, faSitemap, faBullseye, faUsers, faEnvelope, faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../features/auth/authActions';
import LanguageSwitcher from '../langue/LanguageSwitcher';
import ArticleSearchBox from './ArticleSearchBox';

/* ========================= Utils ========================= */
const getTokenGuard = () => {
  try {
    return (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tokenGuard'))
      || (typeof localStorage !== 'undefined' && localStorage.getItem('tokenGuard'))
      || null;
  } catch { return null; }
};

const buildAvatarUrl = (rawUrl, updatedAt, baseStorage) => {
  const placeholder = 'https://randomuser.me/api/portraits/women/44.jpg';
  if (!rawUrl) return placeholder;
  const url = String(rawUrl).trim();
  const isAbs = /^https?:\/\//i.test(url);
  const base = (baseStorage || '').replace(/\/+$/, '');
  const abs = isAbs ? url : `${base}/storage/${url.replace(/^\/+/, '')}`;
  const qs = [];
  if (updatedAt) qs.push(`t=${encodeURIComponent(updatedAt)}`);
  qs.push(`cb=${Date.now()}`);
  return `${abs}${abs.includes('?') ? '&' : '?'}${qs.join('&')}`;
};

const isAbsoluteUrl = (u) => /^https?:\/\//i.test(String(u || ''));
const toFrontPath = (input) => {
  if (!input) return null;
  if (String(input).startsWith('/')) return input;
  try { const u = new URL(input); return `${u.pathname}${u.search}${u.hash}`; }
  catch { return input; }
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
      return commentId ? `/articles/${articleSlug}#comment-${commentId}` : `/articles/${articleSlug}`;
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
  if (articleSlug) return commentId ? `/articles/${articleSlug}#comment-${commentId}` : `/articles/${articleSlug}`;
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

/* =============== Portal + ScrollLock + FocusTrap =============== */
function Portal({ children, containerId = 'overlays-root' }) {
  const [host, setHost] = useState(null);

  useLayoutEffect(() => {
    let root = document.getElementById(containerId);
    let createdRoot = false;
    if (!root) {
      root = document.createElement('div');
      root.id = containerId;
      root.style.position = 'relative';
      document.body.appendChild(root);
      createdRoot = true;
    }
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.inset = '0';
    // important: ensure stacking context above app
    el.style.zIndex = '999'; // container; children will set higher
    root.appendChild(el);
    setHost(el);
    return () => {
      root.removeChild(el);
      if (createdRoot && root.childElementCount === 0) root.remove();
    };
  }, [containerId]);

  return host ? createPortal(children, host) : null;
}

function useScrollLock(active) {
  useLayoutEffect(() => {
    if (!active) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [active]);
}

function FocusTrap({ active, children, initialFocusRef }) {
  const wrapRef = useRef(null);
  useEffect(() => {
    if (!active) return;
    const root = wrapRef.current;
    if (!root) return;

    // focus initial
    const target = initialFocusRef?.current
      || root.querySelector('[data-autofocus]')
      || root.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      || root;
    target && target.focus?.();

    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const nodes = Array.from(root.querySelectorAll(
        'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      )).filter(n => !n.hasAttribute('disabled') && !n.getAttribute('aria-hidden'));
      if (!nodes.length) { e.preventDefault(); return; }
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    root.addEventListener('keydown', onKey);
    return () => root.removeEventListener('keydown', onKey);
  }, [active, initialFocusRef]);

  return <div ref={wrapRef}>{children}</div>;
}

/* ========================= UI bits ========================= */
const BookLogo = ({ title = 'Library' }) => (
  <div className="group relative w-10 h-10 grid place-items-center" aria-hidden="true">
    <style>{`@media (prefers-reduced-motion:no-preference){.book-3d:hover{transform:rotateY(-8deg) rotateX(4deg);}}`}</style>
    <div className="book-3d transition-transform duration-300 will-change-transform">
      <svg width="36" height="36" viewBox="0 0 64 64" className="drop-shadow-[0_4px_12px_rgba(255,255,255,.25)]">
        <path d="M12 8h34a6 6 0 0 1 6 6v34a6 6 0 0 1-6 6H12z" fill="url(#g1)" />
        <path d="M18 14h26a4 4 0 0 1 4 4v26a4 4 0 0 1-4 4H18z" fill="#fff" />
        <path d="M40 14v18l-4-3-4 3V14z" fill="#2563eb" />
        <rect x="20" y="20" width="20" height="2" rx="1" fill="#cbd5e1" />
        <rect x="20" y="26" width="18" height="2" rx="1" fill="#cbd5e1" />
        <rect x="20" y="32" width="16" height="2" rx="1" fill="#cbd5e1" />
        <rect x="20" y="38" width="14" height="2" rx="1" fill="#cbd5e1" />
        <defs>
          <linearGradient id="g1" x1="12" y1="8" x2="52" y2="54" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1e3a8a"/><stop offset="1" stopColor="#3b82f6"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
    <span className="sr-only">{title}</span>
  </div>
);

const SkeletonRow = () => (
  <div className="flex items-start gap-3 p-4 animate-pulse">
    <div className="w-9 h-9 rounded-full bg-gray-200" />
    <div className="flex-1">
      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
);

/* ========================= Main ========================= */
const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const onAuth = location.pathname.startsWith('/auth');

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

  /* Badges */
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
    if (!isAuthenticated || !userId) return;
    const token = getTokenGuard();
    let es;
    try {
      es = new EventSource(`${API_BASE_URL}/users/${userId}/activities/stream?token=${encodeURIComponent(token || '')}`);
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === 'activity_count') setNewCount(Math.min(99, Number(data.count || 0)));
          if (data.type === 'pending_count')  setPendingCount(Math.min(99, Number(data.count || 0)));
        } catch {}
      };
      es.onerror = () => { es.close(); };
    } catch {}
    return () => es?.close();
  }, [API_BASE_URL, isAuthenticated, userId]);

  useEffect(() => {
    const tick = () => { recomputeNewCount(); recomputePendingCount(); };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [recomputeNewCount, recomputePendingCount]);

  /* Responsive + overlays state */
  const MOBILE_Q = '(max-width: 990px)'; // seuil mobile demandé
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia(MOBILE_Q).matches
  );
  useEffect(() => {
    if (!window?.matchMedia) return;
    const mq = window.matchMedia(MOBILE_Q);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener(handler);
    return () => mq.removeEventListener ? mq.removeEventListener('change', handler) : mq.removeListener(handler);
  }, []);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState('news');
  const [news, setNews] = useState({ items: [], page: 1, last: 1, loading: false, error: null });
  const [pending, setPending] = useState({ items: [], page: 1, last: 1, loading: false, error: null });

  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const locationRef = useRef(location.pathname);
  useEffect(() => {
    if (location.pathname !== locationRef.current) {
      locationRef.current = location.pathname;
      setNotifOpen(false);
      // on ferme le menu quand on change de route
      setShowMobileMenu(false);
    }
  }, [location.pathname]);

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
      setPending({
        items: replace ? raw : [...(replace ? [] : pending.items), ...raw],
        page: resp?.meta?.current_page || page,
        last: resp?.meta?.last_page || page,
        loading: false,
        error: null
      });
    } catch (e) {
      setPending((s) => ({ ...s, loading: false, error: e?.message || 'Load failed' }));
    }
  };

  /* Scroll-aware navbar */
  const [isHidden, setIsHidden] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [readP, setReadP] = useState(0);

  useEffect(() => {
    let lastY = window.scrollY || 0;
    let ticking = false;
    const TH_HIDE = 120, TH_COMPACT = 140, DELTA = 6;
    const onScroll = () => {
      const curr = window.scrollY || 0;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const diff = curr - lastY;
          if (curr > TH_COMPACT && !isCompact) setIsCompact(true);
          else if (curr <= TH_COMPACT && isCompact) setIsCompact(false);
          if (curr > TH_HIDE && diff > DELTA) { if (!isHidden) setIsHidden(true); }
          else if (diff < -DELTA) { if (isHidden) setIsHidden(false); }
          if (curr <= 0 && isHidden) setIsHidden(false);
          lastY = curr; ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHidden, isCompact]);

  useEffect(() => {
    if (!location.pathname.startsWith('/articles/')) { setReadP(0); return; }
    const onScroll = () => {
      const h = document.documentElement;
      const p = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
      setReadP(Math.max(0, Math.min(100, p)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  const canModerate = !!user?.roles?.includes('moderator') || !!user?.permissions?.includes('moderate');

  const navLinks = [
    { label: t('home'), path: '/', submenu: null },
    { label: t('platform'), path: '/articles', submenu: [
      { icon: faFileAlt, label: t('sumary'), path: '/platform/summary' },
      { icon: faVideo,   label: t('video'), path: '/platform/video' },
      { icon: faPodcast, label: t('audio'), path: '/platform/audio' }
    ]},
    { label: t('genre'), path: '/genre', submenu: [
      { icon: faFileAlt, label: t('playdoier'), path: '/genre/playdoier' },
      { icon: faVideo,   label: t('fundraising'), path: '/genre/fundraising' },
      { icon: faPodcast, label: t('technical'), path: '/genre/technical' }
    ]},
    { label: t('about'), path: '/about', submenu: [
      { icon: faSitemap,  label: t('structure'), path: '/about/structure' },
      { icon: faBullseye, label: t('goals'), path: '/about/goals' },
      { icon: faUsers,    label: t('members'), path: '/about/members' },
      { icon: faEnvelope, label: t('contact'), path: '/about/contact' }
    ]},
    canModerate ? { label: t('moderation','Modération'), path: '/moderation', submenu: null } : null
  ].filter(Boolean);

  const goToLogin = () => {
    const next = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
    navigate(`/auth?view=login&next=${next}`);
  };

  const baseBg = onAuth
    ? 'from-blue-50/80 via-blue-100/70 to-white/60 backdrop-blur-xl border-blue-200/60'
    : 'from-blue-900 via-indigo-700 to-blue-700 border-white/10';

  const heightClass = isCompact ? 'h-14' : 'h-20';
  const textScaleClass = isCompact ? 'text-xl' : 'text-2xl';
  const translateClass = isHidden ? '-translate-y-full' : 'translate-y-0';
  const shadowClass = isCompact ? 'shadow-lg' : 'shadow-md';

  return (
    <>
      <nav
        className={
          `fixed top-0 left-0 w-full bg-gradient-to-r ${shadowClass} flex items-center ${heightClass} z-50 border-b
           transition-[height,transform,background,box-shadow] duration-300 ease-out will-change-transform ${translateClass}
           ${baseBg}`
        }
        role="navigation"
        aria-label="Main"
      >
        <style>{`@media (prefers-reduced-motion: reduce){nav{transition:none!important}}`}</style>

        {/* Reading progress */}
        {readP > 0 && (
          <div className="absolute bottom-0 left-0 h-[2px] w-full bg-transparent">
            <div className="h-full bg-blue-500/90 transition-[width] duration-150" style={{width:`${readP}%`}}/>
          </div>
        )}

        <div className="w-full px-4 md:px-6 flex items-center gap-4">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-lg">
            <BookLogo />
            <span className={`${onAuth ? 'text-gray-900' : 'text-white'} ${textScaleClass} font-extrabold tracking-tight transition-[font-size] duration-300`}>
              <span className={`${onAuth ? 'text-blue-700' : 'text-blue-200'}`}>UI</span> <span className="hidden sm:inline">Library</span>
            </span>
          </NavLink>

          {/* Center links (desktop) */}
          {!isMobile && (
            <div className="flex-1 flex justify-center">
              <ul className="nav-links flex gap-6 font-medium mx-auto" role="menubar" aria-label="Primary">
                {navLinks.map((link, i) => (
                  <li key={i} className="relative group">
                    <NavLink
                      to={link.path}
                      className={({isActive}) =>
                        `flex items-center ${isCompact ? 'py-2' : 'py-3'} px-2 whitespace-nowrap rounded-md focus:outline-none transition-colors
                         ${onAuth
                            ? `text-gray-800 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-400 ${isActive ? 'bg-blue-50 text-blue-700' : ''}`
                            : `text-white/90 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 ${isActive ? 'bg-white/10 text-white' : ''}`}`
                      }
                      end
                    >
                      {link.label}
                      {link.submenu && <FontAwesomeIcon icon={faChevronDown} className={`ml-2 text-xs ${onAuth ? 'text-blue-700' : 'text-white/80'}`} />}
                    </NavLink>

                    {/* Dropdown (desktop) */}
                    {link.submenu && (
                      <div
                        className="absolute top-full left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl w-64 py-2 transition-all duration-200 border opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0"
                        role="menu"
                        aria-label={`${link.label} submenu`}
                      >
                        {link.submenu.map((sub, j) => (
                          <div key={j}>
                            <NavLink
                              to={sub.path}
                              className={({isActive}) =>
                                `flex items-center px-5 py-3 text-gray-800 hover:text-blue-600 hover:bg-blue-50 transition-all focus:outline-none focus-visible:bg-blue-50 rounded-md
                                 ${isActive ? 'bg-blue-50 text-blue-700' : ''}`
                              }
                              end
                            >
                              <FontAwesomeIcon icon={sub.icon} className="mr-3 text-blue-600 w-4" />
                              <span className="flex-1">{sub.label}</span>
                            </NavLink>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Right */}
          <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
            {/* Search desktop uniquement */}
            {!isMobile && (
              <div className="relative hidden sm:block">
                <ArticleSearchBox
                  placeholder={t('search')}
                  perPage={8}
                  compactOnMobile={true}
                  requireAuth={true}
                  isAuthenticated={!!isAuthenticated}
                  onRequireAuth={goToLogin}
                  navbarHeightPx={isCompact ? 56 : 80}
                />
              </div>
            )}

            <LanguageSwitcher />

            {isAuthenticated && (
              <div className="hidden md:flex items-center">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${isCompact ? 'opacity-90' : 'opacity-100'}
                  ${onAuth ? 'bg-blue-100/60 text-blue-900 border-blue-200/70' : 'bg-white/10 text-white border-white/20'}`}>
                  {t('hello','Bonjour')}{' '}{user?.username || '—'}
                </span>
              </div>
            )}

            {/* Notifications */}
            {isAuthenticated && (
              <button
                onClick={toggleNotifications}
                className={`relative transition-colors p-2 rounded-full focus:outline-none
                  ${onAuth
                    ? 'text-gray-800 hover:text-blue-700 hover:bg-blue-100/60 focus-visible:ring-2 focus-visible:ring-blue-400'
                    : 'text-white hover:text-blue-100 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60'}`}
                aria-haspopup="dialog"
                aria-expanded={notifOpen}
                aria-label={t('notifications','Notifications')}
                title={t('notifications','Notifications')}
              >
                <FontAwesomeIcon icon={faBell} />
                {(newCount > 0 || pendingCount > 0) && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-semibold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                    {(newCount + pendingCount) > 99 ? '99+' : (newCount + pendingCount)}
                  </span>
                )}
              </button>
            )}

            {/* Auth (desktop) */}
            {!isAuthenticated && !isMobile && (
              <div className="hidden sm:flex gap-2">
                <NavLink
                  to="/auth?view=login"
                  title={t('login','Connexion')}
                  aria-label={t('login','Connexion')}
                  className={({isActive}) =>
                    `${onAuth
                      ? 'border border-blue-300 rounded-lg px-3 py-2 text-gray-900 hover:text-blue-700 hover:bg-blue-100/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400'
                      : 'border border-white/40 rounded-lg px-3 py-2 text-white hover:bg-white/10 hover:border-white/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60'} ${isActive ? 'bg-blue-50 text-blue-700' : ''}`
                  }
                >
                  <FontAwesomeIcon icon={faRightToBracket || faSignInAlt} className="mr-2 text_base" />
                  <span className="hidden md:inline">{t('login','Connexion')}</span>
                  <span className="sr-only md:not-sr-only md:hidden">{t('login','Connexion')}</span>
                </NavLink>
                <NavLink
                  to="/auth?view=register"
                  title={t('register','Inscription')}
                  aria-label={t('register','Inscription')}
                  className={({isActive}) =>
                    `${onAuth
                      ? 'bg-blue-600 text-white rounded-lg px-3 py-2 hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400'
                      : 'bg-blue-500 text-white rounded-lg px-3 py-2 hover:bg-blue-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60'} ${isActive ? 'ring-2 ring-white/60' : ''}`
                  }
                >
                  <FontAwesomeIcon icon={faUserPlus} className="mr-2 text_base" />
                  <span className="hidden md:inline">{t('register','Inscription')}</span>
                  <span className="sr-only md:not-sr-only md:hidden">{t('register','Inscription')}</span>
                </NavLink>
              </div>
            )}

            {/* Avatar (desktop) */}
        {isAuthenticated && !isMobile && (
          <div className="relative group">
            <button
              className="flex items_center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-lg"
              aria-haspopup="true"
              aria-expanded="false"
            >
              <img
                src={avatarSrc}
                alt={t('profile','Profil')}
                width="40" height="40"
                className={`w-10 h-10 rounded-full border-2 object-cover bg-white transition-colors
                  ${onAuth ? 'border-blue-300' : 'border-white/40'}`}
                onError={handleImgError}
                loading="lazy"
                decoding="async"
              />
             
            </button>

            {/* Dropdown menu utilisateur - Style identique aux notifications */}
            <div
              className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 z-50"
              role="menu"
              aria-label="Menu utilisateur"
            >
              {/* Header bleu identique aux notifications */}
              <div className="px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white">
                <div className="flex items-center gap-3">
                  <img
                    src={avatarSrc}
                    alt=""
                    className="w-10 h-10 rounded-full border-2 border-white/30 object-cover bg-white"
                    onError={handleImgError}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {user?.name || user?.username || 'Utilisateur'}
                    </div>
                    <div className="text-sm text-white/80 truncate">
                      {user?.email || ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Options du menu */}
              <div className="py-2">
                <NavLink
                  to="/profile"
                  className={({isActive}) =>
                    `flex items-center px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all ${
                      isActive ? 'bg-blue-50 text-blue-700' : ''
                    }`
                  }
                  end
                >
                  <FontAwesomeIcon icon={faUserCircle} className="mr-3 text-blue-600 w-4" />
                  <span className="flex-1">{t('profile','Profil')}</span>
                </NavLink>

                <NavLink
                  to="/settings"
                  className={({isActive}) =>
                    `flex items-center px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all ${
                      isActive ? 'bg-blue-50 text-blue-700' : ''
                    }`
                  }
                  end
                >
                  <FontAwesomeIcon icon={faCog} className="mr-3 text-blue-600 w-4" />
                  <span className="flex-1">{t('settings','Paramètres')}</span>
                </NavLink>
              </div>

              {/* Séparateur et déconnexion */}
              <div className="border-t border-gray-100">
                <button
                  onClick={async () => {
                    await dispatch(logoutUser(i18n.language));
                    navigate('/auth');
                  }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-red-50 transition-all"
                >
                  <FontAwesomeIcon icon={faRightToBracket} className=" text-red-600 " />
                  <span className="">{t('logout','Déconnexion')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
            {/* Burger (mobile) */}
            {isMobile && (
              <button
                className="flex flex-col justify-between w-8 h-6 relative z-[60] ml-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-md"
                onClick={() => setShowMobileMenu(true)}
                aria-label={t('open','Ouvrir')}
                aria-expanded={showMobileMenu}
                title={t('open','Ouvrir')}
              >
                <span className={`${onAuth ? 'bg-blue-900' : 'bg-white'} h-0.5 rounded`} />
                <span className={`${onAuth ? 'bg-blue-900' : 'bg-white'} h-0.5 rounded`} />
                <span className={`${onAuth ? 'bg-blue-900' : 'bg-white'} h-0.5 rounded`} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Notifications (portal) */}
      {isAuthenticated && notifOpen && (
        <Portal>
          <NotificationsDialog
            t={t}
            onClose={() => setNotifOpen(false)}
            newCount={newCount}
            pendingCount={pendingCount}
            news={news}
            pending={pending}
            setNotifTab={setNotifTab}
            notifTab={notifTab}
            loadNews={loadNews}
            loadPending={loadPending}
            markAllRead={() => { if (userId) { setLastSeenNow(userId); setNewCount(0); } }}
            navigate={navigate}
          />
        </Portal>
      )}

      {/* Mobile Menu (portal) */}
      {isMobile && showMobileMenu && (
        <Portal>
          <MobileMenuBottomSheetPortal
            onClose={() => setShowMobileMenu(false)}
            isAuthenticated={isAuthenticated}
            user={user}
            avatarSrc={avatarSrc}
            onAvatarError={handleImgError}
            navLinks={navLinks}
            goToLogin={goToLogin}
            navigate={navigate}
            onLogout={async () => { await dispatch(logoutUser(i18n.language)); setShowMobileMenu(false); navigate('/auth'); }}
          />
        </Portal>
      )}
    </>
  );
};

/* ========================= Notifications ========================= */
function NotificationsDialog({
  t, onClose, newCount, pendingCount,
  news, pending, setNotifTab, notifTab,
  loadNews, loadPending, markAllRead, navigate
}) {
  useScrollLock(true);
  const closeBtnRef = useRef(null);

  return (
    <FocusTrap active={true} initialFocusRef={closeBtnRef}>
      <div className="fixed inset-0 z_[1001]">
        <button
          className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          aria-label={t('common.close')}
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('notifications','Notifications')}
          className="absolute right-2 top-[72px] w-[26rem] max-w-[96vw] bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden"
        >
          <div className="px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{t('notifications','Notifications')}</span>
              {newCount > 0 && <span className="text-xs bg_white/20 text-white px-2 py-0.5 rounded-full">{newCount}</span>}
              {pendingCount > 0 && <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{pendingCount} {t('to_moderate','à modérer')}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={()=>{ onClose(); navigate('/settings'); }}
                className="text-xs underline decoration-white/50 underline-offset-2 hover:decoration-white"
                ref={closeBtnRef}
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
              data-autofocus
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
            {notifTab==='news'
              ? <NewsList t={t} news={news} loadNews={loadNews} onClose={onClose} />
              : <PendingList t={t} pending={pending} loadPending={loadPending} onClose={onClose} />
            }
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}

function NewsList({ t, news, loadNews, onClose }) {
  return (
    <>
      {(news.loading && news.items.length===0) && (<><SkeletonRow/><SkeletonRow/><SkeletonRow/></>)}
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
          <Link key={a.id} to={href} onClick={onClose}>{Row}</Link>
        ) : (
          <a key={a.id} href={href} onClick={onClose}>{Row}</a>
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
  );
}

function PendingList({ t, pending, loadPending, onClose }) {
  return (
    <>
      {(pending.loading && pending.items.length===0) && (<><SkeletonRow/><SkeletonRow/><SkeletonRow/></>)}
      {pending.items.length === 0 && !pending.loading && (
        <div className="p-6 text-sm text-gray-500 flex items-center justify-center gap-2">
          <span>🧹</span> <span>{t('nothing_to_moderate','Rien à modérer')}</span>
        </div>
      )}
      {pending.items.map((pItem)=> {
        const hrefCandidate = buildPendingLink(pItem);
        const href = toFrontPath(hrefCandidate) || '/settings';
        const isRel = String(href).startsWith('/');
        const Row = (
          <div className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors">
            <div className="flex-shrink-0 w-9 h-9 bg-amber-50 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faCommentDots} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-gray-900 line-clamp-2">{pItem.title || t('pending_item','Élément à modérer')}</div>
              {pItem.subtitle && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{pItem.subtitle}</div>}
              <div className="text-xs text-gray-400 mt-1">{timeAgo(pItem.created_at, t)}</div>
            </div>
          </div>
        );
        return isRel ? (
          <Link key={pItem.id} to={href} onClick={onClose}>{Row}</Link>
        ) : (
          <a key={pItem.id} href={href} onClick={onClose}>{Row}</a>
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
  );
}

/* ========================= Mobile Bottom Sheet ========================= */
function MobileMenuBottomSheetPortal({
  onClose, isAuthenticated, user, avatarSrc, onAvatarError,
  navLinks, goToLogin, navigate, onLogout
}) {
  useScrollLock(true);
  const headerCloseRef = useRef(null);

  // swipe-to-close (simple)
  const sheetRef = useRef(null);
  useEffect(() => {
    let startY = null;
    const onTouchStart = (e) => { startY = e.touches?.[0]?.clientY ?? null; };
    const onTouchMove  = (e) => {
      if (startY == null) return;
      const y = e.touches?.[0]?.clientY ?? startY;
      const dy = y - startY;
      if (dy > 42) { onClose?.(); startY = null; }
    };
    const el = sheetRef.current;
    el?.addEventListener('touchstart', onTouchStart, { passive: true });
    el?.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      el?.removeEventListener('touchstart', onTouchStart);
      el?.removeEventListener('touchmove', onTouchMove);
    };
  }, [onClose]);

  const [openSection, setOpenSection] = useState(null);
  const toggle = (key) => setOpenSection((prev) => (prev === key ? null : key));
  const onNavigate = () => onClose?.();

  return (
    <FocusTrap active={true} initialFocusRef={headerCloseRef}>
      {/* Backdrop au-dessus du nav (z-[1000]) */}
      <div className="fixed inset-0 z-[1000]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        />
      </div>

      {/* Sheet (z-[1001]) */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="fixed inset-x-0 bottom-0 z-[1001] w-full bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden
                   animate-[slideUp_.18s_ease-out]"
        style={{ willChange: 'transform' }}
      >
        <style>{`
          @keyframes slideUp { from { transform: translateY(20px); opacity: .94; } to { transform: translateY(0); opacity: 1; } }
        `}</style>

        {/* Header */}
        <div className="flex-shrink-0 bg-white rounded-t-2xl pt-2 px-4 pb-3 border-b border-slate-200">
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-slate-200" aria-hidden="true" />
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Menu</h3>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                ref={headerCloseRef}
                onClick={onClose}
                className="h-9 w-9 rounded-lg border border-slate-200 bg-white inline-flex items-center justify-center hover:bg-slate-50"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Search inline */}
          <div className="mt-3">
            <div className="p-1.5 bg-blue-500 rounded-xl border text-blue-500 border-blue-200 shadow-[inset_0_0_0_1px_rgba(59,130,246,.15)]">
              <ArticleSearchBox
                placeholder="Rechercher"
                perPage={6}
                compactOnMobile={true}
                requireAuth={true}
                isAuthenticated={!!isAuthenticated}
                onRequireAuth={goToLogin}
                navbarHeightPx={64}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
          {/* Nav accordion */}
          <section className="rounded-xl border border-slate-200 overflow-hidden">
            {navLinks.map((link, i) => {
              const hasChildren = Array.isArray(link.submenu) && link.submenu.length > 0;
              return (
                <div key={i} className="border-b last:border-b-0 border-slate-200">
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => toggle(`sec-${i}`)}
                      className="w-full h-12 px-3 flex items-center justify_between bg-white"
                      aria-expanded={openSection === `sec-${i}`}
                    >
                      <span className="text-sm font-medium text-slate-900">{link.label}</span>
                      <FontAwesomeIcon icon={faChevronDown} className={`transition-transform ${openSection===`sec-${i}`?'rotate-180':''}`} />
                    </button>
                  ) : (
                    <NavLink
                      to={link.path}
                      onClick={onNavigate}
                      className={({isActive}) =>
                        `w-full h-12 px-3 flex items-center justify-between text-sm font-medium ${isActive ? 'text-blue-700' : 'text-slate-900'}`
                      }
                      end
                    >
                      <span>{link.label}</span>
                    </NavLink>
                  )}

                  {hasChildren && (
                    <div className={`transition-all duration-200 overflow-hidden ${openSection===`sec-${i}`?'max-h-96 opacity-100':'max-h-0 opacity-0'}`}>
                      <div className="p-3 bg-slate-50">
                        <div className="grid grid-cols-1 gap-1">
                          <NavLink
                            to={link.path}
                            className="px-3 py-2 rounded-md hover:bg-blue-50 text-blue-700 text-sm"
                            onClick={onNavigate}
                            end
                          >
                            Aperçu
                          </NavLink>
                          {link.submenu.map((sub, j) => (
                            <NavLink
                              key={j}
                              to={sub.path}
                              className="px-3 py-2 rounded-md hover:bg-blue-50 text-blue-700 text-sm inline-flex items-center gap-2"
                              onClick={onNavigate}
                              end
                            >
                              <FontAwesomeIcon icon={sub.icon} className="w-4" />
                              {sub.label}
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {/* User section */}
          <section className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="w-full px-3 py-3 bg-white flex items-center gap-3">
              <img
                src={avatarSrc}
                onError={onAvatarError}
                alt="avatar"
                className="w-10 h-10 rounded-full ring-2 ring-blue-100 object-cover bg-white"
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {isAuthenticated ? (user?.name || user?.username || 'Profil') : 'Invité'}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {isAuthenticated ? (user?.email || '—') : 'Connectez-vous pour continuer'}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 grid grid-cols-1 gap-2">
              {isAuthenticated ? (
                <>
                  <NavLink
                    to="/settings"
                    onClick={onNavigate}
                    className="px-3 py-2 rounded-md bg-white border border-slate-200 hover:bg-slate-100 inline-flex items-center gap-2 text-sm"
                  >
                    <FontAwesomeIcon icon={faUserCircle} className="w-4 text-blue-600" />
                    Profil
                  </NavLink>
                  <NavLink
                    to="/articlescontroler"
                    onClick={onNavigate}
                    className="px-3 py-2 rounded-md bg-white border border-slate-200 hover:bg-slate-100 inline-flex items-center gap-2 text-sm"
                  >
                    <FontAwesomeIcon icon={faCog} className="w-4 text-blue-600" />
                    Paramètres
                  </NavLink>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { goToLogin(); onNavigate(); }}
                    className="px-3 py-2 rounded-md bg-white border border-slate-200 hover:bg-slate-100 inline-flex items-center gap-2 text-sm text-left"
                  >
                    <FontAwesomeIcon icon={faRightToBracket} className="w-4 text-blue-600" />
                    Connexion
                  </button>
                  <button
                    onClick={() => { navigate('/auth?view=register'); onNavigate(); }}
                    className="px-3 py-2 rounded-md bg-white border border-slate-200 hover:bg-slate-100 inline-flex items-center gap-2 text-sm text-left"
                  >
                    <FontAwesomeIcon icon={faUserPlus} className="w-4 text-blue-600" />
                    Inscription
                  </button>
                </>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-white border-t border-slate-200 p-3 flex gap-2">
          {!isAuthenticated ? (
            <>
              <button
                onClick={() => { goToLogin(); onNavigate(); }}
                className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-slate-700 active:scale-[0.98] transition grid place-items-center text-sm"
              >
                Connexion
              </button>
              <button
                onClick={() => { navigate('/auth?view=register'); onNavigate(); }}
                className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 active:scale-[0.98] transition grid place-items-center text-sm"
              >
                Inscription
              </button>
            </>
          ) : (
            <button
              onClick={onLogout}
              className="w-full h-11 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 active:scale-[0.98] transition text-sm"
            >
              Déconnexion
            </button>
          )}
        </div>
      </div>
    </FocusTrap>
  );
}

export default Navbar;
