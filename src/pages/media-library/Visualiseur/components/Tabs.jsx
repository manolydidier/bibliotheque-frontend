import React from "react";

export default function Tabs({ list = [], active, onChange }) {
  return (
    <div className="flex border-b border-slate-200/30 mb-6 sm:mb-8 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
      {list.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange?.(tab)}
          className={`px-4 sm:px-6 py-3 sm:py-4 font-medium whitespace-nowrap transition-all duration-300 border-b-2 ${
            active === tab
              ? "text-blue-600 border-blue-500"
              : "text-slate-600 border-transparent hover:text-blue-600 hover:border-blue-300"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
