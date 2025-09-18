// src/media-library/parts/GridCard.jsx
// Version "pastel light" + badges visibilité + modal password réutilisable
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaRegStar, FaStar, FaEye, FaUser,
  FaHeart, FaRegHeart, FaTag, FaLockOpen, FaLock
} from "react-icons/fa";
import SmartImage from "./SmartImage";
import ShareButton from "../Visualiseur/share/ShareButton";
import { cls } from "../shared/utils/format";
import { isFav, toggleFav, isRead, markRead } from "../shared/store/markers";

// ✅ Modal & pass memory
import PasswordModal from "../components/PasswordModal";
import { getStoredPassword, setStoredPassword } from "../utils/passwordGate";

/* =========================
   Utils
========================= */

const toAbsolute = (u) => {
  if (!u) return null;
  const s = String(u);
  if (/^https?:\/\//i.test(s)) return s;
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/i, "");
  return base ? `${base}/${s.replace(/^\/+/, "")}` : s;
};

function getCategoryFromTitle(title) {
  const s = String(title || "").toLowerCase();
  if (s.includes("intelligence artificielle") || s.includes("ia")) return "Intelligence Artificielle";
  if (s.includes("startup")) return "Startup";
  if (s.includes("développement") || s.includes("web")) return "Développement Web";
  if (s.includes("marketing")) return "Business";
  if (s.includes("technologie")) return "Mobile";
  return "Article";
}

const cleanSlug = (x) => {
  const s = (x ?? '').toString().trim();
  if (!s || s === 'undefined' || s === 'null') return null;
  return s;
};

const VISUALISEUR_BASE = "/media-library";
const buildVisualiserPath = (base, rec) => {
  const slug = cleanSlug(rec?.slug);
  const id   = rec?.id != null ? String(rec.id) : null;
  const key  = slug || id || '';
  return `${base || VISUALISEUR_BASE}/${encodeURIComponent(key)}`;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const canHover = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(hover: hover)").matches;

/* =========================
   Impression tracker (hook)
========================= */
function useImpression(onSeen, once = true, threshold = 0.5) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let done = false;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && (!done || !once)) {
        onSeen?.(); done = true;
      }
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [onSeen, once, threshold]);
  return ref;
}

