import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiMail, FiPhone, FiX, FiBriefcase, FiMapPin } from "react-icons/fi";
import DOMPurify from "dompurify";

/* ── helpers ────────────────────────────────────────────────── */
const MIRADIA = {
  navy:   "#124B7C",
  teal:   "#025C86",
  sky:    "#3AA6DC",
  green:  "#4CC051",
  yellow: "#FCCA00",
};

const ACCENT = {
  sky:     MIRADIA.sky,
  emerald: MIRADIA.green,
  amber:   MIRADIA.yellow,
  blue:    "#2563EB",
  violet:  "#7C3AED",
  rose:    "#E11D48",
  indigo:  "#4F46E5",
};

const getAccentColor = (a) => ACCENT[String(a || "sky")] || ACCENT.sky;

const hexToRgba = (hex, a = 0.25) => {
  const h = String(hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "M") + (parts[1]?.[0] || parts[0]?.[1] || "I")).toUpperCase();
}

function sanitizeRichBio(html) {
  return DOMPurify.sanitize(String(html || ""), {
    USE_PROFILES: { html: true },
    ADD_TAGS: ["span"],
    ADD_ATTR: ["style", "class"],
    ALLOWED_ATTR: ["href", "target", "rel", "style", "class", "lang", "dir", "title"],
    FORBID_TAGS: ["script", "iframe", "object", "embed"],
    FORBID_ATTR: [
      "onerror", "onload", "onclick", "onmouseover", "onmouseenter",
      "onmouseleave", "onfocus", "onblur", "oninput", "onchange", "onsubmit",
    ],
  });
}

/* ── Floating particle ──────────────────────────────────────── */
function Particle({ color, delay, size, x, y, duration, dx = "-30px", dy = "-60px" }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
        background: color,
        opacity: 0,
        "--particle-transform": `translate(${dx}, ${dy})`,
        animation: `particleFloat ${duration}s ease-out ${delay}s forwards`,
      }}
    />
  );
}

