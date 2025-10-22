// ------------------------------
// File: media-library/parts/Pagination.jsx (version avec Font Awesome + i18n)
// ------------------------------
import { useMemo, useState, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faAngleDoubleLeft,
  faAngleDoubleRight
} from "@fortawesome/free-solid-svg-icons";

/**
 * Pagination — composant accessible, réactif et stylé (Tailwind) avec i18n
 *
 * Props compatibles avec votre version initiale + options facultatives :
 * - page: number (1-indexed)
 * - perPage: number
 * - total: number
 * - onChange: (nextPage:number) => void
 *
 * Options facultatives (toutes avec valeurs par défaut) :
 * - className: string — classes supplémentaires pour le conteneur
 * - siblingCount: number — nb de pages autour de la page active (par défaut 1)
 * - boundaryCount: number — nb de pages au début/fin (par défaut 1)
 * - showFirstLast: boolean — afficher « première »/« dernière » (par défaut true)
 * - showJump: boolean — champ « Aller à la page » (par défaut true)
 * - showPageSize: boolean — afficher le sélecteur de taille de page (par défaut false)
 * - pageSizeOptions: number[] — options du sélecteur (par défaut [10,20,50,100])
 * - onPageSizeChange: (size:number) => void — rappel pour changer perPage
 */
