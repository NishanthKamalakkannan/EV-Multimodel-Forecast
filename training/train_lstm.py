import pandas as pd
import numpy as np
import joblib
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping

from feature_config import TARGET_COLUMN, DATE_COLUMN

# ---------------------------
# Config
# ---------------------------
DATA_PATH = "../data/preprocessed_ev_data.csv"
MODEL_PATH = "../models/lstm_ev_model.h5"
SCALER_PATH = "../models/lstm_scaler.pkl"

WINDOW_SIZE = 6          # months
EPOCHS = 50
BATCH_SIZE = 32

# ---------------------------
# Load & prepare data
# ---------------------------
df = pd.read_csv(DATA_PATH, parse_dates=[DATE_COLUMN])
df = df.sort_values(DATE_COLUMN)

values = df[TARGET_COLUMN].values.reshape(-1, 1)

# Scale
scaler = MinMaxScaler()
values_scaled = scaler.fit_transform(values)

# Save scaler
joblib.dump(scaler, SCALER_PATH)

# ---------------------------
# Create sequences
# ---------------------------
X, y = [], []

for i in range(WINDOW_SIZE, len(values_scaled)):
    X.append(values_scaled[i - WINDOW_SIZE:i])
    y.append(values_scaled[i])

X = np.array(X)
y = np.array(y)

# ---------------------------
# Train / test split (time-based)
# ---------------------------
split_idx = int(len(X) * 0.85)

X_train, X_test = X[:split_idx], X[split_idx:]
y_train, y_test = y[:split_idx], y[split_idx:]

print("Train shape:", X_train.shape)
print("Test shape :", X_test.shape)

# ---------------------------
# LSTM model
# ---------------------------
model = Sequential([
    LSTM(64, return_sequences=True, input_shape=(X_train.shape[1], X_train.shape[2])),
    Dropout(0.2),
    LSTM(32),
    Dropout(0.2),
    Dense(1)
])

model.compile(
    optimizer="adam",
    loss="mse"
)

# ---------------------------
# Train
# ---------------------------
early_stop = EarlyStopping(
    monitor="val_loss",
    patience=5,
    restore_best_weights=True
)

model.fit(
    X_train,
    y_train,
    validation_data=(X_test, y_test),
    epochs=EPOCHS,
    batch_size=BATCH_SIZE,
    callbacks=[early_stop],
    verbose=1
)

# ---------------------------
# Evaluation
# ---------------------------
y_pred_scaled = model.predict(X_test)

y_pred = scaler.inverse_transform(y_pred_scaled)
y_true = scaler.inverse_transform(y_test)

mae = mean_absolute_error(y_true, y_pred)
rmse = (mean_squared_error(y_true, y_pred)) ** 0.5
non_zero_mask = y_true != 0
if non_zero_mask.sum() > 0:
    mape = (
        np.abs((y_true[non_zero_mask] - y_pred[non_zero_mask]) /
               y_true[non_zero_mask])
    ).mean() * 100
else:
    mape = None

print("\n📈 LSTM PERFORMANCE")
print(f"MAE  : {mae:.2f}")
print(f"RMSE : {rmse:.2f}")
print(f"MAPE : {mape if mape is not None else 'N/A'}")


# ---------------------------
# Save model
# ---------------------------
model.save("../models/lstm_ev_model.keras")

print(f"\n✅ LSTM model saved to {MODEL_PATH}")
print(f"✅ Scaler saved to {SCALER_PATH}")
