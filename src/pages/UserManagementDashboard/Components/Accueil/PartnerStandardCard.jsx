import React from "react";
import { FaExternalLinkAlt } from "react-icons/fa";

/**
 * Carte minimaliste pour un partenaire.
 * Logo très visible en haut (sans bordure), données en bas.
 */
export default function PartnerStandardCard({
  name = "Partenaire",
  acronym = "",
  role = "",
  color = "#0ea5e9", // gardé si tu veux l'utiliser ailleurs
  href,
  location,
  logo,
}) {
  const logoText = acronym || name?.slice(0, 2).toUpperCase();

  return (
    <article className="h-full bg-white border border-gray-200 hover:border-gray-300 transition-colors rounded-2xl flex flex-col">
      {/* Haut : logo + nom + rôle */}
      <div className="px-5 pt-5 pb-4 flex flex-col items-center text-center gap-3">
        {/* Logo très gros, SANS bordure ni fond */}
        <div className="w-24 h-24 md:w-28 md:h-28 flex items-center justify-center overflow-hidden">
          {logo ? (
            <img
              src={logo}
              alt={`Logo ${name}`}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-2xl md:text-3xl font-semibold text-gray-800 tracking-wide">
              {logoText}
            </span>
          )}
        </div>

        {/* Nom + rôle */}
        <div className="w-full">
          <h3 className="text-sm md:text-base font-medium text-gray-900 mb-1 truncate">
            {name}
          </h3>
          {role && (
            <p className="text-xs md:text-[13px] text-gray-500 font-light line-clamp-2">
              {role}
            </p>
          )}
        </div>
      </div>

      {/* Bas : localisation + lien */}
      {(location || (href && href !== "#")) && (
        <div className="mt-auto px-5 pb-4 pt-3 border-t border-gray-100 flex items-center gap-2">
          {location && (
            <p className="flex-1 text-xs text-gray-500 font-light truncate">
              {location}
            </p>
          )}

          {href && href !== "#" && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label={`Visiter ${name}`}
            >
              <FaExternalLinkAlt className="w-4 h-4" />
            </a>
          )}
        </div>
      )}
    </article>
  );
}
