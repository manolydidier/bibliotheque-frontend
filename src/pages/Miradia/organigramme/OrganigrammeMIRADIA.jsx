// OrganigrammeMIRADIAPro.jsx  — version responsive + Modal avancé
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "axios";
import DOMPurify from "dompurify";
import { FaSitemap } from "react-icons/fa";
import { FiChevronDown, FiChevronUp, FiMail, FiPhone, FiBriefcase, FiMapPin, FiX } from "react-icons/fi";
import Modal from "./Modal";
/* ========================= PALETTE ========================= */
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
  const h    = String(hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n    = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const STORAGE_BASE =
  typeof import.meta !== "undefined"
    ? (import.meta.env?.VITE_API_BASE_STORAGE || import.meta.env?.VITE_API_BASE_URL || window.location.origin)
    : window.location.origin;

function cx(...a) { return a.filter(Boolean).join(" "); }
function initials(n) {
  const p = String(n || "").trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || "M") + (p[1]?.[0] || p[0]?.[1] || "I")).toUpperCase();
}
const resolveStorageUrl = (p) => {
  const raw = String(p || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = String(STORAGE_BASE).replace(/\/$/, "");
  return `${base}/storage/${raw.replace(/^\/?storage\//, "")}`;
};
function sanitizeRichBio(html) {
  return DOMPurify.sanitize(String(html || ""), {
    USE_PROFILES: { html: true },
    ADD_TAGS: ["span"],
    ADD_ATTR: ["style", "class"],
    ALLOWED_ATTR: ["href","target","rel","style","class","lang","dir","title"],
    FORBID_TAGS: ["script","iframe","object","embed"],
    FORBID_ATTR: ["onerror","onload","onclick","onmouseover","onmouseenter","onmouseleave","onfocus","onblur","oninput","onchange","onsubmit"],
  });
}
const toPerson = (node) => {
  const u = node?.user || null;
  const first = (u?.first_name || "").trim();
  const last  = (u?.last_name  || "").trim();
  const fallback = String(node?.subtitle || node?.title || "").trim() || "—";
  const fullName = first || last ? `${first} ${last}`.trim() : fallback;
  const split    = fullName.split(/\s+/).filter(Boolean);
  return {
    id:      String(node?.id ?? ""),
    name:    split[0] || "—",
    surname: split.slice(1).join(" ") || "",
    dept:    node?.department || "",
    role:    node?.title || "",
    badge:   node?.badge || node?.subtitle || "",
    bio:     node?.bio || "",
    email:   u?.email || "",
    phone:   u?.phone || "",
    photo:   resolveStorageUrl(node?.avatar_path) || resolveStorageUrl(u?.avatar_url) || "",
    accent:  node?.accent || "sky",
    depth:   Math.max(0, Number(node?.level ?? 1) - 1),
    parentId: node?.parent_id == null ? null : String(node.parent_id),
    _raw:    node,
  };
};

/* ── Breakpoint ──────────────────────────────────────────────── */
function useBreakpoint() {
  const get = () => window.innerWidth >= 1024 ? "desktop" : window.innerWidth >= 640 ? "tablet" : "mobile";
  const [bp, setBp] = useState(get);
  useEffect(() => {
    const h = () => setBp(get());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return bp;
}

/* ========================= BACKGROUND ========================= */
function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-30 animate-[float1_12s_ease-in-out_infinite]"
        style={{ background: `radial-gradient(circle at 30% 30%, ${MIRADIA.sky}55, transparent 60%)` }} />
      <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full blur-3xl opacity-24 animate-[float2_14s_ease-in-out_infinite]"
        style={{ background: `radial-gradient(circle at 30% 30%, ${MIRADIA.green}55, transparent 60%)` }} />
      <div className="absolute -bottom-28 left-1/3 h-[520px] w-[520px] rounded-full blur-3xl opacity-18 animate-[float3_16s_ease-in-out_infinite]"
        style={{ background: `radial-gradient(circle at 30% 30%, ${MIRADIA.yellow}44, transparent 60%)` }} />
      <style>{`
        @keyframes float1{0%,100%{transform:translate(0,0)}50%{transform:translate(18px,14px)}}
        @keyframes float2{0%,100%{transform:translate(0,0)}50%{transform:translate(-14px,18px)}}
        @keyframes float3{0%,100%{transform:translate(0,0)}50%{transform:translate(10px,-16px)}}
      `}</style>
    </div>
  );
}

/* ── IntersectionObserver hook ───────────────────────────────── */
function useVisibleIds({ rootRef, ids, threshold = 0.22, rootMargin = "80px" }) {
  const [visibleIds, setVisibleIds] = useState(() => new Set());
  const elByIdRef = useRef(new Map());
  const setObservedRef = useCallback((id) => (el) => {
    const map = elByIdRef.current;
    if (!el) { map.delete(id); return; }
    map.set(id, el);
  }, []);
  useEffect(() => {
    const root = rootRef?.current; if (!root) return;
    let raf = 0;
    const obs = new IntersectionObserver((entries) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setVisibleIds((prev) => {
          const next = new Set(prev);
          for (const e of entries) {
            const id = e.target?.dataset?.oid;
            if (id && e.isIntersecting) next.add(id);
          }
          return next;
        });
      });
    }, { root, threshold, rootMargin });
    for (const id of ids) { const el = elByIdRef.current.get(id); if (el) obs.observe(el); }
    return () => { cancelAnimationFrame(raf); obs.disconnect(); };
  }, [rootRef, ids, threshold, rootMargin]);
  return { visibleIds, setObservedRef };
}

