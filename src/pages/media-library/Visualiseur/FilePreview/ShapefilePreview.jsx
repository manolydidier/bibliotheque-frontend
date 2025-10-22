// src/media-library/parts/Visualiseur/FilePreview/ShapefilePreviewPro.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import shp from "shpjs";
import { ensureCorsSafe, fetchJsonWithFallback } from "@/utils/fileFetch";

function prettyProps(props = {}) {
  const entries = Object.entries(props);
  if (!entries.length) return "<em>Aucun attribut</em>";
  return `<table style="font-size:12px;line-height:1.4">
    ${entries.map(([k, v]) => `<tr><td style="color:#64748b;padding-right:8px">${k}</td><td><strong>${String(v)}</strong></td></tr>`).join("")}
  </table>`;
}

export default function ShapefilePreviewPro({ src, title = "Shapefile / GeoJSON" }) {
  const mapRef = useRef(null);
  const map = useRef(null);
  const layerRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const safeUrl = useMemo(() => ensureCorsSafe(src), [src]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!map.current) {
      map.current = L.map(mapRef.current, {
        zoomControl: true,
        preferCanvas: true, // meilleures perfs
      }).setView([20, 0], 2);

      const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 20,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map.current);

      const toner = L.tileLayer("https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png", {
        maxZoom: 20,
        attribution: "&copy; Stamen",
      });

      L.control.layers({ OSM: osm, Toner: toner }, {}, { collapsed: true }).addTo(map.current);
      L.control.scale({ metric: true, imperial: false }).addTo(map.current);
    }
  }, []);

  useEffect(() => {
    if (!map.current || !safeUrl) return;
    setErr(""); setBusy(true);

    (async () => {
      try {
        // détermine selon extension
        const low = safeUrl.toLowerCase();
        let geojson;
        if (low.endsWith(".zip") || low.includes(".shp") || low.includes(".dbf")) {
          geojson = await shp(safeUrl);
        } else {
          // .geojson ou .json
          geojson = await fetchJsonWithFallback(safeUrl, { timeoutMs: 60000 });
        }

        // geojson peut être un FeatureCollection ou un objet multi-couches
        let collection;
        if (geojson && geojson.type === "FeatureCollection") {
          collection = geojson;
        } else if (geojson && typeof geojson === "object") {
          // shpjs peut renvoyer { layerName: FeatureCollection, ... }
          const first = Object.values(geojson).find(g => g && g.type === "FeatureCollection");
          collection = first || geojson;
        }

        if (!collection || collection.type !== "FeatureCollection") {
          throw new Error("GeoJSON non valide");
        }

        // retire couche précédente
        if (layerRef.current) {
          map.current.removeLayer(layerRef.current);
          layerRef.current = null;
        }

        // style
        const style = {
          color: "#2563eb",
          weight: 2,
          opacity: 0.9,
          fillColor: "#93c5fd",
          fillOpacity: 0.3,
        };

        layerRef.current = L.geoJSON(collection, {
          style: (feat) => style,
          pointToLayer: (feat, latlng) => L.circleMarker(latlng, {
            radius: 5, color: "#ef4444", weight: 2, fillColor: "#fecaca", fillOpacity: 0.6
          }),
          onEachFeature: (feature, layer) => {
            layer.bindPopup(prettyProps(feature.properties || {}), { maxWidth: 320 });
          }
        }).addTo(map.current);

        const b = layerRef.current.getBounds();
        if (b.isValid()) {
          map.current.fitBounds(b, { padding: [20, 20] });
        } else {
          map.current.setView([0, 0], 2);
        }
      } catch (e) {
        setErr(e?.message || String(e));
      } finally {
        setBusy(false);
      }
    })();

    // cleanup à chaque changement de fichier
    return () => {
      if (layerRef.current && map.current) {
        map.current.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [safeUrl]);

  return (
    <div className="w-full h-[75vh] rounded-2xl overflow-hidden border border-slate-200/40 bg-white">
      <div className="px-4 py-2 border-b text-slate-700 flex items-center justify-between">
        <span>{title}</span>
        {busy && <span className="text-xs text-slate-500">Chargement…</span>}
      </div>
      {err ? (
        <div className="p-4 text-sm text-red-600">{err}</div>
      ) : (
        <div ref={mapRef} className="w-full h-[calc(75vh-40px)]" />
      )}
    </div>
  );
}
