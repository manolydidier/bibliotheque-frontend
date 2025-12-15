// src/pages/UserManagementDashboard/Components/Accueil/Slider.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaFileAlt,
  FaBookOpen,
  FaUsers,
  FaBalanceScale,
  FaWalking,
  FaImage,
} from "react-icons/fa";

// Base URL pour les images venant de Laravel (storage)
const STORAGE_BASE =
  import.meta.env.VITE_API_BASE_STORAGE ||
  import.meta.env.VITE_API_BASE_URL ||
  window.location.origin;

// Construit l’URL publique de l’image du slide Laravel
const buildSlideImageUrl = (slide) => {
  if (!slide?.image_path) return null;
  const raw = String(slide.image_path).trim();

  // Si le backend renvoie déjà une URL complète
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  const base = STORAGE_BASE.replace(/\/$/, "");
  const path = raw.replace(/^\/?storage\//, "");
  return `${base}/storage/${path}`;
};

// Mapping string => icône
const ICON_MAP = {
  scales: FaBalanceScale,
  walk: FaWalking,
  group: FaUsers,
  file: FaFileAlt,
  book: FaBookOpen,
  image: FaImage,
};

const resolveIcon = (iconKey) => {
  if (!iconKey) return FaFileAlt;
  const k = String(iconKey).toLowerCase();
  return ICON_MAP[k] || FaFileAlt;
};

const FADE_DURATION = 800; // ms (durée du fondu)
const SLIDE_DURATION = 9000; // ms (durée d'affichage d'un slide)

export default function Slider() {
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState(null);
  const [tiltStyle, setTiltStyle] = useState({
    transform: "perspective(1400px)",
  });
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);

  // Chargement depuis Laravel en public (fetch, aucun token)
  useEffect(() => {
    let isMounted = true;

    const fetchSlides = async () => {
      try {
        const res = await fetch("/api/miradia-slides?all=1&per_page=20", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          console.error(
            "Erreur HTTP fetch /miradia-slides:",
            res.status,
            res.statusText
          );
          return;
        }

        const payload = await res.json();

        const raw = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : [];

        if (!isMounted || !raw.length) return;

        const normalized = raw
          .filter((s) => s.is_active !== false)
          .sort(
            (a, b) =>
              Number(a.position ?? 9999) - Number(b.position ?? 9999)
          )
          .map((s, index) => ({
            id: s.id ?? `slide-${index}`,
            title: s.title ?? "",
            description: s.description || "",
            stat: s.stat_label || "",
            tag: s.tag || "",
            icon: resolveIcon(s.icon),
            color: s.color || "#2563eb",
            image: buildSlideImageUrl(s) || null,
          }));

        if (normalized.length && isMounted) {
          setSlides(normalized);
          setCurrent(0);
          setPrev(null);
        }
      } catch (e) {
        console.error(
          "Erreur chargement slides Miradia (Slider accueil):",
          e?.message || e
        );
      }
    };

    fetchSlides();
    return () => {
      isMounted = false;
    };
  }, []);

  // Helper pour la transition
  const changeSlide = useCallback(
    (getNextIndex) => {
      setCurrent((prevIndex) => {
        const total = slides.length || 1;
        const safePrev = typeof prevIndex === "number" ? prevIndex : 0;
        const nextIndex = getNextIndex(safePrev, total) % total;

        setPrev(safePrev);

        setTimeout(() => {
          setPrev((prevVal) => (prevVal === safePrev ? null : prevVal));
        }, FADE_DURATION);

        return nextIndex;
      });
    },
    [slides.length]
  );

  // Auto-play
  useEffect(() => {
    if (isHovered) return;
    if (!slides.length) return;

    const timer = setTimeout(() => {
      changeSlide((prevIndex, total) => (prevIndex + 1) % total);
    }, SLIDE_DURATION);

    return () => clearTimeout(timer);
  }, [current, isHovered, changeSlide, slides.length]);

  // Progress bar
  useEffect(() => {
    setProgress(0);
    if (isHovered) return;
    if (!slides.length) return;

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
  }, [current, isHovered, slides.length]);

  const goNext = () =>
    changeSlide((prevIndex, total) => (prevIndex + 1) % total);

  const goPrev = () =>
    changeSlide((prevIndex, total) => (prevIndex - 1 + total) % total);

  const goTo = (index) =>
    changeSlide((_prevIndex, total) =>
      Math.max(0, Math.min(index, total - 1))
    );

  // Navigation clavier
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

  const visibleIndexes = [prev, current].filter(
    (idx) => idx !== null && idx !== undefined && slides[idx]
  );

  const totalSlides = slides.length || 1;

  return (
    <section
      className="
         relative w-full
        bg-gradient-to-br from-blue-50 via-white to-blue-50 text-slate-800
        dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100
        overflow-hidden py-8 md:py-10
      "
      role="region"
      aria-roledescription="carousel"
      aria-label="Signification du nom MIRADIA"
    >
      {/* Animations + styles */}
      <style>
        {`
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

          .glass-card {
            background:
              radial-gradient(circle at top left, rgba(255,255,255,0.55), rgba(148,163,184,0.15)),
              linear-gradient(135deg, rgba(15,23,42,0.60), rgba(30,64,175,0.35));
            backdrop-filter: blur(22px) saturate(140%);
            -webkit-backdrop-filter: blur(22px) saturate(140%);
            border: 1px solid rgba(255,255,255,0.35);
            box-shadow: none;
          }

          .dark .glass-card {
            background:
              radial-gradient(circle at top left, rgba(15,23,42,0.85), rgba(15,23,42,0.70)),
              linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,64,175,0.7));
            border: 1px solid rgba(148,163,184,0.55);
          }

          .glass-panel {
            background:
              radial-gradient(circle at top left, rgba(255,255,255,0.65), rgba(255,255,255,0.60));
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            border: 1px solid rgba(148,163,184,0.35);
          }

          .dark .glass-panel {
            background:
              radial-gradient(circle at top left, rgba(15,23,42,0.85), rgba(15,23,42,0.90));
            border: 1px solid rgba(148,163,184,0.6);
          }

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

          /* Rich text Laravel */
          .slider-richtext h1,
          .slider-richtext h2,
          .slider-richtext h3 {
            font-weight: 700;
            margin-bottom: 0.5rem;
          }
          .slider-richtext h1 { font-size: 1.15rem; }
          .slider-richtext h2 { font-size: 1.05rem; }
          .slider-richtext h3 { font-size: 1rem; }

          .slider-richtext p {
            margin: 0.25rem 0;
          }

          .slider-richtext ul,
          .slider-richtext ol {
            padding-left: 1.1rem;
            margin: 0.25rem 0;
          }

          .slider-richtext li {
            margin: 0.1rem 0;
          }

          .slider-richtext strong,
          .slider-richtext b {
            font-weight: 700;
          }

          .slider-richtext em,
          .slider-richtext i {
            font-style: italic;
          }

          /* ⬇️ ICI : suppression du fond noir sur les <pre> */
          .slider-richtext pre {
            white-space: pre-wrap;
            font-family: inherit;
            font-size: 0.9rem;
            background: transparent;
            color: inherit;
            padding: 0;
            border-radius: 0;
            border: none;
            margin: 0.25rem 0;
          }

          .slider-richtext span[style] {
            color: inherit;
          }
        `}
      </style>

      {/* Bulles décoratives */}
      <div className="pointer-events-none absolute -top-24 -left-10 w-80 h-80 rounded-full bg-blue-300/20 dark:bg-sky-500/10 blur-3xl bubble-1" />
      <div className="pointer-events-none absolute -bottom-32 -right-10 w-96 h-96 rounded-full bg-blue-300/20 dark:bg-sky-500/10 blur-3xl bubble-2" />

      {/* Container large */}
      <div className="relative max-w-screen-2xl mx-auto px-2 md:px-4 lg:px-6 pb-12 md:pb-16">
        {/* En-tête */}
        <div className="mb-8 md:mb-10 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-3">
            MIRADIA&nbsp;: marcher ensemble dans l’équité
          </h2>
          <div className="w-36 h-1 bg-slate-900 dark:bg-sky-400 mx-auto mb-4" />
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Un nom malagasy qui relie l’idée d’égalité (MIRA) et celle de
            marche commune (DIA), pour avancer ensemble vers un objectif partagé.
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
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-400/30 via-cyan-300/20 to-blue-500/30 dark:from-blue-500/20 dark:via-sky-500/10 dark:to-blue-700/30" />

            {/* Carte principale */}
            <div className="absolute inset-[2px] rounded-[24px] glass-card overflow-hidden">
              {visibleIndexes.map((index) => {
                const slide = slides[index];
                if (!slide) return null;
                const Icon = slide.icon || FaFileAlt;
                const isActive = index === current;

                return (
                  <div
                    key={slide.id}
                    className={
                      "slider-layer " +
                      (isActive
                        ? "slider-layer-current"
                        : "slider-layer-prev")
                    }
                    aria-hidden={!isActive}
                  >
                    {/* Image de fond */}
                    <div className="absolute inset-0">
                      {slide.image && (
                        <div
                          className="absolute inset-0 slide-img"
                          style={{
                            backgroundImage: `url(${slide.image})`,
                          }}
                        />
                      )}
                      <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-slate-900/40 via-slate-900/50 to-transparent" />
                    </div>

                    {/* Contenu */}
                    <div className="relative z-10 h-full flex flex-col px-6 md:px-10 lg:px-12 py-6 md:py-8">
                      <div className="flex-1 flex flex-col md:gap-4 lg:gap-5 h-[100%] justify-between">
                        {/* Ligne du haut */}
                        <div className="flex items-center justify-between">
                          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 border border-white/30 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="font-semibold">
                              {slide.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-100/80 font-medium">
                            {String(current + 1).padStart(2, "0")} /{" "}
                            {String(totalSlides).padStart(2, "0")}
                          </p>
                        </div>

                        {/* Bloc texte */}
                        <div className="max-w-2xl glass-panel rounded-2xl px-4 py-3 md:px-6 md:py-5 pb-5">
                          <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1.5 text-slate-900 dark:text-white pb-5">
                            {slide.title}
                          </h3>

                          {slide.description && (
                            <div
                              className="slider-richtext text-xs md:text-sm text-slate-800 dark:text-slate-100 leading-relaxed"
                              dangerouslySetInnerHTML={{
                                __html: slide.description,
                              }}
                            />
                          )}
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 items-center">
                          {slide.stat && (
                            <span
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white"
                              style={{ backgroundColor: slide.color }}
                            >
                              <Icon className="text-xs" />
                              {slide.stat}
                            </span>
                          )}

                          {slide.tag && (
                            <span className="px-3 py-1.5 rounded-full bg-slate-900/40 border border-white/20 text-[11px] text-slate-100">
                              {slide.tag}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Contrôles + progress */}
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

                          <div className="flex items-center gap-2">
                            {slides.map((s, idx) => (
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

                        <div className="w-full h-[3px] bg-slate-900/15 dark:bg-slate-100/10 rounded-full overflow-hidden backdrop-blur-[1px]">
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
