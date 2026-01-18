import { useEffect, useState } from "react";
import axios from "axios";
import ForecastChart from "./ForecastChart";
import ModelComparisonChart from "./ModelComparisonChart";
import MetricsCards from "./MetricsCards";

// ✅ CONTEXT IMPORT
import { useForecast } from "../../context/ForecastContext";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function ForecastTab() {
  const [counties, setCounties] = useState([]);
  const [models, setModels] = useState([]);

  const [selectedCounty, setSelectedCounty] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [horizon, setHorizon] = useState(36);

  const [loading, setLoading] = useState(false);
  const [forecastResult, setForecastResult] = useState([]);
  const [metrics, setMetrics] = useState(null);

  // ✅ CONTEXT SETTERS
  const {
    setForecastSeries,
    setSelectedCounty: setCtxCounty,
    setSelectedModel: setCtxModel,
    setHorizon: setCtxHorizon,

    // ✅ CONTEXT READERS (NEW)
    forecastSeries,
    selectedCounty: ctxCounty,
    selectedModel: ctxModel,
    horizon: ctxHorizon,
  } = useForecast();

  // ----------------------------------------------------
  // CSV DOWNLOAD FUNCTION
  // ----------------------------------------------------
  const downloadCSV = () => {
    if (!forecastResult.length) return;

    const headers = ["date", "historical", "forecast"];
    const rows = forecastResult.map((row) => [
      row.date,
      row.historical ?? "",
      row.forecast ?? "",
    ]);

    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "ev_demand_forecast.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ----------------------------------------------------
  // Load counties + models
  // ----------------------------------------------------
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [countiesRes, modelsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/counties`),
          axios.get(`${API_BASE_URL}/models`),
        ]);

        if (countiesRes.data?.length > 0) {
          setCounties(countiesRes.data);
          setSelectedCounty(countiesRes.data[0]);
        }

        if (modelsRes.data?.length > 0) {
          setModels(modelsRes.data);
          setSelectedModel(modelsRes.data[0]);
        }
      } catch (err) {
        console.error("❌ Failed to load dropdown data", err);
      }
    };

    loadInitialData();
  }, []);

  // ----------------------------------------------------
  // Load metrics when model changes
  // ----------------------------------------------------
  useEffect(() => {
    if (!selectedModel) return;

    axios
      .get(`${API_BASE_URL}/metrics`)
      .then((res) => {
        setMetrics(res.data[selectedModel]);
      })
      .catch((err) => console.error("❌ Failed to load metrics", err));
  }, [selectedModel]);

  // ----------------------------------------------------
  // HYDRATE LOCAL STATE FROM CONTEXT (NEW)
  // ----------------------------------------------------
  useEffect(() => {
    if (forecastSeries && forecastSeries.length > 0) {
      setForecastResult(forecastSeries);
    }

    if (ctxCounty) setSelectedCounty(ctxCounty);
    if (ctxModel) setSelectedModel(ctxModel);
    if (ctxHorizon) setHorizon(ctxHorizon);
  }, [forecastSeries, ctxCounty, ctxModel, ctxHorizon]);

  // ----------------------------------------------------
  // Run forecast
  // ----------------------------------------------------
  const runForecast = async () => {
    if (!selectedCounty || !selectedModel) return;

    setLoading(true);
    setForecastResult([]);

    try {
      const response = await axios.post(`${API_BASE_URL}/forecast`, {
        county: selectedCounty,
        model_name: selectedModel,
        horizon: Number(horizon),
      });

      const series = response.data?.forecast?.series;
      if (!Array.isArray(series)) {
        throw new Error("Invalid forecast format");
      }

      // Keep local state
      setForecastResult(series);

      // ----------------------------------------------------
      // WRITE TO CONTEXT
      // ----------------------------------------------------
      setForecastSeries(series);
      setCtxCounty(selectedCounty);
      setCtxModel(selectedModel);
      setCtxHorizon(Number(horizon));

    } catch (error) {
      console.error("❌ Forecast error:", error);
      alert("Forecast failed. Check backend logs.");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // UI
  // ----------------------------------------------------
  return (
    <div className="bg-slate-50 min-h-screen px-6 py-10 space-y-16">
      {/* HEADER */}
      <header className="space-y-3 max-w-4xl">
        <h2 className="text-3xl font-bold text-slate-900">
          EV Demand Forecasting
        </h2>
        <p className="text-slate-600 text-base leading-relaxed">
          Forecast monthly electric vehicle adoption using multiple machine learning
          and time-series models. Evaluate accuracy, compare models, and interpret
          trends visually.
        </p>
      </header>

      {/* CONTROLS */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-1">
          Forecast Configuration
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          Select a region, model, and forecasting horizon to generate predictions.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              County
            </label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={selectedCounty}
              onChange={(e) => setSelectedCounty(e.target.value)}
            >
              {counties.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Model
            </label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Horizon (months)
            </label>
            <input
              type="number"
              min="6"
              max="60"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={runForecast}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
            >
              {loading ? "Running Forecast…" : "Run Forecast"}
            </button>
          </div>
        </div>
      </section>

      {/* KPI */}
      {metrics && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">
            Model Evaluation Metrics
          </h3>
          <MetricsCards metrics={metrics} />
        </section>
      )}

      {/* EMPTY STATE */}
      {forecastResult.length === 0 && !loading && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <p className="text-slate-600 text-sm">
            Select a county, forecasting model, and horizon, then click
            <span className="font-semibold text-slate-800"> “Run Forecast” </span>
            to generate predictions.
          </p>
        </div>
      )}

      {/* FORECAST */}
      {forecastResult.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">
              Forecasted EV Demand
            </h3>

            <button
              onClick={downloadCSV}
              className="text-sm px-3 py-1.5 rounded-lg border
              border-slate-300 text-slate-700 hover:bg-slate-100 transition"
            >
              ⬇️ Download CSV
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <ForecastChart data={forecastResult} />
          </div>
        </section>
      )}

      {/* MODEL COMPARISON */}
      <section className="space-y-4">
        <ModelComparisonChart />
      </section>
    </div>
  );
}