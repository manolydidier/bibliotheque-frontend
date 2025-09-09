// ------------------------------
// File: media-library/parts/GridCard.jsx
// Version épurée & lisible — compat Laravel API (auteur, images, dates, visibilité)
// ------------------------------
import { useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FaRegStar, FaStar, FaEye, FaShareAlt, FaUser,
  FaHeart, FaRegHeart, FaTag, FaCalendarAlt, FaClock,
} from "react-icons/fa";
import { cls } from "../shared/utils/format";
import { isFav, toggleFav, isRead, markRead } from "../shared/store/markers";

/* =========================
   Utils
========================= */

// Transforme une URL relative en absolue selon VITE_API_BASE_URL (en retirant /api)
const toAbsolute = (u) => {
  if (!u) return null;
  const s = String(u);
  if (/^https?:\/\//i.test(s)) return s;
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/i, "");
  return base ? `${base}/${s.replace(/^\/+/, "")}` : s;
};

// Catégorie "présumée" dérivée du titre (fallback visuel)
function getCategoryFromTitle(title) {
  const s = String(title || "").toLowerCase();
  if (s.includes("intelligence artificielle") || s.includes("ia")) return "Intelligence Artificielle";
  if (s.includes("startup")) return "Startup";
  if (s.includes("développement") || s.includes("web")) return "Développement Web";
  if (s.includes("marketing")) return "Business";
  if (s.includes("technologie")) return "Mobile";
  return "Article";
}

// Nettoie un slug — évite "undefined"/"null"
const cleanSlug = (x) => {
  const s = (x ?? '').toString().trim();
  if (!s || s === 'undefined' || s === 'null') return null;
  return s;
};
const VISUALISEUR_BASE = "/media-library";
// Construit /media-library/:slug (ou :id si pas de slug)
const buildVisualiserPath = (base, rec) => {
  const slug = cleanSlug(rec?.slug);
  const id   = rec?.id != null ? String(rec.id) : null;
  const key  = slug || id || '';                   // jamais "undefined"
  return `${base || VISUALISEUR_BASE}/${encodeURIComponent(key)}`;
};

/* =========================
   Constantes UI
========================= */

const CATEGORY_COLORS = {
  "Développement Web": "from-amber-500/20 to-amber-600/30",
  "Intelligence Artificielle": "from-emerald-500/20 to-emerald-600/30",
  "Business": "from-red-500/20 to-red-600/30",
  "Mobile": "from-purple-500/20 to-purple-600/30",
  "Startup": "from-cyan-500/20 to-cyan-600/30",
  "Santé": "from-orange-500/20 to-orange-600/30",
  "Voyage": "from-teal-500/20 to-teal-600/30",
  default: "from-slate-500/20 to-slate-600/30",
};

const CATEGORY_BORDER_COLORS = {
  "Développement Web": "border-amber-200/50 group-hover:border-amber-300/70",
  "Intelligence Artificielle": "border-emerald-200/50 group-hover:border-emerald-300/70",
  "Business": "border-red-200/50 group-hover:border-red-300/70",
  "Mobile": "border-purple-200/50 group-hover:border-purple-300/70",
  "Startup": "border-cyan-200/50 group-hover:border-cyan-300/70",
  "Santé": "border-orange-200/50 group-hover:border-orange-300/70",
  "Voyage": "border-teal-200/50 group-hover:border-teal-300/70",
  default: "border-slate-200/50 group-hover:border-slate-300/70",
};

/* =========================
   Composant
========================= */

