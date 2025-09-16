// ------------------------------
// File: media-library/parts/GridCard.jsx
// Version "pastel light" + badges visibilité + popup password (avancé)
// ------------------------------
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaRegStar, FaStar, FaEye, FaUser,
  FaHeart, FaRegHeart, FaTag, FaLock, FaLockOpen, FaKey, FaTimes
} from "react-icons/fa";
import SmartImage from "./SmartImage";
import ShareButton from "../Visualiseur/share/ShareButton";
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
  const key  = slug || id || ''; // jamais "undefined"
  return `${base || VISUALISEUR_BASE}/${encodeURIComponent(key)}`;
};

// Préférences mouvement réduit (pour couper les grosses anims)
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Détection basique d'environnement "hoverable"
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
   Visibilité
========================= */
const isPrivate = (v) => String(v || "").toLowerCase() === "private";
const isPwdProtected = (v) => {
  const k = String(v || "").toLowerCase();
  return k === "password_protected" || k === "password-protected" || k === "password";
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
   Modal Password (avancé)
========================= */
function PasswordDialog({ open, title = "Mot de passe requis", onClose, onSubmit, defaultValue = "" }) {
  const [pwd, setPwd] = useState(defaultValue || "");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setError(""); setPwd(defaultValue || ""); }
  }, [open, defaultValue]);

  if (!open) return null;

  const submit = (e) => {
    e?.preventDefault?.();
    if (!pwd.trim()) {
      setError("Veuillez saisir un mot de passe.");
      return;
    }
    onSubmit?.(pwd.trim(), remember);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-[92vw] max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-6 animate-[fadeIn_.2s_ease-out]"
      >
        <button
          className="absolute top-3 right-3 p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 transition"
          onClick={onClose}
          aria-label="Fermer"
        >
          <FaTimes />
        </button>

        <div className="mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
              <FaKey />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-500">Cet article est protégé. Entrez le mot de passe pour continuer.</p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="pwd-input" className="text-sm font-medium text-slate-700">Mot de passe</label>
            <input
              id="pwd-input"
              type="password"
              className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-300/70 bg-white/90 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
              placeholder="••••••••"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoFocus
            />
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-600 select-none cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Mémoriser pendant la session
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300/70 text-slate-700 bg-white hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg transition"
            >
              Continuer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================
   Composant
========================= */

export default function GridCard({ item, routeBase, onOpen }) {
  const navigate = useNavigate();

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
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdDefault, setPwdDefault] = useState("");

  /* --------- Dérivés visuels --------- */
  const primaryCategory = getCategoryFromTitle(item.title);
  const categoryColor = CATEGORY_COLORS[primaryCategory] || CATEGORY_COLORS.default;
  const borderColor = CATEGORY_BORDER_COLORS[primaryCategory] || CATEGORY_BORDER_COLORS.default;
  const topBarGradient = useMemo(
    () => categoryColor.replace("/20", "/60").replace("/30", "/80"),
    [categoryColor]
  );

  /* --------- Dérivés métier --------- */

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

  // Formats
  const nf = useMemo(
    () => new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }),
    []
  );
  const df = useMemo(
    () => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }),
    []
  );

  // Temps de lecture : API > estimation (200 wpm)
  const readingTime = useMemo(() => {
    if (item.reading_time) return item.reading_time;
    const wc = item.word_count ?? (typeof item.content === "string" ? item.content.trim().split(/\s+/).length : 0);
    return Math.max(1, Math.round(wc / 200));
  }, [item.reading_time, item.word_count, item.content]);

  // Image
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

  /* --------- Classes réutilisées --------- */
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

  // Prefetch (route + image HD)
  const prefetchDetail = useCallback(() => {
    if (imgUrl) { const im = new Image(); im.src = imgUrl; }
    try {
      const l = document.createElement("link");
      l.rel = "prefetch";
      l.href = to;
      document.head.appendChild(l);
    } catch {}
  }, [imgUrl, to]);

  // Lecture : si protégé, ouvrir la modale ; sinon naviguer directement
  const handleRead = useCallback((e) => {
    if (isPwdProtected(item.visibility)) {
      e?.preventDefault?.();
      // Pré-remplir avec un éventuel mot déjà saisi en session
      const key = `article_pwd_${item.slug || item.id}`;
      let current = "";
      try { current = sessionStorage.getItem(key) || ""; } catch {}
      setPwdDefault(current);
      setPwdOpen(true);
      return;
    }
    onOpenCard();
  }, [item.visibility, item.slug, item.id, onOpenCard]);

  // Soumission du mot de passe depuis la modale
  const submitPwd = useCallback((pwd, remember) => {
    const key = `article_pwd_${item.slug || item.id}`;
    try {
      // on mémorise le mot de passe pendant la session (toujours en sessionStorage ici)
      sessionStorage.setItem(key, pwd);
    } catch {}
    setPwdOpen(false);
    onOpenCard();
    navigate(to);
  }, [item.slug, item.id, to, navigate, onOpenCard]);

  /* --------- Impression tracker --------- */
  const impressionRef = useImpression(() => {
    window.dispatchEvent(new CustomEvent("gridcard:seen", { detail: { id: item.id } }));
  });

  /* --------- Share --------- */
  const shareUrl = (item.url || (typeof window !== "undefined" ? `${window.location.origin}${to}` : to));

  /* --------- Render --------- */
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

              {/* Badges de confidentialité sur l'image */}
              {(isPrivate(item.visibility) || isPwdProtected(item.visibility)) && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/95 border border-slate-200/70 text-slate-800 shadow-lg">
                    {isPrivate(item.visibility) ? <FaLock /> : <FaKey />}
                    {visLabel}
                  </span>
                </div>
              )}

              {/* Overlay CLAIR */}
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
                  className={cls(overlayBtnClass, "hover:text-blue-600 hover:shadow-blue-200/50", isHovered ? "translate-y-0 opacity-100 rotate-0" : "translate-y-8 opacity-100 rotate-0")}
                  style={{ transitionDelay: "0ms" }}
                  title="Lire l'article"
                >
                  <FaEye size={24} />
                </Link>

                {/* Partage (icône) */}
                <div
                  className={cls(overlayBtnClass, "hover:text-purple-600 hover:shadow-purple-200/50", isHovered ? "translate-y-0 opacity-100 rotate-0" : "translate-y-8 opacity-100 rotate-0")}
                  style={{ transitionDelay: "200ms" }}
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

          {/* Badges "À la une" / "Épinglé" */}
          <div className="absolute bottom-4 right-4 flex gap-2 z-10">
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
              <div className="flex items-center gap-3 mt-4">
                <Link
                  to={to}
                  onClick={handleRead}
                  onMouseEnter={prefetchDetail}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <FaEye size={14} />
                  <span>Lire</span>
                </Link>
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
                  <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                    <div className="p-1.5 bg-blue-100 rounded">
                      {isPwdProtected(item.visibility) ? <FaKey className="text-blue-700" size={12} /> : <FaLockOpen className="text-blue-700" size={12} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-blue-800 text-xs block truncate">
                        {visLabel}
                      </span>
                      <p className="text-blue-700 text-xs">Visibilité</p>
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

        {/* Divers */}
        <div className="flex p-6 w-full items-center gap-1 text-slate-500 pt-2 border-t border-slate-200/50 text-xs">
          {item.word_count && <span>{item.word_count} mots</span>}
          {item.word_count && item.categories?.length > 0 && <span>•</span>}
          {item.categories?.length > 0 && (
            <span>
              {item.categories.length} catégorie{item.categories.length > 1 ? "s" : ""}
            </span>
          )}
          {readingTime ? <><span>•</span><span>{readingTime} min</span></> : null}
        </div>

        {/* Décor lumineux subtil */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-white/30 to-transparent" />
          <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-white/30 to-transparent" />
        </div>
      </article>

      {/* Popup mot de passe */}
      <PasswordDialog
        open={pwdOpen}
        title={`Accès à « ${item.title} »`}
        onClose={() => setPwdOpen(false)}
        onSubmit={submitPwd}
        defaultValue={pwdDefault}
      />
    </>
  );
}
