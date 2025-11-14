// src/layouts/DashboardLayout.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  memo,
} from 'react';
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  NavLink,
  useResolvedPath,
} from 'react-router-dom';
import {
  FaFolderOpen,
  FaTachometerAlt,
  FaImages,
  FaStar,
  FaCog,
  FaBars,
  FaBell,
  FaUser,
  FaSignOutAlt,
  FaTrash,
  FaPlus,
  FaChevronDown,
} from 'react-icons/fa';
import { FaUsersGear } from 'react-icons/fa6';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import i18n from '../i18n';
import { logoutUser } from '../features/auth/authActions';

const STORAGE_KEY = 'dashboard:activeTabId';
const ACCORDION_STORE_KEY = 'dashboard:openSections';
const SUBACCORDION_STORE_KEY = 'dashboard:openSubSections';
const SIDEBAR_LS_KEY = 'sidebar:open';

/* ========================= Helpers ========================= */
const getTokenGuard = () => {
  try {
    return (
      (typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem('tokenGuard')) ||
      (typeof localStorage !== 'undefined' &&
        localStorage.getItem('tokenGuard')) ||
      null
    );
  } catch {
    return null;
  }
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
  try { const u = new URL(input); return `${u.pathname}${u.search}${u.hash}`; }
  catch { return input; }
};

const withQuery = (href, params = {}) => {
  if (!href) return null;
  const m = String(href).match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
  const base = m?.[1] ?? href;
  const qs0  = (m?.[2] ?? '').replace(/^\?/, '');
  const hash = m?.[3] ?? '';
  const search = new URLSearchParams(qs0);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) search.set(k, String(v));
  });
  const qs = search.toString();
  return `${base}${qs ? `?${qs}` : ''}${hash}`;
};



const LS_KEY = (uid) => `act_seen_ts:${uid}`;
const getLastSeenTs = (uid) => {
  try {
    return localStorage.getItem(LS_KEY(uid));
  } catch {
    return null;
  }
};
const setLastSeenNow = (uid) => {
  try {
    localStorage.setItem(LS_KEY(uid), new Date().toISOString());
  } catch {}
};

