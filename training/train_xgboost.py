import pandas as pd
import joblib
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split

from feature_config import FEATURE_COLUMNS, TARGET_COLUMN, DATE_COLUMN

# ---------------------------
# Load data
# ---------------------------
DATA_PATH = "../data/preprocessed_ev_data.csv"
MODEL_PATH = "../models/xgboost_ev_model.pkl"

df = pd.read_csv(DATA_PATH, parse_dates=[DATE_COLUMN])
df = df.sort_values(DATE_COLUMN)

# Drop rows with missing feature values
df = df.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN])

X = df[FEATURE_COLUMNS]
y = df[TARGET_COLUMN]

# ---------------------------
# Time-based train/test split
# ---------------------------
split_date = df[DATE_COLUMN].quantile(0.85)

X_train = X[df[DATE_COLUMN] <= split_date]
X_test  = X[df[DATE_COLUMN] > split_date]

y_train = y[df[DATE_COLUMN] <= split_date]
y_test  = y[df[DATE_COLUMN] > split_date]

print(f"Train size: {X_train.shape}")
print(f"Test size : {X_test.shape}")

# ---------------------------
# XGBoost Model (TUNED)
# ---------------------------
model = xgb.XGBRegressor(
    n_estimators=600,
    max_depth=8,
    learning_rate=0.05,
    subsample=0.85,
    colsample_bytree=0.85,
    objective="reg:squarederror",
    random_state=42,
    n_jobs=-1
)

# Train
model.fit(
    X_train,
    y_train,
    eval_set=[(X_test, y_test)],
    verbose=False
)

# ---------------------------
# Evaluation
# ---------------------------
y_pred = model.predict(X_test)

mae = mean_absolute_error(y_test, y_pred)
mse = mean_squared_error(y_test, y_pred)
rmse = mse ** 0.5
mape = (abs((y_test - y_pred) / y_test).replace([float("inf")], 0)).mean() * 100

print("\n📈 XGBOOST PERFORMANCE")
print(f"MAE  : {mae:.2f}")
print(f"RMSE : {rmse:.2f}")
print(f"MAPE : {mape:.2f}%")


# ---------------------------
# Save model
# ---------------------------
joblib.dump(model, MODEL_PATH)
print(f"\n✅ Model saved to {MODEL_PATH}")
