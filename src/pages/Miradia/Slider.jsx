// src/pages/UserManagementDashboard/Components/Accueil/Slider.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "axios";

/* ========================================
   CONFIGURATION
======================================== */
const CONFIG = {
  STORAGE_BASE:
    import.meta.env.VITE_API_BASE_STORAGE ||
    import.meta.env.VITE_API_BASE_URL ||
    window.location.origin,

  SLIDE_DURATION: 9000,
  FADE_DURATION: 850,
  REVEAL_DELAY: 420,
  PAUSE_ON_SCROLL: 1400,
  SWIPE_THRESHOLD: 50,
};

/* ========================================
   HELPERS
======================================== */
const buildSlideImageUrl = (slide) => {
  if (slide?.image_url) return slide.image_url;
  if (!slide?.image_path) return null;

  const base = String(CONFIG.STORAGE_BASE).replace(/\/$/, "");
  const path = String(slide.image_path).replace(/^\/?storage\//, "");
  return `${base}/storage/${path}`;
};

const getGridTemplate = (length, activeIndex) =>
  Array.from({ length })
    .map((_, i) => (i === activeIndex ? "2.2fr" : "1fr"))
    .join(" ");

const getAlignmentClass = (index, isMobile) => {
  if (isMobile) return "items-start text-left";
  const position = index % 3;
  if (position === 0) return "items-start text-left";
  if (position === 1) return "items-center text-center";
  return "items-end text-right";
};

/* ========================================
   HOOKS PERSONNALISÉS
======================================== */
const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkResponsive = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
    };

    checkResponsive();
    window.addEventListener("resize", checkResponsive);
    return () => window.removeEventListener("resize", checkResponsive);
  }, []);

  return { isMobile };
};

const useSlideData = () => {
  const [slides, setSlides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

        if (mounted) {
          setSlides(normalized);
          setIsLoading(false);
        }
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error("Erreur fetch slides:", e?.message || e);
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { slides, isLoading };
};

/** ✅ Lit le thème depuis <html class="dark"> */
const useHtmlDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();

    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => obs.disconnect();
  }, []);

  return isDark;
};

