// ── Fish image URLs (free, from Wikipedia Commons / public domain) ────────────
// These are direct links to real fish photos — no API key needed
export const SPECIES_IMAGES = {
  "Striped Red Mullet":  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Mullus_surmuletus_aquarium.jpg/320px-Mullus_surmuletus_aquarium.jpg",
  "Hourse Mackerel":     "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Trachurus_trachurus.jpg/320px-Trachurus_trachurus.jpg",
  "Black Sea Sprat":     "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Sprattus_sprattus.jpg/320px-Sprattus_sprattus.jpg",
  "Gilt-Head Bream":     "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Sparus_aurata.jpg/320px-Sparus_aurata.jpg",
  "Red Mullet":          "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Mullus_barbatus.jpg/320px-Mullus_barbatus.jpg",
  "Red Sea Bream":       "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Pagrus_major.jpg/320px-Pagrus_major.jpg",
  "Sea Bass":            "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Dicentrarchus_labrax.jpg/320px-Dicentrarchus_labrax.jpg",
  "Trout":               "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Salmo_trutta_m.jpg/320px-Salmo_trutta_m.jpg",
  "rohu":                "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Labeo_rohita.jpg/320px-Labeo_rohita.jpg",
  "sardine":             "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Sardinella_longiceps.jpg/320px-Sardinella_longiceps.jpg",
  "seer_fish":           "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Scomberomorus_commerson.jpg/320px-Scomberomorus_commerson.jpg",
  "snapper":             "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Lutjanus_campechanus.jpg/320px-Lutjanus_campechanus.jpg",
  "indian_mackerel":     "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Rastrelliger_kanagurta.jpg/320px-Rastrelliger_kanagurta.jpg",
  "tuna":                "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Yellowfin_tuna_nurp.jpg/320px-Yellowfin_tuna_nurp.jpg",
  "grouper":             "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Epinephelus_coioides.jpg/320px-Epinephelus_coioides.jpg",
};

// Fallback image when species photo not available
export const FALLBACK_FISH_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/320px-No_image_available.svg.png";

/**
 * getFishImage(label)
 * Returns a fish photo URL for the given species key or common name.
 */
export function getFishImage(label) {
  if (!label) return null;
  if (SPECIES_IMAGES[label]) return SPECIES_IMAGES[label];
  const key = Object.keys(SPECIES_IMAGES).find(
    k => k.toLowerCase() === label.toLowerCase().replace(/_/g, " ")
  );
  return key ? SPECIES_IMAGES[key] : null;
}

