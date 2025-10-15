import {
  FaExternalLinkAlt,
  FaInfoCircle,
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
    <span className={`ml-2 inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium transition-colors
      ${ok ? "bg-green-100 text-green-800 border border-green-200" : "bg-orange-100 text-orange-800 border border-orange-200"}`}>
      {text}
    </span>
  );

  return (
    <div className="w-full h-full overflow-auto space-y-5 lg:space-y-6 p-1">
      {/* Meta Title */}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-slate-900 text-base flex items-center">
            <span>Meta title</span>
            <Badge ok={titleOK} text={`${titleLen} caractères`} />
          </h4>
        </div>
        <p className="text-slate-700 leading-relaxed">{metaTitle || "—"}</p>
        {!titleOK && (
          <div className="mt-3 p-3 bg-orange-50 border-l-4 border-orange-400 rounded-r text-xs text-orange-700">
            Conseil : entre 15 et 60 caractères est idéal pour l'affichage.
          </div>
        )}
      </div>

      {/* Meta Description */}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-slate-900 text-base flex items-center">
            <span>Meta description</span>
            <Badge ok={descOK} text={`${descLen} caractères`} />
          </h4>
        </div>
        <p className="text-slate-700 break-words leading-relaxed">{metaDescription || "—"}</p>
        {!descOK && (
          <div className="mt-3 p-3 bg-orange-50 border-l-4 border-orange-400 rounded-r text-xs text-orange-700">
            Conseil : visez ~155–160 caractères (≥50 pour éviter les snippets trop courts).
          </div>
        )}
      </div>

      {/* Canonical + Robots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h4 className="font-semibold text-slate-900 text-base mb-3 flex items-center">
            Canonical
          </h4>
          <div className="text-slate-700 break-words text-sm">{canonical || "—"}</div>
          {canonical && (
            <a
              href={canonical}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center mt-3 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              title="Ouvrir"
            >
              <span className="mr-1.5">Ouvrir</span>
              <FaExternalLinkAlt className="text-[10px]" />
            </a>
          )}
          {!seo.canonical_url && canonical && (
            <p className="mt-3 text-xs text-slate-500 italic">
              (Dérivé automatiquement via <code className="px-1 py-0.5 bg-slate-100 rounded text-[11px]">VITE_PUBLIC_SITE_URL</code> + <code className="px-1 py-0.5 bg-slate-100 rounded text-[11px]">/articles/{'{slug}'}</code>)
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h4 className="font-semibold text-slate-900 text-base mb-3 flex items-center">
            Robots
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium border
              ${robotsIndex ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}`}>
              {robotsIndex ? "index" : "noindex"}
            </span>
            <span className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium border
              ${robotsFollow ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}`}>
              {robotsFollow ? "follow" : "nofollow"}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            <code className="px-2 py-0.5 bg-slate-100 rounded text-xs">content</code> : <code className="px-2 py-0.5 bg-slate-100 rounded text-xs">{robotsStr}</code>
          </p>
        </div>
      </div>

      {/* Prévisualisation des balises <head> */}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
        <h4 className="font-semibold text-slate-900 mb-4 flex items-center text-base">
          <FaInfoCircle className="mr-2 text-blue-600" />
          Balises générées
        </h4>
        <pre className="text-xs bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto font-mono border border-slate-700 leading-relaxed">
{headPreview}
        </pre>
      </div>
    </div>
  );
}