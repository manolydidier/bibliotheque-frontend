// OrganigrammeMIRADIAPro.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "axios";
import DOMPurify from "dompurify";
import { FaSitemap } from "react-icons/fa";

/* =========================
   PALETTE MIRADIA (logo)
========================= */
const MIRADIA = {
  navy: "#124B7C",
  teal: "#025C86",
  sky: "#3AA6DC",
  green: "#4CC051",
  yellow: "#FCCA00",
};

/* =========================
   ACCENT PALETTE (OrgNode accent)
========================= */
const ACCENT = {
  sky: MIRADIA.sky,
  emerald: MIRADIA.green,
  amber: MIRADIA.yellow,
  blue: "#2563EB",
  violet: "#7C3AED",
  rose: "#E11D48",
  indigo: "#4F46E5",
};

const getAccentColor = (accent) => ACCENT[String(accent || "sky")] || ACCENT.sky;

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
   CONFIG (storage url)
========================= */
const STORAGE_BASE =
  import.meta.env.VITE_API_BASE_STORAGE ||
  import.meta.env.VITE_API_BASE_URL ||
  window.location.origin;

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

function initials(fullName) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const a = parts[0]?.[0] || "M";
  const b = parts[1]?.[0] || parts[0]?.[1] || "I";
  return (a + b).toUpperCase();
}

/* =========================
   HELPERS: image url
========================= */
const resolveStorageUrl = (pathOrUrl) => {
  const raw = String(pathOrUrl || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const base = String(STORAGE_BASE).replace(/\/$/, "");
  const cleaned = raw.replace(/^\/?storage\//, "").replace(/^storage\//, "");
  return `${base}/storage/${cleaned}`;
};

/* =========================
   BIO: garder richtext Word (sans modifier le style)
========================= */
function sanitizeRichBioKeepStyles(html) {
  const raw = String(html || "").trim();
  if (!raw) return "";

  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ["span"],
    ADD_ATTR: ["style", "class"],
    ALLOWED_ATTR: ["href", "target", "rel", "style", "class", "lang", "dir", "title"],
    FORBID_TAGS: ["script", "iframe", "object", "embed"],
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onmouseenter",
      "onmouseleave",
      "onfocus",
      "onblur",
      "oninput",
      "onchange",
      "onsubmit",
    ],
  });
}

/* =========================
   Node -> Person (UI model)
========================= */
const toPerson = (node) => {
  const u = node?.user || null;

  const first = (u?.first_name || "").trim();
  const last = (u?.last_name || "").trim();

  const fullFallback = String(node?.subtitle || node?.title || "").trim() || "—";
  const fullName = first || last ? `${first} ${last}`.trim() : fullFallback;

  const split = fullName.split(/\s+/).filter(Boolean);
  const name = split[0] || "—";
  const surname = split.slice(1).join(" ") || "";

  const photo = resolveStorageUrl(node?.avatar_path) || resolveStorageUrl(u?.avatar_url) || "";

  const depth = Math.max(0, Number(node?.level ?? 1) - 1);

  return {
    id: String(node?.id ?? ""),
    name,
    surname,
    dept: node?.department || "",
    role: node?.title || "",
    badge: node?.badge || node?.subtitle || "",
    bio: node?.bio || "",
    email: u?.email || "",
    phone: u?.phone || "",
    photo,
    accent: node?.accent || "sky",
    depth,
    _raw: node,
  };
};

