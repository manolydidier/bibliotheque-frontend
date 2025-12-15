import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaUsers,
  FaFileAlt,
  FaBookOpen,
  FaImages,
} from "react-icons/fa";
import axios from "axios";

/**
 * MiradiaLanding.jsx
 * - Page complète (single file) incluant un Slider stylisé dans l'esprit du reste du design.
 * - Le Slider est défini en dessous et rendu dans la colonne de droite du Hero.
 *
 * Remarque : ce fichier suppose l'utilisation de TailwindCSS (comme dans ton exemple).
 */

/* ---------------------------
   Slider (composant interne)
   --------------------------- */
const SLIDES = [
  {
    id: 1,
    title: "Préparer un atelier ou une réunion en 10 minutes",
    description:
      "Retrouvez rapports, notes et présentations pour construire l’ordre du jour, illustrer les échanges et envoyer un compte rendu complet.",
    stat: "Dossiers prêts",
    tag: "Animation",
    icon: FaFileAlt,
    color: "linear-gradient(90deg,#34D399,#10B981)",
    image:
      "https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=1600",
  },
  {
    id: 2,
    title: "Accueillir et former les nouvelles équipes",
    description:
      "Guides méthodologiques, fiches réflexes et vidéos pour faciliter l’intégration et l’appropriation des pratiques locales.",
    stat: "Guides-clés",
    tag: "Onboarding",
    icon: FaBookOpen,
    color: "linear-gradient(90deg,#60A5FA,#6366F1)",
    image:
      "https://images.pexels.com/photos/3184306/pexels-photo-3184306.jpeg?auto=compress&cs=tinysrgb&w=1600",
  },
  {
    id: 3,
    title: "Partager les résultats avec les partenaires",
    description:
      "Espaces sécurisés pour partager rapports, albums photos et notes de capitalisation avec partenaires et bailleurs.",
    stat: "Partage sécurisé",
    tag: "Partenaires",
    icon: FaImages,
    color: "linear-gradient(90deg,#06B6D4,#0EA5E9)",
    image:
      "https://images.pexels.com/photos/669610/pexels-photo-669610.jpeg?auto=compress&cs=tinysrgb&w=1600",
  },
];

const FADE = 700;
const DURATION = 9000;

