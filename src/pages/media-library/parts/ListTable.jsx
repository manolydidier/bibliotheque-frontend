// ------------------------------
// File: media-library/parts/ListTable.jsx
// Tableau list view — compat Laravel API
// + Partage intégré via ShareButton (bouton icône)
// + Améliorations: teinte de fond par couleur de catégorie (discrète)
//   & affichage de l'icône de la catégorie
// + NEW: respecte le toggle global "Couleur des cards" (FiltersPanel)
// ------------------------------
import { useMemo, useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Link } from "react-router-dom";
import {
  FaRegStar, FaStar, FaEye, FaThumbsUp, FaCalendarAlt, FaUser,
  FaLock, FaLockOpen
} from "react-icons/fa";
import { SortIcon } from "../shared/atoms/atoms";
import { isFav, toggleFav, isRead, markRead } from "../shared/store/markers";
import ShareButton from "../Visualiseur/share/ShareButton";
import { cls } from "../shared/utils/format";

// NEW: FontAwesome (solide) pour les icônes de catégories
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar as faFaStar, faBook, faLeaf, faHeart as faFaHeart, faCoffee, faCamera,
  faGlobe, faMusic, faPen, faFilm, faFolder, faCode, faChartPie,
  faBriefcase, faCar, faLaptop, faGamepad, faShoppingCart,
  faBicycle, faPlane, faTree, faUserFriends, faHandshake,
  faBell, faFlag, faTools, faLightbulb, faMicrochip, faCloud, faGift
} from "@fortawesome/free-solid-svg-icons";

/* --------------------------------
   Helpers URL visualiseur
---------------------------------- */
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

/* --------------------------------
   Helpers de visibilité
---------------------------------- */
const isPrivate = (v) => String(v || "").toLowerCase() === "private";
const isPwdProtected = (v) => {
  if (v === true || v === 1 || v === 2) return true;
  const k = String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ["password_protected", "password", "protected", "protected_by_password"].includes(k);
};

const humanizeVisibility = (v, t) => {
  const k = String(v || "").toLowerCase();
  if (k === "public") return t('listtable.visibility.public');
  if (isPrivate(k)) return t('listtable.visibility.private');
  if (isPwdProtected(k)) return t('listtable.visibility.passwordProtected');
  return v || t('listtable.visibility.unknown');
};

/* --------------------------------
   Tri - cellule d'en-tête
---------------------------------- */
const TableHeaderCell = ({ label, sortKey, sort, setSort }) => {
  const state = useMemo(() => sort.find((s) => s.key === sortKey)?.dir, [sort, sortKey]);
  const toggle = () => {
    setSort((cur) => {
      const idx = cur.findIndex((s) => s.key === sortKey);
      if (idx === -1) return [{ key: sortKey, dir: "asc" }];
      const copy = [...cur];
      const curDir = copy[idx].dir;
      const nextDir = curDir === "asc" ? "desc" : curDir === "desc" ? null : "asc";
      if (!nextDir) return copy.filter((_, i) => i !== idx);
      copy[idx] = { key: sortKey, dir: nextDir };
      return copy;
    });
  };
  return (
    <th
      scope="col"
      className="px-3 py-2 text-left text-xs font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100/50"
      onClick={toggle}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon state={state} />
      </div>
    </th>
  );
};

/* --------------------------------
   NEW: mapping icônes & helpers couleurs
---------------------------------- */
const ICON_MAP = {
  "fa-star": faFaStar, "fa-book": faBook, "fa-leaf": faLeaf, "fa-heart": faFaHeart,
  "fa-coffee": faCoffee, "fa-camera": faCamera, "fa-globe": faGlobe,
  "fa-music": faMusic, "fa-pen": faPen, "fa-film": faFilm, "fa-folder": faFolder,
  "fa-code": faCode, "fa-chart-pie": faChartPie, "fa-briefcase": faBriefcase,
  "fa-car": faCar, "fa-laptop": faLaptop, "fa-gamepad": faGamepad,
  "fa-shopping-cart": faShoppingCart, "fa-bicycle": faBicycle, "fa-plane": faPlane,
  "fa-tree": faTree, "fa-user-friends": faUserFriends, "fa-handshake": faHandshake,
  "fa-bell": faBell, "fa-flag": faFlag, "fa-tools": faTools,
  "fa-lightbulb": faLightbulb, "fa-microchip": faMicrochip, "fa-cloud": faCloud,
  "fa-gift": faGift,
};

