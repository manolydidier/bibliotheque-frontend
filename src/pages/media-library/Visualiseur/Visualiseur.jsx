// src/media-library/Visualiseur.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import SmartImage from "../parts/SmartImage";
import SeoPanel from "./components/SeoPanel";
import Sidebar from "./components/Sidebar";
import Toolbar from "./components/Toolbar";
import Tabs from "./components/Tabs";
import TagList, { TagPill } from "./components/TagList";
import { KpiCard, ChartCard, EmptyChart } from "./components/Cards";
import {
  setAuthError,
  clearAuthError,
  selectAuthError
} from "../../../store/slices/Slice";
import {
  FaDownload,
  FaExternalLinkAlt, FaChevronLeft, FaChevronRight, FaSearchPlus, FaSearchMinus,
  FaFilePdf, FaFileExcel, FaFileWord, FaImage, FaFileVideo, FaFile, FaTag, FaStar, FaClock, FaEye, FaComment, FaChartBar, FaHistory, FaInfoCircle, FaPlay, FaTimes, FaShareAlt,
  FaLock
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
import { FiCalendar, FiClock, FiTag } from "react-icons/fi";
import SeoHead from "../../../services/SeoHead";

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

const primaryMediaUrl = (art) => {
  if (!art) return null;
  const raw =
    (typeof art.featured_image === "string" && art.featured_image) ||
    art.featured_image?.url ||
    art.media?.[0]?.url ||
    null;
  return raw ? toAbsolute(raw) : null;
};

// Image de fond “édition” (plusieurs conventions supportées côté Laravel)
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

  const [activeTab, setActiveTab] = useState("Aperçu");
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  /* ------- Actions ------- */
  const openInNew = () => { const u = selectedFile?.fileUrl || primaryMediaUrl(article); if (u) window.open(u, "_blank", "noopener,noreferrer"); };
  const downloadCurrent = () => {
    const u = selectedFile?.fileUrl || primaryMediaUrl(article);
    if (!u) return;
    const a = document.createElement("a");
    a.href = u; a.download = "";
    document.body.appendChild(a); a.click(); a.remove();
  };

  /* ------- Unlock ------- */
  async function handleUnlock(password) {
    if (!password) {
      dispatch(setAuthError("Merci de saisir un mot de passe."));
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
      document.title = art?.title || "Visualiseur";
    } catch (e) {
      const apiCode = e?.response?.data?.code?.toString()?.toLowerCase?.() || "";
      if (apiCode === "private") {
        dispatch(setAuthError("Cet article est privé — aucun mot de passe ne permet d’y accéder. Demandez une autorisation à un administrateur."));
        setLockedKind("private");
        setUnlockOpen(false);
      } else if (e.incorrectPassword) {
        const msg = e.message || "Mot de passe invalide.";
        dispatch(setAuthError(msg));
        setUnlockOpen(true);
      } else {
        const msg = e?.response?.data?.message || "Erreur lors du déverrouillage.";
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
      setErr("Identifiant/slug manquant dans l'URL.");
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
        document.title = art?.title || "Visualiseur";
      } catch (e) {
        if (!mounted) return;
        if (e.locked) {
          const code = (e.code || "").toString().toLowerCase();
          if (/private/.test(code)) {
            setLockedKind("private");
            setUnlockOpen(false);
            setErr("");
            dispatch(setAuthError("Accès restreint — permission requise."));
          } else if (/password/.test(code) || !code) {
            setLockedKind("password");
            setUnlockOpen(true);
            setErr("");
            dispatch(setAuthError("Mot de passe requis."));
          } else {
            setLockedKind("unknown");
            setUnlockOpen(true);
            setErr("");
            dispatch(setAuthError("Accès restreint — authentification requise."));
          }
        } else {
          setErr(e?.message || "Erreur lors du chargement");
          dispatch(clearAuthError());
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [idOrSlug, dispatch]);

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

  useEffect(() => {
    if (meLoading) return;
    // debug logs if needed
  }, [me, meLoading, token]);

  useEffect(() => {}, [article?.visibility]);

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
    const medias = Array.isArray(article?.media) ? article.media : [];
    const bgEdit = backgroundMediaUrl(article);
    const seen = new Set();
    const list = [];

    if (bgEdit) {
      list.push({
        id: "bg-edit",
        title: "Image de fond (édition)",
        type: "image",
        size: "—",
        date: formatDate(article?.published_at),
        category: firstCategory(article),
        thumbnail: bgEdit,
        fileUrl: bgEdit,
        favorite: false,
      });
      seen.add(bgEdit);
    }

    if (medias.length) {
      list.push(
        ...medias
          .filter((m) => !!m?.url)
          .map((m, idx) => {
            const abs = toAbsolute(m.url);
            return !abs || seen.has(abs) ? null : {
              id: m.id || idx + 1,
              title: m.title || article?.title || "Pièce jointe",
              type: inferTypeFromUrl(abs),
              size: m.size_readable || "—",
              date: formatDate(article?.published_at),
              category: firstCategory(article),
              thumbnail: abs,
              fileUrl: abs,
              favorite: m.is_favorite || false,
            };
          })
          .filter(Boolean)
      );
      if (list.length) return list;
    }

    const src = primaryMediaUrl(article);
    if (src) {
      return [
        ...list,
        {
          id: 1,
          title: article?.title || "Pièce jointe",
          type: inferTypeFromUrl(src),
          size: "—",
          date: formatDate(article?.published_at),
          category: firstCategory(article),
          thumbnail: src,
          fileUrl: src,
          favorite: article?.is_featured || false,
        }
      ];
    }

    return list;
  }, [article]);

  /* ------- Default selected media ------- */
  const currentType  = selectedFile?.type || inferTypeFromUrl(primaryMediaUrl(article));
  const currentUrl   = selectedFile?.fileUrl || primaryMediaUrl(article);
  const currentTitle = selectedFile?.title || article?.title || "Sélectionnez un fichier";

  useEffect(() => {
    if (!mediaList.length) { setSelectedFile(null); return; }
    if (!selectedFile || !mediaList.some(m => m.fileUrl === selectedFile.fileUrl)) {
      setSelectedFile(mediaList[0]);
    }
  }, [mediaList, selectedFile]);

  useEffect(() => {
    if (!article?.id) return;
    setSelectedFile(null);
    setActiveTab("Aperçu");
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
  }, [article?.id]);

  useEffect(() => {
    const u = selectedFile?.fileUrl || primaryMediaUrl(article);
    if (u) {} // debug if needed
  }, [selectedFile, article]);

  const shareData = useMemo(() => ({
    title: article?.title || "",
    excerpt: article?.excerpt || article?.title || "",
    url: typeof window !== "undefined" ? window.location.href : "",
    articleId: article?.id ?? null
  }), [article]);

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
        <div className="text-red-500 text-center">{err}</div>
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
                ? "Accès restreint — vous n’avez pas la permission."
                : "Cliquez, Entrée, P ou Ctrl+K pour entrer le mot de passe"
            }
            className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/70 border border-white/60 shadow cursor-pointer select-none"
          >
            <FaLock className="text-blue-600" />
            <span>
              {isPrivateLock
                ? "Accès restreint — vous n’avez pas la permission de consulter cet article."
                : "Contenu protégé — cliquez ou appuyez sur P pour entrer le mot de passe"}
            </span>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {isPrivateLock
              ? "Demandez une autorisation à un administrateur ou revenez en arrière."
              : "Astuce : P, Entrée ou Ctrl+K rouvrent la fenêtre. Vous pouvez aussi déclencher window.visualiseur.openPassword() ou l’événement « visualiseur:openPassword »."}
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-3 rounded-xl border border-slate-300/60 text-slate-700 bg-white/80 hover:bg-white transition"
            >
              Retour
            </button>
            {!token && (
              <a
                href="/auth"
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition"
              >
                Se connecter
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
            title="Déverrouiller l’article"
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
        <div className="text-red-500 text-center">Article introuvable.</div>
      </div>
    );
  }

  const hasHistory = Array.isArray(article.history) && article.history.length > 0;
  const tabs = ["Aperçu", "Médias", "Métadonnées", ...(hasHistory ? ["Versions"] : []), "Statistiques", "SEO"];

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

      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 font-sans px-3 sm:px-4 lg:px-6 2xl:px-10 py-4">
        {unlockError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {unlockError}
          </div>
        )}

        <div className="flex gap-4 lg:gap-6 xl:gap-8">
          <Sidebar
            open={sidebarOpen}
            toggle={() => setSidebarOpen(s => !s)}
            mediaCount={mediaList.length}
            tags={article?.tags || []}
            mediaList={mediaList}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
            similar={similar}
            similarLoading={similarLoading}
            onOpenSimilar={(slugOrId) => { setSelectedFile(null); navigate(`/articles/${slugOrId}`); }}
            onOpenTagManager={() => setTagModalOpen(true)}
            TagListComponent={TagList}
            iconForType={iconForType}
            iconBgForType={iconBgForType}
            toAbsolute={toAbsolute}
          />

          {/* Main */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 overflow-hidden">
              <div className="sticky top-5 z-10 bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/40">
                <Toolbar
                  onBack={() => navigate(-1)}
                  onRefresh={() => setActiveTab("Aperçu")}
                  onFullscreen={() => setFullscreen(true)}
                  onDownload={downloadCurrent}
                  shareData={shareData}
                />
              </div>

              <div className="flex gap-4 lg:gap-6 xl:gap-8">
                {/* Main panel */}
                <div className="flex-1 min-w-0 border-r border-slate-200/30">
                  <div className="p-5 sm:p-6 lg:p-8">
                    <Tabs list={tabs} active={activeTab} onChange={setActiveTab} />
                    <div key={article?.id} ref={previewRef} className="file-preview-container min-h-[50vh]">
                      {activeTab === "Aperçu" && (
                        <Apercu
                          article={article}
                          currentUrl={currentUrl}
                          currentType={currentType}
                          currentTitle={currentTitle}
                          onOpen={openInNew}
                          onDownload={downloadCurrent}
                        />
                      )}
                      {activeTab === "Médias" && <Medias mediaList={mediaList} />}
                      {activeTab === "Métadonnées" && (
                        <Metadonnees article={article} currentType={currentType} currentTitle={currentTitle} />
                      )}
                      {activeTab === "Versions" && hasHistory && <Versions history={article.history} />}
                      {activeTab === "Statistiques" && <StatsCharts article={article} />}
                      {activeTab === "SEO" && <SeoPanel article={article} />}
                    </div>
                  </div>
                </div>

                {/* Right panel */}
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
              </div>
            </div>
          </div>
        </div>

        {/* Fullscreen Modal */}
        {fullscreen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="max-w-7xl w-full p-6 sm:p-10 lg:p-12">
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl">
                  <Tabs list={tabs} active={activeTab} onChange={setActiveTab} />
                  {activeTab === "Aperçu" && (
                    <Apercu
                      article={article}
                      currentUrl={currentUrl}
                      currentType={currentType}
                      currentTitle={currentTitle}
                      onOpen={openInNew}
                      onDownload={downloadCurrent}
                    />
                  )}
                  {activeTab === "Médias" && <Medias mediaList={mediaList} />}
                  {activeTab === "Métadonnées" && <Metadonnees article={article} currentType={currentType} currentTitle={currentTitle} />}
                  {activeTab === "Versions" && <Versions history={article.history} />}
                  {activeTab === "Statistiques" && <StatsCharts article={article} />}
                  {activeTab === "SEO" && <SeoPanel article={article} />}
                </div>
              </div>
              <button
                onClick={() => setFullscreen(false)}
                className="absolute top-6 right-6 sm:top-8 sm:right-8 text-white/80 text-2xl sm:text-3xl hover:text-white transition-colors duration-300"
                aria-label="Fermer"
              >
                <FaTimes />
              </button>
            </div>
          </div>
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
              <FaInfoCircle className="mr-2" /> Debug
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
          title="Déverrouiller l’article"
          error={unlockError}
          busy={unlockBusy}
        />
      </div>
    </>
  );
}

