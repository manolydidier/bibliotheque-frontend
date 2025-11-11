// src/media-library/Visualiseur.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import SmartImage from "../parts/SmartImage";
import SeoPanel from "./components/SeoPanel";
import Sidebar from "./components/Sidebar";
import Toolbar from "./components/Toolbar";
import Tabs from "./components/Tabs";
import TagList, { TagPill } from "./components/TagList";
import { KpiCard, ChartCard, EmptyChart } from "./components/Cards";
import FilePreview from "./FilePreview/FilePreview";  
import QuickPreviewModal from "./QuickPreviewModal";

import {
  setAuthError,
  clearAuthError,
  selectAuthError
} from "../../../store/slices/Slice";
import {
  FaDownload,
  FaExternalLinkAlt, FaChevronLeft, FaChevronRight, FaSearchPlus, FaSearchMinus,
  FaFilePdf, FaFileExcel, FaFileWord, FaImage, FaFileVideo, FaFile, FaTag, FaStar, FaClock, FaEye, FaComment, FaChartBar, FaHistory, FaInfoCircle, FaPlay, FaTimes, FaShareAlt,FaColumns,
  FaLock,
  FaBars,
  FaThList,
  FaOutdent,
  FaStream,
  FaIndent,FaPalette 
} from "react-icons/fa";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadialBarChart, RadialBar
} from "recharts";
import axios from "axios";
import {
  buildArticleShowUrl,
  DEBUG_HTTP,
  fetchArticle,
  unlockArticle,
  fetchRatingsSummary,
  fetchSimilarArticles
} from "../api/articles";
import { formatDate } from "../shared/utils/format";
import Comments from "./Comments";
import TagManagerModal from "./components/TagManagerModal";
import Toaster from "../../../component/toast/Toaster";
import RatingModal, { RateButton } from "../RatingModal";
import PasswordModal from "../components/PasswordModal";
import { getStoredPassword, setStoredPassword } from "../utils/passwordGate";
import { FiCalendar, FiClock, FiTag, FiSearch, FiFilter, FiChevronDown, FiChevronUp, FiGrid, FiList, FiX, FiStar } from "react-icons/fi";
import SeoHead from "../../../services/SeoHead";

/* === nouveaux imports de viewers === */
import PdfPreview from "./FilePreview/PdfFilePreviewPro";
import WordPreviewPro from "./FilePreview/WordPreview";
import PowerPointPreview from "./FilePreview/PowerPointPreview";
// import MapPreview from "./FilePreview/MapPreview";


// === Accent tokens (couleur/ombre) =========================
const ACCENT = {
  hairline: "bg-gradient-to-r from-transparent via-sky-300 to-transparent",
  glow: "shadow-[0_10px_30px_-12px_rgba(37,99,235,0.35)]",
  glowSoft: "shadow-[0_6px_24px_-10px_rgba(37,99,235,0.25)]",
  focus: "focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  pill: "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 ring-1 ring-inset ring-blue-200",
};

// Palette globale (même clé que FiltersPanel)
const STORAGE_KEYS = {
  CARD_COLOR_ENABLED: "gridcard-color-enabled",
};
/* ---------------- Helpers ---------------- */
const sanitizeParam = (x) => {
  const raw = (x ?? "").toString().trim();
  if (!raw || raw === "undefined" || raw === "null") return null;
  try { return decodeURIComponent(raw); } catch { return raw; }
};

const firstCategory = (art) => {
  const cats = art?.categories || [];
  if (!cats.length) return "—";
  return (cats.find((c) => c?.pivot?.is_primary) || cats[0])?.name || "—";
};

// === Helpers URL (mêmes règles que GridCard) =========================

// en haut de Visualiseur.jsx, proche des autres helpers
// helpers (en haut de Visualiseur.jsx par ex.)
const api = (path) => {
  const p = String(path).replace(/^\/+/, '');
  // DEV: passe par le proxy Vite (même origine)
  if (import.meta.env.DEV) return `/api/${p}`;

  // PROD: base URL depuis l'env
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  const root = base.replace(/\/api\/?$/i, '/api');
  return `${root}/${p}`;
};

// --- Debug download ---
const DL_DEBUG = import.meta.env.DEV && (window?.__DL_DEBUG__ ?? true);
const dbg = (...args) => { if (DL_DEBUG) console.log("%c[DL]", "color:#2563eb", ...args); };
const dberr = (...args) => { if (DL_DEBUG) console.error("%c[DL]", "color:#dc2626", ...args); };



function getOrCreateVuid() {
  try {
    const key = 'vuid';
    let v = localStorage.getItem(key);
    if (!v) {
      v = crypto?.randomUUID?.() || String(Math.random()).slice(2) + Date.now();
      localStorage.setItem(key, v);
    }
    return v;
  } catch { return 'anon'; }
}

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
  if (/^https?:\/\//i.test(fixed)) {
    if (import.meta.env.DEV && fixed.includes('/storage/')) {
      const path = fixed.split('/storage/')[1];
      return `/storage/${path}`;
    }
    return fixed;
  }
  if (import.meta.env.DEV && fixed.startsWith('storage/')) {
    return `/${fixed.replace(/^\/+/, '')}`;
  }
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/i, '');
  return base ? `${base}/${fixed.replace(/^\/+/, '')}` : `/${fixed.replace(/^\/+/, '')}`;
};




const primaryMediaUrl = (art) => {
  if (!art) return null;
  const raw =
    (typeof art.featured_image === "string" && art.featured_image) ||
    art.featured_image?.url ||
    art.media?.[0]?.url ||
    null;
  return raw ? toAbsolute(raw) : null;
};

// Image de fond "édition"
const backgroundMediaUrl = (art) => {
  if (!art) return null;
  const cand =
    art.background_image ||
    art.background_image_url ||
    art.meta?.background ||
    art.meta?.background_image ||
    art.meta?.editor_background ||
    art.meta?.editor_background_url ||
    art.seo_data?.open_graph_image ||
    art.seo_data?.og_image ||
    null;
  const raw = (typeof cand === "string" ? cand : cand?.url) || null;
  return raw ? toAbsolute(raw) : null;
};

// Avatar auteur
const authorAvatarUrl = (art) => {
  const a = art?.author || null;
  const cand =
    a?.avatar ||
    a?.avatar_url ||
    a?.photo ||
    a?.photo_url ||
    art?.author_avatar ||
    art?.author_avatar_url ||
    null;
  const raw = (typeof cand === "string" ? cand : cand?.url) || null;
  return raw ? toAbsolute(raw) : null;
};

const authorNameOf = (art) =>
  art?.author_name ||
  art?.author?.name ||
  art?.author?.full_name ||
  art?.author?.username ||
  (art?.author_id ? `Auteur #${art.author_id}` : null) ||
  "Auteur inconnu";

const initialsOf = (name) => {
  const s = (name || "").trim();
  if (!s) return "??";
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase?.() || "").join("") || s[0]?.toUpperCase?.() || "??";
};

const inferTypeFromUrl = (url) => {
  if (!url) return "other";
  const s = url.toLowerCase();
  if (s.endsWith(".pdf")) return "pdf";
  if (/\.(xlsx?|csv)$/.test(s)) return "excel";
  if (/\.(docx?|rtf)$/.test(s)) return "word";
  if (/\.(png|jpe?g|gif|webp|svg|avif)$/.test(s)) return "image";
  if (/\.(mp4|webm|ogg|mov)$/i.test(s)) return "video";
  if (/\.(pptx?|ppsx?)$/.test(s)) return "ppt";
  if (s.endsWith(".geojson") || s.endsWith(".json") || s.endsWith(".zip")) return "map"; // .zip shapefile
  return "other";
};

const iconForType = (type, className = "") => {
  const common = `text-xl ${className}`;
  switch (type) {
    case "pdf":   return <FaFilePdf className={`${common} text-red-500`} />;
    case "excel": return <FaFileExcel className={`${common} text-emerald-500`} />;
    case "word":  return <FaFileWord className={`${common} text-blue-500`} />;
    case "image": return <FaImage className={`${common} text-amber-500`} />;
    case "video": return <FaFileVideo className={`${common} text-blue-500`} />;
    default:      return <FaFile className={`${common} text-slate-500`} />;
  }
};

const iconBgForType = (type) => {
  switch (type) {
    case "pdf": return "bg-red-50 border-red-100";
    case "excel": return "bg-emerald-50 border-emerald-100";
    case "word": return "bg-blue-50 border-blue-100";
    case "image": return "bg-amber-50 border-amber-100";
    case "video": return "bg-blue-50 border-blue-100";
    default: return "bg-slate-50 border-slate-100";
  }
};