/* =========================
   BACKGROUND BUBBLES (avec blobs supplémentaires pour mode dark)
========================= */
function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Blobs originaux (visibles en mode light) */}
      <div
        className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-30 dark:opacity-18 animate-[float1_12s_ease-in-out_infinite]"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${MIRADIA.sky}55, transparent 60%)`,
        }}
      />
      <div
        className="absolute top-1/3 -right-24 h-96 w-96 rounded-full blur-3xl opacity-24 dark:opacity-15 animate-[float2_14s_ease-in-out_infinite]"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${MIRADIA.green}55, transparent 60%)`,
        }}
      />
      <div
        className="absolute -bottom-28 left-1/3 h-[520px] w-[520px] rounded-full blur-3xl opacity-18 dark:opacity-12 animate-[float3_16s_ease-in-out_infinite]"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${MIRADIA.yellow}44, transparent 60%)`,
        }}
      />

      {/* NOUVEAUX BLOBS POUR MODE DARK */}
      <div className="hidden dark:block">
        <div
          className="absolute top-1/4 -left-12 h-[400px] w-[400px] rounded-full blur-3xl opacity-10 animate-[float4_20s_ease-in-out_infinite]"
          style={{
            background: `radial-gradient(circle at 40% 40%, #7C3AED33, transparent 65%)`,
          }}
        />
        <div
          className="absolute bottom-1/4 -right-12 h-[450px] w-[450px] rounded-full blur-3xl opacity-08 animate-[float5_22s_ease-in-out_infinite]"
          style={{
            background: `radial-gradient(circle at 60% 60%, #4F46E533, transparent 70%)`,
          }}
        />
        <div
          className="absolute top-3/4 left-1/4 h-[380px] w-[380px] rounded-full blur-3xl opacity-12 animate-[float6_18s_ease-in-out_infinite]"
          style={{
            background: `radial-gradient(circle at 20% 80%, #0EA5E933, transparent 60%)`,
          }}
        />
        <div
          className="absolute top-1/2 left-3/4 h-[300px] w-[300px] rounded-full blur-3xl opacity-06 animate-[float7_24s_ease-in-out_infinite]"
          style={{
            background: `radial-gradient(circle at 80% 20%, #E11D4822, transparent 75%)`,
          }}
        />
      </div>

      <style>{`
        @keyframes float1 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(18px,14px) } }
        @keyframes float2 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(-14px,18px) } }
        @keyframes float3 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(10px,-16px) } }
        @keyframes float4 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(25px,-8px) } }
        @keyframes float5 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(-20px,12px) } }
        @keyframes float6 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(12px,22px) } }
        @keyframes float7 { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(-15px,-18px) } }
      `}</style>
    </div>
  );
}

/* =========================
   HOOK: visible-on-screen (root = scroll container)
========================= */
function useVisibleIds({ rootRef, ids, threshold = 0.22, rootMargin = "80px" }) {
  const [visibleIds, setVisibleIds] = useState(() => new Set());
  const elByIdRef = useRef(new Map()); // id -> element

  const setObservedRef = useCallback((id) => {
    return (el) => {
      const map = elByIdRef.current;
      if (!el) {
        map.delete(id);
        return;
      }
      map.set(id, el);
    };
  }, []);

  useEffect(() => {
    const root = rootRef?.current;
    if (!root) return;

    let raf = 0;

    const obs = new IntersectionObserver(
      (entries) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          setVisibleIds((prev) => {
            const next = new Set(prev);
            for (const e of entries) {
              const id = e.target?.dataset?.oid;
              if (!id) continue;
              if (e.isIntersecting) next.add(id);
            }
            return next;
          });
        });
      },
      { root, threshold, rootMargin }
    );

    const map = elByIdRef.current;
    for (const id of ids) {
      const el = map.get(id);
      if (el) obs.observe(el);
    }

    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [rootRef, ids, threshold, rootMargin]);

  return { visibleIds, setObservedRef };
}

