import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useTranslation, Trans } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faAngleDoubleLeft,
  faAngleDoubleRight,
} from "@fortawesome/free-solid-svg-icons";

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
  const jumpInputRef = useRef(null);

  const pages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / Math.max(1, perPage))),
    [total, perPage]
  );

  const current = useMemo(
    () => Math.min(Math.max(1, page), pages),
    [page, pages]
  );

  const canPrev = current > 1;
  const canNext = current < pages;

  const go = useCallback(
    (p) => {
      const next = Math.min(Math.max(1, p), pages);
      if (next !== current && onChange) {
        onChange(next);
      }
    },
    [current, pages, onChange]
  );

  const pageItems = useMemo(() => {
    if (pages <= 1) return [1];

    const range = (start, end) =>
      Array.from({ length: end - start + 1 }, (_, i) => start + i);

    const maxVisiblePages = boundaryCount * 2 + siblingCount * 2 + 3;
    if (pages <= maxVisiblePages) {
      return range(1, pages);
    }

    const startPages = range(1, Math.min(boundaryCount, pages));
    const endPages = range(
      Math.max(pages - boundaryCount + 1, boundaryCount + 1),
      pages
    );

    const siblingsStart = Math.max(
      Math.min(
        current - siblingCount,
        pages - boundaryCount - siblingCount * 2 - 1
      ),
      boundaryCount + 2
    );

    const siblingsEnd = Math.min(
      Math.max(
        current + siblingCount,
        boundaryCount + siblingCount * 2 + 2
      ),
      pages - boundaryCount - 1
    );

    const items = [
      ...startPages,
      siblingsStart > boundaryCount + 2 ? "ellipsis-start" : null,
      ...range(siblingsStart, siblingsEnd),
      siblingsEnd < pages - boundaryCount - 1 ? "ellipsis-end" : null,
      ...endPages,
    ].filter(Boolean);

    return items;
  }, [pages, current, siblingCount, boundaryCount]);

  const displayInfo = useMemo(() => {
    const hasItems = total > 0;
    return {
      hasItems,
      start: hasItems ? (current - 1) * perPage + 1 : 0,
      end: hasItems ? Math.min(total, current * perPage) : 0,
    };
  }, [total, current, perPage]);

  const [jump, setJump] = useState("");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;

      if (e.key === "ArrowLeft" && canPrev) {
        e.preventDefault();
        go(current - 1);
      } else if (e.key === "ArrowRight" && canNext) {
        e.preventDefault();
        go(current + 1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [canPrev, canNext, current, go]);

  const nf = useMemo(
    () => new Intl.NumberFormat(i18n.language),
    [i18n.language]
  );

  const handleJumpSubmit = useCallback(() => {
    const val = parseInt(jump, 10);
    if (!Number.isNaN(val) && val >= 1 && val <= pages) {
      go(val);
      setJump("");
      jumpInputRef.current?.blur();
    }
  }, [jump, pages, go]);

  const handlePageSizeChange = useCallback(
    (e) => {
      const newSize = parseInt(e.target.value, 10);
      if (onPageSizeChange) {
        onPageSizeChange(newSize);
      }
    },
    [onPageSizeChange]
  );

  if (pages <= 1) return null;

  const btnBase =
    "inline-flex items-center justify-center h-8 sm:h-9 min-w-8 sm:min-w-9 px-3 " +
    "rounded-full border text-xs sm:text-sm font-medium transition-colors " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 " +
    "focus-visible:ring-offset-1 focus-visible:ring-offset-slate-50 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

  const btnGhost =
    "bg-white border-slate-200 text-slate-600 " +
    "hover:bg-slate-50 hover:border-sky-200 hover:text-sky-700 " +
    "active:bg-slate-100";

  const btnSolid =
    "bg-sky-100 border-sky-200 text-sky-700 font-semibold " +
    "hover:bg-sky-200 hover:border-sky-300";

  return (
    <nav
      role="navigation"
      aria-label={t("pagination.navigation")}
      className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      {/* Section d'information */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Info affichage */}
        <div
          className="text-xs sm:text-sm text-slate-600"
          role="status"
          aria-live="polite"
        >
          <Trans
            i18nKey="pagination.showing"
            components={{
              strong: <span className="font-semibold text-slate-900" />,
            }}
            values={{
              start: nf.format(displayInfo.start),
              end: nf.format(displayInfo.end),
              total: nf.format(total),
            }}
          />
        </div>

        {/* Sélecteur de taille de page */}
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="page-size-select"
              className="text-xs sm:text-sm text-slate-600 whitespace-nowrap"
            >
              {t("pagination.itemsPerPage")}
            </label>
            <select
              id="page-size-select"
              value={perPage}
              onChange={handlePageSizeChange}
              className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-300/70 focus:border-sky-300"
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

      {/* Section de contrôles */}
      <div className="flex flex-wrap items-center gap-2">
        {showFirstLast && (
          <button
            type="button"
            onClick={() => go(1)}
            disabled={!canPrev}
            aria-label={t("pagination.firstPage")}
            className={`${btnBase} ${btnGhost}`}
          >
            <FontAwesomeIcon icon={faAngleDoubleLeft} className="text-sm" />
          </button>
        )}

        <button
          type="button"
          onClick={() => go(current - 1)}
          disabled={!canPrev}
          aria-label={t("pagination.previousPage")}
          className={`${btnBase} ${btnGhost}`}
        >
          <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
        </button>

        <div className="flex items-center gap-1" role="list">
          {pageItems.map((item, idx) => {
            if (typeof item === "string" && item.startsWith("ellipsis")) {
              return (
                <div
                  key={`${item}-${idx}`}
                  className="flex h-8 sm:h-9 min-w-8 sm:min-w-9 items-center justify-center text-slate-400"
                  role="presentation"
                  aria-hidden="true"
                >
                  …
                </div>
              );
            }

            const isActive = item === current;
            return (
              <button
                key={item}
                type="button"
                onClick={() => go(item)}
                disabled={isActive}
                aria-label={t("pagination.pageNumber", { number: item })}
                aria-current={isActive ? "page" : undefined}
                className={`${btnBase} ${isActive ? btnSolid : btnGhost}`}
              >
                {nf.format(item)}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => go(current + 1)}
          disabled={!canNext}
          aria-label={t("pagination.nextPage")}
          className={`${btnBase} ${btnGhost}`}
        >
          <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
        </button>

        {showFirstLast && (
          <button
            type="button"
            onClick={() => go(pages)}
            disabled={!canNext}
            aria-label={t("pagination.lastPage")}
            className={`${btnBase} ${btnGhost}`}
          >
            <FontAwesomeIcon icon={faAngleDoubleRight} className="text-sm" />
          </button>
        )}

        {showJump && (
          <div className="flex items-center gap-2 ml-2">
            <label
              htmlFor="jump-to-page"
              className="text-xs sm:text-sm text-slate-600 whitespace-nowrap"
            >
              {t("pagination.jumpToPage")}
            </label>
            <input
              ref={jumpInputRef}
              id="jump-to-page"
              type="number"
              min="1"
              max={pages}
              value={jump}
              onChange={(e) => setJump(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleJumpSubmit();
                }
              }}
              placeholder={t("pagination.jumpPlaceholder")}
              aria-label={t("pagination.jumpToPageAria")}
              className="h-8 sm:h-9 w-20 sm:w-24 rounded-full border border-slate-200 bg-slate-50 px-3 text-xs sm:text-sm text-slate-700 text-center placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300/70 focus:border-sky-300 focus:bg-white"
            />
          </div>
        )}
      </div>
    </nav>
  );
}