function Slider({ totalUsers: totalUsersProp = 0 }) {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const [usersTotal, setUsersTotal] = useState(totalUsersProp || 0);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const rafRef = useRef(null);
  const startRef = useRef(null);
  const timeoutRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (totalUsersProp && Number(totalUsersProp) > 0) {
      setUsersTotal(totalUsersProp);
      return;
    }
    setLoadingUsers(true);
    let canceled = false;
    axios
      .get("/stats/users-count")
      .then((res) => {
        if (canceled || !mountedRef.current) return;
        const v = Number(res?.data?.count || 0);
        setUsersTotal(v);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setUsersTotal(0);
      })
      .finally(() => {
        if (!canceled && mountedRef.current) setLoadingUsers(false);
      });
    return () => {
      canceled = true;
    };
  }, [totalUsersProp]);

  const displayedUsers = loadingUsers ? "…" : new Intl.NumberFormat("fr-FR").format(Number(usersTotal || 0));

  const changeTo = useCallback(
    (idx) => {
      setPrev(current);
      // clear prev after fade
      setTimeout(() => {
        if (!mountedRef.current) return;
        setPrev(null);
      }, FADE);
      setCurrent(idx);
    },
    [current]
  );

  useEffect(() => {
    if (paused) return;

    timeoutRef.current = setTimeout(() => {
      changeTo((current + 1) % SLIDES.length);
    }, DURATION);

    startRef.current = performance.now();
    const loop = (t) => {
      const elapsed = t - startRef.current;
      const pct = Math.min(elapsed / DURATION, 1);
      setProgress(pct * 100);
      if (pct < 1 && !paused) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [current, paused, changeTo]);

  const next = useCallback(() => changeTo((current + 1) % SLIDES.length), [current, changeTo]);
  const prevSlide = useCallback(() => changeTo((current - 1 + SLIDES.length) % SLIDES.length), [current, changeTo]);
  const goTo = useCallback((i) => changeTo(i), [changeTo]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prevSlide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prevSlide]);

  const handleEnter = () => setPaused(true);
  const handleLeave = () => setPaused(false);

  const tiltStyle = useRef({ transform: "perspective(1000px)" });
  const [tilt, setTilt] = useState(tiltStyle.current);

  const onMove = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const rx = (0.5 - y) * 6;
    const ry = (x - 0.5) * 8;
    setTilt({
      transform: `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`,
      transition: "transform 120ms linear",
    });
  };

  const visible = [prev, current].filter((i) => i !== null && i !== undefined);

  return (
    <div
      className="relative w-full h-full"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseMove={onMove}
      style={tilt}
    >
      <div className="absolute inset-0 rounded-2xl pointer-events-none" aria-hidden />
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/95 shadow-xl">
        {/* Layers (prev + current) */}
        {visible.map((i) => {
          const slide = SLIDES[i];
          if (!slide) return null;
          const Icon = slide.icon;
          const active = i === current;

          return (
            <article
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-[${FADE}ms] ease-in-out ${active ? "opacity-100 z-20" : "opacity-0 z-10"}`}
              aria-hidden={!active}
            >
              {/* background image */}
              <div
                className="absolute inset-0 bg-cover bg-center filter saturate-[1.05] contrast-[0.98] transform scale-[1.02]"
                style={{ backgroundImage: `url(${slide.image})` }}
                aria-hidden
              />

              {/* gradient overlay to keep text readable */}
              <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-slate-900/85 via-slate-900/50 to-transparent" />

              {/* Content */}
              <div className="relative z-30 p-5 md:p-6 lg:p-8 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full bg-slate-800/60 border border-white/5 text-xs text-white/90">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-semibold">{slide.tag}</span>
                    </div>
                    <div className="text-xs text-white/80 font-medium">
                      {String(i + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
                    </div>
                  </div>

                  <h3 className="mt-4 text-lg md:text-2xl lg:text-3xl font-extrabold text-white leading-tight max-w-2xl">
                    {slide.title}
                  </h3>
                  <p className="mt-3 text-sm md:text-base text-white/90 max-w-2xl leading-relaxed">
                    {slide.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex gap-3 items-center flex-wrap">
                    <span
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold text-white"
                      style={{ background: slide.color }}
                    >
                      <Icon />
                      <span>{slide.stat}</span>
                    </span>

                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/30 text-sm text-white/90 border border-white/10">
                      <FaUsers />
                      <span>{displayedUsers} utilisateurs</span>
                    </span>
                  </div>

                  <div className="ml-auto flex items-center gap-3">
                    <div className="flex items-center gap-2" aria-hidden>
                      <button
                        onClick={prevSlide}
                        className="w-9 h-9 rounded-full bg-slate-800/60 border border-white/5 flex items-center justify-center hover:bg-slate-800/80 transition"
                        aria-label="Slide précédent"
                        type="button"
                      >
                        <FaChevronLeft className="text-white text-xs" />
                      </button>
                      <button
                        onClick={next}
                        className="w-9 h-9 rounded-full bg-slate-800/60 border border-white/5 flex items-center justify-center hover:bg-slate-800/80 transition"
                        aria-label="Slide suivant"
                        type="button"
                      >
                        <FaChevronRight className="text-white text-xs" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {SLIDES.map((s, idx) => (
                        <button
                          key={s.id}
                          onClick={() => goTo(idx)}
                          aria-pressed={idx === current}
                          aria-label={`Aller au slide ${idx + 1}`}
                          className={`h-2.5 rounded-full transition-all ${idx === current ? "w-8 bg-white" : "w-2.5 bg-white/30 hover:bg-white/60"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="h-1 rounded-full bg-white/6 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-[width] ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------
   Page principale MiradiaLanding
   --------------------------- */
export default function MiradiaLanding() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 antialiased">
      {/* Background gradients */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#0b1220_0,_#020617_60%)]" />
        <div className="absolute -top-40 -left-40 w-[420px] h-[420px] rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[420px] h-[420px] rounded-full bg-sky-500/20 blur-3xl" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full p-[2px] bg-[conic-gradient(from_180deg,#22c55e,#0ea5e9,#6366f1,#22c55e)] shadow-[0_0_20px_rgba(34,197,94,0.36)]">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-xs font-semibold tracking-[0.18em] text-emerald-300 uppercase">
                Mi
              </div>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium text-slate-50">
                Plateforme MIRADIA
              </span>
              <span className="text-[11px] text-slate-400">
                Résilience &amp; finance climatique à Madagascar
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs text-slate-300">
            <a href="#vision" className="hover:text-white transition">
              Vision
            </a>
            <a href="#domains" className="hover:text-white transition">
              Domaines
            </a>
            <a href="#beneficiaries" className="hover:text-white transition">
              Bénéficiaires
            </a>
            <a href="#governance" className="hover:text-white transition">
              Gouvernance
            </a>
            <a href="#contact" className="hover:text-white transition">
              Contact
            </a>
          </nav>

          <button className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-950 shadow-[0_16px_40px_rgba(16,185,129,0.4)] hover:bg-emerald-400 transition">
            Rejoindre la plateforme
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4">
        {/* HERO */}
        <section className="py-10 md:py-14 grid md:grid-cols-[1.15fr,1fr] gap-10 items-center">
          {/* Left column */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/5 px-3 py-1 text-[11px] text-emerald-300 mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Lancement MIRADIA • 04 juillet 2025, Hôtel Panorama
            </div>

            <h1 className="text-3xl md:text-[2.6rem] font-semibold tracking-tight leading-tight mb-3">
              Une plateforme pour{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-300 bg-clip-text text-transparent">
                structurer la finance des risques climatiques
              </span>{" "}
              à Madagascar.
            </h1>

            <p className="text-sm md:text-[15px] text-slate-300/90 leading-relaxed max-w-xl mb-4">
              MIRADIA coordonne les acteurs publics, privés et communautaires pour
              développer des <strong>mécanismes de financement et d’assurance</strong>{" "}
              face aux aléas climatiques : CDRFI, filets de sécurité et solutions
              inclusives pour les populations vulnérables.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-5">
              <button className="inline-flex items-center gap-2 rounded-full bg-white text-slate-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-[0_16px_40px_rgba(15,23,42,0.7)] hover:bg-slate-100 transition">
                Voir les domaines d’intervention
                <span className="text-slate-500 text-xs">↗</span>
              </button>
              <button className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 hover:text-white transition">
                Télécharger la note de cadrage
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-[11px] text-slate-400/90">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                CDRFI, genre &amp; droits humains, gouvernance
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                Vision 2040 : couverture financière inclusive
              </div>
            </div>
          </div>

          {/* Right column – Slider */}
          <div className="relative">
            <div className="absolute -top-10 -right-6 h-24 w-24 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-sky-500/20 blur-3xl" />

            <div className="relative rounded-3xl border border-slate-800/80 p-3 md:p-4">
              <Slider />
            </div>
          </div>
        </section>

        {/* LOGOS / PARTENAIRES */}
        <section className="py-4 border-t border-slate-800/60 border-b mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-400/90">
            <span className="uppercase tracking-[0.18em] text-slate-500">
              Portée par
            </span>
            <div className="flex flex-wrap items-center gap-5">
              <span className="px-2 py-1 rounded-full border border-slate-800/80 bg-slate-900/60">
                Société civile &amp; OSC
              </span>
              <span className="px-2 py-1 rounded-full border border-slate-800/80 bg-slate-900/60">
                Acteurs publics &amp; collectivités
              </span>
              <span className="px-2 py-1 rounded-full border border-slate-800/80 bg-slate-900/60">
                Partenaires techniques &amp; financiers
              </span>
            </div>
          </div>
        </section>

        {/* DOMAINES D’INTERVENTION */}
        <section id="domains" className="py-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold mb-2">
                Domaines d’intervention de MIRADIA
              </h2>
              <p className="text-sm text-slate-300/90 max-w-xl">
                Une architecture qui reflète la complexité des risques climatiques :
                gouvernance, plaidoyer, technique, genre &amp; droits humains, levée de
                fonds.
              </p>
            </div>
            <div className="text-[11px] text-slate-400">
              Vision 2040 • Couverture financière inclusive
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-300/90">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/40 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                  Plaidoyer
                </span>
              </div>
              <ul className="space-y-1 text-[13px]">
                <li>
                  Renforcement de la <strong>gouvernance</strong> et des politiques
                  publiques favorables au développement du CDRFI.
                </li>
                <li>
                  Accès aux <strong>financements climatiques</strong> internationaux.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/40 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-fuchsia-200">
                  Genre &amp; droits humains
                </span>
              </div>
              <ul className="space-y-1 text-[13px]">
                <li>
                  Intégration systématique du <strong>genre</strong> dans les stratégies.
                </li>
                <li>
                  Approche centrée sur les <strong>droits humains</strong> et l’inclusion.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/40 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-sky-200">
                  Technique
                </span>
              </div>
              <ul className="space-y-1 text-[13px]">
                <li>
                  Recherche et <strong>diversification</strong> des solutions CDRFI.
                </li>
                <li>
                  Développement de mécanismes de <strong>financement inclusifs</strong>.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/40 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-200">
                  Levée de fonds
                </span>
              </div>
              <ul className="space-y-1 text-[13px]">
                <li>
                  Mobilisation de <strong>financements climatiques</strong> pour projets.
                </li>
                <li>
                  Construction de <strong>partenariats stratégiques</strong> avec institutions.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* BENEFICIAIRES */}
        <section id="beneficiaries" className="py-10 border-t border-slate-800/60">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold mb-2">
                Les publics prioritaires de MIRADIA
              </h2>
              <p className="text-sm text-slate-300/90 max-w-xl">
                Les mécanismes de finance des risques climatiques doivent prioritairement
                bénéficier aux populations les plus exposées.
              </p>
            </div>
            <div className="text-[11px] text-slate-400">
              Communautés, agriculteurs, femmes, jeunes, personnes en situation de handicap…
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-[13px] text-slate-300/90">
            {[
              {
                title: "Communautés locales",
                text: "Zones rurales et urbaines vulnérables aux aléas climatiques et aux catastrophes.",
              },
              {
                title: "Agriculteurs, éleveurs, pêcheurs",
                text: "Acteurs dont les moyens de subsistance dépendent directement des ressources naturelles.",
              },
              {
                title: "Personnes en situation de handicap",
                text: "Public souvent exclu des dispositifs classiques de financement et d’assurance.",
              },
              {
                title: "Femmes & jeunes",
                text: "Acteurs clés de la transformation sociale, mais confrontés à de fortes inégalités d’accès.",
              },
              {
                title: "Populations vulnérables",
                text: "Personnes exposées à la pauvreté, à l’insécurité alimentaire et aux chocs répétés.",
              },
              {
                title: "Institutions locales",
                text: "Collectivités et structures locales chargées de la gestion des risques et des réponses.",
              },
            ].map((b, i) => (
              <div
                key={b.title}
                className="relative rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
              >
                <span className="absolute right-4 top-3 text-[11px] text-slate-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-sm font-semibold mb-1 text-slate-50">
                  {b.title}
                </h3>
                <p className="leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* GOUVERNANCE */}
        <section id="governance" className="py-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold mb-2">
                Une gouvernance multi-acteurs
              </h2>
              <p className="text-sm text-slate-300/90 max-w-xl">
                Trois organes complémentaires garantissent la légitimité, la redevabilité et l’efficacité des actions.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-[13px] text-slate-300/90">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-sm font-semibold mb-2 text-slate-50">
                Assemblée Générale (AG)
              </h3>
              <p>
                Instance souveraine qui fixe les grandes orientations et élit le Conseil d’Administration.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-sm font-semibold mb-2 text-slate-50">
                Conseil d’Administration (CA)
              </h3>
              <p>
                Assure la <strong>coordination stratégique</strong> et valide les décisions structurantes.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-sm font-semibold mb-2 text-slate-50">
                Organe Exécutif &amp; CCIE
              </h3>
              <p>
                Organe opérationnel appuyé par un Comité Consultatif Interne &amp; Externe pour l’expertise technique.
              </p>
            </div>
          </div>
        </section>

        {/* CONTACT / CTA */}
        <section
          id="contact"
          className="py-10 border-t border-slate-800/60 mb-8 flex flex-col md:flex-row items-center gap-6"
        >
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-semibold mb-2">
              Intéressé pour collaborer avec MIRADIA ?
            </h2>
            <p className="text-sm text-slate-300/90 max-w-xl mb-4">
              Que vous soyez ministère, collectivité, OSC ou partenaire financier, la plateforme est ouverte à la co-construction d’initiatives CDRFI.
            </p>
            <div className="flex flex-wrap gap-3 text-[12px] text-slate-300">
              <span className="px-3 py-1 rounded-full border border-slate-700 bg-slate-900/80">
                Inclusion financière
              </span>
              <span className="px-3 py-1 rounded-full border border-slate-700 bg-slate-900/80">
                Assurance agricole &amp; climatique
              </span>
              <span className="px-3 py-1 rounded-full border border-slate-700 bg-slate-900/80">
                Gouvernance &amp; plaidoyer
              </span>
            </div>
          </div>

          <div className="flex-1 max-w-md w-full">
            <form className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 space-y-3 text-[13px]">
              <div className="space-y-1">
                <label className="text-slate-300 text-xs">
                  Nom &amp; organisation
                </label>
                <input
                  type="text"
                  placeholder="Ex. : Aina — Ministère / ONG / Collectivité"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 text-xs">Email</label>
                <input
                  type="email"
                  placeholder="vous@organisation.org"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 text-xs">Message</label>
                <textarea
                  rows={3}
                  placeholder="Expliquez en quelques lignes votre intérêt / votre projet CDRFI..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-y"
                />
              </div>
              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 text-slate-950 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-[0_16px_40px_rgba(16,185,129,0.5)] hover:bg-emerald-400 transition"
              >
                Envoyer le message
              </button>
              <p className="text-[11px] text-slate-500">
                Cette section est un exemple de formulaire. Tu pourras la connecter à
                ton back-end (Laravel, Node, etc.).
              </p>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>© {new Date().getFullYear()} Plateforme MIRADIA.</span>
          <span>
            Design inspiré de Hyperswitch, contenu adapté à la finance des risques climatiques à Madagascar.
          </span>
        </div>
      </footer>
    </div>
  );
}