/* ========================================
   COMPOSANT PRINCIPAL
======================================== */
export default function Slider() {
  const [current, setCurrent] = useState(0);
  const [prevIndex, setPrevIndex] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [revealContent, setRevealContent] = useState(false);
  const [bgFadeIn, setBgFadeIn] = useState(false);

  const { slides, isLoading } = useSlideData();
  const { isMobile } = useResponsive();

  const isDark = useHtmlDarkMode();

  const isHoveringRef = useRef(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const fadeTimerRef = useRef(null);
  const autoTimerRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const revealTimerRef = useRef(null);
  const bgRafRef = useRef(null);

  const total = slides.length;

  const safeCurrent = useMemo(() => {
    if (!total) return 0;
    return Math.max(0, Math.min(current, total - 1));
  }, [current, total]);

  const activeSlide = slides[safeCurrent];
  const alignClass = getAlignmentClass(safeCurrent, isMobile);

  /* ========================================
     CLEANUP TIMERS
  ======================================== */
  useEffect(() => {
    return () => {
      [fadeTimerRef, autoTimerRef, resumeTimerRef, revealTimerRef].forEach((ref) => {
        if (ref.current) clearTimeout(ref.current);
      });
      if (bgRafRef.current) cancelAnimationFrame(bgRafRef.current);
    };
  }, []);

  /* ========================================
     REVEAL CONTENT (animation plus douce)
  ======================================== */
  useEffect(() => {
    setRevealContent(false);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);

    revealTimerRef.current = setTimeout(() => {
      setRevealContent(true);
    }, CONFIG.REVEAL_DELAY);

    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, [safeCurrent]);

  /* ========================================
     CROSSFADE BG
  ======================================== */
  useEffect(() => {
    setBgFadeIn(false);
    if (bgRafRef.current) cancelAnimationFrame(bgRafRef.current);
    bgRafRef.current = requestAnimationFrame(() => setBgFadeIn(true));
    return () => {
      if (bgRafRef.current) cancelAnimationFrame(bgRafRef.current);
    };
  }, [activeSlide?.image]);

  /* ========================================
     NAVIGATION
  ======================================== */
  const goTo = useCallback(
    (nextIndex) => {
      if (!total) return;
      const next = ((nextIndex % total) + total) % total;
      if (next === safeCurrent) return;

      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

      setPrevIndex(safeCurrent);
      setCurrent(next);

      fadeTimerRef.current = setTimeout(() => {
        setPrevIndex(null);
      }, CONFIG.FADE_DURATION);
    },
    [safeCurrent, total]
  );

  const goNext = useCallback(() => goTo(safeCurrent + 1), [goTo, safeCurrent]);
  const goPrev = useCallback(() => goTo(safeCurrent - 1), [goTo, safeCurrent]);

  /* ========================================
     EVENTS
  ======================================== */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    },
    [goNext, goPrev]
  );

  const handleTouchStart = (e) => {
    if (isMobile) {
      touchStartX.current = e.touches[0].clientX;
      touchEndX.current = e.touches[0].clientX;
    }
  };

  const handleTouchMove = (e) => {
    if (isMobile) {
      touchEndX.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;

    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > CONFIG.SWIPE_THRESHOLD) {
      diff > 0 ? goNext() : goPrev();
    }
  };

  const pauseBriefly = (ms = CONFIG.PAUSE_ON_SCROLL) => {
    setIsPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      if (!isHoveringRef.current) setIsPaused(false);
    }, ms);
  };

  /* ========================================
     AUTO-PLAY & PROGRESS
  ======================================== */
  useEffect(() => {
    if (!total || isPaused) return;

    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);

    autoTimerRef.current = setTimeout(() => {
      goNext();
    }, CONFIG.SLIDE_DURATION);

    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [safeCurrent, total, isPaused, goNext]);

  useEffect(() => {
    if (!total || isPaused) return;

    setProgress(0);

    let raf;
    const start = performance.now();

    const tick = (now) => {
      const ratio = Math.min((now - start) / CONFIG.SLIDE_DURATION, 1);
      setProgress(ratio * 100);
      if (ratio < 1 && !isPaused) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
  }, [safeCurrent, total, isPaused]);

  /* ========================================
     PRELOAD NEXT
  ======================================== */
  useEffect(() => {
    if (!total) return;
    const nextIndex = (safeCurrent + 1) % total;
    const url = slides[nextIndex]?.image;
    if (!url) return;
    const img = new Image();
    img.src = url;
  }, [safeCurrent, slides, total]);

  if (isLoading || !total) return null;

  const prevBg = prevIndex !== null ? slides[prevIndex]?.image : null;
  const curBg = activeSlide?.image;

  return (
    <section
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="slider-scope relative h-[calc(100vh-100px)] min-h-[520px] sm:min-h-[600px] overflow-hidden group select-none outline-none focus-visible:ring-2 focus-visible:ring-[rgba(64,168,220,0.55)]"
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
      data-theme={isDark ? "dark" : "light"}
    >
      <SliderStyles />

      <BackgroundLayers
        prevBg={prevBg}
        curBg={curBg}
        bgFadeIn={bgFadeIn}
        fadeMs={CONFIG.FADE_DURATION}
        isDark={isDark}
      />

      {isMobile && <MobileNavButtons onPrev={goPrev} onNext={goNext} />}

      <SlidesContainer
        slides={slides}
        safeCurrent={safeCurrent}
        total={total}
        isMobile={isMobile}
        goTo={goTo}
        revealContent={revealContent}
        isPaused={isPaused}
        alignClass={alignClass}
        pauseBriefly={pauseBriefly}
      />

      <ProgressBar progress={progress} isMobile={isMobile} />
      <DotsIndicator slides={slides} safeCurrent={safeCurrent} goTo={goTo} />
      {isMobile && <SwipeIndicator />}
    </section>
  );
}