/* ========================= AVATAR ========================= */
function Avatar({ person, ringColor, reveal, size = "md" }) {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const full = `${person.name} ${person.surname}`.trim();
  const sz   = size === "sm" ? "h-10 w-10 text-[13px]" : "h-14 w-14 text-[20px]";
  useEffect(() => { setBroken(false); setLoaded(false); }, [person.photo]);
  return (
    <div className={cx(
      size === "md" && "absolute -top-7 left-1/2 -translate-x-1/2",
      size === "sm" && "relative shrink-0",
      size === "md" && "transition-all duration-[720ms] ease-[cubic-bezier(.2,.8,.2,1)]",
      size === "md" && (reveal ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"),
    )}>
      {broken || !person.photo ? (
        <div className={cx("rounded-2xl grid place-items-center font-extrabold bg-white text-slate-900 dark:bg-[#071223] dark:text-slate-50", sz)}
          style={{ boxShadow: "0 10px 22px rgba(0,0,0,0.14)" }}>
          {initials(full)}
        </div>
      ) : (
        <div className={cx("rounded-2xl overflow-hidden", sz)}>
          <img src={person.photo} alt={full}
            onError={() => setBroken(true)} onLoad={() => setLoaded(true)}
            className={cx("h-full w-full object-cover transition-[transform,opacity] duration-700",
              size === "md" && "group-hover:scale-[1.06] group-hover:rotate-[0.8deg]",
              loaded ? "opacity-100" : "opacity-0"
            )}
          />
        </div>
      )}
      {size === "md" && (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ boxShadow: `0 0 0 4px ${ringColor}` }} />
          <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)" }} />
        </>
      )}
    </div>
  );
}

