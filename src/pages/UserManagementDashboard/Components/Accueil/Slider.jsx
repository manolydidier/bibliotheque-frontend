// src/pages/UserManagementDashboard/Components/Accueil/Slider.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaFileAlt,
  FaBookOpen,
  FaImages,
  FaUsers,
} from "react-icons/fa";
import axios from "axios";

// Formatter simple style FR
const formatNumber = (n) =>
  new Intl.NumberFormat("fr-FR").format(Number(n || 0));

// Slides orientées "Bibliothèque en ligne"
const SLIDES = [
  {
    id: 1,
    title: "Préparer un atelier ou une réunion en 10 minutes",
    description:
      "Depuis la bibliothèque en ligne, les équipes retrouvent en quelques clics les derniers rapports, notes de cadrage, présentations et photos pour construire l’ordre du jour, illustrer les échanges et envoyer un compte rendu complet aux participants.",
    stat: "Dossiers d’atelier prêts",
    tag: "Animation & plaidoyer",
    icon: FaFileAlt,
    color: "#2563eb",
    image:
      "https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=1600",
  },
  {
    id: 2,
    title: "Accueillir et former les nouvelles équipes",
    description:
      "La bibliothèque en ligne sert de point d’entrée pour les nouveaux collaborateurs : guides méthodologiques, procédures internes, fiches réflexes terrain, vidéos de formation… Tout est regroupé pour faciliter l’intégration et l’appropriation des programmes.",
    stat: "Guides & fiches clés",
    tag: "Nouvelles recrues",
    icon: FaBookOpen,
    color: "#8b5cf6",
    image:
      "https://images.pexels.com/photos/3184306/pexels-photo-3184306.jpeg?auto=compress&cs=tinysrgb&w=1600",
  },
  {
    id: 3,
    title: "Partager les résultats avec les partenaires",
    description:
      "La bibliothèque en ligne permet de créer des espaces de partage avec les partenaires : rapports synthétiques, albums photos des missions, notes de capitalisation et supports de présentation pour les comités de pilotage et les revues de projets.",
    stat: "Partage sécurisé",
    tag: "Partenaires & bailleurs",
    icon: FaImages,
    color: "#0ea5e9",
    image:
      "https://images.pexels.com/photos/669610/pexels-photo-669610.jpeg?auto=compress&cs=tinysrgb&w=1600",
  },
];

const FADE_DURATION = 800; // ms (durée du fondu)
const SLIDE_DURATION = 9000; // ms (durée d'affichage d'un slide)

