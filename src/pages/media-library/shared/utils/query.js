
// ------------------------------
// File: media-library/shared/utils/query.js
// ------------------------------
import { KB, MB, GB } from "./format";

const SIZE_RE = /(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)?/i;
export const toBytes = (val) => {
  const m = String(val).match(SIZE_RE);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = (m[2] || "B").toUpperCase();
  const mul = unit === "GB" ? GB : unit === "MB" ? MB : unit === "KB" ? KB : 1;
  return Math.round(n * mul);
};

// Supporte: type:pdf tag:Rapport ext:mp3 owner:Alice before:2024-06-01 after:2024-01-01 size>10MB size<200KB
export function parseSearch(input) {
  const tokens = [];
  const rest = [];
  (input || "")
    .trim()
    .split(/\s+/)
    .forEach((t) => {
      const low = t.toLowerCase();
      if (/^(type|tag|ext|owner|before|after):/i.test(low)) {
        const [k, v] = t.split(":");
        if (v) tokens.push({ k: k.toLowerCase(), v });
      } else if (/^size[<>]=?/i.test(low)) {
        const op = low.includes(">") ? ">" : "<";
        const num = toBytes(t.slice(t.indexOf(op) + 1));
        if (num) tokens.push({ k: "size", op, v: num });
      } else {
        rest.push(t);
      }
    });
  return { tokens, q: rest.join(" ") };
}

// --- Mini tests unitaires (exécutés au chargement):
try {
  console.assert(toBytes("10MB") === 10 * MB, "toBytes 10MB");
  console.assert(toBytes("200KB") === 200 * KB, "toBytes 200KB");
  const parsed = parseSearch("rapport type:pdf size>10MB tag:Budget owner:alice before:2024-09-01");
  console.assert(parsed.tokens.some(t => t.k === "type" && t.v === "pdf"), "parse type");
  console.assert(parsed.tokens.some(t => t.k === "size" && t.op === ">"), "parse size op");
} catch (e) { console.warn("Tests utils échoués:", e); }
