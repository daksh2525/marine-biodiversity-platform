"""
generate_sample_data.py
Generates a realistic synthetic dataset for training the fish abundance model.
Run this FIRST before model.py.
"""
import numpy as np
import pandas as pd

np.random.seed(42)
N = 2000

# Indian EEZ bounding box (approx)
lat = np.random.uniform(6.0, 23.0, N)
lon = np.random.uniform(68.0, 97.0, N)
month = np.random.randint(1, 13, N)

# Ocean parameters with seasonal variation
sst = 26 + 4 * np.sin((month - 3) * np.pi / 6) + np.random.normal(0, 1.2, N)
salinity = np.random.uniform(30.0, 36.5, N)
oxygen = np.random.uniform(3.5, 8.5, N)
chlorophyll = np.abs(np.random.normal(1.5, 0.8, N))
depth = np.random.uniform(10, 500, N)

# Fish abundance (kg/km²) — non-linear relationship with features
abundance = (
    80
    - 2.5 * (sst - 27) ** 2
    + 12 * chlorophyll
    + 5 * oxygen
    - 0.04 * depth
    + 3 * np.sin(month * np.pi / 6)
    + np.random.normal(0, 8, N)
)
abundance = np.clip(abundance, 0, None)  # no negative fish

df = pd.DataFrame({
    "latitude": lat,
    "longitude": lon,
    "month": month,
    "temperature": sst.round(2),
    "salinity": salinity.round(2),
    "oxygen": oxygen.round(2),
    "chlorophyll": chlorophyll.round(3),
    "depth": depth.round(1),
    "fish_abundance": abundance.round(2),
})

df.to_csv("data/fish_data.csv", index=False)
print(f"Dataset saved: data/fish_data.csv ({N} rows)")
print(df.describe())