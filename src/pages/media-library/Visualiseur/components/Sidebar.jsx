// src/media-library/Sidebar.jsx
import React from "react";
import {
  FaFolderOpen, FaSearch, FaClock, FaTag, FaPlus, FaStar, FaFile, FaTimes, FaChartBar,
} from "react-icons/fa";
import SimilarList from "./SimilarList";

/**
 * Composant Sidebar isolé avec style amélioré
 * - Design moderne avec glassmorphism
 * - Animations fluides et micro-interactions
 * - Hiérarchie visuelle optimisée
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
      className={`sidebar pt-4 overflow-auto w-72 lg:w-80 bg-gradient-to-br from-white/80 via-white/75 to-slate-50/80 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] border-r border-white/50 flex-shrink-0 transition-all duration-500 ease-in-out ${
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      } lg:block fixed lg:relative inset-y-0 left-0 z-40`}
    >
      {/* Header avec gradient subtil */}
      <div className="p-6 border-b border-slate-200/40 sticky top-0 bg-gradient-to-r from-white/80 to-slate-50/80 backdrop-blur-2xl z-10 shadow-sm">
        <h2 className="text-2xl font-light text-slate-800 flex items-center tracking-tight">
          <div className="mr-3 p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <FaFolderOpen className="text-white text-lg" />
          </div>
          <span className="flex-1">
            Bibliothèque
            {typeof mediaCount === "number" && (
              <span className="ml-2 text-sm font-normal text-slate-500 bg-slate-100/80 px-3 py-1 rounded-full">
                {mediaCount}
              </span>
            )}
          </span>
        </h2>
        
        {/* Barre de recherche améliorée */}
        <div className="mt-6 relative group">
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full px-4 py-3.5 pl-12 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400/60 bg-white/90 backdrop-blur-sm transition-all duration-300 text-sm placeholder:text-slate-400 shadow-sm hover:shadow-md group-hover:border-slate-300/70"
          />
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 transition-all duration-300 group-focus-within:text-blue-500 group-focus-within:scale-110" />
        </div>
      </div>

      {/* Content avec scroll personnalisé */}
      <div className="overflow-y-auto h-full pb-24 scrollbar-thin scrollbar-thumb-slate-300/50 scrollbar-track-transparent hover:scrollbar-thumb-slate-400/50">
        
        {/* Fichiers liés - Section améliorée */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-800 flex items-center text-base">
              <div className="mr-2.5 p-1.5 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 rounded-lg">
                <FaClock className="text-blue-600 text-sm" />
              </div>
              Fichiers liés
            </h3>
            {mediaList.length > 0 && (
              <span className="text-xs text-slate-500 bg-slate-100/60 px-2.5 py-1 rounded-full font-medium">
                {mediaList.length}
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {mediaList.length ? (
              mediaList.map((f, idx) => (
                <div
                  key={f.id ?? `media-${idx}`}
                  className={`file-item p-4 rounded-xl cursor-pointer flex items-center transition-all duration-300 border group ${
                    selectedFile?.id === f.id
                      ? "bg-gradient-to-r from-blue-50/90 to-indigo-50/80 border-blue-300/60 shadow-lg shadow-blue-100/50 scale-[1.02]"
                      : "bg-white/70 border-slate-200/50 hover:border-blue-300/40 hover:shadow-md hover:shadow-slate-200/50 hover:scale-[1.01] hover:bg-white/90"
                  }`}
                  onClick={() => onSelectFile?.(f)}
                >
                  <div
                    className={`w-11 h-11 ${iconBgForType(f.type)} rounded-xl flex items-center justify-center mr-3.5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm`}
                  >
                    {iconForType(f.type, "text-xl")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate group-hover:text-slate-900">
                      {f.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 font-normal">
                      {f.size} • {f.date}
                    </p>
                  </div>
                  {f.favorite && (
                    <FaStar className="ml-2 text-amber-400 flex-shrink-0 drop-shadow-sm animate-pulse" />
                  )}
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500 py-16 text-center bg-gradient-to-br from-slate-50/70 to-slate-100/50 rounded-2xl border border-slate-200/40 backdrop-blur-sm">
                <FaFile className="mx-auto mb-3 text-3xl text-slate-300" />
                <p className="font-medium">Aucun média lié</p>
                <p className="text-xs text-slate-400 mt-1">Les fichiers apparaîtront ici</p>
              </div>
            )}
          </div>
        </div>

        {/* Tags - Section redessinée */}
        <div className="p-6 border-t border-slate-200/40 bg-gradient-to-b from-transparent to-slate-50/30">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-800 flex items-center text-base">
              <div className="mr-2.5 p-1.5 bg-gradient-to-br from-emerald-500/10 to-teal-600/10 rounded-lg">
                <FaTag className="text-emerald-600 text-sm" />
              </div>
              Tags
            </h3>
            {Array.isArray(tags) && tags.length > 0 && (
              <span className="text-xs text-slate-500 bg-slate-100/60 px-2.5 py-1 rounded-full font-medium">
                {tags.length}
              </span>
            )}
          </div>

          {Array.isArray(tags) && tags.length > 0 ? (
            TagListComponent ? (
              <TagListComponent
                tags={tags}
                onAddClick={onOpenTagManager}
                onTagClick={undefined}
                max={10}
              />
            ) : (
              <div className="text-xs text-slate-500 py-4 px-4 bg-amber-50/50 rounded-xl border border-amber-200/40">
                TagListComponent non fourni
              </div>
            )
          ) : (
            <div className="flex items-center gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-200/40">
              <span className="text-xs text-slate-500 px-3 py-2 rounded-lg bg-white/80 border border-slate-200/40 font-medium">
                Aucun tag
              </span>
              <button
                onClick={onOpenTagManager}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-emerald-300/60 text-emerald-700 bg-gradient-to-r from-emerald-50/80 to-teal-50/70 hover:from-emerald-100/90 hover:to-teal-100/80 hover:border-emerald-400/70 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105"
                title="Gérer les tags"
                type="button"
              >
                <FaPlus className="text-emerald-600" />
                Ajouter
              </button>
            </div>
          )}
        </div>

        {/* Similaires */}
        <SimilarList
          items={similar}
          loading={similarLoading}
          onOpen={onOpenSimilar} 
          toAbsolute={toAbsolute}
        />
      </div>

      {/* Bouton replier mobile amélioré */}
      <button
        onClick={toggle}
        className="absolute top-6 right-6 p-2 rounded-xl text-slate-600 hover:text-slate-900 lg:hidden transition-all duration-300 bg-white/80 hover:bg-white border border-slate-200/60 hover:border-slate-300 shadow-sm hover:shadow-md hover:scale-110 active:scale-95"
        title="Replier"
        aria-label="Fermer la sidebar"
      >
        <FaTimes className="text-lg" />
      </button>

      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm -z-10 lg:hidden transition-opacity duration-300"
          onClick={toggle}
          aria-hidden="true"
        />
      )}
    </div>
  );
}