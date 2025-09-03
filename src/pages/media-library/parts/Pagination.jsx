// ------------------------------
// File: media-library/parts/Pagination.jsx
// ------------------------------
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

export default function Pagination({ page, perPage, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const canPrev = page > 1;
  const canNext = page < pages;
  const go = (p) => onChange(Math.min(Math.max(1, p), pages));
  const start = (page - 1) * perPage + 1;
  const end = Math.min(total, page * perPage);
  return (
    <div className="flex items-center justify-between py-4">
      <p className="text-sm text-slate-600">
        Affichage <b>{start}</b>–<b>{end}</b> sur <b>{total}</b>
      </p>
      <div className="flex items-center gap-2">
        <button className="px-2 py-1.5 border rounded-md" disabled={!canPrev} onClick={() => go(page - 1)}>
          <FaChevronLeft />
        </button>
        <span className="text-sm">Page {page} / {pages}</span>
        <button className="px-2 py-1.5 border rounded-md" disabled={!canNext} onClick={() => go(page + 1)}>
          <FaChevronRight />
        </button>
      </div>
    </div>
  );
}
