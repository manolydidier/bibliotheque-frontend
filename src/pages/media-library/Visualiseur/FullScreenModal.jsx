// src/media-library/FullScreenModal.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FaTimes, FaExpand, FaCompress, FaSearchPlus, FaSearchMinus, FaSync } from "react-icons/fa";
import FilePreview from "./parts/Visualiseur/FilePreview/FilePreview";

/* -------- helpers Fullscreen (cross-browser) -------- */
function isFsOn() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}
function canFs() {
  return (
    document.fullscreenEnabled ||
    document.webkitFullscreenEnabled ||
    document.mozFullScreenEnabled ||
    document.msFullscreenEnabled ||
    false
  );
}
async function reqFs(el) {
  if (!el) return;
  const fn =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen;
  if (fn) {
    try {
      // @ts-ignore
      await fn.call(el, { navigationUI: "hide" });
    } catch {}
  }
}
async function exitFs() {
  const fn =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.mozCancelFullScreen ||
    document.msExitFullscreen;
  if (fn) {
    try {
      // @ts-ignore
      await fn.call(document);
    } catch {}
  }
}

/**
 * FullScreenModal
 * - file: l'article (ou article enrichi) à passer à FilePreview
 * - activeTab: onglet courant venant du parent (ignoré si forceApercu = true)
 * - forceApercu: si true, le modal affiche toujours FilePreview en "Aperçu"
 * - onClose: callback fermeture
 */