/* ========================= PERSONCARD ========================= */
function PersonCard({ person, onOpen, reveal = false, onHover }) {
  const accentColor = getAccentColor(person.accent);
  const isTop       = person.depth === 0;
  const ringColor   = isTop ? MIRADIA.sky : accentColor;
  return (
    <button type="button" onClick={() => onOpen(person)}
      onMouseEnter={() => onHover?.(person.id)} onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(person.id)} onBlur={() => onHover?.(null)}
      className={cx(
        "group relative w-[260px] rounded-3xl px-5 pt-9 pb-4 text-center cursor-pointer outline-none backdrop-blur-xl",
        "ring-1 ring-black/5 dark:ring-white/10",
        isTop ? "" : "bg-white/80 dark:bg-white/5",
        "transition-[transform,opacity,filter] duration-[720ms] ease-[cubic-bezier(.2,.8,.2,1)] will-change-transform",
        reveal ? "opacity-100 translate-y-0 scale-100 blur-0" : "opacity-0 translate-y-2 scale-[0.985] blur-[1px]",
        "hover:-translate-y-2 hover:scale-[1.015] hover:rotate-[0.15deg]"
      )}
      style={{
        border:    `1px solid ${hexToRgba(accentColor, 0.22)}`,
        boxShadow: `0 22px 70px ${hexToRgba(accentColor, isTop ? 0.20 : 0.14)}`,
        ...(isTop ? { background: `linear-gradient(135deg, ${MIRADIA.teal}, ${MIRADIA.navy} 55%, ${MIRADIA.sky})` } : {}),
      }}
      aria-label={`Voir les détails de ${person.name} ${person.surname}`}
    >
      <Avatar person={person} ringColor={ringColor} reveal={reveal} size="md" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle at 45% 18%, ${hexToRgba(accentColor, 0.16)}, transparent 62%)` }} />
      <div className={cx("transition-opacity duration-300", reveal ? "opacity-100" : "opacity-0")}>
        <div className={cx("text-[15px] font-semibold leading-tight break-words",
          isTop ? "text-white" : "text-slate-900 dark:text-slate-50")}>
          {person.name} <span className="font-extrabold">{person.surname}</span>
        </div>
        <div className={cx("mt-1 text-[13px] leading-snug break-words",
          isTop ? "text-white/80" : "text-slate-600 dark:text-slate-300")}>
          {person.dept || "—"}
        </div>
        <div className={cx("mt-1 text-[13px] font-extrabold leading-snug break-words",
          isTop ? "text-white" : "text-[#124B7C] dark:text-[#3AA6DC]")}>
          {person.role || "—"}
        </div>
        {!!person.badge && (
          <div className="mt-2 flex justify-center">
            <span className={cx(
              "inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold",
              isTop ? "bg-white/15 text-white ring-1 ring-white/25"
                    : "text-[#071223] dark:text-slate-50 ring-1 ring-black/5 dark:ring-white/10"
            )} style={isTop ? undefined : { backgroundColor: hexToRgba(accentColor, 0.18) }}>
              {person.badge}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

/* ========================= MOBILE CARD ========================= */
function MobileCard({ person, childNodes, onOpen }) {
  const [open, setOpen]   = useState(false);
  const accentColor       = getAccentColor(person.accent);
  const isTop             = person.depth === 0;
  const full              = `${person.name} ${person.surname}`.trim();
  const indentPx          = person.depth * 16;
  return (
    <div className="flex flex-col" style={{ marginLeft: indentPx }}>
      <div className={cx("relative rounded-2xl overflow-hidden","ring-1 ring-black/5 dark:ring-white/10", isTop ? "" : "bg-white/80 dark:bg-white/5")}
        style={{ border:`1px solid ${hexToRgba(accentColor,0.20)}`, boxShadow:`0 4px 24px ${hexToRgba(accentColor,isTop?0.18:0.09)}`,
          ...(isTop?{background:`linear-gradient(135deg,${MIRADIA.teal},${MIRADIA.navy} 55%,${MIRADIA.sky})`}:{}) }}>
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background:`linear-gradient(90deg,${accentColor}cc,${accentColor}33)` }} />
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="shrink-0"><Avatar person={person} ringColor={accentColor} reveal size="sm" /></div>
          <div className="flex-1 min-w-0">
            <div className={cx("text-[13px] font-black leading-tight truncate",isTop?"text-white":"text-slate-900 dark:text-slate-50")}>{full}</div>
            <div className={cx("text-[11px] font-semibold truncate",isTop?"text-white/80":"text-[#124B7C] dark:text-[#3AA6DC]")}>{person.role||"—"}</div>
            {person.dept&&<div className={cx("text-[10px] truncate",isTop?"text-white/65":"text-slate-500 dark:text-slate-400")}>{person.dept}</div>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button" onClick={()=>onOpen(person)}
              className="rounded-xl px-2.5 py-1.5 text-[10px] font-bold tracking-wide uppercase transition-all"
              style={{ background:isTop?"rgba(255,255,255,0.18)":hexToRgba(accentColor,0.14),
                color:isTop?"#fff":accentColor,border:`1px solid ${isTop?"rgba(255,255,255,0.25)":hexToRgba(accentColor,0.30)}`}}>
              Détails
            </button>
            {childNodes&&(
              <button type="button" onClick={()=>setOpen(p=>!p)}
                className="rounded-xl p-1.5 transition-all"
                style={{ background:isTop?"rgba(255,255,255,0.15)":hexToRgba(accentColor,0.10),
                  color:isTop?"#fff":accentColor,border:`1px solid ${isTop?"rgba(255,255,255,0.20)":hexToRgba(accentColor,0.25)}`}}
                aria-label={open?"Réduire":"Développer"}>
                {open?<FiChevronUp className="h-3.5 w-3.5"/>:<FiChevronDown className="h-3.5 w-3.5"/>}
              </button>
            )}
          </div>
        </div>
      </div>
      {childNodes&&open&&(
        <div className="mt-2 ml-4 flex flex-col gap-2 border-l-2 pl-3"
          style={{borderColor:hexToRgba(accentColor,0.25)}}>
          {childNodes}
        </div>
      )}
    </div>
  );
}

/* ========================= TITLE BLOCK ========================= */
function TitleBlock({ viewMode, onToggleView, isSmall }) {
  return (
    <div className="w-full mb-8">
      <div className="rounded-3xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.14)]">
        <div className="px-6 py-10 text-center text-white"
          style={{ background:`linear-gradient(135deg,${MIRADIA.teal},${MIRADIA.navy} 55%,${MIRADIA.sky})` }}>
          <h2 className="text-2xl md:text-5xl font-black tracking-tight mb-3">Notre organisation</h2>
          <div className="w-32 h-1 mx-auto mb-5 rounded-full"
            style={{ background:`linear-gradient(90deg,${MIRADIA.green},${MIRADIA.yellow})` }} />
          <p className="text-white/85 max-w-2xl mx-auto text-sm md:text-base">
            {isSmall ? "Appuyez sur « Détails » pour voir la fiche complète."
              : "Survolez une carte pour afficher ses liens • Cliquez pour les détails."}
          </p>
          <div className="mt-6 bg-white/10 p-4 rounded-2xl backdrop-blur-lg max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-3">
            <h3 className="flex items-center text-base md:text-xl font-semibold">
              <FaSitemap className="mr-3 text-white" /> Organigramme
            </h3>
            {isSmall && (
              <div className="flex items-center gap-2 rounded-full bg-white/15 p-1 backdrop-blur">
                <button onClick={()=>onToggleView("list")}
                  className={cx("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase transition-all",
                    viewMode==="list"?"bg-white text-[#124B7C] shadow-sm":"text-white/80 hover:text-white")}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="4" cy="18" r="1.5"/></svg>
                  Liste
                </button>
                <button onClick={()=>onToggleView("canvas")}
                  className={cx("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase transition-all",
                    viewMode==="canvas"?"bg-white text-[#124B7C] shadow-sm":"text-white/80 hover:text-white")}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5"><rect x="9" y="2" width="6" height="4" rx="1"/><rect x="2" y="17" width="6" height="4" rx="1"/><rect x="9" y="17" width="6" height="4" rx="1"/><rect x="16" y="17" width="6" height="4" rx="1"/><line x1="12" y1="6" x2="12" y2="11"/><line x1="5" y1="17" x2="5" y2="14"/><line x1="12" y1="17" x2="12" y2="14"/><line x1="19" y1="17" x2="19" y2="14"/><line x1="5" y1="14" x2="19" y2="14"/></svg>
                  Arbre
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================= MOBILE TREE ========================= */
function MobileTree({ persons, onOpen }) {
  const childrenMap = useMemo(() => {
    const m = new Map();
    for (const p of persons) {
      const k = p.parentId??null;
      if (!m.has(k)) m.set(k,[]);
      m.get(k).push(p);
    }
    return m;
  }, [persons]);
  const knownIds = useMemo(() => new Set(persons.map(p=>p.id)), [persons]);
  const roots    = useMemo(() => persons.filter(p=>p.parentId===null||!knownIds.has(p.parentId)), [persons,knownIds]);
  function renderNode(person) {
    const kids = childrenMap.get(person.id)||[];
    return <MobileCard key={person.id} person={person} onOpen={onOpen}
      childNodes={kids.length>0?kids.map(renderNode):null} />;
  }
  return <div className="flex flex-col gap-2 pb-6">{roots.map(renderNode)}</div>;
}

/* ========================= CANVAS VIEW ========================= */
function CanvasView({ layout, onOpen }) {
  const scrollRef = useRef(null);
  const [hoveredParentId, setHoveredParentId] = useState(null);
  const ids = useMemo(() => (layout?.items||[]).map(x=>x.id), [layout]);
  const { visibleIds, setObservedRef } = useVisibleIds({ rootRef:scrollRef, ids, threshold:0.22, rootMargin:"120px" });
  const [vh, setVh] = useState(()=>typeof window!=="undefined"?window.innerHeight:900);
  useEffect(() => {
    const h = ()=>setVh(window.innerHeight);
    window.addEventListener("resize",h); return ()=>window.removeEventListener("resize",h);
  }, []);
  const panelH = useMemo(()=>Math.min(vh*0.88,Math.max(1200,(layout?.height||0)+80)),[layout,vh]);
  if (!layout) return null;
  return (
    <div className="w-full rounded-3xl bg-white/50 dark:bg-[#0B1626]/55 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 p-3 sm:p-4">
      <div ref={scrollRef} className="org-scroll pt-48 mt-12 pl-8 overflow-auto rounded-2xl flex items-center justify-center"
        style={{ height:panelH }} onMouseLeave={()=>setHoveredParentId(null)}>
        <div className="relative flex items-center justify-center" style={{ width:layout.width, height:layout.height }}>
          <svg className="absolute inset-0" width={layout.width} height={layout.height} style={{ pointerEvents:"none" }}>
            <defs>
              <linearGradient id="miradiaLink" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor={MIRADIA.green}  stopOpacity="0.55"/>
                <stop offset="50%"  stopColor={MIRADIA.sky}    stopOpacity="0.78"/>
                <stop offset="100%" stopColor={MIRADIA.yellow} stopOpacity="0.55"/>
              </linearGradient>
              <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.2" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            {layout.links.map((l,idx)=>{
              const dy=Math.max(52,Math.abs(l.to.cy-l.from.cy)*0.45);
              const d=`M ${l.from.cx} ${l.from.cy} C ${l.from.cx} ${l.from.cy+dy}, ${l.to.cx} ${l.to.cy-dy}, ${l.to.cx} ${l.to.cy}`;
              const isActive=hoveredParentId===l.fromId;
              return <path key={idx} d={d} fill="none" stroke="url(#miradiaLink)" strokeWidth="2.6"
                strokeLinecap="round" className={cx("org-link",isActive&&"org-link--on")}
                style={{ opacity:isActive?0.95:0, filter:isActive?"url(#softGlow)":"none" }}/>;
            })}
          </svg>
          {layout.items.map(it=>(
            <div key={it.id} data-oid={it.id} ref={setObservedRef(it.id)} className="absolute"
              style={{ left:it.cx, top:it.cy, transform:"translate(-50%,-50%)" }}>
              <PersonCard person={it.person} onOpen={onOpen} reveal={visibleIds.has(it.id)}
                onHover={setHoveredParentId} />
            </div>
          ))}
          <style>{`
            .org-link{ transition:opacity 180ms ease; }
            .org-link--on{ transition:opacity 160ms ease; }
            .org-scroll::-webkit-scrollbar{ width:8px; height:8px; }
            .org-scroll::-webkit-scrollbar-thumb{ background:rgba(148,163,184,0.35); border-radius:999px; }
          `}</style>
        </div>
      </div>
    </div>
  );
}

/* ========================= PAGE PRINCIPALE ========================= */
export default function OrganigrammeMIRADIAPro() {
  const [nodes,    setNodes]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [error,    setError]    = useState("");
  const bp      = useBreakpoint();
  const isSmall = bp !== "desktop";
  const [viewMode, setViewMode] = useState(()=>window.innerWidth<640?"list":"canvas");
  useEffect(() => {
    if (bp==="desktop") setViewMode("canvas");
  }, [bp]);
  const activeView = bp==="desktop" ? "canvas" : viewMode;

  useEffect(() => {
    let ok = true;
    setLoading(true); setError("");
    axios.get("/orgnodes/slides", { params:{ active:1 } })
      .then(res => {
        const raw = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
        if (ok) setNodes(raw);
      })
      .catch(e => { if (ok) { setError(e?.response?.data?.message||e?.message||"Erreur"); setNodes([]); } })
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok=false; };
  }, []);

  const layout = useMemo(() => {
    const list = Array.isArray(nodes)?nodes:[];
    if (!list.length) return null;
    const CARD_W=260,CARD_H=180,CELL_X=320,CELL_Y=290,PAD=120;
    const items = list.map(n=>({
      node:n, id:String(n?.id??""),
      parentId:n?.parent_id==null?null:String(n.parent_id),
      x:Number.isFinite(Number(n?.pos_x))?Number(n.pos_x):0,
      y:Number.isFinite(Number(n?.pos_y))?Number(n.pos_y):0,
      person:toPerson(n),
    }));
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for (const it of items) {
      if(it.x<minX)minX=it.x; if(it.y<minY)minY=it.y;
      if(it.x>maxX)maxX=it.x; if(it.y>maxY)maxY=it.y;
    }
    if(!Number.isFinite(minX))minX=0; if(!Number.isFinite(minY))minY=0;
    const norm = items.map(it=>({...it, cx:PAD+(it.x-minX)*CELL_X, cy:PAD+(it.y-minY)*CELL_Y }));
    const posById = new Map(norm.map(it=>[it.id,it]));
    const links   = [];
    for (const child of norm) {
      if(!child.parentId) continue;
      const parent=posById.get(child.parentId);
      if(!parent) continue;
      links.push({from:parent,to:child,fromId:parent.id,toId:child.id});
    }
    return { items, norm, links,
      width:PAD*2+(maxX-minX)*CELL_X+CARD_W,
      height:PAD*2+(maxY-minY)*CELL_Y+CARD_H };
  }, [nodes]);

  const persons      = useMemo(()=>(Array.isArray(nodes)?nodes:[]).map(toPerson),[nodes]);
  const canvasLayout = useMemo(()=>layout?{...layout,items:layout.norm}:null,[layout]);

  return (
    <div className="min-h-screen flex items-center w-full bg-[#eef5fb] dark:bg-gradient-to-b dark:from-[#0B1626] dark:via-[#070F1C] dark:to-[#050A12]">
      <div className="relative w-full min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
        <AnimatedBackground />
        <div className="relative flex-col w-full max-w-[1700px] px-2 sm:px-4 lg:px-8 py-8">
          <TitleBlock viewMode={activeView} onToggleView={setViewMode} isSmall={isSmall} />
          {loading && (
            <div className="mt-4 rounded-2xl bg-white/70 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/10 p-5 text-slate-700 dark:text-slate-200">
              Chargement de l'organigramme…
            </div>
          )}
          {!loading&&error&&(
            <div className="mt-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/20 p-5 text-rose-700 dark:text-rose-200">
              {error}
            </div>
          )}
          {!loading&&!error&&!nodes.length&&(
            <div className="mt-4 rounded-2xl bg-white/70 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/10 p-5 text-slate-700 dark:text-slate-200">
              Aucun nœud à afficher.
            </div>
          )}
          {!loading&&!error&&nodes.length>0&&(
            <>
              {activeView==="list"&&(
                <div className="rounded-3xl bg-white/50 dark:bg-[#0B1626]/55 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 p-4 sm:p-5">
                  <MobileTree persons={persons} onOpen={setSelected} />
                </div>
              )}
              {activeView==="canvas"&&canvasLayout&&(
                <CanvasView layout={canvasLayout} onOpen={setSelected} />
              )}
            </>
          )}
        </div>
      </div>
      <Modal open={Boolean(selected)} person={selected} onClose={()=>setSelected(null)} />
    </div>
  );
}