// src/components/DateTimeInput.jsx
import React, { useMemo, forwardRef } from "react";
import DatePicker from "react-datepicker";
import { FiCalendar, FiX } from "react-icons/fi";
import "react-datepicker/dist/react-datepicker.css";

// ton helper existant
const RE_SQL = /^\d{4}-\d{2}-\d{2}(?:[ T])\d{2}:\d{2}:\d{2}$/;

function toDate(val) {
  if (!val) return null;
  if (typeof val === "string" && RE_SQL.test(val)) {
    return new Date(val.replace(" ", "T"));
  }
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad2 = (n) => String(n).padStart(2, "0");

function toSqlDateTime(date) {
  if (!date) return "";
  const yyyy = date.getFullYear();
  const MM = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
}

/**
 * Input custom "glass / liquid" pour react-datepicker
 */
const GlassInput = forwardRef(
  ({ value, onClick, placeholder, onClear }, ref) => {
    return (
      <div className="relative group">
        {/* Fond glassmorphism */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/80 via-slate-50/60 to-blue-50/40 border border-slate-200/70 shadow-sm shadow-slate-200/80 backdrop-blur-xl group-hover:shadow-md group-hover:border-blue-300 transition-all duration-200" />
        
        <div className="relative flex items-center">
          {/* Icône calendrier */}
          <span className="pl-3 pr-2 text-slate-400">
            <FiCalendar className="w-4 h-4" />
          </span>

          {/* Champ texte */}
          <input
            ref={ref}
            readOnly
            onClick={onClick}
            value={value || ""}
            placeholder={placeholder}
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400 py-2.5 pr-10"
          />

          {/* Bouton clear */}
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear?.();
              }}
              className="absolute right-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/80 text-slate-400 hover:bg-red-50 hover:text-red-500 border border-slate-200 text-xs"
            >
              <FiX className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

GlassInput.displayName = "GlassInput";

const DateTimeInput = ({
  value,          // string SQL ou null
  onChange,       // reçoit string SQL ou null
  className = "",
  placeholder = "Choisir une date et une heure…",
}) => {
  const selected = useMemo(() => toDate(value), [value]);

  return (
    <div className={`relative z-[100000] ${className}`}>
      <DatePicker
        selected={selected}
        // convertit la valeur vers SQL
        onChange={(d) => {
          if (!d) {
            onChange?.(null);
          } else {
            onChange?.(toSqlDateTime(d));
          }
        }}
        showTimeSelect
        dateFormat="dd/MM/yyyy HH:mm"
        timeFormat="HH:mm"
        timeIntervals={15}
        placeholderText={placeholder}
        // on utilise notre input "glass"
        customInput={
          <GlassInput
            placeholder={placeholder}
            onClear={() => onChange?.(null)}
          />
        }
        // options visuelles du popover
        popperClassName="z-[99999]"
        calendarClassName="rounded-2xl shadow-xl border border-slate-200/80 bg-white/95 backdrop-blur-xl overflow-hidden"
      />
    </div>
  );
};

export default DateTimeInput;
