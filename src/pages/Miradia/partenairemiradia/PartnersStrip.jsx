import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import PartnerStandardCard from "./PartnerStandardCard";
import api from "../../../services/api";
import { Link } from "react-router-dom";

/* =========================
   PALETTE MIRADIA
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
const CARD_W = 320;
const CARD_W_SM = 260;
const CARD_H = 260;
const PANEL_PAD_Y = "py-10";
const SHOW_CTA = 1;
const GAP_SM = 22;
const GAP_MD = 30;

// ── Physics ──────────────────────────────────────────
const FRICTION       = 0.91;   // velocity decay per frame (lower = more friction)
const MIN_VELOCITY   = 0.2;    // px/frame threshold to stop momentum
const VELOCITY_SCALE = 1.1;    // drag velocity multiplier
const AUTO_SPEED     = 0.7;    // auto-scroll px/frame
const BOUNCE_K       = 0.22;   // spring stiffness for soft boundary
const BOUNCE_DAMPING = 0.70;   // spring damping

/* =========================
   Hook: reveal IDs when visible in viewport
========================= */
function useVisibleIdsViewport({ ids, threshold = 0.2, rootMargin = "180px" }) {
  const [visibleIds, setVisibleIds] = useState(() => new Set());
  const elByIdRef = useRef(new Map());

  const setObservedRef = useCallback((id) => (el) => {
    const map = elByIdRef.current;
    if (!el) { map.delete(id); return; }
    map.set(id, el);
  }, []);

  useEffect(() => {
    if (!ids?.length) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisibleIds(new Set(ids)); return;
    }
    let raf = 0;
    const obs = new IntersectionObserver((entries) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setVisibleIds((prev) => {
          const next = new Set(prev);
          for (const e of entries) {
            const id = e.target?.dataset?.pid;
            if (id && e.isIntersecting) next.add(id);
          }
          return next;
        });
      });
    }, { root: null, threshold, rootMargin });

    const map = elByIdRef.current;
    for (const id of ids) { const el = map.get(id); if (el) obs.observe(el); }
    return () => { cancelAnimationFrame(raf); obs.disconnect(); };
  }, [ids, threshold, rootMargin]);

  return { visibleIds, setObservedRef };
}

