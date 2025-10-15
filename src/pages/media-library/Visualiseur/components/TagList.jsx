import React, { useMemo, useState } from "react";
import { FaPlus } from "react-icons/fa";

/* --- helpers palette (localisés au composant) --- */
function hexToRgb(hex) {
  const h = (hex || "").trim();
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
    h.length === 4 ? "#" + [...h.replace("#","")].map(x => x + x).join("") : h
  );
  return m ? { r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) } : null;
}
function makeTagPalette(color) {
  const rgb = hexToRgb(color || "#3b82f6");
  if (!rgb) {
    return {
      bg: `color-mix(in oklab, ${color} 8%, white)`,
      bd: `color-mix(in oklab, ${color} 20%, transparent)`,
      dot: color,
      text: color,
      glow: `color-mix(in oklab, ${color} 12%, transparent)`,
    };
  }
  const { r, g, b } = rgb;
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.06)`,
    bd: `rgba(${r}, ${g}, ${b}, 0.15)`,
    dot: `rgba(${r}, ${g}, ${b}, 0.9)`,
    text: `rgb(${r}, ${g}, ${b})`,
    glow: `rgba(${r}, ${g}, ${b}, 0.1)`,
  };
}

/* --- sort/dedupe minimal --- */
function normalizeTags(tags) {
  return Array.isArray(tags)
    ? tags
        .filter((t) => t && (t.id != null || t.name))
        .map((t) => ({ ...t, _pos: t?.pivot?.position ?? t?.pivot?.order ?? t?.pivot?.pos ?? null }))
    : [];
}
function sortTags(tags) {
  const list = normalizeTags(tags);
  const allHavePos = list.every((t) => t._pos != null);
  const sorted = list.sort((a, b) => {
    if (allHavePos) return (a._pos ?? 0) - (b._pos ?? 0);
    return (a.name || "").localeCompare(b.name || "", "fr", { sensitivity: "base" });
  });
  const seen = new Set();
  return sorted.filter((t) => {
    const key = String(t.id ?? t.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* --- UI --- */
export function TagPill({ tag, className = "", onClick }) {
  const pal = makeTagPalette(tag?.color);
  return (
    <button
      type="button"
      onClick={onClick}
      title={tag?.name}
      className={`group inline-flex max-w-full items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border
                  bg-white/70 backdrop-blur-sm shadow-sm border-slate-200/60 hover:shadow-md hover:bg-white/90 
                  transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-1 ${className}`}
      style={{ borderColor: pal.bd, boxShadow: `0 0 0 0 ${pal.glow}` }}
    >
      <span aria-hidden className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: pal.dot }} />
      <span className="truncate" style={{ color: pal.text }}>{tag?.name}</span>
    </button>
  );
}

export default function TagList({ tags = [], onAddClick, onTagClick, max = 10 }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = useMemo(() => sortTags(tags), [tags]);
  const visible = expanded ? sorted : sorted.slice(0, max);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((t, i) => (
        <TagPill key={t.id ?? `${t.name}-${i}`} tag={t} onClick={() => onTagClick?.(t)} />
      ))}

      {sorted.length > max && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white/70 text-slate-600 hover:bg-white/90 transition-all duration-300"
        >
          {expanded ? "Voir moins" : `+${sorted.length - max} autres`}
        </button>
      )}

      {onAddClick && (
        <button
          type="button"
          onClick={onAddClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                     border border-slate-300/60 text-slate-600 bg-white/70 hover:bg-slate-50 transition-all duration-300"
          title="Gérer les tags"
        >
          <FaPlus className="text-slate-500" />
          Ajouter
        </button>
      )}
    </div>
  );
}
