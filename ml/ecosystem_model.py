"""
ecosystem_model.py
Marine Ecosystem Health Score — Random Forest + Weighted Scoring
Run: python3 ecosystem_model.py
Output: models/ecosystem_model.pkl + models/ecosystem_scaler.pkl
"""

import os, json, pickle
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (classification_report, confusion_matrix,
                              accuracy_score)

os.makedirs("models", exist_ok=True)

# ── 1. Generate Synthetic Ecosystem Dataset ───────────────────────────────────
# Based on oceanographic research ranges for Indian EEZ waters
np.random.seed(42)
N = 3000

def generate_ecosystem_data(n):
    """
    Generate realistic synthetic ocean ecosystem data.
    Health score is computed from weighted formula, then labelled.
    """
    # Parameter ranges for Indian Ocean / EEZ
    temperature  = np.random.uniform(20, 34, n)      # °C
    salinity     = np.random.uniform(28, 38, n)      # PSU
    dissolved_o2 = np.random.uniform(1.5, 9.5, n)   # mg/L
    chlorophyll  = np.random.uniform(0.1, 8.0, n)   # mg/m³
    ph           = np.random.uniform(7.4, 8.5, n)   # pH
    nitrate      = np.random.uniform(0.1, 30.0, n)  # µmol/L
    fish_index   = np.random.uniform(0, 100, n)      # 0–100 index
    biodiversity = np.random.uniform(0, 100, n)      # 0–100 index

    # ── Weighted health score formula ─────────────────────────────────────────
    # Each parameter normalised to 0–100 (100 = optimal)

    # Dissolved O2: optimal 6–8 mg/L
    o2_score = np.clip(100 - np.abs(dissolved_o2 - 7) * 20, 0, 100)

    # Chlorophyll: optimal 0.5–2.0 mg/m³ (too high = algal bloom)
    chl_score = np.where(
        chlorophyll <= 2.0,
        np.clip(chlorophyll / 2.0 * 100, 0, 100),
        np.clip(100 - (chlorophyll - 2.0) * 15, 0, 100)
    )

    # Temperature: optimal 25–28°C for Indian Ocean
    temp_score = np.clip(100 - np.abs(temperature - 26.5) * 8, 0, 100)

    # Salinity: optimal 33–35 PSU
    sal_score = np.clip(100 - np.abs(salinity - 34) * 10, 0, 100)

    # pH: optimal 8.0–8.3
    ph_score = np.clip(100 - np.abs(ph - 8.15) * 80, 0, 100)

    # Nitrate: lower is better (< 5 µmol/L = healthy)
    nit_score = np.clip(100 - nitrate * 4, 0, 100)

    # Weighted sum
    health_score = (
        0.25 * o2_score   +
        0.20 * chl_score  +
        0.18 * temp_score +
        0.12 * sal_score  +
        0.10 * ph_score   +
        0.08 * nit_score  +
        0.04 * fish_index / 100 * 100 +
        0.03 * biodiversity / 100 * 100
    )
    health_score = np.clip(health_score + np.random.normal(0, 4, n), 0, 100)

    # Category labels
    category = np.where(
        health_score >= 71, "Healthy",
        np.where(health_score >= 41, "Moderate", "Critical")
    )

    return pd.DataFrame({
        "temperature":   temperature.round(2),
        "salinity":      salinity.round(2),
        "dissolved_o2":  dissolved_o2.round(2),
        "chlorophyll":   chlorophyll.round(3),
        "ph":            ph.round(2),
        "nitrate":       nitrate.round(2),
        "fish_index":    fish_index.round(1),
        "biodiversity":  biodiversity.round(1),
        "health_score":  health_score.round(1),
        "category":      category,
    })

df = generate_ecosystem_data(N)
df.to_csv("data/ecosystem_data.csv", index=False)
print(f"✅ Dataset generated: {N} rows")
print(df["category"].value_counts())
print(df.describe().round(2))

# ── 2. Prepare Features ───────────────────────────────────────────────────────
FEATURES = ["temperature","salinity","dissolved_o2","chlorophyll",
            "ph","nitrate","fish_index","biodiversity"]
TARGET   = "category"

X = df[FEATURES]
y = df[TARGET]

le = LabelEncoder()
y_enc = le.fit_transform(y)   # Critical=0, Healthy=1, Moderate=2

X_train, X_test, y_train, y_test = train_test_split(
    X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
)

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

# ── 3. Random Forest ──────────────────────────────────────────────────────────
print("\n[1/2] Training Random Forest...")
rf = RandomForestClassifier(
    n_estimators=300,
    max_depth=10,
    min_samples_split=5,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1,
)
rf.fit(X_train_s, y_train)
rf_pred = rf.predict(X_test_s)
rf_acc  = accuracy_score(y_test, rf_pred)
print(f"  Accuracy : {rf_acc*100:.2f}%")

cv_scores = cross_val_score(rf, X_train_s, y_train, cv=5)
print(f"  CV Score : {cv_scores.mean()*100:.2f}% ± {cv_scores.std()*100:.2f}%")

# ── 4. Gradient Boosting ──────────────────────────────────────────────────────
print("\n[2/2] Training Gradient Boosting...")
gb = GradientBoostingClassifier(
    n_estimators=200,
    learning_rate=0.08,
    max_depth=5,
    random_state=42,
)
gb.fit(X_train_s, y_train)
gb_pred = gb.predict(X_test_s)
gb_acc  = accuracy_score(y_test, gb_pred)
print(f"  Accuracy : {gb_acc*100:.2f}%")

# Use best model
best_model = rf if rf_acc >= gb_acc else gb
best_name  = "RandomForest" if rf_acc >= gb_acc else "GradientBoosting"
print(f"\n✅ Best model: {best_name} ({max(rf_acc, gb_acc)*100:.2f}%)")

# ── 5. Save Models ────────────────────────────────────────────────────────────
with open("models/ecosystem_model.pkl", "wb") as f:
    pickle.dump(best_model, f)
with open("models/ecosystem_scaler.pkl", "wb") as f:
    pickle.dump(scaler, f)
with open("models/ecosystem_labels.json", "w") as f:
    json.dump({"classes": list(le.classes_),
               "features": FEATURES}, f, indent=2)

print("Models saved → models/ecosystem_model.pkl")
print("Scaler saved → models/ecosystem_scaler.pkl")
print("Labels saved → models/ecosystem_labels.json")

# ── 6. Classification Report ──────────────────────────────────────────────────
print("\n📊 Classification Report:")
print(classification_report(y_test, best_model.predict(X_test_s),
                             target_names=le.classes_))

# ── 7. Plots ──────────────────────────────────────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
fig.suptitle(f"Ecosystem Health Model — {best_name}", fontsize=13)

# Feature Importance
imp = pd.Series(best_model.feature_importances_, index=FEATURES).sort_values()
axes[0].barh(imp.index, imp.values, color="#1e90ff")
axes[0].set_title("Feature Importance")
axes[0].set_xlabel("Importance")

# Confusion Matrix
cm = confusion_matrix(y_test, best_model.predict(X_test_s))
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
            xticklabels=le.classes_, yticklabels=le.classes_, ax=axes[1])
axes[1].set_title("Confusion Matrix")
axes[1].set_xlabel("Predicted"); axes[1].set_ylabel("Actual")

plt.tight_layout()
plt.savefig("models/ecosystem_model_report.png", dpi=150)
plt.show()
print("\n✅ Done! Run: python3 app.py")