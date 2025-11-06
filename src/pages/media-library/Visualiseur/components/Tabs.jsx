import React from "react";

export default function Tabs({ list = [], active, onChange }) {
  const activeIndex = list.indexOf(active);
  
  return (
    <div 
      className="relative bg-white/80 backdrop-blur-md border border-white/50 rounded-xl mb-5  p-1 inline-flex shadow-sm"
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Knob glass */}
      <div
        className="absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-out"
        style={{
          width: `calc(100% / ${list.length} - 2px)`,
          left: `calc(${activeIndex * (100 / list.length)}% + 1px)`,
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}
      />
      
      {/* Options */}
      <div className="relative z-10 flex">
        {list.map((tab) => (
          <button
            key={tab}
            onClick={() => onChange?.(tab)}
            className={`text-sm px-6 py-2.5 font-medium transition-all duration-200 rounded whitespace-nowrap flex items-center justify-center ${
              active === tab
                ? "text-blue-600 font-semibold"
                : "text-gray-600 hover:text-gray-800"
            }`}
            style={{
              width: `${100 / list.length}%`
            }}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}