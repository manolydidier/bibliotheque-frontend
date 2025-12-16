// src/pages/UserManagementDashboard/Components/Accueil/Slider.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

/* ===============================
   CONFIG
================================= */
const STORAGE_BASE =
  import.meta.env.VITE_API_BASE_STORAGE ||
  import.meta.env.VITE_API_BASE_URL ||
  window.location.origin;

const SLIDE_DURATION = 9000;
const FADE_MS = 850;

/* ===============================
   HELPERS
================================= */
const buildSlideImageUrl = (slide) => {
  if (slide?.image_url) return slide.image_url;
  if (!slide?.image_path) return null;

  const base = String(STORAGE_BASE).replace(/\/$/, "");
  const path = String(slide.image_path).replace(/^\/?storage\//, "");
  return `${base}/storage/${path}`;
};

/** Desktop only: widen active column */
const getGridTemplate = (length, active) =>
  Array.from({ length })
    .map((_, i) => (i === active ? "2.2fr" : "1fr"))
    .join(" ");

/* ===============================
   COMPONENT
================================= */
export default function Slider() {
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [prevIndex, setPrevIndex] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const fadeTimerRef = useRef(null);
  const autoTimerRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const isHoveringRef = useRef(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const total = slides.length;

  // Détection responsive
  useEffect(() => {
    const checkResponsive = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkResponsive();
    window.addEventListener("resize", checkResponsive);
    return () => window.removeEventListener("resize", checkResponsive);
  }, []);

  const safeCurrent = useMemo(() => {
    if (!total) return 0;
    return Math.max(0, Math.min(current, total - 1));
  }, [current, total]);

  const activeSlide = slides[safeCurrent];

  /* ===============================
     FETCH
  =============================== */
  useEffect(() => {
    let mounted = true;

    axios
      .get("/miradia-slides", {
        params: { all: 1 },
        headers: { Accept: "application/json" },
      })
      .then((res) => {
        const raw = Array.isArray(res.data) ? res.data : res.data?.data || [];

        const normalized = raw
          .filter((s) => s.is_active !== false)
          .sort((a, b) => Number(a.position ?? 99) - Number(b.position ?? 99))
          .map((s, i) => ({
            id: s.id ?? i,
            title: s.title ?? "",
            description: s.description ?? "",
            tag: s.tag ?? "",
            image: buildSlideImageUrl(s),
          }));

        if (!mounted) return;

        setSlides(normalized);
        setCurrent(0);
        setPrevIndex(null);
      })
      .catch((e) => {
        console.error("Erreur fetch slides:", e?.message || e);
      });

    return () => {
      mounted = false;
    };
  }, []);

  /* ===============================
     CLEANUP TIMERS
  =============================== */
  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  /* ===============================
     TRANSITION GO TO
  =============================== */
  const goTo = (nextIndex) => {
    if (!total) return;
    const next = ((nextIndex % total) + total) % total;
    if (next === safeCurrent) return;

    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    setPrevIndex(safeCurrent);
    setCurrent(next);

    fadeTimerRef.current = setTimeout(() => {
      setPrevIndex(null);
    }, FADE_MS);
  };

  const goNext = () => goTo(safeCurrent + 1);
  const goPrev = () => goTo(safeCurrent - 1);

  /* ===============================
     TOUCH HANDLING (mobile)
  =============================== */
  const handleTouchStart = (e) => {
    if (isMobile) {
      touchStartX.current = e.touches[0].clientX;
    }
  };

  const handleTouchMove = (e) => {
    if (isMobile) {
      touchEndX.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;

    const threshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  /* ===============================
     AUTO SLIDE
  =============================== */
  useEffect(() => {
    if (!total) return;
    if (isPaused) return;

    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);

    autoTimerRef.current = setTimeout(() => {
      goNext();
    }, SLIDE_DURATION);

    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeCurrent, total, isPaused]);

  /* ===============================
     PROGRESS
  =============================== */
  useEffect(() => {
    if (!total) return;
    if (isPaused) return;

    setProgress(0);

    let raf;
    const start = performance.now();

    const tick = (now) => {
      const r = Math.min((now - start) / SLIDE_DURATION, 1);
      setProgress(r * 100);
      if (r < 1 && !isPaused) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
  }, [safeCurrent, total, isPaused]);

  /* ===============================
     PRELOAD NEXT IMAGE
  =============================== */
  useEffect(() => {
    if (!total) return;
    const next = (safeCurrent + 1) % total;
    const url = slides[next]?.image;
    if (!url) return;
    const img = new Image();
    img.src = url;
  }, [safeCurrent, slides, total]);

  /* ===============================
     PAUSE ON SCROLL (content)
  =============================== */
  const pauseBriefly = (ms = 1200) => {
    setIsPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      if (!isHoveringRef.current) setIsPaused(false);
    }, ms);
  };

  /* ===============================
     ALIGN ACTIVE CONTENT (desktop only)
  =============================== */
  const alignClass = useMemo(() => {
    if (isMobile) return "items-start text-left";

    const pos = safeCurrent % 3;
    if (pos === 0) return "items-start text-left";
    if (pos === 1) return "items-center text-center";
    return "items-end text-right";
  }, [safeCurrent, isMobile]);

  if (!total) return null;

  const prevBg = prevIndex !== null ? slides[prevIndex]?.image : null;
  const curBg = activeSlide?.image;

  return (
    <section
      className="relative h-[calc(100vh-100px)] min-h-[520px] sm:min-h-[600px] overflow-hidden group select-none"
      onMouseEnter={() => {
        isHoveringRef.current = true;
        setIsPaused(true);
      }}
      onMouseLeave={() => {
        isHoveringRef.current = false;
        setIsPaused(false);
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-roledescription="carousel"
      aria-label="MIRADIA Slider"
    >
      {/* ===============================
          MIRADIA THEME + RICHTEXT CSS RESPONSIVE
      =============================== */}
      <style>{`
        :root{
          --m-blue: #124B7D;
          --m-blue-2:#005D86;
          --m-sky:  #40A8DC;
          --m-sky-2:#058FE4;
          --m-green:#4CC04F;
          --m-sun:  #FDCB00;
        }

        @keyframes miradiaBgZoom {
          0%   { transform: scale(1.04); }
          50%  { transform: scale(1.09); }
          100% { transform: scale(1.04); }
        }

        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ✅ CARD CONTENU (BLANC + BLUR) */
        .miradia-content-card{
          position: relative;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.55);
          background: rgba(255,255,255,.22); /* blanc glass */
          box-shadow:
            0 16px 45px rgba(0,0,0,.30),
            inset 0 1px 0 rgba(255,255,255,.35);
          padding: 18px;
          backdrop-filter: blur(10px);        /* ✅ blur modéré */
          -webkit-backdrop-filter: blur(10px);
          overflow: hidden;
        }

        @media (min-width: 640px) {
          .miradia-content-card{
            border-radius: 18px;
            padding: 20px;
          }
        }

        @media (min-width: 768px) {
          .miradia-content-card{
            border-radius: 20px;
            padding: 22px;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
          }
        }

        @media (min-width: 1024px) {
          .miradia-content-card{
            padding: 24px;
          }
        }

        .miradia-content-card::before{
          content:"";
          position:absolute;
          inset:0;
          border-radius: inherit;
          background:
            radial-gradient(ellipse at 30% 15%, rgba(64,168,220,.18), transparent 60%),
            radial-gradient(ellipse at 80% 80%, rgba(76,192,79,.12), transparent 60%);
          pointer-events:none;
          z-index: 0;
        }

        /* ✅ RICHTEXT (CONTENU INCHANGÉ) */
        .miradia-richtext{
          line-height: 1.7;
          color: rgba(255,255,255,.95);
          position: relative;
          z-index: 1;
          font-size: 0.95rem;
        }

        @media (min-width: 640px) {
          .miradia-richtext{ font-size: 1rem; line-height: 1.75; }
        }

        @media (min-width: 768px) {
          .miradia-richtext{ font-size: 1.05rem; line-height: 1.8; }
        }

        @media (min-width: 1024px) {
          .miradia-richtext{ font-size: 1.1rem; }
        }

        .miradia-richtext h1,
        .miradia-richtext h2,
        .miradia-richtext h3,
        .miradia-richtext h4 {
          margin: 1.2rem 0 0.8rem 0;
          line-height: 1.3;
          font-weight: 600;
          color: white;
          position: relative;
          padding-left: 10px;
        }

        @media (min-width: 768px) {
          .miradia-richtext h1,
          .miradia-richtext h2,
          .miradia-richtext h3,
          .miradia-richtext h4 {
            padding-left: 12px;
            margin: 1.5rem 0 1rem 0;
          }
        }

        .miradia-richtext h1::before,
        .miradia-richtext h2::before,
        .miradia-richtext h3::before,
        .miradia-richtext h4::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(to bottom, var(--m-sky), var(--m-green));
          border-radius: 2px;
        }

        @media (min-width: 768px) {
          .miradia-richtext h1::before,
          .miradia-richtext h2::before,
          .miradia-richtext h3::before,
          .miradia-richtext h4::before { width: 4px; }
        }

        .miradia-richtext h1 { font-size: 1.5rem; }
        .miradia-richtext h2 { font-size: 1.3rem; }
        .miradia-richtext h3 { font-size: 1.2rem; }
        .miradia-richtext h4 { font-size: 1.1rem; }

        @media (min-width: 768px) {
          .miradia-richtext h1 { font-size: 1.8rem; }
          .miradia-richtext h2 { font-size: 1.5rem; }
          .miradia-richtext h3 { font-size: 1.3rem; }
          .miradia-richtext h4 { font-size: 1.15rem; }
        }

        .miradia-richtext p { margin: 0.8rem 0; padding: 0.4rem 0; }
        @media (min-width: 768px) {
          .miradia-richtext p { margin: 1rem 0; padding: 0.5rem 0; }
        }

        .miradia-richtext ul,
        .miradia-richtext ol { margin: 0.8rem 0; padding-left: 1.2rem; }
        @media (min-width: 768px) {
          .miradia-richtext ul,
          .miradia-richtext ol { margin: 1rem 0; padding-left: 1.5rem; }
        }
        .miradia-richtext li { margin: 0.4rem 0; padding-left: 0.5rem; }

        .miradia-richtext pre,
        .miradia-richtext code {
          font-family: 'Courier New', Courier, monospace;
          background: rgba(0,0,0,.25) !important;
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 10px;
          padding: 10px 12px;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          color: rgba(255,255,255,.92);
          margin: 0.8rem 0;
          font-size: 0.85rem;
          line-height: 1.45;
        }

        @media (min-width: 768px) {
          .miradia-richtext pre,
          .miradia-richtext code { padding: 12px 14px; font-size: 0.9rem; }
        }

        .miradia-richtext a {
          color: var(--m-sky);
          text-decoration: none;
          border-bottom: 1px solid rgba(64,168,220,.35);
          padding-bottom: 1px;
          transition: all 0.25s ease;
        }
        .miradia-richtext a:hover {
          color: var(--m-green);
          border-bottom-color: rgba(76,192,79,.55);
        }

        /* Scrollbar */
        .miradia-scroll::-webkit-scrollbar{ width: 7px; }
        @media (min-width: 768px){ .miradia-scroll::-webkit-scrollbar{ width: 9px; } }
        @media (min-width: 1024px){ .miradia-scroll::-webkit-scrollbar{ width: 10px; } }

        .miradia-scroll::-webkit-scrollbar-thumb{
          background: linear-gradient(to bottom, var(--m-sky), var(--m-green));
          border-radius: 999px;
        }
        .miradia-scroll::-webkit-scrollbar-track{
          background: rgba(255,255,255,.10);
          border-radius: 999px;
          margin: 3px 0;
        }

        .animate-fadeInUp { animation: fadeInUp 0.6s ease-out both; }
      `}</style>

      {/* ===============================
          BACKGROUND
      =============================== */}
      {prevBg && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-100"
          style={{
            backgroundImage: `url(${prevBg})`,
            filter: "contrast(1.06) saturate(1.08) brightness(0.98)",
          }}
        />
      )}

      <div
        key={curBg || "bg"}
        className="absolute inset-0 bg-cover bg-center animate-[miradiaBgZoom_18s_ease-in-out_infinite]"
        style={{
          backgroundImage: `url(${curBg})`,
          filter: "contrast(1.08) saturate(1.10) brightness(1.00)",
        }}
      />

      {/* overlays (doux pour garder la photo claire) */}
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-black/20 to-black/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(64,168,220,0.16),transparent_55%)]" />

      {/* ===============================
          MOBILE NAVIGATION BUTTONS
      =============================== */}
      {isMobile && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-all active:scale-95 shadow-lg"
            aria-label="Slide précédent"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-all active:scale-95 shadow-lg"
            aria-label="Slide suivant"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* ===============================
          SLIDES CONTAINER - RESPONSIVE
      =============================== */}
      <div
        className={[
          "relative z-10 h-full",
          isMobile ? "flex flex-col" : "",
          !isMobile ? "grid transition-[grid-template-columns] duration-700 ease-in-out" : "",
        ].join(" ")}
        style={{
          gridTemplateColumns: !isMobile ? getGridTemplate(total, safeCurrent) : undefined,
        }}
      >
        {slides.map((slide, idx) => {
          const isActive = idx === safeCurrent;
          const isVisibleMobile = isMobile ? isActive : true;

          return (
            <div
              key={slide.id}
              onClick={() => goTo(idx)}
              className={[
                "relative cursor-pointer transition-all duration-700 ease-in-out",
                "backdrop-blur-sm",
                ...(isMobile
                  ? [
                      "w-full",
                      "px-4 sm:px-5 py-4 sm:py-5",
                      isActive ? "flex-1 min-h-[50vh] sm:min-h-[55vh]" : "h-14 sm:h-16 flex-shrink-0",
                      "border-t border-white/10 first:border-t-0",
                      !isActive && "opacity-70 hover:opacity-100 bg-black/20",
                      isActive && "bg-black/20",
                    ]
                  : []),
                ...(!isMobile
                  ? [
                      "px-4 sm:px-5 md:px-6 py-6 sm:py-7 md:py-8 lg:py-10",
                      "border-l border-white/10 last:border-r",
                      isActive ? "bg-black/20 shadow-2xl" : "bg-black/10 hover:bg-black/15 hover:shadow-xl",
                    ]
                  : []),
              ].join(" ")}
              style={{
                display: isMobile && !isVisibleMobile ? "none" : "block",
              }}
              aria-current={isActive ? "true" : "false"}
            >
              {/* ===== SLIDE INACTIF ===== */}
              {!isActive && (
                <div className="h-full flex flex-col justify-center items-center text-center">
                  {slide.tag && (
                    <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-[var(--m-green)] mb-2 sm:mb-3 font-medium truncate max-w-full px-2">
                      {slide.tag}
                    </p>
                  )}

                  {!isMobile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goTo(idx);
                      }}
                      className="
                        mt-3 sm:mt-4 px-4 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl
                        border border-white/25
                        text-white text-xs sm:text-sm font-medium
                        opacity-0 translate-y-2
                        transition-all duration-500
                        group-hover:opacity-100 group-hover:translate-y-0
                        hover:bg-white/10 hover:border-white/40
                        focus:outline-none focus:ring-2 focus:ring-[var(--m-sky)]
                      "
                      aria-label={`Voir ${slide.title}`}
                    >
                      Voir
                    </button>
                  )}
                </div>
              )}

              {/* ===== SLIDE ACTIF (contenu dans la card blur) ===== */}
              {isActive && (
                <div className={`h-full flex flex-col justify-between ${alignClass}`}>
                  {/* TAG + TITRE (sans blur) */}
                  <div className="w-full">
                    {slide.tag && (
                      <p
                        className={[
                          "uppercase tracking-[0.3em] text-white/90 mb-2 sm:mb-3 md:mb-4 font-medium flex items-center gap-2",
                          "text-[10px] sm:text-xs",
                          "drop-shadow-[0_2px_10px_rgba(0,0,0,.45)]",
                        ].join(" ")}
                      >
                        <span className="inline-block w-4 sm:w-6 h-px bg-gradient-to-r from-[var(--m-green)] to-transparent"></span>
                        {slide.tag}
                        <span className="inline-block w-4 sm:w-6 h-px bg-gradient-to-l from-[var(--m-green)] to-transparent"></span>
                      </p>
                    )}

                    <h3
                      className={[
                        "font-bold leading-tight text-[var(--m-sky)] drop-shadow-lg mb-3 sm:mb-4",
                        "text-2xl sm:text-3xl md:text-4xl lg:text-5xl",
                      ].join(" ")}
                    >
                      {slide.title}
                    </h3>
                  </div>

                  {/* ✅ SECTION CONTENU DANS LA CARD BLUR */}
                  <div className="mt-4 sm:mt-6 md:mt-8 w-full">
                    <div
                      className={[
                        "miradia-content-card",
                        "miradia-scroll overscroll-contain",
                        "overflow-y-auto",
                        "pr-2 sm:pr-3",
                        isMobile ? "max-h-[40vh]" : "max-h-[45vh]",
                      ].join(" ")}
                      onWheel={() => pauseBriefly(1400)}
                      onScroll={() => pauseBriefly(1400)}
                    >
                      <div
                        className="miradia-richtext"
                        dangerouslySetInnerHTML={{
                          __html: slide.description || "<p></p>",
                        }}
                      />
                    </div>
                  </div>

                  {/* FOOTER (sans blur) */}
                  <div className="mt-4 sm:mt-6 md:mt-8 w-full flex items-center justify-between text-white/80">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em]">
                        Slide {idx + 1} / {total}
                      </span>
                    </div>

                    {isPaused && (
                      <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[var(--m-sun)] font-medium flex items-center gap-1 sm:gap-2">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[var(--m-sun)] animate-pulse"></span>
                        {isMobile ? "Pause" : "En pause"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Hover accent line - Desktop seulement */}
              {!isMobile && (
                <div
                  className={[
                    "pointer-events-none absolute inset-x-0 top-0 h-[3px]",
                    "transition-all duration-500",
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-hover:scale-x-100",
                    isActive ? "scale-x-100" : "scale-x-0",
                  ].join(" ")}
                  style={{
                    background: "linear-gradient(90deg, var(--m-sky), var(--m-green), var(--m-sun))",
                    boxShadow: "0 0 10px rgba(64,168,220,.5)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* PROGRESS BAR */}
      <div className="absolute bottom-0 left-0 w-full z-30 bg-white/20 h-[2px] sm:h-[3px]">
        <div
          className="h-full transition-[width] duration-150 ease-linear relative"
          style={{ width: `${progress}%` }}
        >
          <div
            className="absolute inset-0 rounded-r-full"
            style={{
              background: "linear-gradient(90deg, var(--m-sky), var(--m-green), var(--m-sun))",
            }}
          />
          {!isMobile && (
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-white shadow-lg"
              style={{ boxShadow: "0 0 10px rgba(64,168,220,.8)" }}
            />
          )}
        </div>
      </div>

      {/* SWIPE INDICATOR - Mobile seulement */}
      {isMobile && (
        <div className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="flex items-center gap-1 sm:gap-2 text-white/70">
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-[10px] sm:text-xs font-medium">Glisser</span>
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      )}
    </section>
  );
}
