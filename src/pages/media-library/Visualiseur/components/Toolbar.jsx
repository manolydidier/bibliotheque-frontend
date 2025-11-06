// src/media-library/components/Toolbar.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaRedo,
  FaExpand,
  FaDownload,
  FaShareAlt,
  FaPalette,
} from "react-icons/fa";
import ShareButton from "../share/ShareButton";

const STORAGE_KEY = "gridcard-color-enabled";

/* =========================================================
   Barre d’outils universelle (responsive + autoCompact)
   + Toggle palette couleur global
   ========================================================= */
export default function Toolbar({
  onBack,
  onForward,
  onRefresh,
  onFullscreen,
  onDownload,
  shareData,
  compact = false,     // Mode compact forcé
  autoCompact = true,  // Active le mode dock auto sur mobile
}) {
  const [isCompact, setIsCompact] = useState(compact);

  // --- Palette globale (ON par défaut) ---
  const [paletteOn, setPaletteOn] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw == null ? true : JSON.parse(raw);
    } catch { return true; }
  });

  // Applique la classe globale + broadcast immédiatement au montage et à chaque changement
 const applyPalette = useCallback((enabled) => {
  const html = document.documentElement;
  // attribut lisible par le CSS
  html.setAttribute("data-cardmode", enabled ? "colored" : "neutral");
  // classe de compatibilité (si tu préfères la cibler)
  html.classList.toggle("cards-colored", !!enabled);

  // broadcast pour les autres composants (Visualiseur écoute déjà)
  window.dispatchEvent(
    new CustomEvent("gridcard:colorpref", { detail: { enabled: !!enabled } })
  );
}, []);


  useEffect(() => {
    applyPalette(paletteOn);
  }, [paletteOn, applyPalette]);

  const togglePalette = useCallback(() => {
    setPaletteOn(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      // on applique tout de suite (optimiste)
      applyPalette(next);
      return next;
    });
  }, [applyPalette]);

  // 🔁 Gère le mode autoCompact selon la largeur
  useEffect(() => {
    if (!autoCompact) return;
    const handleResize = () => {
      if (!compact) setIsCompact(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [autoCompact, compact]);

  const activeCompact = compact || isCompact;

  return (
    <div
      className={`transition-all duration-500 ease-out 
        ${
          activeCompact
            ? "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-3 bg-white/80 border border-slate-300/50 rounded-2xl px-3 py-2 shadow-lg backdrop-blur-md animate-fadeUp"
            : "sticky top-5 z-30 flex justify-between items-center bg-gradient-to-r from-white/60 via-white/40 to-transparent border-b border-slate-200/40 backdrop-blur-xl shadow-sm px-4 sm:px-6 py-3 sm:py-4 animate-fadeDown"
        }`}
    >
      {/* === Mode compact (dock flottant mobile) === */}
      {activeCompact ? (
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <IconButton icon={<FaArrowLeft />} title="Retour" onClick={onBack} />
          <IconButton
            icon={<FaArrowRight />}
            title="Avancer"
            onClick={onForward}
          />
          <IconButton
            icon={<FaRedo />}
            title="Rafraîchir"
            onClick={onRefresh}
          />
          <IconButton
            icon={<FaExpand />}
            title="Plein écran"
            onClick={onFullscreen}
          />
          <IconButton
            icon={<FaDownload />}
            title="Télécharger"
            onClick={onDownload}
          />
          <IconButton
            icon={<FaShareAlt />}
            title="Partager"
            custom={<ShareButton {...shareData} />}
          />
          {/* Toggle palette en compact */}
          {/* <ToggleButton paletteOn={paletteOn} onToggle={togglePalette} /> */}
        </div>
      ) : (
        /* === Mode étendu (bureau/dashboard) === */
        <>
          {/* Navigation */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3 ml-4">
            <IconButton icon={<FaArrowLeft />} title="Retour" onClick={onBack} />
            <IconButton
              icon={<FaRedo />}
              title="Rafraîchir"
              onClick={onRefresh}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3 mt-3 sm:mt-0">
            <ActionButton
              icon={<FaExpand className="text-sm" />}
              label="Plein écran"
              color="blue"
              onClick={onFullscreen}
            />
            <ActionButton
              icon={<FaDownload className="text-sm" />}
              label="Télécharger"
              color="emerald"
              onClick={onDownload}
            />
            <ShareButton
              title={shareData?.title}
              excerpt={shareData?.excerpt}
              url={shareData?.url}
              articleId={shareData?.articleId}
              global={true}
            />
            {/* Toggle palette en mode étendu */}
            {/* <ActionButton
              icon={<FaPalette className="text-sm" />}
              label={paletteOn ? "Couleurs " : "Neutre "}
              color={paletteOn ? "blue" : "emerald"}
              onClick={togglePalette}
            /> */}
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   Boutons réutilisables
   ========================================================= */
function IconButton({ icon, title, onClick, custom }) {
  return custom ? (
    <div title={title}>{custom}</div>
  ) : (
    <button
      onClick={onClick}
      title={title}
      className="p-3 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50/80
                 active:scale-95 transition-all duration-300 shadow-sm"
    >
      {icon}
    </button>
  );
}

function ActionButton({ icon, label, color = "blue", onClick }) {
  const colorMap = {
    blue: "hover:text-blue-600 hover:bg-blue-50/80",
    emerald: "hover:text-emerald-600 hover:bg-emerald-50/80",
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-slate-700
                  bg-white/70 border border-slate-200/70 shadow-sm
                  active:scale-95 transition-all duration-300 ${colorMap[color]}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/* Petit bouton pour le dock compact */
// function ToggleButton({ paletteOn, onToggle }) {
//   return (
//     <button
//       onClick={onToggle}
//       title={paletteOn ? "Désactiver les couleurs" : "Activer les couleurs"}
//       className={`p-3 rounded-xl text-slate-600 active:scale-95 transition-all duration-300 shadow-sm
//         ${paletteOn ? "hover:text-blue-600 hover:bg-blue-50/80" : "hover:text-emerald-600 hover:bg-emerald-50/80"}`}
//     >
//       <FaPalette />
//     </button>
//   );
// }

/* =========================================================
   Animations CSS globales (fade/slide)
   ========================================================= */
const style = document.createElement("style");
style.innerHTML = `
@keyframes fadeSlideUp {
  0% { opacity: 0; transform: translateY(12px) scale(0.98); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes fadeSlideDown {
  0% { opacity: 0; transform: translateY(-10px); }
  100% { opacity: 1; transform: translateY(0); }
}
.animate-fadeUp {
  animation: fadeSlideUp 0.45s ease-out both;
}
.animate-fadeDown {
  animation: fadeSlideDown 0.45s ease-out both;
}
`;
document.head.appendChild(style);
