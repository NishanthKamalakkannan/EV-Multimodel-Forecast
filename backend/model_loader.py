import joblib
import pickle
import tensorflow as tf
from pathlib import Path

# ---------------------------
# Paths
# ---------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

XGB_PATH = BASE_DIR / "models" / "xgboost_ev_model.pkl"
RF_PATH = BASE_DIR / "models" / "random_forest_ev_model.pkl"
PROPHET_PATH = BASE_DIR / "models" / "prophet_models.pkl"
LSTM_PATH = BASE_DIR / "models" / "lstm_ev_model.h5"
LSTM_SCALER_PATH = BASE_DIR / "models" / "lstm_scaler.pkl"

# ---------------------------
# Cached models
# ---------------------------
_xgb_model = None
_rf_model = None
_prophet_models = None
_lstm_model = None
_lstm_scaler = None


# ---------------------------
# Tree-based models
# ---------------------------
def load_xgboost():
    global _xgb_model
    if _xgb_model is None:
        _xgb_model = joblib.load(XGB_PATH)
    return _xgb_model


def load_random_forest():
    global _rf_model
    if _rf_model is None:
        _rf_model = joblib.load(RF_PATH)
    return _rf_model


# ---------------------------
# Prophet (per-county models)
# ---------------------------
def load_prophet_models():
    global _prophet_models
    if _prophet_models is None:
        with open(PROPHET_PATH, "rb") as f:
            _prophet_models = pickle.load(f)
    return _prophet_models


def load_prophet(county: str):
    """
    Return Prophet model for a specific county
    """
    models = load_prophet_models()

    if county not in models:
        raise ValueError(f"No Prophet model found for county: {county}")

    return models[county]


# ---------------------------
# LSTM
# ---------------------------
def load_lstm():
    global _lstm_model, _lstm_scaler
    if _lstm_model is None:
        _lstm_model = tf.keras.models.load_model(LSTM_PATH, compile=False)
        _lstm_scaler = joblib.load(LSTM_SCALER_PATH)
    return _lstm_model, _lstm_scaler


# ---------------------------
# Debug test
# ---------------------------
if __name__ == "__main__":
    print(load_xgboost())
    print(load_random_forest())
    print(len(load_prophet_models()))
    print(load_lstm()[0])
