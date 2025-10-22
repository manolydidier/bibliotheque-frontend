// GeoJsonPreview.jsx
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// src = URL d'un .geojson (même origine ou CORS correct)
export default function GeoJsonPreview({ src, title }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!mapRef.current || !src) return;

    // init
    mapObj.current = L.map(mapRef.current, { zoomControl: true }).setView([0, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(mapObj.current);

    // load GeoJSON
    (async () => {
      try {
        const res = await fetch(src, { credentials: "omit" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const layer = L.geoJSON(data, {
          style: {
            color: "#2563eb",
            weight: 2,
            fillColor: "#3b82f6",
            fillOpacity: 0.15,
          },
        }).addTo(mapObj.current);
        const b = layer.getBounds();
        if (b.isValid()) mapObj.current.fitBounds(b, { padding: [20, 20] });
      } catch (e) {
        setError(`Impossible de charger le GeoJSON (${e.message || e})`);
        // eslint-disable-next-line no-console
        console.warn("GeoJSON load error:", e);
      }
    })();

    return () => { mapObj.current && mapObj.current.remove(); };
  }, [src]);

  if (!src) return <div className="text-sm text-slate-500">Aucun GeoJSON.</div>;

  return (
    <div className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white">
      <div className="px-4 py-2 border-b text-slate-700">
        {title || "GeoJSON"}
        {error && <span className="ml-3 text-xs text-red-500">{error}</span>}
      </div>
      <div ref={mapRef} className="w-full h-[calc(75vh-40px)]" />
    </div>
  );
}