export default function GridCard({ item, routeBase, onOpen }) {
  /* --------- Navigation --------- */
  const to = useMemo(
    () => buildVisualiserPath(routeBase, item),
    [routeBase, item?.slug, item?.id]
  );

  /* --------- États locaux --------- */
  const [fav, setFav] = useState(() => isFav(item.id));
  const [read, setRead] = useState(() => isRead(item.id));
  const [isHovered, setIsHovered] = useState(false);
  const [liked, setLiked] = useState(false);

  /* --------- Dérivés visuels --------- */
  const primaryCategory = getCategoryFromTitle(item.title);
  const categoryColor = CATEGORY_COLORS[primaryCategory] || CATEGORY_COLORS.default;
  const borderColor = CATEGORY_BORDER_COLORS[primaryCategory] || CATEGORY_BORDER_COLORS.default;
  const topBarGradient = useMemo(
    () => categoryColor.replace("/20", "/60").replace("/30", "/80"),
    [categoryColor]
  );

  /* --------- Dérivés métier --------- */

  // Auteur : author.name > author.first/last > createdBy.name > created_by first/last > Auteur #ID
  const authorName = useMemo(() => {
    const full = (...xs) => xs.filter(Boolean).join(" ").trim();
    let name =
      item.author_name ||
      item.author?.name ||
      full(item.author?.first_name, item.author?.last_name) ||
      item.createdBy?.name ||
      full(item.created_by?.first_name, item.created_by?.last_name);
    if (!name && item.author_id) name = `Auteur #${item.author_id}`;
    return name || "Auteur";
  }, [item.author_name, item.author, item.createdBy, item.created_by, item.author_id]);

  // Temps de lecture : API > estimation (200 wpm)
  const readingTime = useMemo(() => {
    if (item.reading_time) return item.reading_time;
    const wc = item.word_count ?? (typeof item.content === "string" ? item.content.trim().split(/\s+/).length : 0);
    return Math.max(1, Math.round(wc / 200));
  }, [item.reading_time, item.word_count, item.content]);

  // Image priorités : featured_image_url > featured_image (string|obj.url) > media[0].url
  const imgUrl = useMemo(() => {
    if (item.featured_image_url) return toAbsolute(item.featured_image_url);
    if (typeof item.featured_image === "string") return toAbsolute(item.featured_image);
    if (item.featured_image?.url) return toAbsolute(item.featured_image.url);
    if (Array.isArray(item.media) && item.media[0]?.url) return toAbsolute(item.media[0].url);
    return null;
  }, [item.featured_image_url, item.featured_image, item.media]);

  const formattedViewCount = useMemo(() => {
    const n = Number(item.view_count || 0);
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  }, [item.view_count]);

  const formattedRating = useMemo(
    () => (item.rating_average ? Number(item.rating_average).toFixed(1) : "0.0"),
    [item.rating_average]
  );

  const formattedDate = useMemo(() => {
    if (!item.published_at) return "—";
    const d = new Date(item.published_at);
    return isNaN(d) ? "—" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  }, [item.published_at]);

  const visibilityLabel = useMemo(() => {
    const v = (item.visibility || "").toString().toLowerCase().replace(/_/g, " ");
    return v || "—";
  }, [item.visibility]);

  /* --------- Classes réutilisées --------- */

  const cardClass = cls(
    "group relative bg-white/80 backdrop-blur-md rounded-3xl border-2",
    "shadow-xl shadow-slate-200/30 overflow-hidden transition-all duration-700",
    "hover:shadow-3xl hover:shadow-slate-300/40 hover:-translate-y-3 hover:scale-[1.02]",
    "hover:bg-white/95 hover:backdrop-blur-lg",
    "w-full max-w-none min-w-[400px]",
    borderColor
  );

  const overlayBtnClass = cls(
    "p-5 bg-white/95 hover:bg-white text-slate-700 rounded-2xl shadow-2xl",
    "transition-all duration-500 transform hover:scale-125 hover:-rotate-6"
  );

  const smallStatBox = "rounded-lg p-2 text-center";

  /* --------- Handlers --------- */

  const onToggleFav = useCallback((e) => {
    e.stopPropagation();
    try { toggleFav(item.id); } catch {}
    setFav((f) => !f);
  }, [item.id]);

  const onToggleLike = useCallback((e) => {
    e.stopPropagation();
    setLiked((l) => !l);
  }, []);

  const onOpenCard = useCallback(() => {
    try { markRead(item.id); } catch {}
    setRead(true);
    onOpen?.(item);
  }, [item, onOpen]);

  const onShare = useCallback(async (e) => {
    e.stopPropagation();
    const shareUrl = item.url || `${window.location.origin}${to}`;
    try {
      if (navigator.share)      await navigator.share({ title: item.title, url: shareUrl });
      else if (navigator.clipboard) await navigator.clipboard.writeText(shareUrl);
    } catch {}
  }, [item.title, item.url, to]);

  /* --------- Render --------- */
  return (
    <article
      className={cardClass}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={item.title}
      style={{ minHeight: "550px" }}
    >
      {/* Fond gradient doux */}
      <div className={cls("absolute inset-0 opacity-0 group-hover:opacity-20 transition-all duration-700 bg-gradient-to-br", categoryColor)} />
      <div className={cls("absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r transition-all duration-500", topBarGradient)} />

      {/* --- Media --- */}
      <div className="relative h-64 bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center overflow-hidden">
        {imgUrl ? (
          <>
            <img
              src={imgUrl}
              alt={item.title}
              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110 group-hover:saturate-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
          </>
        ) : (
          <>
            <div className={cls("absolute inset-0 bg-gradient-to-br opacity-15 transition-all duration-700", categoryColor, "group-hover:opacity-30")} />
            <div className="text-slate-400 group-hover:text-slate-600 transition-all duration-700 transform group-hover:scale-125 group-hover:-rotate-6 relative text-6xl">
              📝
              <div className={cls("absolute inset-0 blur-xl opacity-0 group-hover:opacity-30 transition-all duration-700", categoryColor)} />
            </div>
          </>
        )}

        {/* Overlay actions (hover) */}
        <div
          className={cls(
            "absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center gap-6 transition-all duration-500",
            isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <Link
            to={to}
            className={cls(overlayBtnClass, "hover:text-blue-600 hover:shadow-blue-200/50", isHovered ? "translate-y-0 opacity-100 rotate-0" : "translate-y-8 opacity-0 rotate-12")}
            style={{ transitionDelay: "0ms" }}
            title="Lire l'article"
            onClick={onOpenCard}
          >
            <FaEye size={24} />
          </Link>

          <button
            onClick={onShare}
            className={cls(overlayBtnClass, "hover:text-purple-600 hover:shadow-purple-200/50", isHovered ? "translate-y-0 opacity-100 rotate-0" : "translate-y-8 opacity-0 rotate-12")}
            style={{ transitionDelay: "200ms" }}
            title="Partager"
          >
            <FaShareAlt size={24} />
          </button>
        </div>

        {/* Coins : favoris / like */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={onToggleFav}
            className={cls(
              "p-3 rounded-2xl transition-all duration-500 shadow-xl backdrop-blur-md transform hover:scale-125 hover:-rotate-12",
              fav
                ? "text-amber-500 bg-amber-50/90 hover:bg-amber-100/90 shadow-amber-200/50 scale-110"
                : "text-slate-500 bg-white/90 hover:bg-white hover:text-amber-500 shadow-slate-200/50"
            )}
            title={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            {fav ? <FaStar size={20} /> : <FaRegStar size={20} />}
          </button>

          <button
            onClick={onToggleLike}
            className={cls(
              "p-3 rounded-2xl transition-all duration-500 shadow-xl backdrop-blur-md transform hover:scale-125 hover:rotate-12",
              liked
                ? "text-pink-500 bg-pink-50/90 hover:bg-pink-100/90 shadow-pink-200/50 scale-110"
                : "text-slate-500 bg-white/90 hover:bg-white hover:text-pink-500 shadow-slate-200/50"
            )}
            title={liked ? "Retirer des likes" : "Ajouter aux likes"}
          >
            {liked ? <FaHeart size={20} /> : <FaRegHeart size={20} />}
          </button>
        </div>

        {/* Badges de catégorie / flags */}
        <div className="absolute top-4 left-4">
          <div
            className={cls(
              "relative bg-white/95 backdrop-blur-md text-slate-800 px-4 py-2 rounded-2xl font-bold shadow-2xl border-2 border-white/50 transition-all duration-500 transform group-hover:scale-110",
              `hover:${categoryColor.replace("from-", "bg-").replace("/20", "/10").split(" ")[0]}`
            )}
          >
            <FaTag className="inline mr-2 text-xs" />
            {primaryCategory}
          </div>
        </div>

        <div className="absolute bottom-4 left-4 flex gap-2">
          {item.is_featured && (
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">⭐ À la une</div>
          )}
          {item.is_sticky && (
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">📌 Épinglé</div>
          )}
        </div>
      </div>

      {/* --- Contenu --- */}
      <div className="relative p-6 bg-gradient-to-b from-white/95 to-slate-50/95 backdrop-blur-md">
        <div className="flex gap-8">
          {/* Texte principal */}
          <div className="flex-1">
            <div className="mb-4">
              <h4 className="font-bold text-slate-900 text-xl leading-tight line-clamp-2 group-hover:text-slate-700 transition-colors mb-2" title={item.title}>
                {item.title}
              </h4>

              {item.excerpt && <p className="text-slate-600 text-sm line-clamp-2 mb-3">{item.excerpt}</p>}

              <div className="flex items-center gap-3 mt-2">
                {read && (
                  <div className="flex items-center gap-2 bg-emerald-100/80 rounded-full px-3 py-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-emerald-700 text-xs font-semibold">Lu</span>
                  </div>
                )}
                {fav && (
                  <div className="flex items-center gap-2 bg-amber-100/80 rounded-full px-3 py-1">
                    <FaStar className="text-amber-500" size={12} />
                    <span className="text-amber-700 text-xs font-semibold">Favori</span>
                  </div>
                )}
                {liked && (
                  <div className="flex items-center gap-2 bg-pink-100/80 rounded-full px-3 py-1">
                    <FaHeart className="text-pink-500" size={12} />
                    <span className="text-pink-700 text-xs font-semibold">Aimé</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-4">
              <Link
                to={to}
                onClick={onOpenCard}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <FaEye size={14} />
                <span>Lire l'article</span>
              </Link>

              <button
                onClick={onShare}
                className="p-2 text-slate-600 hover:text-purple-600 hover:bg-purple-100 rounded-xl transition-all duration-300 transform hover:scale-105"
                title="Partager"
              >
                <FaShareAlt size={16} />
              </button>
            </div>
          </div>

          {/* Méta */}
          <div className="w-64 space-y-3">
            <div className="space-y-2">
              {/* Auteur */}
              <div className="flex items-center gap-2 bg-slate-100/80 rounded-lg px-3 py-2">
                <div className="p-1.5 bg-slate-200/80 rounded"><FaUser className="text-slate-600" size={12} /></div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800 text-xs block truncate">{authorName}</span>
                  <p className="text-slate-600 text-xs">{item.author?.email || "Auteur"}</p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-center gap-2 bg-slate-100/80 rounded-lg px-3 py-2">
                <div className="p-1.5 bg-slate-200/80 rounded"><FaCalendarAlt className="text-slate-600" size={12} /></div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800 text-xs block truncate">{formattedDate}</span>
                  <p className="text-slate-600 text-xs">
                    {item.updated_at !== item.created_at ? "Mis à jour" : "Publié le"}
                  </p>
                </div>
              </div>

              {/* Temps de lecture */}
              {/* <div className="flex items-center gap-2 bg-slate-100/80 rounded-lg px-3 py-2">
                <div className="p-1.5 bg-slate-200/80 rounded"><FaClock className="text-slate-600" size={12} /></div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800 text-xs block truncate">{readingTime} min</span>
                  <p className="text-slate-600 text-xs">Temps de lecture</p>
                </div>
              </div> */}

              {/* Visibilité */}
              {item.visibility && item.visibility !== "public" && (
                <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                  <div className="p-1.5 bg-blue-100 rounded"><FaTag className="text-blue-700" size={12} /></div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-blue-800 text-xs block truncate">{visibilityLabel}</span>
                    <p className="text-blue-700 text-xs">Visibilité</p>
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className={cls("bg-gradient-to-br from-blue-50/80 to-indigo-50/80", smallStatBox)}>
                <div className="text-blue-700 font-bold text-sm">{formattedViewCount}</div>
                <div className="text-blue-600 text-xs">Vues</div>
              </div>

              {item.comment_count !== undefined && (
                <div className={cls("bg-gradient-to-br from-green-50/80 to-emerald-50/80", smallStatBox)}>
                  <div className="text-green-700 font-bold text-sm">{item.comment_count}</div>
                  <div className="text-green-600 text-xs">Commentaires</div>
                </div>
              )}

              {item.share_count !== undefined && (
                <div className={cls("bg-gradient-to-br from-purple-50/80 to-pink-50/80", smallStatBox)}>
                  <div className="text-purple-700 font-bold text-sm">{item.share_count}</div>
                  <div className="text-purple-600 text-xs">Partages</div>
                </div>
              )}

              <div className={cls("bg-gradient-to-br from-amber-50/80 to-orange-50/80", smallStatBox)}>
                <div className="text-amber-700 font-bold text-sm">{formattedRating}/5</div>
                <div className="text-amber-600 text-xs">{item.rating_count || 0} avis</div>
              </div>

           
            </div>

            {/* Divers */}
            <div className="flex items-center gap-1 text-slate-500 pt-2 border-t border-slate-200/50 text-xs">
              {item.word_count && <span>{item.word_count} mots</span>}
              {item.word_count && item.categories?.length > 0 && <span>•</span>}
              {item.categories?.length > 0 && (
                <span>
                  {item.categories.length} catégorie{item.categories.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Décor lumineux subtil */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-white/30 to-transparent" />
        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-white/30 to-transparent" />
      </div>
    </article>
  );
}
