import React, { useEffect, useState } from "react";
import { toast } from "./toast"; // Assure-toi que ce chemin est correct

export default function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toast._register((data) => {
      const id = Date.now();

      const toastData = {
        id,
        message: data.message || "",
        type: data.type || "success",
        duration: data.duration ?? 4000,
        position: data.position || "top-right",
        color: data.color || null,
        closable: data.closable ?? true,
        loading: data.type === "loading",
      };

      setToasts((prev) => [...prev, toastData]);

      if (toastData.duration !== null) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, toastData.duration);
      }
    });
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const positionClass = (pos) => {
    const base = "fixed z-50 space-y-3 p-4";
    const positions = {
      "top-left": "top-4 left-4",
      "top-right": "top-4 right-4",
      "bottom-left": "bottom-4 left-4",
      "bottom-right": "bottom-4 right-4",
      "top-center": "top-4 left-1/2 -translate-x-1/2",
      "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
    };
    return `${base} ${positions[pos] || positions["top-right"]}`;
  };

  const typeColors = {
    success: "bg-green-100 text-green-800 border-green-300",
    error: "bg-red-100 text-red-800 border-red-300",
    loading: "bg-blue-100 text-blue-800 border-blue-300",
  };

  return (
    <>
      {["top-left", "top-right", "bottom-left", "bottom-right", "top-center", "bottom-center"].map(
        (pos) => (
          <div key={pos} className={positionClass(pos)}>
            {toasts
              .filter((t) => t.position === pos)
              .map((t) => (
                <div
                  key={t.id}
                  className={`w-full max-w-xs flex items-start justify-between gap-2 px-4 py-3 border rounded-lg shadow transition-all duration-500 animate-slide-in opacity-90
                    ${t.color ? t.color : typeColors[t.type] || ""}`}
                >
                  <div className="flex items-center gap-2">
                    {t.loading && (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    )}
                    <span className="text-sm">{t.message}</span>
                  </div>

                  {t.closable && (
                    <button
                      onClick={() => removeToast(t.id)}
                      className="text-gray-500 hover:text-gray-700 ml-2 font-bold text-lg leading-none"
                      aria-label="Fermer"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
          </div>
        )
      )}
    </>
  );
}
