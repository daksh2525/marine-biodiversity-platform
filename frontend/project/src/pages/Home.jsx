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

  // Default map pin: center of Indian EEZ
  const DEFAULT_LAT = 15.0, DEFAULT_LNG = 80.0;

  useEffect(() => {
    getHistory().then(setHistory).catch(() => {});
  }, [result]);

  const handlePredict = async (params) => {
    setLoading(true); setError(""); setResult(null);
    try {
      // Attach a random Indian EEZ location if user hasn't set one
      const lat = params.latitude  || DEFAULT_LAT + (Math.random() - 0.5) * 4;
      const lng = params.longitude || DEFAULT_LNG + (Math.random() - 0.5) * 4;
      const res = await predictFish({ ...params, latitude: lat, longitude: lng });
      console.log("Prediction response:", res);   // ← check browser console
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