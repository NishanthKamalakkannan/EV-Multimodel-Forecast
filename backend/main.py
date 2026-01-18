from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import pandas as pd

from forecasting import forecast_ev_demand

# -------------------------------------------------
# Create FastAPI app FIRST
# -------------------------------------------------
app = FastAPI(
    title="EV Demand Forecasting API",
    description="AI-based EV demand forecasting with multiple models",
    version="1.0"
)

# -------------------------------------------------
# CORS (for React later)
# -------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# Load dataset ONCE
# -------------------------------------------------
DATA_PATH = "../data/preprocessed_ev_data.csv"

try:
    df = pd.read_csv(DATA_PATH, parse_dates=["Date"])
except Exception as e:
    df = None
    print("❌ Failed to load dataset:", e)

# -------------------------------------------------
# Schemas
# -------------------------------------------------
class ForecastRequest(BaseModel):
    county: str
    model_name: str   # xgboost | random_forest | prophet | lstm
    horizon: int = 36

# -------------------------------------------------
# Routes
# -------------------------------------------------
@app.get("/")
def root():
    return {"message": "EV Demand Forecasting API is running"}

@app.get("/counties", response_model=List[str])
def get_counties():
    if df is None:
        raise HTTPException(status_code=500, detail="Dataset not loaded")

    counties = sorted(df["County"].dropna().unique().tolist())
    return counties

@app.get("/models")
def get_models():
    """
    List available forecasting models.
    Used by frontend to populate model selector.
    """
    return [
        "xgboost",
        "random_forest",
        "prophet",
        "lstm"
    ]

@app.get("/metrics")
def get_metrics():
    """
    Return precomputed evaluation metrics for all models.
    Used by frontend for KPI cards and model comparison.
    """
    return {
        "xgboost": {
            "MAE": 0.06,
            "RMSE": 0.30,
            "MAPE": 1.84
        },
        "random_forest": {
            "MAE": 0.06,
            "RMSE": 0.60,
            "MAPE": 2.44
        },
        "prophet": {
            "MAE": 0.68,
            "RMSE": 0.76,
            "MAPE": 37.02
        },
        "lstm": {
            "MAE": 1.26,
            "RMSE": 2.00,
            "MAPE": 67.30
        }
    }

@app.post("/forecast")
def forecast(request: ForecastRequest):
    if df is None:
        raise HTTPException(status_code=500, detail="Dataset not loaded")

    try:
        results = forecast_ev_demand(
            df=df,
            county=request.county,
            model_name=request.model_name.lower(),
            horizon=request.horizon
        )

        return {
            "county": request.county,
            "model": request.model_name,
            "horizon": request.horizon,
            "forecast": results
        }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------
# NEW ENDPOINT: /insights
# -------------------------------------------------
from pydantic import BaseModel
from typing import List, Dict, Any

class InsightsRequest(BaseModel):
    county: str
    model: str
    horizon: int
    forecast_series: List[Dict[str, Any]]

@app.post("/insights")
def generate_insights(payload: InsightsRequest):
    series = [d for d in payload.forecast_series if d.get("forecast") is not None]

    if not series:
        return {"error": "No forecast data available"}

    peak_point = max(series, key=lambda x: x["forecast"])
    peak_evs = peak_point["forecast"]
    peak_month = peak_point["date"]

    early = series[0]["forecast"]
    late = series[-1]["forecast"]

    if late > early * 1.2:
        growth = "strong upward"
    elif late > early:
        growth = "moderate upward"
    else:
        growth = "stable"

    return {
        "mode": "deterministic",
        "summary": (
            f"EV demand in {payload.county} is projected to follow a "
            f"{growth} growth trajectory over the next {payload.horizon} months, "
            f"with peak demand expected around {peak_month}."
        ),
        "observations": [
            f"Peak forecasted EV demand reaches approximately {round(peak_evs, 2)} vehicles.",
            f"The selected {payload.model} model captures consistent growth patterns.",
            "Demand growth remains steady without abrupt volatility."
        ],
        "recommendations": [
            "Align infrastructure expansion ahead of the projected peak period.",
            "Use scenario analysis to stress-test aggressive adoption cases.",
            "Update planning assumptions as new forecast data becomes available."
        ]
    }