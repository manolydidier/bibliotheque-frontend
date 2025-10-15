import {
  FaExternalLinkAlt,FaInfoCircle,
  FaLock
} from "react-icons/fa";
export default function SeoPanel({ article }) {
  // --- Helpers locaux ---
  const safeObj = (v) => {
    if (!v) return {};
    if (typeof v === "string") {
      try { const o = JSON.parse(v); return (o && typeof o === "object") ? o : {}; } catch { return {}; }
    }
    return (typeof v === "object") ? v : {};
  };
  const escapeHtml = (s = "") =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const siteBase =
    (import.meta.env.VITE_PUBLIC_SITE_URL || "").replace(/\/+$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const seo = safeObj(article?.seo_data);

  // Champs normalisés (avec fallbacks raisonnables)
  const metaTitle       = (seo.meta_title ?? article?.title ?? "").toString().trim();
  const metaDescription = (seo.meta_description ?? article?.excerpt ?? "").toString().trim();
  const canonical       = (seo.canonical_url && String(seo.canonical_url).trim())
    ? String(seo.canonical_url).trim()
    : (article?.slug ? `${siteBase}/articles/${encodeURIComponent(article.slug)}` : "");

  const robotsRaw   = safeObj(seo.robots);
  const robotsIndex = robotsRaw.index !== false;   // défaut => index
  const robotsFollow= robotsRaw.follow !== false;  // défaut => follow
  const robotsStr   = `${robotsIndex ? "index" : "noindex"}, ${robotsFollow ? "follow" : "nofollow"}`;

  // Scores simples (guidelines usuelles)
  const titleLen   = metaTitle.length;
  const descLen    = metaDescription.length;
  const titleOK    = titleLen >= 15 && titleLen <= 60;
  const descOK     = descLen >= 50 && descLen <= 160;

  const headPreview = [
    metaTitle        && `<title>${escapeHtml(metaTitle)}</title>`,
    metaDescription  && `<meta name="description" content="${escapeHtml(metaDescription)}" />`,
    canonical        && `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
                        `<meta name="robots" content="${robotsStr}" />`,
    // Bonus OG/Twitter basiques (facultatif mais utile)
    metaTitle        && `<meta property="og:title" content="${escapeHtml(metaTitle)}" />`,
    metaDescription  && `<meta property="og:description" content="${escapeHtml(metaDescription)}" />`,
    canonical        && `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
  ].filter(Boolean).join("\n");

  const Badge = ({ ok, text }) => (
    <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold
      ${ok ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"}`}>
      {text}
    </span>
  );

  return (
    <div className="w-full h-full overflow-auto space-y-6 lg:space-y-8">
      {/* Meta Title */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/40 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-slate-800 text-lg flex items-center">
            <span>Meta title</span>
            <Badge ok={titleOK} text={`${titleLen} caractères`} />
          </h4>
        </div>
        <p className="text-slate-700">{metaTitle || "—"}</p>
        {!titleOK && (
          <p className="mt-2 text-xs text-amber-600">
            Conseil : entre 15 et 60 caractères est idéal pour l’affichage.
          </p>
        )}
      </div>

      {/* Meta Description */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/40 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-slate-800 text-lg flex items-center">
            <span>Meta description</span>
            <Badge ok={descOK} text={`${descLen} caractères`} />
          </h4>
        </div>
        <p className="text-slate-700 break-words">{metaDescription || "—"}</p>
        {!descOK && (
          <p className="mt-2 text-xs text-amber-600">
            Conseil : visez ~155–160 caractères (≥50 pour éviter les snippets trop courts).
          </p>
        )}
      </div>

      {/* Canonical + Robots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/40 p-6 shadow-lg">
          <h4 className="font-medium text-slate-800 text-lg mb-3 flex items-center">
            Canonical
          </h4>
          <div className="text-slate-700 break-words">{canonical || "—"}</div>
          {canonical && (
            <a
              href={canonical}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center mt-3 text-sm text-blue-600 hover:underline"
              title="Ouvrir"
            >
              <span className="mr-2">Ouvrir</span>
              <FaExternalLinkAlt />
            </a>
          )}
          {!seo.canonical_url && canonical && (
            <p className="mt-2 text-xs text-slate-500">
              (Dérivé automatiquement via <code>VITE_PUBLIC_SITE_URL</code> + <code>/articles/{'{slug}'}</code>)
            </p>
          )}
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/40 p-6 shadow-lg">
          <h4 className="font-medium text-slate-800 text-lg mb-3 flex items-center">
            Robots
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold
              ${robotsIndex ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"}`}>
              {robotsIndex ? "index" : "noindex"}
            </span>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold
              ${robotsFollow ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"}`}>
              {robotsFollow ? "follow" : "nofollow"}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            <code>content</code> : <code>{robotsStr}</code>
          </p>
        </div>
      </div>

      {/* Prévisualisation des balises <head> */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/40 p-6 shadow-lg">
        <h4 className="font-medium text-slate-800 mb-3 flex items-center text-lg">
          <FaInfoCircle className="mr-3 text-blue-600" />
          Balises générées
        </h4>
        <pre className="text-xs bg-slate-50/80 p-6 rounded-xl border border-slate-200/50 overflow-auto text-slate-700">
{headPreview}
        </pre>
      </div>
    </div>
  );
}