const INDIAN_OCEAN_ZONES = {
  "Arabian Sea — Mumbai Coast": {
    temp: 28, salinity: 36, oxygen: 6.5,
    chlorophyll: 1.2, ph: 8.1, nitrate: 3,
    depth: 200, fishAbundanceIndex: 72, biodiversityIndex: 68,
    dissolved_o2: 6.5, fish_index: 72, biodiversity: 68,
    lat: 18.9, lng: 72.8, zoom: 7,
    description: "High fish zone — Mackerel, Sardine season",
    healthLevel: "Healthy",
  },
  "Bay of Bengal — Chennai Coast": {
    temp: 29, salinity: 32, oxygen: 6.8,
    chlorophyll: 1.8, ph: 8.0, nitrate: 5,
    depth: 150, fishAbundanceIndex: 65, biodiversityIndex: 70,
    dissolved_o2: 6.8, fish_index: 65, biodiversity: 70,
    lat: 13.0, lng: 80.2, zoom: 7,
    description: "Moderate zone — Tuna, Pomfret active",
    healthLevel: "Moderate",
  },
  "Lakshadweep Waters": {
    temp: 27, salinity: 35, oxygen: 7.1,
    chlorophyll: 0.8, ph: 8.2, nitrate: 2,
    depth: 100, fishAbundanceIndex: 80, biodiversityIndex: 85,
    dissolved_o2: 7.1, fish_index: 80, biodiversity: 85,
    lat: 10.5, lng: 72.6, zoom: 8,
    description: "High biodiversity — Coral reef zone",
    healthLevel: "Healthy",
  },
  "Andaman Sea": {
    temp: 30, salinity: 33, oxygen: 6.2,
    chlorophyll: 2.1, ph: 7.9, nitrate: 7,
    depth: 250, fishAbundanceIndex: 58, biodiversityIndex: 75,
    dissolved_o2: 6.2, fish_index: 58, biodiversity: 75,
    lat: 11.7, lng: 92.7, zoom: 7,
    description: "Deep water zone — Tuna, Shark present",
    healthLevel: "Moderate",
  },
  "Gulf of Mannar": {
    temp: 29, salinity: 34, oxygen: 6.9,
    chlorophyll: 1.5, ph: 8.1, nitrate: 4,
    depth: 80, fishAbundanceIndex: 70, biodiversityIndex: 78,
    dissolved_o2: 6.9, fish_index: 70, biodiversity: 78,
    lat: 9.1, lng: 79.0, zoom: 8,
    description: "Marine sanctuary — Protected species",
    healthLevel: "Healthy",
  },
  "Kerala Backwaters Coast": {
    temp: 28, salinity: 30, oxygen: 6.0,
    chlorophyll: 2.5, ph: 7.8, nitrate: 8,
    depth: 50, fishAbundanceIndex: 62, biodiversityIndex: 65,
    dissolved_o2: 6.0, fish_index: 62, biodiversity: 65,
    lat: 9.9, lng: 76.2, zoom: 8,
    description: "Coastal zone — Sardine, Anchovy heavy",
    healthLevel: "Moderate",
  },
  "Sundarbans — Bay of Bengal": {
    temp: 28, salinity: 25, oxygen: 5.8,
    chlorophyll: 3.0, ph: 7.7, nitrate: 10,
    depth: 30, fishAbundanceIndex: 55, biodiversityIndex: 80,
    dissolved_o2: 5.8, fish_index: 55, biodiversity: 80,
    lat: 21.9, lng: 89.1, zoom: 8,
    description: "Mangrove delta zone — Hilsa, Prawn",
    healthLevel: "Moderate",
  },
};

export default INDIAN_OCEAN_ZONES;

export const ZONE_HEALTH_COLOR = {
  Healthy:  "#2e7d32",
  Moderate: "#f57f17",
  Critical: "#c62828",
};