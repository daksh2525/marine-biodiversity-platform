"""
model.py — Train Random Forest + XGBoost models for fish abundance prediction.
Run: python model.py
"""
import os, pickle
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
import xgboost as xgb

# ── 1. Load Data ──────────────────────────────────────────────────────────────
df = pd.read_csv("data/fish_data.csv")
print(f"Dataset shape: {df.shape}")
print(df.head())

FEATURES = ["temperature", "salinity", "oxygen", "chlorophyll", "month", "depth"]
TARGET   = "fish_abundance"

X = df[FEATURES]
y = df[TARGET]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ── 2. Random Forest ──────────────────────────────────────────────────────────
print("\n[1/2] Training Random Forest...")
rf = RandomForestRegressor(
    n_estimators=200,
    max_depth=12,
    min_samples_split=5,
    random_state=42,
    n_jobs=-1,
)
rf.fit(X_train, y_train)
rf_pred = rf.predict(X_test)
rf_rmse = np.sqrt(mean_squared_error(y_test, rf_pred))
rf_r2   = r2_score(y_test, rf_pred)
print(f"  RMSE : {rf_rmse:.4f}")
print(f"  R²   : {rf_r2:.4f}")

# ── 3. XGBoost ────────────────────────────────────────────────────────────────
print("\n[2/2] Training XGBoost...")
xgb_model = xgb.XGBRegressor(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    verbosity=0,
)
xgb_model.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    verbose=False,
)
xgb_pred = xgb_model.predict(X_test)
xgb_rmse = np.sqrt(mean_squared_error(y_test, xgb_pred))
xgb_r2   = r2_score(y_test, xgb_pred)
print(f"  RMSE : {xgb_rmse:.4f}")
print(f"  R²   : {xgb_r2:.4f}")

# ── 4. Save Models ────────────────────────────────────────────────────────────
os.makedirs("models", exist_ok=True)
with open("models/rf_model.pkl",  "wb") as f: pickle.dump(rf, f)
with open("models/xgb_model.pkl", "wb") as f: pickle.dump(xgb_model, f)
print("\nModels saved to models/")

# ── 5. Feature Importance Plot ────────────────────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
fig.suptitle("Feature Importance — Fish Abundance Prediction", fontsize=14)

# Random Forest
rf_imp = pd.Series(rf.feature_importances_, index=FEATURES).sort_values()
axes[0].barh(rf_imp.index, rf_imp.values, color="#2196F3")
axes[0].set_title(f"Random Forest  (R²={rf_r2:.3f})")
axes[0].set_xlabel("Importance")

# XGBoost
xgb_imp = pd.Series(xgb_model.feature_importances_, index=FEATURES).sort_values()
axes[1].barh(xgb_imp.index, xgb_imp.values, color="#4CAF50")
axes[1].set_title(f"XGBoost  (R²={xgb_r2:.3f})")
axes[1].set_xlabel("Importance")

plt.tight_layout()
plt.savefig("models/feature_importance.png", dpi=150)
plt.show()
print("Feature importance chart saved.")

# ── 6. Actual vs Predicted Plot ───────────────────────────────────────────────
fig2, axes2 = plt.subplots(1, 2, figsize=(12, 5))
fig2.suptitle("Actual vs Predicted Fish Abundance", fontsize=14)

for ax, pred, label, color in [
    (axes2[0], rf_pred,  "Random Forest", "#2196F3"),
    (axes2[1], xgb_pred, "XGBoost",       "#4CAF50"),
]:
    ax.scatter(y_test, pred, alpha=0.4, s=15, color=color)
    lim = [0, max(y_test.max(), pred.max()) * 1.05]
    ax.plot(lim, lim, "r--", lw=1.5)
    ax.set_xlim(lim); ax.set_ylim(lim)
    ax.set_xlabel("Actual (kg/km²)")
    ax.set_ylabel("Predicted (kg/km²)")
    ax.set_title(label)

plt.tight_layout()
plt.savefig("models/actual_vs_predicted.png", dpi=150)
plt.show()
print("All done.")