/* =========================
   AVATAR (avec loading fade)
========================= */
function Avatar({ person, ringColor, reveal }) {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const full = `${person.name} ${person.surname}`.trim();

  useEffect(() => {
    setBroken(false);
    setLoaded(false);
  }, [person.photo]);

  return (
    <div
      className={cx(
        "absolute -top-7 left-1/2 -translate-x-1/2",
        "transition-all duration-[720ms] ease-[cubic-bezier(.2,.8,.2,1)]",
        reveal ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      )}
    >
      {broken || !person.photo ? (
        <div
          className="h-14 w-14 rounded-2xl grid place-items-center font-extrabold text-sm bg-white text-slate-900 dark:bg-[#071223] dark:text-slate-50"
          style={{ boxShadow: "0 10px 22px rgba(0,0,0,0.14)" }}
        >
          {initials(full)}
        </div>
      ) : (
        <div className="h-14 w-14 rounded-2xl overflow-hidden">
          <img
            src={person.photo}
            alt={full}
            onError={() => setBroken(true)}
            onLoad={() => setLoaded(true)}
            className={cx(
              "h-full w-full object-cover",
              "transition-[transform,opacity] duration-[700ms] ease-[cubic-bezier(.2,.8,.2,1)]",
              "group-hover:scale-[1.06] group-hover:rotate-[0.8deg]",
              loaded ? "opacity-100" : "opacity-0"
            )}
            style={{ boxShadow: "0 12px 28px rgba(0,0,0,0.16)" }}
          />
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ boxShadow: `0 0 0 4px ${ringColor}` }} />
      <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)" }} />
    </div>
  );
}

