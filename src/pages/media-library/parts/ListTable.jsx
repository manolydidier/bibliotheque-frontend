// ------------------------------
// File: media-library/parts/ListTable.jsx
// Tableau list view — compat Laravel API
// + Partage via ShareButton (bouton icône)
// + Teinte de fond par couleur de catégorie (discrète)
// + Respecte le toggle global "Couleur des cards" (FiltersPanel)
// + Responsive Columns: auto par largeur, ou "Custom"
// + Title & Actions toujours visibles (non masquables)
// ------------------------------
import { useMemo, useState, useEffect, useRef } from "react";
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

// FontAwesome (solide) pour icônes de catégories
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
   Icônes & couleurs
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

/** Catégorie (API + fallback) */
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

function getCategoryFromTitle(title, t) {
  const titleLower = (title || '').toLowerCase();
  if (titleLower.includes('intelligence artificielle') || titleLower.includes('ia')) return t('listtable.categories.ai');
  if (titleLower.includes('startup')) return t('listtable.categories.startup');
  if (titleLower.includes('développement') || titleLower.includes('web')) return t('listtable.categories.webdev');
  if (titleLower.includes('marketing')) return t('listtable.categories.business');
  if (titleLower.includes('technologie')) return t('listtable.categories.mobile');
  return t('listtable.categories.article');
}

/* --------------------------------
   Responsive columns
---------------------------------- */
const COLOR_PREF_KEY = "gridcard-color-enabled";
const VISIBLE_COLS_STORAGE = "listtable-visible-cols";
const MODE_STORAGE = "listtable-cols-mode"; // "auto" | "custom"
const MANDATORY_COLS = new Set(["title", "actions"]);

/** Ordre logique global des colonnes */
const COLS = [
  { key: "image"     },
  { key: "title"     },
  { key: "author"    },
  { key: "category"  },
  { key: "published" },
  { key: "views"     },
  { key: "rating"    },
  { key: "status"    },
  { key: "actions"   },
];

/** Matrice automatique selon largeur :
 * <640px     → title, actions
 * 640–767px  → + published
 * 768–1023px → + category, views
 * ≥1024px    → toutes
 */
function autoColsByWidth(w) {
  if (w < 640)  return new Set(["title", "actions"]);
  if (w < 768)  return new Set(["title", "published", "actions"]);
  if (w < 1024) return new Set(["title", "published", "category", "views", "actions"]);
  return new Set(COLS.map(c => c.key));
}