export default function Slider({ totalUsers: totalUsersProp = 0 }) {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState(null); // index de l’ancien slide pendant le fondu
  const [tiltStyle, setTiltStyle] = useState({
    transform: "perspective(1400px)",
  });
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0); // 0–100 %

  // 🔢 compteur utilisateurs (API + override via prop)
  const [usersTotal, setUsersTotal] = useState(totalUsersProp || 0);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Si on reçoit déjà une valeur du parent, on l'utilise
    if (totalUsersProp && Number(totalUsersProp) > 0) {
      setUsersTotal(totalUsersProp);
      return () => {
        mounted = false;
      };
    }

    setUsersLoading(true);
    axios
      .get("/stats/users-count")
      .then((r) => {
        if (!mounted) return;
        const total = Number(r?.data?.count || 0);
        setUsersTotal(total);
      })
      .catch(() => {
        if (!mounted) return;
        setUsersTotal(0);
      })
      .finally(() => {
        if (mounted) setUsersLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [totalUsersProp]);

  const displayedUsers = usersLoading
    ? "…"
    : formatNumber(usersTotal || 0);

  // Helper pour lancer une transition avec cross-fade
  const changeSlide = useCallback((getNextIndex) => {
    setCurrent((prevIndex) => {
      const nextIndex = getNextIndex(prevIndex);
      setPrev(prevIndex);

      // Nettoyage de l'ancien slide après le fondu
      setTimeout(() => {
        setPrev((prevVal) => (prevVal === prevIndex ? null : prevVal));
      }, FADE_DURATION);

      return nextIndex;
    });
  }, []);

  // Auto-play piloté par current + isHovered
  useEffect(() => {
    if (isHovered) return; // pause au survol

    const timer = setTimeout(() => {
      changeSlide((prevIndex) => (prevIndex + 1) % SLIDES.length);
    }, SLIDE_DURATION);

    return () => clearTimeout(timer);
  }, [current, isHovered, changeSlide]);

  // Progress bar sync avec SLIDE_DURATION et pause au survol
  useEffect(() => {
    setProgress(0);
    if (isHovered) return;

    let animationFrameId;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const ratio = Math.min(elapsed / SLIDE_DURATION, 1);
      setProgress(ratio * 100);

      if (ratio < 1 && !isHovered) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [current, isHovered]);

  const goNext = () =>
    changeSlide((prevIndex) => (prevIndex + 1) % SLIDES.length);

  const goPrev = () =>
    changeSlide(
      (prevIndex) => (prevIndex - 1 + SLIDES.length) % SLIDES.length
    );

  const goTo = (index) => changeSlide(() => index);

  // Navigation clavier (← →)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const midX = rect.width / 2;
    const midY = rect.height / 2;

    const rotateX = ((y - midY) / midY) * -6;
    const rotateY = ((x - midX) / midX) * 6;

    setTiltStyle({
      transform: `perspective(1400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      transition: "transform 0.12s ease-out",
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTiltStyle({
      transform: "perspective(1400px) rotateX(0deg) rotateY(0deg)",
      transition: "transform 0.5s ease-out",
    });
    setTimeout(() => {
      setTiltStyle({
        transform: "perspective(1400px)",
      });
    }, 500);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  // Liste des index à afficher (ancien + actuel) pour le cross-fade
  const visibleIndexes = [prev, current].filter(
    (idx) => idx !== null && idx !== undefined
  );

  return (
    <section
      className="mt-12 relative w-full bg-gradient-to-br from-blue-50 via-white to-blue-50 text-slate-800 overflow-hidden py-8 md:py-10"
      role="region"
      aria-roledescription="carousel"
      aria-label="Usages de la bibliothèque en ligne"
    >
      {/* Animations + styles "liquid glass" */}
      <style>
        {`
          /* ---------- Cross-fade global des slides ---------- */
          @keyframes sliderFadeIn {
            0%   { opacity: 0; transform: translateY(4px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes sliderFadeOut {
            0%   { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-4px); }
          }

          @keyframes floatSlow {
            0%   { transform: translateY(0); }
            50%  { transform: translateY(18px); }
            100% { transform: translateY(0); }
          }
          @keyframes imageZoom {
            0% { transform: scale(1.02); }
            50% { transform: scale(1.06); }
            100% { transform: scale(1.02); }
          }

          .bubble-1 {
            animation: floatSlow 16s ease-in-out infinite;
          }
          .bubble-2 {
            animation: floatSlow 20s ease-in-out infinite;
            animation-direction: alternate;
          }

          .slide-img {
            background-size: cover;
            background-position: center;
            filter: none;
            animation: imageZoom 22s ease-in-out infinite;
            will-change: transform, filter;
          }

          /* 💧 Card principale façon "liquid glass" */
          .glass-card {
            background:
              radial-gradient(circle at top left, rgba(255,255,255,0.55), rgba(148,163,184,0.15)),
              linear-gradient(135deg, rgba(15,23,42,0.60), rgba(30,64,175,0.35));
            backdrop-filter: blur(22px) saturate(140%);
            -webkit-backdrop-filter: blur(22px) saturate(140%);
            border: 1px solid rgba(255,255,255,0.35);
            box-shadow: none;
          }

          /* 💧 Bloc texte glass */
          .glass-panel {
            background:
              radial-gradient(circle at top left, rgba(255,255,255,0.45), rgba(255,255,255,0.50));
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            border: 1px solid rgba(148,163,184,0.35);
          }

          /* Couches superposées pour le cross-fade */
          .slider-layer {
            position: absolute;
            inset: 0;
          }
          .slider-layer-current {
            z-index: 2;
            animation: sliderFadeIn ${FADE_DURATION}ms ease-in-out forwards;
          }
          .slider-layer-prev {
            z-index: 1;
            animation: sliderFadeOut ${FADE_DURATION}ms ease-in-out forwards;
          }
        `}
      </style>

      {/* Bulles décoratives */}
      <div className="pointer-events-none absolute -top-24 -left-10 w-80 h-80 rounded-full bg-blue-300/20 blur-3xl bubble-1" />
      <div className="pointer-events-none absolute -bottom-32 -right-10 w-96 h-96 rounded-full bg-blue-300/20 blur-3xl bubble-2" />

      {/* Container large */}
      <div className="relative max-w-screen-2xl mx-auto px-2 md:px-4 lg:px-6 pb-12 md:pb-16">
        {/* En-tête */}
        <div className="mb-8 md:mb-10 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-3">
            Votre bibliothèque en ligne, en trois usages clés
          </h2>
          <div className="w-36 h-1 bg-slate-900 mx-auto mb-4" />
          <p className="text-xs md:text-sm text-slate-600 max-w-2xl mx-auto">
            Une seule bibliothèque en ligne pour préparer vos ateliers, former
            les équipes et partager les résultats avec les partenaires.
          </p>
        </div>

        {/* Carte principale */}
        <div
          className="relative h-[460px] md:h-[560px] lg:h-[640px] flex items-center justify-center"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleMouseEnter}
        >
          <div className="relative w-full h-full" style={tiltStyle}>
            {/* Bordure dégradée externe */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-400/30 via-cyan-300/20 to-blue-500/30" />

            {/* 💧 Une seule glass-card pour tout le slider */}
            <div className="absolute inset-[2px] rounded-[24px] glass-card overflow-hidden">
              {/* Couches superposées (ancien + actuel) */}
              {visibleIndexes.map((index) => {
                const slide = SLIDES[index];
                const Icon = slide.icon;
                const isActive = index === current;

                return (
                  <div
                    key={slide.id}
                    className={
                      "slider-layer " +
                      (isActive ? "slider-layer-current" : "slider-layer-prev")
                    }
                    aria-hidden={!isActive}
                  >
                    {/* Image de fond */}
                    <div className="absolute inset-0">
                      <div
                        className="absolute inset-0 slide-img"
                        style={{
                          backgroundImage: `url(${slide.image})`,
                        }}
                      />
                      {/* Overlay seulement sur la zone de texte (gauche) */}
                      <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-slate-900/75 via-slate-900/40 to-transparent" />
                    </div>

                    {/* Contenu */}
                    <div className="relative z-10 h-full flex flex-col px-6 md:px-10 lg:px-12 py-6 md:py-8">
                      {/* Partie haute : tag, texte, badges */}
                      <div className="flex-1 flex flex-col md:gap-4 lg:gap-5 h-[100%] justify-between">
                        {/* Ligne du haut : tag + compteur */}
                        <div className="flex items-center justify-between">
                          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 border border-white/30 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="font-semibold">
                              {slide.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-100/80 font-medium">
                            {String(current + 1).padStart(2, "0")} /{" "}
                            {String(SLIDES.length).padStart(2, "0")}
                          </p>
                        </div>

                        {/* Bloc texte glass */}
                        <div className="max-w-2xl glass-panel rounded-2xl px-4 py-3 md:px-6 md:py-5 pb-5">
                          <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1.5 text-white pb-5">
                            {slide.title}
                          </h3>
                          <p className="text-xs md:text-sm text-white leading-relaxed">
                            {slide.description}
                          </p>
                        </div>

                        {/* Badges / stats */}
                        <div className="flex flex-wrap gap-2 items-center">
                          <span
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white"
                            style={{ backgroundColor: slide.color }}
                          >
                            <Icon className="text-xs" />
                            {slide.stat}
                          </span>
                          <span className="px-3 py-1.5 rounded-full bg-slate-900/40 border border-white/20 text-[11px] text-slate-100">
                            {slide.tag}
                          </span>

                          {/* 👉 Stat Dashboard-like : utilisateurs inscrits */}
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/30 border border-white/20 text-[11px] text-slate-50 ml-auto">
                            <FaUsers className="text-xs" />
                            <span>
                              {displayedUsers}{" "}
                              <span className="opacity-80">
                                utilisateurs inscrits
                              </span>
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Partie basse : contrôles + progress bar */}
                      <div className="mt-4 md:mt-6 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={goPrev}
                              className="w-9 h-9 rounded-full bg-slate-900/60 border border-white/30 flex items-center justify-center hover:bg-slate-900/80 transition-all"
                              aria-label="Slide précédent"
                            >
                              <FaChevronLeft className="text-xs text-white" />
                            </button>
                            <button
                              type="button"
                              onClick={goNext}
                              className="w-9 h-9 rounded-full bg-slate-900/60 border border-white/30 flex items-center justify-center hover:bg-slate-900/80 transition-all"
                              aria-label="Slide suivant"
                            >
                              <FaChevronRight className="text-xs text-white" />
                            </button>
                          </div>

                          {/* Dots */}
                          <div className="flex items-center gap-2">
                            {SLIDES.map((s, idx) => (
                              <button
                                key={s.id}
                                onClick={() => goTo(idx)}
                                className={[
                                  "h-2.5 rounded-full transition-all",
                                  idx === current
                                    ? "w-7 bg-white"
                                    : "w-2.5 bg-slate-300/70 hover:bg-slate-100",
                                ].join(" ")}
                                aria-label={`Aller au slide ${idx + 1}`}
                                aria-pressed={idx === current}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Barre de progression très discrète */}
                        <div className="w-full h-[3px] bg-slate-900/15 rounded-full overflow-hidden backdrop-blur-[1px]">
                          <div
                            className="h-full bg-white/50 rounded-full transition-[width] duration-150 ease-out"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
