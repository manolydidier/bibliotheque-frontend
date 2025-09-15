// src/media-library/Visualiseur.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaFolderOpen,
  FaArrowLeft, FaArrowRight, FaRedo, FaExpand, FaDownload,
  FaExternalLinkAlt, FaChevronLeft, FaChevronRight, FaSearchPlus, FaSearchMinus,
  FaFilePdf, FaFileExcel, FaFileWord, FaImage, FaFileVideo, FaFile, FaTag, FaStar, FaClock, FaEye, FaComment, FaChartBar, FaHistory, FaInfoCircle, FaSearch, FaPlus, FaPlay, FaTimes, FaShareAlt
} from "react-icons/fa";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadialBarChart, RadialBar
} from "recharts";
import axios from "axios";
import { fetchArticle, fetchSimilarArticles, buildArticleShowUrl, DEBUG_HTTP } from "../api/articles";
import { formatDate } from "../shared/utils/format";
import Comments from "./Comments";
import TagManagerModal from "./TagManagerModal";
import Toaster from "../../../component/toast/Toaster";

// ✅ Bouton de partage
import ShareButton from "../Visualiseur/share/ShareButton";
// ✅ Notation d’article
import RatingModal, { RateButton } from "../RatingModal";

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

const primaryMediaUrl = (art) => {
  if (!art) return null;
  if (typeof art.featured_image === "string") return art.featured_image;
  if (art.featured_image?.url) return art.featured_image.url;
  return art.media?.[0]?.url || null;
};

const inferTypeFromUrl = (url) => {
  if (!url) return "other";
  const s = url.toLowerCase();
  if (s.endsWith(".pdf")) return "pdf";
  if (/\.(xlsx?|csv)$/.test(s)) return "excel";
  if (/\.(docx?|rtf)$/.test(s)) return "word";
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(s)) return "image";
  if (/\.(mp4|webm|ogg|mov)$/.test(s)) return "video";
  return "other";
};

const iconForType = (type, className = "") => {
  const common = `text-xl ${className}`;
  switch (type) {
    case "pdf":   return <FaFilePdf className={`${common} text-red-500`} />;
    case "excel": return <FaFileExcel className={`${common} text-emerald-500`} />;
    case "word":  return <FaFileWord className={`${common} text-blue-500`} />;
    case "image": return <FaImage className={`${common} text-amber-500`} />;
    case "video": return <FaFileVideo className={`${common} text-purple-500`} />;
    default:      return <FaFile className={`${common} text-slate-500`} />;
  }
};

const iconBgForType = (type) => {
  switch (type) {
    case "pdf": return "bg-red-50 border-red-100";
    case "excel": return "bg-emerald-50 border-emerald-100";
    case "word": return "bg-blue-50 border-blue-100";
    case "image": return "bg-amber-50 border-amber-100";
    case "video": return "bg-purple-50 border-purple-100";
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

/* ---------- Tag UI ---------- */
function TagPill({ tag, className = "", onClick }) {
  const pal = makeTagPalette(tag?.color);
  return (
    <button
      type="button"
      onClick={onClick}
      title={tag?.name}
      className={`group inline-flex max-w-full items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border
                  bg-white/70 backdrop-blur-sm shadow-sm border-slate-200/60 hover:shadow-md hover:bg-white/90 
                  transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-1 ${className}`}
    >
      <span
        aria-hidden
        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: pal.dot }}
      />
      <span className="truncate" style={{ color: pal.text }}>{tag?.name}</span>
    </button>
  );
}

function TagList({ tags, onAddClick, onTagClick, max = 10 }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = useMemo(() => sortTags(tags), [tags]);
  const visible = expanded ? sorted : sorted.slice(0, max);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((t, i) => (
        <TagPill key={t.id ?? `${t.name}-${i}`} tag={t} onClick={() => onTagClick?.(t)} />
      ))}

      {sorted.length > max && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white/70 text-slate-600 hover:bg-white/90 transition-all duration-300"
        >
          {expanded ? "Voir moins" : `+${sorted.length - max} autres`}
        </button>
      )}

      {onAddClick && (
        <button
          type="button"
          onClick={onAddClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                     border border-slate-300/60 text-slate-600 bg-white/70 hover:bg-slate-50 transition-all duration-300"
          title="Gérer les tags"
        >
          <FaPlus className="text-slate-500" />
          Ajouter
        </button>
      )}
    </div>
  );
}

