import { useMemo, useState } from "react";
import { useForecast } from "../../context/ForecastContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/**
 * Scenario multipliers (planning assumptions, NOT fake data)
 */
const SCENARIO_MULTIPLIERS = {
  conservative: 0.85,
  baseline: 1.0,
  aggressive: 1.2,
};

/**
 * Infrastructure planning assumptions
 */
const ASSUMPTIONS = {
  sessionsPerEVPerMonth: 8,
  sessionsPerChargerPerMonth: 300,
  avgChargerPowerKW: 11,
  concurrencyFactor: 0.25,
  gridRiskMW: {
    low: 2,
    medium: 5,
  },
};

export default function InfrastructureTab() {
  const {
    forecastSeries,
    selectedCounty,
    selectedModel,
    horizon,
  } = useForecast();

  const [scenario, setScenario] = useState("baseline");
  const [expanded, setExpanded] = useState(null);

  // -----------------------------
  // Guard: no forecast yet
  // -----------------------------
  if (!forecastSeries || forecastSeries.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
        <p className="text-slate-600 text-sm">
          Run a forecast first to generate infrastructure planning insights.
        </p>
      </div>
    );
  }

  // -----------------------------
  // REAL derivations from forecast
  // -----------------------------
  const derived = useMemo(() => {
    if (!forecastSeries || forecastSeries.length === 0) {
      return {
        peakEVs: 0,
        peakMonth: null,
        chargersNeeded: 0,
        gridLoadMW: 0,
        risk: "Low",
        chargingSeries: [],
        thresholdEvent: null,
      };
    }

    const multiplier = SCENARIO_MULTIPLIERS[scenario] ?? 1;

    const future = forecastSeries.filter(
      (d) => typeof d.forecast === "number"
    );

    if (future.length === 0) {
      return {
        peakEVs: 0,
        peakMonth: null,
        chargersNeeded: 0,
        gridLoadMW: 0,
        risk: "Low",
        chargingSeries: [],
        thresholdEvent: null,
      };
    }

    const adjusted = future.map((d) => ({
      ...d,
      adjustedEVs: d.forecast * multiplier,
    }));

    const peakPoint = adjusted.reduce((max, cur) =>
      cur.adjustedEVs > max.adjustedEVs ? cur : max
    );

    const peakEVs = peakPoint.adjustedEVs;
    const peakMonth = peakPoint.date;

    // Compute baseline peak EVs (what it would be in baseline scenario)
    const baselinePeakEVs = peakPoint.adjustedEVs / multiplier * SCENARIO_MULTIPLIERS.baseline;

    const deltaPct =
      baselinePeakEVs !== 0
        ? ((peakEVs - baselinePeakEVs) / baselinePeakEVs) * 100
        : 0;

    const monthlySessions =
      peakEVs * ASSUMPTIONS.sessionsPerEVPerMonth;

    const chargersNeeded = Math.ceil(
      monthlySessions / ASSUMPTIONS.sessionsPerChargerPerMonth
    );

    const gridLoadMW =
      (chargersNeeded *
        ASSUMPTIONS.avgChargerPowerKW *
        ASSUMPTIONS.concurrencyFactor) /
      1000;

    let risk = "Low";
    if (gridLoadMW > ASSUMPTIONS.gridRiskMW.medium) risk = "High";
    else if (gridLoadMW > ASSUMPTIONS.gridRiskMW.low) risk = "Medium";

    // Monthly charging sessions series (baseline vs current scenario)
    const chargingSeries = future.map((d) => {
      const baselineSessions =
        d.forecast * ASSUMPTIONS.sessionsPerEVPerMonth;

      const scenarioSessions =
        baselineSessions * multiplier;

      return {
        date: d.date,
        baseline: baselineSessions,
        scenario: scenarioSessions,
      };
    });

    // Charger requirement over time
    const chargerTimeline = chargingSeries.map((d) => {
      const chargers = Math.ceil(
        d.scenario / ASSUMPTIONS.sessionsPerChargerPerMonth
      );

      return {
        date: d.date,
        chargers,
      };
    });

    // Detect first threshold increase
    let thresholdEvent = null;

    for (let i = 1; i < chargerTimeline.length; i++) {
      if (chargerTimeline[i].chargers > chargerTimeline[i - 1].chargers) {
        thresholdEvent = {
          from: chargerTimeline[i - 1].chargers,
          to: chargerTimeline[i].chargers,
          date: chargerTimeline[i].date,
        };
        break;
      }
    }

    // Scenario comparison series
    const scenarioComparisonSeries = future.map((d) => {
      const baselineSessions =
        d.forecast * ASSUMPTIONS.sessionsPerEVPerMonth;

      return {
        date: d.date,
        conservative: baselineSessions * SCENARIO_MULTIPLIERS.conservative,
        baseline: baselineSessions * SCENARIO_MULTIPLIERS.baseline,
        aggressive: baselineSessions * SCENARIO_MULTIPLIERS.aggressive,
      };
    });

    return {
      peakEVs,
      peakMonth,
      chargersNeeded,
      gridLoadMW,
      risk,
      chargingSeries,
      thresholdEvent,
      deltaPct,
      scenarioComparisonSeries,
    };
  }, [forecastSeries, scenario]);

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="space-y-12">
      {/* HEADER */}
      <div className="space-y-2 max-w-4xl">
        <h2 className="text-2xl font-bold text-slate-900">
          Infrastructure Planning
        </h2>
        <p className="text-sm text-slate-600">
          Derived from EV demand forecasts for{" "}
          <span className="font-medium">{selectedCounty}</span> using{" "}
          <span className="font-medium">{selectedModel}</span> (
          {horizon} months).
        </p>
      </div>

      {/* SCENARIO SELECTOR */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-800">
          Scenario Analysis
        </h3>

        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          {Object.keys(SCENARIO_MULTIPLIERS).map((key) => (
            <button
              key={key}
              onClick={() => setScenario(key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                scenario === key
                  ? "bg-white shadow text-slate-900"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* KPI GRID */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Kpi
          title="Peak EV Demand"
          value={derived.peakEVs.toFixed(2)}
          subtitle={
            <span>
              Expected around {derived.peakMonth}
              {derived.deltaPct !== 0 && (
                <span className="ml-1 text-xs text-slate-500">
                  ({derived.deltaPct > 0 ? "+" : ""}
                  {derived.deltaPct.toFixed(1)}% vs baseline)
                </span>
              )}
            </span>
          }
        />
        <Kpi
          title="Chargers Required"
          value={derived.chargersNeeded}
          subtitle="Capacity-based planning estimate"
        />
        <Kpi
          title="Estimated Grid Load"
          value={`${derived.gridLoadMW.toFixed(2)} MW`}
          subtitle="Peak concurrent charging load"
        />
      </section>

      {/* ================= CHARGING DEMAND TREND ================= */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">
          Charging Demand Over Time
        </h3>

        <p className="text-sm text-slate-600 max-w-2xl">
          Monthly public charging demand derived from forecasted EV adoption.
          The dashed line reflects the selected scenario.
        </p>

        <div className="w-full">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={derived.chargingSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#475569" }}
              />

              <YAxis
                tick={{ fontSize: 11, fill: "#475569" }}
                label={{
                  value: "Charging Sessions / Month",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#64748b",
                  fontSize: 12,
                }}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  borderColor: "#e5e7eb",
                }}
              />

              {/* Baseline */}
              <Line
                type="monotone"
                dataKey="baseline"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                name="Baseline"
              />

              {/* Scenario */}
              <Line
                type="monotone"
                dataKey="scenario"
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
                name="Selected Scenario"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-slate-500">
          Scenario analysis applies a controlled multiplier to forecasted demand
          across the entire planning horizon.
        </p>
      </section>

      {/* ================= SCENARIO COMPARISON ================= */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">
          Scenario Comparison
        </h3>

        <p className="text-sm text-slate-600 max-w-2xl">
          Comparison of charging demand under conservative, baseline, and aggressive
          EV adoption scenarios derived from the same forecast.
        </p>

        <div className="w-full">
          {derived.scenarioComparisonSeries.length > 0 && (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={derived.scenarioComparisonSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#475569" }}
                />

                <YAxis
                  tick={{ fontSize: 11, fill: "#475569" }}
                  label={{
                    value: "Charging Sessions / Month",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#64748b",
                    fontSize: 12,
                  }}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    borderColor: "#e5e7eb",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="conservative"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  name="Conservative"
                />

                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  name="Baseline"
                />

                <Line
                  type="monotone"
                  dataKey="aggressive"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name="Aggressive"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <p className="text-xs text-slate-500">
          All scenarios are derived from the same forecast using controlled demand
          multipliers to assess sensitivity and planning risk.
        </p>
      </section>

      {/* ================= THRESHOLD MARKER ================= */}
      {derived.thresholdEvent && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <h3 className="text-lg font-semibold text-slate-800">
            Infrastructure Expansion Trigger
          </h3>

          <p className="text-sm text-slate-600 max-w-2xl">
            Based on projected charging demand under the{" "}
            <span className="font-medium">{scenario}</span> scenario, the required
            number of public chargers increases as follows:
          </p>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold">
              {derived.thresholdEvent.from} → {derived.thresholdEvent.to} Chargers
            </div>

            <p className="text-sm text-slate-700">
              Expected around{" "}
              <span className="font-medium">{derived.thresholdEvent.date}</span>
            </p>
          </div>

          <p className="text-xs text-slate-500">
            This threshold represents the first point at which existing charging
            capacity becomes insufficient under the selected scenario.
          </p>
        </section>
      )}

      {/* GRID RISK */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">
          Grid Impact Assessment
        </h3>

        <div className="flex items-center gap-4">
          <div
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              derived.risk === "Low"
                ? "bg-emerald-100 text-emerald-700"
                : derived.risk === "Medium"
                ? "bg-amber-100 text-amber-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {derived.risk} Risk
          </div>

          <p className="text-sm text-slate-600 max-w-xl">
            Risk is computed from estimated grid load derived directly from
            forecasted EV demand under the selected scenario.
          </p>
        </div>

        <p className="text-xs text-slate-500">
          Scenario analysis applies controlled demand multipliers to forecast
          outputs for planning evaluation.
        </p>
      </section>
    </div>
  );
}

function Kpi({ title, value, subtitle }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
      <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}