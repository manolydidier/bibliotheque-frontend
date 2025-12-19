// ✅ src/pages/.../Objectif.jsx
// ✅ Objectif ENTIER = CMS Laravel si publié, sinon fallback = ton design

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaCrosshairs,
  FaRegLightbulb,
  FaHandshake,
  FaBalanceScale,
  FaCheckCircle,
  FaBullseye,
} from "react-icons/fa";
import axios from "axios";
import CmsSectionRenderer from "../../UserManagementDashboard/Components/Backoffice/Miradia/cms/CmsSectionRenderer";

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

const hexToRgba = (hex, a = 0.18) => {
  const h = String(hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
};

const BG_BY_SECTION = {
  vision:
    "https://images.unsplash.com/photo-1764259181959-df603a53b48b?fm=jpg&ixlib=rb-4.1.0&q=60&w=3000",
  mission:
    "https://images.unsplash.com/photo-1748609160056-7b95f30041f0?fm=jpg&ixlib=rb-4.1.0&q=60&w=3000",
  valeurs:
    "https://images.unsplash.com/photo-1704386651981-0729a60da579?fm=jpg&ixlib=rb-4.1.0&q=60&w=3000",
};

const DEFAULT_BG = BG_BY_SECTION.vision;
const DEFAULT_LOGO = "/images/miradia/miradia-logo.png";

/* ✅ ID CMS “OBJECTIF ENTIER” */
const CMS_OBJECTIF_ID = 1;

// ✅ Objectif-specific reset (anti gros vide)
const CMS_RESET = `
  html, body { margin: 0 !important; padding: 0 !important; }
  body { min-height: auto !important; height: auto !important; }
  body > *:last-child { margin-bottom: 0 !important; padding-bottom: 0 !important; }
`;

// ✅ Objectif-specific patch CSS (fix sticky bg -z-10 + isolate root)
// (Tu peux changer les selectors si ton HTML CMS change)
const OBJECTIF_PATCH_CSS = `
  #mrd-objectif{ position:relative; z-index:0; isolation:isolate; }
  #mrd-stickybg{ z-index:0 !important; }
`;

// ✅ optional BG fallback when allowJs=false
const objectifBgFallbackTemplate = (pick) => `
  #mrd-bg-image{
    // background-image:${pick("vision")} !important;
    background-size:cover !important;
    background-position:center !important;
  }
  .mrd-card-bg[data-bg="vision"]{ background-image:${pick("vision")} !important; }
  .mrd-card-bg[data-bg="mission"]{ background-image:${pick("mission")} !important; }
  .mrd-card-bg[data-bg="valeurs"]{ background-image:${pick("valeurs")} !important; }
`;

function StickyBg({ src = DEFAULT_BG }) {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div
        className={cx("absolute inset-0 bg-center bg-cover", "md:bg-fixed", "transition-[background-image] duration-700")}
        style={{
          backgroundImage: src ? `url(${src})` : "none",
          backgroundAttachment: "fixed",
          filter: "contrast(1.04) saturate(1.05)",
        }}
      />
      <div className="absolute inset-0 bg-black/10 dark:bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/45 to-white/70 dark:from-[#050A12]/40 dark:via-[#050A12]/55 dark:to-[#050A12]/70" />
      <div
        className="absolute inset-0 opacity-70 dark:opacity-55"
        style={{
          background: `
            radial-gradient(circle at 15% 10%, ${hexToRgba(MIRADIA.sky, 0.26)}, transparent 55%),
            radial-gradient(circle at 90% 25%, ${hexToRgba(MIRADIA.green, 0.20)}, transparent 60%),
            radial-gradient(circle at 55% 120%, ${hexToRgba(MIRADIA.yellow, 0.16)}, transparent 60%)
          `,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.06] dark:opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}

function useInViewRepeat({ threshold = 0.08, rootMargin = "0px 0px -20% 0px" } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(([entry]) => setInView(!!entry?.isIntersecting), {
      threshold,
      root: null,
      rootMargin,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin]);

  return [ref, inView];
}

function useActiveSection(sectionRefs) {
  const [active, setActive] = useState("vision");

  useEffect(() => {
    const els = Object.entries(sectionRefs)
      .map(([key, r]) => ({ key, el: r?.current }))
      .filter((x) => x.el);

    if (!els.length || typeof IntersectionObserver === "undefined") return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
        if (visible?.target?.dataset?.sec) setActive(visible.target.dataset.sec);
      },
      { threshold: [0.15, 0.25, 0.4], rootMargin: "-18% 0px -58% 0px" }
    );

    els.forEach(({ el }) => obs.observe(el));
    return () => obs.disconnect();
  }, [sectionRefs]);

  return [active, setActive];
}

