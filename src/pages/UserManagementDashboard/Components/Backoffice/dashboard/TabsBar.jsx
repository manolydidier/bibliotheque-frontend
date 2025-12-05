// TabsBar.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";

/**
 * Props:
 * - active: string (key actif)
 * - onChange: (key) => void
 * - tabs?: Array<{
 *      key: string;
 *      label: string;
 *      icon?: ReactNode;
 *      badge?: number | string;      // ✅ compteur (ex: 3, "99+")
 *      badgeTone?: "primary" | "danger" | "muted"; // ✅ couleur badge
 *      dot?: boolean;                // ✅ simple pastille
 *      disabled?: boolean;           // optionnel
 *   }>
 *    (facultatif) sinon tentera d'utiliser la constante globale TABS
 */
export default function TabsBar({ active, onChange, tabs }) {
  // Source des tabs: prop > globale TABS > vide
  const sourceTabs =
    (Array.isArray(tabs) && tabs.length
      ? tabs
      : typeof TABS !== "undefined"
      ? TABS
      : []) || [];

  const count = Math.max(1, sourceTabs.length);
  const activeIndex = Math.max(
    0,
    sourceTabs.findIndex((t) => t.key === active)
  );

  // Refs & états
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragIndexFloat, setDragIndexFloat] = useState(activeIndex);
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [containerLeft, setContainerLeft] = useState(0);
  const suppressClickRef = useRef(false); // évite le clic juste après un drag

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // Mesure (width & left) via ResizeObserver + fallback
  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setContainerLeft(rect.left);
    setSegmentWidth(rect.width / count || 0);
  }, [count]);

  useEffect(() => {
    measure();
    const ro =
      typeof window !== "undefined" && "ResizeObserver" in window
        ? new ResizeObserver(() => measure())
        : null;

    if (ro && containerRef.current) ro.observe(containerRef.current);

    const onResize = () => measure();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (ro && containerRef.current) ro.unobserve(containerRef.current);
    };
  }, [measure]);

  // Sync visuel quand on change d’onglet par clic ou externe
  useEffect(() => {
    if (!dragging) setDragIndexFloat(activeIndex);
  }, [activeIndex, dragging]);

  // Convertit un clientX en index flottant dans [0, count-1]
  const xToFloatIndex = useCallback(
    (clientX) => {
      if (!segmentWidth) return activeIndex;
      const rel = clientX - containerLeft; // px depuis bord gauche
      const floatIdx = rel / Math.max(1, segmentWidth);
      return clamp(floatIdx, 0, count - 1);
    },
    [containerLeft, segmentWidth, count, activeIndex]
  );

  // Démarrage drag n'importe où sur la barre
  const onPointerDownContainer = (e) => {
    // Si clic sur un bouton, on laissera aussi le clic fonctionner si pas de drag
    suppressClickRef.current = false;

    // Ne pas initier de drag si on clique sur un bouton désactivé
    const target = e.target;
    if (
      target &&
      typeof target.closest === "function" &&
      target.closest("button[aria-disabled='true']")
    ) {
      return;
    }

    const x =
      e.clientX ??
      (e.touches && e.touches[0] && e.touches[0].clientX) ??
      undefined;
    if (typeof x !== "number") return;
    setDragging(true);
    setDragIndexFloat(xToFloatIndex(x));
  };

  // Mouvement & fin du drag (attachés globalement)
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e) => {
      // Empêche le scroll pendant glisser sur mobile
      if (e.cancelable) e.preventDefault?.();
      const x =
        e.clientX ??
        (e.touches && e.touches[0] && e.touches[0].clientX) ??
        undefined;
      if (typeof x !== "number") return;
      setDragIndexFloat(xToFloatIndex(x));
      suppressClickRef.current = true; // on a bien bougé => éviter le clic
    };

    const onUp = () => {
      const target = Math.round(clamp(dragIndexFloat, 0, count - 1));
      const nextKey = sourceTabs[target]?.key ?? sourceTabs[0]?.key;
      setDragging(false);
      if (nextKey) onChange?.(nextKey);
      // Laisse suppressClickRef.current = true pour ignorer un clic immédiat
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, dragIndexFloat, count, sourceTabs, onChange, xToFloatIndex]);

  // Position du knob
  const knobLeftPercent = useMemo(() => {
    const idx = dragging ? dragIndexFloat : activeIndex;
    return (idx * 100) / count;
  }, [dragging, dragIndexFloat, activeIndex, count]);

  // Clic sur une option (ignoré si on vient de drag)
  const onOptionClick = (tab) => {
    if (suppressClickRef.current) return;
    if (tab.disabled) return;
    onChange?.(tab.key);
  };

  // Navigation clavier
  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") {
      const next = Math.min(count - 1, activeIndex + 1);
      const nk = sourceTabs[next]?.key;
      if (nk) onChange?.(nk);
    } else if (e.key === "ArrowLeft") {
      const prev = Math.max(0, activeIndex - 1);
      const pk = sourceTabs[prev]?.key;
      if (pk) onChange?.(pk);
    }
  };

  // palette de tons pour les badges
  const badgeToneClass = (tone, isActive) => {
    if (tone === "danger") {
      return isActive
        ? "bg-red-600 text-white"
        : "bg-red-100 text-red-700";
    }
    if (tone === "muted") {
      return isActive
        ? "bg-slate-600 text-white"
        : "bg-slate-100 text-slate-600";
    }
    // primary par défaut
    return isActive
      ? "bg-blue-600 text-white"
      : "bg-blue-100 text-blue-700";
  };

  return (
    <div className="w-full overflow-x-auto bg-red-800">
      <div
        ref={containerRef}
        onPointerDown={onPointerDownContainer}
        onTouchStart={onPointerDownContainer}
        onKeyDown={onKeyDown}
        role="tablist"
        aria-orientation="horizontal"
        className="relative bg-white/80 backdrop-blur-md border border-white/50 rounded-xl p-1 inline-flex shadow-sm select-none"
        style={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* Knob glass : suit le drag ou l’onglet actif */}
        <div
          className={`absolute top-1 bottom-1 rounded-lg ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          } transition-all ease-out`}
          style={{
            width: `calc(100% / ${count} - 2px)`,
            left: `calc(${knobLeftPercent}% + 1px)`,
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(59,130,246,0.20)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            transitionDuration: dragging ? "0ms" : "300ms",
          }}
          aria-hidden="true"
        />

        {/* Options (icônes + labels) */}
        <div className="relative z-10 flex">
          {sourceTabs.map((t) => {
            const isActive = active === t.key;
            const hasBadge =
              typeof t.badge === "number" ||
              (typeof t.badge === "string" && t.badge.length > 0);
            const tone = t.badgeTone || "primary";

            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-disabled={t.disabled ? "true" : undefined}
                disabled={t.disabled}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onOptionClick(t)}
                className={`text-sm px-5 py-2.5 font-medium transition-all duration-200 rounded whitespace-nowrap flex items-center justify-center gap-2
                  ${
                    isActive
                      ? "text-blue-600 font-semibold"
                      : "text-gray-600 hover:text-gray-800"
                  }
                  ${t.disabled ? "opacity-60 cursor-not-allowed" : ""}
                `}
                style={{ width: `${100 / count}%` }}
              >
                {t.icon && (
                  <span className="text-base flex items-center justify-center">
                    {t.icon}
                  </span>
                )}

                <span className="flex items-center gap-1">
                  <span>{t.label}</span>

                  {/* pastille "dot" (style notif) */}
                  {t.dot && !hasBadge && (
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        isActive ? "bg-red-500" : "bg-red-400"
                      }`}
                    />
                  )}

                  {/* badge numérique (ex: 3, 12, 99+) */}
                  {hasBadge && (
                    <span
                      className={`inline-flex items-center justify-center text-[10px] font-semibold min-w-[1.25rem] h-4 px-1 rounded-full ${badgeToneClass(
                        tone,
                        isActive
                      )}`}
                    >
                      {t.badge}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