/* ---------------- Onglets ---------------- */
function Apercu({ article, currentUrl, currentType, currentTitle, onOpen, onDownload }) {
  const contentStr = (article?.content ?? "").toString();
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(contentStr);
  const bgUrl = backgroundMediaUrl(article);
  const [searchParams] = useSearchParams();
  const isEdit =
    searchParams.get("edit") === "1" ||
    (searchParams.get("mode") || "").toLowerCase() === "edit" ||
    article?.meta?.is_editing === true;

  return (
    <div className="space-y-8 lg:space-y-10 overflow-auto max-h-screen relative">
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
            <h3 className="text-2xl lg:3xl font-light text-slate-800 mb-3">Aucun média</h3>
            <p className="text-slate-600 mt-2 max-w-md mx-auto">Ajoutez un média à l'article ou ouvrez l'onglet « Médias » pour explorer les fichiers disponibles.</p>
          </div>
        ) : (
          <PreviewByType type={currentType} url={currentUrl} title={currentTitle} onOpen={onOpen} onDownload={onDownload} />
        )}

        {contentStr && (
          <div className="pt-2 sm:pt-4">
            <h3 className="text-xl lg:2xl font-light text-slate-800 mb-4 lg:mb-6">Contenu de l'article</h3>
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

function Medias({ mediaList }) {
  if (!mediaList.length) return (
    <div className="text-slate-600 py-16 lg:py-20 text-center">
      <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <FaImage className="text-slate-400 text-3xl" />
      </div>
      <p>Aucun média lié à cet article.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
      {mediaList.map((m, i) => (
        <div key={m.id ?? i} className="border border-slate-200/40 rounded-2xl overflow-hidden bg-white/60 backdrop-blur-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 group">
          <div className="p-5 flex items-center gap-4 bg-slate-50/60">
            <div className={`w-14 h-14 ${iconBgForType(m.type)} rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
              {iconForType(m.type, "text-2xl")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 truncate">{m.title}</p>
              <p className="text-xs text-slate-500">{m.size !== "—" ? `${m.size} • ` : ""}{m.date}</p>
            </div>
            <a href={m.fileUrl} target="_blank" rel="noreferrer" className="ml-auto text-slate-600 hover:text-blue-600 p-2 rounded-xl transition-all duration-300" title="Ouvrir">
              <FaExternalLinkAlt />
            </a>
          </div>
          {m.type === "image" && (
            <div className="p-5">
              <img src={toAbsolute(m.thumbnail)} alt={m.title} className="w-full h-48 object-cover rounded-xl shadow-md group-hover:shadow-xl transition-all duration-500" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PreviewByType({ type, url, title, onOpen, onDownload }) {
  if (type === "image") {
    const abs = toAbsolute(url);
    return (
      <div className="w-full flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-slate-50/60 rounded-2xl border border-slate-200/40 p-6 sm:p-8 backdrop-blur-sm">
          <div className="w-full max-w-full max-h-[62vh] lg:max-h-[65vh]">
            <SmartImage
              src={abs}
              alt={title}
              modern="off"
              ratio="56.25%"
              rounding="rounded-2xl"
              className="object-contain"
            />
          </div>
        </div>
        <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3 sm:gap-4">
          <button onClick={onOpen} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl flex items-center shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <FaExternalLinkAlt className="mr-3" />
            Voir en haute résolution
          </button>
          <button onClick={onDownload} className="bg-white/80 backdrop-blur-sm text-slate-700 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl border border-slate-300/60 flex items-center shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white">
            <FaDownload className="mr-3" />
            Télécharger
          </button>
        </div>
      </div>
    );
  }

  if (type === "pdf") {
    return (
      <div className="w-full flex flex-col">
        <div className="w-full bg-white/60 border border-slate-200/40 rounded-2xl overflow-hidden backdrop-blur-sm shadow-lg">
          <div className="bg-red-50/80 p-4 flex items-center border-b border-red-100/60">
            <FaFilePdf className="text-red-500 mr-4 text-3xl" />
            <span className="font-medium text-slate-800 text-xl">{title}</span>
          </div>
          <div className="p-6 sm:p-8 text-slate-700">
            <p className="text-sm leading-relaxed">Prévisualisation PDF disponible. Ouvrez le fichier pour une lecture complète avec toutes les fonctionnalités.</p>
          </div>
          <div className="bg-slate-50/60 p-4 flex justify-between items-center text-sm text-slate-600 border-t border-slate-200/40">
            <span>Mode prévisualisation</span>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-slate-200/60 rounded-xl transition-colors duration-300"><FaChevronLeft /></button>
              <button className="p-2 hover:bg-slate-200/60 rounded-xl transition-colors duration-300"><FaChevronRight /></button>
              <button className="p-2 hover:bg-slate-200/60 rounded-xl transition-colors duration-300"><FaSearchPlus /></button>
              <button className="p-2 hover:bg-slate-200/60 rounded-xl transition-colors duration-300"><FaSearchMinus /></button>
            </div>
          </div>
        </div>
        <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3 sm:gap-4">
          <button onClick={onOpen} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl flex items-center shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <FaExternalLinkAlt className="mr-3" />
            Ouvrir dans un onglet
          </button>
          <button onClick={onDownload} className="bg-white/80 backdrop-blur-sm text-slate-700 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl border border-slate-300/60 flex items-center shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white">
            <FaDownload className="mr-3" />
            Télécharger
          </button>
        </div>
      </div>
    );
  }

  if (type === "excel" || type === "word") {
    const bgColor = type === "excel" ? "bg-emerald-50/80 border-emerald-100/60" : "bg-blue-50/80 border-blue-100/60";
    const iconColor = type === "excel" ? "text-emerald-600" : "text-blue-600";
    const appName = type === "excel" ? "Excel" : "Word";

    return (
      <div className="w-full flex flex-col">
        <div className="w-full bg-white/60 border border-slate-200/40 rounded-2xl overflow-hidden backdrop-blur-sm shadow-lg">
          <div className={`${bgColor} p-4 flex items-center border-b`}>
            {type === "excel" ? <FaFileExcel className={`${iconColor} mr-4 text-3xl`} /> : <FaFileWord className={`${iconColor} mr-4 text-3xl`} />}
            <span className="font-medium text-slate-800 text-xl">{title}</span>
          </div>
          <div className="p-6 sm:p-8 text-slate-700">
            <p className="text-sm leading-relaxed">Aperçu non disponible pour ce type de fichier — ouvrez le document ci-dessous pour le consulter.</p>
          </div>
        </div>
        <div className="mt-6 sm:mt-8 flex justify-center">
          <a href={url} target="_blank" rel="noreferrer" className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-4 rounded-2xl flex items-center shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <FaExternalLinkAlt className="mr-3" /> Ouvrir dans {appName}
          </a>
        </div>
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="w-full flex flex-col">
        <div className="w-full bg-black rounded-2xl overflow-hidden border border-slate-200/40 shadow-2xl">
          <div className="relative pt-[56.25%]">
            <img src={url} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <a href={url} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-4xl sm:text-5xl opacity-90 hover:bg-white/30 hover:scale-110 transition-all duration-300 group-hover:shadow-2xl">
                <FaPlay className="ml-1" />
              </div>
            </a>
          </div>
        </div>
        <div className="mt-6 sm:mt-8 flex justify-center">
          <a href={url} target="_blank" rel="noreferrer" className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-4 rounded-2xl flex items-center shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <FaPlay className="mr-3" /> Lire la vidéo
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center py-14 lg:py-16">
      <div className="text-center">
        <div className="w-24 h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <FaFile className="text-slate-600 text-4xl lg:text-5xl" />
        </div>
        <h3 className="text-2xl lg:text-3xl font-light text-slate-800 mb-3">{title}</h3>
        <p className="text-slate-600 mt-2 mb-6 lg:mb-8 max-w-md mx-auto">Aperçu non disponible pour ce type de fichier</p>
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <FaDownload className="mr-3" /> Ouvrir le fichier
        </a>
      </div>
    </div>
  );
}

function Metadonnees({ article, currentType, currentTitle }) {
  const tagList = Array.isArray(article?.tags) ? article.tags : [];
  const sortedTagList = useMemo(() => sortTags(tagList), [tagList]);

  const rows = [
    ["Titre", article?.title || "—"],
    ["Nom du fichier", currentTitle || "—"],
    ["Type de média", currentType ? currentType.toUpperCase() : "—"],
    ["Statut", article?.status || "—"],
    ["Visibilité", article?.visibility || "—"],
    ["Date de création", formatDate(article?.created_at)],
    ["Dernière modification", formatDate(article?.updated_at)],
    ["Publié le", formatDate(article?.published_at)],
    ["Auteur", authorNameOf(article)],
    ["Catégorie principale", firstCategory(article)],
    ["Mots-clés (tags)", "__TAGS__"],
    ["Lecture (min)", article?.reading_time ?? "—"],
    ["Nombre de mots", article?.word_count ?? "—"],
    ["ID", article?.id ?? "—"],
    ["Slug", article?.slug ?? "—"],
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
                <tr key={k} className="hover:bg-slate-50/60 transition-colors duration-300">
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
  return (
    <div className="w-full h-full overflow-auto">
      <div className="space-y-4 max-h-[100vh] overflow-y-auto pr-2">
        {history.map((h) => (
          <div key={h.id} className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/40 transition-all duration-500">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-slate-800 capitalize flex items-center text-lg">
                  <FaHistory className="mr-3 text-slate-500" />
                  {h.action || "changement"}
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
  const views     = Number(article.view_count || 0);
  const shares    = Number(article.share_count || 0);
  const comments  = Number(article.comment_count || 0);
  const ratings   = Number(article.rating_count || 0);
  const avgRating = Math.max(0, Math.min(5, Number(article.rating_average || 0)));

  const engagementData = [
    { name: "Vues", value: views, icon: <FaEye /> },
    { name: "Partages", value: shares, icon: <FaShareAlt /> },
    { name: "Commentaires", value: comments, icon: <FaComment /> },
    { name: "Notes", value: ratings, icon: <FaStar /> },
  ].filter(d => d.value > 0);

  const tagsBarData = (article.tags || []).map(t => ({
    name: t.name,
    usage: Number(t.usage_count || 0)
  })).filter(d => d.usage > 0);

  const actionsCount = (article.history || []).reduce((acc, h) => {
    const k = (h.action || "autre").toLowerCase();
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const historyBarData = Object.entries(actionsCount).map(([k, v]) => ({ name: k, count: v }));

  return (
    <div className="w-full bg-gradient-to-br from-slate-50/30 via-white/30 to-blue-50/30 backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8">
      <Toaster />

      <div className="mb-8 lg:mb-10">
        <h1 className="text-2xl lg:3xl font-light text-slate-800 mb-2 leading-tight">
          Statistiques de l'article
        </h1>
        <div className="h-[3px] w-16 lg:w-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
      </div>

      <div className="flex flex-wrap gap-3 sm:gap-4 lg:gap-5 mb-8 lg:mb-12 text-base leading-tight">
        <div className="flex-1 min-w-[140px] sm:min-w-[160px] md:min-w-[180px] xl:min-w-[200px]">
          <KpiCard className="p-3 sm:p-4 rounded-xl shadow-sm" label="Vues" value={views} icon={<FaEye />} color="blue" />
        </div>
        <div className="flex-1 min-w-[140px] sm:min-w-[160px] md:min-w-[180px] xl:min-w-[200px]">
          <KpiCard className="p-3 sm:p-4 rounded-xl shadow-sm" label="Partages" value={shares} icon={<FaShareAlt />} color="green" />
        </div>
        <div className="flex-1 min-w-[140px] sm:min-w-[160px] md:min-w-[180px] xl:min-w-[200px]">
          <KpiCard className="p-3 sm:p-4 rounded-xl shadow-sm" label="Commentaires" value={comments} icon={<FaComment />} color="blue" />
        </div>
        <div className="flex-1 min-w-[140px] sm:min-w-[160px] md:min-w-[180px] xl:min-w-[200px]">
          <KpiCard className="p-3 sm:p-4 rounded-xl shadow-sm" label="Note moyenne" value={avgRating?.toFixed(2)} suffix="/5" icon={<FaStar />} color="orange" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 lg:gap-4">
        <div className="flex-1 basis-full xl:basis-1/3 min-w-[240px]">
          <ChartCard className="p-4 sm:p-5 rounded-xl shadow-sm" title="Engagement" subtitle="Répartition des interactions" icon={<FaChartBar />}>
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
              <EmptyChart message="Aucune donnée d'engagement disponible" />
            )}
          </ChartCard>
        </div>

        <div className="flex-1 basis-full xl:basis-1/3 min-w-[240px]">
          <ChartCard className="p-4 sm:p-5 rounded-xl shadow-sm"
            title={tagsBarData.length ? 'Tags populaires' : 'Historique'}
            subtitle={tagsBarData.length ? 'Usage global des tags' : 'Actions effectuées'}
            icon={tagsBarData.length ? <FaTag /> : <FaHistory />}>
            <div className="h-56 md:h-64 xl:h-72 2xl:h-[24rem]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tagsBarData.length ? tagsBarData : historyBarData} margin={{ top: 16, right: 16, left: 12, bottom: 52 }}>
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
                  <Bar dataKey={tagsBarData.length ? 'usage' : 'count'} fill="#3b82f6" radius={[6, 6, 0, 0]} stroke="none" barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <div className="flex-1 basis-full xl:basis-1/3 min-w-[240px]">
          <ChartCard className="p-4 sm:p-5 rounded-xl shadow-sm" title="Qualité" subtitle="Note moyenne attribuée" icon={<FaStar />}>
            <div className="h-56 md:h-64 xl:h-72 2xl:h-[24rem] flex flex-col items-center justify-center">
              {avgRating > 0 ? (
                <>
                  <div className="relative w-36 h-36 md:w-40 md:h-40 xl:w-44 xl:h-44 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart innerRadius="62%" outerRadius="88%" data={[{ name: 'Note', value: (avgRating / 5) * 100 }]} startAngle={90} endAngle={-270}>
                        <RadialBar dataKey="value" minAngle={12} clockWise background={{ fill: '#e2e8f0' }} fill="#fbbf24" cornerRadius={6} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-2xl md:text-3xl font-light text-slate-800">
                        {avgRating.toFixed(1)}
                      </div>
                      <div className="text-xs text-slate-500">sur 5</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <FaStar key={i} className={i < Math.round(avgRating) ? 'text-yellow-400' : 'text-gray-200'} size={14} />
                    ))}
                    <span className="ml-2 text-xs sm:text-sm text-slate-600">
                      ({ratings} {ratings <= 1 ? 'note' : 'notes'})
                    </span>
                  </div>
                </>
              ) : (
                <EmptyChart message="Aucune note disponible" />
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
  const initialTopLevelApproved = useMemo(() => {
    if (Array.isArray(article?.approved_comments)) {
      return article.approved_comments.filter(c => c?.parent_id == null);
    }
    if (Array.isArray(article?.comments)) {
      return article.comments.filter(c => c?.parent_id == null && c?.status === 'approved');
    }
    return [];
  }, [article]);

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
        Détails du fichier
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
              {currentTitle || "Sans titre"}
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
              <div className="text-xs text-slate-500 truncate">Auteur</div>
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] leading-tight">
            <div className="rounded-lg border border-slate-200/60 bg-white/60 p-3">
              <dt className="flex items-center gap-2 text-slate-500">
                <FiCalendar className="w-4 h-4" />
                <span>Date de création</span>
              </dt>
              <dd className="mt-0.5 ml-6 font-medium text-slate-900">
                {formatDate(article?.created_at)}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-200/60 bg-white/60 p-3">
              <dt className="flex items-center gap-2 text-slate-500">
                <FiClock className="w-4 h-4" />
                <span>Dernière modification</span>
              </dt>
              <dd className="mt-0.5 ml-6 font-medium text-slate-900">
                {formatDate(article?.updated_at)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex gap-4 items-center justify-start">
            <div className="flex items-center gap-2 text-slate-500 text-[13px]">
              <FiTag className="w-4 h-4" />
              <span>Catégorie</span>
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
              ({Number(ratingCount || 0)} {Number(ratingCount || 0) <= 1 ? "note" : "notes"})
            </span>
          </div>

          {article?.allow_rating !== false && (
            <RateButton
              onClick={ratingLoaded && typeof myRating === "number" ? onOpenRatingEdit : onOpenRating}
              label={ratingLoaded && typeof myRating === "number" ? "Modifier" : "Noter"}
            />
          )}
        </div>
      </div>

      {article?.allow_comments !== false && (
        <Comments
          key={article?.id}
          articleId={article?.id}
          initialComments={initialTopLevelApproved}
          meOverride={me}
          tokenOverride={token}
          rightsOverride={rights}
        />
      )}
    </aside>
  );
}
