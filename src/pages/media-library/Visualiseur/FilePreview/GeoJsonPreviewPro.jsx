// src/media-library/parts/Visualiseur/FilePreview/GeoJsonPreviewPro.jsx
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ensureCorsSafe, fetchJsonWithFallback } from "@/utils/fileFetch";

export default function GeoJsonPreviewPro({ src, title = "Carte GeoJSON" }) {
  const mapRef = useRef(null);
  const map = useRef(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setErr("");

    if (!map.current && mapRef.current) {
      map.current = L.map(mapRef.current, { zoomControl: true }).setView([0, 0], 2);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map.current);
    }

    (async () => {
      try {
        const safe = ensureCorsSafe(src);
        const data = await fetchJsonWithFallback(safe, { timeoutMs: 60000 });
        if (cancelled || !map.current) return;

        // clear old layers (except base)
        map.current.eachLayer((layer) => {
          if (!(layer instanceof L.TileLayer)) map.current.removeLayer(layer);
        });

        const layer = L.geoJSON(data, {
          style: { color: "#2563eb", weight: 2, opacity: 0.8 },
          onEachFeature: (feature, l) => {
            const props = feature?.properties || {};
            const lines = Object.entries(props).slice(0, 10).map(([k, v]) => `<div><b>${k}</b>: ${String(v)}</div>`);
            if (lines.length) l.bindPopup(lines.join(""));
          },
        }).addTo(map.current);

        try {
          map.current.fitBounds(layer.getBounds(), { padding: [20, 20] });
        } catch {
          map.current.setView([0, 0], 2);
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message || String(e));
      }
    })();

    return () => { cancelled = true; };
  }, [src]);

  return (
    <div className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white">
      <div className="px-4 py-2 border-b text-slate-700">{title}</div>
      {err ? (
        <div className="p-4 text-sm text-red-600">Erreur GeoJSON : {err}</div>
      ) : (
        <div ref={mapRef} className="w-full h-[calc(75vh-40px)]" />
      )}
    </div>
  );
}
