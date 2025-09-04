// ------------------------------
// File: media-library/parts/GridCard.jsx (Version UI moderne et premium améliorée - Plus large et distincte)
// ------------------------------
import { useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FaRegStar,
  FaStar,
  FaEye,
  FaDownload,
  FaShareAlt,
  FaPlay,
  FaFileAlt,

  FaUser,
  FaHeart,
  FaRegHeart,
  FaTag,
  FaCalendarAlt,
} from "react-icons/fa";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock } from "@fortawesome/free-solid-svg-icons";
import { TypeBadge, FileGlyph } from "../shared/atoms/atoms";
import { formatBytes, formatDate, cls } from "../shared/utils/format";
import { isFav, toggleFav, isRead, markRead } from "../shared/store/markers";

const LABELS = {
  pdf: "PDF",
  doc: "Word",
  xls: "Excel",
  ppt: "Slides",
  zip: "Archive",
  audio: "Audio",
  video: "Vidéo",
  image: "Image",
  default: "Fichier",
};

const TYPE_COLORS = {
  pdf: "from-red-500/20 to-red-600/30",
  doc: "from-blue-500/20 to-blue-600/30",
  xls: "from-green-500/20 to-green-600/30",
  ppt: "from-orange-500/20 to-orange-600/30",
  zip: "from-purple-500/20 to-purple-600/30",
  audio: "from-pink-500/20 to-pink-600/30",
  video: "from-indigo-500/20 to-indigo-600/30",
  image: "from-cyan-500/20 to-cyan-600/30",
  default: "from-slate-500/20 to-slate-600/30",
};

const TYPE_BORDER_COLORS = {
  pdf: "border-red-200/50 group-hover:border-red-300/70",
  doc: "border-blue-200/50 group-hover:border-blue-300/70",
  xls: "border-green-200/50 group-hover:border-green-300/70",
  ppt: "border-orange-200/50 group-hover:border-orange-300/70",
  zip: "border-purple-200/50 group-hover:border-purple-300/70",
  audio: "border-pink-200/50 group-hover:border-pink-300/70",
  video: "border-indigo-200/50 group-hover:border-indigo-300/70",
  image: "border-cyan-200/50 group-hover:border-cyan-300/70",
  default: "border-slate-200/50 group-hover:border-slate-300/70",
};

function getKind(type = "", mime = "") {
  const t = `${type} ${mime}`.toLowerCase();
  if (/(xls|xlsx|sheet|excel)/.test(t)) return "xls";
  if (/(doc|docx|word)/.test(t)) return "doc";
  if (/(ppt|pptx|powerpoint|slides)/.test(t)) return "ppt";
  if (/(zip|rar|7z|tar|gzip)/.test(t)) return "zip";
  if (/(mp3|wav|flac|audio)/.test(t)) return "audio";
  if (/(mp4|mov|mkv|video)/.test(t)) return "video";
  if (/(png|jpg|jpeg|gif|image|webp)/.test(t)) return "image";
  if (/(pdf)/.test(t)) return "pdf";
  return "default";
}

