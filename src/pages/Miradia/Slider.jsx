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

/** ✅ Lit le thème depuis <html class="dark"> (piloté par ta NavBarMiradia) */
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

  const isDark = useHtmlDarkMode(); // ✅

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
     REVEAL CONTENT
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
   ✅ Light = dark-lite
   ✅ Dark  = beaucoup plus noir (ta demande)
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

    /* ✅ DARK: beaucoup plus noir */
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

    @keyframes miradiaRiseInSoft {
      0%   { opacity: 0; transform: translate3d(0, 30px, 0) scale(.992); filter: blur(1px); }
      60%  { opacity: 1; transform: translate3d(0, 4px, 0) scale(1); filter: blur(.2px); }
      100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
    }

    .rise-hold{ opacity: 0; transform: translate3d(0, 26px, 0) scale(.992); filter: blur(1px); }
    .rise-show{ animation: miradiaRiseInSoft 1150ms cubic-bezier(.16,.92,.16,1) both; will-change: transform, opacity, filter; }
    .rise-d1{ animation-delay: 120ms; }
    .rise-d2{ animation-delay: 380ms; }
    .rise-d3{ animation-delay: 640ms; }

    @media (prefers-reduced-motion: reduce){
      .rise-hold{ opacity: 1 !important; transform: none !important; filter:none !important; }
      .rise-show, .rise-d1, .rise-d2, .rise-d3{ animation: none !important; }
    }

    .miradia-content-card{
      position: relative;
      border-radius: 18px;
      border: 1px solid var(--m-card-bd);
      background: var(--m-card-bg);
      box-shadow: var(--m-card-shadow);
      padding: 18px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      overflow: hidden;
      scrollbar-gutter: stable;
      transform: translateZ(0);
    }
    @media (min-width: 768px) {
      .miradia-content-card{ border-radius: 22px; padding: 22px; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
    }
    @media (min-width: 1024px) {
      .miradia-content-card{ padding: 24px; }
    }

    .miradia-content-card::before{
      content:"";
      position:absolute;
      inset:0;
      border-radius: inherit;
      background:
        radial-gradient(ellipse at 30% 15%, rgba(64,168,220,.14), transparent 60%),
        radial-gradient(ellipse at 80% 80%, rgba(76,192,79,.09), transparent 60%);
      pointer-events:none;
      z-index: 0;
    }

    @keyframes sheen {
      0% { transform: translateX(-130%) rotate(12deg); opacity: 0; }
      25% { opacity: .26; }
      60% { opacity: .12; }
      100% { transform: translateX(150%) rotate(12deg); opacity: 0; }
    }
    .miradia-content-card::after{
      content:"";
      position:absolute;
      top:-30%;
      left:-20%;
      width:42%;
      height:170%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.14), transparent);
      filter: blur(2px);
      transform: translateX(-130%) rotate(12deg);
      opacity: 0;
      pointer-events:none;
      z-index: 0;
    }
    .is-active .miradia-content-card::after{
      animation: sheen 2200ms ease-in-out 1;
    }

    .miradia-title-plate{
      position: relative;
      border-radius: 18px;
      padding: 14px 14px 12px 14px;
      background: var(--m-title-bg);
      border: 1px solid var(--m-title-bd);
      box-shadow: var(--m-title-shadow);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    @media (min-width: 768px){
      .miradia-title-plate{ border-radius: 20px; padding: 16px 16px 14px 16px; backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px); }
    }

    .miradia-richtext{
      line-height: 1.75;
      color: rgba(255,255,255,.95);
      position: relative;
      z-index: 1;
      font-size: 0.98rem;
    }
    @media (min-width: 768px){
      .miradia-richtext{ font-size: 1.05rem; line-height: 1.85; }
    }

    .miradia-richtext h1,
    .miradia-richtext h2,
    .miradia-richtext h3,
    .miradia-richtext h4 {
      margin: 1.2rem 0 0.85rem 0;
      line-height: 1.25;
      font-weight: 650;
      color: white;
      position: relative;
      padding-left: 12px;
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
      width: 4px;
      background: linear-gradient(to bottom, var(--m-sky), var(--m-green));
      border-radius: 999px;
    }

    .miradia-richtext p { margin: 0.9rem 0; }
    .miradia-richtext ul, .miradia-richtext ol { margin: 0.9rem 0; padding-left: 1.35rem; }
    .miradia-richtext li { margin: 0.45rem 0; }

    .miradia-richtext pre,
    .miradia-richtext code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      background: var(--m-code-bg) !important;
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 12px;
      padding: 10px 12px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      color: rgba(255,255,255,.92);
      margin: 0.9rem 0;
      font-size: 0.9rem;
      line-height: 1.45;
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

      {/* overlays: ✅ dark => beaucoup plus noir */}
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

const InactiveSlideContent = ({ slide, idx, isMobile, goTo }) => (
  <div className="h-full flex flex-col justify-center items-center text-center px-2">
    <div className="text-white/80 text-[11px] tracking-[0.25em] uppercase mb-2">
      {String(idx + 1).padStart(2, "0")}
    </div>

    <div className="text-white font-semibold text-sm sm:text-base line-clamp-2 max-w-[18rem] drop-shadow-[0_10px_40px_rgba(0,0,0,.35)]">
      {slide.title || "—"}
    </div>

    {slide.tag && (
      <p className="mt-2 text-[10px] sm:text-xs uppercase tracking-[0.3em] text-[var(--m-green)] font-medium truncate max-w-full">
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
        className="mt-4 px-5 py-2 rounded-xl border border-white/25 text-white text-xs font-semibold opacity-0 translate-y-2 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0 hover:bg-white/10 hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--m-sky)]"
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
        {slide.tag && (
          <p className="uppercase tracking-[0.3em] text-white/90 mb-2 sm:mb-3 font-medium flex items-center gap-2 text-[10px] sm:text-xs">
            <span className="inline-block w-5 sm:w-7 h-px bg-gradient-to-r from-[var(--m-green)] to-transparent"></span>
            {slide.tag}
            <span className="inline-block w-5 sm:w-7 h-px bg-gradient-to-l from-[var(--m-green)] to-transparent"></span>
          </p>
        )}

        <h3 className="font-extrabold leading-tight text-[var(--m-sky)] drop-shadow-[0_10px_30px_rgba(0,0,0,.65)] text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
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
