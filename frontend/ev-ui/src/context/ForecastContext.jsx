import { createContext, useContext, useState } from "react";

/**
 * ForecastContext
 * ----------------
 * Holds the latest forecast output and metadata so that
 * post-forecast views (Infrastructure, Insights, etc.)
 * can derive planning metrics from REAL model outputs.
 */

const ForecastContext = createContext(null);

export function ForecastProvider({ children }) {
  // -----------------------------
  // Shared forecast state
  // -----------------------------
  const [forecastSeries, setForecastSeries] = useState(null);
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [horizon, setHorizon] = useState(null);

  const value = {
    // data
    forecastSeries,
    selectedCounty,
    selectedModel,
    horizon,

    // setters (ONLY ForecastTab should use these)
    setForecastSeries,
    setSelectedCounty,
    setSelectedModel,
    setHorizon,
  };

  return (
    <ForecastContext.Provider value={value}>
      {children}
    </ForecastContext.Provider>
  );
}

/**
 * useForecast
 * -----------
 * Read-only access pattern for most components.
 * Infrastructure & AI tabs should ONLY read from this.
 */
export function useForecast() {
  const context = useContext(ForecastContext);
  if (!context) {
    throw new Error("useForecast must be used within ForecastProvider");
  }
  return context;
}
