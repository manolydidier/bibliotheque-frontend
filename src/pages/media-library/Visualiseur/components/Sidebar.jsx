// src/media-library/Sidebar.jsx
import React from "react";
import {
  FaFolderOpen, FaSearch, FaClock, FaTag, FaPlus, FaStar, FaFile, FaTimes, FaChartBar,
} from "react-icons/fa";
import SimilarList from "./SimilarList";
/**
 * Composant Sidebar isolé
 * - dépendances passées en props pour rester découplé (TagList, helpers d’icônes, etc.)
 *
 * Props :
 * open, toggle
 * mediaCount (optionnel)
 * tags (Array)
 * mediaList (Array<{ id, title, type, size, date, category, thumbnail, fileUrl, favorite }>)
 * selectedFile (objet de mediaList)
 * onSelectFile(file)
 * similar (Array d’articles)
 * similarLoading (bool)
 * onOpenSimilar(slugOrId)
 * onOpenTagManager()
 * TagListComponent (composant pour afficher les tags)
 * iconForType(type), iconBgForType(type)
 * toAbsolute(url)
 */

export default function Sidebar({
  open,
  toggle,
  mediaCount,
  tags = [],
  mediaList = [],
  selectedFile,
  onSelectFile,
  similar = [],
  similarLoading = false,
  onOpenSimilar,
  onOpenTagManager,
  TagListComponent,
  iconForType,
  iconBgForType,
  toAbsolute,
}) {
  return (
    <div
      className={`sidebar pt-4 overflow-auto w-72 lg:w-80 bg-white/70 backdrop-blur-xl shadow-2xl border-r border-white/40 flex-shrink-0 transition-all duration-500 ${
        open ? "" : "hidden"
      } lg:block`}
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-200/30 sticky top-0 bg-white/70 backdrop-blur-xl z-10">
        <h2 className="text-2xl font-light text-slate-800 flex items-center">
          <FaFolderOpen className="mr-3 text-blue-500" />
          Bibliothèque{typeof mediaCount === "number" ? ` (${mediaCount})` : ""}
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

      {/* Content */}
      <div className="overflow-y-auto h-full pb-24">
        {/* Fichiers liés */}
        <div className="p-6">
          <h3 className="font-medium text-slate-700 mb-5 flex items-center text-lg">
            <FaClock className="mr-2 text-blue-500" />
            Fichiers liés
          </h3>

          <div className="space-y-3">
            {mediaList.length ? (
              mediaList.map((f, idx) => (
                <div
                  key={f.id ?? `media-${idx}`}
                  className={`file-item p-4 rounded-2xl cursor-pointer flex items-center transition-all duration-300 border ${
                    selectedFile?.id === f.id
                      ? "bg-blue-50/80 border-blue-200 shadow-lg scale-[1.02]"
                      : "bg-white/60 border-slate-200/40 hover:border-blue-200/60 hover:shadow-md hover:scale-[1.01]"
                  }`}
                  onClick={() => onSelectFile?.(f)}
                >
                  <div
                    className={`w-12 h-12 ${iconBgForType(f.type)} rounded-xl flex items-center justify-center mr-4 transition-transform duration-300 hover:scale-110`}
                  >
                    {iconForType(f.type, "text-2xl")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{f.title}</p>
                    <p className="text-xs text-slate-500">
                      {f.size} • {f.date}
                    </p>
                  </div>
                  {f.favorite && <FaStar className="ml-2 text-amber-400 flex-shrink-0" />}
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500 py-12 text-center bg-slate-50/50 rounded-2xl">
                Aucun média lié à cet article.
              </div>
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
            TagListComponent ? (
              <TagListComponent
                tags={tags}
                onAddClick={onOpenTagManager}
                onTagClick={undefined}
                max={10}
              />
            ) : (
              <div className="text-xs text-slate-500">TagListComponent non fourni</div>
            )
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 px-4 py-2 rounded-full bg-slate-100/80">
                Aucun tag
              </span>
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
        <SimilarList
          items={similar}
          loading={similarLoading}
          onOpenSimilar={onOpenSimilar}
          toAbsolute={toAbsolute}
        />
      </div>

      {/* Replier (mobile) */}
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


