// SmartImage.jsx
import { useState, useMemo } from "react";
import { useTranslation } from 'react-i18next';

export default function SmartImage({
  src,
  alt = "",
  className = "",
  ratio = "56.25%",
  eager = false,
  rounding = "rounded-2xl",
  // 🔧 OFF par défaut pour éviter les NS_BINDING_ABORTED
  modern = "off", // "off" | "on" | "auto"
}) {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);
  const [error, setError]   = useState(false);

  const canModern = useMemo(() => {
    if (modern === "off") return false;
    // "auto" n'active que si on a explicitement une config d'environnement
    if (modern === "auto" && import.meta.env.VITE_SERVE_AVIF_WEBP !== "1") return false;
    return /\.(jpe?g|png)$/i.test(String(src || ""));
  }, [modern, src]);

  const toVariant = (url, ext) =>
    typeof url === "string" ? url.replace(/\.(jpg|jpeg|png)$/i, `.${ext}`) : url;

  const avif = canModern ? toVariant(src, "avif") : null;
  const webp = canModern ? toVariant(src, "webp") : null;

  return (
    <div className={`relative w-full overflow-hidden ${rounding}`} style={{ paddingTop: ratio }}>
      {!loaded && !error && (
        <div 
          className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse" 
          aria-label={t('smartimage.loading', { default: "Loading image..." })}
        />
      )}

      {canModern ? (
        <picture>
          <source srcSet={avif} type="image/avif" />
          <source srcSet={webp} type="image/webp" />
          <img
            src={src}
            alt={alt}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => {
              // Si une source échoue, on laissera <img src={src}> charger
              setError(true);
            }}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
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
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            loaded ? "opacity-100" : "opacity-0"
          } ${className}`}
        />
      )}

      {error && (
        <div 
          className="absolute inset-0 flex items-center justify-center text-slate-400 text-center px-4"
          role="alert"
          aria-label={t('smartimage.unavailable', { default: "Image unavailable" })}
        >
          <span className="text-3xl" role="img" aria-label={t('smartimage.icon', { default: "Image frame" })}>
            🖼️
          </span>
          <p className="ml-2 text-sm">{t('smartimage.unavailableText', { default: "Image unavailable" })}</p>
        </div>
      )}
    </div>
  );
}