/* ========================================
   STYLES
   ✅ On ne change pas le style global des slides,
      seulement l’affichage du contenu (flat + lisible)
======================================== */
const SliderStyles = () => (
  <style>{`
    .slider-scope{
      --m-sky:  #40A8DC;
      --m-green:#4CC04F;
      --m-sun:  #FDCB00;

      /* LIGHT (dark-lite) */
      --m-card-bg: rgba(255,255,255,.18);
      --m-card-bd: rgba(255,255,255,.45);
      --m-card-shadow: 0 16px 45px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.25);

      --m-title-bg: linear-gradient(180deg, rgba(0,0,0,.22), rgba(0,0,0,.14));
      --m-title-bd: rgba(255,255,255,.10);
      --m-title-shadow: 0 18px 55px rgba(0,0,0,.26);

      --m-code-bg: rgba(0,0,0,.24);
      --m-glow: rgba(64,168,220,.55);

      --m-dots-bg: rgba(0,0,0,.28);
      --m-dots-bd: rgba(255,255,255,.12);
      --m-progress-track: rgba(255,255,255,.18);
    }

    /* DARK: plus noir (comme ton fichier original) */
    html.dark .slider-scope{
      --m-card-bg: rgba(0,0,0,.42);
      --m-card-bd: rgba(255,255,255,.16);
      --m-card-shadow: 0 20px 70px rgba(0,0,0,.60), inset 0 1px 0 rgba(255,255,255,.08);

      --m-title-bg: linear-gradient(180deg, rgba(0,0,0,.62), rgba(0,0,0,.38));
      --m-title-bd: rgba(255,255,255,.12);
      --m-title-shadow: 0 26px 90px rgba(0,0,0,.72);

      --m-code-bg: rgba(0,0,0,.40);
      --m-glow: rgba(64,168,220,.62);

      --m-dots-bg: rgba(0,0,0,.52);
      --m-dots-bd: rgba(255,255,255,.10);
      --m-progress-track: rgba(255,255,255,.14);
    }

    @keyframes miradiaBgZoom {
      0%   { transform: scale(1.04) translate3d(0,0,0); }
      50%  { transform: scale(1.09) translate3d(0,-1.5%,0); }
      100% { transform: scale(1.04) translate3d(0,0,0); }
    }

    /* ✅ ANIMATIONS CONTENU: plus douces + ultra fluides (flat) */
    .rise-hold{
      opacity: 0;
      transform: translate3d(0, 14px, 0) scale(.998);
      filter: blur(.35px);
      will-change: transform, opacity, filter;
    }
    .rise-show{
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
      filter: blur(0);
      transition:
        opacity 520ms cubic-bezier(.22, 1, .36, 1),
        transform 520ms cubic-bezier(.22, 1, .36, 1),
        filter 520ms cubic-bezier(.22, 1, .36, 1);
    }
    .rise-d1{ transition-delay: 70ms; }
    .rise-d2{ transition-delay: 180ms; }
    .rise-d3{ transition-delay: 290ms; }

    /* ✅ CARD CONTENU: plus lisible + flat (moins “glass”, moins chargé) */
    .miradia-content-card{
      position: relative;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,.16);
      background: rgba(0,0,0,.22);
      box-shadow: 0 10px 26px rgba(0,0,0,.32);
      padding: 16px;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      overflow: hidden;
      scrollbar-gutter: stable;
      transform: translateZ(0);
    }
    @media (min-width: 768px) {
      .miradia-content-card{
        border-radius: 18px;
        padding: 18px;
        backdrop-filter: blur(9px);
        -webkit-backdrop-filter: blur(9px);
      }
    }
    @media (min-width: 1024px) {
      .miradia-content-card{ padding: 20px; }
    }

    /* décor très discret */
    .miradia-content-card::before{
      content:"";
      position:absolute;
      inset:0;
      border-radius: inherit;
      background:
        radial-gradient(ellipse at 22% 18%, rgba(64,168,220,.10), transparent 58%),
        radial-gradient(ellipse at 85% 86%, rgba(76,192,79,.06), transparent 60%);
      pointer-events:none;
      z-index: 0;
    }
    /* sheen OFF -> plus épuré */
    .miradia-content-card::after{ content:none; }

    /* ✅ TITLE PLATE: flat & clean */
    .miradia-title-plate{
      position: relative;
      border-radius: 14px;
      padding: 12px 14px;
      background: rgba(0,0,0,.26);
      border: 1px solid rgba(255,255,255,.14);
      box-shadow: 0 8px 20px rgba(0,0,0,.28);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }
    @media (min-width: 768px){
      .miradia-title-plate{
        border-radius: 16px;
        padding: 14px 16px;
        backdrop-filter: blur(7px);
        -webkit-backdrop-filter: blur(7px);
      }
    }

    /* ✅ RICHTEXT: plus propre & lisible */
    .miradia-richtext{
      line-height: 1.78;
      color: rgba(255,255,255,.94);
      position: relative;
      z-index: 1;
      font-size: 0.98rem;
    }
    @media (min-width: 768px){
      .miradia-richtext{
        font-size: 1.04rem;
        line-height: 1.86;
      }
    }

    .miradia-richtext h1,
    .miradia-richtext h2,
    .miradia-richtext h3,
    .miradia-richtext h4 {
      margin: 1.0rem 0 .75rem 0;
      line-height: 1.25;
      font-weight: 700;
      color: rgba(255,255,255,.98);
      position: relative;
      padding-left: 10px;
    }
    .miradia-richtext h1::before,
    .miradia-richtext h2::before,
    .miradia-richtext h3::before,
    .miradia-richtext h4::before {
      content: "";
      position: absolute;
      left: 0;
      top: .15em;
      bottom: .15em;
      width: 3px;
      background: linear-gradient(to bottom, var(--m-sky), var(--m-green));
      border-radius: 999px;
      opacity: .95;
    }

    .miradia-richtext p { margin: .75rem 0; }
    .miradia-richtext ul, .miradia-richtext ol { margin: .75rem 0; padding-left: 1.2rem; }
    .miradia-richtext li { margin: .35rem 0; }

    .miradia-richtext pre,
    .miradia-richtext code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      background: rgba(0,0,0,.28) !important;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 12px;
      padding: 10px 12px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      color: rgba(255,255,255,.92);
      margin: .8rem 0;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .miradia-richtext a {
      color: var(--m-sky);
      text-decoration: none;
      border-bottom: 1px solid rgba(64,168,220,.32);
      padding-bottom: 1px;
      transition: color .18s ease, border-color .18s ease;
    }
    .miradia-richtext a:hover {
      color: var(--m-green);
      border-bottom-color: rgba(76,192,79,.48);
    }

    /* scrollbar (inchangé, marque Miradia) */
    .miradia-scroll::-webkit-scrollbar{ width: 9px; }
    .miradia-scroll::-webkit-scrollbar-thumb{
      background: linear-gradient(to bottom, var(--m-sky), var(--m-green));
      border-radius: 999px;
    }
    .miradia-scroll::-webkit-scrollbar-track{
      background: rgba(255,255,255,.10);
      border-radius: 999px;
      margin: 3px 0;
    }

    .bg-layer{
      position:absolute;
      inset:0;
      background-size:cover;
      background-position:center;
      will-change: opacity, transform;
    }

    @media (prefers-reduced-motion: reduce){
      .rise-hold, .rise-show{
        opacity: 1 !important;
        transform: none !important;
        filter: none !important;
        transition: none !important;
      }
      .bg-layer{ animation: none !important; }
    }
  `}</style>
);