export default function FullScreenModal({ file, onClose, activeTab, forceApercu = true }) {
  const wrapRef = useRef(null);
  const scrollRef = useRef(null);
  const contentRef = useRef(null);

  const [fsSupported] = useState(() => canFs());
  const [fsActive, setFsActive] = useState(() => !!isFsOn());
  const [uiVisible, setUiVisible] = useState(true); // barre auto-hide

  // ====== Scroll & Zoom ======
  const [zoom, setZoom] = useState(1);
  const clampZoom = useCallback((z) => Math.min(4, Math.max(0.25, Number(z) || 1)), []);
  const zoomIn = useCallback(() => setZoom((z) => clampZoom(z * 1.2)), [clampZoom]);
  const zoomOut = useCallback(() => setZoom((z) => clampZoom(z / 1.2)), [clampZoom]);
  const zoomReset = useCallback(() => setZoom(1), []);

  // Ctrl/Cmd + molette => zoom
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      setZoom((z) => clampZoom(z * (dir > 0 ? 1.1 : 1 / 1.1)));
    }
  }, [clampZoom]);

  // Raccourcis clavier: Ctrl/Cmd + '+', '-', '0', et ESC pour fermer
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomIn(); }
        if (e.key === "-") { e.preventDefault(); zoomOut(); }
        if (e.key === "0") { e.preventDefault(); zoomReset(); }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIn, zoomOut, zoomReset]); // handleClose est stable via useCallback

  // ====== Fullscreen lifecycle ======
  useEffect(() => {
    let unmounted = false;

    const tryEnter = async () => {
      if (fsSupported && !isFsOn() && wrapRef.current) {
        await reqFs(wrapRef.current);
      }
      if (!unmounted) setFsActive(!!isFsOn());
    };
    tryEnter();

    const onFsChange = () => {
      const on = !!isFsOn();
      setFsActive(on);
      if (!on) onClose?.(); // quitter FS => fermer proprement
    };

    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    document.addEventListener("mozfullscreenchange", onFsChange);
    document.addEventListener("MSFullscreenChange", onFsChange);

    return () => {
      unmounted = true;
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      document.removeEventListener("mozfullscreenchange", onFsChange);
      document.removeEventListener("MSFullscreenChange", onFsChange);
    };
  }, [fsSupported, onClose]);

  // ====== Auto-hide UI ======
  const hideTimerRef = useRef(null);
  const pokeUi = useCallback(() => {
    setUiVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setUiVisible(false), 2500);
  }, []);
  useEffect(() => {
    const onMove = () => pokeUi();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onMove);
      clearTimeout(hideTimerRef.current);
    };
  }, [pokeUi]);

  // Toggle FS (utile si la demande initiale a échoué)
  const toggleFs = useCallback(async () => {
    if (isFsOn()) {
      await exitFs();
    } else if (wrapRef.current) {
      await reqFs(wrapRef.current);
      setFsActive(!!isFsOn());
    }
  }, []);

  // Fermer explicitement
  const handleClose = useCallback(async () => {
    if (isFsOn()) {
      await exitFs();
    } else {
      onClose?.();
    }
  }, [onClose]);

  // Conteneur: FS natif ou fallback overlay
  const containerProps = fsSupported
    ? {
        ref: wrapRef,
        className:
          "fixed inset-0 bg-black text-white z-[9999] flex flex-col w-screen h-screen",
      }
    : {
        className:
          "fixed inset-0 bg-black/90 backdrop-blur-sm text-white z-[9999] flex flex-col w-screen h-screen",
      };

  // Curseur caché quand UI masquée
  const cursorClass = uiVisible ? "cursor-default" : "cursor-none";

  // Onglet à rendre
  const tabToRender = forceApercu ? "Aperçu" : (activeTab || "Aperçu");

  return (
    <div {...containerProps} onMouseMove={pokeUi}>
      {/* Topbar épurée (auto-hide) */}
      <div
        className={[
          "absolute top-0 left-0 right-0 flex items-center justify-between",
          "px-4 py-2 bg-gradient-to-b from-black/70 to-transparent",
          "transition-opacity duration-200",
          uiVisible ? "opacity-100" : "opacity-0 pointer-events-none",
        ].join(" ")}
      >
        <div className="text-sm text-gray-200 truncate max-w-[55vw]">
          {file?.name || file?.title || "Aperçu"}
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button
            onClick={zoomOut}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            title="Zoom -"
          >
            <FaSearchMinus />
          </button>
          <button
            onClick={zoomReset}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            title="Réinitialiser le zoom"
          >
            <FaSync />
          </button>
          <button
            onClick={zoomIn}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            title="Zoom +"
          >
            <FaSearchPlus />
          </button>

          {/* Toggle fullscreen */}
          <button
            onClick={toggleFs}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            title={fsActive ? "Quitter le plein écran" : "Passer en plein écran"}
          >
            {fsActive ? <FaCompress /> : <FaExpand />}
          </button>

          {/* Fermer */}
          <button
            onClick={handleClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            title="Fermer"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* Zone scrollable + zoomable */}
      <div
        className={[
          "flex-1 w-full h-full",
          "flex items-stretch justify-stretch",
          "bg-black",
          cursorClass,
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full h-full max-w-[98vw] max-h-[96vh] p-0 md:p-4">
          <div
            ref={scrollRef}
            className="w-full h-full rounded-none md:rounded-2xl bg-black overflow-auto overscroll-contain"
            style={{
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-x pan-y pinch-zoom",
            }}
            onWheel={handleWheel}
          >
            <div
              ref={contentRef}
              className="w-full h-full min-w-full min-h-full flex items-center justify-center"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center top",
                willChange: "transform",
              }}
            >
              <div className="w-full h-full">
                <FilePreview file={file} activeTab={tabToRender} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer discret */}
      <div
        className={[
          "absolute bottom-0 left-0 right-0 px-4 py-2",
          "text-[12px] text-gray-400",
          "bg-gradient-to-t from-black/70 to-transparent",
          "transition-opacity duration-200",
          uiVisible ? "opacity-100" : "opacity-0 pointer-events-none",
        ].join(" ")}
      >
        Astuces : Ctrl/Cmd + molette pour zoomer, Ctrl/Cmd + ( + | - | 0 ), Échap pour quitter.
      </div>
    </div>
  );
}