/* ---------- Colors ---------- */
function hexToRgb(hex) {
  const h = (hex || "").trim();
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
    h.length === 4 ? "#" + [...h.replace("#","")].map(x => x + x).join("") : h
  );
  return m ? { r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) } : null;
}
function makeTagPalette(color) {
  const rgb = hexToRgb(color || "#3b82f6");
  if (!rgb) {
    return {
      bg: `color-mix(in oklab, ${color} 8%, white)`,
      bd: `color-mix(in oklab, ${color} 20%, transparent)`,
      dot: color,
      text: color,
      glow: `color-mix(in oklab, ${color} 12%, transparent)`,
    };
  }
  const { r, g, b } = rgb;
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.06)`,
    bd: `rgba(${r}, ${g}, ${b}, 0.15)`,
    dot: `rgba(${r}, ${g}, ${b}, 0.9)`,
    text: `rgb(${r}, ${g}, ${b})`,
    glow: `rgba(${r}, ${g}, ${b}, 0.1)`,
  };
}

/* ---------- Tri/dédoublonnage tags ---------- */
const normalizeTags = (tags) =>
  Array.isArray(tags)
    ? tags
        .filter((t) => t && (t.id != null || t.name))
        .map((t) => ({
          ...t,
          _pos: t?.pivot?.position ?? t?.pivot?.order ?? t?.pivot?.pos ?? null,
        }))
    : [];

const sortTags = (tags) => {
  const list = normalizeTags(tags);
  const allHavePos = list.every((t) => t._pos != null);
  const sorted = list.sort((a, b) => {
    if (allHavePos) return (a._pos ?? 0) - (b._pos ?? 0);
    return (a.name || "").localeCompare(b.name || "", "fr", { sensitivity: "base" });
  });
  const seen = new Set();
  return sorted.filter((t) => {
    const key = String(t.id ?? t.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/* Palette charts */
const CHART_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#64748b"];

/* ---------------- Auth / Permissions ---------------- */
function useMeFromLaravel() {
  const [me, setMe] = useState({ user: null, roles: [], permissions: [] });
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => {
    try {
      return (
        sessionStorage.getItem("tokenGuard") ||
        localStorage.getItem("tokenGuard") ||
        null
      );
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    try {
      if (token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } else {
        delete axios.defaults.headers.common["Authorization"];
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) { setMe({ user: null, roles: [], permissions: [] }); return; }
      try {
        setLoading(true);
        const { data } = await axios.get('/user', {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: false,
        });
        const user = data?.user || data || null;
        const roles = data?.roles || user?.roles || [];
        const permissions = data?.permissions || user?.permissions || [];
        if (!cancelled) setMe({ user, roles, permissions });
      } catch {
        if (!cancelled) setMe({ user: null, roles: [], permissions: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return { me, loading, token };
}

function hasPrivateAccess(me) {
  const roles = (me?.roles || []).map(r =>
    (r?.name ?? r?.slug ?? r?.title ?? r)?.toString().toLowerCase()
  );
  const roleMatch = roles.find(r => /(admin|owner|super-?admin|manager)/.test(r));
  if (roleMatch) return true;

  const perms = Array.isArray(me?.permissions) ? me.permissions : [];
  const permMatch = perms.find(p => {
    const name = String(p?.name ?? "").toLowerCase();
    const action = String(p?.action ?? "").toLowerCase();
    const resource = String(p?.resource ?? "").toLowerCase();
    const isArticles = resource === "articles";
    const hasAction = action === "articles.read_private" || action === "articles.view_private";
    const hasLabel  = /priv(e|é)s?/i.test(name);
    return isArticles && (hasAction || hasLabel);
  });

  if (permMatch) return true;
  return false;
}

function computeRights(permissions = []) {
  const list = Array.isArray(permissions) ? permissions : [];
  const isModerator = list.some(p =>
    String(p?.resource ?? p?.name ?? p)
      .toLowerCase()
      .includes("comments") &&
    /(moderateur|approver|approve|manage|admin|gerer)/i.test(String(p?.name ?? p))
  );
  const canDeleteAny =
    isModerator ||
    list.some(p =>
      String(p?.resource ?? p?.name ?? p).toLowerCase().includes("comments") &&
      /(supprimer|delete|remove)/i.test(String(p?.name ?? p))
    );
  return { isModerator, canDeleteAny };
}

/* ---------------- Visualiseur ---------------- */
export default function Visualiseur() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const unlockError = useSelector(selectAuthError);

  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const idOrSlug = useMemo(() => {
    const fallback = Object.values(params ?? {})[0];
    const candidate = params?.slug ?? params?.show ?? params?.photoName ?? params?.id ?? fallback ?? "";
    return sanitizeParam(candidate);
  }, [params]);

  const { me, loading: meLoading, token } = useMeFromLaravel();
  const rights = useMemo(() => computeRights(me?.permissions), [me?.permissions]);

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [lockedKind, setLockedKind] = useState(null); // 'password' | 'private' | 'unknown' | null
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockBusy, setUnlockBusy] = useState(false);

  const [activeTab, setActiveTab] = useState(t('visualiseur.tabs.preview'));

  const [fullscreen, setFullscreen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingMode, setRatingMode] = useState("create"); // "create" | "edit"
  const [myRating, setMyRating] = useState(null);
  const [myReview, setMyReview] = useState("");
  const [ratingLoaded, setRatingLoaded] = useState(false);
  const previewRef = useRef(null);


  
  // ======= [PALETTE TOGGLE] État + logique =======
  const [cardColorEnabled, setCardColorEnabled] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CARD_COLOR_ENABLED);
      return raw == null ? true : JSON.parse(raw);
    } catch { return true; }
  });

  // ✅ applique/retire la classe globale sur <html>
  const applyGlobalPalette = useCallback((enabled) => {
    document.documentElement.classList.toggle("cards-colored", !!enabled);
  }, []);

  // ✅ synchronise l’état local avec la Toolbar via l’event
  useEffect(() => {
    const onPref = (e) => {
      const enabled = !!(e?.detail?.enabled);
      setCardColorEnabled(enabled);        // reflète l’état (label/bouton local)
      applyGlobalPalette(enabled);         // applique la classe globale
    };
    window.addEventListener("gridcard:colorpref", onPref);
    return () => window.removeEventListener("gridcard:colorpref", onPref);
  }, [applyGlobalPalette]);

  // ✅ applique la classe au montage (si Visualiseur est la 1ère vue)
  useEffect(() => {
    applyGlobalPalette(cardColorEnabled);
  }, [cardColorEnabled, applyGlobalPalette]);

  // (optionnel) si tu gardes le bouton local dans Visualiseur
  const toggleCardColor = useCallback(() => {
    const next = !cardColorEnabled;
    setCardColorEnabled(next);
    try { localStorage.setItem(STORAGE_KEYS.CARD_COLOR_ENABLED, JSON.stringify(next)); } catch {}
    applyGlobalPalette(next); // applique tout de suite
    // notifie les autres vues (Grid, Toolbar, etc.)
    window.dispatchEvent(new CustomEvent("gridcard:colorpref", { detail: { enabled: next } }));
  }, [cardColorEnabled, applyGlobalPalette]);

  // Aperçu rapide (modal indépendant des Tabs)
  const [qpOpen, setQpOpen] = useState(false);
  const [qpFile, setQpFile] = useState(null);

  // État persistant pour l'ouverture/fermeture de la Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("visualiseur:sidebarOpen") || "true");
    } catch {
      return true;
    }
  });
  
  useEffect(() => {
    try { localStorage.setItem("visualiseur:sidebarOpen", JSON.stringify(sidebarOpen)); } catch {}
  }, [sidebarOpen]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((s) => !s);
  }, []);

  useEffect(() => {
    if (!DL_DEBUG) return;
    const onErr = (e) => dberr("window error", e.message, e);
    const onRej = (e) => dberr("unhandledrejection", e.reason);
    const onBU  = () => dbg("beforeunload fired (une navigation/refresh est déclenchée)");
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    window.addEventListener("beforeunload", onBU);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
      window.removeEventListener("beforeunload", onBU);
    };
  }, []);

  /* ------- Actions ------- */
  // Construit un "article-like" avec le média en tête (pour FilePreview)
  const buildArticleWith = useCallback((m) => {
    if (!article || !m) return article;
    return {
      ...article,
      media: [{ url: m.fileUrl, mime: m.mime_type }, ...(article.media || [])],
      featured_image: undefined,
      title: m.title || article.title,
    };
  }, [article]);
  
  const openInNew = useCallback(() => {
    const m = selectedFile
      ? selectedFile
      : (primaryMediaUrl(article)
          ? { fileUrl: primaryMediaUrl(article), title: article?.title || t('visualiseur.preview.attachment') }
          : null);
    if (!m) return;
    setQpFile(buildArticleWith(m));
    setQpOpen(true);
  }, [selectedFile, article, buildArticleWith, t]);

  const filenameFrom = (u, fallback = 'fichier') => {
    try {
      const p = new URL(u, window.location.href).pathname;
      const name = decodeURIComponent(p.split('/').pop() || '');
      return name || fallback;
    } catch { return fallback; }
  };

  const sameOrigin = (u) => {
    try {
      const url = new URL(u, window.location.href);
      return url.origin === window.location.origin;
    } catch { return true; }
  };

  const downloadCurrent = async () => {
    const u = selectedFile?.fileUrl || primaryMediaUrl(article);
    if (!u) return;

    // --- Ping download avec Bearer si on a un token, sinon beacon public
    try {
      const fileId =
        selectedFile?.id ??
        (article?.media || []).find(m => toAbsolute(m.url) === u)?.id ??
        null;

      if (fileId) {
        const url = api(`media/${fileId}/download`);
        const payload = { dedupe_key: `${getOrCreateVuid()}:${(navigator.userAgent||'ua')}:${fileId}` };
        const tokenGuard =localStorage.getItem("tokenGuard") || sessionStorage.getItem("tokenGuard") || null;
        if (tokenGuard) {
          await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${tokenGuard}`,
            },
            body: JSON.stringify(payload),
            keepalive: true,
          });
        } else if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon(url, blob); // route doit être publique dans ce cas
        }
      }
    } catch (e) {
      // no-op
    }

    // --- Téléchargement
    const name = selectedFile?.filename || selectedFile?.original_filename || filenameFrom(u);

    if (sameOrigin(u)) {
      const a = document.createElement('a');
      a.href = u;
      a.download = name;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }

    // Cross-origin (prod). Nécessite CORS côté backend si tu veux blob + Bearer.
    try {
      const res = await fetch(u, {
        method: 'GET',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include', // selon ton besoin (JWT: pas obligatoire)
      });
      if (!res.ok) throw new Error('fetch failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      window.open(u, '_blank', 'noopener'); // fallback
    }
  };

  // Détermine le type à partir du mime OU de l'extension
  const typeFromMimeOrExt = (mime, url = "") => {
    const m = (mime || "").toLowerCase();
    const s = (url || "").toLowerCase();

    if (m.includes("pdf") || s.endsWith(".pdf")) return "pdf";
    if (m.includes("presentation") || /\.(pptx?|ppsx?)$/.test(s)) return "ppt";
    if (m.includes("spreadsheet") || /\.(xlsx?|csv)$/.test(s)) return "excel";
    if (m.includes("word") || m.includes("msword") || /\.(docx?|rtf)$/.test(s)) return "word";
    if (m.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|avif)$/.test(s)) return "image";
    if (m.startsWith("video/") || /\.(mp4|webm|ogg|mov)$/i.test(s)) return "video";
    return "other";
  };

  /* ------- Unlock ------- */
  async function handleUnlock(password) {
    if (!password) {
      dispatch(setAuthError(t('visualiseur.enterPassword')));
      return;
    }
    setUnlockBusy(true);
    dispatch(clearAuthError());

    const include = ["categories", "tags", "media", "comments", "approvedComments", "author", "history"];
    const fields = [
      "id","title","slug","excerpt","content",
      "featured_image","featured_image_alt","status","visibility",
      "published_at","updated_at","created_at","view_count","reading_time","word_count",
      "share_count","comment_count","rating_average","rating_count",
      "is_featured","is_sticky","author_id","author_name","meta","seo_data",
      "allow_comments","allow_rating"
    ];

    try {
      const art = await unlockArticle(idOrSlug, password, { include, fields });
      setStoredPassword(idOrSlug, password);
      setArticle(art || null);
      setLockedKind(null);
      setUnlockOpen(false);
      dispatch(clearAuthError());
      document.title = art?.title || t('visualiseur.title');
    } catch (e) {
      const apiCode = e?.response?.data?.code?.toString()?.toLowerCase?.() || "";
      if (apiCode === "private") {
        dispatch(setAuthError(t('visualiseur.privateAccess')));
        setLockedKind("private");
        setUnlockOpen(false);
      } else if (e.incorrectPassword) {
        const msg = e.message || t('visualiseur.incorrectPassword');
        dispatch(setAuthError(msg));
        setUnlockOpen(true);
      } else {
        const msg = e?.response?.data?.message || t('visualiseur.unlockError');
        dispatch(setAuthError(msg));
      }
    } finally {
      setUnlockBusy(false);
    }
  }

  const requestOpenModal = useCallback(() => {
    dispatch(clearAuthError());
    setUnlockOpen(true);
  }, [dispatch, setUnlockOpen]);

  /* ------- Shortcuts ------- */
  useEffect(() => {
    function onKeyDown(e) {
      if (!((lockedKind === "password" || lockedKind === "unknown") && !article)) return;
      const key = (e.key || "").toLowerCase();
      const ctrlK = e.ctrlKey && key === "k";
      const enter = key === "enter";
      const pKey  = key === "p";
      if (ctrlK || enter || pKey) {
        e.preventDefault();
        requestOpenModal();
      }
    }
    const openEvtHandler = () => requestOpenModal();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("visualiseur:openPassword", openEvtHandler);
    window.visualiseur = window.visualiseur || {};
    window.visualiseur.openPassword = openEvtHandler;
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("visualiseur:openPassword", openEvtHandler);
      if (window.visualiseur) delete window.visualiseur.openPassword;
    };
  }, [lockedKind, article, requestOpenModal]);

  /* ------- Load article ------- */
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErr("");
    setLockedKind(null);
    setUnlockOpen(false);
    dispatch(clearAuthError());

    if (!idOrSlug) {
      setLoading(false);
      setErr(t('visualiseur.missingId'));
      return;
    }

    const include = ["categories", "tags", "media", "comments", "approvedComments", "author", "history"];
    const fields = [
      "id","title","slug","excerpt","content",
      "featured_image","featured_image_alt","status","visibility",
      "published_at","updated_at","created_at","view_count","reading_time","word_count",
      "share_count","comment_count","rating_average","rating_count",
      "is_featured","is_sticky","author_id","author_name","meta","seo_data",
      "allow_comments","allow_rating"
    ];

    (async () => {
      try {
        const savedPwd = getStoredPassword(idOrSlug);
        const art = await fetchArticle(idOrSlug, {
          include,
          fields,
          password: savedPwd || undefined
        });
        if (!mounted) return;
        setArticle(art);
        document.title = art?.title || t('visualiseur.title');
      } catch (e) {
        if (!mounted) return;
        if (e.locked) {
          const code = (e.code || "").toString().toLowerCase();
          if (/private/.test(code)) {
            setLockedKind("private");
            setUnlockOpen(false);
            setErr("");
            dispatch(setAuthError(t('visualiseur.restrictedAccess')));
          } else if (/password/.test(code) || !code) {
            setLockedKind("password");
            setUnlockOpen(true);
            setErr("");
            dispatch(setAuthError(t('visualiseur.passwordRequired')));
          } else {
            setLockedKind("unknown");
            setUnlockOpen(true);
            setErr("");
            dispatch(setAuthError(t('visualiseur.authRequired')));
          }
        } else {
          setErr(e?.message || t('visualiseur.loadingError'));
          dispatch(clearAuthError());
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [idOrSlug, dispatch, t]);

  /* ------- Private guard ------- */
  useEffect(() => {
    if (!article || meLoading) return;
    const isPrivate = String(article.visibility || "").toLowerCase() === "private";
    if (isPrivate && !hasPrivateAccess(me)) {
      setArticle(null);
      setLockedKind("private");
      setUnlockOpen(false);
    }
  }, [article, me, meLoading]);

  useEffect(() => {}, [article?.visibility]);

  // Comptage de vues (anti-spam local léger)
  useEffect(() => {
    if (!article?.id) return;
    const visibility = String(article.visibility || '').toLowerCase();
    if (visibility === 'private') return;

    const vuid  = getOrCreateVuid();
    const ua    = (typeof navigator !== 'undefined' ? navigator.userAgent : 'ua');
    const dkey  = `${vuid}:${ua}:${article.id}`;

    const k = `viewed:${article.id}`;
    const last = Number(sessionStorage.getItem(k) || 0);
    if (Date.now() - last < 120000) return;
    sessionStorage.setItem(k, String(Date.now()));

    axios.post(`/articles/${article.id}/view`, {
      dedupe_key: dkey,
      delta: 1,
    }).catch(() => {});
  }, [article?.id, article?.visibility]);

  /* ------- Ratings summary ------- */
  useEffect(() => {
    if (!article?.id) return;
    let cancelled = false;
    setRatingLoaded(false);
    (async () => {
      try {
        const data = await fetchRatingsSummary(article.id);
        if (cancelled) return;
        if (Number.isFinite(Number(data?.rating_average)) && Number.isFinite(Number(data?.rating_count))) {
          setArticle(a => ({
            ...(a || {}),
            rating_average: Number(data.rating_average),
            rating_count: Number(data.rating_count)
          }));
        }
        setMyRating(typeof data?.my_rating === "number" ? data.my_rating : null);
        setMyReview(typeof data?.my_review === "string" ? data.my_review : "");
      } catch {
      } finally {
        if (!cancelled) setRatingLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [article?.id]);

  /* ------- Similar ------- */
  useEffect(() => {
    let mounted = true;
    if (!article?.id) return;
    const catIds = (article.categories || []).map(c => c.id).filter(Boolean);
    const tagIds = (article.tags || []).map(t => t.id).filter(Boolean);
    setSimilarLoading(true);
    fetchSimilarArticles({ categoryIds: catIds, tagIds, excludeId: article.id, limit: 8 })
      .then(list => mounted && setSimilar(Array.isArray(list) ? list : []))
      .catch(() => mounted && setSimilar([]))
      .finally(() => mounted && setSimilarLoading(false));
    return () => { mounted = false; };
  }, [article?.id]);

  /* ------- Media list ------- */
  const mediaList = useMemo(() => {
    const list = Array.isArray(article?.media) ? article.media : [];

    return list
      .filter(m => !!m?.url)
      .map(m => {
        const url = toAbsolute(m.url);
        const title =
          m.name?.trim?.() ||
          m.original_filename?.trim?.() ||
          m.filename?.trim?.() ||
          article?.title?.trim?.() ||
          t('visualiseur.untitled');

        return {
          id: m.id,
          title,
          type: typeFromMimeOrExt(m.mime_type, url),
          fileUrl: url,
          thumbnail: m.thumbnail_url ? toAbsolute(m.thumbnail_url) : url,
          size: m.size_readable || (typeof m.size === "number" ? `${(m.size/1024/1024).toFixed(1)} Mo` : "—"),
          date: formatDate(m.created_at || article?.published_at),
          category: firstCategory(article),
          favorite: !!m.is_featured,
          tags: Array.isArray(m.tags) ? m.tags.map(t => t.name || t) : [],
          name: m.name,
          filename: m.filename,
          original_filename: m.original_filename,
          mime_type: m.mime_type,
        };
      });
  }, [article, t]);

  /* ------- Default selected media ------- */
  const currentType  = selectedFile?.type || inferTypeFromUrl(primaryMediaUrl(article));
  const currentUrl   = selectedFile?.fileUrl || primaryMediaUrl(article);
  const currentTitle = selectedFile?.title || article?.title || t('visualiseur.selectFile');

  useEffect(() => {
    if (!mediaList.length) { setSelectedFile(null); return; }
    if (!selectedFile || !mediaList.some(m => m.fileUrl === selectedFile.fileUrl)) {
      setSelectedFile(mediaList[0]);
    }
  }, [mediaList, selectedFile]);

  useEffect(() => {
    if (!article?.id) return;
    setSelectedFile(null);
    setActiveTab(t('visualiseur.tabs.preview'));
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
  }, [article?.id, t]);

  const shareData = useMemo(() => ({
    title: article?.title || "",
    excerpt: article?.excerpt || article?.title || "",
    url: typeof window !== "undefined" ? window.location.href : "",
    articleId: article?.id ?? null
  }), [article]);

  // ==== commentaires sous l’article ====
  const initialTopLevelApproved = React.useMemo(() => {
    if (Array.isArray(article?.approved_comments)) {
      return article.approved_comments.filter(c => c?.parent_id == null);
    }
    if (Array.isArray(article?.comments)) {
      return article.comments.filter(c => c?.parent_id == null && c?.status === 'approved');
    }
    return [];
  }, [article]);

  /* ------- Loading / errors / locks ------- */
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 px-3 sm:px-4 lg:px-6 2xl:px-10 py-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg" />
          <div className="h-96 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center px-4">
        <div className="text-red-500 text-center">{t('visualiseur.error')}: {err}</div>
      </div>
    );
  }

  if (!article && (lockedKind === "private" || lockedKind === "password" || lockedKind === "unknown")) {
    const isPrivateLock = lockedKind === "private";
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 font-sans px-3 sm:px-4 lg:px-6 2xl:px-10 py-10">
        <div className="max-w-2xl mx-auto text-center text-slate-600">
          <div
            role="button"
            tabIndex={0}
            onClick={!isPrivateLock ? requestOpenModal : undefined}
            onKeyDown={(e) => {
              const k = (e.key || "").toLowerCase();
              if (!isPrivateLock && (k === "enter" || k === " ")) requestOpenModal();
            }}
            title={
              isPrivateLock
                ? t('visualiseur.noPermission')
                : t('visualiseur.shortcuts')
            }
            className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/70 border border-white/60 shadow cursor-pointer select-none"
          >
            <FaLock className="text-blue-600" />
            <span>
              {isPrivateLock
                ? t('visualiseur.noPermission')
                : t('visualiseur.protectedContent')}
            </span>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {isPrivateLock
              ? t('visualiseur.askAdmin')
              : t('visualiseur.shortcuts')}
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-3 rounded-xl border border-slate-300/60 text-slate-700 bg-white/80 hover:bg-white transition"
            >
              {t('visualiseur.backButton')}
            </button>
            {!token && (
              <a
                href="/auth"
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition"
              >
                {t('visualiseur.login')}
              </a>
            )}
          </div>
        </div>

        {(lockedKind === "password" || lockedKind === "unknown") && (
          <PasswordModal
            open={unlockOpen}
            onClose={() => { dispatch(clearAuthError()); setUnlockOpen(false); }}
            onSubmit={handleUnlock}
            defaultValue={getStoredPassword(idOrSlug)}
            title={t('visualiseur.unlock')}
            error={unlockError}
            busy={unlockBusy}
          />
        )}
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center px-4">
        <div className="text-red-500 text-center">{t('visualiseur.articleNotFound')}</div>
      </div>
    );
  }

  const hasHistory = Array.isArray(article.history) && article.history.length > 0;
  const tabs = [
    t('visualiseur.tabs.preview'),
    t('visualiseur.tabs.media'),
    t('visualiseur.tabs.metadata'),
    ...(hasHistory ? [t('visualiseur.tabs.versions')] : []),
    t('visualiseur.tabs.statistics'),
    t('visualiseur.tabs.seo')
  ];

  /* ---------- SEO ---------- */
  const SITE_URL =
    import.meta.env.VITE_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const canonical = article?.slug
    ? `${SITE_URL.replace(/\/$/, "")}/articles/${encodeURIComponent(article.slug)}`
    : (typeof window !== "undefined" ? window.location.href : undefined);
  const imageUrl = primaryMediaUrl(article);
  const visibility = String(article?.visibility || "").toLowerCase();
  const isProtected = visibility === "private" || visibility.includes("password");
  const robots = isProtected ? "noindex,nofollow,noarchive" : "index,follow";

  return (
    <>
      <SeoHead
        title={article.title}
        description={article.seo_data?.meta_description || article.excerpt}
        keywords={
          Array.isArray(article.seo_data?.keywords)
            ? article.seo_data.keywords.join(", ")
            : article.seo_data?.keywords
        }
        canonical={canonical}
        image={imageUrl}
        type="article"
        robots={robots}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": article.title,
          "image": imageUrl ? [imageUrl] : undefined,
          "datePublished": article.published_at,
          "dateModified": article.updated_at,
          "author": authorNameOf(article)
            ? [{ "@type": "Person", "name": authorNameOf(article) }]
            : undefined,
          "mainEntityOfPage": canonical
        }}
      />

      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 font-sans px-3 sm:px-4 lg:px-6 2xl:px-10 py-4" >
        {unlockError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {unlockError}
          </div>
        )}

        {/* Bascule Sidebar — TOUJOURS visible */}
        <div className="fixed left-3 top-4 sm:top-[85px] z-[70] group">
          {/* Tooltip (affiché seulement quand fermée) */}
          <div className={`absolute left-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${sidebarOpen ? 'hidden' : 'block'}`}>
            <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              Ouvrir le menu
            </div>
          </div>
          
          {/* Bouton */}
          <button
            type="button"
            onClick={toggleSidebar}
            title={sidebarOpen ? t('visualiseur.sidebar.hide') : t('visualiseur.sidebar.show')}
            aria-pressed={!sidebarOpen}
            className={`flex items-center gap-3 px-4 py-3 rounded-full border-2 bg-white hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${ACCENT.focus}`}
          >
            {sidebarOpen ? (
              <FaOutdent className="text-blue-600 text-lg" />
            ) : (
              <FaIndent className="text-blue-600 text-lg" />
            )}
          </button>
        </div>

        <div className="flex gap-2 lg:gap-6 xl:gap-2">
          {sidebarOpen && (
            <Sidebar
              open={sidebarOpen}
              onOpen={() => setSidebarOpen(true)}
              onClose={() => setSidebarOpen(false)}
              mediaCount={mediaList.length}
              tags={article?.tags || []}
              mediaList={mediaList}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              similar={similar}
              similarLoading={similarLoading}
              onOpenSimilar={(slugOrId) => {
                setSelectedFile(null);
                navigate(`/articles/${slugOrId}`);
              }}
              onOpenTagManager={() => setTagModalOpen(true)}
              TagListComponent={TagList}
              iconForType={iconForType}
              iconBgForType={iconBgForType}
              toAbsolute={toAbsolute}
            />
          )}

          {/* Main */}
          <div className="flex-1 flex flex-col w-full">
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 overflow-hidden">
              {/* Toolbar STICKY (déjà sticky) */}
              <div className={`sticky top-5 z-50 bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/40`}>
                <div className={`absolute inset-x-0 -top-px h-px ${ACCENT.hairline}`} />
                <Toolbar
                  onBack={() => navigate(-1)}
                  onRefresh={() => setActiveTab(t('visualiseur.tabs.preview'))}
                  onFullscreen={() => setFullscreen(true)}
                  onDownload={downloadCurrent}
                  shareData={shareData}
                  global={true}
                />
              </div>

              {/* Grille : 1 col en mobile, + panneau Détails en >= lg */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] gap-4 lg:gap-6 xl:gap-8 pt-2">
                {/* Main panel */}
                <div className="min-w-0 border-r border-slate-200/30">
                  <div className="p-5 sm:p-6 lg:p-8">
                    <Tabs list={tabs} active={activeTab} onChange={setActiveTab} />
                    <div key={article?.id} ref={previewRef} className="file-preview-container">
                      {activeTab === t('visualiseur.tabs.preview') && (
                        <>
                          <Apercu
                            article={article}
                            currentUrl={selectedFile?.fileUrl || currentUrl}
                            currentType={selectedFile?.type || currentType}
                            currentTitle={selectedFile?.title || currentTitle}
                            onOpen={openInNew}
                            onDownload={downloadCurrent}
                          />

                          {/* Commentaires SOUS l’article — mobile & tablettes uniquement */}
                            {article?.allow_comments !== false && (
                              <div className="mt-8 lg:hidden">
                                <h3 className="text-xl font-medium text-slate-800 mb-4">
                                  {t('visualiseur.comments.title') ?? 'Commentaires'}
                                </h3>
                                <Comments
                                  key={article?.id}
                                  articleId={article?.id}
                                  initialComments={initialTopLevelApproved}
                                  meOverride={me}
                                  tokenOverride={token}
                                  rightsOverride={rights}
                                />
                              </div>
                            )}

                        </>
                      )}

                      {activeTab === t('visualiseur.tabs.media') && (
                        <Medias
                          mediaList={mediaList}
                          onPreview={(m) => { setQpFile(buildArticleWith(m)); setQpOpen(true); }}
                        />
                      )}

                      {activeTab === t('visualiseur.tabs.metadata') && (
                        <Metadonnees article={article} currentType={currentType} currentTitle={currentTitle} />
                      )}

                      {activeTab === t('visualiseur.tabs.versions') && hasHistory && <Versions history={article.history} />}

                      {activeTab === t('visualiseur.tabs.statistics') && <StatsCharts article={article} />}

                      {activeTab === t('visualiseur.tabs.seo') && <SeoPanel article={article} />}
                    </div>
                  </div>
                </div>

                {/* Right panel — masqué en mobile */}
                <div className="hidden lg:block">
                  <DetailsPanel
                    article={article}
                    currentType={currentType}
                    currentTitle={currentTitle}
                    selectedFile={selectedFile}
                    me={me}
                    token={token}
                    rights={rights}
                    onOpenRating={() => { setRatingMode("create"); setRatingOpen(true); }}
                    onOpenRatingEdit={() => { setRatingMode("edit"); setRatingOpen(true); }}
                    ratingAverage={article?.rating_average}
                    ratingCount={article?.rating_count}
                    myRating={myRating}
                    ratingLoaded={ratingLoaded}
                  />
                  {/* Commentaires — colonne de droite uniquement en desktop */}
                  {article?.allow_comments !== false && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium text-slate-800 mb-3">
                        {t('visualiseur.comments.title') ?? 'Commentaires'}
                      </h3>
                      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/40 p-4">
                        <Comments
                          key={`sidebar-${article?.id}`}
                          articleId={article?.id}
                          initialComments={initialTopLevelApproved}
                          meOverride={me}
                          tokenOverride={token}
                          rightsOverride={rights}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fullscreen Modal */}
        {fullscreen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="max-w-7xl w-full p-6 sm:p-10 lg:p-12">
                <div className={`bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl ${ACCENT.glow}`}>

                  <Tabs list={tabs} active={activeTab} onChange={setActiveTab} />
                  {activeTab === t('visualiseur.tabs.preview') && (
                    <Apercu
                      article={article}
                      currentUrl={selectedFile?.fileUrl || currentUrl}
                      currentType={selectedFile?.type || currentType}
                      currentTitle={selectedFile?.title || currentTitle}
                      onOpen={openInNew}
                      onDownload={downloadCurrent}
                    />
                  )}
                  {activeTab === t('visualiseur.tabs.media') && (
                    <Medias
                      mediaList={mediaList}
                      onPreview={(m) => { setQpFile(buildArticleWith(m)); setQpOpen(true); }}
                    />
                  )}
                  {activeTab === t('visualiseur.tabs.metadata') && <Metadonnees article={article} currentType={currentType} currentTitle={currentTitle} />}
                  {activeTab === t('visualiseur.tabs.versions') && <Versions history={article.history} />}
                  {activeTab === t('visualiseur.tabs.statistics') && <StatsCharts article={article} />}
                  {activeTab === t('visualiseur.tabs.seo') && <SeoPanel article={article} />}
                </div>
              </div>
              <button
                onClick={() => setFullscreen(false)}
                className="absolute top-6 right-6 sm:top-8 sm:right-8 text-white/80 text-2xl sm:text-3xl hover:text-white transition-colors duration-300"
                aria-label={t('visualiseur.close')}
              >
                <FaTimes />
              </button>
            </div>
          </div>
        )}

        {/* Modal d'aperçu rapide */}
        {qpOpen && qpFile && (
          <QuickPreviewModal
            file={qpFile}
            onClose={() => { setQpOpen(false); setQpFile(null); }}
          />
        )}

        {/* Tag Manager Modal */}
        {article?.id && (
          <TagManagerModal
            open={tagModalOpen}
            onClose={() => setTagModalOpen(false)}
            articleId={article.id}
            existingTags={article?.tags || []}
            onChange={(newList) => setArticle((a) => ({ ...(a || {}), tags: newList }))}
            meOverride={me}
            rightsOverride={rights}
          />
        )}

        {/* Rating Modal */}
        {article?.id && (
          <RatingModal
            open={ratingOpen}
            onClose={() => setRatingOpen(false)}
            articleId={article.id}
            articleTitle={article.title}
            initialAverage={article.rating_average}
            initialCount={article.rating_count}
            tokenOverride={token}
            mode={ratingMode}
            initialMyRating={myRating || 0}
            initialMyReview={myReview || ""}
            onSubmitSuccess={({ rating_average, rating_count, my_rating, my_review }) => {
              const avg = rating_average;
              const cnt = rating_count;
              setArticle(a => ({
                ...(a || {}),
                rating_average: Number.isFinite(avg) ? avg : (a?.rating_average ?? 0),
                rating_count:   Number.isFinite(cnt) ? cnt : (a?.rating_count ?? 0),
              }));
              if (typeof my_rating === "number") setMyRating(my_rating);
              if (typeof my_review === "string") setMyReview(my_review);
            }}
          />
        )}

        {/* Debug */}
        {DEBUG_HTTP && (
          <details className="fixed bottom-8 left-8 bg-white/95 backdrop-blur-xl p-6 rounded-2xl border border-white/60 max-w-[40rem] shadow-xl">
            <summary className="text-slate-700 cursor-pointer font-medium flex items-center">
              <FaInfoCircle className="mr-2" /> {t('visualiseur.debug')}
            </summary>
            <div className="text-xs my-3">
              <div className="mb-2 font-medium text-slate-800">Show URL</div>
              <code className="break-all text-slate-600">
                {buildArticleShowUrl(idOrSlug, { include: ["categories","tags","media"], fields: ["id","title","slug"] })}
              </code>
            </div>
            <pre className="text-xs max-h-64 overflow-auto bg-slate-50/80 p-4 rounded-xl border border-slate-200/50">
              {JSON.stringify(article, null, 2)}
            </pre>
          </details>
        )}

        <PasswordModal
          open={unlockOpen}
          onClose={() => { dispatch(clearAuthError()); setUnlockOpen(false); }}
          onSubmit={handleUnlock}
          defaultValue={getStoredPassword(idOrSlug)}
          title={t('visualiseur.unlock')}
          error={unlockError}
          busy={unlockBusy}
        />
      </div>
    </>
  );
}