const speciesDatabase = {
  // ── Kaggle dataset classes ─────────────────────────────────────────────────
  "Striped Red Mullet": {
    scientificName:     "Mullus surmuletus",
    habitat:            "Coastal sandy and muddy sea bottoms",
    conservationStatus: "Least Concern",
    description:        "A bottom-dwelling fish found across Indian Ocean coastal waters. Feeds on small invertebrates buried in sand using sensitive chin barbels.",
    depth:              "10–300 m",
    avgLength:          "25–40 cm",
    indiaRegion:        "Arabian Sea, Bay of Bengal",
  },
  "Hourse Mackerel": {
    scientificName:     "Trachurus trachurus",
    habitat:            "Open ocean, pelagic coastal waters",
    conservationStatus: "Least Concern",
    description:        "Fast-swimming schooling fish found in Indian Ocean. Important for commercial fisheries in western India. Feeds on small fish and zooplankton.",
    depth:              "0–500 m",
    avgLength:          "20–35 cm",
    indiaRegion:        "Arabian Sea",
  },
  "Black Sea Sprat": {
    scientificName:     "Sprattus sprattus",
    habitat:            "Coastal pelagic, temperate to warm waters",
    conservationStatus: "Least Concern",
    description:        "Small schooling fish harvested commercially for fish meal and oil. Important prey species for larger predatory fish.",
    depth:              "0–200 m",
    avgLength:          "10–16 cm",
    indiaRegion:        "Coastal Indian Ocean",
  },
  "Gilt-Head Bream": {
    scientificName:     "Sparus aurata",
    habitat:            "Coastal waters, lagoons and estuaries",
    conservationStatus: "Least Concern",
    description:        "Highly valued food fish recognizable by gold stripe between eyes. Found in warm coastal Indian Ocean waters. Supports large aquaculture industry.",
    depth:              "0–150 m",
    avgLength:          "30–50 cm",
    indiaRegion:        "Lakshadweep, Andaman",
  },
  "Red Mullet": {
    scientificName:     "Mullus barbatus",
    habitat:            "Sandy and muddy sea beds",
    conservationStatus: "Least Concern",
    description:        "Bottom-feeding fish found in Indian Ocean. Uses sensitive chin barbels to detect prey buried in sediment. Important commercial species.",
    depth:              "10–300 m",
    avgLength:          "20–30 cm",
    indiaRegion:        "Arabian Sea, Bay of Bengal",
  },
  "Red Sea Bream": {
    scientificName:     "Pagrus major",
    habitat:            "Coastal rocky and sandy bottoms",
    conservationStatus: "Least Concern",
    description:        "Popular food fish found in Indian coastal waters. Lives near reefs and rocky outcrops. Supports significant artisanal fisheries.",
    depth:              "20–200 m",
    avgLength:          "30–50 cm",
    indiaRegion:        "Andaman, Lakshadweep",
  },
  "Sea Bass": {
    scientificName:     "Dicentrarchus labrax",
    habitat:            "Coastal waters, estuaries and rocky shores",
    conservationStatus: "Least Concern",
    description:        "Predatory fish found in Indian Ocean coastal zones. Highly prized by commercial fishermen. Feeds on smaller fish and crustaceans.",
    depth:              "0–100 m",
    avgLength:          "40–80 cm",
    indiaRegion:        "Arabian Sea, southwest coast",
  },
  "Trout": {
    scientificName:     "Oncorhynchus mykiss",
    habitat:            "Cold freshwater mountain streams and rivers",
    conservationStatus: "Least Concern",
    description:        "Introduced salmonid species found in Indian Himalayan hill streams. Important for freshwater aquaculture in northern India.",
    depth:              "0–10 m",
    avgLength:          "30–60 cm",
    indiaRegion:        "Kashmir, Himachal Pradesh",
  },
  // ── Indian marine species ──────────────────────────────────────────────────
  "rohu": {
    scientificName:     "Labeo rohita",
    habitat:            "Freshwater rivers and lakes",
    conservationStatus: "Least Concern",
    description:        "Largest and most commercially important Indian freshwater fish. Highly nutritious and widely farmed across India.",
    depth:              "0–10 m",
    avgLength:          "40–90 cm",
    indiaRegion:        "Ganga, Brahmaputra river systems",
  },
  "sardine": {
    scientificName:     "Sardinella longiceps",
    habitat:            "Coastal pelagic, warm tropical waters",
    conservationStatus: "Least Concern",
    description:        "Most commercially important fish along India's west coast. Found in enormous schools. Harvested for direct consumption and fish oil/meal.",
    depth:              "0–50 m",
    avgLength:          "15–23 cm",
    indiaRegion:        "Kerala, Karnataka, Goa coast",
  },
  "seer_fish": {
    scientificName:     "Scomberomorus commerson",
    habitat:            "Coastal and offshore marine waters",
    conservationStatus: "Least Concern",
    description:        "One of the most prized food fish in India. Fast swimmer that feeds on sardines and anchovies. Highly valued in fish markets across India.",
    depth:              "0–200 m",
    avgLength:          "60–120 cm",
    indiaRegion:        "Pan-Indian coast",
  },
  "snapper": {
    scientificName:     "Lutjanus campechanus",
    habitat:            "Coral reefs and rocky shores",
    conservationStatus: "Vulnerable",
    description:        "Popular reef fish found in tropical Indian Ocean waters. Important for both commercial fishing and coral reef ecosystem health.",
    depth:              "10–190 m",
    avgLength:          "40–60 cm",
    indiaRegion:        "Lakshadweep, Andaman reefs",
  },
  "indian_mackerel": {
    scientificName:     "Rastrelliger kanagurta",
    habitat:            "Coastal marine pelagic waters",
    conservationStatus: "Least Concern",
    description:        "One of the most commercially important marine fish along the Indian coast. Schooling pelagic fish supporting large fisheries in Kerala and Karnataka.",
    depth:              "0–100 m",
    avgLength:          "20–35 cm",
    indiaRegion:        "Pan-Indian coast, especially Kerala",
  },
};

export default speciesDatabase;

/**
 * getSpeciesData(label)
 * Looks up species by key or common name (case-insensitive).
 * Returns data object or null if not found.
 */
export function getSpeciesData(label) {
  if (!label) return null;
  // Direct match
  if (speciesDatabase[label]) return speciesDatabase[label];
  // Case-insensitive match
  const key = Object.keys(speciesDatabase).find(
    k => k.toLowerCase() === label.toLowerCase().replace(/_/g, " ")
  );
  return key ? speciesDatabase[key] : null;
}

/**
 * getConservationColor(status)
 * Returns hex color for conservation badge.
 */
export function getConservationColor(status) {
  if (!status) return "#607d8b";
  const s = status.toLowerCase();
  if (s.includes("least"))       return "#2e7d32";
  if (s.includes("near"))        return "#f57f17";
  if (s.includes("vulnerable"))  return "#e65100";
  if (s.includes("endangered"))  return "#c62828";
  if (s.includes("critical"))    return "#b71c1c";
  return "#607d8b";
}