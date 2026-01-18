import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

from feature_config import FEATURE_COLUMNS, TARGET_COLUMN, DATE_COLUMN

# ---------------------------
# Load data
# ---------------------------
DATA_PATH = "../data/preprocessed_ev_data.csv"
MODEL_PATH = "../models/random_forest_ev_model.pkl"

df = pd.read_csv(DATA_PATH, parse_dates=[DATE_COLUMN])
df = df.sort_values(DATE_COLUMN)

df = df.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN])

X = df[FEATURE_COLUMNS]
y = df[TARGET_COLUMN]

# ---------------------------
# Time-based split
# ---------------------------
split_date = df[DATE_COLUMN].quantile(0.85)

X_train = X[df[DATE_COLUMN] <= split_date]
X_test  = X[df[DATE_COLUMN] > split_date]

y_train = y[df[DATE_COLUMN] <= split_date]
y_test  = y[df[DATE_COLUMN] > split_date]

# ---------------------------
# Random Forest Model
# ---------------------------
rf = RandomForestRegressor(
    n_estimators=400,
    max_depth=18,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)

rf.fit(X_train, y_train)

# ---------------------------
# Evaluation
# ---------------------------
y_pred = rf.predict(X_test)

mae = mean_absolute_error(y_test, y_pred)
mse = mean_squared_error(y_test, y_pred)
rmse = mse ** 0.5
mape = (abs((y_test - y_pred) / y_test).replace([float("inf")], 0)).mean() * 100

print("\n📈 RANDOM FOREST PERFORMANCE")
print(f"MAE  : {mae:.2f}")
print(f"RMSE : {rmse:.2f}")
print(f"MAPE : {mape:.2f}%")

# ---------------------------
# Save model
# ---------------------------
joblib.dump(rf, MODEL_PATH)
print(f"\n✅ Model saved to {MODEL_PATH}")