const fetchJson = async (url, params = {}, token) => {
  const q = new URLSearchParams(params);
  const res = await fetch(`${url}?${q.toString()}`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const typeIconName = (type) => {
  switch (type) {
    case 'permission_changed':
      return '🔑';
    case 'role_assigned':
      return '🛡️';
    case 'article_created':
      return '📰';
    case 'comment_approved':
      return '💬';
    default:
      return '🔔';
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
        (typeof a.id === 'string' &&
        a.id.startsWith('comment-approve-')
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

const buildPendingLink= (item) => {
  const articleSlug = item.article_slug || item.slug || item.article?.slug || null;
  const commentId   = item.comment_id || item.id || null;
  const status      = item.status || 'pending';
  let href = item.url || item.link || null;

  if (!href) {
    if (articleSlug) {
      href = commentId
        ? `/articles/${articleSlug}#comment-${commentId}`
        : `/articles/${articleSlug}`;
    } else {
      href = '/settings';
    }
  }

  href = withQuery(href, {
    moderate: 1,
    comment_id: commentId || undefined,
    status
  });

  return href;
};



const timeAgo = (iso, t) => {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return t('just_now', "à l'instant");
  if (diff < 3600)
    return t('x_min_ago', 'il y a {{x}} min', { x: Math.floor(diff / 60) });
  if (diff < 86400)
    return t('x_h_ago', 'il y a {{x}} h', { x: Math.floor(diff / 3600) });
  return (
    d.toLocaleDateString('fr-FR') +
    ' ' +
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  );
};
/* ========================= /Helpers ========================= */

/* ========= ActiveLink (mémo) ========= */
const ActiveLink = memo(function ActiveLink({
  to,
  exactFull = false,
  className,
  children,
  ...rest
}) {
  const location = useLocation();
  const resolved = useResolvedPath(to);
  const norm = (s) => {
    const v = (s || '').replace(/\/+$/, '');
    return v === '' ? '/' : v;
  };

  const currentFull =
    norm(location.pathname) +
    (location.search || '') +
    (location.hash || '');
  const targetFull =
    norm(resolved.pathname) + (resolved.search || '') + (resolved.hash || '');
  const isActiveFull = exactFull ? currentFull === targetFull : undefined;
  const compute = (ctx) => (exactFull ? isActiveFull : ctx.isActive);

  return (
    <NavLink
      to={to}
      end={!exactFull}
      className={(ctx) =>
        typeof className === 'function'
          ? className({ isActive: compute(ctx) })
          : className
      }
      aria-current={(ctx) => (compute(ctx) ? 'page' : undefined)}
      {...rest}
    >
      {(ctx) =>
        typeof children === 'function'
          ? children({ isActive: compute(ctx) })
          : children
      }
    </NavLink>
  );
});

/* ===== Accents & dégradés ===== */
const ACCENTS = {
  blue: {
    border: 'border-blue-500',
    icon: 'text-blue-500',
    hover: 'hover:bg-blue-50/60',
    activeBg: 'bg-gradient-to-r from-blue-50 to-blue-100/40',
  },
  emerald: {
    border: 'border-emerald-500',
    icon: 'text-emerald-500',
    hover: 'hover:bg-emerald-50/60',
    activeBg: 'bg-gradient-to-r from-emerald-50 to-emerald-100/40',
  },
  violet: {
    border: 'border-violet-500',
    icon: 'text-violet-500',
    hover: 'hover:bg-violet-50/60',
    activeBg: 'bg-gradient-to-r from-violet-50 to-violet-100/40',
  },
  amber: {
    border: 'border-amber-500',
    icon: 'text-amber-600',
    hover: 'hover:bg-amber-50/60',
    activeBg: 'bg-gradient-to-r from-amber-50 to-amber-100/40',
  },
};

/* ===== Styles menu ===== */
const menuItemClass = (item, isActive, accentKey) => {
  const accent = ACCENTS[accentKey] || ACCENTS.blue;
  const activeBorder = isActive
    ? `border-l-[3px] ${accent.border}`
    : 'border-l border-transparent';
  const common =
    'flex items-center rounded-xl p-3 mb-1 transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] relative overflow-hidden group';
  const hover = isActive ? '' : accent.hover || 'hover:bg-gray-100/70';
  const text = isActive ? 'text-gray-900 font-semibold' : 'text-gray-800';
  const shadow = isActive ? 'shadow-[0_2px_8px_rgba(0,0,0,.06)]' : 'shadow-none';
  return `${common} ${hover} ${text} ${activeBorder} ${shadow} ${
    isActive ? accent.activeBg : ''
  }`;
};

const Content = ({ icon, labelKey, fallback, t, accentKey }) => {
  const accent = ACCENTS[accentKey] || ACCENTS.blue;
  return (
    <>
      <span
        className={`mr-3 ${accent.icon} transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-110`}
      >
        {icon}
      </span>
      <span className="font-medium">{t(labelKey, fallback)}</span>
      <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl bg-gradient-to-r from-white/0 via-white/40 to-white/0" />
    </>
  );
};

/* ===== Parse sûr d’un lien ===== */
const safeParseTo = (to) => {
  try {
    const u = new URL(
      to,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    );
    return {
      pathname: u.pathname.replace(/\/+$/, '') || '/',
      search: u.search || '',
      hash: u.hash || '',
    };
  } catch {
    const m = String(to || '/');
    const [path, rest = ''] = m.split(/([?#].*)/).filter(Boolean);
    const searchMatch = rest.match(/\?[^#]*/);
    const hashMatch = rest.match(/#[\s\S]*/);
    return {
      pathname: (path || '/').replace(/\/+$/, '') || '/',
      search: searchMatch?.[0] || '',
      hash: hashMatch?.[0] || '',
    };
  }
};

const USER_TABS = [
  'profile',
  'EditProfil',
  'users',
  'userrole',
  'roles',
  'permissions',
  'activity',
  'activityall',
];
const BASE_UM = '/settings';

/* ===== Emphase visuelle du Dashboard (plus épais & visible) ===== */
const menuItemEmphasis = (item, isActive) => {
  if (item?.id !== 'dashboard') return '';
  return [
    'ring-1 ring-inset',
    isActive ? 'ring-blue-200' : 'ring-gray-200/70 hover:ring-gray-300',
    'p-4 text-[15px]', // plus épais
    'bg-white',
    isActive ? 'bg-gradient-to-r from-blue-50 to-blue-100/50' : '',
    'shadow-sm',
  ].join(' ');
};

/* ===== Look “card” pour Media Manager & Back Office Admin ===== */
const menuItemCardLike = (item) => {
  if (!item?.id) return '';
  if (['platform', 'articlesBo'].includes(item.id)) {
    return 'bg-white border border-gray-200/70 hover:border-gray-300 rounded-xl';
  }
  return '';
};

/* ====== Error Boundary ====== */
class Boundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg">
          Une erreur est survenue dans l’affichage de la page.
        </div>
      );
    }
    return this.props.children;
  }
}

const DashboardLayout = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  
// par CES lignes (mêmes noms que le Navbar)
const API_BASE_STORAGE = import.meta.env.VITE_API_BASE_STORAGE;
const API_BASE_URL     = import.meta.env.VITE_API_BASE_URL || '';
const USE_SSE          = import.meta.env.VITE_USE_SSE === '1'; // aligné sur Navbar

// endpoints de modération identiques à ceux du Navbar
const MOD_COUNT_EP = import.meta.env.VITE_MOD_PENDING_COUNT_EP || '/moderation/pending-count';
const MOD_LIST_EP  = import.meta.env.VITE_MOD_PENDING_LIST_EP  || '/moderation/pending';

    

  const { isAuthenticated, user } = useSelector((s) => s.library?.auth || {});
  const userId = user?.id;

  /* Sidebar open/close */
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      const v = localStorage.getItem(SIDEBAR_LS_KEY);
      return v ? v === '1' : true;
    } catch {
      return true;
    }
  });
  const toggleSidebar = () =>
    setIsSidebarOpen((v) => {
      try {
        localStorage.setItem(SIDEBAR_LS_KEY, v ? '0' : '1');
      } catch {}
      return !v;
    });

  const [title, setTitle] = useState('');
  const [activeTabId, setActiveTabId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  /* ===== Toggle de langue (un seul bouton) ===== */
  const LanguageSelector = () => {
    const next = i18n.language === 'fr' ? 'en' : 'fr';
    const label =
      i18n.language === 'fr' ? 'Switch to English' : 'Passer en français';
    return (
      <button
        onClick={() => i18n.changeLanguage(next)}
        className="px-3 py-1 rounded-lg text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        aria-label={label}
        title={label}
      >
        {next.toUpperCase()}
      </button>
    );
  };

  /* ================= Sections / Routes ================= */
  const menuSections = useMemo(
    () => [
      {
        id: 'root',
        titleKey: null,
        items: [
          {
            id: 'dashboard',
            tKey: 'layout.menu.dashboard',
            icon: <FaTachometerAlt />,
            link: '/dashboard',
            emphasize: true,
          },
        ],
      },
      {
        id: 'content',
        titleKey: 'layout.sections.media',
        items: [
          {
            id: 'platform',
            tKey: 'layout.menu.platform',
            icon: <FaImages />,
            link: '/articles',
          },
          {
            id: 'articlesBo',
            tKey: 'layout.menu.articlesBo',
            icon: <FaStar />,
            link: '/articlescontroler',
          },
          {
            id: 'articleNew',
            tKey: 'layout.menu.articleNew',
            icon: <FaPlus />,
            link: '/articles/new',
          },
          {
            id: 'trashed',
            tKey: 'layout.menu.trashed',
            icon: <FaTrash />,
            link: '/articles/trashed',
          },
        ],
      },
      {
        id: 'system',
        titleKey: 'layout.sections.settings',
        items: [
          {
            id: 'categoriesTags',
            tKey: 'layout.menu.categoriesTags',
            icon: <FaCog />,
            link: '/configuration',
          },
        ],
      },
      {
        id: 'users',
        titleKey: 'layout.sections.users',
        groups: [
          {
            id: 'grp-profile',
            title: 'Profil',
            accent: 'blue',
            items: [
              {
                id: 'um_profile',
                tKey: 'layout.menu.myProfile',
                icon: <FaUser />,
                link: `${BASE_UM}?tab=profile`,
                activeMode: 'full',
              },
              {
                id: 'um_edit',
                tKey: 'layout.menu.editProfile',
                icon: <FaUser />,
                link: `${BASE_UM}?tab=EditProfil`,
                activeMode: 'full',
              },
            ],
          },
          {
            id: 'grp-directory',
            title: 'Annuaire & Rôles',
            accent: 'emerald',
            items: [
              {
                id: 'um_users',
                tKey: 'layout.menu.user_list',
                icon: <FaUsersGear />,
                link: `${BASE_UM}?tab=users`,
                activeMode: 'full',
              },
              {
                id: 'um_userrole',
                tKey: 'layout.menu.user_roles',
                icon: <FaUsersGear />,
                link: `${BASE_UM}?tab=userrole`,
                activeMode: 'full',
              },
              {
                id: 'um_roles',
                tKey: 'layout.menu.roles',
                icon: <FaUsersGear />,
                link: `${BASE_UM}?tab=roles`,
                activeMode: 'full',
              },
            ],
          },
          {
            id: 'grp-security',
            title: 'Sécurité & Permissions',
            accent: 'violet',
            items: [
              {
                id: 'um_permissions',
                tKey: 'layout.menu.permissions',
                icon: <FaUsersGear />,
                link: `${BASE_UM}?tab=permissions`,
                activeMode: 'full',
              },
            ],
          },
          {
            id: 'grp-activity',
            title: 'Activité',
            accent: 'amber',
            items: [
              {
                id: 'um_activityall',
                tKey: 'layout.menu.activity_all',
                icon: <FaUsersGear />,
                link: `${BASE_UM}?tab=activityall`,
                activeMode: 'full',
              },
            ],
          },
        ],
      },
    ],
    []
  );

  /* Accordéons */
  const [openSections, setOpenSections] = useState(() => {
    try {
      const raw = localStorage.getItem(ACCORDION_STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { root: true, content: true, users: true, system: true };
  });

  const [openSubSections, setOpenSubSections] = useState(() => {
    try {
      const raw = localStorage.getItem(SUBACCORDION_STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      'grp-profile': true,
      'grp-directory': true,
      'grp-security': true,
      'grp-activity': true,
    };
  });

  const toggleSection = (sid) => {
    setOpenSections((prev) => {
      const next = { ...prev, [sid]: !prev[sid] };
      try {
        localStorage.setItem(ACCORDION_STORE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleSubSection = (gid) => {
    setOpenSubSections((prev) => {
      const next = { ...prev, [gid]: !prev[gid] };
      try {
        localStorage.setItem(SUBACCORDION_STORE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  /* Auto-ouverture de la section active */
  useEffect(() => {
    const normPath = (p) => (p || '/').replace(/\/+$/, '') || '/';
    const curPath = normPath(location.pathname);
    const curSearch = location.search || '';
    const curHash = location.hash || '';

    let needSaveParent = false;
    let needSaveChild = false;

    const nextParent = { ...openSections };
    const nextChild = { ...openSubSections };

    for (const section of menuSections) {
      const items = section.items || [];
      const groups = section.groups || [];

      for (const it of items) {
        if (!it.link) continue;
        const parsed = safeParseTo(it.link);
        const isFull = it.activeMode === 'full';
        const match = isFull
          ? curPath === parsed.pathname &&
            curSearch === parsed.search &&
            curHash === parsed.hash
          : curPath === parsed.pathname;

        if (match && !nextParent[section.id]) {
          nextParent[section.id] = true;
          needSaveParent = true;
        }
      }

      for (const g of groups) {
        for (const it of g.items || []) {
          if (!it.link) continue;
          const parsed = safeParseTo(it.link);
          const isFull = it.activeMode === 'full';
          const match = isFull
            ? curPath === parsed.pathname &&
              curSearch === parsed.search &&
              curHash === parsed.hash
            : curPath === parsed.pathname;

          if (match) {
            if (!nextParent[section.id]) {
              nextParent[section.id] = true;
              needSaveParent = true;
            }
            if (!nextChild[g.id]) {
              nextChild[g.id] = true;
              needSaveChild = true;
            }
          }
        }
      }
    }

    if (needSaveParent) {
      setOpenSections(nextParent);
      try {
        localStorage.setItem(ACCORDION_STORE_KEY, JSON.stringify(nextParent));
      } catch {}
    }
    if (needSaveChild) {
      setOpenSubSections(nextChild);
      try {
        localStorage.setItem(SUBACCORDION_STORE_KEY, JSON.stringify(nextChild));
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, location.hash, menuSections]);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser(i18n.language));
      navigate('/auth');
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, activeTabId);
    } catch {}
  }, [activeTabId]);

  // ===== Titre contextuel =====
  useEffect(() => {
    const path = location.pathname || '/';
    const sp = new URLSearchParams(location.search || '');
    const tab = sp.get('tab');
    let newTitle;
    if (path.startsWith('/configuration'))
      newTitle = t('layout.titles.settings');
    else if (path.startsWith('/articlescontroler'))
      newTitle = t('layout.titles.articlesBo');
    else if (path.startsWith('/articles/trashed'))
      newTitle = t('layout.titles.trashed');
    else if (path.startsWith('/articles/new'))
      newTitle = t('layout.titles.articleNew');
    else if (path.startsWith('/articles'))
      newTitle = t('layout.titles.platform');
    else if (path.startsWith(BASE_UM) && USER_TABS.includes(tab))
      newTitle = t('layout.titles.userManagement', 'Utilisateurs & Accès');
    else if (path.startsWith('/settings'))
      newTitle = t('layout.titles.settings');
    else if (
      path.startsWith('/dashboard') ||
      path.startsWith('/backoffice')
    )
      newTitle = t('layout.titles.dashboard');
    else newTitle = t('layout.titles.dashboard');
    setTitle(newTitle);
  }, [location.pathname, location.search, t]);

  /* ===== Profil ===== */
  const computedAvatarSrc = useMemo(() => {
    const raw = user?.avatar_url || user?.avatar || '';
    const updatedAt = user?.updated_at || user?.avatar_updated_at || null;
    return buildAvatarUrl(raw, updatedAt, API_BASE_STORAGE);
  }, [
    user?.avatar_url,
    user?.avatar,
    user?.updated_at,
    user?.avatar_updated_at,
    API_BASE_STORAGE,
  ]);

  const [avatarSrc, setAvatarSrc] = useState(computedAvatarSrc);
  useEffect(() => {
    setAvatarSrc(computedAvatarSrc);
  }, [computedAvatarSrc]);
  const onAvatarError = () =>
    setAvatarSrc('https://randomuser.me/api/portraits/women/44.jpg');

  /* ===== Notifications & a11y popover ===== */
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState('news');
  const notifRef = useRef(null);
  const notifButtonRef = useRef(null);
  const notifPanelRef = useRef(null);

  const [newCount, setNewCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const [news, setNews] = useState({
    items: [],
    page: 1,
    last: 1,
    loading: false,
    error: null,
  });
  const [pending, setPending] = useState({
    items: [],
    page: 1,
    last: 1,
    loading: false,
    error: null,
  });

  const recomputeNewCount = useCallback(async () => {
    const token = getTokenGuard();
    if (!isAuthenticated || !userId) {
      setNewCount(0);
      return;
    }
    const lastSeen = getLastSeenTs(userId);
    if (!lastSeen) {
      setLastSeenNow(userId);
      setNewCount(0);
      return;
    }
    try {
      const head = await fetchJson(
        `${API_BASE_URL}/users/${userId}/activities`,
        { per_page: 1, page: 1 },
        token
      );
      const latest = head?.data?.[0];
      if (!latest?.created_at) {
        setNewCount(0);
        return;
      }
      const latestTs = Date.parse(latest.created_at);
      const lastSeenTs = Date.parse(lastSeen);
      if (
        isNaN(latestTs) ||
        isNaN(lastSeenTs) ||
        latestTs <= lastSeenTs
      ) {
        setNewCount(0);
        return;
      }

      const day = new Date(lastSeenTs);
      const fromStr = `${day.getFullYear()}-${String(
        day.getMonth() + 1
      ).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      const page1 = await fetchJson(
        `${API_BASE_URL}/users/${userId}/activities`,
        { per_page: 100, page: 1, from: fromStr },
        token
      );
      const items = Array.isArray(page1?.data) ? page1.data : [];
      const precise = items.filter((it) => {
        const ts = Date.parse(it?.created_at);
        return !isNaN(ts) && ts > lastSeenTs;
      }).length;
      const approxMore = (page1?.meta?.total || 0) > 100;
      setNewCount(approxMore ? 99 : precise);
    } catch {}
  }, [API_BASE_URL, isAuthenticated, userId]);

 // count
const recomputePendingCount = useCallback(async () => {
  if (!isAuthenticated) { setPendingCount(0); return; }
  try {
    const token = getTokenGuard();
    const resp = await fetchJson(`${API_BASE_URL}${MOD_COUNT_EP}`, {}, token);
    setPendingCount(Number(resp?.pending || 0));
  } catch {}
}, [API_BASE_URL, isAuthenticated, MOD_COUNT_EP]);

  useEffect(() => {
    const tick = () => {
      recomputeNewCount();
      recomputePendingCount();
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [recomputeNewCount, recomputePendingCount]);

  // Option : SSE pour les updates live (activer avec VITE_NOTIF_SSE=1)
  // remplace le useEffect SSE :
useEffect(() => {
  if (!USE_SSE || !isAuthenticated) return;
  let es;
  try {
    es = new EventSource(`${API_BASE_URL}/notifications/stream`, { withCredentials: true });
    es.onmessage = (e) => {
      try {
        const { newCount: n, pending: p } = JSON.parse(e.data || '{}');
        if (typeof n === 'number') setNewCount(Math.min(99, n));
        if (typeof p === 'number') setPendingCount(Math.min(99, p));
      } catch {}
    };
    es.onerror = () => { es?.close(); };
  } catch {}
  return () => es?.close();
}, [USE_SSE, API_BASE_URL, isAuthenticated]);


  // Toggle + chargement au moment de l’ouverture
  const toggleNotifications = () => {
    setNotifOpen((prev) => {
      const next = !prev;
      if (next) {
        loadNews(1, true);
        loadPending(1, true);
        if (userId) {
          setLastSeenNow(userId);
          setNewCount(0);
        }
      }
      return next;
    });
  };

  const loadNews = async (page, replace = false) => {
    if (!isAuthenticated || !userId) return;
    const token = getTokenGuard();
    setNews((s) => ({ ...s, loading: true, error: null }));
    try {
      const resp = await fetchJson(
        `${API_BASE_URL}/users/${userId}/activities`,
        { per_page: 10, page },
        token
      );
      const items = Array.isArray(resp?.data) ? resp.data : [];
      setNews({
        items: replace ? items : [...(replace ? [] : news.items), ...items],
        page: resp?.meta?.current_page || page,
        last: resp?.meta?.last_page || page,
        loading: false,
        error: null,
      });
    } catch (e) {
      setNews((s) => ({
        ...s,
        loading: false,
        error: e?.message || 'Load failed',
      }));
    }
  };

  const loadPending = async (page, replace = false) => {
  if (!isAuthenticated) return;
  const token = getTokenGuard();
  setPending((s) => ({ ...s, loading: true, error: null }));
  try {
    const resp = await fetchJson(`${API_BASE_URL}${MOD_LIST_EP}`, { per_page: 10, page }, token);
    const raw = Array.isArray(resp?.data) ? resp.data : [];
    const items = raw.map((x) => ({ ...x }));
    setPending({
      items: replace ? items : [...(replace ? [] : pending.items), ...items],
      page: resp?.meta?.current_page || page,
      last: resp?.meta?.last_page || page,
      loading: false,
      error: null,
    });
  } catch (e) {
    setPending((s) => ({ ...s, loading: false, error: e?.message || 'Load failed' }));
  }
};

  const markAllRead = () => {
    if (userId) {
      setLastSeenNow(userId);
      setNewCount(0);
    }
  };

  // Click extérieur + fermeture sur Esc + gestion du focus pour le popover notifs
  useEffect(() => {
    const onClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (notifOpen && notifPanelRef.current) {
      notifPanelRef.current.querySelector('button, a')?.focus();
    } else if (!notifOpen && notifButtonRef.current) {
      notifButtonRef.current.focus();
    }
  }, [notifOpen]);

  /* ===== Profil popover a11y ===== */
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const profileButtonRef = useRef(null);
  const profilePanelRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target))
        setProfileOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (profileOpen && profilePanelRef.current) {
      profilePanelRef.current.querySelector('a, button')?.focus();
    } else if (!profileOpen && profileButtonRef.current) {
      profileButtonRef.current.focus();
    }
  }, [profileOpen]);

  /* ========================= Rendu ========================= */
  return (
    <div
      className={`grid h-screen w-full overflow-hidden bg-bgDefault
                  transition-[grid-template-columns] duration-300 ease-[cubic-bezier(.22,1,.36,1)]
                  ${isSidebarOpen ? 'grid-cols-[16rem_1fr]' : 'grid-cols-[0rem_1fr]'}`}
    >
      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`sidebar w-64 bg-white/80 backdrop-blur-xl flex-shrink-0 overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-64 w-0'
        } will-change-transform`}
        aria-hidden={!isSidebarOpen}
        role="navigation"
        aria-label={t('layout.a11y.sidebar', 'Navigation latérale')}
      >
        {/* Header sidebar aligné 64px */}
        <div className="px-5 min-h-16 flex items-center border-b border-white/20 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 text-white shadow-[inset_0_-1px_0_rgba(255,255,255,.15)]">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center mr-3 shadow-sm">
              <FaFolderOpen className="text-white" />
            </div>
            <div className="leading-tight">
              <h2 className="text-lg font-bold">{t('layout.brand')}</h2>
              <p className="text-[11px] text-white/80">{t('layout.subtitle')}</p>
            </div>
          </div>
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
                               hover:text-gray-800 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded-md"
                    aria-expanded={open}
                    aria-controls={`sec-${section.id}`}
                  >
                    <span>
                      {
                        t(section.titleKey, {
                          users: 'Utilisateurs & Accès',
                          media: 'Contenus & Médias',
                          settings: 'Système & Paramètres',
                        }[section.titleKey?.split('.').pop()] || undefined)
                      }
                    </span>
                    <FaChevronDown
                      className={`transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] ${
                        open ? 'rotate-0' : '-rotate-90'
                      }`}
                      aria-hidden
                    />
                  </button>
                )}

                <div
                  id={`sec-${section.id}`}
                  className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(.22,1,.36,1)] ${
                    open || isRoot ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-70'
                  }`}
                >
                  {/* SECTION SANS GROUPES */}
                  {section.items &&
                    !section.groups &&
                    section.items.map((item) => {
                      const ContentNode = ({ isActive }) => (
                        <div
                          className={`${menuItemClass(
                            item,
                            isActive,
                            'blue'
                          )} ${menuItemEmphasis(item, isActive)} ${menuItemCardLike(item)}`}
                        >
                          <Content
                            icon={item.icon}
                            labelKey={item.tKey}
                            fallback={
                              item.id === 'categoriesTags'
                                ? 'Catégories & Tags'
                                : undefined
                            }
                            t={t}
                            accentKey="blue"
                          />
                        </div>
                      );

                      return item.link ? (
                        <ActiveLink
                          key={item.id}
                          to={item.link}
                          exactFull={item.activeMode === 'full'}
                          className={({ isActive }) => 'block'}
                          onClick={() => setActiveTabId(item.id)}
                        >
                          {({ isActive }) => <ContentNode isActive={!!isActive} />}
                        </ActiveLink>
                      ) : (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveTabId(item.id);
                            item.onClick?.();
                          }}
                          className={`${menuItemClass(
                            item,
                            false,
                            'blue'
                          )} ${menuItemEmphasis(item, false)} ${menuItemCardLike(item)} focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded-md`}
                        >
                          <Content
                            icon={item.icon}
                            labelKey={item.tKey}
                            t={t}
                            accentKey="blue"
                          />
                        </button>
                      );
                    })}

                  {/* SECTION AVEC GROUPES */}
                  {section.groups &&
                    section.groups.map((group) => {
                      const gOpen = openSubSections[group.id] ?? true;
                      const accentKey = group.accent || 'blue';

                      return (
                        <div key={group.id} className="mb-2">
                          <button
                            type="button"
                            onClick={() => toggleSubSection(group.id)}
                            className="w-full flex items-center justify-between text-left px-3 py-2 mt-2 mb-1
                                     text-[11px] font-semibold uppercase tracking-wider
                                     text-gray-600 hover:text-gray-800 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded-md"
                            aria-expanded={gOpen}
                            aria-controls={`sub-${group.id}`}
                          >
                            <span>{group.title}</span>
                            <FaChevronDown
                              className={`transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] ${
                                gOpen ? 'rotate-0' : '-rotate-90'
                              }`}
                              aria-hidden
                            />
                          </button>

                          <div
                            id={`sub-${group.id}`}
                            className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(.22,1,.36,1)] ${
                              gOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-70'
                            }`}
                          >
                            {group.items.map((item) => {
                              const ContentNode = ({ isActive }) => (
                                <div
                                  className={`${menuItemClass(
                                    item,
                                    isActive,
                                    accentKey
                                  )} ${menuItemEmphasis(item, isActive)} ${menuItemCardLike(item)}`}
                                >
                                  <Content
                                    icon={item.icon}
                                    labelKey={item.tKey}
                                    t={t}
                                    accentKey={accentKey}
                                  />
                                </div>
                              );

                              return item.link ? (
                                <ActiveLink
                                  key={item.id}
                                  to={item.link}
                                  exactFull={item.activeMode === 'full'}
                                  className={({ isActive }) => 'block pl-2'}
                                  onClick={() => setActiveTabId(item.id)}
                                >
                                  {({ isActive }) => (
                                    <ContentNode isActive={!!isActive} />
                                  )}
                                </ActiveLink>
                              ) : (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setActiveTabId(item.id);
                                    item.onClick?.();
                                  }}
                                  className={`${menuItemClass(
                                    item,
                                    false,
                                    accentKey
                                  )} ${menuItemEmphasis(item, false)} ${menuItemCardLike(item)} focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded-md`}
                                >
                                  <Content
                                    icon={item.icon}
                                    labelKey={item.tKey}
                                    t={t}
                                    accentKey={accentKey}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>
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
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:bg-gray-100 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <FaSignOutAlt className="text-gray-600" />
            <span className="text-sm font-medium text-gray-800">
              {t('logout', 'Déconnexion')}
            </span>
          </button>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                {t('layout.storage.used')}
              </span>
              <span className="text-sm font-medium">42%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5" aria-hidden>
              <div
                className="bg-indigo-600 h-1.5 rounded-full"
                style={{ width: '42%' }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col relative z-[1]">
        {/* Header top aligné 64px */}
        <header className="relative z-40 bg-white/70 backdrop-blur-xl shadow-sm px-4 py-0 min-h-16 flex items-center justify-between border-b border-white/60">
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="mr-4 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 rounded-md p-2 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:bg-white"
              aria-label={
                isSidebarOpen
                  ? t('layout.a11y.closeSidebar')
                  : t('layout.a11y.openSidebar')
              }
              aria-expanded={isSidebarOpen}
              aria-controls="sidebar"
              title={
                isSidebarOpen
                  ? t('layout.a11y.closeSidebar')
                  : t('layout.a11y.openSidebar')
              }
            >
              <FaBars />
            </button>
            <div className="mx-2 w-px h-6 bg-gray-200" aria-hidden />

            <div>
              <h1 className="text-[22px] md:text-2xl font-extrabold text-gray-900 animate-fadeSlide tracking-tight">
                {title}
              </h1>
              {/* Breadcrumbs */}
              <nav
                className="text-sm text-gray-500 mt-0.5"
                aria-label="Breadcrumb"
              >
                <ol className="flex gap-1">
                  <li>
                    <Link to="/dashboard" className="hover:underline">
                      Dashboard
                    </Link>
                  </li>
                  <li aria-hidden>›</li>
                  <li className="truncate">{title}</li>
                </ol>
              </nav>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Chip nom user */}
            {isAuthenticated && (
              <div className="hidden sm:flex items-center">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                  {t('hello', 'Bonjour')}{' '}
                  {user?.username || user?.name || '—'}
                </span>
              </div>
            )}

            {/* Notifications */}
            {isAuthenticated && (
              <div className="relative z-50" ref={notifRef}>
                <button
                  ref={notifButtonRef}
                  onClick={toggleNotifications}
                  className="relative text-gray-700 hover:text-gray-900 transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] p-2 rounded-full hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  aria-haspopup="dialog"
                  aria-expanded={notifOpen}
                  aria-controls="notif-panel"
                  aria-label={t('layout.a11y.notifications')}
                >
                  <FaBell />
                  <span
                    className="sr-only"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {newCount + pendingCount} notifications
                  </span>
                  {(newCount > 0 || pendingCount > 0) && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-semibold rounded-full min-w-4 h-4 px-1 flex items-center justify-center animate-pulse-soft">
                      {newCount + pendingCount > 99
                        ? '99+'
                        : newCount + pendingCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div
                    id="notif-panel"
                    ref={notifPanelRef}
                    className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden z-[60] animate-dropIn"
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('notifications', 'Notifications')}
                  >
                    {/* Header en dégradé */}
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {t('notifications', 'Notifications')}
                        </span>
                        {newCount > 0 && (
                          <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                            {newCount}
                          </span>
                        )}
                        {pendingCount > 0 && (
                          <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                            {pendingCount} {t('to_moderate', 'à modérer')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setNotifOpen(false);
                            navigate('/settings');
                          }}
                          className="text-xs underline decoration-white/50 underline-offset-2 hover:decoration-white focus:outline-none focus:ring-2 focus:ring-white/30 rounded"
                        >
                          {t('see_all', 'Tout voir')}
                        </button>
                        <button
                          onClick={markAllRead}
                          className="text-xs bg-white/10 hover:bg-white/20 transition rounded-full px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-white/30"
                        >
                          {t('mark_all_read', 'Tout marquer lu')}
                        </button>
                      </div>
                    </div>

                    <div className="px-4 pt-3 flex gap-2">
                      <button
                        className={`px-3 py-1.5 rounded-full text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                          notifTab === 'news'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => setNotifTab('news')}
                      >
                        {t('activities', 'Activités')}
                      </button>
                      <button
                        className={`px-3 py-1.5 rounded-full text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                          notifTab === 'pending'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => setNotifTab('pending')}
                      >
                        {t('to_moderate', 'À modérer')}
                      </button>
                    </div>

                    <div className="max-h-96 overflow-auto scroll-area">
                      {notifTab === 'news' ? (
                        <>
                          {news.items.length === 0 && !news.loading && (
                            <div className="p-6 text-sm text-gray-500 flex items-center justify-center gap-2">
                              <span>🥳</span>{' '}
                              <span>
                                {t(
                                  'no_activity',
                                  'Aucune activité pour le moment'
                                )}
                              </span>
                            </div>
                          )}
                          {news.items.map((a) => {
                            const href =
                              toFrontPath(
                                buildActivityLink(a) || a.url || a.link
                              ) || '/settings';
                            const isRel = String(href).startsWith('/');
                            const Row = (
                              <div className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)]">
                                <div className="flex-shrink-0 w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600">
                                    {typeIconName(a.type)}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm text-gray-900 line-clamp-2">
                                    {a.title || t('notification', 'Notification')}
                                  </div>
                                  {a.subtitle && (
                                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                      {a.subtitle}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-400 mt-1">
                                    {timeAgo(a.created_at, t)}
                                  </div>
                                </div>
                              </div>
                            );
                            return isRel ? (
                              <Link
                                key={a.id}
                                to={href}
                                onClick={() => setNotifOpen(false)}
                              >
                                {Row}
                              </Link>
                            ) : (
                              <a
                                key={a.id}
                                href={href}
                                onClick={() => setNotifOpen(false)}
                                rel="noopener noreferrer"
                              >
                                {Row}
                              </a>
                            );
                          })}
                          <div className="p-3 border-t flex justify-center">
                            <button
                              disabled={news.loading || news.page >= news.last}
                              onClick={() => loadNews(news.page + 1)}
                              className={`text-sm px-3 py-1.5 rounded border transition focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                                news.page >= news.last
                                  ? 'text-gray-400 border-gray-200'
                                  : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {news.loading
                                ? t('loading', 'Chargement…')
                                : news.page < news.last
                                ? t('see_more', 'Voir plus')
                                : t('no_more', 'Fin')}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {pending.items.length === 0 && !pending.loading && (
                            <div className="p-6 text-sm text-gray-500 flex items-center justify-center gap-2">
                              <span>🧹</span>{' '}
                              <span>
                                {t('nothing_to_moderate', 'Rien à modérer')}
                              </span>
                            </div>
                          )}
                        {pending.items.map((p) => {
                            const hrefCandidate = buildPendingLink(p);
                            const href = toFrontPath(hrefCandidate) || '/settings';
                            const isRel = String(href).startsWith('/');

                            const Row = (
                              <div className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)]">
                                <div className="flex-shrink-0 w-9 h-9 bg-amber-50 rounded-full flex items-center justify-center">
                                  <span className="text-amber-600">💬</span>
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm text-gray-900 line-clamp-2">
                                    {p.title || t('pending_item','Élément à modérer')}
                                  </div>
                                  {p.subtitle && (
                                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                      {p.subtitle}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-400 mt-1">
                                    {timeAgo(p.created_at, t)}
                                  </div>
                                </div>
                              </div>
                            );

                            return isRel ? (
                              <Link key={p.id || `${p.article_slug}-${p.comment_id}`} to={href} onClick={() => setNotifOpen(false)}>
                                {Row}
                              </Link>
                            ) : (
                              <a key={p.id || `${p.article_slug}-${p.comment_id}`} href={href} onClick={() => setNotifOpen(false)} rel="noopener noreferrer">
                                {Row}
                              </a>
                            );
                          })}
                          <div className="p-3 border-t flex justify-center">
                            <button
                              disabled={
                                pending.loading || pending.page >= pending.last
                              }
                              onClick={() => loadPending(pending.page + 1)}
                              className={`text-sm px-3 py-1.5 rounded border transition focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                                pending.page >= pending.last
                                  ? 'text-gray-400 border-gray-200'
                                  : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pending.loading
                                ? t('loading', 'Chargement…')
                                : pending.page < pending.last
                                ? t('see_more', 'Voir plus')
                                : t('no_more', 'Fin')}
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
                ref={profileButtonRef}
                onClick={() => {
                  setProfileOpen((v) => !v);
                }}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/60 hover:border-blue-500 transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                aria-haspopup="dialog"
                aria-expanded={profileOpen}
                aria-controls="profile-panel"
                aria-label={t('layout.a11y.profile')}
                title={t('layout.a11y.profile')}
              >
                <img
                  src={avatarSrc}
                  alt="User"
                  className="w-full h-full object-cover"
                  onError={onAvatarError}
                />
              </button>

              <div
                id="profile-panel"
                ref={profilePanelRef}
                className={`absolute right-0 mt-2 bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 w-72 overflow-hidden z-[60] animate-dropIn
                  ${
                    profileOpen
                      ? 'opacity-100 visible translate-y-0'
                      : 'opacity-0 invisible -translate-y-1'
                  }`}
                role="dialog"
                aria-modal="true"
                aria-label={t('profile', 'Profil')}
              >
                <div className="px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white">
                  <div className="flex items-center gap-3">
                    <img
                      src={avatarSrc}
                      alt=""
                      className="w-9 h-9 rounded-full ring-2 ring-white/30 object-cover"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {user?.name || t('profile', 'Profil')}
                      </div>
                      <div className="text-xs text-white/80 truncate">
                        {user?.email || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                <Link
                  to="/settings"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-gray-800 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  onClick={() => setProfileOpen(false)}
                >
                  <FaUser className="text-blue-600" />
                  <span>{t('profile', 'Profil')}</span>
                </Link>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-gray-800 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] text-left focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <FaSignOutAlt className="text-blue-600" />
                  <span>{t('logout', 'Déconnexion')}</span>
                </button>
              </div>
            </div>

            {/* Langue (toggle) */}
            <LanguageSelector />
          </div>
        </header>

        <main className="bg-bgDefault p-6 overflow-y-auto relative z-10 scroll-area">
          <Boundary>
            <Outlet context={{ setTitle }} />
          </Boundary>
        </main>
      </div>

      {/* Animations + scrollbar + reduced motion */}
      <style>{`
        :root { --easing: cubic-bezier(.22,1,.36,1); }

        @keyframes fadeSlide {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeSlide { animation: fadeSlide .4s var(--easing) both; }

        @keyframes dropIn {
          0% { opacity: 0; transform: translateY(-6px) scale(.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-dropIn { animation: dropIn .18s var(--easing) both; }

        @keyframes pulseSoft {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,.5); }
          50% { transform: scale(1.06); box-shadow: 0 0 0 4px rgba(239,68,68,.15); }
        }
        .animate-pulse-soft { animation: pulseSoft 1.6s ease-in-out infinite; }

        .sidebar::-webkit-scrollbar,
        .scroll-area::-webkit-scrollbar { width: 8px; height: 8px; }
        .sidebar::-webkit-scrollbar-thumb,
        .scroll-area::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(99,102,241,.35), rgba(59,130,246,.35));
          border-radius: 8px;
        }
        .sidebar::-webkit-scrollbar-track,
        .scroll-area::-webkit-scrollbar-track { background: transparent; }

        /* Accessibilité: reduced motion */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;
