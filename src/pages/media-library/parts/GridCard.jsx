// src/media-library/parts/GridCard.jsx
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from "react-router-dom";
import {
  FaRegStar, FaStar, FaEye, FaUser,
  FaHeart, FaRegHeart, FaTag, FaLockOpen, FaLock,
  FaEllipsisV, FaExternalLinkAlt, FaCopy, FaLink,
} from "react-icons/fa";
import { FaComment, FaShareAlt, FaTimes } from "react-icons/fa";
import SmartImage from "./SmartImage";
import ShareButton from "../Visualiseur/share/ShareButton";
import { cls } from "../shared/utils/format";
import { isFav as localIsFav, toggleFav as localToggleFav, isRead, markRead } from "../shared/store/markers";
import api from '../../../services/api';

// ✅ Modal & pass memory
import PasswordModal from "../components/PasswordModal";
import { getStoredPassword, setStoredPassword } from "../utils/passwordGate";

/* =========================
   NEW: Icônes catégorie (FontAwesome)
========================= */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar as faFaStar, faBook, faLeaf, faHeart as faFaHeart, faCoffee, faCamera,
  faGlobe, faMusic, faPen, faFilm, faFolder, faCode, faChartPie,
  faBriefcase, faCar, faLaptop, faGamepad, faShoppingCart,
  faBicycle, faPlane, faTree, faUserFriends, faHandshake,
  faBell, faFlag, faTools, faLightbulb, faMicrochip, faCloud, faGift
} from "@fortawesome/free-solid-svg-icons";

/* =========================
   Utils chemin image
========================= */
const fixFeaturedPath = (u) => {
  if (!u) return u;
  let s = String(u).trim();
  if (/^https?:\/\//i.test(s)) return s;
  s = s.replace(/^\/+/, "");
  if (s.startsWith("storage/")) return s;
  if (s.startsWith("articles/featured/")) return `storage/${s}`;
  return s;
};

const toAbsolute = (u) => {
  if (!u) return null;
  const fixed = fixFeaturedPath(u);
  if (/^https?:\/\//i.test(fixed)) return fixed;
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/i, "");
  return base ? `${base}/${fixed.replace(/^\/+/, "")}` : `/${fixed.replace(/^\/+/, "")}`;
};

/* =========================
   Helpers UI/Access
========================= */
function getCategoryFromTitle(title) {
  const s = String(title || "").toLowerCase();
  if (s.includes("intelligence artificielle") || s.includes("ia")) return "Intelligence Artificielle";
  if (s.includes("startup")) return "Startup";
  if (s.includes("développement") || s.includes("web")) return "Développement Web";
  if (s.includes("marketing")) return "Business";
  if (s.includes("technologie")) return "Mobile";
  return "Article";
}

const cleanSlug = (x) => {
  const s = (x ?? '').toString().trim();
  if (!s || s === 'undefined' || s === 'null') return null;
  return s;
};

const VISUALISEUR_BASE = "/media-library";
const buildVisualiserPath = (base, rec) => {
  const slug = cleanSlug(rec?.slug);
  const id   = rec?.id != null ? String(rec.id) : null;
  const key  = slug || id || '';
  return `${base || VISUALISEUR_BASE}/${encodeURIComponent(key)}`;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const canHover = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(hover: hover)").matches;

/* =========================
   Impression tracker (hook)
========================= */
function useImpression(onSeen, once = true, threshold = 0.5) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let done = false;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && (!done || !once)) {
        onSeen?.(); done = true;
      }
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [onSeen, once, threshold]);
  return ref;
}

/* =========================
   Visibilité helpers
========================= */
const isPrivate = (v) => String(v || "").toLowerCase() === "private";
const isPwdProtected = (v) => {
  if (v === true || v === 1 || v === 2) return true; // l'API peut renvoyer bool/int
  const k = String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ["password_protected", "password", "protected", "protected_by_password"].includes(k);
};
const humanizeVisibility = (v, t) => {
  const k = String(v || "").toLowerCase();
  if (k === "public") return t('gridcard.visibility.public');
  if (isPrivate(k)) return t('gridcard.visibility.private');
  if (isPwdProtected(k)) return t('gridcard.visibility.passwordProtected');
  return v || t('gridcard.visibility.unknown');
};

