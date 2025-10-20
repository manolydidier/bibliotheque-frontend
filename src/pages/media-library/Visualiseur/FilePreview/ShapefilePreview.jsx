// ShapefilePreview.jsx
import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import shp from "shpjs";

// src = URL d'un .zip contenant .shp/.shx/.dbf (CORS requis)
export default function ShapefilePreview({ src, title }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // init
    mapObj.current = L.map(mapRef.current, { zoomControl: true }).setView([0, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(mapObj.current);

    (async () => {
      try {
        const geojson = await shp(src);
        const layer = L.geoJSON(geojson).addTo(mapObj.current);
        mapObj.current.fitBounds(layer.getBounds(), { padding: [20, 20] });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Shapefile load error:", e);
      }
    })();

    return () => { mapObj.current && mapObj.current.remove(); };
  }, [src]);

  if (!src) return <div className="text-sm text-slate-500">Aucun shapefile.</div>;

  return (
    <div className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white">
      <div className="px-4 py-2 border-b text-slate-700">{title || "Shapefile"}</div>
      <div ref={mapRef} className="w-full h-[calc(75vh-40px)]" />
    </div>
  );
}
