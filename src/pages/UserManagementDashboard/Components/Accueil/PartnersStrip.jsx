// src/media-library/parts/PartnersStrip.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import PartnerStandardCard from "./PartnerStandardCard";
import api from "../../../../services/api"; // adapte le chemin si besoin

// Hook simple pour reveal au scroll
function useRevealOnScroll(threshold = 0.2) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, visible];
}

// 🌍 Drapeau pays (comme dans ArticleForm)
const getCountryFlag = (country) => {
  if (!country) return "🌍";
  const c = country.toLowerCase();

  if (c.includes("madagascar")) return "🇲🇬";
  if (c.includes("france")) return "🇫🇷";
  if (c.includes("canada")) return "🇨🇦";
  if (
    c.includes("usa") ||
    c.includes("united states") ||
    c.includes("états-unis")
  ) {
    return "🇺🇸";
  }

  return "🌍";
};

// 🔗 Logo société, même logique que buildSocieteLogoUrl
const STORAGE_BASE = (
  import.meta.env.VITE_API_BASE_STORAGE ||
  import.meta.env.VITE_API_BASE_URL ||
  ""
)
  .replace(/\/api\/?$/i, "")
  .replace(/\/+$/, "");

const buildSocieteLogoUrl = (value) => {
  if (!value) return "";

  const s = String(value).trim();

  // URL absolue ou chemin déjà complet
  if (
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("/")
  ) {
    return s;
  }

  // Fichier stocké dans /storage/logos
  return STORAGE_BASE ? `${STORAGE_BASE}/storage/logos/${s}` : "";
};

/**
 * PartnersStrip
 *
 * - Charge les sociétés via /societes
 * - Map vers PartnerStandardCard
 * - Option : highlightTenantId pour mettre en avant le tenant courant
 */
export default function PartnersStrip({ highlightTenantId = null }) {
  const [ref, visible] = useRevealOnScroll(0.2);
  const [societes, setSocietes] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔥 Fetch Laravel /societes (shape = ton log)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await api.get("/societes", {
          params: {
            per_page: 100, // ajuste si besoin
          },
        });

        const raw = res?.data?.data || res?.data || [];

        if (!mounted) return;

        setSocietes(Array.isArray(raw) ? raw : []);
      } catch (e) {
        console.error("Erreur chargement sociétés pour PartnersStrip", e);
        if (mounted) setSocietes([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // 🧠 Mapping sociétés -> format PartnerStandardCard
  const partners = useMemo(() => {
    if (!Array.isArray(societes) || societes.length === 0) return [];

    return societes.map((s) => {
      const acronym =
        s.slug ||
        (s.name ? s.name.split(" ").map((p) => p[0]).join("") : "") ||
        "—";

      const color =
        s.primary_color && typeof s.primary_color === "string"
          ? s.primary_color
          : "#0ea5e9"; // fallback

      const location =
        s.ville && s.pays
          ? `${s.ville} · ${s.pays}`
          : s.ville || s.pays || "Madagascar";

      return {
        id: s.id,
        name: s.name || acronym,
        acronym,
        logo: buildSocieteLogoUrl(s.logo_url),
        color,
        href: s.website_url || "#",
        location,
        role:
          s.description ||
          "Organisation membre de la bibliothèque numérique.",
        isActive:
          highlightTenantId != null &&
          String(highlightTenantId) === String(s.id),
        countryFlag: getCountryFlag(s.pays),
      };
    });
  }, [societes, highlightTenantId]);

  // 🎞️ Marquee infini
  const marqueeItems = useMemo(
    () => (partners.length ? [...partners, ...partners] : []),
    [partners]
  );

  const hasData = partners.length > 0;

  return (
    <section
      ref={ref}
      className={[
        "relative w-full",
        "px-4 md:px-8 lg:px-12 py-8 md:py-12",
        "transition-all duration-700",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      ].join(" ")}
      aria-label="Partenaires de la plateforme"
    >
      <style>
        {`
          @keyframes partners-marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .partners-marquee-track {
            animation: partners-marquee 35s linear infinite;
          }
          .partners-marquee-track:hover {
            animation-play-state: paused;
          }
        `}
      </style>

      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="w-full max-w-4xl mx-auto text-center mb-8 md:mb-10">
          <p className="text-[11px] md:text-xs font-semibold tracking-[0.25em] uppercase text-slate-500 mb-2">
            Réseau de la plateforme
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">
            Une bibliothèque partagée avec vos partenaires
          </h2>
          <div className="w-32 h-1 bg-slate-900 mx-auto mb-4 md:mb-5" />
          <p className="text-sm md:text-base text-slate-500 leading-relaxed">
            La bibliothèque numérique relie les sociétés, ONG et institutions
            membres autour des mêmes rapports, albums photos, documents de
            référence et supports de formation, dans un espace web commun.
          </p>
        </div>

        {/* Contenant principal */}
        <div className="relative border border-slate-200 rounded-3xl bg-white shadow-sm overflow-hidden">
          {/* Fades gauche/droite */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white via-white/90 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white via-white/90 to-transparent z-10" />

          <div className="relative w-full overflow-hidden">
            {loading && (
              <div className="px-4 py-6 text-sm text-slate-500">
                Chargement des partenaires…
              </div>
            )}

            {!loading && !hasData && (
              <div className="px-4 py-6 text-sm text-slate-500">
                Aucun partenaire trouvé pour le moment.
              </div>
            )}

            {!loading && hasData && (
              <div
                className="partners-marquee-track flex items-stretch gap-4 py-4 px-4 md:px-6"
                style={{ width: "max-content" }}
              >
                {marqueeItems.map((partner, index) => (
                  <div
                    key={`${partner.id || partner.name}-${index}`}
                    className={[
                      "shrink-0 w-[260px] md:w-[320px] transition-transform duration-200",
                      partner.isActive
                        ? "scale-[1.03] drop-shadow-md ring-2 ring-sky-300/80 rounded-3xl"
                        : "",
                    ].join(" ")}
                  >
                    <PartnerStandardCard
                      {...partner}
                      countryFlag={partner.countryFlag}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-[11px] md:text-xs text-slate-500 text-center">
          Chaque partenaire dispose d&apos;un accès dédié pour déposer et
          consulter les rapports, albums et documents qui le concernent dans la
          bibliothèque en ligne.
        </p>
      </div>
    </section>
  );
}
