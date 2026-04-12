import { useState, useEffect } from "react";
import { getHistory, deleteRecord } from "../services/api";
import HistoryTable from "../components/HistoryTable";
import { TempAbundanceChart, MonthlyDistributionChart } from "../components/Charts";

export default function History() {
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [deleting, setDeleting] = useState(null);

  // Safe transform — normalizes any API response shape
  const safeTransform = (data = []) => {
    console.log("Raw records from API:", data); // ← debug
    return data.map((item) => {
      console.log("Processing item:", item);    // ← debug each record
      return {
        _id:            item._id || item.id || String(Math.random()),
        input: {
          temperature:  Number(item?.input?.temperature ?? 0),
          salinity:     Number(item?.input?.salinity    ?? 0),
          oxygen:       Number(item?.input?.oxygen      ?? 0),
          chlorophyll:  Number(item?.input?.chlorophyll ?? 0),
          depth:        Number(item?.input?.depth       ?? 0),
          month:        Number(item?.input?.month       ?? 1),
        },
        fish_abundance: Number(item?.fish_abundance  ?? 0),
        rf_prediction:  Number(item?.rf_prediction   ?? 0),
        xgb_prediction: Number(item?.xgb_prediction  ?? 0),
        category:       item?.category               ?? "Low",
        latitude:       item?.latitude               ?? null,
        longitude:      item?.longitude              ?? null,
        createdAt:      item?.createdAt              ?? new Date().toISOString(),
      };
    });
  };

  const fetchHistory = async () => {
    try {
      const d = await getHistory();
      setRecords(safeTransform(d));
    } catch (err) {
      console.error("Fetch history error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);  // ✅ safe — directly inside useEffect body
    fetchHistory();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this prediction?")) return;
    setDeleting(id);
    try {
      await deleteRecord(id);
      // ✅ apply same safe transform on refresh
      const d = await getHistory();
      setRecords(safeTransform(d));
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <p className="loading-text">Loading history…</p>;

  return (
    <div className="history-page">
      <h2>Prediction History</h2>

      <HistoryTable
        records={records}
        onDelete={handleDelete}
        deleting={deleting}
      />

      {/* Charts section */}
      {records.length > 0 && (
        <div className="history-charts" style={{ marginTop: "2rem" }}>
          <h3 style={{ color: "#1e90ff", marginBottom: "1rem" }}>Visual Analysis</h3>
          <div className="history-charts-grid">
            <div className="chart-box">
              <TempAbundanceChart history={records} />
            </div>
            <div className="chart-box">
              <MonthlyDistributionChart history={records} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}