export default function Pagination({
  page = 1,
  perPage = 24,
  total = 0,
  onChange = () => {},
  className = "",
  siblingCount = 1,
  boundaryCount = 1,
  showFirstLast = true,
  showJump = true,
  showPageSize = false,
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
}) {
  const { t, i18n } = useTranslation();
  
  const pages = Math.max(1, Math.ceil((total || 0) / Math.max(1, perPage)));
  const current = Math.min(Math.max(1, page), pages);
  const canPrev = current > 1;
  const canNext = current < pages;

  const go = useCallback(
    (p) => {
      const next = Math.min(Math.max(1, p), pages);
      if (next !== current) onChange(next);
    },
    [current, pages, onChange]
  );

  // Calcule la plage des boutons numériques avec ellipses
  const pageItems = useMemo(() => {
    const totalPages = pages;
    if (totalPages <= 1) return [1];

    const range = (start, end) =>
      Array.from({ length: end - start + 1 }, (_, i) => start + i);

    const startPages = range(1, Math.min(boundaryCount, totalPages));
    const endPages = range(
      Math.max(totalPages - boundaryCount + 1, boundaryCount + 1),
      totalPages
    );

    const siblingsStart = Math.max(
      Math.min(
        current - siblingCount,
        totalPages - boundaryCount - siblingCount * 2 - 1
      ),
      boundaryCount + 2
    );
    const siblingsEnd = Math.min(
      Math.max(
        current + siblingCount,
        boundaryCount + siblingCount * 2 + 2
      ),
      totalPages - boundaryCount - 1
    );

    const items = [
      ...startPages,
      siblingsStart > boundaryCount + 2 ? "ellipsis" : null,
      ...range(siblingsStart, siblingsEnd),
      siblingsEnd < totalPages - boundaryCount - 1 ? "ellipsis" : null,
      ...endPages,
    ].filter(Boolean);

    // Si peu de pages, on simplifie
    if (totalPages <= boundaryCount * 2 + siblingCount * 2 + 3) {
      return range(1, totalPages);
    }

    return items;
  }, [pages, current, siblingCount, boundaryCount]);

  const hasItems = total > 0;
  const startItem = hasItems ? (current - 1) * perPage + 1 : 0;
  const endItem = hasItems ? Math.min(total, current * perPage) : 0;

  const [jump, setJump] = useState("");

  // ————————————————————————————————————————————————
  // Styles (accent bleu, épuré & intuitif)
  // ————————————————————————————————————————————————
  const btnBase =
    "inline-flex items-center justify-center h-9 min-w-9 px-3 rounded-md border text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400/60 disabled:opacity-50 disabled:cursor-not-allowed";
  const btnGhost =
    "hover:bg-blue-50 border-blue-200 text-blue-700 dark:hover:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200";
  const btnSolid =
    "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-600";

  // Accessibilité clavier: flèches gauche/droite pour naviguer (hors champs input)
  const onKeyDownNav = (e) => {
    if (e.target.tagName === "INPUT") return;
    if (e.key === "ArrowLeft" && canPrev) {
      e.preventDefault();
      go(current - 1);
    } else if (e.key === "ArrowRight" && canNext) {
      e.preventDefault();
      go(current + 1);
    }
  };

  // Formatage des nombres selon la locale
  const nf = useMemo(() => new Intl.NumberFormat(i18n.language), [i18n.language]);

  return (
    <nav
      className={`w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4 ${className}`}
      role="navigation"
      aria-label={t('pagination.ariaLabel')}
      onKeyDown={onKeyDownNav}
    >
      {/* Infos */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('pagination.displayInfo', {
            start: nf.format(startItem),
            end: nf.format(endItem),
            total: nf.format(total)
          })}
        </p>

        {showPageSize && (
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="page-size" className="text-slate-600 dark:text-slate-300">
              {t('pagination.itemsPerPage')}
            </label>
            <select
              id="page-size"
              className="h-9 rounded-md border border-blue-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/60 dark:border-blue-700 dark:bg-slate-900"
              value={perPage}
              onChange={(e) => onPageSizeChange?.(parseInt(e.target.value, 10))}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {nf.format(opt)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Contrôles */}
      <div className="flex items-center gap-2">
        {showFirstLast && (
          <button
            type="button"
            aria-label={t('pagination.firstPage')}
            className={`${btnBase} ${btnGhost}`}
            disabled={!canPrev}
            onClick={() => go(1)}
          >
            <FontAwesomeIcon icon={faAngleDoubleLeft} />
          </button>
        )}

        <button
          type="button"
          aria-label={t('pagination.previousPage')}
          className={`${btnBase} ${btnGhost}`}
          disabled={!canPrev}
          onClick={() => go(current - 1)}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>

        {/* Pages numériques (compact sur mobile) */}
        <ul className="hidden sm:flex items-center gap-1" aria-label={t('pagination.pages')}>
          {pageItems.map((item, idx) => {
            if (item === "ellipsis") {
              return (
                <li key={`el-${idx}`} className="px-2 text-blue-400/80 select-none">…</li>
              );
            }
            const isActive = item === current;
            return (
              <li key={item}>
                <button
                  type="button"
                  aria-label={t('pagination.goToPage', { page: item })}
                  aria-current={isActive ? "page" : undefined}
                  className={`${btnBase} ${isActive ? btnSolid : btnGhost}`}
                  onClick={() => go(item)}
                >
                  {nf.format(item)}
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          aria-label={t('pagination.nextPage')}
          className={`${btnBase} ${btnGhost}`}
          disabled={!canNext}
          onClick={() => go(current + 1)}
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>

        {showFirstLast && (
          <button
            type="button"
            aria-label={t('pagination.lastPage')}
            className={`${btnBase} ${btnGhost}`}
            disabled={!canNext}
            onClick={() => go(pages)}
          >
            <FontAwesomeIcon icon={faAngleDoubleRight} />
          </button>
        )}

        {showJump && (
          <div className="ml-1 flex items-center gap-2">
            <label htmlFor="jump" className="sr-only">
              {t('pagination.jumpToPage')}
            </label>
            <input
              id="jump"
              type="number"
              inputMode="numeric"
              min={1}
              max={pages}
              value={jump}
              onChange={(e) => setJump(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = parseInt(jump, 10);
                  if (!Number.isNaN(val)) go(val);
                  setJump("");
                }
              }}
              placeholder={t('pagination.jumpPlaceholder')}
              className="h-9 w-24 rounded-md border border-blue-200 bg-white px-3 text-sm placeholder:text-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-400/60 dark:border-blue-700 dark:bg-slate-900"
            />
          </div>
        )}
      </div>
    </nav>
  );
}