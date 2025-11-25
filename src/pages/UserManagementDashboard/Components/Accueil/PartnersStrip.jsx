import React, { useEffect, useRef, useState } from "react";
import PartnerStandardCard from "./PartnerStandardCard";

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

// Données partenaires réalistes basées sur SAF/FJKM & CARE Madagascar
const DEFAULT_PARTNERS = [
  {
    id: "saf-fjkm",
    name: "SAF/FJKM",
    acronym: "SAF/FJKM",
    role:
      "Département de développement de l’Église FJKM et structure porteuse de la bibliothèque numérique.",
    logo:
      "https://saf-fjkm.org/wp-content/themes/saf-fjkm/assets/images/logo.png",
    color: "#0ea5e9",
    href: "https://saf-fjkm.org/",
    location: "Antananarivo · Réseau national",
  },
  {
    id: "care-madagascar",
    name: "CARE Madagascar",
    acronym: "CARE",
    role:
      "Organisation humanitaire internationale, productrice de rapports, études et albums terrain.",
    logo: "https://care.mg/wp-content/uploads/2019/10/logo-Care.png",
    color: "#8b5cf6",
    href: "https://care.mg/",
    location: "Antananarivo · Interventions nationales",
  },
  {
    id: "other-partners",
    name: "Organisations membres & réseaux",
    acronym: "Partenaires",
    role:
      "ONG, réseaux et institutions qui alimentent et consultent la bibliothèque en ligne.",
    color: "#10b981",
    href: "#",
    location: "Madagascar · Régional & international",
  },
];

export default function PartnersStrip({ partners = DEFAULT_PARTNERS }) {
  const [ref, visible] = useRevealOnScroll(0.2);

  // On duplique la liste pour un effet de boucle infinie
  const marqueeItems = [...partners, ...partners];

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
        {/* Titre aligné avec le storytelling Hero/Slider */}
        <div className="w-full max-w-4xl mx-auto text-center mb-8 md:mb-10">
          <p className="text-[11px] md:text-xs font-semibold tracking-[0.25em] uppercase text-slate-500 mb-2">
            Réseau de la plateforme
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">
            Une bibliothèque partagée avec vos partenaires
          </h2>
          <div className="w-32 h-1 bg-slate-900 mx-auto mb-4 md:mb-5" />
          <p className="text-sm md:text-base text-slate-500 leading-relaxed">
            La bibliothèque numérique relie le SAF/FJKM, CARE Madagascar et les
            autres organisations membres autour des mêmes rapports, albums
            photos, documents de référence et supports de formation, dans un
            espace web commun.
          </p>
        </div>

        {/* Contenant principal */}
        <div className="relative border border-slate-200 rounded-3xl bg-white shadow-sm overflow-hidden">
          {/* Fades gauche/droite pour l’effet vitrine */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white via-white/90 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white via-white/90 to-transparent z-10" />

          <div className="relative w-full overflow-hidden">
            <div
              className="partners-marquee-track flex items-stretch gap-4 py-4 px-4 md:px-6"
              style={{ width: "max-content" }}
            >
              {marqueeItems.map((partner, index) => (
                <div
                  key={`${partner.id || partner.name}-${index}`}
                  className="shrink-0 w-[260px] md:w-[320px]"
                >
                  <PartnerStandardCard {...partner} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Petite ligne de cohérence en dessous (optionnelle) */}
        <p className="mt-4 text-[11px] md:text-xs text-slate-500 text-center">
          Chaque partenaire dispose d&apos;un accès dédié pour déposer et
          consulter les rapports, albums et documents qui le concernent dans la
          bibliothèque en ligne.
        </p>
      </div>
    </section>
  );
}