/* =========================
   Constantes UI (fallbacks)
========================= */
const CATEGORY_COLORS = {
  "Développement Web": "from-amber-500/20 to-amber-600/30",
  "Intelligence Artificielle": "from-emerald-500/20 to-emerald-600/30",
  "Business": "from-red-500/20 to-red-600/30",
  "Mobile": "from-purple-500/20 to-purple-600/30",
  "Startup": "from-cyan-500/20 to-cyan-600/30",
  "Santé": "from-orange-500/20 to-orange-600/30",
  "Voyage": "from-teal-500/20 to-teal-600/30",
  default: "from-slate-500/20 to-slate-600/30",
};

const CATEGORY_BORDER_COLORS = {
  "Développement Web": "border-amber-200/50 group-hover:border-amber-300/70",
  "Intelligence Artificielle": "border-emerald-200/50 group-hover:border-emerald-300/70",
  "Business": "border-red-200/50 group-hover:border-red-300/70",
  "Mobile": "border-purple-200/50 group-hover:border-purple-300/70",
  "Startup": "border-cyan-200/50 group-hover:border-cyan-300/70",
  "Santé": "border-orange-200/50 group-hover:border-orange-300/70",
  "Voyage": "border-teal-200/50 group-hover:border-teal-300/70",
  default: "border-slate-200/50 group-hover:border-slate-300/70",
};

/* =========================
   NEW: helpers couleur & icônes
========================= */
const ICON_MAP = {
  "fa-star": faFaStar, "fa-book": faBook, "fa-leaf": faLeaf, "fa-heart": faFaHeart,
  "fa-coffee": faCoffee, "fa-camera": faCamera, "fa-globe": faGlobe,
  "fa-music": faMusic, "fa-pen": faPen, "fa-film": faFilm, "fa-folder": faFolder,
  "fa-code": faCode, "fa-chart-pie": faChartPie, "fa-briefcase": faBriefcase,
  "fa-car": faCar, "fa-laptop": faLaptop, "fa-gamepad": faGamepad,
  "fa-shopping-cart": faShoppingCart, "fa-bicycle": faBicycle, "fa-plane": faPlane,
  "fa-tree": faTree, "fa-user-friends": faUserFriends, "fa-handshake": faHandshake,
  "fa-bell": faBell, "fa-flag": faFlag, "fa-tools": faTools,
  "fa-lightbulb": faLightbulb, "fa-microchip": faMicrochip, "fa-cloud": faCloud,
  "fa-gift": faGift,
};

