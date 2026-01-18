import pandas as pd
import pickle
import numpy as np
import warnings

from prophet import Prophet
from sklearn.metrics import mean_absolute_error, mean_squared_error
from feature_config import TARGET_COLUMN, DATE_COLUMN

# ---------------------------
# Config
# ---------------------------
DATA_PATH = "../data/preprocessed_ev_data.csv"
MODEL_PATH = "../models/prophet_models.pkl"

# Optional: silence noisy future warnings (safe)
warnings.filterwarnings("ignore", category=FutureWarning)

# ---------------------------
# Load data
# ---------------------------
df = pd.read_csv(DATA_PATH, parse_dates=[DATE_COLUMN])

models = {}
metrics = []

# ---------------------------
# Train one Prophet model per county
# ---------------------------
for county, county_df in df.groupby("County"):
    county_df = county_df.sort_values(DATE_COLUMN)

    # Skip very short time series
    if len(county_df) < 24:
        continue

    prophet_df = county_df[[DATE_COLUMN, TARGET_COLUMN]].rename(
        columns={DATE_COLUMN: "ds", TARGET_COLUMN: "y"}
    )

    # Time-based split (last 12 months for testing)
    train_df = prophet_df.iloc[:-12]
    test_df = prophet_df.iloc[-12:]

    # Prophet model
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False
    )

    model.fit(train_df)

    # Forecast next 12 months
    future = model.make_future_dataframe(periods=12, freq="M")
    forecast = model.predict(future)

    y_true = test_df["y"].values
    y_pred = forecast.iloc[-12:]["yhat"].values

    # ---------------------------
    # Metrics (SAFE)
    # ---------------------------
    mae = mean_absolute_error(y_true, y_pred)
    rmse = (mean_squared_error(y_true, y_pred)) ** 0.5

    # Safe MAPE (ignore zero actuals)
    non_zero_mask = y_true != 0
    if non_zero_mask.sum() > 0:
        mape = (
            np.abs((y_true[non_zero_mask] - y_pred[non_zero_mask]) /
                   y_true[non_zero_mask])
        ).mean() * 100
    else:
        mape = np.nan  # undefined but safe

    metrics.append({
        "County": county,
        "MAE": mae,
        "RMSE": rmse,
        "MAPE": mape
    })

    models[county] = model

# ---------------------------
# Save all county models
# ---------------------------
with open(MODEL_PATH, "wb") as f:
    pickle.dump(models, f)

# ---------------------------
# Aggregate performance
# ---------------------------
metrics_df = pd.DataFrame(metrics)

print("\n📈 PROPHET PERFORMANCE (AVERAGE)")
print(metrics_df[["MAE", "RMSE", "MAPE"]].mean(skipna=True))

print(f"\n✅ Prophet models saved to {MODEL_PATH}")
