import React from "react";
import { FaChartBar, FaFile } from "react-icons/fa";

// items = tableau d'articles "similaires"
export default function SimilarList({
  items = [],
  loading = false,
  onOpen,
  toAbsolute, // optionnel : passe-le si tes URLs sont relatives
}) {
  return (
    <div className="p-6 border-t border-slate-200/30">
      <h3 className="font-medium text-slate-700 mb-5 flex items-center text-lg">
        <FaChartBar className="mr-2 text-blue-700" />
        Similaires
      </h3>

      <div className="space-y-4 overflow-auto min-h-96 max-h-72 pr-2 custom-scrollbar">
        {loading && (
          <div className="text-center py-16 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-2xl border border-blue-100/40 backdrop-blur-sm">
            <div className="inline-block w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-base font-medium text-blue-700 mb-1">Chargement…</p>
            <p className="text-sm text-blue-500">Recherche d'articles similaires</p>
          </div>
        )}

        {!loading && (items.length ? items.map((it, index) => {
          const coverRaw =
            (typeof it.featured_image === "string" && it.featured_image) ||
            it.featured_image?.url ||
            it.media?.[0]?.url ||
            null;
          const cover = toAbsolute ? toAbsolute(coverRaw) : coverRaw;

          return (
            <button
              key={it.id ?? `${it.slug}-${index}`}
              onClick={() => onOpen?.(it.slug || it.id)}
              className="w-full text-left p-5 rounded-2xl cursor-pointer flex items-center transition-all duration-300 border border-slate-200/60 bg-white/80 backdrop-blur-sm hover:border-blue-300/70 hover:shadow-lg hover:shadow-blue-100/40 hover:scale-[1.02] group"
              style={{ animationDelay: `${index * 80}ms`, animation: "slideInUp 0.5s ease-out forwards" }}
            >
              <div className="relative w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center mr-4 overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-300">
                {cover ? (
                  <>
                    <img
                      src={cover}
                      alt={it.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </>
                ) : (
                  <FaFile className="text-slate-500 text-xl group-hover:text-blue-600 transition-colors duration-300" />
                )}
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 scale-0 group-hover:scale-100 flex items-center justify-center">
                  <span className="text-white text-xs">→</span>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-800 transition-colors duration-300 truncate mb-1">
                  {it.title}
                </p>
                <p className="text-xs text-slate-500 group-hover:text-slate-600 transition-colors duration-300 truncate">
                  {(it.categories || []).map((c) => c.name).join(", ") || "—"}
                </p>
              </div>

              <div className="ml-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <div className="w-7 h-7 bg-blue-100 group-hover:bg-blue-200 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-bold">→</span>
                </div>
              </div>
            </button>
          );
        }) : (
          <div className="text-center py-16 bg-gradient-to-br from-slate-50/80 to-slate-100/80 rounded-2xl border border-slate-200/40 backdrop-blur-sm">
            <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaFile className="text-slate-400 text-xl" />
            </div>
            <p className="text-base font-medium text-slate-600 mb-1">Aucun article similaire.</p>
            <p className="text-sm text-slate-500">Revenez plus tard pour découvrir du nouveau contenu</p>
          </div>
        ))}

        <style>{`
          @keyframes slideInUp {
            from { opacity: 0; transform: translateY(15px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .custom-scrollbar::-webkit-scrollbar { width: 5px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 3px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}</style>
      </div>
    </div>
  );
}