/* ========================================
   BACKGROUND (crossfade)
   ✅ Dark mode: plus noir (overlays + brightness)
======================================== */
const BackgroundLayers = ({ prevBg, curBg, bgFadeIn, fadeMs, isDark }) => {
  const curFilter = isDark
    ? "contrast(1.08) saturate(1.05) brightness(0.78)"
    : "contrast(1.08) saturate(1.10) brightness(1.00)";

  const prevFilter = isDark
    ? "contrast(1.06) saturate(1.03) brightness(0.76)"
    : "contrast(1.06) saturate(1.08) brightness(0.98)";

  return (
    <>
      {prevBg && (
        <div
          className="bg-layer"
          style={{
            backgroundImage: `url(${prevBg})`,
            filter: prevFilter,
            opacity: 1,
          }}
        />
      )}

      <div
        key={curBg || "bg"}
        className="bg-layer animate-[miradiaBgZoom_18s_ease-in-out_infinite]"
        style={{
          backgroundImage: `url(${curBg})`,
          filter: curFilter,
          opacity: bgFadeIn ? 1 : 0,
          transition: `opacity ${fadeMs}ms cubic-bezier(.2,.8,.2,1)`,
        }}
      />

      {/* overlays: dark => beaucoup plus noir */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: isDark ? "rgba(0,0,0,0.26)" : "rgba(0,0,0,0.10)" }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: isDark
            ? "linear-gradient(to top, rgba(0,0,0,0.62), rgba(0,0,0,0.30), rgba(0,0,0,0.18))"
            : "linear-gradient(to top, rgba(0,0,0,0.30), rgba(0,0,0,0.18), rgba(0,0,0,0.10))",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: isDark
            ? "radial-gradient(ellipse at top, rgba(64,168,220,0.12), transparent 55%)"
            : "radial-gradient(ellipse at top, rgba(64,168,220,0.15), transparent 55%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: isDark
            ? "radial-gradient(ellipse at center, transparent 28%, rgba(0,0,0,0.32) 100%)"
            : "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.12) 100%)",
        }}
      />
    </>
  );
};

