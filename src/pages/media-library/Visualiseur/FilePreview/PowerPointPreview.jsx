// src/media-library/parts/Visualiseur/FilePreview/PowerPointPreview.jsx
import React, { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { ensureCorsSafe, fetchArrayBufferWithFallback } from "@/utils/fileFetch";

/** 1 px @ 96DPI ≈ 9525 EMU */
const EMU_PER_PX = 9525;

/* -------------------------------------------
   Utils
------------------------------------------- */
function isPublicHttps(u) {
  try {
    const url = new URL(u);
    const isHttps = url.protocol === "https:";
    const isLocal = /(^|\.)localhost$|127\.0\.0\.1$/.test(url.hostname);
    return isHttps && !isLocal;
  } catch {
    return false;
  }
}
function emuToPx(emu) {
  return emu / EMU_PER_PX;
}
function mimeFromExt(path) {
  const ext = String(path).split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png": return "image/png";
    case "jpg": case "jpeg": return "image/jpeg";
    case "gif": return "image/gif";
    case "bmp": return "image/bmp";
    case "webp": return "image/webp";
    case "svg": return "image/svg+xml";
    default: return "application/octet-stream";
  }
}
function resolveTarget(basePath, target) {
  const base = basePath.replace(/[^/]+$/, ""); // "ppt/slides/"
  const parts = (base + target).split("/");
  const out = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return out.join("/");
}
function readAttrInt(el, name, fallback = 0) {
  const v = el?.getAttribute?.(name);
  return v ? parseInt(v, 10) : fallback;
}
function getFirst(el, name) {
  return el?.getElementsByTagNameNS?.("*", name)?.[0] || null;
}

/** lit la taille du slide (EMU) */
async function parsePresentationSize(zip) {
  const path = "ppt/presentation.xml";
  if (!zip.file(path)) return { cx: 9144000, cy: 5143500 }; // fallback 16:9
  const txt = await zip.file(path).async("text");
  const doc = new DOMParser().parseFromString(txt, "application/xml");
  const sldSz = getFirst(doc, "sldSz");
  if (!sldSz) return { cx: 9144000, cy: 5143500 };
  return {
    cx: readAttrInt(sldSz, "cx", 9144000),
    cy: readAttrInt(sldSz, "cy", 5143500),
  };
}

/** récupère la boîte (EMU) d’une forme */
function readXfrmRect(spPrOrPicPr) {
  const xfrm = getFirst(spPrOrPicPr, "xfrm");
  if (!xfrm) return null;
  const off = getFirst(xfrm, "off");
  const ext = getFirst(xfrm, "ext");
  const x = off ? readAttrInt(off, "x", 0) : 0;
  const y = off ? readAttrInt(off, "y", 0) : 0;
  const cx = ext ? readAttrInt(ext, "cx", 0) : 0;
  const cy = ext ? readAttrInt(ext, "cy", 0) : 0;
  return { x, y, cx, cy }; // <-- EMU natifs
}

/** tente de déduire une taille de police (pt) depuis les runs */
function guessFontPtFromShape(spEl) {
  // a:rPr @sz = 1/100 de point (ex: 1200 => 12pt)
  const rPrs = spEl?.getElementsByTagNameNS?.("*", "rPr");
  for (let i = 0; i < (rPrs?.length || 0); i++) {
    const sz = rPrs[i].getAttribute("sz");
    if (sz) {
      const pt = parseInt(sz, 10) / 100;
      if (pt > 0) return pt;
    }
  }
  // fallback si rien trouvé
  return 18; // 18pt “lisible”
}

/** extrait le texte ligne par ligne */
function collectTexts(spEl) {
  const out = [];
  const txBody = getFirst(spEl, "txBody");
  if (!txBody) return out;

  const pNodes = txBody.getElementsByTagNameNS("*", "p");
  for (let i = 0; i < pNodes.length; i++) {
    const p = pNodes[i];
    let line = "";
    const rNodes = p.getElementsByTagNameNS("*", "r");
    if (rNodes.length > 0) {
      for (let j = 0; j < rNodes.length; j++) {
        const t = getFirst(rNodes[j], "t");
        if (t?.textContent) line += t.textContent;
      }
    } else {
      // certains paragraphes ont a:t sans a:r
      const tNodes = p.getElementsByTagNameNS("*", "t");
      for (let k = 0; k < tNodes.length; k++) {
        if (tNodes[k]?.textContent) line += tNodes[k].textContent;
      }
    }
    const s = line.replace(/\s+/g, " ").trim();
    if (s) out.push(s);
  }
  return out;
}

