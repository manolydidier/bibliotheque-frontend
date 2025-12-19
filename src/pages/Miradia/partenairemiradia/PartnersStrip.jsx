import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import PartnerStandardCard from "./PartnerStandardCard";
import api from "../../../services/api";

/* =========================
   PALETTE MIRADIA (logo)
========================= */
const MIRADIA = {
  navy: "#124B7C",
  teal: "#025C86",
  sky: "#3AA6DC",
  green: "#4CC051",
  yellow: "#FCCA00",
};

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

const hexToRgba = (hex, a = 0.25) => {
  const h = String(hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
};

/* =========================
   TUNING
========================= */
const MARQUEE_SECONDS = 38; // vitesse défilement (plus grand = plus lent)
const CARD_W = 320; // md:w
const CARD_W_SM = 260; // w mobile
const CARD_H = 260; // hauteur enveloppe card (augmente ici)
const PANEL_PAD_Y = "py-10"; // espace vertical intérieur du panel
const SHOW_CTA = false; // true si tu veux un bouton "Voir tous"

/* =========================
   Hook: reveal IDs when visible in viewport
========================= */
function useVisibleIdsViewport({ ids, threshold = 0.2, rootMargin = "180px" }) {
  const [visibleIds, setVisibleIds] = useState(() => new Set());
  const elByIdRef = useRef(new Map());

  const setObservedRef = useCallback((id) => {
    return (el) => {
      const map = elByIdRef.current;
      if (!el) {
        map.delete(id);
        return;
      }
      map.set(id, el);
    };
  }, []);

  useEffect(() => {
    if (!ids?.length) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisibleIds(new Set(ids));
      return;
    }

    let raf = 0;
    const obs = new IntersectionObserver(
      (entries) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          setVisibleIds((prev) => {
            const next = new Set(prev);
            for (const e of entries) {
              const id = e.target?.dataset?.pid;
              if (!id) continue;
              if (e.isIntersecting) next.add(id);
            }
            return next;
          });
        });
      },
      { root: null, threshold, rootMargin }
    );

    const map = elByIdRef.current;
    for (const id of ids) {
      const el = map.get(id);
      if (el) obs.observe(el);
    }

    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [ids, threshold, rootMargin]);

  return { visibleIds, setObservedRef };
}

/* =========================
   BACKGROUND (épuré, pas noir brut)
========================= */
function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Light blobs */}
      <div
        className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-30 dark:opacity-14 animate-[float1_12s_ease-in-out_infinite]"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${MIRADIA.sky}55, transparent 60%)`,
        }}
      />
      <div
        className="absolute top-1/3 -right-24 h-96 w-96 rounded-full blur-3xl opacity-24 dark:opacity-12 animate-[float2_14s_ease-in-out_infinite]"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${MIRADIA.green}55, transparent 60%)`,
        }}
      />
      <div
        className="absolute -bottom-28 left-1/3 h-[520px] w-[520px] rounded-full blur-3xl opacity-18 dark:opacity-10 animate-[float3_16s_ease-in-out_infinite]"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${MIRADIA.yellow}44, transparent 60%)`,
        }}
      />

      {/* Dark extras (doux) */}
      <div className="hidden dark:block">
        <div
          className="absolute top-1/4 -left-12 h-[420px] w-[420px] rounded-full blur-3xl opacity-10 animate-[float4_20s_ease-in-out_infinite]"
          style={{
            background: `radial-gradient(circle at 40% 40%, #7C3AED33, transparent 65%)`,
          }}
        />
        <div
          className="absolute bottom-1/4 -right-12 h-[460px] w-[460px] rounded-full blur-3xl opacity-08 animate-[float5_22s_ease-in-out_infinite]"
          style={{
            background: `radial-gradient(circle at 60% 60%, #4F46E533, transparent 70%)`,
          }}
        />
        <div
          className="absolute top-3/4 left-1/4 h-[380px] w-[380px] rounded-full blur-3xl opacity-12 animate-[float6_18s_ease-in-out_infinite]"
          style={{
            background: `radial-gradient(circle at 20% 80%, #0EA5E933, transparent 60%)`,
          }}
        />
      </div>

      <style>{`
        @keyframes float1 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(18px,14px) } }
        @keyframes float2 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(-14px,18px) } }
        @keyframes float3 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(10px,-16px) } }
        @keyframes float4 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(25px,-8px) } }
        @keyframes float5 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(-20px,12px) } }
        @keyframes float6 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(12px,22px) } }
      `}</style>
    </div>
  );
}

