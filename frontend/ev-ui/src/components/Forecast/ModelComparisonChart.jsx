import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function ModelComparisonChart() {
  const [metrics, setMetrics] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState("RMSE");

  useEffect(() => {
    axios.get(`${API_BASE_URL}/metrics`).then((res) => {
      setMetrics(res.data);
    });
  }, []);

  if (!metrics) return null;

  const chartData = Object.entries(metrics)
    .map(([model, values]) => ({
      model: model.replace("_", " ").toUpperCase(),
      MAE: values.MAE,
      RMSE: values.RMSE,
      MAPE: values.MAPE,
    }))
    .sort((a, b) => a[selectedMetric] - b[selectedMetric]);

  const bestModel = chartData[0]?.model;
  const worstModel = chartData[chartData.length - 1]?.model;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 mt-10">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            Model Performance Comparison
          </h3>
          <p className="text-sm text-slate-500">
            Error comparison across forecasting models
          </p>
        </div>

        {/* METRIC TOGGLE */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {["RMSE", "MAE", "MAPE"].map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMetric(m)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                selectedMetric === m
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* CHART */}
      <div className="w-full">
        <ResponsiveContainer width="100%" height={380} minWidth={0}>
          <BarChart
            data={chartData}
            barCategoryGap="20%"
            margin={{ left: 8, right: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

            <XAxis
              dataKey="model"
              tick={{ fill: "#475569", fontSize: 12 }}
            />

            <YAxis
              tick={{ fill: "#475569", fontSize: 12 }}
              label={{
                value: selectedMetric,
                angle: -90,
                position: "insideLeft",
                fill: "#64748b",
                fontSize: 12,
              }}
            />

            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              contentStyle={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                borderColor: "#e5e7eb",
              }}
            />

            <Bar dataKey={selectedMetric} radius={[6, 6, 0, 0]}>
              {chartData.map((entry) => {
                let color = "#6366f1"; // default

                if (entry.model === bestModel) color = "#22c55e"; // best
                if (entry.model === worstModel) color = "#ef4444"; // worst

                return <Cell key={entry.model} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* FOOTNOTE */}
      <p className="text-xs text-slate-500">
        Lower values indicate better model performance. The best-performing model
        appears in green, while the weakest is highlighted in red.
      </p>
    </div>
  );
}
