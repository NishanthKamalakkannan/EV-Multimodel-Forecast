import pandas as pd
import numpy as np

from model_loader import (
    load_xgboost,
    load_random_forest,
    load_prophet_models,
    load_lstm,
)

from feature_builder import build_feature_row


def forecast_ev_demand(
    df: pd.DataFrame,
    county: str,
    model_name: str,
    horizon: int = 36,
):
    """
    Forecast EV demand for a given county and model.

    Returns a combined historical + forecast time series
    suitable for frontend line charts.
    """

    # -------------------------------------------------
    # Normalize + filter county (CASE SAFE)
    # -------------------------------------------------
    county_df = (
        df[df["County"].str.lower() == county.lower()]
        .sort_values("Date")
        .reset_index(drop=True)
    )

    if county_df.empty:
        raise ValueError(f"No data found for county: {county}")

    model_name = model_name.lower()

    # -------------------------------------------------
    # HISTORICAL SERIES (last 24 months)
    # -------------------------------------------------
    history_window = 24
    historical_df = county_df.tail(history_window)

    historical_series = [
        {
            "date": row["Date"].strftime("%Y-%m"),
            "historical": int(row["Electric Vehicle (EV) Total"]),
            "forecast": None,
        }
        for _, row in historical_df.iterrows()
    ]

    # -------------------------------------------------
    # SHARED CONTEXT
    # -------------------------------------------------
    last_date = pd.to_datetime(historical_df["Date"].max())
    months_since_start = int(county_df["months_since_start"].max())
    county_encoded = int(county_df["county_encoded"].iloc[0])

    # Rolling windows for recursive forecasting
    historical_values = list(
        historical_df["Electric Vehicle (EV) Total"].values[-6:]
    )
    cumulative_values = list(np.cumsum(historical_values))

    forecast_series = []

    # -------------------------------------------------
    # XGBOOST / RANDOM FOREST
    # -------------------------------------------------
    if model_name in ["xgboost", "random_forest"]:
        model = (
            load_xgboost()
            if model_name == "xgboost"
            else load_random_forest()
        )

        for step in range(1, horizon + 1):
            future_date = last_date + pd.DateOffset(months=step)

            features = build_feature_row(
                historical_values=historical_values,
                cumulative_values=cumulative_values,
                county_encoded=county_encoded,
                months_since_start=months_since_start + step,
                year=future_date.year,
                month=future_date.month,
            )

            pred = model.predict(features)[0]
            pred = max(0, int(round(pred)))

            forecast_series.append({
                "date": future_date.strftime("%Y-%m"),
                "historical": None,
                "forecast": pred,
            })

            # Update rolling windows
            historical_values.append(pred)
            historical_values.pop(0)

            cumulative_values.append(cumulative_values[-1] + pred)
            cumulative_values.pop(0)

    # -------------------------------------------------
    # PROPHET (PER-COUNTY MODELS)
    # -------------------------------------------------
    elif model_name == "prophet":
        prophet_models = load_prophet_models()

        # Case-insensitive lookup
        county_key = next(
            (k for k in prophet_models if k.lower() == county.lower()),
            None
        )

        if county_key is None:
            raise ValueError(f"No Prophet model for county: {county}")

        model = prophet_models[county_key]

        future = model.make_future_dataframe(
            periods=horizon,
            freq="M",
        )

        forecast = model.predict(future).tail(horizon)

        for _, row in forecast.iterrows():
            forecast_series.append({
                "date": row["ds"].strftime("%Y-%m"),
                "historical": None,
                "forecast": int(max(row["yhat"], 0)),
            })

    # -------------------------------------------------
    # LSTM
    # -------------------------------------------------
    elif model_name == "lstm":
        model, scaler = load_lstm()

        values = county_df["Electric Vehicle (EV) Total"].values.reshape(-1, 1)
        values_scaled = scaler.transform(values)

        window = 6
        seq = values_scaled[-window:].copy()

        for step in range(1, horizon + 1):
            pred_scaled = model.predict(
                seq.reshape(1, window, 1),
                verbose=0,
            )[0][0]

            pred = scaler.inverse_transform([[pred_scaled]])[0][0]
            pred = max(0, int(round(pred)))

            future_date = last_date + pd.DateOffset(months=step)

            forecast_series.append({
                "date": future_date.strftime("%Y-%m"),
                "historical": None,
                "forecast": pred,
            })

            # Roll sequence forward
            seq = np.vstack([seq[1:], [[pred_scaled]]])

    else:
        raise ValueError("Invalid model name")

    # -------------------------------------------------
    # FINAL RESPONSE (FRONTEND READY)
    # -------------------------------------------------
    return {
        "series": historical_series + forecast_series,
        "meta": {
            "county": county,
            "model": model_name,
            "horizon": horizon,
            "history_points": len(historical_series),
        },
    }