/* =========================
   Drapeau pays
========================= */
const getCountryFlag = (country) => {
  if (!country) return "🌍";
  const c = String(country).toLowerCase();
  if (c.includes("madagascar")) return "🇲🇬";
  if (c.includes("france")) return "🇫🇷";
  if (c.includes("canada")) return "🇨🇦";
  if (c.includes("usa") || c.includes("united states") || c.includes("états-unis")) return "🇺🇸";
  return "🌍";
};

/* =========================
   Storage logo url
========================= */
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
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/")) return s;
  return STORAGE_BASE ? `${STORAGE_BASE}/storage/logos/${s}` : "";
};

/* =========================
   Title (épuré, pas copie organigramme)
========================= */
function PartnersTitleBlock() {
  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-black/5 dark:ring-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.10)]">
        {/* fond */}
        <div className="absolute inset-0 bg-white/70 dark:bg-white/5" />
        <div
          className="absolute inset-0 opacity-80 dark:opacity-60"
          style={{
            background: `radial-gradient(circle at 15% 10%, ${MIRADIA.sky}22, transparent 55%),
                         radial-gradient(circle at 90% 25%, ${MIRADIA.green}18, transparent 60%),
                         radial-gradient(circle at 55% 120%, ${MIRADIA.yellow}14, transparent 55%)`,
          }}
        />

        <div className="relative px-6 py-8 md:py-10 text-center">
          <div className="inline-flex items-center rounded-full px-4 py-2 text-[11px] font-semibold tracking-[0.22em] uppercase
                          bg-white/85 text-slate-600 ring-1 ring-black/5
                          dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
            Plateforme MIRADIA
          </div>

          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-50">
            Quelques membres & partenaires
          </h2>

          <div
            className="mx-auto mt-4 h-1 w-28 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${MIRADIA.green}, ${MIRADIA.yellow}, ${MIRADIA.sky})`,
            }}
          />

          <p className="mt-4 max-w-3xl mx-auto text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            MIRADIA connecte ses partenaires (sociétés, ONG, institutions) dans un espace commun pour partager et consulter
            des documents, rapports, albums photos et supports de formation.
          </p>

          <p className="mt-3 text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Survolez pour mettre en pause • Cliquez pour ouvrir le site (si disponible).
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================
   PartnersStrip (amélioré + plus haut)