function hexToRgb(hex) {
  if (!hex) return { r: 100, g: 116, b: 139 }; // slate-500
  const m = hex.trim().replace('#','');
  const n = m.length === 3
    ? m.split('').map(x => x + x).join('')
    : m.padEnd(6, '0').slice(0,6);
  const r = parseInt(n.slice(0,2), 16);
  const g = parseInt(n.slice(2,4), 16);
  const b = parseInt(n.slice(4,6), 16);
  return { r, g, b };
}
function rgba(hex, a = 1) {
  const { r, g, b } = hexToRgb(hex || '#64748b');
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function readableTextColor(hex) {
  const { r, g, b } = hexToRgb(hex || '#64748b');
  const yiq = (r*299 + g*587 + b*114) / 1000;
  return yiq >= 140 ? '#0f172a' : '#ffffff';
}

/** Récupère la couleur & icône depuis:
 *  1) item.color / item.icon
 *  2) catégorie primaire (pivot.is_primary===1) ou première catégorie
 *  3) fallback: mapping heuristique (titre)
 */
function deriveToneAndIcon(item) {
  let tone = item?.color || null;
  let iconKey = item?.icon || null;

  if ((!tone || !iconKey) && Array.isArray(item?.categories) && item.categories.length) {
    const primary = item.categories.find(c => c?.pivot?.is_primary === 1) || item.categories[0];
    if (!tone && primary?.color) tone = primary.color;
    if (!iconKey && primary?.icon) iconKey = primary.icon;
  }

  if (!tone) tone = "#64748b"; // slate
  if (!iconKey) iconKey = "fa-folder";

  return { tone, iconKey };
}

/* =========================
   Composant
========================= */
export default function GridCard({ item, routeBase, onOpen }) {
  const { t, i18n } = useTranslation();
  const itemKey = useMemo(
    () => (cleanSlug(item?.slug) ?? (item?.id != null ? String(item.id) : "unknown")),
    [item?.slug, item?.id]
  );
  const navigate = useNavigate();
  const to = useMemo(() => buildVisualiserPath(routeBase, item), [routeBase, item?.slug, item?.id]);

  // local fallback (ancien store)
  const [fav, setFav] = useState(() => localIsFav(item.id));
  const [read, setRead] = useState(() => isRead(item.id));
  const [isHovered, setIsHovered] = useState(false);
  const [liked, setLiked] = useState(false);

  // counts
  const [likesCount, setLikesCount] = useState(item.likes_count ?? 0);
  const [favoritesCount, setFavoritesCount] = useState(item.favorites_count ?? 0);

  // menu trois points
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);   // ref du bouton (pour outside click)
  const menuPanelRef  = useRef(null);   // ref du panel (pour outside click)
  const [menuIndex, setMenuIndex] = useState(0);

  // ✅ modal pwd
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdDefault, setPwdDefault] = useState("");

  // ===== Couleur & icône dynamiques (discrets) =====
  const { tone, iconKey } = useMemo(() => deriveToneAndIcon(item), [item]);
  const FA_ICON = ICON_MAP[iconKey] || faFolder;

  // 🎨 Préférence couleur (synchro via event global, bouton retiré de l'UI)
  const COLOR_PREF_KEY = "gridcard-color-enabled";
  const [colorEnabled, setColorEnabled] = useState(() => {
    try {
      const raw = localStorage.getItem(COLOR_PREF_KEY);
      return raw == null ? true : JSON.parse(raw);
    } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem(COLOR_PREF_KEY, JSON.stringify(colorEnabled)); } catch {}
  }, [colorEnabled]);
  useEffect(() => {
    const handler = (e) => {
      const enabled = e?.detail?.enabled;
      if (typeof enabled === "boolean") setColorEnabled(enabled);
    };
    window.addEventListener("gridcard:colorpref", handler);
    return () => window.removeEventListener("gridcard:colorpref", handler);
  }, []);

  // Teinte effective (neutre si désactivée)
  const effectiveTone = colorEnabled ? tone : "#64748b";

  // teintes discrètes (fond dominant sobre)
  const bgBase = rgba(effectiveTone, 0.08);
  const bgHover = rgba(effectiveTone, 0.16);
  const borderSoft = rgba(effectiveTone, 0.30);
  const topBar = rgba(effectiveTone, 0.25);
  const mediaTint = rgba(effectiveTone, 0.10);
  const iconBadgeBg = rgba(effectiveTone, 0.12);
  const textOnTone = readableTextColor(effectiveTone);

  // Fallback classes
  const primaryCategory = getCategoryFromTitle(item.title);
  const borderColorClass = (CATEGORY_BORDER_COLORS[primaryCategory] || CATEGORY_BORDER_COLORS.default);

  const authorName = useMemo(() => {
    const full = (...xs) => xs.filter(Boolean).join(" ").trim();
    let name =
      item.author_name ||
      item.author?.name ||
      full(item.author?.first_name, item.author?.last_name) ||
      item.createdBy?.name ||
      full(item.created_by?.first_name, item.created_by?.last_name);
    if (!name && item.author_id) name = `Auteur #${item.author_id}`;
    return name || t('gridcard.unknownAuthor');
  }, [item.author_name, item.author, item.createdBy, item.created_by, item.author_id, t]);

  const nf = useMemo(() => new Intl.NumberFormat(i18n.language, { notation: "compact", maximumFractionDigits: 1 }), [i18n.language]);
  const df = useMemo(() => new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short", year: "numeric" }), [i18n.language]);

  const readingTime = useMemo(() => {
    if (item.reading_time) return item.reading_time;
    const wc = item.word_count ?? (typeof item.content === "string" ? item.content.trim().split(/\s+/).length : 0);
    return Math.max(1, Math.round(wc / 200));
  }, [item.reading_time, item.word_count, item.content]);

  const imgUrl = useMemo(() => {
    if (item.featured_image_url) return toAbsolute(item.featured_image_url);
    if (typeof item.featured_image === "string") return toAbsolute(item.featured_image);
    if (item.featured_image?.url) return toAbsolute(item.featured_image.url);
    if (item.featured_image?.path) return toAbsolute(item.featured_image.path);
    if (Array.isArray(item.media) && item.media[0]?.url) return toAbsolute(item.media[0].url);
    return null;
  }, [item.featured_image_url, item.featured_image, item.media]);

  const formattedViewCount = useMemo(() => nf.format(Number(item.view_count || 0)), [nf, item.view_count]);
  const formattedRating    = useMemo(() => (item.rating_average ? Number(item.rating_average).toFixed(1) : "0,0"), [item.rating_average]);
  const formattedDate      = useMemo(() => (item.published_at ? df.format(new Date(item.published_at)) : t('gridcard.date.unknown')), [df, item.published_at, t]);

  const visLabel = useMemo(() => humanizeVisibility(item.visibility, t), [item.visibility, t]);

  const motionless = prefersReducedMotion();
  const hoverCls   = motionless ? "" : "hover:-translate-y-2 hover:scale-[1.01]";

  const cardClass = cls(
    "group relative rounded-3xl border",
    "shadow-sm overflow-hidden transition-all duration-500",
    "w-full max-w-none min-w-[400px]",
    hoverCls,
    borderColorClass
  );

  const overlayBtnClass = cls(
    "p-5 bg-white/95 hover:bg-white text-slate-700 rounded-2xl shadow-xl",
    "transition-all duration-300 transform hover:scale-110"
  );

  const smallStatBox = "rounded-lg p-2 text-center";

  // ---------------------------
  // API helper: toggle reaction
  // ---------------------------
  const apiToggleReaction = useCallback(async ({ type, action = 'toggle' }) => {
    try {
      const resp = await api.post('/reactions/toggle', {
        reactable_type: 'Article',
        reactable_id: item.id,
        type,
        action
      });
      return resp.data;
    } catch (err) {
      throw err;
    }
  }, [item.id]);

  // fetch initial counts + user reactions
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cResp = await api.get('/reactions/counts', { params: { reactable_type: 'Article', 'ids[]': [item.id] }});
        if (!mounted) return;
        const map = cResp.data || {};
        if (map[item.id]) {
          setLikesCount(map[item.id].likes ?? 0);
          setFavoritesCount(map[item.id].favorites ?? 0);
        } else {
          setLikesCount(prev => prev ?? (item.likes_count ?? 0));
          setFavoritesCount(prev => prev ?? (item.favorites_count ?? 0));
        }
      } catch (_) {}

      try {
        const meResp = await api.get('/reactions/me', { params: { reactable_type: 'Article', 'ids[]': [item.id] }});
        if (!mounted) return;
        const userMap = meResp.data || {};
        const s = userMap[item.id] || {};
        setLiked(Boolean(s.liked));
        setFav(Boolean(s.favorited));
      } catch (_) {
        setLiked(false);
      }
    })();

    return () => { mounted = false; };
  }, [item.id, item.likes_count, item.favorites_count]);

  // Toggle favorite
  const onToggleFav = useCallback(async (e) => {
    e.stopPropagation();
    const prev = fav;
    const prevCount = favoritesCount;
    setFav(v => !v);
    setFavoritesCount(c => (fav ? Math.max(0, c - 1) : c + 1));

    try {
      const data = await apiToggleReaction({ type: 'favorite', action: 'toggle' });
      setFav(Boolean(data.user?.favorited));
      if (data.counts?.favorites != null) setFavoritesCount(data.counts.favorites);
      try { localToggleFav(item.id); } catch {}
    } catch (err) {
      setFav(prev);
      setFavoritesCount(prevCount);
    }
  }, [fav, favoritesCount, item.id, apiToggleReaction]);

  // Like (optionnel)
  const onToggleLike = useCallback(async (e) => {
    e.stopPropagation();
    const prev = liked;
    const prevCount = likesCount;
    setLiked(l => !l);
    setLikesCount(c => (liked ? Math.max(0, c - 1) : c + 1));

    try {
      const data = await apiToggleReaction({ type: 'like', action: 'toggle' });
      setLiked(Boolean(data.user?.liked));
      if (data.counts?.likes != null) setLikesCount(data.counts.likes);
    } catch (err) {
      setLiked(prev);
      setLikesCount(prevCount);
    }
  }, [liked, likesCount, apiToggleReaction]);

  const onOpenCard = useCallback(() => {
    try { markRead(item.id); } catch {}
    setRead(true);
    if (typeof onOpen === "function") onOpen(item);
    else navigate(to);
  }, [item, onOpen, navigate, to]);

  const prefetchDetail = useCallback(() => {
    if (imgUrl) { const im = new Image(); im.src = imgUrl; }
    try {
      const l = document.createElement("link");
      l.rel = "prefetch";
      l.href = to;
      document.head.appendChild(l);
    } catch {}
  }, [imgUrl, to]);

  // ✅ Lecture : Private vs Password
  const handleRead = useCallback((e) => {
    if (isPwdProtected(item.visibility)) {
      e?.preventDefault?.();
      const current = getStoredPassword(item.slug || item.id) || "";
      setPwdDefault(current);
      setPwdOpen(true);
      return;
    }
    if (isPrivate(item.visibility)) {
      e?.preventDefault?.();
      onOpenCard();
      return;
    }
    onOpenCard();
  }, [item.visibility, item.slug, item.id, onOpenCard]);

  const submitPwd = useCallback((pwd) => {
    setStoredPassword(item.slug || item.id, pwd);
    setPwdOpen(false);
    onOpenCard();
  }, [item.slug, item.id, onOpenCard]);

  const impressionRef = useImpression(() => {
    window.dispatchEvent(new CustomEvent("gridcard:seen", { detail: { id: item.id } }));
  });

  const shareUrl = (item.url || (typeof window !== "undefined" ? `${window.location.origin}${to}` : to));

  const openPwdManually = useCallback((e) => {
    e?.stopPropagation?.();
    const current = getStoredPassword(item.slug || item.id) || "";
    setPwdDefault(current);
    setPwdOpen(true);
  }, [item.slug, item.id]);

  // ---------------------------
  // Handlers du menu (déclarés AVANT le modèle)
  // ---------------------------
  const onOpenInNewTab = useCallback((e) => {
    e.stopPropagation();
    window.open(shareUrl, '_blank', 'noopener');
    setMenuOpen(false);
  }, [shareUrl]);

  const onCopyLink = useCallback(async (e) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = shareUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setMenuOpen(false);
    } catch {
      setMenuOpen(false);
    }
  }, [shareUrl]);

  const onShareOpen = useCallback((e) => {
    e.stopPropagation();
    setMenuOpen(false);
    window.open(`mailto:?subject=${encodeURIComponent(item.title || '')}&body=${encodeURIComponent(shareUrl)}`, '_self');
  }, [shareUrl, item.title]);

  // ---------------------------
  // Modèle de menu (mémoïsé)
  // ---------------------------
  const menuModel = useMemo(() => ([
    {
      id: "open",
      icon: FaExternalLinkAlt,
      label: t('gridcard.menu.openNewTab') || 'Ouvrir dans un nouvel onglet',
      action: onOpenInNewTab,
    },
    { type: "sep", id: "sep-1" },
    {
      id: "copy",
      icon: FaCopy,
      label: t('gridcard.menu.copyLink') || 'Copier le lien',
      action: onCopyLink,
    },
    { type: "sep", id: "sep-2" },
    {
      id: "share",
      icon: FaLink,
      label: t('gridcard.menu.share') || 'Partager',
      action: onShareOpen,
    },
  ]), [t, onOpenInNewTab, onCopyLink, onShareOpen]);

  // Navigation clavier
  const onMenuKeyDown = useCallback((e) => {
    const actions = menuModel.filter(m => !m.type);
    if (e.key === "Escape") { setMenuOpen(false); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMenuIndex(i => (i + 1) % actions.length);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setMenuIndex(i => (i - 1 + actions.length) % actions.length);
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      actions[menuIndex]?.action?.(e);
      setMenuOpen(false);
    }
  }, [menuModel, menuIndex]);

  // menu outside-click
  useEffect(() => {
    function onDocClick(e) {
      const btn = menuButtonRef.current;
      const panel = menuPanelRef.current;
      if (!btn && !panel) return;
      const target = e.target;
      const clickInsideButton = btn && btn.contains(target);
      const clickInsidePanel  = panel && panel.contains(target);
      if (!clickInsideButton && !clickInsidePanel) setMenuOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);
function StatPill({ icon, value, tone = "slate", suffix = "" }) {
  const toneMap = tone === "orange"
    ? {
        bg: "rgba(251,146,60,.12)",
        border: "rgba(251,146,60,.09)",
        icon: "#f59e0b",   // orange-500
        text: "#7c2d12",   // orange-900-ish
      }
    : {
        bg: "rgba(15,23,42,.02)",   // slate soft
        border: "rgba(15,23,42,.09)",
        icon: "#475569",            // slate-600
        text: "#0f172a",            // slate-900
      };

  return (
    <div
      className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 select-none"
      style={{ backgroundColor: toneMap.bg, border: `1px solid ${toneMap.border}` }}
      role="group"
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg"
            style={{ color: toneMap.icon, backgroundColor: "rgba(255,255,255,.6)" }}>
        {icon}
      </span>
      <span className="text-sm font-semibold" style={{ color: toneMap.text }}>
        {value}{suffix}
      </span>
    </div>
  );
}

  return (
    <>
      <article
        ref={impressionRef}
        role="article"
        aria-labelledby={`t-${item.id}`}
        className={cardClass}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={item.title}
        data-testid={`gridcard-${item.id}`}
        style={{
          borderColor: borderSoft,
          background: `linear-gradient(180deg, ${isHovered ? bgHover : bgBase} 0%, rgba(255,255,255,0.92) 65%)`,
        }}
      >
        {/* Barre supérieure */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: topBar }} />

        {/* --- Media --- */}
        <div
          className="relative h-64 flex items-center justify-center overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${mediaTint} 0%, rgba(255,255,255,0.6) 100%)` }}
        >
          {imgUrl ? (
            <>
              <SmartImage
                src={imgUrl}
                alt={item.title}
                ratio="100%"
                modern="off"
                className="transition-all duration-500 group-hover:scale-[1.03] group-hover:brightness-[1.03] group-hover:saturate-[1.03]"
              />

              {/* Overlay clair */}
              <div
                className={cls(
                  "absolute inset-0 bg-white/55 backdrop-blur-sm flex items-center justify-center gap-6 transition-all duration-300",
                  canHover() ? (isHovered ? "opacity-100" : "opacity-0 pointer-events-none") : "opacity-100"
                )}
                aria-hidden={canHover() ? !isHovered : false}
              >
                {/* Lire */}
                <Link
                  to={to}
                  onMouseEnter={prefetchDetail}
                  onClick={handleRead}
                  className={cls(overlayBtnClass, "hover:text-blue-600")}
                  title={t('gridcard.actions.read')}
                >
                  <FaEye size={22} />
                </Link>

                {/* 🔒 Bouton mot de passe */}
                {isPwdProtected(item.visibility) && (
                  <button
                    className={cls(overlayBtnClass, "hover:text-rose-600")}
                    onClick={openPwdManually}
                    title={t('gridcard.actions.enterPassword')}
                  >
                    <FaLock size={20} />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-slate-400 transition-all duration-300 transform group-hover:scale-110 relative text-6xl">📝</div>
          )}

          {/* Pastille icône */}
          <div
            className="absolute bottom-3 right-3 z-20 w-10 h-10 rounded-xl flex items-center justify-center shadow"
            style={{ backgroundColor: iconBadgeBg, border: `1px solid ${rgba(effectiveTone, .18)}` }}
            title={iconKey}
          >
            <FontAwesomeIcon icon={FA_ICON} className="text-xl" style={{ color: effectiveTone }} />
          </div>

          {/* Badge Visibilité */}
          {item.visibility && item.visibility !== "public" && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/95 border border-slate-200/70 text-slate-800 shadow">
                {isPrivate(item.visibility) ? <FaLock /> : <FaLockOpen />}
                {humanizeVisibility(item.visibility, t)}
              </span>
            </div>
          )}

          {/* Buttons top right: share + menu */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <ShareButton
              variant="icon"
              className="p-2 rounded-xl bg-white/95 text-slate-700 shadow hover:scale-105 transition-transform"
              title={item.title}
              excerpt={item.excerpt}
              url={shareUrl}
              articleId={item.id}
              channels={["email", "emailAuto","facebook", "whatsapp", "whatsappNumber"]}
              emailEndpoint="/share/email"
              defaultWhatsNumber="33612345678"
              global={false}
            />

            <div className="relative" ref={menuButtonRef}>
              <button
                aria-haspopup="true"
                aria-expanded={menuOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuIndex(0);
                  setMenuOpen(v => !v);
                }}
                className="p-2 rounded-xl bg-white/95 text-slate-700 shadow hover:scale-105 transition-transform"
                title={t('gridcard.actions.more')}
              >
                <FaEllipsisV size={16} />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  aria-label="Card actions"
                  ref={menuPanelRef}
                  tabIndex={0}
                  onKeyDown={onMenuKeyDown}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpen(false);
                  }}
                  className={[
                    "absolute right-0 mt-2 z-30",
                    "origin-top-right select-none",
                    "min-w-52 rounded-2xl border border-slate-200/60",
                    "bg-white/90 backdrop-blur-xl",
                    "shadow-[0_12px_40px_-12px_rgba(2,6,23,0.18)]",
                    "ring-1 ring-white/50",
                    "data-[state=open]:animate-[fadeIn_.18s_ease-out]",
                    "data-[state=open]:scale-100 scale-95",
                    "overflow-hidden"
                  ].join(" ")}
                  data-state="open"
                  style={{ willChange: "transform, opacity" }}
                >
                  {/* caret */}
                  <div
                    className="absolute -top-2 right-6 w-3 h-3 rotate-45 bg-white/90 border border-slate-200/60 border-b-0 border-r-0"
                    aria-hidden
                  />
                  {/* titre subtil */}
                  <div className="px-3.5 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-slate-500/80">
                    {t('gridcard.menu.title') || 'Actions'}
                  </div>

                  {/* items */}
                  <div className="py-1.5">
                    {menuModel.map((m) => {
                      if (m.type === "sep") return <div key={m.id} className="my-1 h-px bg-slate-100/80" />;
                      const Icon = m.icon;
                      // calcul d'index pour focus-style
                      const idxAmongActions = menuModel.filter(x => !x.type).findIndex(x => x.id === m.id);
                      const focused = (menuIndex === idxAmongActions);
                      return (
                        <button
                          key={m.id}
                          role="menuitem"
                          onClick={(e) => { m.action?.(e); setMenuOpen(false); }}
                          className={[
                            "w-full text-left",
                            "px-3.5 py-2.5",
                            "flex items-center gap-2.5",
                            "text-[13px] font-medium",
                            "text-slate-700",
                            "transition-colors",
                            "hover:bg-slate-50/80 focus:bg-slate-50/90",
                            "outline-none",
                            focused ? "ring-2 ring-blue-200/70" : ""
                          ].join(" ")}
                        >
                          <span className="inline-flex items-center justify-center w-6">
                            <Icon className="opacity-80" size={13} />
                          </span>
                          <span className="flex-1">{m.label}</span>
                          {m.id === "copy" && (
                            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                              Ctrl+C
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Coins : favoris / like */}
          <div className="absolute top-4 left-4 flex gap-2 z-20">
            <button
              aria-label={fav ? t('gridcard.actions.removeFavorite') : t('gridcard.actions.addFavorite')}
              aria-pressed={fav}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggleFav(e)}
              onClick={onToggleFav}
              className={cls(
                "p-3 rounded-xl transition-all duration-300 shadow backdrop-blur-md transform hover:scale-105 flex items-center gap-2",
                fav
                  ? "text-amber-500 bg-amber-50/90 hover:bg-amber-100/90"
                  : "text-slate-500 bg-white/90 hover:bg-white hover:text-amber-500"
              )}
              title={fav ? t('gridcard.actions.removeFavorite') : t('gridcard.actions.addFavorite')}
              data-testid="btn-fav"
            >
              {fav ? <FaStar size={18} /> : <FaRegStar size={18} />}
              <span className="text-xs font-semibold select-none">{favoritesCount ?? 0}</span>
            </button>
            {/* Like (optionnel, laissé en commentaire)
            <button ...>...</button>
            */}
          </div>
        </div>

        {/* --- Contenu --- */}
        <div className="relative p-6">
          <div className="flex gap-8">
            {/* Texte principal */}
            <div className="flex-1">
              <div className="mb-4">
                <h4 id={`t-${item.id}`} className="font-bold text-slate-900 text-xl leading-tight line-clamp-2 group-hover:text-slate-700 transition-colors mb-2" title={item.title}>
                  {item.title}
                </h4>

                {item.excerpt && <p className="text-slate-600 text-sm line-clamp-2 mb-3">{item.excerpt}</p>}

                <div className="flex items-center gap-3 mt-2">
                  {fav && (
                    <div
                      className="flex items-center gap-2 rounded-full px-3 py-1"
                      style={{ backgroundColor: rgba(effectiveTone, 0.15), color: textOnTone, border: `1px solid ${rgba(effectiveTone, 0.25)}` }}
                    >
                      <FaStar size={12} />
                      <span className="text-xs font-semibold">{t('gridcard.badges.favorite')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <Link
                  to={to}
                  onClick={handleRead}
                  onMouseEnter={prefetchDetail}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold text-sm transition-all duration-300 transform hover:scale-[1.02] shadow"
                >
                  <FaEye size={14} />
                  <span>{t('gridcard.actions.read')}</span>
                </Link>

                {read && (
                  <div className="flex items-center gap-2 rounded-full px-4 py-2" style={{ backgroundColor: rgba("#10b981", .15), border: "1px solid rgba(16,185,129,.25)", color: "#065f46" }}>
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-semibold">{t('gridcard.badges.read')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Méta compacte */}
            <div className="w-44 space-y-3">
              <div className="space-y-2">
                {/* Auteur */}
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(15,23,42,.04)" }}>
                  <div className="p-1.5 rounded" style={{ backgroundColor: "rgba(15,23,42,.06)" }}>
                    <FaUser className="text-slate-600" size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-800 text-xs block truncate overflow-auto">{authorName}</span>
                    <p className="text-slate-600 text-xs overflow-auto">{item.author?.email || t('gridcard.author')}</p>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(15,23,42,.04)" }}>
                  <div className="p-1.5 rounded" style={{ backgroundColor: "rgba(15,23,42,.06)" }}>
                    <FaTag className="text-slate-600" size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-800 text-xs block truncate">{formattedDate}</span>
                    <p className="text-slate-600 text-xs">
                      {item.updated_at !== item.created_at ? t('gridcard.date.updated') : t('gridcard.date.published')}
                    </p>
                  </div>
                </div>

                {/* Visibilité */}
                {item.visibility && item.visibility !== "public" && (
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{
                      backgroundColor: isPrivate(item.visibility) ? "rgba(244,63,94,.08)" : "rgba(37,99,235,.08)",
                      border: `1px solid ${isPrivate(item.visibility) ? "rgba(244,63,94,.15)" : "rgba(37,99,235,.15)"}`
                    }}
                  >
                    <div className="p-1.5 rounded" style={{ backgroundColor: isPrivate(item.visibility) ? "rgba(244,63,94,.18)" : "rgba(37,99,235,.18)" }}>
                      {isPrivate(item.visibility) ? <FaLock className="text-rose-700" size={12} /> : <FaLockOpen className="text-blue-700" size={12} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`font-semibold text-xs block truncate ${isPrivate(item.visibility) ? "text-rose-800" : "text-blue-800"}`}>
                        {humanizeVisibility(item.visibility, t)}
                      </span>
                      <p className={`${isPrivate(item.visibility) ? "text-rose-700" : "text-blue-700"} text-xs`}>{t('gridcard.visibility.label')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
          {/* Stats — compact, valeurs visibles, icônes neutres (rating orange) */}
          <div className="px-8 relative pt-3 pb-5  bottom-0 left-0 " style={{ borderColor: borderSoft, backgroundColor: rgba("#ffffff", 0.95) }}>
            <div className="flex flex-row items-center  w-full justify-between">
              {/* Vues (neutre) */}
              <StatPill
                icon={<FaEye size={14} />}
                value={formattedViewCount}
                tone="slate"
              />

              {/* Commentaires (neutre) */}
              {item.comment_count !== undefined && (
                <StatPill
                  icon={<FaComment size={14} />}
                  value={new Intl.NumberFormat(i18n.language, { notation: "compact", maximumFractionDigits: 1 }).format(item.comment_count || 0)}
                  tone="slate"
                />
              )}

              {/* Partages (neutre) */}
              {item.share_count !== undefined && (
                <StatPill
                  icon={<FaShareAlt size={14} />}
                  value={new Intl.NumberFormat(i18n.language, { notation: "compact", maximumFractionDigits: 1 }).format(item.share_count || 0)}
                  tone="slate"
                />
              )}

              {/* Avis — toujours orange */}
              <StatPill
                icon={<FaStar size={14} />}
                value={formattedRating}
                suffix="/5"
                tone="orange"
              />
            </div>
          </div>
      </article>

      {/* ✅ Modal Password réutilisable */}
      <PasswordModal
        key={`pwd-${itemKey}`}
        open={pwdOpen}
        title={t('gridcard.passwordModal.title', { title: item.title })}
        onClose={() => setPwdOpen(false)}
        onSubmit={submitPwd}
        defaultValue={pwdDefault}
      />
    </>
  );
}
