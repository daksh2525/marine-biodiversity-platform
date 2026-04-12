
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