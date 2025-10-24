// src/media-library/parts/SmartImage.jsx
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

/**
 * SmartImage
 * - Affiche une image avec skeleton + fade-in
 * - Optionnellement sert des variantes AVIF/WEBP (modern="on" | "auto")
 * - Ne tente PAS d'afficher les non-images (pdf, docx, zip) → vignette de remplacement cliquable
 *
 * Props principales :
 *  - src: string (URL absolue ou relative)
 *  - alt: string
 *  - className: string classes Tailwind
 *  - ratio: string (ex: "56.25%" pour 16/9, "100%" pour carré)
 *  - eager: bool (loading eager)
 *  - rounding: string (classes de rounding)
 *  - modern: "off" | "on" | "auto" (par défaut "off")
 *  - fit: "cover" | "contain" (par défaut "cover")
 *  - showNonImagePlaceholder: bool (par défaut true) — si false, on rend juste un bloc vide
 */
export default function SmartImage({
  src,
  alt = "",
  className = "",
  ratio = "56.25%",
  eager = false,
  rounding = "rounded-2xl",
  modern = "off", // "off" | "on" | "auto"
  fit = "cover",
  showNonImagePlaceholder = true,
}) {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // ---- Helpers extension / type fichier
  const getExt = (u = "") =>
    String(u).split("?")[0].split("#")[0].match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "";
  const IMAGE_EXTS = useMemo(
    () => new Set(["jpg", "jpeg", "png", "webp", "gif", "svg", "avif"]),
    []
  );
  const isImageUrl = (u) => IMAGE_EXTS.has(getExt(u));

  // ---- Détecte si on doit afficher comme image
  const srcIsImage = useMemo(() => !!src && isImageUrl(src), [src]);

  // ---- Formats modernes (opt-in)
  const canModern = useMemo(() => {
    if (!srcIsImage) return false;
    if (modern === "off") return false;
    // "auto" ne s'active que si VITE_SERVE_AVIF_WEBP === "1"
    if (modern === "auto" && import.meta.env.VITE_SERVE_AVIF_WEBP !== "1") return false;
    // on ne tente les variantes modernes que pour jpg/png (les autres sont déjà modernes ou vectorielles)
    return /\.(jpe?g|png)$/i.test(String(src || ""));
  }, [modern, src, srcIsImage]);

  const toVariant = (url, ext) =>
    typeof url === "string" ? url.replace(/\.(jpg|jpeg|png)$/i, `.${ext}`) : url;

  const avif = canModern ? toVariant(src, "avif") : null;
  const webp = canModern ? toVariant(src, "webp") : null;

  // ---- Classes utilitaires
  const imgFitClass =
    fit === "contain" ? "object-contain bg-transparent" : "object-cover";

  // ---- Placeholder pour NON-IMAGE (pdf/doc/zip…)
  if (!srcIsImage) {
    if (!showNonImagePlaceholder) {
      return (
        <div
          className={`relative w-full overflow-hidden ${rounding} ${className}`}
          style={{ paddingTop: ratio }}
          aria-label={t("smartimage.nonImage", { defaultValue: "Non-image content" })}
        />
      );
    }

    const ext = getExt(src);
    const icon = ext === "pdf" ? "📄" : "📦";
    const label =
      ext === "pdf"
        ? t("smartimage.openPdf", { defaultValue: "Open PDF" })
        : t("smartimage.openFile", { defaultValue: "Open file" });

    return (
      <div
        className={`relative w-full overflow-hidden ${rounding} ${className}`}
        style={{ paddingTop: ratio }}
      >
        <div className="absolute inset-0 bg-slate-50 border border-slate-200 flex items-center justify-center">
          <a
            href={src || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex flex-col items-center justify-center rounded-2xl px-4 py-3 bg-white/95 border border-slate-200 shadow-sm hover:shadow transition"
            title={label}
          >
            <span className="text-4xl leading-none">{icon}</span>
            <span className="mt-1 text-xs text-slate-600 group-hover:text-slate-800">
              {label}
            </span>
            {ext && (
              <span className="mt-0.5 text-[10px] text-slate-500">.{ext}</span>
            )}
          </a>
        </div>
      </div>
    );
  }

  // ---- Comportement image classique
  return (
    <div
      className={`relative w-full overflow-hidden ${rounding}`}
      style={{ paddingTop: ratio }}
    >
      {!loaded && !error && (
        <div
          className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse"
          aria-label={t("smartimage.loading", { defaultValue: "Loading image..." })}
        />
      )}

      {canModern ? (
        <picture>
          <source srcSet={avif || ""} type="image/avif" />
          <source srcSet={webp || ""} type="image/webp" />
          <img
            src={src}
            alt={alt}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className={`absolute inset-0 w-full h-full ${imgFitClass} transition-opacity duration-700 ${
              loaded ? "opacity-100" : "opacity-0"
            } ${className}`}
          />
        </picture>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`absolute inset-0 w-full h-full ${imgFitClass} transition-opacity duration-700 ${
            loaded ? "opacity-100" : "opacity-0"
          } ${className}`}
        />
      )}

      {error && (
        <div
          className="absolute inset-0 flex items-center justify-center text-slate-400 text-center px-4 bg-slate-50 border border-slate-200"
          role="alert"
          aria-label={t("smartimage.unavailable", { defaultValue: "Image unavailable" })}
        >
          <span
            className="text-3xl"
            role="img"
            aria-label={t("smartimage.icon", { defaultValue: "Image frame" })}
          >
            🖼️
          </span>
          <p className="ml-2 text-sm">
            {t("smartimage.unavailableText", { defaultValue: "Image unavailable" })}
          </p>
        </div>
      )}
    </div>
  );
}
