// ------------------------------
// File: media-library/shared/atoms/atoms.jsx
// ------------------------------
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { cls } from "../utils/format";

export const Badge = ({ children, color = "slate" }) => (
  <span className={cls(
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
    color === "green" && "bg-green-100 text-green-800",
    color === "red" && "bg-red-100 text-red-800",
    color === "yellow" && "bg-yellow-100 text-yellow-800",
    color === "blue" && "bg-blue-100 text-blue-800",
    color === "violet" && "bg-violet-100 text-violet-800",
    color === "slate" && "bg-slate-100 text-slate-800"
  )}>{children}</span>
);

export const Pill = ({ active, children, onClick }) => (
  <button onClick={onClick} className={cls("px-3 py-1.5 rounded-full text-sm border transition", active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")}>{children}</button>
);

export const Toggle = ({ on, setOn, labels = ["Non", "Oui"] }) => (
  <button onClick={() => setOn(!on)} className={cls("w-16 h-8 rounded-full border flex items-center p-1 transition", on ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300")} aria-pressed={on}>
    <span className={cls("w-6 h-6 rounded-full bg-white shadow transition", on ? "translate-x-8" : "translate-x-0")} />
    <span className={cls("ml-2 text-xs font-medium", on ? "text-white" : "text-slate-600")}>{on ? labels[1] : labels[0]}</span>
  </button>
);

export const SortIcon = ({ state }) => {
  if (!state) return <FaSort className="inline" />;
  if (state === "asc") return <FaSortUp className="inline" />;
  return <FaSortDown className="inline" />;
};

const TYPE_COLORS = {
  image: "bg-rose-50 text-rose-600",
  video: "bg-purple-50 text-purple-600",
  audio: "bg-sky-50 text-sky-600",
  pdf: "bg-red-50 text-red-600",
  word: "bg-blue-50 text-blue-600",
  excel: "bg-green-50 text-green-600",
  archive: "bg-amber-50 text-amber-600",
  other: "bg-slate-50 text-slate-500",
};
export const TypeBadge = ({ type }) => (
  <span className={cls("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", TYPE_COLORS[type] || TYPE_COLORS.other)}>
    {String(type).toUpperCase()}
  </span>
);
export const FileGlyph = ({ type }) => (
  <div className={(TYPE_COLORS[type] || TYPE_COLORS.other) + " w-16 h-16 rounded-xl flex items-center justify-center text-4xl"}>📄</div>
);
