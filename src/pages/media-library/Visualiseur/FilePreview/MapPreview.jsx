import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/map/leaflet-icons-fix';
import shp from 'shpjs';

// Utilitaire: charger GeoJSON depuis une URL (ou un ArrayBuffer shapefile)
async function loadGeoData({ url, arrayBuffer }) {
  if (arrayBuffer) return await shp(arrayBuffer);               // .zip shapefile -> GeoJSON
  const res = await fetch(url);
  const isJson = /json|geojson/i.test(res.headers.get('content-type') || '') || url.endsWith('.geojson');
  return isJson ? await res.json() : null;
}

function FitBounds({ data }) {
  const map = useMap();
  useEffect(() => {
    if (!data) return;
    try {
      const layer = L.geoJSON(data);
      const b = layer.getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [20, 20] });
    } catch {}
  }, [data, map]);
  return null;
}

/**
 * props:
 * - center: [lat, lng] par défaut
 * - zoom:   number par défaut
 * - dataUrl: URL vers GeoJSON OU .zip shapefile
 * - marker: { position:[lat,lng], popup?:string }
 */
export default function MapPreview({ center = [0,0], zoom = 2, dataUrl, marker }) {
  const [geo, setGeo] = React.useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!dataUrl) return;
      try {
        const data = await loadGeoData({ url: dataUrl });
        if (mounted) setGeo(data || null);
      } catch { if (mounted) setGeo(null); }
    })();
    return () => { mounted = false; };
  }, [dataUrl]);

  const hasData = !!geo;

  return (
    <div className="w-full">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '60vh', borderRadius: 16 }}
        scrollWheelZoom
      >
        <TileLayer
          // OSM libre
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OSM</a> contributors'
          maxZoom={19}
        />
        {hasData && <GeoJSON data={geo} style={{ color: '#2563eb', weight: 2 }} />}
        {hasData && <FitBounds data={geo} />}

        {marker?.position && (
          <Marker position={marker.position}>
            {marker.popup && <Popup>{marker.popup}</Popup>}
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