function hexToRgb(hex) {
  if (!hex) return { r: 100, g: 116, b: 139 }; // slate-500 fallback
  const m = hex.trim().replace('#','');
  const n = m.length === 3 ? m.split('').map(x => x + x).join('') : m.padEnd(6, '0').slice(0,6);
  const r = parseInt(n.slice(0,2), 16);
  const g = parseInt(n.slice(2,4), 16);
  const b = parseInt(n.slice(4,6), 16);
  return { r, g, b };
}
function rgba(hex, a = 1) {
  const { r, g, b } = hexToRgb(hex || '#64748b');
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Déduit la couleur/icone/label de catégorie depuis:
 *  1) article.categories[] (priorité pivot.is_primary === 1)
 *  2) fallback heuristique à partir du titre
 */
function deriveCategoryMeta(article, t) {
  let cat = null;
  if (Array.isArray(article?.categories) && article.categories.length) {
    cat = article.categories.find(c => c?.pivot?.is_primary === 1) || article.categories[0];
  }

  const name =
    cat?.name ||
    getCategoryFromTitle(article?.title, t);

  const color = cat?.color || "#64748b";
  const iconKey = cat?.icon || "fa-folder";

  return { name, color, iconKey };
}

// fallback sémantique si pas de catégorie reliée
function getCategoryFromTitle(title, t) {
  const titleLower = (title || '').toLowerCase();
  if (titleLower.includes('intelligence artificielle') || titleLower.includes('ia')) return t('listtable.categories.ai');
  if (titleLower.includes('startup')) return t('listtable.categories.startup');
  if (titleLower.includes('développement') || titleLower.includes('web')) return t('listtable.categories.webdev');
  if (titleLower.includes('marketing')) return t('listtable.categories.business');
  if (titleLower.includes('technologie')) return t('listtable.categories.mobile');
  return t('listtable.categories.article');
}

// 🔗 même clé & évènement que GridCard / FiltersPanel
const COLOR_PREF_KEY = "gridcard-color-enabled";

