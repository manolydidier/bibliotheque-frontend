import React from "react";
import { FaChartBar } from "react-icons/fa";

export function KpiCard({ label, value, suffix, icon, color = "blue" }) {
  const colorClasses = {
    blue: "from-blue-50/80 to-blue-100/60 text-blue-600 border-blue-100/60",
    green: "from-emerald-50/80 to-emerald-100/60 text-emerald-600 border-emerald-100/60",
    yellow: "from-yellow-50/80 to-yellow-100/60 text-yellow-600 border-yellow-100/60",
    orange: "from-orange-50/80 to-orange-100/60 text-orange-600 border-orange-100/60",
    indigo: "from-indigo-50/80 to-indigo-100/60 text-indigo-600 border-indigo-100/60",
  };
  const gradientClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-emerald-600",
    yellow: "from-yellow-500 to-yellow-600",
    orange: "from-orange-500 to-orange-600",
    indigo: "from-indigo-500 to-indigo-600",
  };

  return (
    <div className={`relative group rounded-2xl border bg-gradient-to-br ${colorClasses[color]} backdrop-blur-sm p-6 sm:p-7 lg:p-8 transition-all duration-500 hover:shadow-xl hover:-translate-y-2 hover:scale-[1.02]`}>
      <div className={`absolute top-0 left-6 lg:left-8 h-1 w-16 bg-gradient-to-r ${gradientClasses[color]} rounded-b-full`} />
      <div className="flex items-start justify-between mb-4 lg:mb-6">
        <div className="text-xs font-medium text-slate-600 uppercase tracking-wider">{label}</div>
        {icon && <div className="opacity-40 group-hover:opacity-60 transition-opacity duration-500">{icon}</div>}
      </div>
      <div className="text-2xl lg:text-3xl font-light text-slate-800 tracking-tight">
        {value ?? "—"}{suffix && <span className="text-base lg:text-xl text-slate-500 ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

export function ChartCard({ title, subtitle, children, icon }) {
  return (
    <div className="group rounded-3xl border border-white/60 bg-white/50 backdrop-blur-xl p-6 sm:p-8 lg:p-10 shadow-xl hover:shadow-2xl transition-all duration-700 hover:-translate-y-2">
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <div>
          <h3 className="text-xl lg:2xl font-light text-slate-800 mb-2 flex items-center gap-4">
            {icon && <span className="text-slate-400 group-hover:text-slate-600 transition-colors duration-500">{icon}</span>}
            {title}
          </h3>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-6 lg:mb-8" />
      <div className="relative">{children}</div>
    </div>
  );
}

export function EmptyChart({ message = "Pas assez de données pour ce graphique" }) {
  return (
    <div className="h-64 md:h-72 xl:h-80 2xl:h-[28rem] flex flex-col items-center justify-center text-slate-400">
      <div className="w-16 h-16 rounded-full bg-slate-100/80 flex items-center justify-center mb-4">
        <FaChartBar className="text-2xl" />
      </div>
      <p className="text-sm text-center max-w-xs leading-relaxed">{message}</p>
    </div>
  );
}
