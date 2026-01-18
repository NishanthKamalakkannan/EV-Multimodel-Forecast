import { useMemo } from "react";
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

/* Scenario transforms — now time-varying (piecewise) */
const SCENARIOS = {
  conservative: (t) => (t < 24 ? 0.9 : 0.75),   // slower after 2 years
  baseline: () => 1.0,                           // no change (control)
  aggressive: (t) => (t < 24 ? 1.1 : 1.35),     // faster after 2 years
};

/* Infrastructure assumptions (unchanged) */
const ASSUMPTIONS = {
  sessionsPerEVPerMonth: 8,
  sessionsPerChargerPerMonth: 300,
  avgChargerPowerKW: 11,
  concurrencyFactor: 0.25,
};

export default function ScenariosTab() {
  const { forecastSeries } = useForecast();

  // -----------------------------
  // Guard: no forecast yet
  // -----------------------------
  if (!forecastSeries || forecastSeries.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-sm text-slate-600">
        Run a forecast to enable scenario comparison.
      </div>
    );
  }

  // -----------------------------
  // Core scenario computations (now with time-varying multipliers)
  // -----------------------------
  const scenarioResults = useMemo(() => {
    const future = forecastSeries.filter(
      (d) => typeof d.forecast === "number"
    );

    if (future.length === 0) return null;

    const baselinePeak =
      Math.max(...future.map((d) => d.forecast));

    const baselineChargers = computeChargers(baselinePeak);
    const baselineGrid = computeGridLoad(baselineChargers);

    return Object.entries(SCENARIOS).map(([name, multiplierFn]) => {
      const adjusted = future.map((d, idx) => ({
        ...d,
        value: d.forecast * multiplierFn(idx), // now time-dependent!
      }));

      const peakPoint = adjusted.reduce((max, cur) =>
        cur.value > max.value ? cur : max
      );

      const peakEVs = peakPoint.value;
      const peakMonth = peakPoint.date;

      const chargers = computeChargers(peakEVs);
      const gridMW = computeGridLoad(chargers);

      return {
        scenario: name,
        peakEVs,
        peakMonth,
        chargers,
        gridMW,
        deltaPct:
          name === "baseline"
            ? 0
            : ((peakEVs - baselinePeak) / baselinePeak) * 100,
        series: adjusted,
      };
    });
  }, [forecastSeries]);

  if (!scenarioResults) return null;

  // -----------------------------
  // Chart data (merged by date)
  // -----------------------------
  const chartData = scenarioResults[0].series.map((_, i) => {
    const row = { date: scenarioResults[0].series[i].date };
    scenarioResults.forEach((s) => {
      row[s.scenario] = s.series[i].value;
    });
    return row;
  });

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="space-y-12">
      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Scenario Comparison
        </h2>
        <p className="text-sm text-slate-600">
          Deterministic comparison of forecast-derived infrastructure metrics
          across multiple scenario transforms.
        </p>
      </div>

      {/* COMPARISON TABLE */}
      <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left">Scenario</th>
              <th className="px-4 py-3 text-right">Peak EVs</th>
              <th className="px-4 py-3 text-left">Peak Month</th>
              <th className="px-4 py-3 text-right">Chargers</th>
              <th className="px-4 py-3 text-right">Grid Load (MW)</th>
              <th className="px-4 py-3 text-right">Δ vs Baseline</th>
            </tr>
          </thead>
          <tbody>
            {scenarioResults.map((s) => (
              <tr
                key={s.scenario}
                className="border-t border-slate-200"
              >
                <td className="px-4 py-2 font-medium capitalize">
                  {s.scenario}
                </td>
                <td className="px-4 py-2 text-right">
                  {s.peakEVs.toFixed(2)}
                </td>
                <td className="px-4 py-2">{s.peakMonth}</td>
                <td className="px-4 py-2 text-right">
                  {s.chargers}
                </td>
                <td className="px-4 py-2 text-right">
                  {s.gridMW.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right">
                  {s.deltaPct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MULTI-SCENARIO CHART */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">
          EV Demand Under Different Scenarios
        </h3>

        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />

            <Line
              type="monotone"
              dataKey="conservative"
              stroke="#22c55e"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="#6366f1"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="aggressive"
              stroke="#ef4444"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}

/* ---------------- HELPERS ---------------- */

function computeChargers(peakEVs) {
  const sessions =
    peakEVs * ASSUMPTIONS.sessionsPerEVPerMonth;
  return Math.ceil(
    sessions / ASSUMPTIONS.sessionsPerChargerPerMonth
  );
}

function computeGridLoad(chargers) {
  const kw =
    chargers *
    ASSUMPTIONS.avgChargerPowerKW *
    ASSUMPTIONS.concurrencyFactor;
  return kw / 1000;
}