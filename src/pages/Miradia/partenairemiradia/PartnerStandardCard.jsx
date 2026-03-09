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
  countryFlag,
}) {
  const logoText = (acronym || name?.slice(0, 2) || "P").toUpperCase();
  const hasLink  = href && href !== "#";

  return (
    <article
      className={[
        "h-full rounded-2xl flex flex-col",
        "bg-white border border-gray-200 hover:border-gray-300",
        "dark:bg-white/5 dark:border-white/10 dark:hover:border-white/20",
        "transition-colors",
      ].join(" ")}
    >
      {/* ── Haut : logo + nom + rôle ── */}
      <div className="px-5 pt-5 pb-4 flex flex-col items-center text-center gap-3">

        {/* Logo */}
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
            <span className="text-[20px] md:text-[22px] font-semibold text-gray-800 dark:text-slate-100 tracking-wide">
              {logoText}
            </span>
          )}
        </div>

        {/* Nom + rôle */}
        <div className="w-full">
          <div className="flex items-center justify-center gap-2">
            {countryFlag && <span className="text-sm">{countryFlag}</span>}
            <h3 className="text-[20px] md:text-[22px] font-medium text-gray-900 dark:text-slate-50 truncate">
              {name}
            </h3>
          </div>

          {role && (
            <p className="text-[15px] md:text-[16px] text-gray-500 dark:text-slate-300 font-light line-clamp-2 mt-1">
              {role}
            </p>
          )}
        </div>
      </div>

      {/* ── Bas : localisation + bouton lien ── */}
      <div className="mt-auto px-5 pb-5 pt-3 border-t border-gray-100 dark:border-white/10 flex flex-col gap-3">

        {/* Localisation */}
        {location && (
          <p className="text-[13px] text-gray-400 dark:text-slate-400 font-light truncate text-center">
            📍 {location}
          </p>
        )}

        {/* Bouton Visiter le site */}
        {hasLink && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visiter le site de ${name}`}
            className={[
              "w-full inline-flex items-center justify-center gap-2",
              "px-4 py-2.5 rounded-xl",
              "text-[13px] font-semibold",
              "bg-gray-100 text-gray-700 hover:bg-gray-200",
              "dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/18",
              "transition-colors duration-200",
            ].join(" ")}
          >
            Visiter le site
            <FaExternalLinkAlt className="w-3 h-3 opacity-70" />
          </a>
        )}
      </div>
    </article>
  );
}