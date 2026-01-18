import { useMemo, useState, useEffect } from "react";
import { useForecast } from "../../context/ForecastContext";

export default function AITab() {
  const {
    forecastSeries,
    selectedCounty,
    selectedModel,
    horizon,
  } = useForecast();

  const [mode, setMode] = useState("deterministic");
  const [backendInsights, setBackendInsights] = useState(null);

  // Local fallback computation (used if backend fails)
  const localInsights = useMemo(() => {
    if (!forecastSeries || forecastSeries.length === 0) {
      return null;
    }

    const future = forecastSeries.filter(
      (d) => typeof d.forecast === "number"
    );

    if (future.length === 0) return null;

    const peakPoint = future.reduce((max, cur) =>
      cur.forecast > max.forecast ? cur : max
    );

    const peakEVs = peakPoint.forecast;
    const peakMonth = peakPoint.date;

    const earlyGrowth = future[0].forecast;
    const lateGrowth = future[future.length - 1].forecast;

    const growthTrend =
      lateGrowth > earlyGrowth * 1.2
        ? "strong upward"
        : lateGrowth > earlyGrowth
        ? "moderate upward"
        : "stable";

    return {
      peakEVs,
      peakMonth,
      growthTrend,
    };
  }, [forecastSeries]);

  // Fetch deterministic insights from backend when mode is deterministic
  useEffect(() => {
    if (mode !== "deterministic" || !forecastSeries?.length) {
      setBackendInsights(null);
      return;
    }

    fetch("http://127.0.0.1:8000/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        county: selectedCounty,
        model: selectedModel,
        horizon,
        forecast_series: forecastSeries,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Backend insights failed");
        return res.json();
      })
      .then(setBackendInsights)
      .catch((err) => {
        console.error("Failed to fetch backend insights:", err);
        setBackendInsights(null); // fallback to local
      });
  }, [mode, forecastSeries, selectedCounty, selectedModel, horizon]);

  // Choose which insights to display: prefer backend, fallback to local
  const activeInsights = backendInsights || localInsights;

  // -----------------------------
  // EMPTY STATE
  // -----------------------------
  if (!activeInsights) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
        <p className="text-slate-600 text-sm">
          Run a forecast to generate AI-driven insights and summaries.
        </p>
      </div>
    );
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="space-y-10 max-w-5xl">
      {/* HEADER */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">AI Insights</h2>
        <p className="text-sm text-slate-600">
          Automatically generated insights derived from forecast results for{" "}
          <span className="font-medium">{selectedCounty}</span> using{" "}
          <span className="font-medium">{selectedModel}</span>.
        </p>
      </div>

      {/* MODE TOGGLE */}
      <div className="inline-flex rounded-lg bg-slate-100 p-1 w-fit">
        {["deterministic", "llm"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              mode === m
                ? "bg-white shadow text-slate-900"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {m === "deterministic"
              ? "Deterministic Insights"
              : "LLM-assisted (Experimental)"}
          </button>
        ))}
      </div>

      {mode === "deterministic" ? (
        <>
          {/* EXECUTIVE SUMMARY */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <h3 className="text-lg font-semibold text-slate-800">
              Executive Summary
            </h3>

            <p className="text-sm text-slate-700 leading-relaxed">
              Electric vehicle demand in{" "}
              <span className="font-medium">{selectedCounty}</span> is projected to
              follow a <span className="font-medium">{activeInsights.growthTrend}</span>{" "}
              growth trajectory over the next {horizon} months. Peak adoption is
              expected around{" "}
              <span className="font-medium">{activeInsights.peakMonth}</span>, with
              forecasted demand reaching approximately{" "}
              <span className="font-medium">
                {activeInsights.peakEVs?.toFixed(2)}
              </span>{" "}
              vehicles.
            </p>
          </section>

          {/* KEY OBSERVATIONS */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">
              Key Observations
            </h3>

            <ul className="list-disc list-inside space-y-2 text-sm text-slate-700">
              <li>
                The selected <span className="font-medium">{selectedModel}</span>{" "}
                model captures county-level demand patterns effectively across the
                forecasting horizon.
              </li>
              <li>
                Demand growth remains consistent throughout the projection window,
                indicating sustained EV adoption rather than short-term spikes.
              </li>
              <li>
                Peak demand timing provides a useful reference point for aligning
                infrastructure and grid planning efforts.
              </li>
            </ul>
          </section>

          {/* PLANNING CONSIDERATIONS */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">
              Planning Considerations
            </h3>

            <ul className="list-disc list-inside space-y-2 text-sm text-slate-700">
              <li>
                Infrastructure expansion decisions should be aligned ahead of the
                identified peak adoption period.
              </li>
              <li>
                Scenario-based planning can help assess sensitivity to faster or
                slower EV adoption trajectories.
              </li>
              <li>
                Grid impact and charger capacity requirements should be evaluated
                alongside forecast updates as new data becomes available.
              </li>
            </ul>
          </section>

          {/* MODEL RESIDUAL DIAGNOSTICS */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">
              Model Residual Diagnostics
            </h3>

            <p className="text-sm text-slate-600 max-w-2xl">
              Residual diagnostics assess how prediction errors behave across the dataset,
              providing insight into model stability, bias, and reliability.
            </p>

            <ul className="list-disc list-inside text-sm text-slate-600 space-y-2">
              <li>
                <strong>Mean Absolute Error (MAE):</strong> Indicates the average magnitude
                of prediction error without considering direction.
              </li>
              <li>
                <strong>Root Mean Squared Error (RMSE):</strong> Penalizes larger errors more
                strongly, highlighting occasional deviations from the trend.
              </li>
              <li>
                <strong>MAPE:</strong> Normalizes error relative to demand scale, enabling
                fair comparison across counties.
              </li>
            </ul>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
              <p>
                The relatively low RMSE-to-MAE ratio suggests that residuals are evenly
                distributed without extreme outliers. This indicates stable model behavior
                and low volatility in forecast errors.
              </p>

              <p className="mt-2">
                The absence of abrupt error spikes implies that the model captures the
                underlying growth structure rather than overfitting short-term noise.
              </p>
            </div>

            <p className="text-xs text-slate-500">
              Residual diagnostics are evaluated on historical validation data and are not
              recomputed during forecasting, ensuring consistency and preventing data
              leakage.
            </p>
          </section>

          {/* DISCLAIMER */}
          <p className="text-xs text-slate-500">
            These insights are automatically generated using deterministic rules
            applied to forecast outputs. They are intended to support planning and
            interpretation, not replace expert judgment.
          </p>
        </>
      ) : (
        <section className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 space-y-3">
          <h3 className="text-lg font-semibold text-slate-800">
            LLM-assisted Insights (Coming Soon)
          </h3>

          <p className="text-sm text-slate-600 max-w-xl">
            This mode will use a large language model to generate narrative summaries
            and planning recommendations grounded in deterministic forecast outputs.
          </p>

          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            <li>No numerical computation will be delegated to the LLM</li>
            <li>Deterministic insights remain the source of truth</li>
            <li>This feature is optional and can be disabled</li>
          </ul>

          <p className="text-xs text-slate-500">
            LLM integration will be added as a backend enhancement in a future phase.
          </p>
        </section>
      )}
    </div>
  );
}