export default function ListTable({ rows, sort, setSort, routeBase }) {
  const { t, i18n } = useTranslation();

  // 🌈 État global "couleur activée" synchronisé avec FiltersPanel
  const [colorEnabled, setColorEnabled] = useState(() => {
    try {
      const raw = localStorage.getItem(COLOR_PREF_KEY);
      return raw == null ? true : JSON.parse(raw);
    } catch { return true; }
  });
  useEffect(() => {
    const handler = (e) => {
      const enabled = e?.detail?.enabled;
      if (typeof enabled === "boolean") setColorEnabled(enabled);
    };
    window.addEventListener("gridcard:colorpref", handler);
    return () => window.removeEventListener("gridcard:colorpref", handler);
  }, []);

  const nf = useMemo(() => new Intl.NumberFormat(i18n.language, {
    notation: "compact",
    maximumFractionDigits: 1
  }), [i18n.language]);

  const df = useMemo(() => new Intl.DateTimeFormat(i18n.language, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }), [i18n.language]);

  const tf = useMemo(() => new Intl.DateTimeFormat(i18n.language, {
    hour: '2-digit',
    minute: '2-digit'
  }), [i18n.language]);

  return (
    <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
          <tr>
            <th className="px-3 py-3 text-xs font-medium text-slate-600">{t('listtable.headers.image')}</th>
            <TableHeaderCell label={t('listtable.headers.title')} sortKey="title" sort={sort} setSort={setSort} />
            <TableHeaderCell label={t('listtable.headers.author')} sortKey="author_id" sort={sort} setSort={setSort} />
            <TableHeaderCell label={t('listtable.headers.category')} sortKey="title" sort={sort} setSort={setSort} />
            <TableHeaderCell label={t('listtable.headers.published')} sortKey="published_at" sort={sort} setSort={setSort} />
            <TableHeaderCell label={t('listtable.headers.views')} sortKey="view_count" sort={sort} setSort={setSort} />
            <TableHeaderCell label={t('listtable.headers.rating')} sortKey="rating_average" sort={sort} setSort={setSort} />
            <TableHeaderCell label={t('listtable.headers.status')} sortKey="status" sort={sort} setSort={setSort} />
            <th className="px-3 py-3 text-xs font-medium text-slate-600">{t('listtable.headers.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((article) => {
            const fav = isFav(article.id);
            const read = isRead(article.id);
            const to = buildVisualiserPath(routeBase, article);

            // Cat meta from API (color/icon/name) with graceful fallback
            const { name: categoryName, color: toneFromCat, iconKey } = deriveCategoryMeta(article, t);
            const FA_ICON = ICON_MAP[iconKey] || faFolder;

            // ✅ Applique le toggle global (neutre si désactivé)
            const tone = colorEnabled ? toneFromCat : "#64748b";

            // Teintes discrètes par ligne (fond dominant très léger + hover)
            const rowBgBase  = rgba(tone, 0.05);
            const rowBgHover = rgba(tone, 0.10);
            const chipBg     = rgba(tone, 0.14);
            const chipBdr    = rgba(tone, 0.24);

            const formattedViewCount = nf.format(article.view_count || 0);
            const formattedRating = article.rating_average
              ? parseFloat(article.rating_average).toFixed(1)
              : '0.0';

            const publishedAt = article.published_at ? new Date(article.published_at) : null;
            const formattedDate = publishedAt ? df.format(publishedAt) : '—';
            const formattedTime = publishedAt ? tf.format(publishedAt) : '—';

            const shareUrl = (article.url || (typeof window !== "undefined" ? `${window.location.origin}${to}` : to));

            const authorName = article.author_name ||
              (article.author ? `${article.author.first_name || ''} ${article.author.last_name || ''}`.trim() : '') ||
              `Auteur #${article.author_id}`;

            const visLabel = humanizeVisibility(article.visibility, t);

            return (
              <tr
                key={article.id}
                className="transition-colors duration-200 group"
                style={{
                  background: `linear-gradient(180deg, ${rowBgBase} 0%, rgba(255,255,255,0.96) 65%)`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `linear-gradient(180deg, ${rowBgHover} 0%, rgba(255,255,255,0.98) 65%)`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = `linear-gradient(180deg, ${rowBgBase} 0%, rgba(255,255,255,0.96) 65%)`; }}
              >
                <td className="px-3 py-4">
                  {article.featured_image_url ? (
                    <img
                      src={article.featured_image_url}
                      alt="thumb"
                      className="w-12 h-12 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow duration-200"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-200"
                      style={{
                        background: `linear-gradient(135deg, ${rgba(tone, 0.10)} 0%, ${rgba(tone, 0.20)} 100%)`
                      }}
                    >
                      📝
                    </div>
                  )}
                </td>

                <td className="px-3 py-4">
                  <div className="flex items-center gap-2">
                    {!read && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" title={t('listtable.status.unread')} />}
                    <div className="min-w-0 flex-1">
                      <Link
                        to={to}
                        className="font-semibold text-slate-900 hover:text-blue-600 transition-colors duration-200 block truncate"
                        onClick={() => markRead(article.id)}
                        title={article.title}
                      >
                        {article.title}
                      </Link>
                      <div className="text-xs text-slate-500 truncate max-w-[400px] mt-1">
                        {article.excerpt}
                      </div>
                      <div className="flex gap-1 mt-2">
                        {article.is_featured && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⭐ {t('listtable.badges.featured')}
                          </span>
                        )}
                        {article.is_sticky && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            📌 {t('listtable.badges.sticky')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                      <FaUser className="text-slate-500" size={12} />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{authorName}</div>
                      <div className="text-xs text-slate-500">ID: {article.author_id}</div>
                    </div>
                  </div>
                </td>

                {/* Catégorie avec icône + teinte (respecte toggle global) */}
                <td className="px-3 py-4 text-sm">
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200"
                    title={categoryName}
                    style={{
                      backgroundColor: chipBg,
                      border: `1px solid ${chipBdr}`,
                      color: '#0f172a'
                    }}
                  >
                    {/* Icône FontAwesome de la catégorie */}
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded-md mr-1.5"
                      style={{ backgroundColor: rgba(tone, 0.18), border: `1px solid ${rgba(tone, 0.28)}` }}
                    >
                      <FontAwesomeIcon icon={FA_ICON} className="text-[11px]" style={{ color: tone }} />
                    </span>
                    {categoryName}
                  </span>
                </td>

                <td className="px-3 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-slate-400" size={12} />
                    <div>
                      <div className="font-medium text-slate-900">{formattedDate}</div>
                      <div className="text-xs text-slate-500">
                        {formattedTime}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FaEye className="text-blue-600" size={12} />
                    </div>
                    <div>
                      <div className="font-bold text-blue-700">{formattedViewCount}</div>
                      <div className="text-xs text-slate-500">{t('listtable.stats.views')}</div>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <FaThumbsUp className="text-amber-600" size={12} />
                    </div>
                    <div>
                      <div className="font-bold text-amber-700">{formattedRating}/5</div>
                      <div className="text-xs text-slate-500">
                        {article.rating_count || 0} {t('listtable.stats.reviews')}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cls(
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                        article.status === 'published' 
                          ? 'bg-green-100 text-green-800' 
                          : article.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      )}>
                        {article.status === 'published' ? `✅ ${t('listtable.status.published')}` : 
                         article.status === 'draft' ? `📝 ${t('listtable.status.draft')}` :
                         `📄 ${article.status}`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {article.is_featured && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">
                          ⭐ {t('listtable.badges.featured')}
                        </span>
                      )}
                      {article.is_sticky && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                          📌 {t('listtable.badges.sticky')}
                        </span>
                      )}
                      {article.visibility !== 'public' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">
                          {isPrivate(article.visibility) ? <FaLock size={10} /> : <FaLockOpen size={10} />}{' '}
                          {visLabel}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {t('listtable.date.created')} {new Date(article.created_at).toLocaleDateString(i18n.language)}
                    </div>
                  </div>
                </td>

                <td className="px-3 py-4 text-right">
                  <div className="flex items-center gap-1 justify-end">
                    {/* Favori */}
                    <button
                      className={cls(
                        "p-2 rounded-lg border transition-all duration-200 hover:scale-105",
                        fav ? 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100'
                            : 'text-slate-400 bg-white border-slate-200 hover:text-amber-500 hover:border-amber-300'
                      )}
                      onClick={() => toggleFav(article.id)}
                      title={fav ? t('listtable.actions.removeFavorite') : t('listtable.actions.addFavorite')}
                    >
                      {fav ? <FaStar size={14} /> : <FaRegStar size={14} />}
                    </button>

                    {/* Ouvrir */}
                    <Link
                      to={to}
                      className="p-2 rounded-lg border text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:scale-105 transition-all duration-200 inline-flex items-center justify-center"
                      onClick={() => markRead(article.id)}
                      title={t('listtable.actions.read')}
                    >
                      <FaEye size={14} />
                    </Link>

                    {/* Partage (icône) */}
                    <ShareButton
                      variant="icon"
                      className="p-2 rounded-lg border text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100 hover:scale-105 transition-all duration-200"
                      title={article.title}
                      excerpt={article.excerpt}
                      url={shareUrl}
                      articleId={article.id}
                      channels={["email", "emailAuto", "facebook", "whatsapp", "whatsappNumber"]}
                      emailEndpoint="/share/email"
                      defaultWhatsNumber="33612345678"
                      titleAttr={t('listtable.actions.share')}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <div className="text-6xl mb-4">📝</div>
          <div className="text-lg font-medium mb-2">{t('listtable.empty.title')}</div>
          <div className="text-sm">{t('listtable.empty.subtitle')}</div>
        </div>
      )}
    </div>
  );
}
