// ------------------------------
// File: media-library/parts/GridCard.jsx (Adapté pour les articles)
// ------------------------------
import { useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FaRegStar,
  FaStar,
  FaEye,
  FaShareAlt,
  FaUser,
  FaHeart,
  FaRegHeart,
  FaTag,
  FaCalendarAlt,
  FaComment,
  FaShare,
  FaThumbsUp,
  FaClock,
} from "react-icons/fa";
import { cls } from "../shared/utils/format";
import { isFav, toggleFav, isRead, markRead } from "../shared/store/markers";

const CATEGORY_COLORS = {
  "Développement Web": "from-amber-500/20 to-amber-600/30",
  "Intelligence Artificielle": "from-emerald-500/20 to-emerald-600/30",
  "Business": "from-red-500/20 to-red-600/30",
  "Mobile": "from-purple-500/20 to-purple-600/30",
  "Startup": "from-cyan-500/20 to-cyan-600/30",
  "Santé": "from-orange-500/20 to-orange-600/30",
  "Voyage": "from-teal-500/20 to-teal-600/30",
  "default": "from-slate-500/20 to-slate-600/30",
};

const CATEGORY_BORDER_COLORS = {
  "Développement Web": "border-amber-200/50 group-hover:border-amber-300/70",
  "Intelligence Artificielle": "border-emerald-200/50 group-hover:border-emerald-300/70",
  "Business": "border-red-200/50 group-hover:border-red-300/70",
  "Mobile": "border-purple-200/50 group-hover:border-purple-300/70",
  "Startup": "border-cyan-200/50 group-hover:border-cyan-300/70",
  "Santé": "border-orange-200/50 group-hover:border-orange-300/70",
  "Voyage": "border-teal-200/50 group-hover:border-teal-300/70",
  "default": "border-slate-200/50 group-hover:border-slate-300/70",
};

function getPrimaryCategory(categories = []) {
  return categories.length > 0 ? categories[0].name : "Article";
}