/** parse un slide : récupère shapes texte + images (EMU + src) */
async function parseSlide(zip, slidePath) {
  const xml = await zip.file(slidePath).async("text");
  const doc = new DOMParser().parseFromString(xml, "application/xml");

  // relations
  const relsPath = slidePath.replace(/([^/]+)$/, "_rels/$1.rels");
  let rels = {};
  if (zip.file(relsPath)) {
    const relsXml = await zip.file(relsPath).async("text");
    const rdoc = new DOMParser().parseFromString(relsXml, "application/xml");
    const relNodes = rdoc.getElementsByTagName("Relationship");
    for (let i = 0; i < relNodes.length; i++) {
      const id = relNodes[i].getAttribute("Id");
      const target = relNodes[i].getAttribute("Target");
      if (id && target) {
        rels[id] = resolveTarget(slidePath, target);
      }
    }
  }

  const shapes = [];

  // TEXT (p:sp)
  const spNodes = doc.getElementsByTagNameNS("*", "sp");
  for (let i = 0; i < spNodes.length; i++) {
    const sp = spNodes[i];
    const spPr = getFirst(sp, "spPr") || sp;
    const rect = readXfrmRect(spPr);
    if (!rect) continue;
    const lines = collectTexts(sp);
    if (!lines.length) continue;
    const fontPt = guessFontPtFromShape(sp);
    shapes.push({ type: "text", rect, lines, fontPt });
  }

  // IMAGES (p:pic)
  const picNodes = doc.getElementsByTagNameNS("*", "pic");
  for (let i = 0; i < picNodes.length; i++) {
    const pic = picNodes[i];
    const spPr = getFirst(pic, "spPr") || pic;
    const rect = readXfrmRect(spPr);
    if (!rect) continue;

    const blipFill = getFirst(pic, "blipFill");
    const blip = blipFill ? getFirst(blipFill, "blip") : null;
    const rId = blip ? (blip.getAttribute("r:embed") || blip.getAttribute("embed")) : null;
    if (!rId) continue;

    const mediaPath = rels[rId];
    if (!mediaPath || !zip.file(mediaPath)) continue;

    const base64 = await zip.file(mediaPath).async("base64");
    const mime = mimeFromExt(mediaPath);
    const dataUrl = `data:${mime};base64,${base64}`;

    shapes.push({ type: "image", rect, src: dataUrl, alt: mediaPath.split("/").pop() });
  }

  const index = parseInt(slidePath.match(/slide(\d+)\.xml/i)?.[1] || "0", 10) || 1;
  return { index, shapes };
}

/* -------------------------------------------
   Slide responsive avec échelle exacte
------------------------------------------- */
function SlideCanvas({ slide, size }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);

  // slide “base” en px natifs
  const baseW = emuToPx(size.cx);
  const baseH = emuToPx(size.cy);

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width || el.clientWidth || baseW;
      const s = w / baseW; // on ajuste à la largeur dispo
      setScale(s);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [baseW]);

  // hauteur “réservée” = baseH * scale
  const reservedH = Math.max(1, Math.round(baseH * scale));

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white overflow-hidden">
      <div className="px-4 py-2 border-b text-slate-600 text-sm">Slide {slide.index}</div>

      <div ref={wrapRef} className="relative w-full" style={{ height: reservedH }}>
        {/* Scène native (px) + scale */}
        <div
          className="absolute top-0 left-0"
          style={{
            width: baseW,
            height: baseH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            background: "#f8fafc",
          }}
        >
          {/* éléments positionnés en px natifs */}
          {slide.shapes.map((s, i) => {
            const style = {
              position: "absolute",
              left: emuToPx(s.rect.x),
              top: emuToPx(s.rect.y),
              width: emuToPx(s.rect.cx),
              height: emuToPx(s.rect.cy),
              overflow: "hidden",
            };

            if (s.type === "image") {
              return (
                <img
                  key={i}
                  src={s.src}
                  alt={s.alt || `img-${i}`}
                  style={{ ...style, objectFit: "contain" }}
                />
              );
            }

            const fontPx = (s.fontPt || 18) * (96 / 72); // 1pt = 1/72in ; 96dpi
            return (
              <div
                key={i}
                style={{
                  ...style,
                  whiteSpace: "pre-wrap",
                  padding: 8,
                  color: "#0f172a",
                  fontSize: fontPx,
                  lineHeight: 1.25,
                  background: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(15,23,42,0.06)",
                  borderRadius: 8,
                }}
              >
                {s.lines.map((t, j) => <div key={j} style={{ marginBottom: 2 }}>{t}</div>)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------
   Composant principal
------------------------------------------- */
export default function PowerPointPreview({ src, title = "Présentation PowerPoint" }) {
  const [mode, setMode] = useState("auto"); // "office" | "local"
  const [size, setSize] = useState({ cx: 9144000, cy: 5143500 });
  const [slides, setSlides] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setErr("");
    setSlides([]);

    if (isPublicHttps(src)) {
      setMode("office");
      return;
    }

    setMode("local");
    (async () => {
      try {
        const safe = ensureCorsSafe(src);
        const buf = await fetchArrayBufferWithFallback(safe, { timeoutMs: 60000 });
        if (cancelled) return;

        const zip = await JSZip.loadAsync(buf);
        if (cancelled) return;

        const sldSize = await parsePresentationSize(zip);
        if (!cancelled) setSize(sldSize);

        const slideFiles = Object.keys(zip.files)
          .filter((p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p))
          .sort((a, b) => {
            const na = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
            const nb = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
            return na - nb;
          });

        const out = [];
        for (const path of slideFiles) {
          const s = await parseSlide(zip, path);
          out.push(s);
        }
        if (!cancelled) setSlides(out);
      } catch (e) {
        if (!cancelled) setErr(e?.message || String(e));
      }
    })();

    return () => { cancelled = true; };
  }, [src]);

  // Mode Office Online si HTTPS public
  if (mode === "office") {
    const officeSrc = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(src)}`;
    return (
      <div className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white">
        <div className="px-4 py-2 border-b text-slate-700">{title}</div>
        <iframe src={officeSrc} className="w-full h-[calc(105vh-40px)]" title={title} allowFullScreen />
      </div>
    );
  }

  // Rendu local (scène en px + scale => taille fidèle)
  return (
    <div className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white flex flex-col">
      <div className="px-4 py-2 border-b text-slate-700">{title}</div>

      {err ? (
        <div className="p-4 text-sm text-red-600 overflow-auto">
          Impossible d’analyser le .pptx en local : {err}
        </div>
      ) : slides.length === 0 ? (
        <div className="p-4 text-sm text-slate-500">Analyse en cours ou aucun contenu détecté.</div>
      ) : (
        <div className="flex-1 overflow-auto p-4 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
          {slides.map((s) => (
            <SlideCanvas key={s.index} slide={s} size={size} />
          ))}
        </div>
      )}
    </div>
  );
}
