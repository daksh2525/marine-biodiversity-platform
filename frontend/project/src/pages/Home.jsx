import { useState, useEffect } from "react";
import PredictionForm from "../components/PredictionForm";
import ResultCard     from "../components/ResultCard";
import OceanMap       from "../components/OceanMap";
import { TempAbundanceChart, MonthlyDistributionChart } from "../components/Charts";
import { predictFish, getHistory } from "../services/api";

export default function Home() {
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState("");
  const [history,    setHistory]    = useState([]);
  const [inputLatLng, setInputLatLng] = useState(null);

  useEffect(() => {
    getHistory().then(setHistory).catch(() => {});
  }, [result]);

  const handlePredict = async (params) => {
    setLoading(true); setError(""); setResult(null);
    try {
      // Generate a random Indian EEZ location
      const lat = parseFloat((15.0 + (Math.random() - 0.5) * 16).toFixed(6)); // 7°N – 23°N
      const lng = parseFloat((80.0 + (Math.random() - 0.5) * 22).toFixed(6)); // 69°E – 91°E

      const payload = {
        temperature:  Number(params.temperature),
        salinity:     Number(params.salinity),
        oxygen:       Number(params.oxygen),
        chlorophyll:  Number(params.chlorophyll),
        month:        Number(params.month),
        depth:        Number(params.depth),
        latitude:     lat,
        longitude:    lng,
      };

      console.log("Sending payload:", payload); // debug
      const res = await predictFish(payload);
      console.log("Response:", res);            // debug

      setResult(res);
      setInputLatLng([lat, lng]);
    } catch (e) {
      setError(e.response?.data?.error || "Prediction failed. Is Flask running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-grid">
      {/* Left column */}
      <div className="left-col">
        <PredictionForm onPredict={handlePredict} loading={loading} />
        {error && <div className="error-box">{error}</div>}
        {result && <ResultCard result={result} />}
      </div>

      {/* Right column */}
      <div className="right-col">
        <OceanMap prediction={result} inputLatLng={inputLatLng} />
        <div className="charts-section">
          {history.length > 0
            ? <>
                <TempAbundanceChart    key={`temp-${history.length}`}    history={history} />
                <MonthlyDistributionChart key={`month-${history.length}`} history={history} />
              </>
            : <p className="chart-hint">Make a prediction to populate the charts!</p>
          }
        </div>
      </div>
    </div>
  );
}