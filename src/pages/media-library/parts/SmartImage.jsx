// ------------------------------
// File: media-library/parts/SmartImage.jsx
// Image "smart" : LQIP (squelette), AVIF/WebP fallback, gestion d'erreur
// ------------------------------
import { useState } from "react";

export default function SmartImage({
  src,
  alt = "",
  className = "",
  ratio = "56.25%", // 16:9
  eager = false,
  rounding = "rounded-2xl",
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError]   = useState(false);

  // Utilitaire simple pour proposer AVIF/WEBP si l'URL est un .jpg/.jpeg/.png
  const toModern = (url, ext) =>
    typeof url === "string" ? url.replace(/\.(jpg|jpeg|png)$/i, `.${ext}`) : url;

  return (
    <div className={`relative w-full overflow-hidden ${rounding}`} style={{ paddingTop: ratio }}>
      {/* Squelette LQIP */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${loaded ? "opacity-0" : "opacity-100"}`}>
        <div className="w-full h-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </div>

      {!error ? (
        <picture>
          <source srcSet={toModern(src, "avif")} type="image/avif" />
          <source srcSet={toModern(src, "webp")} type="image/webp" />
          <img
            src={src}
            alt={alt}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className={`absolute inset-0 w-full h-full object-cover ${className}`}
          />
        </picture>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 text-3xl">
          🖼️
        </div>
      )}
    </div>
  );
}
