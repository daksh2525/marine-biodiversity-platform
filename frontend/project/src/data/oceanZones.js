// ── src/data/oceanZones.js ────────────────────────────────────────────────────
export const INDIAN_OCEAN_ZONES = {
  "Arabian Sea — Mumbai Coast": {
    temperature: 28, salinity: 36, oxygen: 6.5,
    chlorophyll: 1.2, ph: 8.1, nitrate: 3,
    depth: 200, fish_index: 65, biodiversity: 70,
    dissolved_o2: 6.5, lat: 18.9, lng: 72.8,
  },
  "Bay of Bengal — Chennai Coast": {
    temperature: 29, salinity: 32, oxygen: 6.8,
    chlorophyll: 1.8, ph: 8.0, nitrate: 5,
    depth: 150, fish_index: 60, biodiversity: 65,
    dissolved_o2: 6.8, lat: 13.0, lng: 80.2,
  },
  "Lakshadweep Waters": {
    temperature: 27, salinity: 35, oxygen: 7.1,
    chlorophyll: 0.8, ph: 8.2, nitrate: 2,
    depth: 100, fish_index: 75, biodiversity: 80,
    dissolved_o2: 7.1, lat: 10.5, lng: 72.6,
  },
  "Andaman Sea": {
    temperature: 30, salinity: 33, oxygen: 6.2,
    chlorophyll: 2.1, ph: 7.9, nitrate: 7,
    depth: 250, fish_index: 55, biodiversity: 72,
    dissolved_o2: 6.2, lat: 11.7, lng: 92.7,
  },
  "Gulf of Mannar": {
    temperature: 29, salinity: 34, oxygen: 6.9,
    chlorophyll: 1.5, ph: 8.1, nitrate: 4,
    depth: 80, fish_index: 70, biodiversity: 75,
    dissolved_o2: 6.9, lat: 9.1, lng: 79.0,
  },
  "Kerala Coast — Southwest": {
    temperature: 27, salinity: 34, oxygen: 6.7,
    chlorophyll: 1.3, ph: 8.1, nitrate: 3,
    depth: 120, fish_index: 68, biodiversity: 71,
    dissolved_o2: 6.7, lat: 10.1, lng: 76.2,
  },
};


// ── src/data/speciesDatabase.js ───────────────────────────────────────────────
// Extended species info for classes in the trained model
// Used by SpeciesIdentifier.jsx to fill missing info

export const SPECIES_DB = {
  // Kaggle dataset classes
  "Striped Red Mullet": {
    scientific_name: "Mullus surmuletus",
    common_name:     "Striped Red Mullet",
    habitat:         "Coastal sandy and muddy sea bottoms, 10–300m depth",
    conservation:    "Least Concern",
    description:     "Bottom-dwelling fish found in Indian Ocean coastal waters. Feeds on small invertebrates and worms buried in sediment. Important commercial species.",
  },
  "Hourse Mackerel": {
    scientific_name: "Trachurus trachurus",
    common_name:     "Horse Mackerel",
    habitat:         "Open ocean pelagic waters, coastal zones",
    conservation:    "Least Concern",
    description:     "Fast-swimming schooling fish important for Indian Ocean fisheries. Found in large shoals, feeds on small fish and zooplankton.",
  },
  "Black Sea Sprat": {
    scientific_name: "Sprattus sprattus",
    common_name:     "Sprat",
    habitat:         "Coastal pelagic, warm to temperate waters",
    conservation:    "Least Concern",
    description:     "Small schooling fish, important prey species and commercially harvested for fish meal.",
  },
  "Gilt-Head Bream": {
    scientific_name: "Sparus aurata",
    common_name:     "Gilt-Head Bream",
    habitat:         "Coastal waters, lagoons, estuaries, 0–150m",
    conservation:    "Least Concern",
    description:     "Highly valued food fish. Recognizable by the gold stripe between its eyes. Found in warm coastal Indian Ocean waters.",
  },
  "Red Mullet": {
    scientific_name: "Mullus barbatus",
    common_name:     "Red Mullet",
    habitat:         "Sandy and muddy sea beds, 10–200m depth",
    conservation:    "Least Concern",
    description:     "Bottom-dwelling fish with distinctive red coloration. Uses chin barbels to detect prey in sediment. Popular food fish.",
  },
  "Red Sea Bream": {
    scientific_name: "Pagrus major",
    common_name:     "Red Sea Bream",
    habitat:         "Coastal rocky and sandy bottoms, 10–200m",
    conservation:    "Least Concern",
    description:     "Popular food fish in Indian coastal waters. Prefers rocky reefs and hard substrates. Supports significant artisanal fisheries.",
  },
  "Sea Bass": {
    scientific_name: "Dicentrarchus labrax",
    common_name:     "European Sea Bass",
    habitat:         "Coastal waters, estuaries, rocky shores",
    conservation:    "Least Concern",
    description:     "Predatory fish found in Indian Ocean coastal zones. Highly prized by both commercial and recreational fishermen.",
  },
  "Trout": {
    scientific_name: "Oncorhynchus mykiss",
    common_name:     "Rainbow Trout",
    habitat:         "Cold freshwater streams and rivers, hill stations",
    conservation:    "Least Concern",
    description:     "Introduced salmonid species found in Indian hill streams (Kashmir, Himachal Pradesh). Supports trout farming industry in India.",
  },
  // Indian species
  "rohu": {
    scientific_name: "Labeo rohita",
    common_name:     "Rohu",
    habitat:         "Freshwater rivers and lakes",
    conservation:    "Least Concern",
    description:     "A large freshwater fish widely found in Indian rivers. Highly valued commercially and nutritionally. Major aquaculture species.",
  },
  "sardine": {
    scientific_name: "Sardinella longiceps",
    common_name:     "Indian Oil Sardine",
    habitat:         "Coastal pelagic, warm waters",
    conservation:    "Least Concern",
    description:     "Most commercially important fish along India's west coast. Harvested for direct consumption and fish meal/oil production.",
  },
  "seer_fish": {
    scientific_name: "Scomberomorus commerson",
    common_name:     "Seer Fish / King Fish",
    habitat:         "Coastal and offshore marine waters",
    conservation:    "Least Concern",
    description:     "One of the most prized marine food fish in India. Fast swimmer, highly valued in coastal fish markets.",
  },
  "snapper": {
    scientific_name: "Lutjanus campechanus",
    common_name:     "Red Snapper",
    habitat:         "Coral reefs and rocky shores",
    conservation:    "Vulnerable",
    description:     "A popular reef fish found in tropical Indian Ocean waters. Important for both commercial fishing and reef ecosystems.",
  },
  "indian_mackerel": {
    scientific_name: "Rastrelliger kanagurta",
    common_name:     "Indian Mackerel",
    habitat:         "Coastal marine waters",
    conservation:    "Least Concern",
    description:     "One of the most commercially important marine fish species along the Indian coast. Schooling pelagic fish.",
  },
};

/**
 * getSpeciesInfo(label)
 * Returns species info from DB, with fallback.
 */
export function getSpeciesInfo(label) {
  // Try direct match
  if (SPECIES_DB[label]) return SPECIES_DB[label];
  // Try case-insensitive match
  const key = Object.keys(SPECIES_DB).find(
    k => k.toLowerCase() === label.toLowerCase()
  );
  if (key) return SPECIES_DB[key];
  // Fallback
  return {
    scientific_name: "Unknown",
    common_name:     label.replace(/_/g, " "),
    habitat:         "Marine waters",
    conservation:    "Not evaluated",
    description:     "Species data not available in local database.",
  };
}