// src/media-library/Visualiseur.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaBars, FaUpload, FaUser, FaFolderOpen,
  FaArrowLeft, FaArrowRight, FaRedo, FaExpand, FaDownload, FaShareAlt,
  FaExternalLinkAlt, FaChevronLeft, FaChevronRight, FaSearchPlus, FaSearchMinus,
  FaFilePdf, FaFileExcel, FaFileWord, FaImage, FaFileVideo, FaFile, FaTag, FaStar, FaClock, FaEye, FaComment, FaChartBar, FaHistory, FaInfoCircle, FaSearch, FaPlus, FaPlay, FaTimes
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
import Toaster from "../../../component/toast/Toaster";

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
    case "pdf":   return <FaFilePdf className={`${common} text-red-600`} />;
    case "excel": return <FaFileExcel className={`${common} text-green-600`} />;
    case "word":  return <FaFileWord className={`${common} text-blue-600`} />;
    case "image": return <FaImage className={`${common} text-yellow-600`} />;
    case "video": return <FaFileVideo className={`${common} text-purple-600`} />;
    default:      return <FaFile className={`${common} text-blue-600`} />;
  }
};

const iconBgForType = (type) => {
  switch (type) {
    case "pdf": return "bg-red-50 border-red-200";
    case "excel": return "bg-green-50 border-green-200";
    case "word": return "bg-blue-50 border-blue-200";
    case "image": return "bg-yellow-50 border-yellow-200";
    case "video": return "bg-purple-50 border-purple-200";
    default: return "bg-blue-50 border-blue-200";
  }
};

/* Palette pour les charts */
const CHART_COLORS = ["#2563eb", "#16a34a", "#9333ea", "#f59e0b", "#ef4444", "#06b6d4", "#64748b"];