/* --------------------------------
   Composant principal
---------------------------------- */
export default function ListTable({ rows, sort, setSort, routeBase }) {
  const { t, i18n } = useTranslation();
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1024);

  // Observe la largeur pour recalculer l'auto
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !window.ResizeObserver) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries?.[0]?.contentRect?.width || el.clientWidth || 1024;
      setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  // i18n formatters
  const nf = useMemo(() => new Intl.NumberFormat(i18n.language, {
    notation: "compact",
    maximumFractionDigits: 1
  }), [i18n.language]);
  const df = useMemo(() => new Intl.DateTimeFormat(i18n.language, {
    day: "2-digit", month: "2-digit", year: "numeric"
  }), [i18n.language]);
  const tf = useMemo(() => new Intl.DateTimeFormat(i18n.language, {
    hour: '2-digit', minute: '2-digit'
  }), [i18n.language]);

  // Mode colonnes: auto/custom + sélection custom
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(MODE_STORAGE) || "auto"; } catch { return "auto"; }
  });
  const [userCols, setUserCols] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(VISIBLE_COLS_STORAGE) || "[]");
      return new Set(Array.isArray(raw) ? raw : []);
    } catch { return new Set(); }
  });

  // Colonnes visibles calculées
  const autoCols = useMemo(() => autoColsByWidth(containerWidth), [containerWidth]);
  const visibleCols = useMemo(() => {
    const base = mode === "auto" ? new Set(autoCols) : new Set(userCols.size ? userCols : autoCols);
    // impose Title & Actions
    MANDATORY_COLS.forEach(k => base.add(k));
    return base;
  }, [mode, autoCols, userCols]);

  const isVisible = (key) => visibleCols.has(key);

  const toggleUserCol = (k) => {
    // Jamais masquer les obligatoires
    if (MANDATORY_COLS.has(k)) return;
    setUserCols((prev) => {
      const start = new Set(prev);
      if (start.has(k)) start.delete(k); else start.add(k);
      // Réimpose obligatoires
      MANDATORY_COLS.forEach(m => start.add(m));
      try { localStorage.setItem(VISIBLE_COLS_STORAGE, JSON.stringify([...start])); } catch {}
      // Si l'utilisateur commence à jouer, on bascule en mode "custom"
      if (mode !== "custom") {
        setMode("custom");
        try { localStorage.setItem(MODE_STORAGE, "custom"); } catch {}
      }
      return start;
    });
  };

  const resetToAuto = () => {
    setMode("auto");
    try { localStorage.setItem(MODE_STORAGE, "auto"); } catch {}
  };

  // UI : menu colonnes (simple, inline)
  const [openColsMenu, setOpenColsMenu] = useState(false);

  return (
    <div ref={containerRef} className="rounded-xl border bg-white shadow-sm overflow-hidden">
      {/* Toolbar colonne */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50">
        <div className="text-xs text-slate-500/0">
          {t('listtable.responsive.width')}:{" "}
          <span className="font-medium">{Math.round(containerWidth)}px</span>{" "}
          — {mode === "auto"
            ? (t('listtable.columns.auto') || "Auto (by width)")
            : (t('listtable.columns.custom') || "Custom selection")}
        </div>
        <div className="relative">
          <button
            className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-sm hover:bg-slate-100"
            onClick={() => setOpenColsMenu(v => !v)}
          >
            {t('listtable.columns.button')}
          </button>
          {openColsMenu && (
            <div className="absolute right-0 mt-2 w-60 rounded-lg border border-slate-200 bg-white shadow-lg z-20">
              <div className="p-2 border-b">
                <div className="flex gap-2">
                  <button
                    className={cls(
                      "flex-1 h-8 rounded-md text-sm border",
                      mode === "auto"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200"
                    )}
                    onClick={resetToAuto}
                  >
                    {t('listtable.columns.auto')}
                  </button>
                  <button
                    className={cls(
                      "flex-1 h-8 rounded-md text-sm border",
                      mode === "custom"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200"
                    )}
                    onClick={() => {
                      setMode("custom");
                      try { localStorage.setItem(MODE_STORAGE, "custom"); } catch {}
                    }}
                  >
                    {t('listtable.columns.custom')}
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-auto p-2 space-y-1">
                {COLS.map((c) => (
                  <label
                    key={c.key}
                    className={cls(
                      "flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-slate-50 text-sm",
                      MANDATORY_COLS.has(c.key) ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                    )}
                  >
                    <span className="capitalize">{t(`listtable.headers.${c.key}`) || c.key}</span>
                    <input
                      type="checkbox"
                      checked={isVisible(c.key)}
                      onChange={() => toggleUserCol(c.key)}
                      disabled={MANDATORY_COLS.has(c.key)}
                      title={MANDATORY_COLS.has(c.key) ? (t('listtable.columns.alwaysOn') || 'Always visible') : ''}
                    />
                  </label>
                ))}
              </div>
              <div className="p-2 border-t">
                <button
                  className="w-full h-8 rounded-md text-sm border bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  onClick={resetToAuto}
                >
                  {t('listtable.columns.reset')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              {isVisible("image")     && <th className="px-3 py-3 text-xs font-medium text-slate-600">{t('listtable.headers.image')}</th>}
              {isVisible("title")     && <TableHeaderCell label={t('listtable.headers.title')}     sortKey="title"         sort={sort} setSort={setSort} />}
              {isVisible("author")    && <TableHeaderCell label={t('listtable.headers.author')}    sortKey="author_id"     sort={sort} setSort={setSort} />}
              {isVisible("category")  && <TableHeaderCell label={t('listtable.headers.category')}  sortKey="title"         sort={sort} setSort={setSort} />}
              {isVisible("published") && <TableHeaderCell label={t('listtable.headers.published')} sortKey="published_at"  sort={sort} setSort={setSort} />}
              {isVisible("views")     && <TableHeaderCell label={t('listtable.headers.views')}     sortKey="view_count"    sort={sort} setSort={setSort} />}
              {isVisible("rating")    && <TableHeaderCell label={t('listtable.headers.rating')}    sortKey="rating_average"sort={sort} setSort={setSort} />}
              {isVisible("status")    && <TableHeaderCell label={t('listtable.headers.status')}    sortKey="status"        sort={sort} setSort={setSort} />}
              {isVisible("actions")   && <th className="px-3 py-3 text-xs font-medium text-slate-600">{t('listtable.headers.actions')}</th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((article) => {
              const fav = isFav(article.id);
              const read = isRead(article.id);
              const to = buildVisualiserPath(routeBase, article);

              const { name: categoryName, color: toneFromCat, iconKey } = deriveCategoryMeta(article, t);
              const FA_ICON = ICON_MAP[iconKey] || faFolder;

              const tone = colorEnabled ? toneFromCat : "#64748b";
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
                  style={{ background: `linear-gradient(180deg, ${rowBgBase} 0%, rgba(255,255,255,0.96) 65%)` }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `linear-gradient(180deg, ${rowBgHover} 0%, rgba(255,255,255,0.98) 65%)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `linear-gradient(180deg, ${rowBgBase} 0%, rgba(255,255,255,0.96) 65%)`;
                  }}
                >
                  {isVisible("image") && (
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
                          style={{ background: `linear-gradient(135deg, ${rgba(tone, 0.10)} 0%, ${rgba(tone, 0.20)} 100%)` }}
                        >
                          📝
                        </div>
                      )}
                    </td>
                  )}

                  {isVisible("title") && (
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        {!read && (
                          <span
                            className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                            title={t('listtable.status.unread')}
                          />
                        )}
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
                  )}

                  {isVisible("author") && (
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
                  )}

                  {isVisible("category") && (
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
                        <span
                          className="inline-flex items-center justify-center w-5 h-5 rounded-md mr-1.5"
                          style={{
                            backgroundColor: rgba(tone, 0.18),
                            border: `1px solid ${rgba(tone, 0.28)}`
                          }}
                        >
                          <FontAwesomeIcon
                            icon={FA_ICON}
                            className="text-[11px]"
                            style={{ color: tone }}
                          />
                        </span>
                        {categoryName}
                      </span>
                    </td>
                  )}

                  {isVisible("published") && (
                    <td className="px-3 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <FaCalendarAlt className="text-slate-400" size={12} />
                        <div>
                          <div className="font-medium text-slate-900">{formattedDate}</div>
                          <div className="text-xs text-slate-500">{formattedTime}</div>
                        </div>
                      </div>
                    </td>
                  )}

                  {isVisible("views") && (
                    <td className="px-3 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          <FaEye className="text-slate-600" size={12} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{formattedViewCount}</div>
                          <div className="text-xs text-slate-500">
                            {t('listtable.stats.views')}
                          </div>
                        </div>
                      </div>
                    </td>
                  )}

                  {isVisible("rating") && (
                    <td className="px-3 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                          <FaThumbsUp className="text-orange-600" size={12} />
                        </div>
                        <div>
                          <div className="font-bold text-orange-700">
                            {formattedRating}/5
                          </div>
                          <div className="text-xs text-slate-500">
                            {article.rating_count || 0} {t('listtable.stats.reviews')}
                          </div>
                        </div>
                      </div>
                    </td>
                  )}

                  {isVisible("status") && (
                    <td className="px-3 py-4 text-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cls(
                              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                              article.status === 'published'
                                ? 'bg-green-100 text-green-800'
                                : article.status === 'draft'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-slate-100 text-slate-800'
                            )}
                          >
                            {article.status === 'published'
                              ? `✅ ${t('listtable.status.published')}`
                              : article.status === 'draft'
                              ? `📝 ${t('listtable.status.draft')}`
                              : `📄 ${article.status}`}
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
                              {isPrivate(article.visibility)
                                ? <FaLock size={10} />
                                : <FaLockOpen size={10} />
                              }{" "}
                              {visLabel}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {t('listtable.date.created')}{" "}
                          {new Date(article.created_at).toLocaleDateString(i18n.language)}
                        </div>
                      </div>
                    </td>
                  )}

                  {isVisible("actions") && (
                    <td className="px-3 py-4 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {/* Favori */}
                        <button
                          className={cls(
                            "p-2 rounded-lg border transition-all duration-200 hover:scale-105",
                            fav
                              ? 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100'
                              : 'text-slate-400 bg-white border-slate-200 hover:text-amber-500 hover:border-amber-300'
                          )}
                          onClick={() => toggleFav(article.id)}
                          title={
                            fav
                              ? t('listtable.actions.removeFavorite')
                              : t('listtable.actions.addFavorite')
                          }
                        >
                          {fav ? <FaStar size={14} /> : <FaRegStar size={14} />}
                        </button>

                        {/* Ouvrir */}
                        <Link
                          to={to}
                          className="p-2 rounded-lg border text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:scale-105 transition-all duration-200 inline-flex items-center justify-center"
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
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <div className="text-6xl mb-4">📝</div>
          <div className="text-lg font-medium mb-2">
            {t('listtable.empty.title')}
          </div>
          <div className="text-sm">
            {t('listtable.empty.subtitle')}
          </div>
        </div>
      )}
    </div>
  );
}
