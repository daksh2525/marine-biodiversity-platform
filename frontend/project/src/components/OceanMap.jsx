import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getMapData } from "../services/api";

const COLOR_MAP = { High: "#2e7d32", Medium: "#f57f17", Low: "#c62828" };

// Recenter helper
function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => { if (lat && lng) map.flyTo([lat, lng], 7, { duration: 1 }); }, [lat, lng]);
  return null;
}

export default function OceanMap({ prediction, inputLatLng }) {
  const [points, setPoints] = useState([]);

  useEffect(() => {
    getMapData().then((d) => setPoints(d.data || [])).catch(console.error);
  }, []);

  return (
    <div className="map-wrapper">
      <h2>Indian EEZ — Fish Abundance Map</h2>
      <div className="map-legend">
        {Object.entries(COLOR_MAP).map(([k, v]) => (
          <span key={k}><span className="dot" style={{ background: v }} /> {k}</span>
        ))}
      </div>
      <MapContainer
        center={[15, 80]} zoom={5}
        style={{ height: "420px", borderRadius: "12px" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />
        {inputLatLng && <Recenter lat={inputLatLng[0]} lng={inputLatLng[1]} />}

        {/* Dataset scatter points */}
        {points.map((p, i) => (
          <CircleMarker
            key={i}
            center={[p.latitude, p.longitude]}
            radius={5}
            pathOptions={{ color: COLOR_MAP[p.category], fillOpacity: 0.75, weight: 0 }}
          >
            <Popup>
              <b>{p.category} Abundance</b><br />
              {p.fish_abundance.toFixed(1)} kg/km²<br />
              SST: {p.temperature}°C &nbsp;|&nbsp; Chl: {p.chlorophyll} mg/m³<br />
              Month: {p.month}
            </Popup>
          </CircleMarker>
        ))}

        {/* Latest prediction marker */}
        {prediction && inputLatLng && (
          <CircleMarker
            center={inputLatLng}
            radius={14}
            pathOptions={{ color: "#fff", fillColor: prediction.color, fillOpacity: 1, weight: 3 }}
          >
            <Popup>
              <b>Your Prediction</b><br />
              {prediction.fish_abundance_kg_km2} kg/km²<br />
              {prediction.category} Abundance
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}