// src/pages/Articles/SpotlightArticles.jsx
import React, { useEffect, useState } from "react";
import {
  FiTrendingUp,
  FiStar,
  FiClock,
  FiCalendar,
  FiBookOpen,
  FiArrowRight,
} from "react-icons/fi";
import api from "../../../../services/api";

/* Helper cohérent avec le reste du projet pour les images */
const buildStorageBase = () => {
  const base =
    import.meta.env.VITE_API_BASE_STORAGE ||
    import.meta.env.VITE_API_BASE_URL ||
    "";

  return base.replace(/\/api\/?$/i, "").replace(/\/+$/i, "");
};

export default function SpotlightArticlesPage() {
  const [articles, setArticles] = useState({
    sticky: null,
    featured: null,
    latest: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    api
      .get("/public/articles/spotlight")
      .then((res) => {
        if (!mounted) return;
        setArticles(res?.data?.data || {});
      })
      .catch((err) => {
        console.error("Erreur chargement spotlight articles", err);
        if (!mounted) return;
        setError("Impossible de charger les articles pour le moment.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const { sticky, featured, latest } = articles;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 border border-slate-200 text-blue-600 text-xs font-medium shadow-sm backdrop-blur-md">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            ACTUALITÉS
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            Articles en vedette
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Un coup d'œil rapide sur l'article épinglé, l'article à la une,
            et le dernier article publié.
          </p>
        </div>

        {/* Messages d'erreur et de chargement */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-slate-600 text-sm">Chargement des articles...</p>
            </div>
          </div>
        )}

        {/* Grille des articles */}
        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Article épinglé */}
            <ArticleCard
              article={sticky}
              type="sticky"
              icon={FiTrendingUp}
              badge="Article épinglé"
              badgeColor="bg-amber-50 text-amber-700 border-amber-200"
            />

            {/* Article à la une */}
            <ArticleCard
              article={featured}
              type="featured"
              icon={FiStar}
              badge="À la une"
              badgeColor="bg-blue-50 text-blue-700 border-blue-200"
            />

            {/* Article récent */}
            <ArticleCard
              article={latest}
              type="latest"
              icon={FiClock}
              badge="Plus récent"
              badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleCard({ article, type, icon: Icon, badge, badgeColor }) {
  if (!article) {
    return (
      <div className="rounded-3xl border border-slate-200/70 bg-white/70 backdrop-blur-md shadow-sm flex items-center justify-center min-h-[320px]">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Icon className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">Aucun article disponible</p>
        </div>
      </div>
    );
  }

  const storageBase = buildStorageBase();
  const imageUrl = article.featured_image
    ? `${storageBase}/storage/${article.featured_image}`
    : null;

  return (
    <article
      className="
        group relative flex flex-col overflow-hidden
        rounded-3xl border border-slate-200/80
        bg-white/80 backdrop-blur-xl
        shadow-[0_12px_35px_rgba(15,23,42,0.06)]
        hover:shadow-[0_22px_55px_rgba(15,23,42,0.12)]
        hover:-translate-y-1 transition-all duration-300
      "
    >
      {/* Image / header */}
      <div className="relative h-52 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100">
            <Icon className="w-16 h-16 text-slate-300" />
          </div>
        )}

        {/* Overlay dégradé léger */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/25 via-slate-900/0 to-transparent" />

        {/* Badge flottant façon GridCard */}
        <div className="absolute top-4 left-4">
          <span
            className={`
              inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border
              backdrop-blur-sm ${badgeColor} shadow-sm
            `}
          >
            <Icon className="w-3.5 h-3.5" />
            {badge}
          </span>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-6 flex-1 flex flex-col">
        {/* Métadonnées */}
        <div className="flex items-center flex-wrap gap-4 text-xs text-slate-500 mb-3">
          <div className="flex items-center gap-1.5">
            <FiCalendar className="w-3.5 h-3.5" />
            <time dateTime={article.published_at}>
              {new Date(
                article.published_at || article.created_at
              ).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          </div>
          {article.reading_time && (
            <div className="flex items-center gap-1.5">
              <FiBookOpen className="w-3.5 h-3.5" />
              <span>{article.reading_time} min</span>
            </div>
          )}
        </div>

        {/* Titre */}
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {article.title}
        </h2>

        {/* Extrait */}
        <p className="text-sm text-slate-600 leading-relaxed mb-6 line-clamp-3 flex-1">
          {article.excerpt ||
            article.summary ||
            "Aucun extrait disponible pour cet article."}
        </p>

        {/* CTA simple (pas de partage) */}
        <a
          href={`/articles/${article.slug}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 group/link"
        >
          <span>Lire l'article</span>
          <FiArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
        </a>
      </div>

      {/* Barre de couleur en bas comme accent GridCard */}
      <div
        className={`h-1 ${
          type === "sticky"
            ? "bg-gradient-to-r from-amber-400 to-orange-500"
            : type === "featured"
            ? "bg-gradient-to-r from-blue-400 to-blue-600"
            : "bg-gradient-to-r from-emerald-400 to-teal-500"
        }`}
      />
    </article>
  );
}
