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
  REVEAL_DELAY: 380,
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
    .map((_, i) => (i === activeIndex ? "2.4fr" : "1fr"))
    .join(" ");

const getAlignmentClass = (index, isMobile) => {
  if (isMobile) return "items-start text-left";
  const position = index % 3;
  if (position === 0) return "items-start text-left";
  if (position === 1) return "items-center text-center";
  return "items-end text-right";
};

/* ========================================
   HOOKS
======================================== */
const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
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
        if (mounted) { setSlides(normalized); setIsLoading(false); }
      })
      .catch((e) => {
        console.error("Erreur fetch slides:", e?.message || e);
        if (mounted) setIsLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  return { slides, isLoading };
};

const useHtmlDarkMode = () => {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
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

  useEffect(() => {
    return () => {
      [fadeTimerRef, autoTimerRef, resumeTimerRef, revealTimerRef].forEach((r) => {
        if (r.current) clearTimeout(r.current);
      });
      if (bgRafRef.current) cancelAnimationFrame(bgRafRef.current);
    };
  }, []);

  useEffect(() => {
    setRevealContent(false);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    revealTimerRef.current = setTimeout(() => setRevealContent(true), CONFIG.REVEAL_DELAY);
    return () => { if (revealTimerRef.current) clearTimeout(revealTimerRef.current); };
  }, [safeCurrent]);

  useEffect(() => {
    setBgFadeIn(false);
    if (bgRafRef.current) cancelAnimationFrame(bgRafRef.current);
    bgRafRef.current = requestAnimationFrame(() => setBgFadeIn(true));
    return () => { if (bgRafRef.current) cancelAnimationFrame(bgRafRef.current); };
  }, [activeSlide?.image]);

  const goTo = useCallback((nextIndex) => {
    if (!total) return;
    const next = ((nextIndex % total) + total) % total;
    if (next === safeCurrent) return;
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setPrevIndex(safeCurrent);
    setCurrent(next);
    fadeTimerRef.current = setTimeout(() => setPrevIndex(null), CONFIG.FADE_DURATION);
  }, [safeCurrent, total]);

  const goNext = useCallback(() => goTo(safeCurrent + 1), [goTo, safeCurrent]);
  const goPrev = useCallback(() => goTo(safeCurrent - 1), [goTo, safeCurrent]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); goPrev(); }
  }, [goNext, goPrev]);

  const handleTouchStart = (e) => {
    if (isMobile) { touchStartX.current = e.touches[0].clientX; touchEndX.current = e.touches[0].clientX; }
  };
  const handleTouchMove  = (e) => { if (isMobile) touchEndX.current = e.touches[0].clientX; };
  const handleTouchEnd   = () => {
    if (!isMobile) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > CONFIG.SWIPE_THRESHOLD) diff > 0 ? goNext() : goPrev();
  };

  const pauseBriefly = (ms = CONFIG.PAUSE_ON_SCROLL) => {
    setIsPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      if (!isHoveringRef.current) setIsPaused(false);
    }, ms);
  };

  useEffect(() => {
    if (!total || isPaused) return;
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    autoTimerRef.current = setTimeout(goNext, CONFIG.SLIDE_DURATION);
    return () => { if (autoTimerRef.current) clearTimeout(autoTimerRef.current); };
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
      className="slider-scope relative h-[calc(100vh-100px)] min-h-[560px] sm:min-h-[640px] overflow-hidden group select-none outline-none focus-visible:ring-2 focus-visible:ring-[rgba(64,168,220,0.55)]"
      onMouseEnter={() => { isHoveringRef.current = true; setIsPaused(true); }}
      onMouseLeave={() => { isHoveringRef.current = false; setIsPaused(false); }}
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
======================================== */
const SliderStyles = () => (
  <style>{`
    .slider-scope {
      --m-sky:   #40A8DC;
      --m-green: #4CC04F;
      --m-sun:   #FDCB00;

      --m-card-bg:     rgba(255,255,255,.14);
      --m-card-bd:     rgba(255,255,255,.30);
      --m-glow:        rgba(64,168,220,.55);
      --m-dots-bg:     rgba(0,0,0,.32);
      --m-dots-bd:     rgba(255,255,255,.14);
      --m-progress-track: rgba(255,255,255,.18);
    }

    html.dark .slider-scope {
      --m-card-bg:  rgba(0,0,0,.45);
      --m-card-bd:  rgba(255,255,255,.14);
      --m-glow:     rgba(64,168,220,.65);
      --m-dots-bg:  rgba(0,0,0,.55);
      --m-dots-bd:  rgba(255,255,255,.10);
      --m-progress-track: rgba(255,255,255,.12);
    }

    /* ── Background zoom ── */
    @keyframes miradiaBgZoom {
      0%   { transform: scale(1.04) translate3d(0,0,0); }
      50%  { transform: scale(1.10) translate3d(0,-1.5%,0); }
      100% { transform: scale(1.04) translate3d(0,0,0); }
    }

    /* ── Floating particle ── */
    @keyframes floatUp {
      0%   { opacity: 0; transform: translateY(0) scale(.6); }
      20%  { opacity: .7; }
      80%  { opacity: .4; }
      100% { opacity: 0; transform: translateY(-120px) scale(1.1); }
    }

    /* ── Shimmer line sweep ── */
    @keyframes shimmerSweep {
      0%   { transform: translateX(-100%); opacity: 0; }
      30%  { opacity: 1; }
      100% { transform: translateX(200%); opacity: 0; }
    }

    /* ── Tag pulse glow ── */
    @keyframes tagPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(64,168,220,0); }
      50%       { box-shadow: 0 0 14px 3px rgba(64,168,220,.35); }
    }

    /* ── Counter digit slide ── */
    @keyframes digitSlide {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Reveal animations ── */
    .rise-hold {
      opacity: 0;
      transform: translate3d(0, 18px, 0) scale(.996);
      filter: blur(.5px);
      will-change: transform, opacity, filter;
    }
    .rise-show {
      opacity: 1;
      transform: translate3d(0,0,0) scale(1);
      filter: blur(0);
      transition:
        opacity  580ms cubic-bezier(.22,1,.36,1),
        transform 580ms cubic-bezier(.22,1,.36,1),
        filter   580ms cubic-bezier(.22,1,.36,1);
    }
    .rise-d1 { transition-delay: 60ms;  }
    .rise-d2 { transition-delay: 190ms; }
    .rise-d3 { transition-delay: 320ms; }
    .rise-d4 { transition-delay: 440ms; }

    /* ── Slide-in from left for title bar ── */
    .slide-in-hold {
      opacity: 0;
      transform: translate3d(-28px, 0, 0);
      will-change: opacity, transform;
    }
    .slide-in-show {
      opacity: 1;
      transform: translate3d(0,0,0);
      transition: opacity 600ms cubic-bezier(.22,1,.36,1), transform 600ms cubic-bezier(.22,1,.36,1);
      transition-delay: 80ms;
    }

    /* ── Content card ── */
    .miradia-content-card {
      position: relative;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,.18);
      background: rgba(0,0,0,.28);
      box-shadow: 0 12px 40px rgba(0,0,0,.40), inset 0 1px 0 rgba(255,255,255,.12);
      padding: 20px 22px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      overflow: hidden;
      scrollbar-gutter: stable;
      transform: translateZ(0);
    }
    @media (min-width: 768px)  { .miradia-content-card { padding: 22px 26px; } }
    @media (min-width: 1024px) { .miradia-content-card { padding: 26px 30px; } }

    /* inner ambient glow */
    .miradia-content-card::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background:
        radial-gradient(ellipse at 18% 15%, rgba(64,168,220,.12), transparent 55%),
        radial-gradient(ellipse at 88% 90%, rgba(76,192,79,.08), transparent 60%);
      pointer-events: none;
      z-index: 0;
    }

    /* animated shimmer sweep */
    .miradia-content-card::after {
      content: "";
      position: absolute;
      top: 0; left: 0;
      width: 50%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255,255,255,.05) 40%,
        rgba(255,255,255,.10) 50%,
        rgba(255,255,255,.05) 60%,
        transparent
      );
      pointer-events: none;
      z-index: 1;
      animation: shimmerSweep 5s cubic-bezier(.4,0,.6,1) infinite;
    }

    /* ── Title plate ── */
    .miradia-title-plate {
      position: relative;
      border-radius: 16px;
      padding: 14px 18px;
      background: rgba(0,0,0,.32);
      border: 1px solid rgba(255,255,255,.16);
      box-shadow: 0 10px 32px rgba(0,0,0,.36), inset 0 1px 0 rgba(255,255,255,.08);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      overflow: hidden;
    }
    @media (min-width: 768px) {
      .miradia-title-plate { padding: 16px 22px; border-radius: 18px; }
    }

    /* animated left accent bar */
    .miradia-title-plate::before {
      content: "";
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 3px;
      background: linear-gradient(to bottom, var(--m-sky), var(--m-green), var(--m-sun));
      border-radius: 999px;
    }

    /* ── Tag pill ── */
    .miradia-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      border-radius: 999px;
      background: rgba(64,168,220,.18);
      border: 1px solid rgba(64,168,220,.35);
      color: rgba(255,255,255,.95);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .26em;
      text-transform: uppercase;
      animation: tagPulse 3s ease-in-out infinite;
    }
    .miradia-tag::before {
      content: "";
      display: inline-block;
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--m-sky);
      box-shadow: 0 0 6px var(--m-sky);
    }

    /* ── Rich text — min 20px ── */
    .miradia-richtext {
      line-height: 1.80;
      color: rgba(255,255,255,.95);
      position: relative;
      z-index: 2;
      font-size: 20px; /* ✅ min 20px */
    }
    @media (min-width: 640px)  { .miradia-richtext { font-size: 20px; } }
    @media (min-width: 1024px) { .miradia-richtext { font-size: 21px; line-height: 1.88; } }
    @media (min-width: 1280px) { .miradia-richtext { font-size: 22px; } }

    .miradia-richtext h1,
    .miradia-richtext h2,
    .miradia-richtext h3,
    .miradia-richtext h4 {
      margin: 1.1rem 0 .8rem;
      line-height: 1.25;
      font-weight: 800;
      color: rgba(255,255,255,1);
      padding-left: 12px;
      position: relative;
    }
    .miradia-richtext h1 { font-size: 28px; }
    .miradia-richtext h2 { font-size: 25px; }
    .miradia-richtext h3 { font-size: 22px; }
    .miradia-richtext h4 { font-size: 20px; }

    .miradia-richtext h1::before,
    .miradia-richtext h2::before,
    .miradia-richtext h3::before,
    .miradia-richtext h4::before {
      content: "";
      position: absolute;
      left: 0; top: .18em; bottom: .18em;
      width: 3px;
      background: linear-gradient(to bottom, var(--m-sky), var(--m-green));
      border-radius: 999px;
    }

    .miradia-richtext p  { margin: .75rem 0; font-size: inherit; }
    .miradia-richtext ul,
    .miradia-richtext ol { margin: .75rem 0; padding-left: 1.4rem; }
    .miradia-richtext li { margin: .4rem 0; font-size: inherit; }

    .miradia-richtext strong { color: #fff; font-weight: 700; }
    .miradia-richtext em     { color: rgba(255,255,255,.88); font-style: italic; }

    .miradia-richtext pre,
    .miradia-richtext code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
      background: rgba(0,0,0,.32) !important;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 12px;
      padding: 10px 14px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      color: rgba(255,255,255,.92);
      margin: .8rem 0;
      font-size: 16px; /* code stays slightly smaller for readability */
      line-height: 1.55;
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
      border-bottom-color: rgba(76,192,79,.50);
    }

    /* ── Scrollbar ── */
    .miradia-scroll::-webkit-scrollbar       { width: 8px; }
    .miradia-scroll::-webkit-scrollbar-thumb {
      background: linear-gradient(to bottom, var(--m-sky), var(--m-green));
      border-radius: 999px;
    }
    .miradia-scroll::-webkit-scrollbar-track {
      background: rgba(255,255,255,.08);
      border-radius: 999px;
      margin: 4px 0;
    }

    /* ── Inactive slide nav button ── */
    .slide-nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 20px;
      border-radius: 10px;
      background: rgba(255,255,255,.10);
      border: 1px solid rgba(255,255,255,.20);
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: .06em;
      cursor: pointer;
      transition: background .2s, border-color .2s, transform .15s;
    }
    .slide-nav-btn:hover {
      background: rgba(255,255,255,.16);
      border-color: rgba(255,255,255,.32);
      transform: translateY(-1px);
    }
    .slide-nav-btn:active { transform: translateY(0); }

    /* ── Counter ── */
    .slide-counter {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: .22em;
      text-transform: uppercase;
      color: rgba(255,255,255,.75);
    }
    .slide-counter span {
      display: inline-block;
      animation: digitSlide .35s cubic-bezier(.22,1,.36,1) both;
    }

    /* ── Pause badge ── */
    .pause-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      background: rgba(253,203,0,.16);
      border: 1px solid rgba(253,203,0,.30);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .22em;
      text-transform: uppercase;
      color: var(--m-sun);
    }

    /* ── BG layer ── */
    .bg-layer {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      will-change: opacity, transform;
    }

    /* ── Particle dots decoration ── */
    .particle {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      animation: floatUp linear infinite;
      opacity: 0;
    }

    @media (prefers-reduced-motion: reduce) {
      .rise-hold, .rise-show,
      .slide-in-hold, .slide-in-show {
        opacity: 1 !important;
        transform: none !important;
        filter: none !important;
        transition: none !important;
      }
      .bg-layer { animation: none !important; }
      .miradia-content-card::after { animation: none !important; }
    }
  `}</style>
);

/* ========================================
   PARTICLE DECORATION
======================================== */
const Particles = () => (
  <>
    {[
      { w:5, h:5, l:"12%", dur:"7s", delay:"0s",  color:"rgba(64,168,220,.55)" },
      { w:4, h:4, l:"28%", dur:"9s", delay:"2s",  color:"rgba(76,192,79,.45)" },
      { w:6, h:6, l:"54%", dur:"8s", delay:"1.2s",color:"rgba(253,203,0,.40)" },
      { w:3, h:3, l:"72%", dur:"11s",delay:"3.5s",color:"rgba(64,168,220,.35)" },
      { w:5, h:5, l:"88%", dur:"7.5s",delay:"0.8s",color:"rgba(76,192,79,.50)" },
    ].map((p, i) => (
      <div
        key={i}
        className="particle"
        style={{
          width: p.w, height: p.h,
          left: p.l, bottom: "15%",
          background: p.color,
          boxShadow: `0 0 6px ${p.color}`,
          animationDuration: p.dur,
          animationDelay: p.delay,
        }}
      />
    ))}
  </>
);

/* ========================================
   BACKGROUND
======================================== */
const BackgroundLayers = ({ prevBg, curBg, bgFadeIn, fadeMs, isDark }) => {
  const curFilter  = isDark ? "contrast(1.08) saturate(1.05) brightness(0.76)" : "contrast(1.08) saturate(1.10) brightness(1.00)";
  const prevFilter = isDark ? "contrast(1.06) saturate(1.03) brightness(0.74)" : "contrast(1.06) saturate(1.08) brightness(0.98)";

  return (
    <>
      {prevBg && (
        <div className="bg-layer" style={{ backgroundImage: `url(${prevBg})`, filter: prevFilter, opacity: 1 }} />
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

      {/* overlays */}
      <div className="absolute inset-0" style={{ backgroundColor: isDark ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.12)" }} />
      <div className="absolute inset-0" style={{
        backgroundImage: isDark
          ? "linear-gradient(to top, rgba(0,0,0,0.68), rgba(0,0,0,0.32), rgba(0,0,0,0.16))"
          : "linear-gradient(to top, rgba(0,0,0,0.35), rgba(0,0,0,0.18), rgba(0,0,0,0.08))"
      }} />
      <div className="absolute inset-0" style={{
        backgroundImage: "radial-gradient(ellipse at top, rgba(64,168,220,0.14), transparent 55%)"
      }} />
      <div className="absolute inset-0" style={{
        backgroundImage: isDark
          ? "radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.36) 100%)"
          : "radial-gradient(ellipse at center, transparent 32%, rgba(0,0,0,0.14) 100%)"
      }} />

      <Particles />
    </>
  );
};

/* ========================================
   MOBILE NAV BUTTONS
======================================== */
const MobileNavButtons = ({ onPrev, onNext }) => (
  <>
    {[
      { label: "Slide précédent", action: onPrev, side: "left-2 sm:left-4", path: "M15 19l-7-7 7-7" },
      { label: "Slide suivant",   action: onNext, side: "right-2 sm:right-4", path: "M9 5l7 7-7 7" },
    ].map(({ label, action, side, path }) => (
      <button
        key={side}
        onClick={action}
        className={`absolute ${side} top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/55 backdrop-blur-sm border border-white/22 flex items-center justify-center text-white hover:bg-black/75 hover:border-white/38 transition-all active:scale-90 shadow-xl`}
        aria-label={label}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
        </svg>
      </button>
    ))}
  </>
);

/* ========================================
   SLIDES CONTAINER
======================================== */
const SlidesContainer = ({ slides, safeCurrent, total, isMobile, goTo, revealContent, isPaused, alignClass, pauseBriefly }) => (
  <div
    className={[
      "relative z-10 h-full",
      isMobile ? "flex flex-col" : "grid transition-[grid-template-columns] duration-700 ease-in-out",
    ].join(" ")}
    style={{ gridTemplateColumns: !isMobile ? getGridTemplate(total, safeCurrent) : undefined }}
  >
    {slides.map((slide, idx) => (
      <SlideItem
        key={slide.id}
        slide={slide}
        idx={idx}
        isActive={idx === safeCurrent}
        isVisibleMobile={isMobile ? idx === safeCurrent : true}
        isMobile={isMobile}
        total={total}
        goTo={goTo}
        revealContent={revealContent}
        isPaused={isPaused}
        alignClass={alignClass}
        pauseBriefly={pauseBriefly}
      />
    ))}
  </div>
);

/* ========================================
   SLIDE ITEM
======================================== */
const SlideItem = ({ slide, idx, isActive, isVisibleMobile, isMobile, total, goTo, revealContent, isPaused, alignClass, pauseBriefly }) => (
  <div
    onClick={() => goTo(idx)}
    className={[
      "relative cursor-pointer transition-all duration-700 ease-in-out",
      ...(isMobile
        ? [
            "w-full px-4 sm:px-5 py-4 sm:py-5",
            isActive ? "flex-1 min-h-[52vh] sm:min-h-[58vh]" : "h-14 sm:h-16 flex-shrink-0",
            "border-t border-white/10 first:border-t-0",
            !isActive ? "opacity-70 hover:opacity-100 bg-black/26" : "bg-black/28",
          ]
        : [
            "px-5 sm:px-6 md:px-7 py-7 sm:py-8 md:py-10",
            "border-l border-white/10 last:border-r",
            isActive ? "bg-black/28 shadow-2xl" : "bg-black/14 hover:bg-black/20 hover:shadow-xl",
          ]),
    ].join(" ")}
    style={{ display: isMobile && !isVisibleMobile ? "none" : "block" }}
    aria-current={isActive ? "true" : "false"}
  >
    {!isActive ? (
      <InactiveSlideContent slide={slide} idx={idx} isMobile={isMobile} goTo={goTo} />
    ) : (
      <ActiveSlideContent
        slide={slide} idx={idx} total={total}
        revealContent={revealContent} isPaused={isPaused}
        alignClass={alignClass} isMobile={isMobile} pauseBriefly={pauseBriefly}
      />
    )}

    {/* top accent bar */}
    {!isMobile && (
      <div
        className={[
          "pointer-events-none absolute inset-x-0 top-0 transition-all duration-500",
          isActive ? "opacity-100 h-[3px]" : "opacity-0 h-[2px] group-hover:opacity-60 group-hover:h-[2px]",
        ].join(" ")}
        style={{
          background: "linear-gradient(90deg, var(--m-sky), var(--m-green), var(--m-sun))",
          boxShadow: isActive ? "0 0 12px rgba(64,168,220,.55)" : "none",
        }}
      />
    )}
  </div>
);

/* ========================================
   INACTIVE CONTENT
======================================== */
const InactiveSlideContent = ({ slide, idx, isMobile, goTo }) => (
  <div className="h-full flex flex-col justify-center items-center text-center px-2 gap-3">
    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 border border-white/16 text-white/85 text-[12px] font-bold tracking-[.20em]">
      {String(idx + 1).padStart(2, "0")}
    </div>

    <div className="text-white/96 font-semibold text-[15px] sm:text-base leading-snug line-clamp-2 max-w-[18rem]">
      {slide.title || "—"}
    </div>

    {slide.tag && (
      <span className="inline-flex items-center px-3 py-1 rounded-full bg-black/28 border border-white/12 text-[10px] uppercase tracking-[.26em] text-[var(--m-green)] font-bold max-w-full truncate">
        {slide.tag}
      </span>
    )}

    {!isMobile && (
      <button
        type="button"
        className="slide-nav-btn mt-1"
        onClick={(e) => { e.stopPropagation(); goTo(idx); }}
        aria-label={`Voir ${slide.title}`}
      >
        Voir
      </button>
    )}
  </div>
);

/* ========================================
   ACTIVE CONTENT
======================================== */
const ActiveSlideContent = ({ slide, idx, total, revealContent, isPaused, alignClass, isMobile, pauseBriefly }) => (
  <div className={`h-full flex flex-col justify-between ${alignClass}`}>

    {/* Title block */}
    <div className={revealContent ? "slide-in-show" : "slide-in-hold"}>
      <div className="miradia-title-plate">
        {slide.tag && (
          <div className="mb-3">
            <span className="miradia-tag">{slide.tag}</span>
          </div>
        )}
        <h3
          className="font-extrabold leading-tight drop-shadow-[0_10px_30px_rgba(0,0,0,.70)]"
          style={{
            color: "var(--m-sky)",
            fontSize: isMobile ? "clamp(22px,5vw,32px)" : "clamp(26px,3.5vw,52px)",
          }}
        >
          {slide.title}
        </h3>
      </div>
    </div>

    {/* Description card */}
    <div className={`mt-4 sm:mt-6 md:mt-8 w-full ${revealContent ? "rise-show rise-d2" : "rise-hold"}`}>
      <div
        className={[
          "miradia-content-card miradia-scroll overscroll-contain overflow-y-auto pr-2 sm:pr-3",
          isMobile ? "max-h-[38vh]" : "max-h-[44vh]",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => { e.stopPropagation(); pauseBriefly(1400); }}
        onScroll={(e) => { e.stopPropagation(); pauseBriefly(1400); }}
      >
        <div
          className="miradia-richtext"
          dangerouslySetInnerHTML={{ __html: slide.description || "<p></p>" }}
        />
      </div>
    </div>

    {/* Footer bar */}
    <div className={`mt-4 sm:mt-5 md:mt-6 w-full flex items-center justify-between ${revealContent ? "rise-show rise-d4" : "rise-hold"}`}>
      <div className="slide-counter">
        <span key={idx}>{String(idx + 1).padStart(2, "0")}</span>
        <span className="opacity-45 mx-2">/</span>
        <span>{String(total).padStart(2, "0")}</span>
      </div>

      {isPaused && (
        <span className="pause-badge">
          <span className="w-2 h-2 rounded-full bg-[var(--m-sun)] animate-pulse" />
          {isMobile ? "Pause" : "En pause"}
        </span>
      )}
    </div>
  </div>
);

/* ========================================
   PROGRESS BAR
======================================== */
const ProgressBar = ({ progress, isMobile }) => (
  <div
    className="absolute bottom-0 left-0 w-full z-30"
    style={{ background: "var(--m-progress-track)", height: isMobile ? 2 : 3 }}
  >
    <div className="h-full transition-[width] duration-150 ease-linear relative" style={{ width: `${progress}%` }}>
      <div
        className="absolute inset-0 rounded-r-full"
        style={{ background: "linear-gradient(90deg, var(--m-sky), var(--m-green), var(--m-sun))" }}
      />
      {!isMobile && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white"
          style={{ boxShadow: "0 0 12px rgba(64,168,220,.90), 0 0 4px rgba(255,255,255,.80)" }}
        />
      )}
    </div>
  </div>
);

/* ========================================
   DOTS INDICATOR
======================================== */
const DotsIndicator = ({ slides, safeCurrent, goTo }) => (
  <div className="absolute bottom-5 sm:bottom-7 left-1/2 -translate-x-1/2 z-30">
    <div
      className="flex items-center gap-2.5 rounded-full px-3.5 py-2.5 backdrop-blur-md"
      style={{ background: "var(--m-dots-bg)", border: "1px solid var(--m-dots-bd)" }}
    >
      {slides.map((s, i) => {
        const active = i === safeCurrent;
        return (
          <button
            key={s.id}
            type="button"
            onClick={(e) => { e.stopPropagation(); goTo(i); }}
            className={[
              "transition-all duration-350",
              active ? "w-5 h-2.5 rounded-full scale-100" : "w-2.5 h-2.5 rounded-full opacity-60 hover:opacity-90 hover:scale-110",
            ].join(" ")}
            style={{
              background: active
                ? "linear-gradient(90deg, var(--m-sky), var(--m-green))"
                : "rgba(255,255,255,.55)",
              boxShadow: active ? "0 0 14px var(--m-glow)" : "none",
            }}
            aria-label={`Aller au slide ${i + 1}`}
            aria-current={active ? "true" : "false"}
          />
        );
      })}
    </div>
  </div>
);

/* ========================================
   SWIPE INDICATOR
======================================== */
const SwipeIndicator = () => (
  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
    <div className="flex items-center gap-2 text-white/65">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
      </svg>
      <span className="text-[13px] font-medium tracking-wide">Glisser</span>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </div>
);