// src/media-library/components/EnhancedMedias.jsx
import React, { useMemo, useState, useCallback } from "react";
import {
  FaFolderOpen, FaFolder, FaBars, FaUpload, FaUser,
  FaArrowLeft, FaArrowRight, FaRedo, FaExpand, FaDownload, FaShareAlt,
  FaFilePdf, FaFileExcel, FaFileWord, FaImage, FaFileVideo, FaFile
} from "react-icons/fa";
import { FiTag, FiCalendar, FiClock } from "react-icons/fi";
import FullScreenModal from "../FullScreenModal";
import FilePreview from "../FilePreview/FilePreview";

// Fallback si on ne passe pas iconForType depuis le parent
const defaultIconFor = (type) => {
  const common = "text-xl";
  switch ((type || "").toLowerCase()) {
    case "pdf":   return <FaFilePdf className={`${common} text-red-600`} />;
    case "excel": return <FaFileExcel className={`${common} text-green-600`} />;
    case "word":  return <FaFileWord className={`${common} text-blue-600`} />;
    case "image": return <FaImage className={`${common} text-yellow-600`} />;
    case "video": return <FaFileVideo className={`${common} text-purple-600`} />;
    default:      return <FaFile className={`${common} text-slate-600`} />;
  }
};

const fallbackToAbsolute = (u) => {
  if (!u) return u;
  if (/^https?:\/\//i.test(String(u))) return u;
  return `/${String(u).replace(/^\/+/, "")}`;
};

export default function EnhancedMedias({
  article,
  mediaList = [],
  selectedFile,
  onSelectFile,
  onOpenTagManager,
  iconForType,      // optionnel, sinon fallback interne
  toAbsolute,       // optionnel, sinon fallback interne
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fsOpen, setFsOpen] = useState(false);

  const iconFor = iconForType || defaultIconFor;
  const toA = toAbsolute || fallbackToAbsolute;

  // Compose un "file" de prévisualisation en mettant le média sélectionné en tête
  const mergedFileForPreview = useMemo(() => {
    if (!article) return null;
    if (!selectedFile) return article;
    const primary = { url: selectedFile.fileUrl, mime: selectedFile.mime_type };
    return {
      ...article,
      media: [primary, ...(Array.isArray(article.media) ? article.media : [])],
      featured_image: undefined,
      title: selectedFile.title || article.title,
    };
  }, [article, selectedFile]);

  const handleOpenFullscreen = useCallback(() => {
    if (mergedFileForPreview) setFsOpen(true);
  }, [mergedFileForPreview]);

  return (
    <div className="flex h-[calc(100vh-220px)] bg-white rounded-xl shadow-md overflow-hidden border border-slate-200/50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-72" : "w-0"} transition-all duration-300 overflow-hidden border-r border-slate-200/60 bg-white`}>
        <div className="p-4 border-b border-slate-200/60">
          <h2 className="text-lg font-semibold text-slate-800">Bibliothèque</h2>
          <div className="mt-3">
            <input
              placeholder="Rechercher..."
              className="w-full px-3 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="overflow-y-auto h-full">
          {/* Dossiers (démo statique) */}
          <div className="p-4">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Dossiers</h3>
            <div className="space-y-2">
              {[
                { icon: <FaFolderOpen className="text-blue-600" />, label: "Tous les fichiers", count: mediaList.length, active: true },
                { icon: <FaFolder className="text-slate-600" />, label: "Travail" },
                { icon: <FaFolder className="text-slate-600" />, label: "Personnel" },
                { icon: <FaFolder className="text-slate-600" />, label: "Vacances" },
                { icon: <FaFolder className="text-slate-600" />, label: "Projets" },
                { icon: <FaFolder className="text-slate-600" />, label: "Études" },
              ].map((f, i) => (
                <div key={i} className={`flex items-center gap-3 p-2 rounded-md ${f.active ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                  <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center">{f.icon}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{f.label}</div>
                    {"count" in f && f.count != null && (
                      <div className="text-[11px] text-slate-500">{f.count} éléments</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fichiers récents */}
          <div className="p-4 border-t border-slate-200/60">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Fichiers récents</h3>
            <div className="space-y-1">
              {mediaList.map((m, idx) => {
                const active = selectedFile?.fileUrl === m.fileUrl || (!selectedFile && idx === 0);
                return (
                  <button
                    key={m.id ?? idx}
                    onClick={() => onSelectFile?.(m)}
                    className={`w-full text-left flex items-center gap-3 p-2 rounded-md ${active ? "bg-blue-50" : "hover:bg-slate-50"}`}
                  >
                    <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center">
                      {iconFor(m.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{m.title}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {(m.size && m.size !== "—") ? `${m.size} • ` : ""}{m.date}
                      </div>
                    </div>
                    {m.favorite && (
                      <span className="ml-auto text-yellow-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"/>
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div className="p-4 border-t border-slate-200/60">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-800">Important</span>
              <span className="px-2 py-1 rounded-md text-xs bg-green-100 text-green-800">Finance</span>
              <span className="px-2 py-1 rounded-md text-xs bg-purple-100 text-purple-800">Présentation</span>
              <button
                className="px-2 py-1 rounded-md text-xs bg-slate-100 text-slate-800"
                onClick={onOpenTagManager}
              >
                + Ajouter
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenu principal */}
      <section className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="bg-white border-b border-slate-200/60 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(s => !s)} className="p-2 rounded-md hover:bg-slate-100 text-slate-600">
              <FaBars />
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-slate-800">Visualiseur de fichiers</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
              <FaUpload /> <span>Importer</span>
            </button>
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700">
              <FaUser />
            </div>
          </div>
        </div>

        {/* Barre d’outils viewer */}
        <div className="p-3 border-b border-slate-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><FaArrowLeft /></button>
            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><FaArrowRight /></button>
            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><FaRedo /></button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleOpenFullscreen} className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2">
              <FaExpand /><span className="hidden sm:inline">Plein écran</span>
            </button>
            {selectedFile?.fileUrl && (
              <a
                href={toA(selectedFile.fileUrl)}
                download
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2"
              >
                <FaDownload /><span className="hidden sm:inline">Télécharger</span>
              </a>
            )}
            {typeof navigator?.share === "function" && (
              <button
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2"
                onClick={() => navigator.share({ title: selectedFile?.title || article?.title, url: window.location.href }).catch(() => {})}
              >
                <FaShareAlt /><span className="hidden sm:inline">Partager</span>
              </button>
            )}
          </div>
        </div>

        {/* Zone de visualisation */}
        <div className="flex-1 overflow-auto">
          <div className="flex">
            {/* Aperçu */}
            <div className="w-full xl:w-2/3 border-r border-slate-200/60">
              <div className="p-4">
                <div className="file-preview-container min-h-[50vh] flex items-center justify-center bg-white rounded-xl border border-slate-200/50">
                  {mergedFileForPreview ? (
                    <div className="w-full h-full p-3">
                      <FilePreview file={mergedFileForPreview} activeTab="Aperçu" />
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaFile className="text-blue-600 text-3xl" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-800">Sélectionnez un fichier</h3>
                      <p className="text-slate-500 text-sm mt-1">Choisissez un fichier dans la colonne de gauche</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Détails */}
            <div className="hidden xl:block w-1/3">
              <div className="p-4">
                <h2 className="text-base font-semibold text-slate-800 mb-3">Détails du fichier</h2>

                <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                      {iconFor(selectedFile?.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {selectedFile?.title || article?.title || "Nom du fichier"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {(selectedFile?.type || "—").toUpperCase()} {selectedFile?.size ? `• ${selectedFile.size}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[13px]">
                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-slate-500"><FiCalendar className="w-4 h-4" /> Date de création</div>
                      <div className="mt-1 font-medium text-slate-900">
                        {article?.created_at ? new Date(article.created_at).toLocaleString() : "—"}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-slate-500"><FiClock className="w-4 h-4" /> Dernière modif.</div>
                      <div className="mt-1 font-medium text-slate-900">
                        {article?.updated_at ? new Date(article.updated_at).toLocaleString() : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center gap-2 text-slate-500 text-sm"><FiTag className="w-4 h-4" /> Catégorie</div>
                    <div className="mt-1">
                      <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                        {article?.categories?.[0]?.name || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-slate-500 text-sm mb-2">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {(article?.tags || []).slice(0, 6).map((t) => (
                        <span key={t.id || t.name} className="px-2 py-1 rounded-md text-[11px] bg-slate-100 text-slate-800">{t.name}</span>
                      ))}
                      <button onClick={onOpenTagManager} className="px-2 py-1 rounded-md text-[11px] bg-slate-100 text-slate-800">+ Ajouter</button>
                    </div>
                  </div>
                </div>

                {/* Métadonnées rapides */}
                <div className="mt-4 bg-white rounded-xl border border-slate-200/60 p-4">
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Métadonnées rapides</h3>
                  <ul className="text-[13px] text-slate-700 space-y-1">
                    <li><span className="text-slate-500">ID :</span> {article?.id ?? "—"}</li>
                    <li><span className="text-slate-500">Slug :</span> {article?.slug ?? "—"}</li>
                    <li><span className="text-slate-500">Visibilité :</span> {article?.visibility ?? "—"}</li>
                    <li><span className="text-slate-500">Statut :</span> {article?.status ?? "—"}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal plein écran */}
      {fsOpen && mergedFileForPreview && (
        <FullScreenModal
          file={mergedFileForPreview}
          onClose={() => setFsOpen(false)}
          activeTab="Aperçu"
          forceApercu={true}
        />
      )}
    </div>
  );
}