export default function GridCard({ item, routeBase, onOpen }) {
  const to = useMemo(() => `${routeBase}/${encodeURIComponent(String(item.id))}`, [routeBase, item.id]);
  const [fav, setFav] = useState(() => isFav(item.id));
  const [read, setRead] = useState(() => isRead(item.id));
  const [isHovered, setIsHovered] = useState(false);
  const [liked, setLiked] = useState(false);
  const kind = getKind(item.type, item.mimeType);
  const label = LABELS[kind] || LABELS.default;
  const typeColor = TYPE_COLORS[kind] || TYPE_COLORS.default;
  const borderColor = TYPE_BORDER_COLORS[kind] || TYPE_BORDER_COLORS.default;

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
    const shareUrl = item.shareUrl || `${window.location.origin}${to}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.name, url: shareUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {}
  }, [item.name, item.shareUrl, to]);

  const onDownload = useCallback((e) => {
    e.stopPropagation();
    if (item.downloadUrl) {
      const a = document.createElement("a");
      a.href = item.downloadUrl;
      a.download = item.name || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }, [item.downloadUrl, item.name]);

  return (
    <article 
      className={cls(
        "group relative bg-white/80 backdrop-blur-md rounded-3xl border-2 shadow-xl shadow-slate-200/30 overflow-hidden transition-all duration-700 hover:shadow-3xl hover:shadow-slate-300/40 hover:-translate-y-3 hover:scale-[1.02] w-full max-w-none min-w-[400px]",
        borderColor,
        "hover:bg-white/95 hover:backdrop-blur-lg"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={item.name}
      style={{ minHeight: '550px' }}
    >
      {/* Effet de lueur en arrière-plan avec animation */}
      <div className={cls(
        "absolute inset-0 opacity-0 group-hover:opacity-20 transition-all duration-700 bg-gradient-to-br",
        typeColor
      )}></div>
      
      {/* Bande décorative en haut */}
      <div className={cls(
        "absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r transition-all duration-500",
        typeColor.replace('/20', '/60').replace('/30', '/80')
      )}></div>
      
      {/* En-tête avec thumbnail/icône - Plus haut */}
      <div className="relative h-64 bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center overflow-hidden">
        {item.thumbnail ? (
          <>
            <img
              src={item.thumbnail}
              alt={item.name}
              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110 group-hover:saturate-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
            
            {/* Bouton play pour vidéos avec effet néon */}
            {kind === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                <div className="relative">
                  <div className="w-20 h-20 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-all duration-500 border-4 border-white/50">
                    <FaPlay className="text-slate-700 text-2xl ml-1" />
                  </div>
                  <div className="absolute inset-0 w-20 h-20 border-4 border-white/30 rounded-full animate-ping"></div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className={cls(
              "absolute inset-0 bg-gradient-to-br opacity-15 transition-all duration-700",
              typeColor,
              "group-hover:opacity-30"
            )}></div>
            <div className="text-slate-400 group-hover:text-slate-600 transition-all duration-700 transform group-hover:scale-125 group-hover:-rotate-6 relative">
              <FileGlyph type={item.type} size={80} />
              {/* Effet de halo */}
              <div className={cls(
                "absolute inset-0 blur-xl opacity-0 group-hover:opacity-30 transition-all duration-700",
                typeColor
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
            title="Ouvrir"
            onClick={onOpenCard}
          >
            <FaEye size={24} />
          </Link>
          
          <button
            onClick={onDownload}
            className={cls(
              "p-5 bg-white/95 hover:bg-white text-slate-700 hover:text-green-600 rounded-2xl shadow-2xl transition-all duration-500 transform hover:scale-125 hover:rotate-6 hover:shadow-green-200/50",
              isHovered ? "translate-y-0 opacity-100 rotate-0" : "translate-y-8 opacity-0 -rotate-12"
            )}
            style={{ transitionDelay: '100ms' }}
            title="Télécharger"
          >
            <FaDownload size={24} />
          </button>
          
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

        {/* Badge de type avec design amélioré */}
        <div className="absolute top-4 left-4">
          <div className={cls(
            "relative bg-white/95 backdrop-blur-md text-slate-800 px-4 py-2 rounded-2xl font-bold shadow-2xl border-2 border-white/50 transition-all duration-500 transform group-hover:scale-110",
            `hover:${typeColor.replace('from-', 'bg-').replace('/20', '/10').split(' ')[0]}`
          )}>
            <FaTag className="inline mr-2 text-xs" />
            {label}
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
              <h4 className="font-bold text-slate-900 text-xl leading-tight line-clamp-2 group-hover:text-slate-700 transition-colors mb-2" title={item.name}>
                {item.name}
              </h4>
              
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

            {/* Description stylisée */}
            {item.description && (
              <div className="relative mb-4">
                <div className={cls(
                  "absolute -left-3 top-0 w-1.5 h-full rounded-full bg-gradient-to-b",
                  typeColor.replace('/20', '/60').replace('/30', '/80')
                )}></div>
                <div className="bg-slate-50/80 rounded-xl p-4 pl-6 border-l-4 border-slate-200/50">
                  <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed italic font-medium">
                    "{item.description}"
                  </p>
                </div>
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
                <span>Ouvrir</span>
              </Link>
              
              <button
                onClick={onDownload}
                className="flex items-center gap-2 px-4 py-2 text-green-700 bg-gradient-to-r from-green-100 to-green-200 hover:from-green-200 hover:to-green-300 rounded-xl font-semibold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <FaDownload size={14} />
                <span>Télécharger</span>
              </button>
              
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
            {/* Informations fichier */}
            <div className="space-y-2">
              {typeof item.sizeBytes === "number" && (
                <div className="flex items-center gap-2 bg-slate-100/80 rounded-lg px-3 py-2">
                  <div className="p-1.5 bg-slate-200/80 rounded">
                    <FaFileAlt className="text-slate-600" size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-800 text-sm block truncate">{formatBytes(item.sizeBytes)}</span>
                    <p className="text-slate-600 text-xs">Taille</p>
                  </div>
                </div>
              )}
              
              {item.createdAt && (
                <div className="flex items-center gap-2 bg-slate-100/80 rounded-lg px-3 py-2">
                  <div className="p-1.5 bg-slate-200/80 rounded">
                    <FaCalendarAlt className="text-slate-600" size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-800 text-xs block truncate">{formatDate(item.createdAt)}</span>
                    <p className="text-slate-600 text-xs">Créé le</p>
                  </div>
                </div>
              )}
            </div>

            {/* Propriétaire */}
            {item.owner && (
              <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-lg p-3 border border-blue-100/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                    {item.owner.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      <FaUser className="text-blue-600" size={10} />
                      <span className="text-blue-700 text-xs font-semibold">Propriétaire</span>
                    </div>
                    <p className="text-slate-700 font-semibold text-xs truncate">{item.owner}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Barre de popularité */}
            {item.downloadCount && (
              <div className="p-3 bg-gradient-to-br from-blue-50/90 to-indigo-50/90 rounded-lg border border-blue-100/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-700 font-semibold text-xs">Popularité</span>
                  <div className="flex items-center gap-1 bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                    <FaDownload size={8} />
                    {item.downloadCount}
                  </div>
                </div>
                <div className="w-full bg-slate-200/60 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-1000 shadow-sm" 
                    style={{ 
                      width: `${Math.min((item.downloadCount / 100) * 100, 100)}%`,
                      transform: isHovered ? 'scaleX(1)' : 'scaleX(0.3)',
                      transformOrigin: 'left'
                    }}
                  ></div>
                </div>
              </div>
            )}

            {/* Footer info */}
            <div className="flex items-center gap-1 text-slate-500 pt-2 border-t border-slate-200/50">
              <FontAwesomeIcon icon={faClock} size="xs" />
              <span className="text-xs truncate">
                Modifié {item.updatedAt ? formatDate(item.updatedAt) : 'récemment'}
              </span>
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