const MobileNavButtons = ({ onPrev, onNext }) => (
  <>
    <button
      onClick={onPrev}
      className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/55 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/75 transition-all active:scale-95 shadow-lg"
      aria-label="Slide précédent"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    <button
      onClick={onNext}
      className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/55 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/75 transition-all active:scale-95 shadow-lg"
      aria-label="Slide suivant"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </>
);

const SlidesContainer = ({
  slides,
  safeCurrent,
  total,
  isMobile,
  goTo,
  revealContent,
  isPaused,
  alignClass,
  pauseBriefly,
}) => (
  <div
    className={[
      "relative z-10 h-full",
      isMobile ? "flex flex-col" : "grid transition-[grid-template-columns] duration-700 ease-in-out",
    ].join(" ")}
    style={{
      gridTemplateColumns: !isMobile ? getGridTemplate(total, safeCurrent) : undefined,
    }}
  >
    {slides.map((slide, idx) => {
      const isActive = idx === safeCurrent;
      const isVisibleMobile = isMobile ? isActive : true;

      return (
        <SlideItem
          key={slide.id}
          slide={slide}
          idx={idx}
          isActive={isActive}
          isVisibleMobile={isVisibleMobile}
          isMobile={isMobile}
          total={total}
          goTo={goTo}
          revealContent={revealContent}
          isPaused={isPaused}
          alignClass={alignClass}
          pauseBriefly={pauseBriefly}
        />
      );
    })}
  </div>
);

const SlideItem = ({
  slide,
  idx,
  isActive,
  isVisibleMobile,
  isMobile,
  total,
  goTo,
  revealContent,
  isPaused,
  alignClass,
  pauseBriefly,
}) => (
  <div
    onClick={() => goTo(idx)}
    className={[
      "relative cursor-pointer transition-all duration-700 ease-in-out backdrop-blur-sm",
      isActive ? "is-active" : "",
      ...(isMobile
        ? [
            "w-full px-4 sm:px-5 py-4 sm:py-5",
            isActive ? "flex-1 min-h-[50vh] sm:min-h-[55vh]" : "h-14 sm:h-16 flex-shrink-0",
            "border-t border-white/10 first:border-t-0",
            !isActive && "opacity-70 hover:opacity-100 bg-black/24",
            isActive && "bg-black/26",
          ]
        : [
            "px-4 sm:px-5 md:px-6 py-6 sm:py-7 md:py-8 lg:py-10",
            "border-l border-white/10 last:border-r",
            isActive ? "bg-black/26 shadow-2xl" : "bg-black/14 hover:bg-black/18 hover:shadow-xl",
          ]),
    ].join(" ")}
    style={{
      display: isMobile && !isVisibleMobile ? "none" : "block",
    }}
    aria-current={isActive ? "true" : "false"}
  >
    {!isActive ? (
      <InactiveSlideContent slide={slide} idx={idx} isMobile={isMobile} goTo={goTo} />
    ) : (
      <ActiveSlideContent
        slide={slide}
        idx={idx}
        total={total}
        revealContent={revealContent}
        isPaused={isPaused}
        alignClass={alignClass}
        isMobile={isMobile}
        pauseBriefly={pauseBriefly}
      />
    )}

    {!isMobile && (
      <div
        className={[
          "pointer-events-none absolute inset-x-0 top-0 h-[3px] transition-all duration-500",
          isActive ? "opacity-100 scale-x-100" : "opacity-0 group-hover:opacity-100 scale-x-0 group-hover:scale-x-100",
        ].join(" ")}
        style={{
          background: "linear-gradient(90deg, var(--m-sky), var(--m-green), var(--m-sun))",
          boxShadow: "0 0 10px rgba(64,168,220,.5)",
        }}
      />
    )}
  </div>
);

/* ✅ Inactive: plus flat & lisible */
const InactiveSlideContent = ({ slide, idx, isMobile, goTo }) => (
  <div className="h-full flex flex-col justify-center items-center text-center px-2 gap-3">
    <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 border border-white/15 text-white/80 text-[11px] tracking-[0.22em]">
      {String(idx + 1).padStart(2, "0")}
    </div>

    <div className="text-white/95 font-semibold text-sm sm:text-base line-clamp-2 max-w-[18rem]">
      {slide.title || "—"}
    </div>

    {slide.tag && (
      <span className="inline-flex items-center px-3 py-1 rounded-full bg-black/25 border border-white/10 text-[10px] sm:text-xs uppercase tracking-[0.28em] text-[var(--m-green)] font-semibold max-w-full truncate">
        {slide.tag}
      </span>
    )}

    {!isMobile && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          goTo(idx);
        }}
        className="mt-1 px-5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/30 text-white text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[var(--m-sky)]"
        aria-label={`Voir ${slide.title}`}
      >
        Voir
      </button>
    )}
  </div>
);