/* =========================
   Hook: drag-to-scroll with momentum + spring bounce
========================= */
function useDragScroll() {
  const trackRef   = useRef(null);
  const stateRef   = useRef({
    isDragging: false,
    isHovered:  false,
    startX:     0,
    startOff:   0,
    offset:     0,      // logical offset (px, grows negatively)
    velocity:   0,      // px / frame
    lastX:      0,
    lastTime:   0,
    rafId:      null,
    halfW:      0,      // half of track width (loop boundary)
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isHovered,  setIsHovered]  = useState(false);
  // Expose velocity magnitude for visual feedback
  const [velMag, setVelMag] = useState(0);

  // Wrap offset into [-halfW, 0)
  const wrap = (o, hw) => {
    if (hw <= 0) return o;
    let r = o % hw;
    if (r > 0) r -= hw;
    return r;
  };

  useEffect(() => {
    const s = stateRef.current;

    function loop() {
      const track = trackRef.current;
      if (!track) { s.rafId = requestAnimationFrame(loop); return; }

      // Recompute halfW lazily (tripled list, so /3)
      const tw = track.scrollWidth;
      s.halfW = tw / 3;

      if (s.isDragging) {
        // Position set directly in event handlers; just render
      } else if (s.isHovered) {
        // Momentum only (no auto-scroll while hovered)
        s.velocity *= FRICTION;
        s.offset += s.velocity;

        if (Math.abs(s.velocity) < MIN_VELOCITY) s.velocity = 0;
      } else {
        // Auto-scroll + blend with leftover momentum
        const autoContrib = AUTO_SPEED;
        s.velocity *= FRICTION;
        s.offset   -= autoContrib + Math.max(0, -s.velocity);
        // If user threw forward (positive velocity), blend in
        s.offset   += Math.max(0, s.velocity);

        if (Math.abs(s.velocity) < MIN_VELOCITY) s.velocity = 0;
      }

      const display = wrap(s.offset, s.halfW);
      track.style.transform = `translateX(${display}px)`;

      setVelMag(Math.abs(s.velocity));
      s.rafId = requestAnimationFrame(loop);
    }

    s.rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(s.rafId);
  }, []);

  // ── Pointer / Mouse ──────────────────────────────
  const onPointerDown = useCallback((e) => {
    const s = stateRef.current;
    s.isDragging = true;
    s.startX     = e.clientX;
    s.lastX      = e.clientX;
    s.lastTime   = performance.now();
    s.velocity   = 0;

    // Read current visual offset
    const track = trackRef.current;
    if (track) {
      const mat   = new DOMMatrix(getComputedStyle(track).transform);
      const cur   = mat.m41;
      s.startOff  = cur;
      s.offset    = cur;
    }

    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback((e) => {
    const s = stateRef.current;
    if (!s.isDragging) return;

    const now  = performance.now();
    const dt   = Math.max(1, now - s.lastTime);
    const dx   = e.clientX - s.lastX;

    s.velocity = (dx / dt) * 16.67 * VELOCITY_SCALE;
    s.offset   = s.startOff + (e.clientX - s.startX);
    s.lastX    = e.clientX;
    s.lastTime = now;
  }, []);

  const onPointerUp = useCallback(() => {
    const s = stateRef.current;
    if (!s.isDragging) return;
    s.isDragging = false;
    setIsDragging(false);
  }, []);

  // ── Touch ────────────────────────────────────────
  const onTouchStart = useCallback((e) => {
    const t = e.touches[0];
    const s = stateRef.current;
    s.isDragging = true;
    s.startX     = t.clientX;
    s.lastX      = t.clientX;
    s.lastTime   = performance.now();
    s.velocity   = 0;

    const track = trackRef.current;
    if (track) {
      const mat  = new DOMMatrix(getComputedStyle(track).transform);
      s.startOff = mat.m41;
      s.offset   = mat.m41;
    }
    setIsDragging(true);
  }, []);

  const onTouchMove = useCallback((e) => {
    const t  = e.touches[0];
    const s  = stateRef.current;
    if (!s.isDragging) return;
    const now = performance.now();
    const dt  = Math.max(1, now - s.lastTime);
    const dx  = t.clientX - s.lastX;
    s.velocity = (dx / dt) * 16.67 * VELOCITY_SCALE;
    s.offset   = s.startOff + (t.clientX - s.startX);
    s.lastX    = t.clientX;
    s.lastTime = now;
    e.preventDefault();
  }, []);

  const onTouchEnd = useCallback(() => {
    stateRef.current.isDragging = false;
    setIsDragging(false);
  }, []);

  // ── Hover ────────────────────────────────────────
  const onMouseEnter = useCallback(() => {
    stateRef.current.isHovered = true;
    setIsHovered(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    const s = stateRef.current;
    s.isDragging = false;
    s.isHovered  = false;
    setIsDragging(false);
    setIsHovered(false);
  }, []);

  const panelHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseEnter,
    onMouseLeave,
  };

  return { trackRef, panelHandlers, isDragging, isHovered, velMag };
}

/* =========================
   BACKGROUND
========================= */
function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-30 dark:opacity-14 animate-[float1_12s_ease-in-out_infinite]"
        style={{ background: `radial-gradient(circle at 30% 30%, ${MIRADIA.sky}55, transparent 60%)` }} />
      <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full blur-3xl opacity-24 dark:opacity-12 animate-[float2_14s_ease-in-out_infinite]"
        style={{ background: `radial-gradient(circle at 30% 30%, ${MIRADIA.green}55, transparent 60%)` }} />
      <div className="absolute -bottom-28 left-1/3 h-[520px] w-[520px] rounded-full blur-3xl opacity-18 dark:opacity-10 animate-[float3_16s_ease-in-out_infinite]"
        style={{ background: `radial-gradient(circle at 30% 30%, ${MIRADIA.yellow}44, transparent 60%)` }} />
      <div className="hidden dark:block">
        <div className="absolute top-1/4 -left-12 h-[420px] w-[420px] rounded-full blur-3xl opacity-10 animate-[float4_20s_ease-in-out_infinite]"
          style={{ background: `radial-gradient(circle at 40% 40%, ${MIRADIA.teal}33, transparent 65%)` }} />
        <div className="absolute bottom-1/4 -right-12 h-[460px] w-[460px] rounded-full blur-3xl opacity-[0.08] animate-[float5_22s_ease-in-out_infinite]"
          style={{ background: `radial-gradient(circle at 60% 60%, ${MIRADIA.navy}33, transparent 70%)` }} />
      </div>
      <style>{`
        @keyframes float1 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(18px,14px) } }
        @keyframes float2 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(-14px,18px) } }
        @keyframes float3 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(10px,-16px) } }
        @keyframes float4 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(22px,-8px) } }
        @keyframes float5 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(-18px,12px) } }
      `}</style>
    </div>
  );
}

/* =========================
   Helpers
========================= */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function pickAccentFallback(seed) {
  const palette = [MIRADIA.sky, MIRADIA.green, MIRADIA.yellow, MIRADIA.teal, MIRADIA.navy];
  return palette[seed % palette.length];
}
function isHexColor(v) { return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(v || "").trim()); }
const getCountryFlag = (country) => {
  if (!country) return "🌍";
  const c = String(country).toLowerCase();
  if (c.includes("madagascar")) return "🇲🇬";
  if (c.includes("france"))     return "🇫🇷";
  if (c.includes("canada"))     return "🇨🇦";
  if (c.includes("usa") || c.includes("united states") || c.includes("états-unis")) return "🇺🇸";
  return "🌍";
};