/* Palette pour les charts */
const CHART_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#64748b"];

/* ---------------- Auth / Permissions ---------------- */
function useMeFromLaravel() {
  const [me, setMe] = useState({ user: null, roles: [], permissions: [] });
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => {
    try { return sessionStorage.getItem("tokenGuard") || null; } catch { return null; }
  }, []);

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

function computeRights(permissions = []) {
  const list = Array.isArray(permissions) ? permissions : [];
  const isModerator = list.some(p =>
    String(p?.resource).toLowerCase() === "comments" &&
    /(moderateur|approver|approve|manage|admin|gerer)/i.test(String(p?.name))
  );
  const canDeleteAny =
    isModerator ||
    list.some(p =>
      String(p?.resource).toLowerCase() === "comments" &&
      /(supprimer|delete|remove)/i.test(String(p?.name))
    );
  return { isModerator, canDeleteAny };
}

/* ---------------- Visualiseur ---------------- */
export default function Visualiseur() {
  const params = useParams();
  const navigate = useNavigate();
  const idOrSlug = useMemo(() => {
    const fallback = Object.values(params ?? {})[0];
    const candidate = params?.slug ?? params?.show ?? params?.photoName ?? params?.id ?? fallback ?? "";
    return sanitizeParam(candidate);
  }, [params]);

  // AUTH
  const { me, loading: meLoading, token } = useMeFromLaravel();
  const rights = useMemo(() => computeRights(me?.permissions), [me?.permissions]);

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
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

  /* ------- Load article ------- */
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErr("");
    if (!idOrSlug) {
      setLoading(false);
      setErr("Identifiant/slug manquant dans l'URL.");
      if (DEBUG_HTTP) console.warn("[UI] idOrSlug manquant -> rien à fetch");
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

    if (DEBUG_HTTP) {
      console.log("[UI] Appel =>", buildArticleShowUrl(idOrSlug, { include, fields }));
    }

    fetchArticle(idOrSlug, { include, fields })
      .then((j) => {
        if (!mounted) return;
        const data = j?.data ?? j ?? null;
        setArticle(data);
        document.title = data?.title || "Visualiseur";
      })
      .catch((e) => {
        if (!mounted) return;
        setErr(e?.message || "Erreur lors du chargement");
      })
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [idOrSlug, params]);

  /* ------- Charger récap des notes (dont ma note) ------- */
  useEffect(() => {
    if (!article?.id) return;
    let cancelled = false;
    setRatingLoaded(false);
    (async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const { data } = await axios.get(`/api/articles/${article.id}/ratings`, { headers, withCredentials: false });
        const d = data?.data ?? data ?? {};
        if (cancelled) return;
        if (Number.isFinite(Number(d?.rating_average)) && Number.isFinite(Number(d?.rating_count))) {
          setArticle(a => ({ ...(a || {}), rating_average: Number(d.rating_average), rating_count: Number(d.rating_count) }));
        }
        setMyRating(typeof d?.my_rating === "number" ? d.my_rating : null);
        setMyReview(typeof d?.my_review === "string" ? d.my_review : "");
      } catch (_) {
        // silencieux
      } finally {
        if (!cancelled) setRatingLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [article?.id, token]);

  /* ------- Media list ------- */
  const mediaList = useMemo(() => {
    const medias = Array.isArray(article?.media) ? article.media : [];
    if (medias.length) {
      return medias
        .filter((m) => !!m?.url)
        .map((m, idx) => ({
          id: m.id || idx + 1,
          title: m.title || article?.title || "Pièce jointe",
          type: inferTypeFromUrl(m.url),
          size: m.size_readable || "—",
          date: formatDate(article?.published_at),
          category: firstCategory(article),
          thumbnail: m.url,
          fileUrl: m.url,
          favorite: m.is_favorite || false,
        }));
    }

    const src = primaryMediaUrl(article);
    if (src) {
      return [{
        id: 1,
        title: article?.title || "Pièce jointe",
        type: inferTypeFromUrl(src),
        size: "—",
        date: formatDate(article?.published_at),
        category: firstCategory(article),
        thumbnail: src,
        fileUrl: src,
        favorite: article?.is_featured || false,
      }];
    }

    return [];
  }, [article]);

  /* ------- Default selected media ------- */
  useEffect(() => {
    if (mediaList.length && !selectedFile) setSelectedFile(mediaList[0]);
  }, [mediaList, selectedFile]);

  const currentType  = selectedFile?.type || inferTypeFromUrl(primaryMediaUrl(article));
  const currentUrl   = selectedFile?.fileUrl || primaryMediaUrl(article);
  const currentTitle = selectedFile?.title || article?.title || "Sélectionnez un fichier";

  /* ------- Similar articles ------- */
  useEffect(() => {
    let mounted = true;
    if (!article?.id) return;
    const catIds = (article.categories || []).map((c) => c.id).filter(Boolean);
    const tagIds = (article.tags || []).map((t) => t.id).filter(Boolean);

    setSimilarLoading(true);
    fetchSimilarArticles({
      categoryIds: catIds,
      tagIds,
      excludeId: article.id,
      limit: 8,
    })
      .then((list) => mounted && setSimilar(Array.isArray(list) ? list : []))
      .catch(() => mounted && setSimilar([]))
      .finally(() => mounted && setSimilarLoading(false));

    return () => { mounted = false; };
  }, [article?.id]);

  // ✅ Données de partage (toolbar)
  const shareData = useMemo(() => ({
    title: article?.title || "",
    excerpt: article?.excerpt || article?.title || "",
    url: typeof window !== "undefined" ? window.location.href : "",
    articleId: article?.id ?? null
  }), [article]);

  /* ------- Loading / errors ------- */
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

  if (err)   return <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center px-4"><div className="text-red-500 text-center">{err}</div></div>;
  if (!article) return <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center px-4"><div className="text-red-500 text-center">Article introuvable.</div></div>;

  const hasHistory = Array.isArray(article.history) && article.history.length > 0;
  const tabs = ["Aperçu", "Médias", "Métadonnées", ...(hasHistory ? ["Versions"] : []), "Statistiques", "SEO"];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 font-sans px-3 sm:px-4 lg:px-6 2xl:px-10 py-4">
      {/* Layout horizontal */}
      <div className="flex gap-4 lg:gap-6 xl:gap-8">
        {/* Sidebar */}
        <Sidebar
          open={sidebarOpen}
          toggle={() => setSidebarOpen((s) => !s)}
          mediaCount={mediaList.length}
          tags={article?.tags || []}
          mediaList={mediaList}
          selectedFile={selectedFile}
          onSelectFile={setSelectedFile}
          similar={similar}
          similarLoading={similarLoading}
          onOpenSimilar={(slugOrId) => navigate(`/articles/${slugOrId}`)}
          onOpenTagManager={() => setTagModalOpen(true)}
        />

        {/* Main */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Card centrale */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 overflow-hidden">
            {/* Toolbar sticky */}
            <div className="sticky top-5 z-10 bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/40">
              <Toolbar
                onBack={() => navigate(-1)}
                onRefresh={() => setActiveTab("Aperçu")}
                onFullscreen={() => setFullscreen(true)}
                onDownload={downloadCurrent}
                shareData={shareData}
              />
            </div>

            {/* Split centre / droite */}
            <div className="flex gap-4 lg:gap-6 xl:gap-8">
              {/* Main panel */}
              <div className="flex-1 min-w-0 border-r border-slate-200/30">
                <div className="p-5 sm:p-6 lg:p-8">
                  <Tabs list={tabs} active={activeTab} onChange={setActiveTab} />
                  <div ref={previewRef} className="file-preview-container min-h-[50vh]">
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
                similar={similar}
                similarLoading={similarLoading}
                onOpenSimilar={(slugOrId) => navigate(`/articles/${slugOrId}`)}
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
                {activeTab === "Versions" && hasHistory && <Versions history={article.history} />}
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
            <code className="break-all text-slate-600">{buildArticleShowUrl(idOrSlug, { include: ["categories","tags","media"], fields: ["id","title","slug"] })}</code>
          </div>
          <pre className="text-xs max-h-64 overflow-auto bg-slate-50/80 p-4 rounded-xl border border-slate-200/50">
            {JSON.stringify(article, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );

  /* ------- Actions ------- */
  function openInNew() { if (currentUrl) window.open(currentUrl, "_blank", "noopener,noreferrer"); }
  function downloadCurrent() {
    if (!currentUrl) return;
    const a = document.createElement("a");
    a.href = currentUrl; a.download = "";
    document.body.appendChild(a); a.click(); a.remove();
  }
}

/* ---------------- Sub-UI ---------------- */
function Sidebar({ open, toggle, mediaCount, tags, mediaList, selectedFile, onSelectFile, similar, similarLoading, onOpenSimilar, onOpenTagManager }) {
  return (
    <div className={`sidebar pt-4  overflow-auto w-72 lg:w-80 bg-white/70 backdrop-blur-xl shadow-2xl border-r border-white/40 flex-shrink-0 transition-all duration-500 ${open ? "" : "hidden"} lg:block`}>
      <div className="p-6 border-b border-slate-200/30">
        <h2 className="text-2xl font-light text-slate-800 flex items-center">
          <FaFolderOpen className="mr-3 text-blue-500" />
          Bibliothèque
        </h2>
        <div className="mt-6 relative">
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full px-4 py-3 pl-12 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm"
          />
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
        </div>
      </div>
      <div className="overflow-y-auto h-full pb-24">
        {/* Fichiers liés */}
        <div className="p-6">
          <h3 className="font-medium text-slate-700 mb-5 flex items-center text-lg">
            <FaClock className="mr-2 text-blue-500" />
            Fichiers liés
          </h3>
          <div className="space-y-3">
            {mediaList.length ? mediaList.map((f, idx) => (
              <div
                key={f.id ?? `media-${idx}`}
                className={`file-item p-4 rounded-2xl cursor-pointer flex items-center transition-all duration-300 border ${
                  selectedFile?.id === f.id
                    ? "bg-blue-50/80 border-blue-200 shadow-lg scale-[1.02]"
                    : "bg-white/60 border-slate-200/40 hover:border-blue-200/60 hover:shadow-md hover:scale-[1.01]"
                }`}
                onClick={() => onSelectFile(f)}
              >
                <div className={`w-12 h-12 ${iconBgForType(f.type)} rounded-xl flex items-center justify-center mr-4 transition-transform duration-300 hover:scale-110`}>
                  {iconForType(f.type, "text-2xl")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{f.title}</p>
                  <p className="text-xs text-slate-500">{f.size} • {f.date}</p>
                </div>
                {f.favorite && <FaStar className="ml-2 text-amber-400 flex-shrink-0" />}
              </div>
            )) : (
              <div className="text-sm text-slate-500 py-12 text-center bg-slate-50/50 rounded-2xl">Aucun média lié à cet article.</div>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="p-6 border-t border-slate-200/30">
          <h3 className="font-medium text-slate-700 mb-5 flex items-center text-lg">
            <FaTag className="mr-2 text-emerald-500" />
            Tags
          </h3>

          {Array.isArray(tags) && tags.length > 0 ? (
            <TagList tags={tags} onAddClick={onOpenTagManager} onTagClick={undefined} max={10} />
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 px-4 py-2 rounded-full bg-slate-100/80">Aucun tag</span>
              <button
                onClick={onOpenTagManager}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-300/60 text-slate-600 bg-white/70 hover:bg-slate-50 transition-all duration-300"
                title="Gérer les tags"
                type="button"
              >
                <FaPlus className="text-slate-500" />
                Ajouter
              </button>
            </div>
          )}
        </div>

        {/* Similaires */}
        <div className="p-6 border-t border-slate-200/30">
          <h3 className="font-medium text-slate-700 mb-5 flex items-center text-lg">
            <FaChartBar className="mr-2 text-blue-700" />
            Similaires
          </h3>
          <div className="space-y-3 overflow-auto min-h-96" style={{ maxHeight: "18rem" }}>
            {similarLoading && <div className="text-sm text-slate-500 py-12 text-center bg-slate-50/50 rounded-2xl">Chargement…</div>}
            {!similarLoading && (similar.length ? similar.map((it) => {
              const cover =
                (typeof it.featured_image === "string" && it.featured_image) ||
                it.featured_image?.url ||
                it.media?.[0]?.url ||
                null;
              return (
                <button
                  key={it.id}
                  onClick={() => onOpenSimilar(it.slug || it.id)}
                  className="w-full text-left p-4 rounded-2xl cursor-pointer flex items-center border border-slate-200/40 bg-white/60 hover:border-purple-200/60 hover:shadow-md hover:scale-[1.01] transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mr-4 overflow-hidden">
                    {cover ? (
                      <img src={cover} alt={it.title} className="w-full h-full object-cover" />
                    ) : (
                      <FaFile className="text-slate-600 text-2xl" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{it.title}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {(it.categories || []).map((c) => c.name).join(", ") || "—"}
                    </p>
                  </div>
                </button>
              );
            }) : (
              <div className="text-sm text-slate-500 py-12 text-center bg-slate-50/50 rounded-2xl">Aucun article similaire.</div>
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={toggle}
        className="absolute top-6 right-6 text-slate-600 hover:text-slate-900 lg:hidden transition-colors duration-300"
        title="Replier"
      >
        <FaTimes className="text-2xl" />
      </button>
    </div>
  );
}

function Toolbar({ onBack, onRefresh, onFullscreen, onDownload, shareData }) {
  return (
    <div className="border-b border-slate-200/30 p-4 sm:p-5 lg:p-6 flex justify-between items-center bg-gradient-to-r from-white/30 to-transparent">
      <div className="flex items-center space-x-2 sm:space-x-3">
        <button
          onClick={onBack}
          className="p-3 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 transition-all duration-300 flex items-center justify-center"
          title="Retour"
        >
          <FaArrowLeft />
        </button>
        <button
          className="p-3 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 transition-all duration-300 flex items-center justify-center"
          title="Avancer"
        >
          <FaArrowRight />
        </button>
        <button
          onClick={onRefresh}
          className="p-3 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 transition-all duration-300 flex items-center justify-center"
          title="Rafraîchir"
        >
          <FaRedo />
        </button>
      </div>
      <div className="flex items-center space-x-3 sm:space-x-4">
        <button
          onClick={onFullscreen}
          className="px-4 sm:px-5 lg:px-6 py-3 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 border border-slate-300/60 transition-all duration-300 flex items-center backdrop-blur-sm"
        >
          <FaExpand className="mr-2" />
          <span>Plein écran</span>
        </button>
        <button
          onClick={onDownload}
          className="px-4 sm:px-5 lg:px-6 py-3 rounded-xl text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/80 border border-slate-300/60 transition-all duration-300 flex items-center backdrop-blur-sm"
        >
          <FaDownload className="mr-2" />
          <span>Télécharger</span>
        </button>

        <ShareButton
          title={shareData?.title}
          excerpt={shareData?.excerpt}
          url={shareData?.url}
          articleId={shareData?.articleId}
        />
      </div>
    </div>
  );
}

function Tabs({ list, active, onChange }) {
  return (
    <div className="flex border-b border-slate-200/30 mb-6 sm:mb-8 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
      {list.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-4 sm:px-6 py-3 sm:py-4 font-medium whitespace-nowrap transition-all duration-300 border-b-2 ${
            active === tab
              ? "text-blue-600 border-blue-500"
              : "text-slate-600 border-transparent hover:text-blue-600 hover:border-blue-300"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Onglets ---------------- */
function Apercu({ article, currentUrl, currentType, currentTitle, onOpen, onDownload }) {
  const contentStr = (article?.content ?? "").toString();
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(contentStr);

  return (
    <div className="space-y-8 lg:space-y-10 overflow-auto max-h-screen">
      {!currentUrl ? (
        <div className="text-center py-16 lg:py-20">
          <div className="w-24 h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <FaFile className="text-blue-600 text-4xl lg:text-5xl" />
          </div>
          <h3 className="text-2xl lg:text-3xl font-light text-slate-800 mb-3">Aucun média</h3>
          <p className="text-slate-600 mt-2 max-w-md mx-auto">Ajoutez un média à l'article ou ouvrez l'onglet « Médias » pour explorer les fichiers disponibles.</p>
        </div>
      ) : (
        <PreviewByType type={currentType} url={currentUrl} title={currentTitle} onOpen={onOpen} onDownload={onDownload} />
      )}

      {contentStr && (
        <div className="pt-2 sm:pt-4">
          <h3 className="text-xl lg:text-2xl font-light text-slate-800 mb-4 lg:mb-6">Contenu de l'article</h3>
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
              <img src={m.thumbnail} alt={m.title} className="w-full h-48 object-cover rounded-xl shadow-md group-hover:shadow-xl transition-all duration-500" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PreviewByType({ type, url, title, onOpen, onDownload }) {
  if (type === "image") {
    return (
      <div className="w-full flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-slate-50/60 rounded-2xl border border-slate-200/40 p-6 sm:p-8 backdrop-blur-sm">
          <img src={url} alt={title} className="max-w-full max-h-[62vh] lg:max-h-[65vh] rounded-2xl object-contain shadow-2xl" />
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
          <a href={url} target="_blank" rel="noreferrer" className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-8 py-4 rounded-2xl flex items-center shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <FaPlay className="mr-3" /> Lire la vidéo
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center py-14 lg:py-16">
      <div className="text-center">
        <div className="w-24 h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
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
    ["Auteur", article?.author_name || (article?.author_id ? `Auteur #${article.author_id}` : "—")],
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
          <div key={h.id} className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl  border border-slate-200/40  transition-all duration-500">
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
            {h.notes && <p className="text-sm mt-4 text-slate-700 bg-slate-50/50 p-3 rounded-xl">{h.notes}</p>}
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
  // const reading   = Number(article.reading_time || 0);
  // const words     = Number(article.word_count || 0);

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
    <div className="w-full bg-gradient-to-br from-slate-50/30 via-white/30 to-blue-50/30 backdrop-blur-sm rounded-2xl p-6 sm:p-8 lg:p-10">
      <Toaster/>

      {/* Header */}
      <div className="mb-10 lg:mb-16">
        <h1 className="text-3xl lg:text-4xl font-light text-slate-800 mb-3">Statistiques de l'article</h1>
        <div className="h-1 w-20 lg:w-24 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 mb-12 lg:mb-20 text-lg">
        <KpiCard label="Vues" value={views} icon={<FaEye />} color="blue" />
        <KpiCard label="Partages" value={shares} icon={<FaShareAlt />} color="green" />
        <KpiCard label="Commentaires" value={comments} icon={<FaComment />} color="purple" />
        {/* <KpiCard label="Notes reçues" value={ratings} icon={<FaStar />} color="yellow" /> */}
        <KpiCard label="Note moyenne" value={avgRating.toFixed(2)} suffix="/5" icon={<FaStar />} color="orange" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        {/* Engagement Chart */}
        <div className="col-span-1">
          <ChartCard title="Engagement" subtitle="Répartition des interactions" icon={<FaChartBar />}>
            {engagementData.length ? (
              <div className="h-64 md:h-72 xl:h-80 2xl:h-[28rem] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      dataKey="value" 
                      data={engagementData} 
                      innerRadius={50} 
                      outerRadius={90} 
                      paddingAngle={3}
                      stroke="none"
                    >
                      {engagementData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                        fontSize: '14px'
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="Aucune donnée d'engagement disponible" />
            )}
          </ChartCard>
        </div>

        {/* Tags/History Chart */}
        <div className="col-span-1">
          <ChartCard 
            title={tagsBarData.length ? "Tags populaires" : "Historique"} 
            subtitle={tagsBarData.length ? "Usage global des tags" : "Actions effectuées"}
            icon={tagsBarData.length ? <FaTag /> : <FaHistory />}
          >
            <div className="h-64 md:h-72 xl:h-80 2xl:h-[28rem]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={tagsBarData.length ? tagsBarData : historyBarData} 
                  margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" opacity={0.6} />
                  <XAxis 
                    dataKey="name" 
                    interval={0} 
                    angle={-35} 
                    textAnchor="end" 
                    height={80} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    allowDecimals={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      fontSize: '14px'
                    }}
                  />
                  <Bar 
                    dataKey={tagsBarData.length ? "usage" : "count"} 
                    fill="#3b82f6" 
                    radius={[6, 6, 0, 0]}
                    stroke="none"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Rating Chart */}
        <div className="col-span-1">
          <ChartCard title="Qualité" subtitle="Note moyenne attribuée" icon={<FaStar />}>
            <div className="h-64 md:h-72 xl:h-80 2xl:h-[28rem] flex flex-col items-center justify-center">
              {avgRating > 0 ? (
                <>
                  <div className="relative w-40 h-40 md:w-44 md:h-44 xl:w-48 xl:h-48 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart 
                        innerRadius="60%" 
                        outerRadius="90%" 
                        data={[{ name: "Note", value: (avgRating / 5) * 100 }]} 
                        startAngle={90} 
                        endAngle={-270}
                      >
                        <RadialBar 
                          dataKey="value" 
                          minAngle={15} 
                          clockWise 
                          background={{ fill: '#e2e8f0' }} 
                          fill="#fbbf24"
                          cornerRadius={6}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-3xl md:text-4xl font-light text-slate-800">{avgRating.toFixed(1)}</div>
                      <div className="text-sm text-slate-500">sur 5</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <FaStar 
                        key={i} 
                        className={i < Math.round(avgRating) ? "text-yellow-400" : "text-gray-200"}
                        size={16}
                      />
                    ))}
                    <span className="ml-2 text-sm text-slate-600">({ratings} {ratings <= 1 ? 'note' : 'notes'})</span>
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

function SeoPanel({ article }) {
  const meta = article?.meta || {};
  const seo = article?.seo_data || {};
  const items = [
    ["Meta title", meta.meta_title],
    ["Meta description", meta.meta_description],
    ["Meta keywords", meta.meta_keywords || meta.keywords],
    ["Custom field 1", meta.custom_field_1],
    ["Custom field 2", meta.custom_field_2],
    ["OG title", seo.og_title],
    ["OG description", seo.og_description],
    ["Twitter title", seo.twitter_title],
    ["Twitter description", seo.twitter_description],
  ];

  return (
    <div className="w-full h-full overflow-auto space-y-6 lg:space-y-8">
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/40 overflow-hidden shadow-lg">
        <table className="min-w-full divide-y divide-slate-200/50">
          <tbody className="divide-y divide-slate-200/50">
            {items.map(([k, v]) => (
              <tr key={k} className="hover:bg-slate-50/60 transition-colors duration-300">
                <td className="px-6 lg:px-8 py-5 text-sm font-medium text-slate-800 bg-slate-50/60 border-r border-slate-200/50 w-1/3">{k}</td>
                <td className="px-6 lg:px-8 py-5 text-sm text-slate-700 break-words">{v || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {seo?.schema_org && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/40 p-6 shadow-lg">
          <h4 className="font-medium text-slate-800 mb-4 flex items-center text-lg">
            <FaInfoCircle className="mr-3 text-blue-600" />
            Schema.org
          </h4>
          <pre className="text-xs bg-slate-50/80 p-6 rounded-xl border border-slate-200/50 overflow-auto text-slate-700">
            {JSON.stringify(seo.schema_org, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function DetailsPanel({
  article, currentType, currentTitle, similar, similarLoading, onOpenSimilar,
  selectedFile, me, token, rights, onOpenRating, onOpenRatingEdit,
  ratingAverage, ratingCount, myRating, ratingLoaded
}) {
  const tags = article?.tags || [];

  const initialTopLevelApproved = useMemo(() => {
    if (Array.isArray(article?.approved_comments)) {
      return article.approved_comments.filter(c => c?.parent_id == null);
    }
    if (Array.isArray(article?.comments)) {
      return article.comments.filter(c => c?.parent_id == null && c?.status === 'approved');
    }
    return [];
  }, [article]);

  return (
    <aside className="shrink-0 w-full sm:w-[20rem] lg:w-[22rem] xl:w-[24rem] 2xl:w-[26rem] p-6 lg:p-8">
      <h2 className="text-2xl font-light text-slate-800 mb-6 lg:mb-8 flex items-center">
        <FaInfoCircle className="mr-3 text-blue-600" />
        Détails du fichier
      </h2>
        {(() => {
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

        return (
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/70 backdrop-blur-sm  mb-6">
            {/* Ligne lumineuse */}
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-sky-300 to-transparent" />

            {/* Header compact */}
            <div className="relative flex items-center gap-3 p-4 border-b border-slate-200/50">
              <div
                className={`w-12 h-12 ${iconBgForType(currentType)} rounded-xl flex items-center justify-center shadow-md ring-1 ring-inset ring-white/40`}
              >
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

              <div className="ml-auto flex items-center gap-1.5">
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
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] leading-tight">
                <div className="rounded-lg border border-slate-200/60 bg-white/60 p-3">
                  <dt className="text-slate-500">Date de création</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">
                    {formatDate(article?.created_at)}
                  </dd>
                </div>

                <div className="rounded-lg border border-slate-200/60 bg-white/60 p-3">
                  <dt className="text-slate-500">Dernière modification</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">
                    {formatDate(article?.updated_at)}
                  </dd>
                </div>

                <div className="rounded-lg border border-slate-200/60 bg-white/60 p-3">
                  <dt className="text-slate-500">Statut</dt>
                  <dd className="mt-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusCls}`}>
                      {statusLabel}
                    </span>
                  </dd>
                </div>

                <div className="rounded-lg border border-slate-200/60 bg-white/60 p-3">
                  <dt className="text-slate-500">Format</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">
                    {currentType ? currentType.toUpperCase() : "—"}
                  </dd>
                </div>
              </dl>

              {/* Catégorie */}
              <div className="mt-4">
                <p className="text-slate-500 text-[13px] mb-1.5">Catégorie</p>
                <span className="inline-flex items-center rounded-full bg-indigo-50 text-blue-700 ring-1 ring-indigo-200 px-2.5 py-1 text-[11px] font-semibold">
                  {firstCategory(article)}
                </span>
              </div>
            </div>
          </div>
        );
      })()}


      {/* Qualité / Notation */}
      <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl mb-8 border-2 border-slate-200/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm mb-1">Note moyenne</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    className={i < Math.round(Math.max(0, Math.min(5, Number(ratingAverage || 0)))) ? "text-yellow-400" : "text-gray-200"}
                    size={16}
                  />
                ))}
              </div>
              <span className="text-sm text-slate-600">
                {(Number(ratingAverage || 0)).toFixed(1)} / 5 · {Number(ratingCount || 0)} {Number(ratingCount || 0) <= 1 ? "note" : "notes"}
              </span>
            </div>
          </div>

          {/* Si la notation est désactivée -> rien */}
          {article?.allow_rating === false ? null : (
            ratingLoaded && typeof myRating === "number"
              ? <RateButton onClick={onOpenRatingEdit} label="Modifier" />
              : <RateButton onClick={onOpenRating} label="Noter" />
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

/* KPI Card */
function KpiCard({ label, value, suffix, icon, color = 'blue' }) {
    const colorClasses = {
    blue: 'from-blue-50/80 to-blue-100/60 text-blue-600 border-blue-100/60',
    green: 'from-emerald-50/80 to-emerald-100/60 text-emerald-600 border-emerald-100/60',
    purple: 'from-purple-50/80 to-purple-100/60 text-purple-600 border-purple-100/60',
    yellow: 'from-yellow-50/80 to-yellow-100/60 text-yellow-600 border-yellow-100/60',
    orange: 'from-orange-50/80 to-orange-100/60 text-orange-600 border-orange-100/60',
    indigo: 'from-indigo-50/80 to-indigo-100/60 text-indigo-600 border-indigo-100/60',
  };

  const gradientClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    yellow: 'from-yellow-500 to-yellow-600',
    orange: 'from-orange-500 to-orange-600',
    indigo: 'from-indigo-500 to-indigo-600',
  };

  return (
    <div className={`relative group rounded-2xl border bg-gradient-to-br ${colorClasses[color]} backdrop-blur-sm p-6 sm:p-7 lg:p-8 transition-all duration-500 hover:shadow-xl hover:-translate-y-2 hover:scale-[1.02]`}>
      <div className={`absolute top-0 left-6 lg:left-8 h-1 w-16 bg-gradient-to-r ${gradientClasses[color]} rounded-b-full`} />
      <div className="flex items-start justify-between mb-4 lg:mb-6">
        <div className="text-xs font-medium text-slate-600 uppercase tracking-wider">
          {label}
        </div>
        {icon && (
          <div className="opacity-40 group-hover:opacity-60 transition-opacity duration-500">
            {icon}
          </div>
        )}
      </div>
      <div className="text-2xl lg:text-3xl font-light text-slate-800 tracking-tight">
        {value ?? "—"}
        {suffix && <span className="text-base lg:text-xl text-slate-500 ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

/* Chart Card */
function ChartCard({ title, subtitle, children, icon }) {
  return (
    <div className="group rounded-3xl border border-white/60 bg-white/50 backdrop-blur-xl p-6 sm:p-8 lg:p-10 shadow-xl hover:shadow-2xl transition-all duration-700 hover:-translate-y-2">
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <div>
          <h3 className="text-xl lg:text-2xl font-light text-slate-800 mb-2 flex items-center gap-4">
            {icon && (
              <span className="text-slate-400 group-hover:text-slate-600 transition-colors duration-500">
                {icon}
              </span>
            )}
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-6 lg:mb-8" />
      <div className="relative">
        {children}
      </div>
    </div>
  );
}

/* Empty Chart */
function EmptyChart({ message = "Pas assez de données pour ce graphique" }) {
  return (
    <div className="h-64 md:h-72 xl:h-80 2xl:h-[28rem] flex flex-col items-center justify-center text-slate-400">
      <div className="w-16 h-16 rounded-full bg-slate-100/80 flex items-center justify-center mb-4">
        <FaChartBar className="text-2xl" />
      </div>
      <p className="text-sm text-center max-w-xs leading-relaxed">{message}</p>
    </div>
  );
}