function SectionShortcut({ active, icon: Icon, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "text-left w-full rounded-2xl px-4 py-4",
        "ring-1 transition-all duration-200 backdrop-blur-xl",
        active
          ? "bg-white text-slate-900 ring-black/10 dark:bg-white/10 dark:text-slate-50 dark:ring-white/15"
          : "bg-white/60 text-slate-700 ring-black/5 hover:bg-white/80 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/8"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cx("h-10 w-10 rounded-2xl grid place-items-center", "ring-1 ring-black/5 dark:ring-white/10")}
          style={{ backgroundColor: active ? hexToRgba(MIRADIA.sky, 0.18) : "rgba(255,255,255,0.55)" }}
        >
          <Icon className="text-slate-900 dark:text-slate-50" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-extrabold leading-tight">{title}</div>
          <div className="mt-1 text-[12px] leading-snug text-slate-500 dark:text-slate-400">{subtitle}</div>
        </div>
      </div>
    </button>
  );
}

function ObjectifTitleBlock({ logo }) {
  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-black/5 dark:ring-white/10">
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
          {logo ? (
            <div className="mx-auto mb-4 h-10 w-auto flex justify-center">
              <img src={logo} alt="MIRADIA" className="h-full w-auto object-contain opacity-90 dark:opacity-95" />
            </div>
          ) : null}

          <div className="inline-flex items-center rounded-full px-4 py-2 text-[11px] font-semibold tracking-[0.22em] uppercase bg-white/85 text-slate-600 ring-1 ring-black/5 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
            Plateforme MIRADIA
          </div>

          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-50">
            Vision, mission & valeurs
          </h2>

          <div className="mx-auto mt-4 h-1 w-28 rounded-full" style={{ background: `linear-gradient(90deg, ${MIRADIA.green}, ${MIRADIA.yellow}, ${MIRADIA.sky})` }} />

          <p className="mt-4 max-w-3xl mx-auto text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Une approche orientée résilience : faciliter l’accès aux outils financiers et à l’assurance face aux risques
            climatiques et catastrophes, de manière équitable et inclusive.
          </p>

          <p className="mt-3 text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Cliquez sur un sous-titre pour naviguer • Le fond change selon la section visible.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Objectif({ logo = DEFAULT_LOGO }) {
  const data = useMemo(
    () => ({
      vision:
        "D’ici 2040, la population malagasy à tous les niveaux bénéficie d’une couverture financière et de mécanisme d’assurance accessible équitable et adaptée favorisant le renforcement de la résilience face aux défis et catastrophes climatiques.",
      mission:
        "Promouvoir la facilitation des accès aux outils financiers et à l’assurance des risques climatiques et des catastrophes afin de renforcer la résilience de la population malagasy.",
      values: ["Excellence", "Engagement inclusif", "Équité", "Redevabilité", "Partenariat"],
    }),
    []
  );

  const API_BASE = useMemo(() => import.meta.env.VITE_BACKEND_URL || window.location.origin, []);
  const [cmsObjectif, setCmsObjectif] = useState({ loading: true, error: "", section: null });

  useEffect(() => {
    const controller = new AbortController();
    const url = `${String(API_BASE).replace(/\/$/, "")}/api/cms-sectionspublic/${CMS_OBJECTIF_ID}`;

    setCmsObjectif({ loading: true, error: "", section: null });

    axios
      .get(url, { headers: { Accept: "application/json" }, signal: controller.signal })
      .then((res) => {
        const json = res.data;
        const okStatus = String(json?.status || "").toLowerCase() === "published";
        if (!okStatus) throw new Error("Section non publiée.");
        setCmsObjectif({ loading: false, error: "", section: json });
      })
      .catch((e) => {
        if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return;
        const msg = e?.response?.status ? `HTTP ${e.response.status}` : e?.message || "Erreur chargement CMS";
        setCmsObjectif({ loading: false, error: msg, section: null });
      });

    return () => controller.abort();
  }, [API_BASE]);

  // fallback design refs
  const visionRef = useRef(null);
  const missionRef = useRef(null);
  const valuesRef = useRef(null);

  const sectionRefs = useMemo(() => ({ vision: visionRef, mission: missionRef, valeurs: valuesRef }), []);
  const [activeSec, setActiveSec] = useActiveSection(sectionRefs);
  const bgImage = BG_BY_SECTION[activeSec] || DEFAULT_BG;

  const scrollTo = (key) => {
    setActiveSec(key);
    const el = sectionRefs[key]?.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const [wrapRef, wrapIn] = useInViewRepeat({ threshold: 0.06, rootMargin: "0px 0px -15% 0px" });
  const [titleRef, titleIn] = useInViewRepeat({ threshold: 0.06, rootMargin: "0px 0px -20% 0px" });

  const [r1, v1] = useInViewRepeat({ threshold: 0.12, rootMargin: "0px 0px -18% 0px" });
  const [r2, v2] = useInViewRepeat({ threshold: 0.12, rootMargin: "0px 0px -18% 0px" });
  const [r3, v3] = useInViewRepeat({ threshold: 0.12, rootMargin: "0px 0px -18% 0px" });

  return (
    <>
      {cmsObjectif.loading ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">Chargement…</div>
      ) : cmsObjectif.section ? (
        // ✅ CMS ENTIER (Objectif-specific props ici)
        <div className="w-full" style={{ lineHeight: 0 }}>
          <CmsSectionRenderer
            mode="iframe"
            html={cmsObjectif.section.html}
            css={cmsObjectif.section.css || ""}
            js={cmsObjectif.section.js}
            heightRenderer="1080px"          // ✅ fixed height pour éviter sauts
            allowJs={false}
            autoHeight={true}                 // ✅ laisse le renderer auto-ajuster
            minHeight={120}
            extraBottom={8}

            // ✅ CSS spécifique Objectif (reset + patch)
            extraCss={`${CMS_RESET}\n${OBJECTIF_PATCH_CSS}`}

            // ✅ fallback BG depuis BG_BY_SECTION dans JS (optionnel)
            cssFallbackFromJs={true}
            bgFallbackCssTemplate={objectifBgFallbackTemplate}

            // ✅ Theme tailwind dark
            syncParentTheme={true}

            className="w-full"
            canvasCssUrls={[import.meta.env.PROD ? "/assets/index.css" : "/src/index.css"]}
            baseHref={String(API_BASE).replace(/\/$/, "") + "/"}
            previewBackground="transparent"
          />
        </div>
      ) : (
        // ✅ FALLBACK: ton design inchangé
        <section className="relative w-full min-h-screen overflow-x-hidden">
          <div className="relative min-h-screen bg-[#eef5fb] dark:bg-gradient-to-b dark:from-[#0B1626] dark:via-[#070F1C] dark:to-[#050A12]">
            <StickyBg src={bgImage} />

            <div className="relative mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-14 md:py-20">
              <div
                ref={wrapRef}
                className={cx(
                  "relative overflow-hidden rounded-[28px] bg-white/70 dark:bg-white/5 backdrop-blur-xl",
                  "ring-1 ring-black/5 dark:ring-white/10",
                  !wrapIn && "opacity-0 translate-y-3",
                  wrapIn && "miradia-enter"
                )}
              >
                <div className="h-1.5 w-full bg-black/5 dark:bg-white/10" />

                <div className="px-6 md:px-10 pt-8 md:pt-10 pb-6 md:pb-8">
                  <div ref={titleRef} className={cx(!titleIn && "opacity-0 translate-y-2", titleIn && "miradia-enter")}>
                    <ObjectifTitleBlock logo={logo} />
                  </div>

                  <div
                    className={cx(
                      "mt-7 grid sm:grid-cols-3 gap-3",
                      !titleIn && "opacity-0 translate-y-2",
                      titleIn && "miradia-enter miradia-delay-120"
                    )}
                  >
                    <SectionShortcut
                      active={activeSec === "vision"}
                      icon={FaRegLightbulb}
                      title="Vision"
                      subtitle="Horizon 2040 • Résilience & équité"
                      onClick={() => scrollTo("vision")}
                    />
                    <SectionShortcut
                      active={activeSec === "mission"}
                      icon={FaCrosshairs}
                      title="Mission"
                      subtitle="Accès • Assurance • Gestion des risques"
                      onClick={() => scrollTo("mission")}
                    />
                    <SectionShortcut
                      active={activeSec === "valeurs"}
                      icon={FaHandshake}
                      title="Valeurs"
                      subtitle="Gouvernance • Transparence • Collaboration"
                      onClick={() => scrollTo("valeurs")}
                    />
                  </div>

                  {cmsObjectif.error ? (
                    <div className="mt-4 text-xs text-rose-600 dark:text-rose-300">CMS error: {cmsObjectif.error}</div>
                  ) : null}
                </div>

                <div className="px-6 md:px-10 pb-10 md:pb-12">
                  <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
                    {/* VISION */}
                    <section ref={visionRef} data-sec="vision" className="scroll-mt-28">
                      <div
                        ref={r1}
                        className={cx(
                          "relative h-full rounded-3xl p-6 md:p-7 overflow-hidden",
                          "bg-white border border-gray-200",
                          "dark:bg-white/5 dark:border-white/10",
                          !v1 && "opacity-0 translate-y-2",
                          v1 && "miradia-enter"
                        )}
                      >
                        <div
                          className="absolute inset-0 opacity-[0.08] pointer-events-none"
                          style={{
                            backgroundImage: `url(${BG_BY_SECTION.vision})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                        <div className="relative">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-11 w-11 rounded-2xl grid place-items-center ring-1 ring-black/5 dark:ring-white/10"
                              style={{ backgroundColor: hexToRgba(MIRADIA.sky, 0.16) }}
                            >
                              <FaRegLightbulb className="text-slate-900 dark:text-slate-50" />
                            </div>
                            <div>
                              <div className="text-[11px] font-black tracking-wide text-slate-500 dark:text-slate-300">NOTRE</div>
                              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-50">Vision</h3>
                            </div>
                          </div>
                          <div className="mt-5 h-1 w-20 rounded-full" style={{ background: `linear-gradient(90deg, ${MIRADIA.sky}, ${MIRADIA.green})` }} />
                          <p className="mt-5 text-sm md:text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed">{data.vision}</p>
                          <div className="mt-6 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <FaBullseye /> Horizon 2040 • Résilience & équité
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* MISSION */}
                    <section ref={missionRef} data-sec="mission" className="scroll-mt-28">
                      <div
                        ref={r2}
                        className={cx(
                          "relative h-full rounded-3xl p-6 md:p-7 overflow-hidden",
                          "bg-white border border-gray-200",
                          "dark:bg-white/5 dark:border-white/10",
                          !v2 && "opacity-0 translate-y-2",
                          v2 && "miradia-enter miradia-delay-80"
                        )}
                      >
                        <div
                          className="absolute inset-0 opacity-[0.08] pointer-events-none"
                          style={{
                            backgroundImage: `url(${BG_BY_SECTION.mission})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                        <div className="relative">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-11 w-11 rounded-2xl grid place-items-center ring-1 ring-black/5 dark:ring-white/10"
                              style={{ backgroundColor: hexToRgba(MIRADIA.green, 0.16) }}
                            >
                              <FaCrosshairs className="text-slate-900 dark:text-slate-50" />
                            </div>
                            <div>
                              <div className="text-[11px] font-black tracking-wide text-slate-500 dark:text-slate-300">NOTRE</div>
                              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-50">Mission</h3>
                            </div>
                          </div>

                          <div className="mt-5 h-1 w-20 rounded-full" style={{ background: `linear-gradient(90deg, ${MIRADIA.green}, ${MIRADIA.yellow})` }} />
                          <p className="mt-5 text-sm md:text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed">{data.mission}</p>
                          <div className="mt-6 text-xs text-slate-500 dark:text-slate-400">Accès • Assurance • Gestion des risques</div>
                        </div>
                      </div>
                    </section>

                    {/* VALEURS */}
                    <section ref={valuesRef} data-sec="valeurs" className="scroll-mt-28">
                      <div
                        ref={r3}
                        className={cx(
                          "relative h-full rounded-3xl p-6 md:p-7 overflow-hidden",
                          "bg-white border border-gray-200",
                          "dark:bg-white/5 dark:border-white/10",
                          !v3 && "opacity-0 translate-y-2",
                          v3 && "miradia-enter miradia-delay-140"
                        )}
                      >
                        <div
                          className="absolute inset-0 opacity-[0.08] pointer-events-none"
                          style={{
                            backgroundImage: `url(${BG_BY_SECTION.valeurs})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                        <div className="relative">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-11 w-11 rounded-2xl grid place-items-center ring-1 ring-black/5 dark:ring-white/10"
                              style={{ backgroundColor: hexToRgba(MIRADIA.yellow, 0.16) }}
                            >
                              <FaHandshake className="text-slate-900 dark:text-slate-50" />
                            </div>
                            <div>
                              <div className="text-[11px] font-black tracking-wide text-slate-500 dark:text-slate-300">NOS</div>
                              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-50">Valeurs</h3>
                            </div>
                          </div>

                          <div className="mt-5 h-1 w-20 rounded-full" style={{ background: `linear-gradient(90deg, ${MIRADIA.yellow}, ${MIRADIA.sky})` }} />

                          <div className="mt-5 flex flex-wrap gap-2">
                            {data.values.map((v) => (
                              <span
                                key={v}
                                className={cx(
                                  "inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold",
                                  "bg-gray-50 text-slate-700 ring-1 ring-black/5",
                                  "dark:bg-white/5 dark:text-slate-200 dark:ring-white/10",
                                  "transition-transform duration-200 hover:-translate-y-[1px]"
                                )}
                              >
                                <FaCheckCircle className="shrink-0" style={{ color: MIRADIA.green }} />
                                {v}
                              </span>
                            ))}
                          </div>

                          <div className="mt-6 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <FaBalanceScale /> Gouvernance • Transparence • Collaboration
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>

                <style>{`
                  @keyframes miradiaIn {
                    0% { opacity: 0; transform: translate3d(0,10px,0); filter: blur(1.5px); }
                    100% { opacity: 1; transform: translate3d(0,0,0); filter: blur(0); }
                  }
                  .miradia-enter { animation: miradiaIn 650ms ease-out both; }
                  .miradia-delay-80 { animation-delay: 80ms; }
                  .miradia-delay-120 { animation-delay: 120ms; }
                  .miradia-delay-140 { animation-delay: 140ms; }
                  @media (prefers-reduced-motion: reduce){
                    .miradia-enter, .miradia-delay-80, .miradia-delay-120, .miradia-delay-140 { animation: none !important; }
                    *{ transition: none !important; animation: none !important; scroll-behavior: auto !important; }
                  }
                `}</style>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