/* =========================
   CARD (reveal on visible)
   ✅ NEW: hover parent => show links
========================= */
function PersonCard({ person, onOpen, reveal = false, onHover }) {
  const accentColor = getAccentColor(person.accent);
  const isTop = person.depth === 0;
  const ringColor = isTop ? MIRADIA.sky : accentColor;

  const handleEnter = () => onHover?.(person.id);
  const handleLeave = () => onHover?.(null);

  return (
    <button
      type="button"
      onClick={() => onOpen(person)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      className={cx(
        "group relative",
        "w-[260px]",
        "rounded-3xl px-5 pt-9 pb-4 text-center",
        "cursor-pointer outline-none",
        "backdrop-blur-xl",
        "ring-1 ring-black/5 dark:ring-white/10",
        isTop ? "" : "bg-white/80 dark:bg-white/5",
       "transition-[transform,opacity,filter] duration-[720ms] ease-[cubic-bezier(.2,.8,.2,1)] will-change-transform",
        reveal ? "opacity-100 translate-y-0 scale-100 blur-0" : "opacity-0 translate-y-2 scale-[0.985] blur-[1px]",
        "hover:-translate-y-2 hover:scale-[1.015] hover:rotate-[0.15deg]"
      )}
      style={{
        border: `1px solid ${hexToRgba(accentColor, 0.22)}`,
        boxShadow: `0 22px 70px ${hexToRgba(accentColor, isTop ? 0.20 : 0.14)}`,
        ...(isTop
          ? {
              background: `linear-gradient(135deg, ${MIRADIA.teal}, ${MIRADIA.navy} 55%, ${MIRADIA.sky})`,
            }
          : {}),
      }}
      aria-label={`Voir les détails de ${person.name} ${person.surname}`}
    >
      <Avatar person={person} ringColor={ringColor} reveal={reveal} />

      <div
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at 45% 18%, ${hexToRgba(accentColor, 0.16)}, transparent 62%)`,
        }}
      />

      <div className={cx("transition-opacity duration-300", reveal ? "opacity-100" : "opacity-0")}>
        <div
          className={cx(
            "text-[13px] font-semibold leading-tight break-words",
            isTop ? "text-white" : "text-slate-900 dark:text-slate-50"
          )}
        >
          {person.name} <span className="font-extrabold">{person.surname}</span>
        </div>

        <div className={cx("mt-1 text-[11px] leading-snug break-words", isTop ? "text-white/80" : "text-slate-600 dark:text-slate-300")}>
          {person.dept || "—"}
        </div>

        <div
          className={cx(
            "mt-1 text-[13px] font-extrabold leading-snug break-words",
            isTop ? "text-white" : "text-[#124B7C] dark:text-[#3AA6DC]"
          )}
        >
          {person.role || "—"}
        </div>

        {!!person.badge && (
          <div className="mt-2 flex justify-center">
            <span
              className={cx(
                "inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold",
                "transition-transform duration-300 group-hover:scale-[1.02]",
                isTop
                  ? "bg-white/15 text-white ring-1 ring-white/25"
                  : "text-[#071223] dark:text-slate-50 ring-1 ring-black/5 dark:ring-white/10"
              )}
              style={isTop ? undefined : { backgroundColor: hexToRgba(accentColor, 0.18) }}
            >
              {person.badge}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

/* =========================
   MODAL (épuré: fade + scale)
========================= */
function Modal({ open, person, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [enter, setEnter] = useState(false);

  useEffect(() => {
    if (!open) {
      setEnter(false);
      const t = setTimeout(() => setMounted(false), 180);
      return () => clearTimeout(t);
    }
    setMounted(true);
    const r = requestAnimationFrame(() => setEnter(true));
    return () => cancelAnimationFrame(r);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !person) return null;

  const full = `${person.name} ${person.surname}`.trim();
  const mail = person.email || "";
  const tel = person.phone || "";
  const dept = person.dept || "";
  const role = person.role || "";
  const badge = person.badge || "";
  const accentColor = getAccentColor(person.accent);
  const safeBio = sanitizeRichBioKeepStyles(person.bio);

  return (
    <div className="fixed inset-0 z-50">
      <button
        className={cx(
          "absolute inset-0 bg-black/30 dark:bg-black/70",
          "transition-opacity duration-200",
          enter ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-label="Fermer"
      />

      <div className="absolute left-1/2 top-1/2 w-[900px] max-w-[94vw] -translate-x-1/2 -translate-y-1/2">
        <div
          className={cx(
            "relative overflow-hidden rounded-[28px]",
            "bg-white/90 dark:bg-[#071223]/90",
            "backdrop-blur-2xl",
            "ring-1 ring-black/5 dark:ring-white/10",
            "shadow-[0_40px_120px_rgba(0,0,0,0.40)]",
            "transition-all duration-200",
            enter ? "opacity-100 scale-100" : "opacity-0 scale-[0.985]"
          )}
        >
          <div
            className="h-1.5 w-full"
            style={{
              background: `linear-gradient(90deg, ${accentColor}, ${MIRADIA.sky}, ${MIRADIA.green})`,
            }}
          />

          <div className="p-6 flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="relative shrink-0">
                <div
                  className="h-14 w-14 rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 bg-white/70 dark:bg-white/10"
                  style={{ boxShadow: `0 14px 34px ${hexToRgba(accentColor, 0.18)}` }}
                >
                  {person.photo ? (
                    <img src={person.photo} alt={full} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center font-black text-slate-800 dark:text-slate-50">
                      {initials(full)}
                    </div>
                  )}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-white/70 dark:ring-[#071223]/70"
                  style={{ background: accentColor }}
                />
              </div>

              <div className="min-w-0">
                <div className="text-[18px] font-extrabold text-slate-900 dark:text-slate-50 truncate">{full}</div>
                <div className="mt-0.5 text-sm text-slate-700/90 dark:text-slate-200/80 truncate">
                  {role}
                  {dept ? ` • ${dept}` : ""}
                </div>

                {!!badge && (
                  <div className="mt-3">
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-[#071223] dark:text-slate-50 ring-1 ring-black/5 dark:ring-white/10"
                      style={{ backgroundColor: hexToRgba(accentColor, 0.18) }}
                    >
                      {badge}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className={cx(
                "shrink-0 rounded-2xl px-3 py-2 text-sm font-semibold",
                "bg-black/5 hover:bg-black/10 active:scale-[0.98]",
                "dark:bg-white/10 dark:hover:bg-white/15",
                "ring-1 ring-black/5 dark:ring-white/10"
              )}
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          <div className="px-6 pb-6 grid gap-4">
            <div className="rounded-2xl p-4 bg-black/3 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/10 hover:bg-black/5 dark:hover:bg-white/7 transition-colors">
              <div className="text-[11px] font-black tracking-wide text-[#124B7C] dark:text-slate-200">📧 CONTACT</div>

              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600 dark:text-slate-300">Email</span>
                  {mail ? (
                    <a className="font-semibold hover:underline text-[#025C86] dark:text-[#3AA6DC]" href={`mailto:${mail}`}>
                      {mail}
                    </a>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400">—</span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600 dark:text-slate-300">Téléphone</span>
                  {tel ? (
                    <a
                      className="font-semibold hover:underline text-[#025C86] dark:text-[#3AA6DC]"
                      href={`tel:${tel.replace(/\s+/g, "")}`}
                    >
                      {tel}
                    </a>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400">—</span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-4 bg-black/3 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/10 hover:bg-black/5 dark:hover:bg-white/7 transition-colors">
              <div className="text-[11px] font-black tracking-wide text-[#124B7C] dark:text-slate-200">📝 BIOGRAPHIE</div>

              <div className="mt-3 max-h-[60vh] overflow-auto pr-2 modal-scroll">
                {safeBio ? (
                  <div className="rich-bio text-slate-800 dark:text-slate-100" dangerouslySetInnerHTML={{ __html: safeBio }} />
                ) : (
                  <div className="text-sm text-slate-600 dark:text-slate-300">Aucune biographie disponible.</div>
                )}
              </div>
            </div>
          </div>

          <style>{`
            .modal-scroll::-webkit-scrollbar{ width: 10px; }
            .modal-scroll::-webkit-scrollbar-thumb{
              background: ${hexToRgba(accentColor, 0.20)};
              border-radius: 999px;
              border: 2px solid transparent;
              background-clip: padding-box;
            }
            .dark .modal-scroll::-webkit-scrollbar-thumb{
              background: ${hexToRgba(MIRADIA.sky, 0.22)};
            }
            .rich-bio * { max-width: 100%; }
            @media (prefers-reduced-motion: reduce){
              * { transition: none !important; animation: none !important; }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}

/* =========================
   TITLE
========================= */
function TitleBlock() {
  return (
    <div className="w-full">
      <div className="rounded-3xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.14)]">
        <div
          className="px-6 py-10 text-center text-white"
          style={{
            background: `linear-gradient(135deg, ${MIRADIA.teal}, ${MIRADIA.navy} 55%, ${MIRADIA.sky})`,
          }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Notre organisation</h2>
          <div
            className="w-32 h-1 mx-auto mb-5 rounded-full"
            style={{ background: `linear-gradient(90deg, ${MIRADIA.green}, ${MIRADIA.yellow})` }}
          />
          <p className="text-white/85 max-w-2xl mx-auto">
            Survolez une carte (parent) pour afficher ses liens • Cliquez pour voir les détails.
          </p>

          <div className="mt-7 bg-white/10 p-4 rounded-2xl backdrop-blur-lg max-w-3xl mx-auto">
            <h3 className="flex items-center justify-center text-xl md:text-2xl font-semibold">
              <FaSitemap className="mr-3 text-white" />
              Organigramme
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   PAGE
========================= */
export default function OrganigrammeMIRADIAPro() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  // ✅ NEW: quel parent est survolé (affiche ses liens)
  const [hoveredParentId, setHoveredParentId] = useState(null);

  const scrollRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    axios
      .get("/orgnodes/slides", { params: { active: 1 } })
      .then((res) => {
        const raw = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : [];
        if (!mounted) return;
        setNodes(raw);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.response?.data?.message || e?.message || "Erreur lors du chargement");
        setNodes([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const layout = useMemo(() => {
    const list = Array.isArray(nodes) ? nodes : [];
    if (!list.length) return null;

    const CARD_W = 260;
    const CARD_H = 180;

    const CELL_X = 290;
    const CELL_Y = 210;

    // ✅ PAD = marge interne du "canvas"
    const PAD = 120;

    const items = list.map((n) => {
      const x = Number.isFinite(Number(n?.pos_x)) ? Number(n.pos_x) : 0;
      const y = Number.isFinite(Number(n?.pos_y)) ? Number(n.pos_y) : 0;
      return {
        node: n,
        id: String(n?.id ?? ""),
        parentId: n?.parent_id == null ? null : String(n.parent_id),
        x,
        y,
        person: toPerson(n),
      };
    });

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const it of items) {
      if (it.x < minX) minX = it.x;
      if (it.y < minY) minY = it.y;
      if (it.x > maxX) maxX = it.x;
      if (it.y > maxY) maxY = it.y;
    }
    if (!Number.isFinite(minX)) minX = 0;
    if (!Number.isFinite(minY)) minY = 0;

    const norm = items.map((it) => {
      const nx = it.x - minX;
      const ny = it.y - minY;
      const cx = PAD + nx * CELL_X;
      const cy = PAD + ny * CELL_Y;
      return { ...it, nx, ny, cx, cy };
    });

    const width = PAD * 2 + (maxX - minX) * CELL_X + CARD_W;
    const height = PAD * 2 + (maxY - minY) * CELL_Y + CARD_H;

    const posById = new Map(norm.map((it) => [it.id, it]));
    const links = [];
    for (const child of norm) {
      if (!child.parentId) continue;
      const parent = posById.get(child.parentId);
      if (!parent) continue;
      links.push({
        from: parent,
        to: child,
        fromId: parent.id,
        toId: child.id,
      });
    }

    return { items: norm, links, width, height };
  }, [nodes]);

  const ids = useMemo(() => (layout?.items || []).map((x) => x.id), [layout]);
  const { visibleIds, setObservedRef } = useVisibleIds({
    rootRef: scrollRef,
    ids,
    threshold: 0.22,
    rootMargin: "120px",
  });

  const stats = useMemo(() => {
    if (!layout) return { members: 0, links: 0 };
    return { members: layout.items.length, links: layout.links.length };
  }, [layout]);

  const [vh, setVh] = useState(() => (typeof window !== "undefined" ? window.innerHeight : 900));
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const panelHeightPx = useMemo(() => {
    if (!layout) return Math.min(vh * 0.88, 720);
    const h = Math.max(600, layout.height + 80);
    return Math.min(vh * 0.88, h);
  }, [layout, vh]);

  return (
    <div className="min-h-screen flex items-center w-full bg-[#eef5fb] dark:bg-gradient-to-b dark:from-[#0B1626] dark:via-[#070F1C] dark:to-[#050A12]">
      <div className="relative w-full min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
        <AnimatedBackground />

        <div className="relative flex-col w-full max-w-[1700px] px-2 sm:px-4 lg:px-8 py-8">
          <TitleBlock />

          {loading && (
            <div className="mt-10 rounded-2xl bg-white/70 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/10 p-5 text-slate-700 dark:text-slate-200">
              Chargement de l'organigramme…
            </div>
          )}

          {!loading && error && (
            <div className="mt-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/20 p-5 text-rose-700 dark:text-rose-200">
              {error}
            </div>
          )}

          {!loading && !error && (!layout || !layout.items?.length) && (
            <div className="mt-10 rounded-2xl bg-white/70 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/10 p-5 text-slate-700 dark:text-slate-200">
              Aucun nœud à afficher.
            </div>
          )}

          {!loading && !error && layout && (
            <div className="mt-10 flex-col items-center justify-center rounded-3xl bg-white/60 dark:bg-[#0B1626]/55 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 p-3 sm:p-4">
              {/* ✅ CONTENEUR SCROLL */}
              <div
                ref={scrollRef}
                className="org-scroll pt-24 pl-24 overflow-auto rounded-2xl flex items-center justify-center"
                style={{ height: panelHeightPx }}
                onMouseLeave={() => setHoveredParentId(null)} // ✅ si tu sors du canvas, on cache les liens
              >
                <div className="relative flex items-center justify-center" style={{ width: layout.width, height: layout.height }}>
                  {/* =========================
                      LINKS: visibles UNIQUEMENT sur hover du parent
                      Animation épurée: stroke-dashoffset + opacity + soft glow
                  ========================= */}
                  <svg
                    className="absolute inset-0"
                    width={layout.width}
                    height={layout.height}
                    style={{ pointerEvents: "none" }}
                  >
                    <defs>
                      <linearGradient id="miradiaLink" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={MIRADIA.green} stopOpacity="0.55" />
                        <stop offset="50%" stopColor={MIRADIA.sky} stopOpacity="0.78" />
                        <stop offset="100%" stopColor={MIRADIA.yellow} stopOpacity="0.55" />
                      </linearGradient>

                      {/* glow subtil */}
                      <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="2.2" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {layout.links.map((l, idx) => {
                      const x1 = l.from.cx;
                      const y1 = l.from.cy;
                      const x2 = l.to.cx;
                      const y2 = l.to.cy;

                      const dy = Math.max(52, Math.abs(y2 - y1) * 0.45);
                      const d = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;

                      // ✅ Visible seulement si on hover le parent (l.fromId)
                      const isActive = hoveredParentId && hoveredParentId === l.fromId;

                      // (optionnel) n’afficher que si parent & child sont dans la zone visible
                      // const isActive = hoveredParentId === l.fromId && visibleIds.has(l.fromId);

                      return (
                        <path
                          key={idx}
                          d={d}
                          fill="none"
                          stroke="url(#miradiaLink)"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          className={cx("org-link", isActive && "org-link--on")}
                          style={{
                            opacity: isActive ? 0.95 : 0,
                            strokeDasharray: 1,
                            strokeDashoffset: isActive ? 0 : 1,
                            filter: isActive ? "url(#softGlow)" : "none",
                          }}
                        />
                      );
                    })}
                  </svg>

                  {/* =========================
                      NODES
                  ========================= */}
                  {layout.items.map((it) => {
                    const reveal = visibleIds.has(it.id);

                    return (
                      <div
                        key={it.id}
                        data-oid={it.id}
                        ref={setObservedRef(it.id)}
                        className="absolute"
                        style={{
                          left: it.cx,
                          top: it.cy,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <PersonCard
                          person={it.person}
                          onOpen={(p) => {
                            // (UX) on cache les liens quand on ouvre le modal
                            setHoveredParentId(null);
                            setSelected(p);
                          }}
                          reveal={reveal}
                          onHover={setHoveredParentId}
                        />
                      </div>
                    );
                  })}

                  <style>{`
                    /* Animation épurée */
                    .org-link{
                      transition:
                        stroke-dashoffset 520ms cubic-bezier(.2,.8,.2,1),
                        opacity 180ms ease;
                      will-change: stroke-dashoffset, opacity;
                    }
                    /* petit délai pour un look premium */
                    .org-link--on{
                      transition:
                        stroke-dashoffset 560ms cubic-bezier(.2,.8,.2,1),
                        opacity 160ms ease;
                    }
                    @media (prefers-reduced-motion: reduce){
                      .org-link, .org-link--on { transition: none !important; }
                    }
                  `}</style>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap hidden items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                <div>
                  Astuce : ajuste <span className="font-semibold">pos_x / pos_y</span> dans la DB pour déplacer les cartes.
                </div>
                <div className="font-semibold">
                  Membres : {stats.members} • Relations : {stats.links}
                </div>
              </div>

              <style>{`
                /* Scrollbar plus discret */
                .org-scroll::-webkit-scrollbar {
                  width: 8px;
                  height: 8px;
                }
                .org-scroll::-webkit-scrollbar-thumb {
                  background: rgba(148, 163, 184, 0.35);
                  border-radius: 999px;
                }
                .org-scroll::-webkit-scrollbar-thumb:hover {
                  background: rgba(148, 163, 184, 0.5);
                }
                .dark .org-scroll::-webkit-scrollbar-thumb {
                  background: rgba(148, 163, 184, 0.2);
                }
                .dark .org-scroll::-webkit-scrollbar-thumb:hover {
                  background: rgba(148, 163, 184, 0.3);
                }
                @media (prefers-reduced-motion: reduce) {
                  * {
                    transition: none !important;
                    animation: none !important;
                  }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>

      <Modal open={Boolean(selected)} person={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