/* ── Avatar hero (modal) ────────────────────────────────────── */
function HeroAvatar({ person, accentColor, enter }) {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const full = `${person.name} ${person.surname}`.trim();

  useEffect(() => {
    setBroken(false);
    setLoaded(false);
  }, [person.photo]);

  return (
    <div
      className="relative"
      style={{
        transform: enter ? "scale(1) translateY(0)" : "scale(0.4) translateY(30px)",
        opacity: enter ? 1 : 0,
        transition: "transform 700ms cubic-bezier(.17,.67,.12,1.3) 120ms, opacity 500ms ease 120ms",
      }}
    >
      <div
        className="absolute inset-0 rounded-full animate-[ringPulse_2s_ease-in-out_infinite]"
        style={{
          background: `radial-gradient(circle, ${hexToRgba(accentColor, 0.35)}, transparent 65%)`,
          transform: "scale(2.2)",
        }}
      />
      <div
        className="absolute inset-0 rounded-full animate-[ringPulse_2s_ease-in-out_0.6s_infinite]"
        style={{
          background: `radial-gradient(circle, ${hexToRgba(accentColor, 0.18)}, transparent 65%)`,
          transform: "scale(3)",
        }}
      />

      <div
        className="relative h-24 w-24 rounded-3xl overflow-hidden"
        style={{
          boxShadow: `0 0 0 3px ${accentColor}, 0 18px 50px ${hexToRgba(accentColor, 0.5)}, 0 6px 20px rgba(0,0,0,0.3)`,
        }}
      >
        {broken || !person.photo ? (
          <div className="h-full w-full grid place-items-center font-black text-3xl bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white">
            {initials(full)}
          </div>
        ) : (
          <>
            <img
              src={person.photo}
              alt={full}
              onError={() => setBroken(true)}
              onLoad={() => setLoaded(true)}
              className="h-full w-full object-cover"
              style={{ opacity: loaded ? 1 : 0, transition: "opacity 400ms ease" }}
            />
            {!loaded && <div className="absolute inset-0 bg-slate-800 animate-pulse" />}
          </>
        )}
      </div>

      <div
        className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-[3px] ring-white dark:ring-[#071223]"
        style={{
          background: accentColor,
          animation: "statusPop 400ms cubic-bezier(.17,.67,.12,1.3) 600ms both",
        }}
      />
    </div>
  );
}

/* ── Info chip ──────────────────────────────────────────────── */
function Chip({ icon: Icon, label, value, href, accentColor, delay }) {
  const inner = (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/60 dark:bg-white/5
                 ring-1 ring-black/5 dark:ring-white/8 backdrop-blur-sm
                 hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-200 group"
      style={{
        opacity: 0,
        animation: `slideUp 500ms cubic-bezier(.2,.8,.2,1) ${delay}ms forwards`,
        boxShadow: `0 2px 12px ${hexToRgba(accentColor, 0.08)}`,
      }}
    >
      <div
        className="h-8 w-8 rounded-xl grid place-items-center shrink-0 transition-transform duration-200 group-hover:scale-110"
        style={{ background: hexToRgba(accentColor, 0.15) }}
      >
        <Icon className="h-4 w-4" style={{ color: accentColor }} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {label}
        </div>
        <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
          {value || "—"}
        </div>
      </div>
    </div>
  );

  return href && value ? <a href={href} className="block">{inner}</a> : <div>{inner}</div>;
}

/* ── Bio section ────────────────────────────────────────────── */
function BioSection({ bio, accentColor, enter }) {
  const safe = sanitizeRichBio(bio);

  return (
    <div
      style={{
        opacity: enter ? 1 : 0,
        transform: enter ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 600ms ease 520ms, transform 600ms cubic-bezier(.2,.8,.2,1) 520ms",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-[3px] w-6 rounded-full" style={{ background: accentColor }} />
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Biographie
        </span>
        <div className="flex-1 h-px bg-black/5 dark:bg-white/5" />
      </div>

      <div
        className="rounded-2xl p-4 bg-white/50 dark:bg-white/4 ring-1 ring-black/5 dark:ring-white/6
                   max-h-[450px] overflow-y-auto modal-bio-scroll"
      >
        {safe ? (
          <div
            className="rich-bio text-[13px] leading-relaxed text-slate-700 dark:text-slate-200"
            dangerouslySetInnerHTML={{ __html: safe }}
          />
        ) : (
          <div className="text-[13px] text-slate-400 italic">
            Aucune biographie disponible.
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MODAL — Portal
════════════════════════════════════════════════════════════════ */
export default function Modal({ open, person, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState(0); // 0 hidden, 1 backdrop, 2 card, 3 content, -1 exit
  const timerRef = useRef([]);

  const clearTimers = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  }, []);

  const addTimer = useCallback((fn, ms) => {
    timerRef.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    clearTimers();

    if (!open) {
      if (mounted) {
        setPhase(-1);
        addTimer(() => {
          setMounted(false);
          setPhase(0);
        }, 420);
      }
      return;
    }

    setMounted(true);
    setPhase(0);
    addTimer(() => setPhase(1), 20);
    addTimer(() => setPhase(2), 80);
    addTimer(() => setPhase(3), 200);

    return clearTimers;
  }, [open, mounted, addTimer, clearTimers]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted || !person) return null;

  const accentColor = getAccentColor(person.accent);
  const isOpen = phase >= 1;
  const cardOpen = phase >= 2;
  const contentOpen = phase >= 3;
  const isExit = phase === -1;

  const particles = [
    { color: hexToRgba(accentColor, 0.6), size: 6, x: 10, y: 20, delay: 0.1, duration: 1.4, dx: "-35px", dy: "-55px" },
    { color: hexToRgba(MIRADIA.green, 0.5), size: 4, x: 85, y: 15, delay: 0.25, duration: 1.6, dx: "28px", dy: "-62px" },
    { color: hexToRgba(MIRADIA.yellow, 0.6), size: 8, x: 75, y: 75, delay: 0.05, duration: 1.2, dx: "15px", dy: "-48px" },
    { color: hexToRgba(accentColor, 0.4), size: 5, x: 20, y: 80, delay: 0.35, duration: 1.5, dx: "-22px", dy: "-70px" },
    { color: hexToRgba(MIRADIA.sky, 0.5), size: 3, x: 50, y: 10, delay: 0.15, duration: 1.3, dx: "40px", dy: "-52px" },
    { color: hexToRgba(MIRADIA.green, 0.4), size: 7, x: 90, y: 50, delay: 0.4, duration: 1.7, dx: "-18px", dy: "-45px" },
    { color: hexToRgba(accentColor, 0.3), size: 4, x: 5, y: 50, delay: 0.2, duration: 1.8, dx: "32px", dy: "-60px" },
    { color: hexToRgba(MIRADIA.yellow, 0.4), size: 5, x: 60, y: 90, delay: 0.3, duration: 1.4, dx: "-42px", dy: "-40px" },
  ];

  const portalNode = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 transition-all duration-300"
        onClick={onClose}
        aria-label="Fermer"
        style={{
          background: "rgba(5, 10, 20, 0.72)",
          backdropFilter: `blur(${isOpen && !isExit ? 14 : 0}px)`,
          opacity: isOpen && !isExit ? 1 : 0,
          transition: "opacity 300ms ease, backdrop-filter 300ms ease",
        }}
      />

      <div
        className="relative w-full max-w-[720px] rounded-[32px] overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(28px)",
          boxShadow: `0 0 0 1px rgba(255,255,255,0.3), 0 50px 140px rgba(0,0,0,0.45), 0 0 80px ${hexToRgba(accentColor, 0.25)}`,
          transform: cardOpen && !isExit
            ? "scale(1) translateY(0) perspective(1000px) rotateX(0deg)"
            : "scale(0.78) translateY(40px) perspective(1000px) rotateX(6deg)",
          opacity: cardOpen && !isExit ? 1 : 0,
          transition: "transform 620ms cubic-bezier(.17,.67,.12,1.08), opacity 400ms ease",
          transformOrigin: "50% 40%",
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {cardOpen && particles.map((p, i) => <Particle key={i} {...p} />)}
        </div>

        <div
          className="relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${MIRADIA.teal} 0%, ${MIRADIA.navy} 50%, ${accentColor}99 100%)`,
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(circle at 70% 30%, ${MIRADIA.sky}60 0%, transparent 50%),
                                radial-gradient(circle at 20% 80%, ${MIRADIA.green}40 0%, transparent 45%)`,
            }}
          />

          <div
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${hexToRgba(accentColor, 0.8)}, ${hexToRgba(MIRADIA.sky, 0.9)}, transparent)`,
              animation: "shimmerLine 2s ease-in-out 300ms both",
            }}
          />

          <div className="relative px-8 pt-8 pb-6 flex items-end gap-6">
            <HeroAvatar person={person} accentColor={accentColor} enter={contentOpen} />

            <div
              className="flex-1 min-w-0 pb-1"
              style={{
                opacity: contentOpen ? 1 : 0,
                transform: contentOpen ? "translateX(0)" : "translateX(-20px)",
                transition: "opacity 600ms ease 200ms, transform 600ms cubic-bezier(.2,.8,.2,1) 200ms",
              }}
            >
              <div className="text-white/60 text-[11px] font-semibold uppercase tracking-widest mb-1">
                {person.dept || "Équipe"}
              </div>

              <div className="text-white text-[22px] font-black leading-tight">
                {person.name}{" "}
                <span style={{ color: hexToRgba(MIRADIA.yellow, 1) }}>
                  {person.surname}
                </span>
              </div>

              <div className="text-white/80 text-[14px] font-medium mt-1">
                {person.role || "—"}
              </div>

              {person.badge && (
                <span
                  className="mt-2 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold"
                  style={{
                    background: hexToRgba(MIRADIA.yellow, 0.22),
                    color: MIRADIA.yellow,
                    border: `1px solid ${hexToRgba(MIRADIA.yellow, 0.35)}`,
                    animation: "badgePop 400ms cubic-bezier(.17,.67,.12,1.3) 450ms both",
                  }}
                >
                  {person.badge}
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 h-9 w-9 rounded-2xl flex items-center justify-center
                         bg-white/10 hover:bg-white/25 active:scale-95 transition-all duration-200
                         ring-1 ring-white/20"
              aria-label="Fermer"
              style={{
                opacity: contentOpen ? 1 : 0,
                transition: "opacity 400ms ease 300ms, background 200ms",
              }}
            >
              <FiX className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 grid gap-4 bg-[#f4f7fb] dark:bg-[#0C1626]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Chip
              icon={FiMail}
              label="Email"
              value={person.email}
              href={person.email ? `mailto:${person.email}` : null}
              accentColor={accentColor}
              delay={280}
            />
            <Chip
              icon={FiPhone}
              label="Téléphone"
              value={person.phone}
              href={person.phone ? `tel:${person.phone.replace(/\s+/g, "")}` : null}
              accentColor={accentColor}
              delay={360}
            />
            {person.dept && (
              <Chip
                icon={FiBriefcase}
                label="Département"
                value={person.dept}
                accentColor={accentColor}
                delay={440}
              />
            )}
            {person.role && (
              <Chip
                icon={FiMapPin}
                label="Fonction"
                value={person.role}
                accentColor={accentColor}
                delay={480}
              />
            )}
          </div>

          <BioSection bio={person.bio} accentColor={accentColor} enter={contentOpen} />
        </div>

        <div
          className="h-1"
          style={{
            background: `linear-gradient(90deg, ${accentColor}, ${MIRADIA.sky}, ${MIRADIA.green})`,
            opacity: contentOpen ? 1 : 0,
            transition: "opacity 600ms ease 600ms",
          }}
        />
      </div>

      <style>{`
        @keyframes particleFloat {
          0%   { opacity: 0; transform: scale(0) translate(0, 0); }
          15%  { opacity: 1; }
          100% { opacity: 0; transform: scale(0.6) var(--particle-transform); }
        }

        @keyframes ringPulse {
          0%, 100% { opacity: 0.5; transform: scale(2.2); }
          50%      { opacity: 0.2; transform: scale(2.8); }
        }

        @keyframes statusPop {
          0%   { transform: scale(0); opacity: 0; }
          70%  { transform: scale(1.3); }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes badgePop {
          0%   { transform: scale(0.6) translateY(6px); opacity: 0; }
          70%  { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes shimmerLine {
          0%   { transform: translateX(-100%); opacity: 0; }
          30%  { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }

        @keyframes slideUp {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .modal-bio-scroll::-webkit-scrollbar { width: 6px; }
        .modal-bio-scroll::-webkit-scrollbar-thumb {
          background: rgba(148,163,184,0.3);
          border-radius: 999px;
        }

        .rich-bio * { max-width: 100%; }
        .rich-bio p { margin-bottom: 0.5em; }

        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );

  return createPortal(portalNode, document.body);
}