========================= */
export default function PartnersStrip({ highlightTenantId = null }) {
  const [societes, setSocietes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch Laravel /societes
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await api.get("/societes", { params: { per_page: 100 } });
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

  // Mapping -> PartnerStandardCard props
  const partners = useMemo(() => {
    if (!Array.isArray(societes) || societes.length === 0) return [];

    return societes.map((s) => {
      const acronym =
        s.slug ||
        (s.name ? s.name.split(" ").map((p) => p[0]).join("") : "") ||
        "—";

      const location =
        s.ville && s.pays ? `${s.ville} · ${s.pays}` : s.ville || s.pays || "Madagascar";

      const id = String(s.id ?? "");
      const isActive = highlightTenantId != null && String(highlightTenantId) === id;

      return {
        id,
        name: s.name || acronym,
        acronym,
        logo: buildSocieteLogoUrl(s.logo_url),
        href: s.website_url || "#",
        location,
        role: s.description || "Organisation membre de la plateforme MIRADIA.",
        countryFlag: getCountryFlag(s.pays),
        isActive,
      };
    });
  }, [societes, highlightTenantId]);

  const hasData = partners.length > 0;

  // Double pour marquee
  const marqueeItems = useMemo(() => (hasData ? [...partners, ...partners] : []), [hasData, partners]);

  // Reveal quand visible (observe seulement 1ère boucle)
  const ids = useMemo(() => partners.map((p) => p.id), [partners]);
  const { visibleIds, setObservedRef } = useVisibleIdsViewport({
    ids,
    threshold: 0.2,
    rootMargin: "200px",
  });

  return (
    <section className="relative w-full overflow-x-hidden " aria-label="Partenaires de la plateforme MIRADIA">
      <div className="relative  w-full bg-[#eef5fb] dark:bg-gradient-to-b dark:from-[#0B1626] dark:via-[#070F1C] dark:to-[#050A12]">
        <AnimatedBackground />

        <div className="relative mx-auto w-full max-w-[1700px] px-2 sm:px-4 lg:px-8 py-10  md:py-12 bg-white/10 dark:bg-black/20">
          <PartnersTitleBlock />

          {/* Panel plus haut */}
          <div
            className={cx(
              "mt-10 w-full rounded-3xl overflow-hidden",
              "bg-white/70 dark:bg-white/5 backdrop-blur-xl",
              "ring-1 ring-black/5 dark:ring-white/10",
              "p-3 sm:p-4"
            )}
          >
            <style>{`
              @keyframes partners-marquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              .partners-marquee-track {
                animation: partners-marquee ${MARQUEE_SECONDS}s linear infinite;
                will-change: transform;
              }
              /* Pause si hover sur tout le panel */
              .partners-panel:hover .partners-marquee-track {
                animation-play-state: paused;
              }
              @media (prefers-reduced-motion: reduce){
                .partners-marquee-track { animation: none !important; }
                * { transition: none !important; animation: none !important; }
              }
            `}</style>

            {loading && (
              <div className="rounded-2xl bg-white border border-gray-200 p-6 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:text-slate-200">
                Chargement des partenaires…
              </div>
            )}

            {!loading && !hasData && (
              <div className="rounded-2xl bg-white border border-gray-200 p-6 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:text-slate-200">
                Aucun partenaire trouvé pour le moment.
              </div>
            )}

            {!loading && hasData && (
              <div className={cx("partners-panel relative overflow-hidden rounded-2xl py-16", PANEL_PAD_Y)}>
                {/* Fades plus doux */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-14 z-10 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-[#0B1626] dark:via-[#0B1626]/65" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-14 z-10 bg-gradient-to-l from-white via-white/80 to-transparent dark:from-[#0B1626] dark:via-[#0B1626]/65" />

                {/* Fine overlay grid (très subtil) */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.08] dark:opacity-[0.10]"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(2,92,134,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(2,92,134,0.35) 1px, transparent 1px)",
                    backgroundSize: "44px 44px",
                    maskImage: "radial-gradient(circle at 50% 45%, black 0%, transparent 72%)",
                    WebkitMaskImage: "radial-gradient(circle at 50% 45%, black 0%, transparent 72%)",
                  }}
                />

                {/* Track */}
                <div className="partners-marquee-track flex items-stretch gap-5 px-4 md:px-8" style={{ width: "max-content" }}>
                  {marqueeItems.map((partner, index) => {
                    const isFirstLoop = index < partners.length;
                    const observed = isFirstLoop;
                    const reveal = visibleIds.has(partner.id);

                    return (
                      <div
                        key={`${partner.id || partner.name}-${index}`}
                        data-pid={observed ? partner.id : undefined}
                        ref={observed ? setObservedRef(partner.id) : undefined}
                        className={cx(
                          "shrink-0",
                          `w-[${CARD_W_SM}px] md:w-[${CARD_W}px]`,
                          "will-change-transform"
                        )}
                        style={{
                          width: index === index ? undefined : undefined, // no-op (évite warning)
                        }}
                      >
                        {/* Enveloppe = augmente hauteur + reveal premium */}
                        <div
                          className={cx(
                            "transition-[transform,opacity,filter] duration-500",
                            reveal
                              ? "opacity-100 translate-y-0 scale-100 blur-0"
                              : "opacity-0 translate-y-3 scale-[0.985] blur-[1px]"
                          )}
                          style={{
                            height: CARD_H,
                          }}
                        >
                          <div
                            className={cx(
                              "h-full rounded-2xl",
                              partner.isActive ? "ring-2 ring-sky-300/70" : "ring-1 ring-black/5 dark:ring-white/10"
                            )}
                            style={
                              partner.isActive
                                ? { boxShadow: `0 18px 60px ${hexToRgba(MIRADIA.sky, 0.18)}` }
                                : undefined
                            }
                          >
                            <PartnerStandardCard {...partner} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="text-center md:text-left">
                Survolez pour mettre en pause • Cliquez sur une carte pour visiter le site du partenaire (si disponible).
              </div>

              {SHOW_CTA && (
                <a
                  href="#"
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold
                             bg-white/80 hover:bg-white ring-1 ring-black/5
                             dark:bg-white/5 dark:hover:bg-white/10 dark:ring-white/10
                             transition"
                >
                  Voir tous les partenaires
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