/* ---------------- Auth / Permissions (centralisé ici) ---------------- */
/** Récupération /user + token côté Visualiseur, pour propager aux enfants */
function useMeFromLaravel() {
  const [me, setMe] = useState({ user: null, roles: [], permissions: [] });
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => {
    try {
      return (
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("auth_token") ||
        localStorage.getItem("tokenGuard") ||
        sessionStorage.getItem("tokenGuard") ||
        null
      );
    } catch { return null; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) { setMe({ user: null, roles: [], permissions: [] }); return; }
      try {
        setLoading(true);
        const { data } = await axios.get('/user', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
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

  // ⬇️ AUTH centralisée ici
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
      "allow_comments"
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

  /* ------- Media list from article ------- */
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

  /* ------- Similar articles (same categories/tags) ------- */
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

  /* ------- Loading / errors ------- */
  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-9 w-64 bg-gradient-to-r from-gray-200 to-gray-300 rounded" />
          <div className="h-72 bg-gradient-to-br from-gray-100 to-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (err)   return <div className="p-6 text-center text-red-600">{err}</div>;
  if (!article) return <div className="p-6 text-center text-red-600">Article introuvable.</div>;

  const hasHistory = Array.isArray(article.history) && article.history.length > 0;
  const tabs = ["Aperçu", "Médias", "Métadonnées", ...(hasHistory ? ["Versions"] : []), "Statistiques", "SEO"];

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-sans">
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
      />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <TopBar toggleSidebar={() => setSidebarOpen((s) => !s)} />

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <Toolbar
              onBack={() => navigate(-1)}
              onRefresh={() => setActiveTab("Aperçu")}
              onFullscreen={() => setFullscreen(true)}
              onDownload={downloadCurrent}
              onShare={shareCurrent}
            />

            <div className="flex">
              {/* Main panel */}
              <div className="w-2/3 border-r border-gray-200/50">
                <div className="p-6">
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
                    {activeTab === "Médias" && (
                      <Medias mediaList={mediaList} />
                    )}
                    {activeTab === "Métadonnées" && (
                      <Metadonnees article={article} currentType={currentType} currentTitle={currentTitle} />
                    )}
                    {activeTab === "Versions" && hasHistory && (
                      <Versions history={article.history} />
                    )}
                    {activeTab === "Statistiques" && (
                      <StatsCharts article={article} />
                    )}
                    {activeTab === "SEO" && (
                      <SeoPanel article={article} />
                    )}
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

                /* ⬇️ On propage l’auth & les droits ici */
                me={me}
                token={token}
                rights={rights}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {fullscreen && (
        <div className="fullscreen fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="max-w-6xl w-full p-8">
              <div className="bg-white/90 backdrop-blur rounded-2xl shadow-2xl">
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
              className="absolute top-6 right-6 text-white text-3xl hover:text-gray-300 transition-colors"
              aria-label="Fermer"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      {/* Debug */}
      {DEBUG_HTTP && (
        <details className="fixed bottom-6 left-6 bg-white/90 backdrop-blur p-4 rounded-xl border border-gray-200/50 max-w-[40rem] shadow-lg">
          <summary className="text-gray-700 cursor-pointer font-medium flex items-center">
            <FaInfoCircle className="mr-2" /> Debug
          </summary>
          <div className="text-xs my-3">
            <div className="mb-2 font-medium text-gray-800">Show URL</div>
            <code className="break-all text-gray-600">{buildArticleShowUrl(idOrSlug, { include: ["categories","tags","media"], fields: ["id","title","slug"] })}</code>
          </div>
          <pre className="text-xs max-h-64 overflow-auto bg-gray-50/50 p-3 rounded-lg border border-gray-200/50">
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
  async function shareCurrent() {
    const data = { title: article?.title, text: article?.excerpt || article?.title, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(data.url);
        alert("Lien copié");
      }
    } catch {}
  }
}

/* ---------------- Sub-UI ---------------- */
function Sidebar({ open, toggle, mediaCount, tags, mediaList, selectedFile, onSelectFile, similar, similarLoading, onOpenSimilar }) {
  return (
    <div className={`sidebar w-72 bg-white/90 backdrop-blur-md shadow-2xl border-r border-gray-200/30 flex-shrink-0 transition-all duration-300 ${open ? "" : "hidden"} lg:block`}>
      <div className="p-5 border-b border-gray-200/30">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <FaFolderOpen className="mr-2 text-blue-600" />
          Bibliothèque
        </h2>
        <div className="mt-4 relative">
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80"
          />
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
      </div>
      <div className="overflow-y-auto h-full pb-24">
        {/* Fichiers liés */}
        <div className="p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
            <FaClock className="mr-2 text-blue-500" />
            Fichiers liés
          </h3>
          <div className="space-y-3">
            {mediaList.length ? mediaList.map((f) => (
              <div
                key={f.id}
                className={`file-item p-3 rounded-xl cursor-pointer flex items-center transition-all duration-200 border-2 ${
                  selectedFile?.id === f.id
                    ? "bg-blue-50 border-blue-300 shadow-md"
                    : "bg-white/70 border-transparent hover:border-blue-200 hover:shadow-sm"
                }`}
                onClick={() => onSelectFile(f)}
              >
                <div className={`w-12 h-12 ${iconBgForType(f.type)} rounded-xl flex items-center justify-center mr-3 transition-transform duration-200 hover:scale-110`}>
                  {iconForType(f.type, "text-2xl")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{f.title}</p>
                  <p className="text-xs text-gray-500">{f.size} • {f.date}</p>
                </div>
                {f.favorite && (
                  <FaStar className="ml-2 text-yellow-400 flex-shrink-0" />
                )}
              </div>
            )) : (
              <div className="text-sm text-gray-500 py-8 text-center">Aucun média lié à cet article.</div>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="p-5 border-t border-gray-200/30">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
            <FaTag className="mr-2 text-green-500" />
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {Array.isArray(tags) && tags.length > 0 ? (
              tags.map((t) => (
                <span
                  key={t.id ?? t.name}
                  className="tag px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 hover:scale-105"
                  style={{
                    background: (t.color || "#eef2ff") + "22",
                    color: t.color || "#1d4ed8",
                    borderColor: (t.color || "#93c5fd")
                  }}
                >
                  {t.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500 px-3 py-1.5 rounded-full bg-gray-100">Aucun tag</span>
            )}
            <button className="tag px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition-all duration-200 flex items-center">
              <FaPlus className="mr-1" />
              Ajouter
            </button>
          </div>
        </div>

        {/* Similaires */}
        <div className="p-5 border-t border-gray-200/30">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
            <FaChartBar className="mr-2 text-purple-500" />
            Similaires
          </h3>
          <div className="space-y-3">
            {similarLoading && <div className="text-sm text-gray-500 py-8 text-center">Chargement…</div>}
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
                  className="w-full text-left p-3 rounded-xl cursor-pointer flex items-center border border-transparent bg-white/70 hover:border-purple-200 hover:shadow transition-all duration-200"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mr-3 overflow-hidden">
                    {cover ? (
                      <img src={cover} alt={it.title} className="w-full h-full object-cover" />
                    ) : (
                      <FaFile className="text-gray-600 text-2xl" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{it.title}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {(it.categories || []).map((c) => c.name).join(", ") || "—"}
                    </p>
                  </div>
                </button>
              );
            }) : (
              <div className="text-sm text-gray-500 py-8 text-center">Aucun article similaire.</div>
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={toggle}
        className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 lg:hidden transition-colors"
        title="Replier"
      >
        <FaTimes className="text-2xl" />
      </button>
    </div>
  );
}

function TopBar({ toggleSidebar }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm shadow-sm p-4 flex justify-between items-center sticky top-0 z-10 border-b border-gray-200/30">
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="mr-4 p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 lg:hidden"
        >
          <FaBars className="text-xl" />
        </button>
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Visualiseur de fichiers</h1>
      </div>
      <div className="flex items-center space-x-3">
        <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5">
          <FaUpload className="mr-2" />
          <span>Importer</span>
        </button>
        <div className="relative">
          <button className="w-11 h-11 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center text-gray-700 hover:from-gray-300 hover:to-gray-400 transition-all duration-200 border border-gray-300">
            <FaUser />
          </button>
        </div>
      </div>
    </div>
  );
}

function Toolbar({ onBack, onRefresh, onFullscreen, onDownload, onShare }) {
  return (
    <div className="border-b border-gray-200/30 p-4 flex justify-between items-center bg-gradient-to-r from-white/50 to-transparent">
      <div className="flex items-center space-x-2">
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center"
          title="Retour"
        >
          <FaArrowLeft />
        </button>
        <button
          className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center"
          title="Avancer"
        >
          <FaArrowRight />
        </button>
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center"
          title="Rafraîchir"
        >
          <FaRedo />
        </button>
      </div>
      <div className="flex items-center space-x-3">
        <button
          onClick={onFullscreen}
          className="px-4 py-2 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 border border-gray-300 transition-all duration-200 flex items-center"
        >
          <FaExpand className="mr-2" />
          <span>Plein écran</span>
        </button>
        <button
          onClick={onDownload}
          className="px-4 py-2 rounded-xl text-gray-600 hover:text-green-600 hover:bg-green-50 border border-gray-300 transition-all duration-200 flex items-center"
        >
          <FaDownload className="mr-2" />
          <span>Télécharger</span>
        </button>
        <button
          onClick={onShare}
          className="px-4 py-2 rounded-xl text-gray-600 hover:text-purple-600 hover:bg-purple-50 border border-gray-300 transition-all duration-200 flex items-center"
        >
          <FaShareAlt className="mr-2" />
          <span>Partager</span>
        </button>
      </div>
    </div>
  );
}

function Tabs({ list, active, onChange }) {
  return (
    <div className="flex border-b border-gray-200/30 mb-6 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
      {list.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-5 py-3 font-medium whitespace-nowrap transition-all duration-200 border-b-4 ${
            active === tab
              ? "text-blue-700 border-blue-600"
              : "text-gray-600 border-transparent hover:text-blue-600"
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
    <div className="space-y-8">
      {/* Reader */}
      {!currentUrl ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <FaFile className="text-blue-600 text-4xl" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">Aucun média</h3>
          <p className="text-gray-600 mt-2">Ajoutez un média à l’article ou ouvrez l’onglet « Médias ».</p>
        </div>
      ) : (
        <PreviewByType
          type={currentType}
          url={currentUrl}
          title={currentTitle}
          onOpen={onOpen}
          onDownload={onDownload}
        />
      )}

      {/* Contenu */}
      {contentStr && (
        <div className="pt-2">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Contenu</h3>
          {looksHtml ? (
            <div className="prose max-w-none prose-lg" dangerouslySetInnerHTML={{ __html: contentStr }} />
          ) : (
            <p className="whitespace-pre-line text-gray-800 leading-relaxed">{contentStr}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Medias({ mediaList }) {
  if (!mediaList.length) {
    return <div className="text-gray-600 py-8 text-center">Aucun média lié à cet article.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {mediaList.map((m, i) => (
        <div key={m.id ?? i} className="border border-gray-200/50 rounded-xl overflow-hidden bg-white hover:shadow-lg transition-shadow duration-300 group">
          <div className="p-4 flex items-center gap-4 bg-gray-50/50">
            <div className={`w-12 h-12 ${iconBgForType(m.type)} rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
              {iconForType(m.type, "text-2xl")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 truncate">{m.title}</p>
              <p className="text-xs text-gray-500">{m.size !== "—" ? `${m.size} • ` : ""}{m.date}</p>
            </div>
            <a
              href={m.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-gray-600 hover:text-blue-600 p-2 rounded-lg transition-all duration-200"
              title="Ouvrir"
            >
              <FaExternalLinkAlt />
            </a>
          </div>
          {m.type === "image" && (
            <div className="p-4">
              <img src={m.thumbnail} alt={m.title} className="w-full h-48 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow duration-300" />
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
        <div className="flex-1 flex items-center justify-center bg-gray-50/50 rounded-xl border border-gray-200/50 p-6">
          <img src={url} alt={title} className="max-w-full max-h-[60vh] rounded-xl object-contain shadow-lg" />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <button
            onClick={onOpen}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl flex items-center shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <FaExternalLinkAlt className="mr-2" />
            Voir en haute résolution
          </button>
          <button
            onClick={onDownload}
            className="bg-white text-gray-700 px-6 py-3 rounded-xl border border-gray-300 flex items-center shadow hover:shadow-md transition-all duration-200 hover:bg-gray-50"
          >
            <FaDownload className="mr-2" />
            Télécharger
          </button>
        </div>
      </div>
    );
  }

  if (type === "pdf") {
    return (
      <div className="w-full flex flex-col">
        <div className="w-full bg-gray-50/50 border border-gray-200/50 rounded-xl overflow-hidden">
          <div className="bg-gray-100 p-3 flex items-center border-b border-gray-200/50">
            <FaFilePdf className="text-red-500 mr-3 text-2xl" />
            <span className="font-medium text-gray-800 text-lg">{title}</span>
          </div>
          <div className="p-6 text-gray-700">
            <p className="text-sm">Prévisualisation PDF. Ouvrez le fichier pour lecture complète.</p>
          </div>
          <div className="bg-gray-100/60 p-3 flex justify-between items-center text-sm text-gray-600">
            <span>Prévisualisation</span>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><FaChevronLeft /></button>
              <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><FaChevronRight /></button>
              <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><FaSearchPlus /></button>
              <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><FaSearchMinus /></button>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <button
            onClick={onOpen}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl flex items-center shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <FaExternalLinkAlt className="mr-2" />
            Ouvrir dans un onglet
          </button>
          <button
            onClick={onDownload}
            className="bg-white text-gray-700 px-6 py-3 rounded-xl border border-gray-300 flex items-center shadow hover:shadow-md transition-all duration-200 hover:bg-gray-50"
          >
            <FaDownload className="mr-2" />
            Télécharger
          </button>
        </div>
      </div>
    );
  }

  if (type === "excel" || type === "word") {
    return (
      <div className="w-full flex flex-col">
        <div className="w-full bg.white border border-gray-200/50 rounded-xl overflow-hidden">
          <div className="bg-gray-100 p-3 flex items-center border-b border-gray-200/50">
            {type === "excel" ? <FaFileExcel className="text-green-600 mr-3 text-2xl" /> : <FaFileWord className="text-blue-600 mr-3 text-2xl" />}
            <span className="font-medium text-gray-800 text-lg">{title}</span>
          </div>
          <div className="p-6 text-gray-700">
            <p className="text-sm">Aperçu non disponible — ouvrez le fichier ci-dessous.</p>
          </div>
        </div>
        <div className="mt-6 flex justify-center">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl flex items-center shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <FaExternalLinkAlt className="mr-2" /> Ouvrir dans {type === "excel" ? "Excel" : "Word"}
          </a>
        </div>
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="w-full flex flex-col">
        <div className="w-full bg-black rounded-xl overflow-hidden border border-gray-200/50">
          <div className="relative pt-[56.25%]">
            <img src={url} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-70" />
            <a href={url} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white text-4xl opacity-90 hover:bg-opacity-70 transition-all duration-200">
                <FaPlay />
              </div>
            </a>
          </div>
        </div>
        <div className="mt-6 flex justify-center">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl flex items-center shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <FaExternalLinkAlt className="mr-2" /> Lire la vidéo
          </a>
        </div>
      </div>
    );
  }

  // other
  return (
    <div className="w-full flex flex-col items-center justify-center">
      <div className="text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <FaFile className="text-blue-600 text-4xl" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
        <p className="text-gray-600 mt-2">Aperçu non disponible pour ce type de fichier</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
        >
          <FaDownload className="mr-2" /> Ouvrir
        </a>
      </div>
    </div>
  );
}

function Metadonnees({ article, currentType, currentTitle }) {
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
    ["Mots-clés (tags)", (article?.tags || []).map((t) => t.name).join(", ") || "—"],
    ["Lecture (min)", article?.reading_time ?? "—"],
    ["Nombre de mots", article?.word_count ?? "—"],
    ["ID", article?.id ?? "—"],
    ["Slug", article?.slug ?? "—"],
  ];

  return (
    <div className="w-full h-full p-6 overflow-auto">
      <div className="bg-white rounded-xl border border-gray-200/50 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200/50">
          <tbody className="divide-y divide-gray-200/50">
            {rows.map(([k, v]) => (
              <tr key={k} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text.sm font-medium text-gray-800 bg-gray-50/50 border-r border-gray-200/50">{k}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{v || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Versions({ history }) {
  return (
    <div className="w-full h-full p-6 overflow-auto">
      <div className="space-y-5">
        {history.map((h) => (
          <div key={h.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200/50 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-800 capitalize flex items-center">
                  <FaHistory className="mr-2 text-gray-500" />
                  {h.action || "changement"}
                </h4>
                <p className="text-sm text-gray-500 mt-1">{formatDate(h.created_at)} {h.ip_address ? `• ${h.ip_address}` : ""}</p>
              </div>
              {h.user_agent && <span className="text-xs text-gray-400 mt-1">{h.user_agent}</span>}
            </div>
            {h.notes && <p className="text-sm mt-3 text-gray-700">{h.notes}</p>}
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
  const reading   = Number(article.reading_time || 0);
  const words     = Number(article.word_count || 0);

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
    <div className="w-full h-full p-6 space-y-8">
      <Toaster/>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
        <KpiCard label="Vues" value={views} icon={<FaEye />} />
        <KpiCard label="Partages" value={shares} icon={<FaShareAlt />} />
        <KpiCard label="Commentaires" value={comments} icon={<FaComment />} />
        <KpiCard label="Notes reçues" value={ratings} icon={<FaStar />} />
        <KpiCard label="Note moyenne" value={avgRating.toFixed(2)} suffix="/5" icon={<FaStar />} />
        <KpiCard label="Mots / Lecture" value={`${words} / ${reading}min`} icon={<FaClock />} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Engagement pie */}
        <ChartCard title="Répartition de l'engagement" icon={<FaChartBar />}>
          {engagementData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie dataKey="value" data={engagementData} innerRadius={70} outerRadius={110} paddingAngle={2} label>
                  {engagementData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* Tags bar OR History bar */}
        <ChartCard title={tagsBarData.length ? "Popularité des tags (usage global)" : "Historique des actions"} icon={<FaTag />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tagsBarData.length ? tagsBarData : historyBarData} margin={{ left: 12, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={60} tick={{ fill: '#475569' }} />
              <YAxis allowDecimals={false} tick={{ fill: '#475569' }} />
              <Tooltip />
              <Bar dataKey={tagsBarData.length ? "usage" : "count"} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Radial rating */}
        <ChartCard title="Qualité (note moyenne)" icon={<FaStar />}>
          <ResponsiveContainer width="100%" height={300}>
            <RadialBarChart
              innerRadius="50%"
              outerRadius="100%"
              data={[{ name: "Note", value: avgRating }]}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar dataKey="value" minAngle={15} clockWise background fill="#e2e8f0" />
              <Tooltip />
              <Legend />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="text-center text-sm text-gray-600 -mt-2">Note sur 5</div>
        </ChartCard>
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
    <div className="w-full h-full p-6 space-y-6">
      <div className="bg-white rounded-xl border border-gray-200/50 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200/50">
          <tbody className="divide-y divide-gray-200/50">
            {items.map(([k, v]) => (
              <tr key={k} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-800 bg-gray-50/50 border-r border-gray-200/50">{k}</td>
                <td className="px-6 py-4 text-sm text-gray-700 break-words">{v || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {seo?.schema_org && (
        <div className="bg-white rounded-xl border border-gray-200/50 p-5 shadow-sm">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
            <FaInfoCircle className="mr-2 text-blue-600" />
            Schema.org
          </h4>
          <pre className="text-xs bg-gray-50/50 p-4 rounded-lg border border-gray-200/50 overflow-auto text-gray-700">
            {JSON.stringify(seo.schema_org, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function DetailsPanel({ article, currentType, currentTitle, similar, similarLoading, onOpenSimilar, selectedFile, me, token, rights }) {
  const tags = article?.tags || [];

  // Prépare des commentaires initiaux (niveau 0) pour affichage instantané
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
    <aside className="w-1/3 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-5 flex items.center">
        <FaInfoCircle className="mr-2 text-blue-600" />
        Détails du fichier
      </h2>
      <div className="bg-white p-5 rounded-xl mb-6 border border-gray-200/50 shadow-sm">
        <div className="flex items-center mb-5">
          <div className={`w-14 h-14 ${iconBgForType(currentType)} rounded-xl flex items-center justify-center shadow-md`}>
            {iconForType(currentType, "text-2xl")}
          </div>
          <div className="ml-4">
            <h3 className="font.bold text-gray-800">{currentTitle}</h3>
            <p className="text-sm text-gray-500">{currentType ? currentType.toUpperCase() : "—"} • —</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 text-sm mb-5">
          <div>
            <p className="text-gray-500 mb-1">Date de création</p>
            <p className="font-medium text-gray-800">{formatDate(article?.created_at)}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Dernière modification</p>
            <p className="font-medium text-gray-800">{formatDate(article?.updated_at)}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Statut</p>
            <p className="font-medium text-gray-800">{article?.status || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Format</p>
            <p className="font-medium text-gray-800">{currentType ? currentType.toUpperCase() : "—"}</p>
          </div>
        </div>
        <div className="mb-5">
          <p className="text-gray-500 mb-2">Catégorie</p>
          <p className="text-sm font-medium text-gray-800">{firstCategory(article)}</p>
        </div>
      </div>

      {/* Zone commentaires */}
      {article?.allow_comments !== false && (
        <Comments 
          key={article?.id}                         // remount quand l’article change
          articleId={article?.id}                   // CRUCIAL: drive la requête /comments
          initialComments={initialTopLevelApproved} // affichage instantané côté client

          /* ⬇️ Injection des infos auth/permissions depuis Visualiseur */
          meOverride={me}
          tokenOverride={token}
          rightsOverride={rights}
        />
      )}
    </aside>
  );
}

/* Small blocks & cards */
function KpiCard({ label, value, suffix, icon }) {
  return (
    <div className="rounded-xl border border-gray-200/50 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center mb-2">
        {icon && <span className="text-blue-600 mr-2">{icon}</span>}
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      </div>
      <div className="text-2xl font-bold text-gray-800">{value ?? "—"}{suffix || ""}</div>
    </div>
  );
}

function ChartCard({ title, children, icon }) {
  return (
    <div className="rounded-xl border border-gray-200/50 bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
      <h4 className="font-bold text-gray-800 mb-4 flex items-center text-lg">
        {icon && <span className="mr-2 text-blue-600">{icon}</span>}
        {title}
      </h4>
      {children}
    </div>
  );
}

function EmptyChart() {
  return <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">Pas assez de données pour tracer ce graphique.</div>;
}
