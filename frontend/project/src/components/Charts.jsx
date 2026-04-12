import { useEffect, useRef } from "react";
import {
  Chart,
  ScatterController,
  BarController,
  LinearScale,
  CategoryScale,
  PointElement,
  BarElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";

// Register only what we need (avoids "registerables" bulk import issues)
Chart.register(
  ScatterController,
  BarController,
  LinearScale,
  CategoryScale,
  PointElement,
  BarElement,
  Tooltip,
  Legend,
  Title
);

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Temperature vs Fish Abundance ─────────────────────────────────────────────
export function TempAbundanceChart({ history }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    const validData = history?.filter(
      (d) => d?.input?.temperature != null && d?.fish_abundance != null
    ) ?? [];

    if (!validData.length || !canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const sorted = [...validData].sort(
      (a, b) => a.input.temperature - b.input.temperature
    );

    const ctx = canvasRef.current.getContext("2d");
    chartRef.current = new Chart(ctx, {
      type: "scatter",
      data: {
        datasets: [
          {
            label: "Fish Abundance (kg/km²)",
            data: sorted.map((d) => ({
              x: d.input.temperature,
              y: d.fish_abundance,
            })),
            backgroundColor: sorted.map((d) =>
              d.category === "High"
                ? "#2e7d32"
                : d.category === "Medium"
                ? "#f57f17"
                : "#c62828"
            ),
            pointRadius: 7,
            pointHoverRadius: 9,
          },
        ],
      },
      options: {
        responsive: true,
        animation: false,
        plugins: {
          legend: { display: true },
          title: {
            display: true,
            text: "Temperature vs Fish Abundance",
            color: "#e0e6ed",
          },
        },
        scales: {
          x: {
            title: { display: true, text: "Sea Surface Temperature (°C)", color: "#90caf9" },
            ticks: { color: "#90caf9" },
            grid:  { color: "#1e3a5a" },
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: "Fish Abundance (kg/km²)", color: "#90caf9" },
            ticks: { color: "#90caf9" },
            grid:  { color: "#1e3a5a" },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [history]); // only re-run when history array reference changes

  return <canvas ref={canvasRef} />;
}

// ── Month-wise Fish Distribution ──────────────────────────────────────────────
export function MonthlyDistributionChart({ history }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    const validData = history?.filter(
      (d) => d?.input?.month != null && d?.fish_abundance != null
    ) ?? [];

    if (!validData.length || !canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const totals = Array(12).fill(0);
    const counts = Array(12).fill(0);
    validData.forEach((d) => {
        const idx = d.input.month - 1;
        if (idx >= 0 && idx < 12) {
          totals[idx] += d.fish_abundance;
          counts[idx] += 1;
        }
      });
    const avgs = totals.map((s, i) =>
      counts[i] ? parseFloat((s / counts[i]).toFixed(2)) : 0
    );

    const ctx = canvasRef.current.getContext("2d");
    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: MONTHS,
        datasets: [
          {
            label: "Avg Abundance (kg/km²)",
            data: avgs,
            backgroundColor: avgs.map((v) =>
              v >= 80 ? "#2e7d32" : v >= 40 ? "#f57f17" : "#c62828"
            ),
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        animation: false,
        plugins: {
          title: {
            display: true,
            text: "Month-wise Fish Distribution",
            color: "#e0e6ed",
          },
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Avg Abundance (kg/km²)", color: "#90caf9" },
            ticks: { color: "#90caf9" },
            grid:  { color: "#1e3a5a" },
          },
          x: {
            ticks: { color: "#90caf9" },
            grid:  { color: "#1e3a5a" },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [history]);

  return <canvas ref={canvasRef} />;
}