/* =========================
   Visibilité helpers
========================= */
const isPrivate = (v) => String(v || "").toLowerCase() === "private";
const isPwdProtected = (v) => {
  if (v === true || v === 1 || v === 2) return true; // si l'API renvoie bool/entier
  const k = String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ["password_protected", "password", "protected", "protected_by_password"].includes(k);
};
const humanizeVisibility = (v) => {
  const k = String(v || "").toLowerCase();
  if (k === "public") return "Public";
  if (isPrivate(k)) return "Privé";
  if (isPwdProtected(k)) return "Protégé par mot de passe";
  return v || "—";
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
  const itemKey = useMemo(
    () => (cleanSlug(item?.slug) ?? (item?.id != null ? String(item.id) : "unknown")),
    [item?.slug, item?.id]
  );
  const navigate = useNavigate();
  const to = useMemo(() => buildVisualiserPath(routeBase, item), [routeBase, item?.slug, item?.id]);

  const [fav, setFav] = useState(() => isFav(item.id));
  const [read, setRead] = useState(() => isRead(item.id));
  const [isHovered, setIsHovered] = useState(false);
  const [liked, setLiked] = useState(false);

  // ✅ modal pwd réutilisable
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdDefault, setPwdDefault] = useState("");

  const primaryCategory = getCategoryFromTitle(item.title);
  const categoryColor = CATEGORY_COLORS[primaryCategory] || CATEGORY_COLORS.default;
  const borderColor = CATEGORY_BORDER_COLORS[primaryCategory] || CATEGORY_BORDER_COLORS.default;
  const topBarGradient = useMemo(
    () => categoryColor.replace("/20", "/60").replace("/30", "/80"),
    [categoryColor]
  );

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

  const nf = useMemo(() => new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }), []);
  const df = useMemo(() => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }), []);

  const readingTime = useMemo(() => {
    if (item.reading_time) return item.reading_time;
    const wc = item.word_count ?? (typeof item.content === "string" ? item.content.trim().split(/\s+/).length : 0);
    return Math.max(1, Math.round(wc / 200));
  }, [item.reading_time, item.word_count, item.content]);

  const imgUrl = useMemo(() => {
    if (item.featured_image_url) return toAbsolute(item.featured_image_url);
    if (typeof item.featured_image === "string") return toAbsolute(item.featured_image);
    if (item.featured_image?.url) return toAbsolute(item.featured_image.url);
    if (Array.isArray(item.media) && item.media[0]?.url) return toAbsolute(item.media[0].url);
    return null;
  }, [item.featured_image_url, item.featured_image, item.media]);

  const formattedViewCount = useMemo(() => nf.format(Number(item.view_count || 0)), [nf, item.view_count]);
  const formattedRating    = useMemo(() => (item.rating_average ? Number(item.rating_average).toFixed(1) : "0,0"), [item.rating_average]);
  const formattedDate      = useMemo(() => (item.published_at ? df.format(new Date(item.published_at)) : "—"), [df, item.published_at]);

  const visLabel = useMemo(() => humanizeVisibility(item.visibility), [item.visibility]);

  const motionless = prefersReducedMotion();
  const hoverCls   = motionless ? "" : "hover:-translate-y-3 hover:scale-[1.02]";

  const cardClass = cls(
    "group relative bg-white/80 backdrop-blur-md rounded-3xl border-2",
    "shadow-xl shadow-slate-200/30 overflow-hidden transition-all duration-700",
    "hover:shadow-3xl hover:shadow-slate-300/40",
    "hover:bg-white/95 hover:backdrop-blur-lg",
    "w-full max-w-none min-w-[400px]",
    hoverCls,
    borderColor
  );

  const overlayBtnClass = cls(
    "p-5 bg-white/95 hover:bg-white text-slate-700 rounded-2xl shadow-2xl",
    "transition-all duration-500 transform hover:scale-125 hover:-rotate-6"
  );

  const smallStatBox = "rounded-lg p-2 text-center";

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
    if (typeof onOpen === "function") onOpen(item);
    else navigate(to);
  }, [item, onOpen, navigate, to]);

  const prefetchDetail = useCallback(() => {
    if (imgUrl) { const im = new Image(); im.src = imgUrl; }
    try {
      const l = document.createElement("link");
      l.rel = "prefetch";
      l.href = to;
      document.head.appendChild(l);
    } catch {}
  }, [imgUrl, to]);

  // ✅ Lecture : gère Private vs Password
  const handleRead = useCallback((e) => {
    const token = sessionStorage.getItem("tokenGuard") || null;

    // 1) Protégé par mot de passe -> modale
    if (isPwdProtected(item.visibility)) {
      e?.preventDefault?.();
      const current = getStoredPassword(item.slug || item.id) || "";
      setPwdDefault(current);
      setPwdOpen(true);
      return;
    }

    // 2) Privé -> exige un token (sanctum)
    if (isPrivate(item.visibility)) {
      e?.preventDefault?.();
      if (!token) {
        // pas connecté : renvoyer vers page auth
        navigate("/auth");
        return;
      }
      // token présent -> laisser le contrôleur décider (permission articles.read_private)
      onOpenCard();
      return;
    }

    // 3) Public
    onOpenCard();
  }, [item.visibility, item.slug, item.id, onOpenCard, navigate]);

  // ✅ Soumission du mot de passe → on le stocke pour le Visualiseur
  const submitPwd = useCallback((pwd, remember) => {
    setStoredPassword(item.slug || item.id, pwd);
    setPwdOpen(false);
    onOpenCard();
  }, [item.slug, item.id, onOpenCard]);

  const impressionRef = useImpression(() => {
    window.dispatchEvent(new CustomEvent("gridcard:seen", { detail: { id: item.id } }));
  });

  const shareUrl = (item.url || (typeof window !== "undefined" ? `${window.location.origin}${to}` : to));

  // Ouverture manuelle de la modale mot de passe
  const openPwdManually = useCallback((e) => {
    e?.stopPropagation?.();
    const current = getStoredPassword(item.slug || item.id) || "";
    setPwdDefault(current);
    setPwdOpen(true);
  }, [item.slug, item.id]);

  return (
    <>
      <article
        ref={impressionRef}
        role="article"
        aria-labelledby={`t-${item.id}`}
        className={cardClass}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={item.title}
        data-testid={`gridcard-${item.id}`}
        style={{ minHeight: "550px" }}
      >
        {/* Fond gradient doux */}
        <div className={cls("absolute inset-0 opacity-0 group-hover:opacity-20 transition-all duration-700 bg-gradient-to-br", categoryColor)} />
        <div className={cls("absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r transition-all duration-500", topBarGradient)} />

        {/* --- Media --- */}
        <div className="relative h-64 bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center overflow-hidden">
          {imgUrl ? (
            <>
              <SmartImage
                src={imgUrl}
                alt={item.title}
                ratio="100%"
                className="transition-all duration-700 group-hover:scale-110 group-hover:brightness-110 group-hover:saturate-110"
              />

              {/* Overlay clair */}
              <div
                className={cls(
                  "absolute inset-0 bg-white/55 backdrop-blur-sm flex items-center justify-center gap-6 transition-all duration-500",
                  canHover() ? (isHovered ? "opacity-100" : "opacity-0 pointer-events-none") : "opacity-100"
                )}
                aria-hidden={canHover() ? !isHovered : false}
              >
                {/* Lire */}
                <Link
                  to={to}
                  onMouseEnter={prefetchDetail}
                  onClick={handleRead}
                  className={cls(overlayBtnClass, "hover:text-blue-600 hover:shadow-blue-200/50")}
                  title="Lire l'article"
                >
                  <FaEye size={24} />
                </Link>

                {/* Partage (icône) */}
                <div
                  className={cls(overlayBtnClass, "hover:text-purple-600 hover:shadow-purple-200/50")}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ShareButton
                    variant="icon"
                    title={item.title}
                    excerpt={item.excerpt}
                    url={shareUrl}
                    articleId={item.id}
                    channels={["email", "emailAuto", "facebook", "whatsapp", "whatsappNumber"]}
                    emailEndpoint="/share/email"
                    defaultWhatsNumber="33612345678"
                  />
                </div>

                {/* 🔒 Bouton pour rouvrir la modale mot de passe */}
                {isPwdProtected(item.visibility) && (
                  <button
                    className={cls(overlayBtnClass, "hover:text-rose-600 hover:shadow-rose-200/50")}
                    onClick={openPwdManually}
                    title="Entrer le mot de passe"
                  >
                    <FaLock size={22} />
                  </button>
                )}
              </div>
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

          {/* Badge Visibilité si != public */}
          {item.visibility && item.visibility !== "public" && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/95 border border-slate-200/70 text-slate-800 shadow-lg">
                {isPrivate(item.visibility) ? <FaLock /> : <FaLockOpen />}
                {humanizeVisibility(item.visibility)}
              </span>
            </div>
          )}

          {/* Bouton de partage ABSOLU */}
          <div className="absolute top-4 right-4 z-20" onClick={(e) => e.stopPropagation()}>
            <ShareButton
              variant="icon"
              className="p-2 rounded-2xl bg-white/95 text-slate-700 shadow-xl hover:scale-110 transition-transform"
              title={item.title}
              excerpt={item.excerpt}
              url={shareUrl}
              articleId={item.id}
              channels={["email", "emailAuto", "facebook", "whatsapp", "whatsappNumber"]}
              emailEndpoint="/share/email"
              defaultWhatsNumber="33612345678"
            />
          </div>

          {/* Coins : favoris / like */}
          <div className="absolute top-4 left-4 flex gap-2 z-20">
            <button
              aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
              aria-pressed={fav}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggleFav(e)}
              onClick={onToggleFav}
              className={cls(
                "p-3 rounded-2xl transition-all duration-500 shadow-xl backdrop-blur-md transform hover:scale-125 hover:-rotate-12",
                fav
                  ? "text-amber-500 bg-amber-50/90 hover:bg-amber-100/90 shadow-amber-200/50 scale-110"
                  : "text-slate-500 bg-white/90 hover:bg-white hover:text-amber-500 shadow-slate-200/50"
              )}
              title={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
              data-testid="btn-fav"
            >
              {fav ? <FaStar size={20} /> : <FaRegStar size={20} />}
            </button>

            <button
              aria-label={liked ? "Retirer des likes" : "Ajouter aux likes"}
              aria-pressed={liked}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggleLike(e)}
              onClick={onToggleLike}
              className={cls(
                "p-3 rounded-2xl transition-all duration-500 shadow-xl backdrop-blur-md transform hover:scale-125 hover:rotate-12",
                liked
                  ? "text-pink-500 bg-pink-50/90 hover:bg-pink-100/90 shadow-pink-200/50 scale-110"
                  : "text-slate-500 bg-white/90 hover:bg-white hover:text-pink-500 shadow-slate-200/50"
              )}
              title={liked ? "Retirer des likes" : "Ajouter aux likes"}
              data-testid="btn-like"
            >
              {liked ? <FaHeart size={20} /> : <FaRegHeart size={20} />}
            </button>
          </div>
        </div>

        {/* --- Contenu --- */}
        <div className="relative p-6 bg-gradient-to-b from-white/95 to-slate-50/95 backdrop-blur-md">
          <div className="flex gap-8">
            {/* Texte principal */}
            <div className="flex-1">
              <div className="mb-4">
                <h4 id={`t-${item.id}`} className="font-bold text-slate-900 text-xl leading-tight line-clamp-2 group-hover:text-slate-700 transition-colors mb-2" title={item.title}>
                  {item.title}
                </h4>

                {item.excerpt && <p className="text-slate-600 text-sm line-clamp-2 mb-3">{item.excerpt}</p>}

                <div className="flex items-center gap-3 mt-2">
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
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <Link
                  to={to}
                  onClick={handleRead}
                  onMouseEnter={prefetchDetail}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <FaEye size={14} />
                  <span>Lire</span>
                </Link>

                {/* Bouton pour rouvrir la modale mdp si besoin */}
                {/* {isPwdProtected(item.visibility) && (
                  <button
                    type="button"
                    onClick={openPwdManually}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300/70 text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm"
                    title="Entrer le mot de passe"
                  >
                    <FaLock size={14} />
                    <span>Mot de passe</span>
                  </button>
                )} */}

                {read && (
                  <div className="flex items-center gap-2 bg-emerald-100/80 rounded-full px-4 py-2">
                    <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-emerald-700 text-xs font-semibold">Lu</span>
                  </div>
                )}
              </div>
            </div>

            {/* Méta compacte */}
            <div className="w-44 space-y-3">
              <div className="space-y-2">
                {/* Auteur */}
                <div className="flex items-center gap-2 bg-slate-100/80 rounded-lg px-3 py-2">
                  <div className="p-1.5 bg-slate-200/80 rounded"><FaUser className="text-slate-600" size={12} /></div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-800 text-xs block truncate overflow-auto">{authorName}</span>
                    <p className="text-slate-600 text-xs overflow-auto">{item.author?.email || "Auteur"}</p>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-2 bg-slate-100/80 rounded-lg px-3 py-2">
                  <div className="p-1.5 bg-slate-200/80 rounded"><FaTag className="text-slate-600" size={12} /></div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-800 text-xs block truncate">{formattedDate}</span>
                    <p className="text-slate-600 text-xs">
                      {item.updated_at !== item.created_at ? "Mis à jour" : "Publié le"}
                    </p>
                  </div>
                </div>

                {/* Visibilité */}
                {item.visibility && item.visibility !== "public" && (
                  <div className={`flex items-center gap-2 ${isPrivate(item.visibility) ? "bg-rose-50 border border-rose-100" : "bg-blue-50 border border-blue-100"} rounded-lg px-3 py-2`}>
                    <div className={`p-1.5 rounded ${isPrivate(item.visibility) ? "bg-rose-100" : "bg-blue-100"}`}>
                      {isPrivate(item.visibility) ? <FaLock className="text-rose-700" size={12} /> : <FaLockOpen className="text-blue-700" size={12} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`font-semibold text-xs block truncate ${isPrivate(item.visibility) ? "text-rose-800" : "text-blue-800"}`}>
                        {humanizeVisibility(item.visibility)}
                      </span>
                      <p className={`${isPrivate(item.visibility) ? "text-rose-700" : "text-blue-700"} text-xs`}>Visibilité</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 px-6 pt-3 mb-4">
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
      </article>

      {/* ✅ Modal Password réutilisable */}
      <PasswordModal
        key={`pwd-${itemKey}`}
        open={pwdOpen}
        title={`Accès à « ${item.title} »`}
        onClose={() => setPwdOpen(false)}
        onSubmit={submitPwd}
        defaultValue={pwdDefault}
      />
    </>
  );
}
