import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
} from "recharts";

export default function ForecastChart({ data }) {
  if (!data || data.length === 0) return null;

  // Policy shock controls
  const [policyShockEnabled, setPolicyShockEnabled] = useState(false);
  const [shockStartIndex, setShockStartIndex] = useState(6); // months ahead
  const [shockStrength, setShockStrength] = useState(0.04); // 4% monthly

  const RESIDUAL_STD = 0.3; // from RMSE scale (same unit as EV count)
  const Z = 1.96;           // for ~95% confidence interval

  // Add confidence bands + policy shock
  const chartData = data.map((d, i) => {
    const base = { ...d };

    // Confidence bands (only for forecast points)
    if (typeof d.forecast === "number") {
      base.upper = d.forecast + Z * RESIDUAL_STD;
      base.lower = Math.max(0, d.forecast - Z * RESIDUAL_STD);
    }

    // Apply policy shock (cumulative monthly growth after start index)
    if (policyShockEnabled && typeof d.forecast === "number" && i >= shockStartIndex) {
      const monthsAfterShock = i - shockStartIndex + 1;
      const multiplier = 1 + shockStrength * monthsAfterShock;
      base.shocked = d.forecast * multiplier;
    }

    return base;
  });

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h2 className="text-lg font-semibold mb-4">
        Historical vs Forecasted EV Demand
      </h2>

      {/* Policy Shock Controls */}
      <div className="flex flex-wrap items-center gap-6 text-sm mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={policyShockEnabled}
            onChange={(e) => setPolicyShockEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="font-medium">Apply policy shock</span>
        </label>

        {policyShockEnabled && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-slate-600">Start after:</label>
              <input
                type="number"
                min="0"
                max={data.length - 1}
                value={shockStartIndex}
                onChange={(e) => setShockStartIndex(Math.max(0, Number(e.target.value)))}
                className="w-20 px-2 py-1 border border-slate-300 rounded-md text-sm"
              />
              <span className="text-slate-500">months</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-slate-600">Monthly impact:</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="0.5"
                value={shockStrength}
                onChange={(e) => setShockStrength(Number(e.target.value))}
                className="w-20 px-2 py-1 border border-slate-300 rounded-md text-sm"
              />
              <span className="text-slate-500">% cumulative</span>
            </div>
          </>
        )}
      </div>

      <LineChart
        width={1100}
        height={420}
        data={chartData}
        margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" />

        <XAxis dataKey="date" />
        <YAxis />

        <Tooltip />
        <Legend />

        {/* Confidence bands (behind lines) */}
        <Area
          type="monotone"
          dataKey="upper"
          stroke="none"
          fill="#fb7185"
          fillOpacity={0.15}
        />
        <Area
          type="monotone"
          dataKey="lower"
          stroke="none"
          fill="#fb7185"
          fillOpacity={0.15}
        />

        {/* Historical line */}
        <Line
          type="monotone"
          dataKey="historical"
          stroke="#2563eb"
          strokeWidth={3}
          dot={false}
          connectNulls
          name="Historical"
        />

        {/* Forecast line */}
        <Line
          type="monotone"
          dataKey="forecast"
          stroke="#f97316"
          strokeWidth={3}
          strokeDasharray="6 4"
          dot={false}
          connectNulls
          name="Forecast"
        />

        {/* Policy Shock Scenario (only when enabled) */}
        {policyShockEnabled && (
          <Line
            type="monotone"
            dataKey="shocked"
            stroke="#10b981"
            strokeWidth={2.5}
            strokeDasharray="8 4"
            dot={false}
            connectNulls
            name="Policy Shock Scenario"
          />
        )}
      </LineChart>

      {/* Explanatory notes */}
      <div className="mt-4 text-xs text-slate-500 space-y-1">
        <p>
          Shaded region represents an approximate 95% confidence interval derived from
          historical model residuals. Mean forecast remains unchanged.
        </p>
        {policyShockEnabled && (
          <p className="text-emerald-700">
            Policy shock applies cumulative {shockStrength * 100}% monthly growth starting
            after month {shockStartIndex}.
          </p>
        )}
      </div>
    </div>
  );
}