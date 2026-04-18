
// ── src/services/api.js ───────────────────────────────────────────────────────
import axios from "axios";

const EXPRESS = "http://localhost:5002/api";

// ALL predictions go through Express → Express saves to MongoDB → Express calls Flask
export const predictFish = (params) =>
  axios.post(`${EXPRESS}/predict`, params).then((r) => r.data);

export const getHistory = () =>
  axios.get(`${EXPRESS}/history`).then((r) => r.data);

export const deleteRecord = (id) =>
  axios.delete(`${EXPRESS}/history/${id}`).then((r) => r.data);

export const getMapData = () =>
  axios.get(`${EXPRESS}/map-data`).then((r) => r.data);

// ── Feature 2: Species identification ────────────────────────────────────────

/** identifySpecies(file, latLng?)
 *  file   — File object from input or drag-drop
 *  latLng — optional { lat, lng }
 */
export const identifySpecies = (file, latLng = null) => {
  const form = new FormData();
  form.append("image", file);
  if (latLng) {
    form.append("latitude",  latLng.lat);
    form.append("longitude", latLng.lng);
  }
  return axios
    .post(`${EXPRESS}/identify-species`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const getSpeciesHistory = () =>
  axios.get(`${EXPRESS}/species-history`).then((r) => r.data);

export const deleteSpeciesRecord = (id) =>
  axios.delete(`${EXPRESS}/species-history/${id}`).then((r) => r.data);
// Add these to your existing services/api.js

// ── Feature 3: Ecosystem Health ──────────────────────────────────────────────
export const assessEcosystem = (params) =>
  axios.post(`${EXPRESS}/ecosystem-health`, params).then(r => r.data);

export const getEcosystemHistory = () =>
  axios.get(`${EXPRESS}/ecosystem-history`).then(r => r.data);

export const getEcosystemZones = () =>
  axios.get(`${EXPRESS}/ecosystem-zones`).then(r => r.data);

export const deleteEcosystemRecord = (id) =>
  axios.delete(`${EXPRESS}/ecosystem-history/${id}`).then(r => r.data);