const STORAGE_BASE = (
  import.meta.env.VITE_API_BASE_STORAGE ||
  import.meta.env.VITE_API_BASE_URL ||
  ""
).replace(/\/api\/?$/i, "").replace(/\/+$/, "");

const buildSocieteLogoUrl = (value) => {
  if (!value) return "";
  const s = String(value).trim();
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/")) return s;
  return STORAGE_BASE ? `${STORAGE_BASE}/storage/logos/${s}` : "";
};

/* =========================
   Title
========================= */
function PartnersTitleBlock() {
  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-black/5 dark:ring-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.10)]">
        <div className="absolute inset-0 bg-white/70 dark:bg-white/5" />
        <div className="absolute inset-0 opacity-80 dark:opacity-60" style={{
          background: `radial-gradient(circle at 15% 10%, ${MIRADIA.sky}22, transparent 55%),
                       radial-gradient(circle at 90% 25%, ${MIRADIA.green}18, transparent 60%),
                       radial-gradient(circle at 55% 120%, ${MIRADIA.yellow}14, transparent 55%)`,
        }} />
        <div className="relative px-6 py-8 md:py-10 text-center">
          <div className="inline-flex items-center rounded-full px-4 py-2 text-[11px] font-semibold tracking-[0.22em] uppercase
                          bg-white/85 text-slate-600 ring-1 ring-black/5
                          dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
            Plateforme MIRADIA
          </div>
          <h2 className="mt-4 text-3xl md:text-5xl mb-3 font-black tracking-tight text-slate-900 dark:text-slate-50">
            Quelques membres & partenaires
          </h2>
          <div className="mx-auto mt-4 h-1 w-28 rounded-full"
            style={{ background: `linear-gradient(90deg, ${MIRADIA.green}, ${MIRADIA.yellow}, ${MIRADIA.sky})` }} />
          <p className="mt-4 max-w-3xl mx-auto text-[20px] md:text-[22px] text-slate-600 dark:text-slate-300 leading-relaxed">
            MIRADIA connecte ses partenaires (sociétés, ONG, institutions) dans un espace commun pour partager et consulter
            des documents, rapports, albums photos et supports de formation.
          </p>
          <p className="mt-3 text-[16px] md:text-[18px] text-slate-500 dark:text-slate-400">
            Glissez pour naviguer • Survolez pour mettre en pause • Cliquez pour ouvrir le site.
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================
   PartnersStrip