export default function GridCard({ item, routeBase, onOpen }) {
  const to = useMemo(() => `${routeBase}/${encodeURIComponent(String(item.slug))}`, [routeBase, item.slug]);
  const [fav, setFav] = useState(() => isFav(item.id));
  const [read, setRead] = useState(() => isRead(item.id));
  const [isHovered, setIsHovered] = useState(false);
  const [liked, setLiked] = useState(false);
  
  const primaryCategory = getPrimaryCategory(item.categories);
  const categoryColor = CATEGORY_COLORS[primaryCategory] || CATEGORY_COLORS.default;
  const borderColor = CATEGORY_BORDER_COLORS[primaryCategory] || CATEGORY_BORDER_COLORS.default;

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
      if (navigator.share) {
        await navigator.share({ title: item.title, url: shareUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {}
  }, [item.title, item.url, to]);

  return (
    <article 
      className={cls(
        "group relative bg-white/80 backdrop-blur-md rounded-3xl border-2 shadow-xl shadow-slate-200/30 overflow-hidden transition-all duration-700 hover:shadow-3xl hover:shadow-slate-300/40 hover:-translate-y-3 hover:scale-[1.02] w-full max-w-none min-w-[400px]",
        borderColor,
        "hover:bg-white/95 hover:backdrop-blur-lg"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={item.title}
      style={{ minHeight: '550px' }}
    >
      {/* Effet de lueur en arrière-plan avec animation */}
      <div className={cls(
        "absolute inset-0 opacity-0 group-hover:opacity-20 transition-all duration-700 bg-gradient-to-br",
        categoryColor
      )}></div>
      
      {/* Bande décorative en haut */}
      <div className={cls(
        "absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r transition-all duration-500",
        categoryColor.replace('/20', '/60').replace('/30', '/80')
      )}></div>
      
      {/* En-tête avec image/placeholder */}
      <div className="relative h-64 bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center overflow-hidden">
        {item.featured_image_url ? (
          <>
            <img
              src={item.featured_image_url}
              alt={item.title}
              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110 group-hover:saturate-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
          </>
        ) : (
          <>
            <div className={cls(
              "absolute inset-0 bg-gradient-to-br opacity-15 transition-all duration-700",
              categoryColor,
              "group-hover:opacity-30"
            )}></div>
            <div className="text-slate-400 group-hover:text-slate-600 transition-all duration-700 transform group-hover:scale-125 group-hover:-rotate-6 relative text-6xl">
              📝
              {/* Effet de halo */}
              <div className={cls(
                "absolute inset-0 blur-xl opacity-0 group-hover:opacity-30 transition-all duration-700",
                categoryColor
              )}></div>
            </div>
          </>
        )}
        
        {/* Actions rapides en overlay avec animations séquentielles améliorées */}
        <div className={cls(
          "absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center gap-6 transition-all duration-500",
          isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          <Link
            to={to}
            className={cls(
              "p-5 bg-white/95 hover:bg-white text-slate-700 hover:text-blue-600 rounded-2xl shadow-2xl transition-all duration-500 transform hover:scale-125 hover:-rotate-6 hover:shadow-blue-200/50",
              isHovered ? "translate-y-0 opacity-100 rotate-0" : "translate-y-8 opacity-0 rotate-12"
            )}
            style={{ transitionDelay: '0ms' }}
            title="Lire l'article"
            onClick={onOpenCard}
          >
            <FaEye size={24} />
          </Link>
          
          <button
            onClick={onShare}
            className={cls(
              "p-5 bg-white/95 hover:bg-white text-slate-700 hover:text-purple-600 rounded-2xl shadow-2xl transition-all duration-500 transform hover:scale-125 hover:-rotate-6 hover:shadow-purple-200/50",
              isHovered ? "translate-y-0 opacity-100 rotate-0" : "translate-y-8 opacity-0 rotate-12"
            )}
            style={{ transitionDelay: '200ms' }}
            title="Partager"
          >
            <FaShareAlt size={24} />
          </button>
        </div>

        {/* Boutons d'action en coins avec effets améliorés */}
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

        {/* Indicateur non lu avec effet néon amélioré */}
        {!read && (
          <div className="absolute bottom-4 right-4">
            <div className="relative">
              <div className="w-4 h-4 bg-blue-500 rounded-full shadow-2xl animate-pulse border-2 border-white/50"></div>
              <div className="absolute inset-0 w-4 h-4 bg-blue-400/50 rounded-full animate-ping"></div>
              <div className="absolute inset-[-4px] w-6 h-6 bg-blue-300/30 rounded-full animate-ping animation-delay-150"></div>
              <div className="absolute inset-[-8px] w-8 h-8 bg-blue-200/20 rounded-full animate-ping animation-delay-300"></div>
            </div>
          </div>
        )}

        {/* Badge de catégorie avec design amélioré */}
        <div className="absolute top-4 left-4">
          <div className={cls(
            "relative bg-white/95 backdrop-blur-md text-slate-800 px-4 py-2 rounded-2xl font-bold shadow-2xl border-2 border-white/50 transition-all duration-500 transform group-hover:scale-110",
            `hover:${categoryColor.replace('from-', 'bg-').replace('/20', '/10').split(' ')[0]}`
          )}>
            <FaTag className="inline mr-2 text-xs" />
            {primaryCategory}
          </div>
        </div>
      </div>

      {/* Contenu avec design premium en layout horizontal */}
      <div className="relative p-6 bg-gradient-to-b from-white/95 to-slate-50/95 backdrop-blur-md">
        <div className="flex gap-8">
          {/* Colonne principale - Informations */}
          <div className="flex-1">
            {/* En-tête avec titre */}
            <div className="mb-4">
              <h4 className="font-bold text-slate-900 text-xl leading-tight line-clamp-2 group-hover:text-slate-700 transition-colors mb-2" title={item.title}>
                {item.title}
              </h4>
              
              {/* Excerpt */}
              {item.excerpt && (
                <p className="text-slate-600 text-sm line-clamp-2 mb-3">
                  {item.excerpt}
                </p>
              )}
              
              {/* Barre de statut */}
              <div className="flex items-center gap-3 mt-2">
                {read && (
                  <div className="flex items-center gap-2 bg-emerald-100/80 rounded-full px-3 py-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
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

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {item.tags.slice(0, 3).map(tag => (
                  <span key={tag.id} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                    #{tag.name}
                  </span>
                ))}
                {item.tags.length > 3 && (
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                    +{item.tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Actions principales en bas */}
            <div className="flex items-center gap-3 mt-4">
              <Link
                to={to}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                onClick={onOpenCard}
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

          {/* Colonne droite - Métadonnées et stats */}
          <div className="w-64 space-y-3">
            {/* Informations article */}
            <div className="space-y-2">
              {/* Auteur */}
              {item.author && (
                <div className="flex items-center gap-2 bg-slate-100/80 rounded-lg px-3 py-2">
                  <div className="p-1.5 bg-slate-200/80 rounded">
                    <FaUser className="text-slate-600" size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-800 text-xs block truncate">{item.author.name}</span>
                    <p className="text-slate-600 text-xs">Auteur</p>
                  </div>
                </div>
              )}
              
              {/* Date de publication */}
              {item.published_at && (
                <div className="flex items-center gap-2 bg-slate-100/80 rounded-lg px-3 py-2">
                  <div className="p-1.5 bg-slate-200/80 rounded">
                    <FaCalendarAlt className="text-slate-600" size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-800 text-xs block truncate">
                      {new Date(item.published_at).toLocaleDateString()}
                    </span>
                    <p className="text-slate-600 text-xs">Publié le</p>
                  </div>
                </div>
              )}
              
              {/* Temps de lecture */}
              {item.reading_time && (
                <div className="flex items-center gap-2 bg-slate-100/80 rounded-lg px-3 py-2">
                  <div className="p-1.5 bg-slate-200/80 rounded">
                    <FaClock className="text-slate-600" size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-800 text-xs block truncate">{item.reading_time} min</span>
                    <p className="text-slate-600 text-xs">Temps de lecture</p>
                  </div>
                </div>
              )}
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-2 gap-2">
              {/* Vues */}
              {item.view_count !== undefined && (
                <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-lg p-2 text-center">
                  <div className="text-blue-700 font-bold text-sm">{item.formatted_view_count || item.view_count}</div>
                  <div className="text-blue-600 text-xs">Vues</div>
                </div>
              )}
              
              {/* Commentaires */}
              {item.comment_count !== undefined && (
                <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/80 rounded-lg p-2 text-center">
                  <div className="text-green-700 font-bold text-sm">{item.formatted_comment_count || item.comment_count}</div>
                  <div className="text-green-600 text-xs">Commentaires</div>
                </div>
              )}
              
              {/* Partages */}
              {item.share_count !== undefined && (
                <div className="bg-gradient-to-br from-purple-50/80 to-pink-50/80 rounded-lg p-2 text-center">
                  <div className="text-purple-700 font-bold text-sm">{item.formatted_share_count || item.share_count}</div>
                  <div className="text-purple-600 text-xs">Partages</div>
                </div>
              )}
              
              {/* Note */}
              {item.rating_average !== undefined && (
                <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/80 rounded-lg p-2 text-center">
                  <div className="text-amber-700 font-bold text-sm">{item.formatted_rating || item.rating_average}/5</div>
                  <div className="text-amber-600 text-xs">Note</div>
                </div>
              )}
            </div>

            {/* Footer info */}
            <div className="flex items-center gap-1 text-slate-500 pt-2 border-t border-slate-200/50 text-xs">
              {item.word_count && <span>{item.formatted_word_count || `${item.word_count} mots`}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Effets décoratifs multiples */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        {/* Brillance en haut */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
        {/* Brillance en bas */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
        {/* Brillances latérales */}
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-white/30 to-transparent"></div>
        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-white/30 to-transparent"></div>
      </div>

      {/* Effet de particules décoratif */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-1000 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400/50 rounded-full animate-ping animation-delay-0"></div>
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-purple-400/50 rounded-full animate-ping animation-delay-500"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-indigo-400/50 rounded-full animate-ping animation-delay-1000"></div>
      </div>
    </article>
  );
}