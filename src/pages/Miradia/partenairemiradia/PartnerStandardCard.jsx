import React from "react";
import { FaExternalLinkAlt } from "react-icons/fa";

/**
 * PartnerStandardCard (minimaliste + dark mode)
 * - Logo très visible en haut (sans bordure)
 * - Infos + lien en bas
 * - Style épuré, compatible dark/light
 */
export default function PartnerStandardCard({
  name = "Partenaire",
  acronym = "",
  role = "",
  href,
  location,
  logo,
  countryFlag, // optionnel
}) {
  const logoText = (acronym || name?.slice(0, 2) || "P").toUpperCase();
  const hasLink = href && href !== "#";

  return (
    <article
      className={[
        "h-full rounded-2xl flex flex-col",
        "bg-white border border-gray-200 hover:border-gray-300",
        "dark:bg-white/5 dark:border-white/10 dark:hover:border-white/20",
        "transition-colors",
      ].join(" ")}
    >
      {/* Haut : logo + nom + rôle */}
      <div className="px-5 pt-5 pb-4 flex flex-col items-center text-center gap-3">
        {/* Logo très gros, SANS bordure ni fond */}
        <div className="w-24 h-24 md:w-28 md:h-28 flex items-center justify-center overflow-hidden">
          {logo ? (
            <img
              src={logo}
              alt={`Logo ${name}`}
              className="w-full h-full object-contain"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-slate-100 tracking-wide">
              {logoText}
            </span>
          )}
        </div>

        {/* Nom + rôle */}
        <div className="w-full">
          <div className="flex items-center justify-center gap-2">
            {countryFlag ? <span className="text-sm">{countryFlag}</span> : null}
            <h3 className="text-sm md:text-base font-medium text-gray-900 dark:text-slate-50 truncate">
              {name}
            </h3>
          </div>

          {role ? (
            <p className="text-xs md:text-[13px] text-gray-500 dark:text-slate-300 font-light line-clamp-2 mt-1">
              {role}
            </p>
          ) : null}
        </div>
      </div>

      {/* Bas : localisation + lien */}
      {(location || hasLink) && (
        <div className="mt-auto px-5 pb-4 pt-3 border-t border-gray-100 dark:border-white/10 flex items-center gap-2">
          {location ? (
            <p className="flex-1 text-xs text-gray-500 dark:text-slate-300 font-light truncate">
              {location}
            </p>
          ) : (
            <span />
          )}

          {hasLink && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:hover:text-slate-100 transition-colors flex-shrink-0"
              aria-label={`Visiter ${name}`}
              title={`Visiter ${name}`}
            >
              <FaExternalLinkAlt className="w-4 h-4" />
            </a>
          )}
        </div>
      )}
    </article>
  );
}