========================= */
export default function PartnersStrip({ highlightTenantId = null }) {
  const [societes, setSocietes] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/societesPublique", { params: { per_page: 100 } });
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
    return () => { mounted = false; };
  }, []);

  const partners = useMemo(() => {
    if (!Array.isArray(societes) || societes.length === 0) return [];
    return societes.map((s) => {
      const acronym  = s.slug || (s.name ? s.name.split(" ").map((p) => p[0]).join("") : "") || "—";
      const location = s.ville && s.pays ? `${s.ville} · ${s.pays}` : s.ville || s.pays || "Madagascar";
      const id       = String(s.id ?? "");
      const isActive = highlightTenantId != null && String(highlightTenantId) === id;
      return {
        id, name: s.name || acronym, acronym,
        logo: buildSocieteLogoUrl(s.logo_url),
        href: s.website_url || "#", location,
        role: s.description || "Organisation membre de la plateforme MIRADIA.",
        countryFlag: getCountryFlag(s.pays), isActive,
        brandColor: s.brand_color || s.color || null,
      };
    });
  }, [societes, highlightTenantId]);

  const hasData = partners.length > 0;

  // Triple the list for smooth infinite-drag loop
  const marqueeItems = useMemo(() => (hasData ? [...partners, ...partners, ...partners] : []), [hasData, partners]);

  const ids = useMemo(() => partners.map((p) => p.id), [partners]);
  const { visibleIds, setObservedRef } = useVisibleIdsViewport({ ids, threshold: 0.2, rootMargin: "200px" });

  const accentById = useMemo(() => {
    const map = {};
    for (const p of partners) {
      const v = p.brandColor;
      map[p.id] = (v && isHexColor(v)) ? String(v).trim() : pickAccentFallback(hashString(p.id + "|" + p.name));
    }
    return map;
  }, [partners]);

  const { trackRef, panelHandlers, isDragging, isHovered, velMag } = useDragScroll();

  return (
    <section className="relative w-full overflow-x-hidden" aria-label="Partenaires de la plateforme MIRADIA">
      <div className="relative w-full bg-[#eef5fb] dark:bg-gradient-to-b dark:from-[#071324] dark:via-[#050D18] dark:to-[#040812]">
        <AnimatedBackground />

        <div className="relative mx-auto w-full max-w-[1700px] px-2 sm:px-4 lg:px-8 py-10 md:py-12 bg-white/10 dark:bg-black/20">
          <PartnersTitleBlock />

          <div
            className={cx(
              "mt-10 w-full rounded-3xl overflow-hidden",
              "bg-white/70 dark:bg-white/5 backdrop-blur-xl",
              "ring-1 ring-black/5 dark:ring-white/10",
              "p-3 sm:p-4"
            )}
            style={{
              ["--card-w-sm"]: `${CARD_W_SM}px`,
              ["--card-w-md"]: `${CARD_W}px`,
              ["--gap-sm"]:    `${GAP_SM}px`,
              ["--gap-md"]:    `${GAP_MD}px`,
            }}
          >
            <style>{`
              /* ─── Card sizing ──────────────────────────────── */
              .partner-item {
                width: var(--card-w-sm);
                padding-right: var(--gap-sm);
              }
              @media (min-width: 768px) {
                .partner-item {
                  width: var(--card-w-md);
                  padding-right: var(--gap-md);
                }
              }

              /* ─── Drag cursor ──────────────────────────────── */
              .ps-panel {
                cursor: grab;
                user-select: none;
                -webkit-user-select: none;
                touch-action: pan-y;
              }
              .ps-panel.is-dragging { cursor: grabbing; }

              /* ─── Track (JS-controlled position) ──────────── */
              .ps-track {
                will-change: transform;
                backface-visibility: hidden;
                -webkit-backface-visibility: hidden;
              }

              /* ─── Card tilt while dragging ─────────────────── */
              .ps-card {
                transition: transform 0.30s cubic-bezier(0.34,1.56,0.64,1),
                            box-shadow 0.30s ease,
                            opacity 0.50s ease,
                            filter 0.50s ease;
              }
              .ps-panel.is-dragging .ps-card {
                transform: rotate(-1.2deg) scale(0.972) !important;
              }

              /* ─── Velocity glow (data-attr driven) ────────── */
              .ps-vel-glow {
                transition: opacity 0.25s ease;
              }

              /* ─── Drag hint badge ──────────────────────────── */
              .ps-drag-hint {
                transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
              }

              /* ─── Spring bounce keyframe ───────────────────── */
              @keyframes spring-bounce {
                0%   { transform: translateX(calc(var(--bounce-dx, 0px))) scale(1.015); }
                35%  { transform: translateX(calc(var(--bounce-dx, 0px) * -0.4)) scale(1.005); }
                65%  { transform: translateX(calc(var(--bounce-dx, 0px) * 0.15)) scale(1); }
                82%  { transform: translateX(calc(var(--bounce-dx, 0px) * -0.06)) scale(1); }
                100% { transform: translateX(0) scale(1); }
              }

              @media (prefers-reduced-motion: reduce) {
                .ps-track, .ps-card { transition: none !important; animation: none !important; }
                * { animation: none !important; }
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
              <div
                {...panelHandlers}
                className={cx(
                  "ps-panel relative overflow-hidden rounded-2xl",
                  PANEL_PAD_Y, "py-16",
                  isDragging && "is-dragging"
                )}
              >
                {/* ── Drag hint ──────────────────────────────── */}
                <div
                  className={cx(
                    "ps-drag-hint absolute top-3 left-1/2 -translate-x-1/2 z-20",
                    "flex items-center gap-2 rounded-full px-3.5 py-1.5",
                    "text-[10px] font-semibold tracking-[0.18em] uppercase select-none",
                    "bg-white/90 dark:bg-white/10 backdrop-blur-md",
                    "ring-1 ring-black/5 dark:ring-white/10",
                    "text-slate-500 dark:text-slate-300 shadow-sm"
                  )}
                  style={{
                    opacity:   isDragging ? 0 : 1,
                    transform: isDragging ? "translateX(-50%) scale(0.88)" : "translateX(-50%) scale(1)",
                  }}
                >
                  <span style={{ fontSize: 13, lineHeight: 1 }}>⇄</span>
                  Glisser pour défiler
                </div>

                {/* ── Velocity glow overlay ──────────────────── */}
                <div
                  className="ps-vel-glow pointer-events-none absolute inset-0 z-0"
                  style={{
                    opacity:    Math.min(1, velMag / 30) * 0.55,
                    background: `radial-gradient(ellipse 80% 55% at 50% 50%, ${MIRADIA.sky}28, transparent 70%)`,
                  }}
                />

                {/* ── Dragging indicator dots ────────────────── */}
                {isDragging && (
                  <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                    {[0,1,2].map((i) => (
                      <span
                        key={i}
                        className="block h-1.5 w-1.5 rounded-full"
                        style={{
                          background:  MIRADIA.sky,
                          opacity:     0.5 + i * 0.2,
                          animation:   `bounce ${0.5 + i * 0.15}s ease-in-out infinite alternate`,
                          animationDelay: `${i * 80}ms`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* ── Edge fade overlays ─────────────────────── */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-[#071324] dark:via-[#071324]/70" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10 bg-gradient-to-l from-white via-white/80 to-transparent dark:from-[#071324] dark:via-[#071324]/70" />

                {/* ── THE TRACK (JS RAF moves this) ─────────── */}
                <div
                  ref={trackRef}
                  className="ps-track flex items-stretch px-4 md:px-10"
                  style={{ width: "max-content" }}
                >
                  {marqueeItems.map((partner, index) => {
                    const isFirstLoop = index < partners.length;
                    const reveal      = visibleIds.has(partner.id);
                    const accent      = accentById[partner.id] || MIRADIA.sky;

                    return (
                      <div
                        key={`${partner.id || partner.name}-${index}`}
                        data-pid={isFirstLoop ? partner.id : undefined}
                        ref={isFirstLoop ? setObservedRef(partner.id) : undefined}
                        className="partner-item shrink-0"
                      >
                        <div
                          className={cx(
                            "ps-card",
                            reveal
                              ? "opacity-100 translate-y-0 scale-100 blur-0"
                              : "opacity-0 translate-y-3 scale-[0.985] blur-[1px]"
                          )}
                          style={{ height: CARD_H }}
                        >
                          <div
                            className={cx(
                              "relative h-full rounded-2xl overflow-hidden",
                              partner.isActive
                                ? "ring-2 ring-sky-300/70"
                                : "ring-1 ring-black/5 dark:ring-white/10"
                            )}
                            style={{
                              boxShadow: partner.isActive
                                ? `0 18px 60px ${hexToRgba(accent, 0.22)}`
                                : `0 14px 44px ${hexToRgba(accent, 0.12)}`,
                            }}
                          >
                            {/* Accent bar */}
                            <div
                              className="absolute left-0 right-0 top-0 h-[3px]"
                              style={{ background: accent, opacity: 0.95 }}
                            />
                            <PartnerStandardCard {...partner} accentColor={accent} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="text-center md:text-left">
                Glissez pour défiler manuellement • Survolez pour mettre en pause • Cliquez pour visiter le site du partenaire.
              </div>
              {SHOW_CTA && (
                <Link
                  to="/partenaires"
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold
                             bg-white/80 hover:bg-white ring-1 ring-black/5
                             dark:bg-white/5 dark:hover:bg-white/10 dark:ring-white/10 transition"
                >
                  Voir tous les partenaires
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global bounce keyframe (needs to be accessible to inline style refs) */}
      <style>{`
        @keyframes bounce {
          from { transform: translateY(0); }
          to   { transform: translateY(-4px); }
        }
      `}</style>
    </section>
  );
}