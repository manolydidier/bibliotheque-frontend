// src/media-library/Visualiseur.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaBars, FaUpload, FaUser, FaFolderOpen,
  FaArrowLeft, FaArrowRight, FaRedo, FaExpand, FaDownload, FaShareAlt,
  FaExternalLinkAlt, FaChevronLeft, FaChevronRight, FaSearchPlus, FaSearchMinus,
  FaFilePdf, FaFileExcel, FaFileWord, FaImage, FaFileVideo, FaFile,
} from "react-icons/fa";

import { fetchArticle, fetchSimilarArticles, buildArticleShowUrl, DEBUG_HTTP } from "../api/articles";
import { formatDate } from "../shared/utils/format";

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
    case "pdf": return "bg-red-100";
    case "excel": return "bg-green-100";
    case "word": return "bg-blue-100";
    case "image": return "bg-yellow-100";
    case "video": return "bg-purple-100";
    default: return "bg-blue-100";
  }
};

/* ---------------- Visualiseur ---------------- */
export default function Visualiseur() {
  const params = useParams();
  const navigate = useNavigate();

  const idOrSlug = useMemo(() => {
    const fallback = Object.values(params ?? {})[0];
    const candidate = params?.slug ?? params?.show ?? params?.photoName ?? params?.id ?? fallback ?? "";
    return sanitizeParam(candidate);
  }, [params]);

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [activeTab, setActiveTab] = useState("Visualisation");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [similar, setSimilar] = useState([]);

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

    const include = ["categories", "tags", "media", "approvedComments", "author", "history"];
    const fields = [
      "id","title","slug","excerpt","content",
      "featured_image","featured_image_alt","status","visibility",
      "published_at","updated_at","created_at","view_count","reading_time","word_count",
      "share_count","comment_count","rating_average","rating_count",
      "is_featured","is_sticky","author_id","author_name"
    ];

    if (DEBUG_HTTP) {
      console.log("[UI] Appel =>", buildArticleShowUrl(idOrSlug, { include, fields }));
    }

    fetchArticle(idOrSlug, { include, fields })
      .then((j) => {
        if (!mounted) return;
        const data = j?.data ?? null;
        setArticle(data);
        document.title = data?.title || "Visualiseur";
      })
      .catch((e) => {
        if (!mounted) return;
        setErr(e?.message || "Erreur");
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
      }];
    }
    return [];
  }, [article]);

  /* ------- Default selected media ------- */
  useEffect(() => {
    if (mediaList.length && !selectedFile) setSelectedFile(mediaList[0]);
  }, [mediaList, selectedFile]);

  const currentType = selectedFile?.type || inferTypeFromUrl(primaryMediaUrl(article));
  const currentUrl  = selectedFile?.fileUrl || primaryMediaUrl(article);
  const currentTitle = selectedFile?.title || article?.title || "Sélectionnez un fichier";

  /* ------- Similar articles (same categories/tags) ------- */
  useEffect(() => {
    let mounted = true;
    if (!article?.id) return;

    const catIds = (article.categories || []).map((c) => c.id).filter(Boolean);
    const tagIds = (article.tags || []).map((t) => t.id).filter(Boolean);

    fetchSimilarArticles({
      categoryIds: catIds,
      tagIds,
      excludeId: article.id,
      limit: 8,
    })
      .then((list) => mounted && setSimilar(Array.isArray(list) ? list : []))
      .catch(() => mounted && setSimilar([]));

    return () => { mounted = false; };
  }, [article?.id]);

  /* ------- Actions ------- */
  const openInNew = () => { if (currentUrl) window.open(currentUrl, "_blank", "noopener,noreferrer"); };
  const downloadCurrent = () => {
    if (!currentUrl) return;
    const a = document.createElement("a");
    a.href = currentUrl; a.download = "";
    document.body.appendChild(a); a.click(); a.remove();
  };
  const shareCurrent = async () => {
    const data = { title: article?.title, text: article?.excerpt || article?.title, url: window.location.href };
    try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(data.url); alert("Lien copié"); } } catch {}
  };

  /* ------- Loading / errors ------- */
  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-6 w-48 bg-blue-100 rounded mb-4" />
        <div className="h-96 bg-blue-50 rounded" />
      </div>
    );
  }
  if (err)   return <div className="p-6 text-center text-red-600">{err}</div>;
  if (!article) return <div className="p-6 text-center text-red-600">Article introuvable.</div>;

  const hasHistory = Array.isArray(article.history) && article.history.length > 0;
  const tabs = ["Visualisation", "Métadonnées", ...(hasHistory ? ["Versions"] : []), "Statistiques"];

  return (
    <div className="flex h-screen overflow-hidden bg-blue-50">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        toggle={() => setSidebarOpen((s) => !s)}
        mediaCount={mediaList.length}
        tags={article?.tags || []}
        mediaList={mediaList}
        selectedFile={selectedFile}
        onSelectFile={setSelectedFile}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <TopBar toggleSidebar={() => setSidebarOpen((s) => !s)} />

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-xl shadow-md shadow-blue-100/50 border border-blue-100 overflow-hidden">
            <Toolbar
              onBack={() => navigate(-1)}
              onRefresh={() => setActiveTab("Visualisation")}
              onFullscreen={() => setFullscreen(true)}
              onDownload={downloadCurrent}
              onShare={shareCurrent}
            />

            <div className="flex">
              {/* Preview */}
              <div className="w-2/3 border-r border-blue-100">
                <div className="p-6">
                  <Tabs list={tabs} active={activeTab} onChange={setActiveTab} />

                  <div ref={previewRef} className="min-h-[50vh]">
                    {activeTab === "Visualisation" && (
                      <Visualisation
                        article={article}
                        mediaList={mediaList}
                        currentUrl={currentUrl}
                        currentType={currentType}
                        currentTitle={currentTitle}
                        onOpen={openInNew}
                        onDownload={downloadCurrent}
                      />
                    )}

                    {activeTab === "Métadonnées" && (
                      <Metadonnees article={article} currentType={currentType} currentTitle={currentTitle} />
                    )}

                    {activeTab === "Versions" && hasHistory && (
                      <Versions history={article.history} />
                    )}

                    {activeTab === "Statistiques" && (
                      <Stats article={article} />
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
                onOpenSimilar={(slugOrId) => navigate(`/articles/${slugOrId}`)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen */}
      {fullscreen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="max-w-5xl w-full p-8">
              <div className="bg-white rounded-xl p-6">
                <Tabs list={tabs} active={activeTab} onChange={setActiveTab} />
                {activeTab === "Visualisation" && (
                  <Visualisation
                    article={article}
                    mediaList={mediaList}
                    currentUrl={currentUrl}
                    currentType={currentType}
                    currentTitle={currentTitle}
                    onOpen={openInNew}
                    onDownload={downloadCurrent}
                  />
                )}
                {activeTab === "Métadonnées" && (
                  <Metadonnees article={article} currentType={currentType} currentTitle={currentTitle} />
                )}
                {activeTab === "Versions" && hasHistory && <Versions history={article.history} />}
                {activeTab === "Statistiques" && <Stats article={article} />}
              </div>
            </div>
            <button onClick={() => setFullscreen(false)} className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300" aria-label="Fermer">✕</button>
          </div>
        </div>
      )}

      {/* Debug */}
      {DEBUG_HTTP && (
        <details className="fixed bottom-4 left-4 bg-white/95 p-3 rounded border border-blue-100">
          <summary className="text-blue-700">Debug</summary>
          <pre className="text-xs max-h-64 overflow-auto">{JSON.stringify(article, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}

/* ---------------- Sub-UI ---------------- */
function Sidebar({ open, toggle, mediaCount, tags, mediaList, selectedFile, onSelectFile }) {
  return (
    <div className={`sidebar w-64 bg-white shadow-lg shadow-blue-100/50 border-r border-blue-100 flex-shrink-0 ${open ? "" : "hidden"}`}>
      <div className="p-4 border-b border-blue-100">
        <h2 className="text-xl font-bold text-blue-900">Bibliothèque</h2>
        <div className="mt-4">
          <input type="text" placeholder="Rechercher..." className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="overflow-y-auto h-full pb-20">
        {/* Dossier principal */}
        <div className="p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Dossiers</h3>
          <div className="space-y-2">
            <div className="p-2 rounded-md cursor-pointer flex items-center bg-blue-50 border border-blue-100">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center mr-2">
                <FaFolderOpen className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Tous les fichiers</p>
                <p className="text-xs text-blue-700/70">{mediaCount} élément{mediaCount > 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fichiers récents (réels) */}
        <div className="p-4 border-t border-blue-100">
          <h3 className="font-semibold text-blue-800 mb-2">Fichiers récents</h3>
          <div className="space-y-2">
            {mediaList.length ? mediaList.map((f) => (
              <div
                key={f.id}
                className={`file-item p-2 rounded-md cursor-pointer flex items-center ${selectedFile?.id === f.id ? "bg-blue-50" : ""}`}
                onClick={() => onSelectFile(f)}
              >
                <div className={`w-8 h-8 ${iconBgForType(f.type)} rounded-md flex items-center justify-center mr-2`}>
                  {iconForType(f.type)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate text-blue-900">{f.title}</p>
                  <p className="text-xs text-blue-700/70">{f.size} • {f.date}</p>
                </div>
              </div>
            )) : (
              <div className="text-sm text-blue-700/70">Aucun média lié à cet article.</div>
            )}
          </div>
        </div>

        {/* Tags (réels) */}
        <div className="p-4 border-t border-blue-100">
          <h3 className="font-semibold text-blue-800 mb-2">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {Array.isArray(tags) && tags.length > 0 ? (
              tags.map((t) => (
                <span key={t.id ?? t.name} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs border border-blue-200">
                  {t.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-blue-700/60">Aucun tag</span>
            )}
          </div>
        </div>
      </div>

      <button onClick={toggle} className="absolute top-3 right-3 text-blue-700 hover:text-blue-900 lg:hidden" title="Replier">✕</button>
    </div>
  );
}

function TopBar({ toggleSidebar }) {
  return (
    <div className="bg-white shadow-sm shadow-blue-100 p-4 flex justify-between items-center border-b border-blue-100">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="mr-4 text-blue-700 hover:text-blue-900"><FaBars /></button>
        <h1 className="text-xl font-bold text-blue-900">Visualiseur de fichiers</h1>
      </div>
      <div className="flex items-center space-x-4">
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center shadow">
          <FaUpload className="mr-2" />
          <span>Importer</span>
        </button>
        <button className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 hover:bg-blue-200 border border-blue-200">
          <FaUser />
        </button>
      </div>
    </div>
  );
}

function Toolbar({ onBack, onRefresh, onFullscreen, onDownload, onShare }) {
  return (
    <div className="border-b border-blue-100 p-4 flex justify-between items-center bg-blue-50/50">
      <div className="flex items-center space-x-4">
        <button className="text-blue-700 hover:text-blue-900" onClick={onBack}><FaArrowLeft /></button>
        <button className="text-blue-700 hover:text-blue-900"><FaArrowRight /></button>
        <button className="text-blue-700 hover:text-blue-900" onClick={onRefresh}><FaRedo /></button>
      </div>
      <div className="flex items-center space-x-4">
        <button className="text-blue-700 hover:text-blue-900 flex items-center" onClick={onFullscreen}>
          <FaExpand className="mr-2" /><span>Plein écran</span>
        </button>
        <button className="text-blue-700 hover:text-blue-900 flex items-center" onClick={onDownload}>
          <FaDownload className="mr-2" /><span>Télécharger</span>
        </button>
        <button className="text-blue-700 hover:text-blue-900 flex items-center" onClick={onShare}>
          <FaShareAlt className="mr-2" /><span>Partager</span>
        </button>
      </div>
    </div>
  );
}

function Tabs({ list, active, onChange }) {
  return (
    <div className="flex border-b border-blue-100 mb-6">
      {list.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-2 font-medium ${
            active === tab ? "text-blue-700 border-b-4 border-blue-600" : "text-blue-600/80 hover:text-blue-800"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Onglets ---------------- */

function Visualisation({ article, mediaList, currentUrl, currentType, currentTitle, onOpen, onDownload }) {
  const hasMedias = mediaList.length > 0;
  const hasContent = !!(article?.content && String(article.content).trim());

  return (
    <div className="space-y-8">
      {/* 1) Preview principal (selon type sélectionné) */}
      {!currentUrl ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaFile className="text-blue-600 text-3xl" />
          </div>
          <h3 className="text-xl font-semibold text-blue-900">Aucun média</h3>
          <p className="text-blue-800/70 mt-2">Sélectionnez un fichier dans la sidebar, ou ajoutez-en à l’article.</p>
        </div>
      ) : (
        <>
          {currentType === "image" && (
            <div className="w-full flex flex-col">
              <div className="flex-1 flex items-center justify-center bg-blue-50/50 rounded-md border border-blue-100">
                <img src={currentUrl} alt={currentTitle} className="max-w-full max-h-[60vh] rounded object-contain" />
              </div>
              <div className="mt-4 flex justify-center gap-2">
                <button onClick={onOpen} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-flex items-center">
                  <FaExternalLinkAlt className="mr-2" /> Voir en haute résolution
                </button>
                <button onClick={onDownload} className="px-4 py-2 rounded-md inline-flex items-center text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200">
                  <FaDownload className="mr-2" /> Télécharger
                </button>
              </div>
            </div>
          )}

          {currentType === "pdf" && (
            <div className="w-full flex flex-col">
              <div className="w-full bg-blue-50/50 border border-blue-100 rounded-lg">
                <div className="bg-blue-100 p-2 flex items-center border-b border-blue-200">
                  <FaFilePdf className="text-red-500 mr-2" />
                  <span className="font-medium text-blue-900">{currentTitle}</span>
                </div>
                <div className="p-4 text-blue-900/80">
                  {/* Intègre un vrai viewer PDF si dispo */}
                  {article?.excerpt && <p className="text-sm whitespace-pre-line">{article.excerpt}</p>}
                </div>
                <div className="bg-blue-100/60 p-2 flex justify-between items-center text-sm text-blue-800">
                  <span>Page 1 —</span>
                  <div className="flex gap-1">
                    <button className="p-1 hover:bg-blue-200 rounded"><FaChevronLeft /></button>
                    <button className="p-1 hover:bg-blue-200 rounded"><FaChevronRight /></button>
                    <button className="p-1 hover:bg-blue-200 rounded"><FaSearchPlus /></button>
                    <button className="p-1 hover:bg-blue-200 rounded"><FaSearchMinus /></button>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-center gap-2">
                <button onClick={onOpen} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-flex items-center">
                  <FaExternalLinkAlt className="mr-2" /> Ouvrir dans un nouvel onglet
                </button>
                <button onClick={onDownload} className="px-4 py-2 rounded-md inline-flex items-center text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200">
                  <FaDownload className="mr-2" /> Télécharger
                </button>
              </div>
            </div>
          )}

          {currentType === "excel" && (
            <div className="w-full flex flex-col">
              <div className="w-full bg-white border border-blue-100 rounded-lg overflow-hidden">
                <div className="bg-blue-100 p-2 flex items-center border-b border-blue-200">
                  <FaFileExcel className="text-green-600 mr-2" />
                  <span className="font-medium text-blue-900">{currentTitle}</span>
                </div>
                <div className="p-4 text-blue-900/80">
                  <p className="text-sm">Aperçu non disponible — ouvrir le fichier ci-dessous.</p>
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                <button onClick={onOpen} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md inline-flex items-center">
                  <FaExternalLinkAlt className="mr-2" /> Ouvrir dans Excel
                </button>
              </div>
            </div>
          )}

          {currentType === "word" && (
            <div className="w-full flex flex-col">
              <div className="w-full bg-blue-50/50 border border-blue-100 rounded-lg overflow-hidden">
                <div className="bg-blue-100 p-2 flex items-center border-b border-blue-200">
                  <FaFileWord className="text-blue-600 mr-2" />
                  <span className="font-medium text-blue-900">{currentTitle}</span>
                </div>
                <div className="p-4 text-blue-900/80">
                  <p className="text-sm">Aperçu non disponible — ouvrir le fichier ci-dessous.</p>
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                <button onClick={onOpen} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-flex items-center">
                  <FaExternalLinkAlt className="mr-2" /> Ouvrir dans Word
                </button>
              </div>
            </div>
          )}

          {currentType === "video" && (
            <div className="w-full flex flex-col">
              <div className="w-full bg-black rounded-lg overflow-hidden border border-blue-100">
                <div className="relative pt-[56.25%]">
                  <img src={currentUrl} alt={currentTitle} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                  <button onClick={onOpen} className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-4xl opacity-90">▶</span>
                  </button>
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                <button onClick={onOpen} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-flex items-center">
                  <FaExternalLinkAlt className="mr-2" /> Lire la vidéo
                </button>
              </div>
            </div>
          )}

          {currentType === "other" && (
            <div className="w-full flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaFile className="text-blue-600 text-3xl" />
                </div>
                <h3 className="text-xl font-semibold text-blue-900">{currentTitle}</h3>
                <p className="text-blue-800/70 mt-2">Aperçu non disponible pour ce type de fichier</p>
                <button onClick={onOpen} className="mt-4 inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
                  <FaDownload className="mr-2" /> Ouvrir
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 2) Médias liés (toujours au-dessus du contenu) */}
      {hasMedias && (
        <div className="pt-6 border-t border-blue-100">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Médias liés</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {mediaList.map((m) => (
              <div key={m.id} className="border border-blue-100 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="p-3 flex items-center justify-between bg-blue-50">
                  <div className={`w-10 h-10 ${iconBgForType(m.type)} rounded-md flex items-center justify-center`}>{iconForType(m.type)}</div>
                  <div className="ml-3 mr-auto min-w-0">
                    <p className="text-sm font-medium text-blue-900 truncate">{m.title}</p>
                    <p className="text-xs text-blue-700/70">{m.size !== "—" ? `${m.size} • ` : ""}{m.date}</p>
                  </div>
                  <button onClick={() => window.open(m.fileUrl, "_blank")} className="text-blue-700 hover:text-blue-900 px-2 py-1 text-sm" title="Ouvrir">
                    <FaExternalLinkAlt />
                  </button>
                </div>
                {m.type === "image" && (
                  <div className="bg-blue-50/30 p-3">
                    <img src={m.thumbnail} alt={m.title} className="w-full h-44 object-cover rounded" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3) Contenu de l’article — en bas des médias (exigence) */}
      {hasContent && (
        <div className="pt-6 border-t border-blue-100">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Contenu</h3>
          <div className="prose max-w-none prose-blue" dangerouslySetInnerHTML={{ __html: article.content }} />
        </div>
      )}
    </div>
  );
}

function Metadonnees({ article, currentType, currentTitle }) {
  const rows = [
    ["Nom du fichier", currentTitle],
    ["Type", currentType ? currentType.toUpperCase() : "—"],
    ["Taille", "—"],
    ["Date de création", formatDate(article?.created_at)],
    ["Dernière modification", formatDate(article?.updated_at)],
    ["Auteur", article?.author_name || (article?.author_id ? `Auteur #${article.author_id}` : "—")],
    ["Titre", article?.title || "—"],
    ["Sujet", firstCategory(article)],
    ["Mots-clés", (article?.tags || []).map((t) => t.name).join(", ") || "—"],
  ];

  return (
    <div className="w-full h-full p-6 overflow-auto">
      <h3 className="text-xl font-semibold mb-6 text-blue-900">Métadonnées techniques</h3>
      <div className="bg-white rounded-lg shadow border border-blue-100 overflow-hidden">
        <table className="min-w-full divide-y divide-blue-100">
          <tbody className="divide-y divide-blue-100">
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td className="px-4 py-3 text-sm font-medium text-blue-900 bg-blue-50 border-r border-blue-100">{k}</td>
                <td className="px-4 py-3 text-sm text-blue-900/90">{v || "—"}</td>
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
      <h3 className="text-xl font-semibold mb-6 text-blue-900">Historique des versions</h3>
      <div className="space-y-4">
        {history.map((h) => (
          <div key={h.id} className="bg-white p-4 rounded-lg shadow border border-blue-100 flex items-start">
            <div className="mr-4">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center border border-blue-200">
                <FaFile className="text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap justify-between gap-2 items-start">
                <div>
                  <h4 className="font-medium text-blue-900 capitalize">{h.action || "changement"}</h4>
                  <p className="text-sm text-blue-700/70">{formatDate(h.created_at)} {h.ip_address ? `• ${h.ip_address}` : ""}</p>
                </div>
                {h.user_agent && <span className="text-xs text-blue-700/60">{h.user_agent}</span>}
              </div>
              {h.notes && <p className="text-sm mt-1 text-blue-900/90">{h.notes}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stats({ article }) {
  const Row = ({ k, v }) => (
    <tr>
      <td className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-50 border-r border-blue-100">{k}</td>
      <td className="px-4 py-2 text-sm text-blue-900/90">{v ?? "—"}</td>
    </tr>
  );

  return (
    <div className="w-full h-full p-6">
      <h3 className="text-xl font-semibold mb-6 text-blue-900">Statistiques</h3>
      <div className="bg-white rounded-lg shadow border border-blue-100 overflow-hidden">
        <table className="min-w-full divide-y divide-blue-100">
          <tbody className="divide-y divide-blue-100">
            <Row k="Lecture (min)" v={article.reading_time} />
            <Row k="Mots" v={article.word_count} />
            <Row k="Vues" v={article.view_count} />
            <Row k="Partages" v={article.share_count} />
            <Row k="Commentaires" v={article.comment_count ?? article.approved_comments?.length} />
            <Row k="Note moyenne" v={article.rating_average} />
            <Row k="Nb notes" v={article.rating_count} />
            <Row k="Publié le" v={formatDate(article.published_at)} />
            <Row k="Mis à jour" v={formatDate(article.updated_at)} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailsPanel({ article, currentType, currentTitle, similar, onOpenSimilar }) {
  const tags = article?.tags || [];
  const comments = article?.approved_comments || article?.approvedComments || [];

  return (
    <div className="w-1/3 p-6 bg-gradient-to-b from-blue-50/50 to-transparent">
      <h2 className="text-lg font-semibold text-blue-900 mb-4">Détails du fichier</h2>
      <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
        <div className="flex items-center mb-4">
          <div className={`w-10 h-10 ${iconBgForType(currentType)} rounded-md flex items-center justify-center`}>
            {iconForType(currentType)}
          </div>
        </div>
        <div className="ml-0">
          <h3 className="font-medium text-blue-900">{currentTitle}</h3>
          <p className="text-sm text-blue-700/70">{currentType ? currentType.toUpperCase() : "—"} • —</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm my-4">
          <SmallDetail k="Créé" v={formatDate(article?.created_at)} />
          <SmallDetail k="Modifié" v={formatDate(article?.updated_at)} />
          <SmallDetail k="Taille" v="—" />
          <SmallDetail k="Format" v={currentType ? currentType.toUpperCase() : "—"} />
        </div>

        <div className="mb-4">
          <p className="text-blue-700/80 mb-2">Catégorie</p>
          <p className="text-sm text-blue-900">{firstCategory(article)}</p>
        </div>

        <div>
          <p className="text-blue-700/80 mb-2">Tags</p>
          <div className="flex flex-wrap gap-2">
            {tags.length > 0 ? (
              tags.map((t) => (
                <span key={t.id ?? t.name} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs border border-blue-200">
                  {t.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-blue-700/60">Aucun tag</span>
            )}
          </div>
        </div>
      </div>

      {/* Similaires (mêmes catégories/tags) */}
      <h2 className="text-lg font-semibold text-blue-900 mb-3">Similaires</h2>
      <div className="space-y-2 mb-6">
        {similar.length ? similar.map((it) => {
          const cover =
            (typeof it.featured_image === "string" && it.featured_image) ||
            it.featured_image?.url ||
            it.media?.[0]?.url ||
            null;
        return (
          <button
            key={it.id}
            onClick={() => onOpenSimilar(it.slug || it.id)}
            className="w-full text-left bg-white border border-blue-100 hover:border-blue-200 rounded-lg overflow-hidden"
          >
            <div className="flex">
              <div className="w-16 h-16 bg-blue-50 flex items-center justify-center border-r border-blue-100">
                {cover
                  ? <img src={cover} alt={it.title} className="w-full h-full object-cover" />
                  : <FaFile className="text-blue-600" />}
              </div>
              <div className="p-2 flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-900 truncate">{it.title}</p>
                <p className="text-xs text-blue-700/70 truncate">
                  {(it.categories || []).map((c) => c.name).join(", ") || "—"}
                </p>
              </div>
            </div>
          </button>
        );}) : (
          <div className="text-sm text-blue-700/70">Aucun article similaire.</div>
        )}
      </div>

      {/* Commentaires — seulement s’il y en a */}
      {Array.isArray(comments) && comments.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-blue-900 mb-3">Commentaires</h2>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            {comments.map((c) => (
              <div key={c.id} className="mb-4 last:mb-0">
                <p className="text-sm font-medium text-blue-900">{c.author_name || "Anonyme"}</p>
                <p className="text-xs text-blue-700/70">{formatDate(c.created_at)}</p>
                <p className="text-sm mt-1 text-blue-900/90">{c.content || c.body || c.text}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SmallDetail({ k, v }) {
  return (
    <div>
      <p className="text-blue-700/80">{k}</p>
      <p className="font-medium text-blue-900">{v || "—"}</p>
    </div>
  );
}