/* ---------------- Onglets ---------------- */
function Apercu({ article, currentUrl, currentType, currentTitle, onOpen, onDownload }) {
  const { t } = useTranslation();
  const contentStr = (article?.content ?? "").toString();
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(contentStr);
  const bgUrl = backgroundMediaUrl(article);
  const [searchParams] = useSearchParams();
  const isEdit =
    searchParams.get("edit") === "1" ||
    (searchParams.get("mode") || "").toLowerCase() === "edit" ||
    article?.meta?.is_editing === true;

  return (
    // ⚠️ scroll global rétabli : plus de overflow-auto / max-h-screen ici
    <div className="space-y-8 lg:space-y-10 relative">
      {isEdit && bgUrl && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            backgroundImage: `url(${bgUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(12px)",
            opacity: 0.18
          }}
        />
      )}
      <div className="relative">
        {!currentUrl ? (
          <div className="text-center py-16 lg:py-20">
            <div className="w-24 h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <FaFile className="text-blue-600 text-4xl lg:text-5xl" />
            </div>
            <h3 className="text-2xl lg:3xl font-light text-slate-800 mb-3">{t('visualiseur.preview.noMedia')}</h3>
            <p className="text-slate-600 mt-2 max-w-md mx-auto">{t('visualiseur.preview.addMedia')}</p>
          </div>
        ) : (
          <div className={`bg-white/60 border border-slate-200/40 rounded-2xl overflow-hidden backdrop-blur-sm shadow-lg ${ACCENT.glowSoft}`}>
            <FilePreview
              file={{
                ...article,
                title: currentTitle || article?.title,
                media: [{ url: currentUrl }, ...(article?.media || [])],
                featured_image: undefined,
              }}
              activeTab={t('visualiseur.tabs.preview')}
            />
          </div>
        )}

        {contentStr && (
          <div className="pt-2 sm:pt-4">
            <h3 className="text-xl lg:2xl font-light text-slate-800 mb-4 lg:mb-6">{t('visualiseur.preview.articleContent')}</h3>
            <div className="bg-slate-50/50 rounded-2xl p-5 sm:p-6 lg:p-8 border border-slate-200/40">
              {looksHtml ? (
                <div className="prose prose-slate max-w-none prose-lg" dangerouslySetInnerHTML={{ __html: contentStr }} />
              ) : (
                <p className="whitespace-pre-line text-slate-700 leading-relaxed">{contentStr}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Medias({ mediaList, onPreview }) {
  const { t } = useTranslation();
  
  // --- Lecture seule : état UI ---
  const [viewMode, setViewMode] = React.useState("grid");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState("");
  const [featured, setFeatured] = React.useState("");
  const [sortBy, setSortBy] = React.useState("date");
  const [sortDir, setSortDir] = React.useState("desc");

  // --- Dérivés ---
  const activePills = React.useMemo(() => {
    const pills = [];
    if (q.trim())    pills.push({ id:"q", label:`${t('visualiseur.media.search')}: "${q.trim()}"`, clear: () => setQ("") });
    if (type)        pills.push({ id:"type", label:`${t('visualiseur.media.type')}: ${type.toUpperCase()}`, clear: () => setType("") });
    if (featured!=="") pills.push({ id:"featured", label:`${t('visualiseur.media.featured')}: ${featured==="1"?t('visualiseur.media.featuredYes'):t('visualiseur.media.featuredNo')}`, clear: () => setFeatured("") });
    if (sortBy!=="date" || sortDir!=="desc") {
      const map = { date: t('visualiseur.media.sortDate'), title: t('visualiseur.media.sortTitle'), size: t('visualiseur.media.sortSize') };
      pills.push({ id:"sort", label:`${t('visualiseur.media.sort')}: ${map[sortBy]} ${sortDir.toUpperCase()}`, clear: () => { setSortBy("date"); setSortDir("desc"); } });
    }
    return pills;
  }, [q, type, featured, sortBy, sortDir, t]);

  const filtered = React.useMemo(() => {
    let arr = Array.isArray(mediaList) ? mediaList.slice() : [];
    if (type) arr = arr.filter(m => (m.type || "other") === type);
    if (featured !== "") arr = arr.filter(m => (!!m.favorite) === (featured === "1"));
    const s = q.trim().toLowerCase();
    if (s) {
      arr = arr.filter(m =>
        (m.title||"").toLowerCase().includes(s) ||
        (m.mime_type||"").toLowerCase().includes(s) ||
        (m.filename||"").toLowerCase().includes(s) ||
        String(m.id||"").includes(s) ||
        (Array.isArray(m.tags) ? m.tags.join(" ").toLowerCase().includes(s) : false)
      );
    }
    arr.sort((a,b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "title") return (a.title||"").localeCompare(b.title||"","fr",{sensitivity:"base"}) * dir;
      if (sortBy === "size")  return ((a.size_bytes||0) - (b.size_bytes||0)) * dir;
      const da = new Date(a.date||0).getTime();
      const db = new Date(b.date||0).getTime();
      return (da - db) * dir;
    });
    return arr;
  }, [mediaList, q, type, featured, sortBy, sortDir]);

  const resetAll = () => {
    setQ(""); setType(""); setFeatured("");
    setSortBy("date"); setSortDir("desc");
  };

  if (!mediaList?.length) {
    return (
      <div className="text-slate-600 py-16 lg:py-20 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FaImage className="text-slate-400 text-3xl" />
        </div>
        <p>{t('visualiseur.media.noMedia')}</p>
      </div>
    );
  }

  // --- Tuiles (grille) ---
  const Card = ({ m }) => (
    <div
      key={m.id ?? m.fileUrl}
      className={`rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur-sm p-4 hover:shadow-xl transition-all duration-300 w-64 ${ACCENT.glowSoft}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 ${iconBgForType(m.type)} rounded-xl flex items-center justify-center`}>
          {iconForType(m.type, "text-lg")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-800 truncate" title={m.title}>{m.title}</div>
          <div className="text-xs text-slate-500 truncate">
            {(m.size && m.size!=="—") ? `${m.size} • ` : ""}{m.date}
          </div>
        </div>
        {m.favorite && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
            <FiStar className="w-3 h-3" /> {t('visualiseur.media.featured')}
          </span>
        )}
      </div>

      {m.type === "image" && (
        <button onClick={() => onPreview?.(m)} className="mt-3 block text-left">
          <img
            src={toAbsolute(m.thumbnail || m.fileUrl)}
            alt={m.title}
            className="w-full h-44 object-cover rounded-xl border border-slate-200/50"
          />
        </button>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => onPreview?.(m)}
          className={`px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm ${ACCENT.focus}`}
          title={t('visualiseur.media.preview')}
        >
          <FaEye className="inline -mt-0.5 mr-2" />
          {t('visualiseur.media.preview')}
        </button>
        <a
          href={m.fileUrl}
          target="_blank"
          rel="noreferrer"
          className={`px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm ${ACCENT.focus}`}
          title={t('visualiseur.media.open')}
        >
          <FaExternalLinkAlt className="inline -mt-0.5 mr-2" />
          {t('visualiseur.media.open')}
        </a>
      </div>
    </div>
  );

  // --- Ligne (liste) ---
  const Row = ({ m }) => (
    <div
      key={m.id ?? m.fileUrl}
      className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur-sm p-3"
    >
      <div className={`w-10 h-10 ${iconBgForType(m.type)} rounded-lg flex items-center justify-center`}>
        {iconForType(m.type, "text-base")}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate" title={m.title}>
          {m.title}
        </div>
        <div className="text-[12px] text-slate-500 truncate">
          {(m.size && m.size!=="—") ? `${m.size} • ` : ""}{m.date}
          {m.favorite && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">{t('visualiseur.media.featured')}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPreview?.(m)}
          className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm"
          title={t('visualiseur.media.preview')}
        >
          <FaEye />
        </button>
        <a
          href={m.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm"
          title={t('visualiseur.media.open')}
        >
          <FaExternalLinkAlt />
        </a>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <FiSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('visualiseur.media.search')}
              className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          <button
            onClick={() => setFiltersOpen(o => !o)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 ${filtersOpen ? "border-blue-200 text-blue-700" : "border-slate-200 text-slate-700"} hover:bg-slate-50`}
            title={filtersOpen ? t('visualiseur.media.hideFilters') : t('visualiseur.media.showFilters')}
          >
            <FiFilter className="w-4 h-4" />
            {activePills.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-5 px-1.5 rounded-full text-[11px] font-bold bg-blue-600 text-white">
                {activePills.length}
              </span>
            )}
            {filtersOpen ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`inline-flex items-center justify-center rounded-xl border-2 px-2.5 py-2 text-sm font-semibold ${viewMode==='grid' ? "border-blue-200 text-blue-700" : "border-slate-200 text-slate-700"} hover:bg-slate-50`}
            title={t('visualiseur.media.grid')}
          >
            <FiGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`inline-flex items-center justify-center rounded-xl border-2 px-2.5 py-2 text-sm font-semibold ${viewMode==='list' ? "border-blue-200 text-blue-700" : "border-slate-200 text-slate-700"} hover:bg-slate-50`}
            title={t('visualiseur.media.list')}
          >
            <FiList className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pills actifs */}
      {activePills.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {activePills.map(p => (
            <span key={p.id} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${ACCENT.pill}`}>
              {p.label}
              <button onClick={p.clear} className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded hover:bg-blue-100">
                <FiX className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button onClick={resetAll} className={`ml-1 text-[11px] font-semibold underline text-blue-700 ${ACCENT.focus}`}>
            {t('visualiseur.media.reset')}
          </button>
        </div>
      )}

      {/* Bloc filtres */}
      {filtersOpen && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">{t('visualiseur.media.type')}</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-200"
              >
                <option value="">{t('visualiseur.media.allTypes')}</option>
                <option value="image">{t('visualiseur.media.typeImage')}</option>
                <option value="video">{t('visualiseur.media.typeVideo')}</option>
                <option value="pdf">PDF</option>
                <option value="word">Word</option>
                <option value="excel">Excel</option>
                <option value="ppt">PowerPoint</option>
                <option value="other">{t('visualiseur.media.typeOther')}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">{t('visualiseur.media.featured')}</label>
              <select
                value={featured}
                onChange={(e) => setFeatured(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-200"
              >
                <option value="">{t('visualiseur.media.allFeatured')}</option>
                <option value="1">{t('visualiseur.media.featuredYes')}</option>
                <option value="0">{t('visualiseur.media.featuredNo')}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">{t('visualiseur.media.sort')}</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-200"
              >
                <option value="date">{t('visualiseur.media.sortDate')}</option>
                <option value="title">{t('visualiseur.media.sortTitle')}</option>
                <option value="size">{t('visualiseur.media.sortSize')}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">{t('visualiseur.media.direction')}</label>
              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-200"
              >
                <option value="desc">{t('visualiseur.media.desc')}</option>
                <option value="asc">{t('visualiseur.media.asc')}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Liste / Grille */}
      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border-2 border-slate-200 bg-white px-4 py-6 text-center text-slate-600">
          {t('visualiseur.media.noResults')}
        </div>
      ) : viewMode === "grid" ? (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(m => <Card key={m.id ?? m.fileUrl} m={m} />)}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3">
          {filtered.map(m => <Row key={m.id ?? m.fileUrl} m={m} />)}
        </div>
      )}
    </div>
  );
}

function Metadonnees({ article, currentType, currentTitle }) {
  const { t } = useTranslation();
  const tagList = Array.isArray(article?.tags) ? article.tags : [];
  const sortedTagList = useMemo(() => sortTags(tagList), [tagList]);

  const rows = [
    [t('visualiseur.metadata.title'), article?.title || "—"],
    [t('visualiseur.metadata.filename'), currentTitle || "—"],
    [t('visualiseur.metadata.mediaType'), currentType ? currentType.toUpperCase() : "—"],
    [t('visualiseur.metadata.status'), article?.status || "—"],
    [t('visualiseur.metadata.visibility'), article?.visibility || "—"],
    [t('visualiseur.metadata.creationDate'), formatDate(article?.created_at)],
    [t('visualiseur.metadata.lastModified'), formatDate(article?.updated_at)],
    [t('visualiseur.metadata.publishedDate'), formatDate(article?.published_at)],
    [t('visualiseur.metadata.author'), authorNameOf(article)],
    [t('visualiseur.metadata.mainCategory'), firstCategory(article)],
    [t('visualiseur.metadata.tags'), "__TAGS__"],
    [t('visualiseur.metadata.readingTime'), article?.reading_time ?? "—"],
    [t('visualiseur.metadata.wordCount'), article?.word_count ?? "—"],
    [t('visualiseur.metadata.id'), article?.id ?? "—"],
    [t('visualiseur.metadata.slug'), article?.slug ?? "—"],
  ];

  return (
    <div className="w-full h-full overflow-auto">
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/40 overflow-hidden shadow-lg">
        <table className="min-w-full divide-y divide-slate-200/50">
          <tbody className="divide-y divide-slate-200/50">
            {rows.map(([k, v]) => {
              if (v === "__TAGS__") {
                return (
                  <tr key={k} className="hover:bg-slate-50/60 transition-colors duration-300">
                    <td className="px-6 lg:px-8 py-5 text-sm font-medium text-slate-800 bg-slate-50/60 border-r border-slate-200/50 w-1/3">{k}</td>
                    <td className="px-6 lg:px-8 py-5 text-sm text-slate-700">
                      {sortedTagList.length ? (
                        <div className="flex flex-wrap gap-2">
                          {sortedTagList.map((t, i) => <TagPill key={t.id ?? `${t.name}-${i}`} tag={t} />)}
                        </div>
                      ) : "—"}
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={k} className="hover:bg-slate-50/60 transition-colors durée-300">
                  <td className="px-6 lg:px-8 py-5 text-sm font-medium text-slate-800 bg-slate-50/60 border-r border-slate-200/50 w-1/3">{k}</td>
                  <td className="px-6 lg:px-8 py-5 text-sm text-slate-700">
                    {Array.isArray(v) ? (v.length ? (
                      <div className="flex flex-wrap gap-2">
                        {v.map((t, i) => <TagPill key={t.id ?? `${t.name}-${i}`} tag={t} />)}
                      </div>
                    ) : "—") : (v || "—")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Versions({ history }) {
  const { t } = useTranslation();
  
  return (
    <div className="w-full h-full overflow-auto">
      <div className="space-y-4 max-h-[100vh] overflow-y-auto pr-2">
        {history.map((h) => (
          <div key={h.id} className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/40 transition-all duration-500">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-slate-800 capitalize flex items-center text-lg">
                  <FaHistory className="mr-3 text-slate-500" />
                  {h.action || t('visualiseur.change')}
                </h4>
                <p className="text-sm text-slate-500 mt-2">{formatDate(h.created_at)} {h.ip_address ? `• ${h.ip_address}` : ""}</p>
              </div>
              {h.user_agent && <span className="text-xs text-slate-400 mt-1 max-w-xs truncate">{h.user_agent}</span>}
            </div>
            {h.notes && (
              <p className="text-sm mt-4 text-slate-700 bg-slate-50/50 p-3 rounded-xl">
                {h.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsCharts({ article }) {
  const { t } = useTranslation();
  
  const views     = Number(article.view_count || 0);
  const shares    = Number(article.share_count || 0);
  const comments  = Number(article.comment_count || 0);
  const ratings   = Number(article.rating_count || 0);
  const avgRating = Math.max(0, Math.min(5, Number(article.rating_average || 0)));

  const engagementData = [
    { name: t('visualiseur.statistics.views'), value: views, icon: <FaEye /> },
    { name: t('visualiseur.statistics.shares'), value: shares, icon: <FaShareAlt /> },
    { name: t('visualiseur.statistics.comments'), value: comments, icon: <FaComment /> },
    { name: t('visualiseur.statistics.ratings'), value: ratings, icon: <FaStar /> },
  ].filter(d => d.value > 0);

  const actionsCount = (article.history || []).reduce((acc, h) => {
    const k = (h.action || t('visualiseur.other')).toLowerCase();
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="w-full bg-gradient-to-br from-slate-50/30 via-white/30 to-blue-50/30 backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8">
      <Toaster />

      <div className="mb-8 lg:mb-10">
        <h1 className="text-2xl lg:3xl font-light text-slate-800 mb-2 leading-tight">
          {t('visualiseur.statistics.title')}
        </h1>
        <div className="h-[3px] w-16 lg:w-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
      </div>

      <div className="flex flex-wrap gap-3 sm:gap-4 lg:gap-5 mb-8 lg:mb-12 text-base leading-tight">
        <div className="flex-1 min-w-[140px] sm:min-w-[160px] md:min-w-[180px] xl:min-w-[200px]">
          <KpiCard className="p-3 sm:p-4 rounded-xl shadow-sm" label={t('visualiseur.statistics.views')} value={views} icon={<FaEye />} color="blue" />
        </div>
        <div className="flex-1 min-w-[140px] sm:min-w-[160px] md:min-w-[180px] xl:min-w-[200px]">
          <KpiCard className="p-3 sm:p-4 rounded-xl shadow-sm" label={t('visualiseur.statistics.shares')} value={shares} icon={<FaShareAlt />} color="green" />
        </div>
        <div className="flex-1 min-w-[140px] sm:min-w-[160px] md:min-w-[180px] xl:min-w-[200px]">
          <KpiCard className="p-3 sm:p-4 rounded-xl shadow-sm" label={t('visualiseur.statistics.comments')} value={comments} icon={<FaComment />} color="blue" />
        </div>
        <div className="flex-1 min-w-[140px] sm:min-w-[160px] md:min-w-[180px] xl:min-w-[200px]">
          <KpiCard className="p-3 sm:p-4 rounded-xl shadow-sm" label={t('visualiseur.statistics.averageRating')} value={avgRating?.toFixed(2)} suffix="/5" icon={<FaStar />} color="orange" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 lg:gap-4">
        <div className="flex-1 basis-full xl:basis-1/3 min-w-[240px]">
          <ChartCard className="p-4 sm:p-5 rounded-xl shadow-sm" title={t('visualiseur.statistics.engagement')} subtitle={t('visualiseur.statistics.engagementSubtitle')} icon={<FaChartBar />}>
            {engagementData.length ? (
              <div className="h-56 md:h-64 xl:h-72 2xl:h-[24rem] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie dataKey="value" data={engagementData} innerRadius={44} outerRadius={80} paddingAngle={2} stroke="none">
                      {engagementData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 8px 20px -6px rgba(0,0,0,0.12)',
                        fontSize: '13px',
                        padding: '8px 10px',
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message={t('visualiseur.statistics.noEngagementData')} />
            )}
          </ChartCard>
        </div>

        <div className="flex-1 basis-full xl:basis-1/3 min-w-[240px]">
          <ChartCard className="p-4 sm:p-5 rounded-xl shadow-sm"
            title={engagementData.length ? t('visualiseur.statistics.popularTags') : t('visualiseur.statistics.history')}
            subtitle={engagementData.length ? t('visualiseur.statistics.tagUsage') : t('visualiseur.statistics.actions')}
            icon={engagementData.length ? <FaTag /> : <FaHistory />}>
            <div className="h-56 md:h-64 xl:h-72 2xl:h-[24rem]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(article.tags || []).length
                    ? (article.tags || []).map(t => ({ name: t.name, usage: Number(t.usage_count || 0) }))
                    : Object.entries((article.history || []).reduce((acc, h) => { const k = (h.action || t('visualiseur.other')).toLowerCase(); acc[k] = (acc[k] || 0) + 1; return acc; }, {})).map(([k, v]) => ({ name: k, count: v }))}
                  margin={{ top: 16, right: 16, left: 12, bottom: 52 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" opacity={0.6} />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={70}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 8px 20px -6px rgba(0,0,0,0.12)',
                      fontSize: '13px',
                      padding: '8px 10px',
                    }}
                  />
                  <Bar dataKey={(article.tags || []).length ? 'usage' : 'count'} fill="#3b82f6" radius={[6, 6, 0, 0]} stroke="none" barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <div className="flex-1 basis-full xl:basis-1/3 min-w-[240px]">
          <ChartCard className="p-4 sm:p-5 rounded-xl shadow-sm" title={t('visualiseur.statistics.quality')} subtitle={t('visualiseur.statistics.averageScore')} icon={<FaStar />}>
            <div className="h-56 md:h-64 xl:h-72 2xl:h-[24rem] flex flex-col items-center justify-center">
              {avgRating > 0 ? (
                <>
                  <div className="relative w-36 h-36 md:w-40 md:h-40 xl:w-44 xl:h-44 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart innerRadius="62%" outerRadius="88%" data={[{ name: t('visualiseur.statistics.rating'), value: (avgRating / 5) * 100 }]} startAngle={90} endAngle={-270}>
                        <RadialBar dataKey="value" minAngle={12} clockWise background={{ fill: '#e2e8f0' }} fill="#fbbf24" cornerRadius={6} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-2xl md:text-3xl font-light text-slate-800">
                        {avgRating.toFixed(1)}
                      </div>
                      <div className="text-xs text-slate-500">{t('visualiseur.statistics.outOf5')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <FaStar key={i} className={i < Math.round(avgRating) ? 'text-yellow-400' : 'text-gray-200'} size={14} />
                    ))}
                    <span className="ml-2 text-xs sm:text-sm text-slate-600">
                      ({ratings} {ratings <= 1 ? t('visualiseur.statistics.rating') : t('visualiseur.statistics.rating_plural')})
                    </span>
                  </div>
                </>
              ) : (
                <EmptyChart message={t('visualiseur.statistics.noRatingData')} />
              )}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

function DetailsPanel({
  article, currentType, currentTitle,
  selectedFile, me, token, rights, onOpenRating, onOpenRatingEdit,
  ratingAverage, ratingCount, myRating, ratingLoaded
}) {
  const { t } = useTranslation();

  const statusLabel = (article?.status || "—").toString();
  const statusKey = statusLabel.toLowerCase();
  const statusCls =
    /publi|actif|online|en ligne/.test(statusKey)
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : /brouillon|draft/.test(statusKey)
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      : /archiv|inactif|désactiv/.test(statusKey)
      ? "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
      : "bg-blue-50 text-blue-700 ring-1 ring-blue-200";

  const avatar = authorAvatarUrl(article);
  const name = authorNameOf(article);

  return (
    <aside className="shrink-0 w-full sm:w-[20rem] lg:w-[22rem] xl:w-[24rem] 2xl:w-[26rem] p-6 lg:p-8">
      <h2 className="text-2xl font-light text-slate-800 mb-6 lg:mb-8 flex items-center">
        <FaInfoCircle className="mr-3 text-blue-600" />
        {t('visualiseur.details.title')}
      </h2>

      <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/70 backdrop-blur-sm mb-6">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-sky-300 to-transparent" />

        {/* Header compact */}
        <div className="relative flex items-center gap-3 p-4 border-b border-slate-200/50">
          <div className={`w-12 h-12 ${iconBgForType(currentType)} rounded-xl flex items-center justify-center shadow-md ring-1 ring-inset ring-white/40`}>
            {iconForType(currentType, "text-lg")}
          </div>

          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 truncate leading-tight">
              {currentTitle || t('visualiseur.untitled')}
            </h3>
            <p className="text-[11px] font-medium text-slate-500/80 mt-0.5 leading-snug">
              {formatDate(article?.created_at)} • {firstCategory(article)}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-1.5 flex-col">
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusCls}`}>
              {statusLabel}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 ring-1 ring-sky-200">
              {currentType ? currentType.toUpperCase() : "—"}
            </span>
          </div>
        </div>

        {/* Contenu compact */}
        <div className="p-4">
          {/* Auteur avec avatar */}
          <div className="flex items-center gap-3 mb-3">
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="w-10 h-10 rounded-full ring-1 ring-white/70 border border-slate-200 object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-semibold">
                {initialsOf(name)}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">{name}</div>
              <div className="text-xs text-slate-500 truncate">{t('visualiseur.details.author')}</div>
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] leading-tight">
            <div className="rounded-lg border border-slate-200/60 bg-white/60 p-3">
              <dt className="flex items-center gap-2 text-slate-500">
                <FiCalendar className="w-4 h-4" />
                <span>{t('visualiseur.details.creationDate')}</span>
              </dt>
              <dd className="mt-0.5 ml-6 font-medium text-slate-900">
                {formatDate(article?.created_at)}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-200/60 bg-white/60 p-3">
              <dt className="flex items-center gap-2 text-slate-500">
                <FiClock className="w-4 h-4" />
                <span>{t('visualiseur.details.lastModified')}</span>
              </dt>
              <dd className="mt-0.5 ml-6 font-medium text-slate-900">
                {formatDate(article?.updated_at)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex gap-4 items-center justify-start">
            <div className="flex items-center gap-2 text-slate-500 text-[13px]">
              <FiTag className="w-4 h-4" />
              <span>{t('visualiseur.details.category')}</span>
            </div>
            <span className="inline-flex items-center rounded-full bg-indigo-50 text-blue-700 ring-1 ring-indigo-200 px-2.5 py-1 text-[11px] font-semibold">
              {firstCategory(article)}
            </span>
          </div>
        </div>
      </div>

      {/* Qualité / Notation */}
      <div className="bg-white/40 backdrop-blur-sm p-4 rounded-xl border border-slate-200/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <FaStar
                  key={i}
                  className={
                    i < Math.round(Math.max(0, Math.min(5, Number(ratingAverage || 0))))
                      ? "text-yellow-400"
                      : "text-gray-300"
                  }
                  size={14}
                />
              ))}
            </div>
            <span className="text-sm text-slate-600 font-medium">
              {(Number(ratingAverage || 0)).toFixed(1)}
            </span>
            <span className="text-xs text-slate-400">
              ({Number(ratingCount || 0)} {Number(ratingCount || 0) <= 1 ? t('visualiseur.statistics.rating') : t('visualiseur.statistics.rating_plural')})
            </span>
          </div>

          {article?.allow_rating !== false && (
            <div className={ACCENT.focus}>
              <RateButton
                onClick={ratingLoaded && typeof myRating === "number" ? onOpenRatingEdit : onOpenRating}
                label={ratingLoaded && typeof myRating === "number" ? t('visualiseur.details.editRating') : t('visualiseur.details.rate')}
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