const ActiveSlideContent = ({ slide, idx, total, revealContent, isPaused, alignClass, isMobile, pauseBriefly }) => (
  <div className={`h-full flex flex-col justify-between ${alignClass}`}>
    <div className={`${revealContent ? "rise-show rise-d1" : "rise-hold"}`}>
      <div className="miradia-title-plate">
        {/* ✅ Tag en pill (flat) */}
        {slide.tag && (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-black/25 border border-white/12 text-[10px] sm:text-xs uppercase tracking-[0.28em] text-white/90 font-semibold">
            {slide.tag}
          </span>
        )}

        <h3 className="mt-3 font-extrabold leading-tight text-[var(--m-sky)] drop-shadow-[0_10px_30px_rgba(0,0,0,.65)] text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
          {slide.title}
        </h3>
      </div>
    </div>

    <div className={`mt-4 sm:mt-6 md:mt-8 w-full ${revealContent ? "rise-show rise-d2" : "rise-hold"}`}>
      <div
        className={[
          "miradia-content-card",
          "miradia-scroll overscroll-contain overflow-y-auto pr-2 sm:pr-3",
          isMobile ? "max-h-[40vh]" : "max-h-[45vh]",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => {
          e.stopPropagation();
          pauseBriefly(1400);
        }}
        onScroll={(e) => {
          e.stopPropagation();
          pauseBriefly(1400);
        }}
      >
        <div
          className="miradia-richtext"
          dangerouslySetInnerHTML={{
            __html: slide.description || "<p></p>",
          }}
        />
      </div>
    </div>

    <div
      className={[
        "mt-4 sm:mt-6 md:mt-8 w-full flex items-center justify-between text-white/85",
        revealContent ? "rise-show rise-d3" : "rise-hold",
      ].join(" ")}
    >
      <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em]">
        Slide {idx + 1} / {total}
      </span>

      {isPaused && (
        <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[var(--m-sun)] font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--m-sun)] animate-pulse"></span>
          {isMobile ? "Pause" : "En pause"}
        </span>
      )}
    </div>
  </div>
);

const ProgressBar = ({ progress, isMobile }) => (
  <div className="absolute bottom-0 left-0 w-full z-30" style={{ background: "var(--m-progress-track)", height: isMobile ? 2 : 3 }}>
    <div className="h-full transition-[width] duration-150 ease-linear relative" style={{ width: `${progress}%` }}>
      <div
        className="absolute inset-0 rounded-r-full"
        style={{ background: "linear-gradient(90deg, var(--m-sky), var(--m-green), var(--m-sun))" }}
      />
      {!isMobile && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-white shadow-lg"
          style={{ boxShadow: "0 0 10px rgba(64,168,220,.85)" }}
        />
      )}
    </div>
  </div>
);

const DotsIndicator = ({ slides, safeCurrent, goTo }) => (
  <div className="absolute bottom-5 sm:bottom-7 left-1/2 -translate-x-1/2 z-30">
    <div
      className="flex items-center gap-2 rounded-full px-3 py-2 backdrop-blur-md"
      style={{ background: "var(--m-dots-bg)", border: "1px solid var(--m-dots-bd)" }}
    >
      {slides.map((s, i) => {
        const active = i === safeCurrent;
        return (
          <button
            key={s.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goTo(i);
            }}
            className={["h-2.5 w-2.5 rounded-full transition-all duration-300", active ? "scale-110" : "opacity-70 hover:opacity-100"].join(" ")}
            style={{
              background: active ? "linear-gradient(90deg, var(--m-sky), var(--m-green))" : "rgba(255,255,255,.55)",
              boxShadow: active ? "0 0 16px var(--m-glow)" : "none",
            }}
            aria-label={`Aller au slide ${i + 1}`}
            aria-current={active ? "true" : "false"}
          />
        );
      })}
    </div>
  </div>
);

const SwipeIndicator = () => (
  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
    <div className="flex items-center gap-2 text-white/70">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
      </svg>
      <span className="text-xs font-medium">Glisser</span>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </div>
);
