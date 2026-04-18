"""
setup_kaggle_dataset.py
Downloads the Large Scale Fish Dataset from Kaggle and reorganizes
it into the train/val folder structure needed by species_model.py.

Steps:
  1. pip install kaggle
  2. Get your Kaggle API key from https://www.kaggle.com/settings → API → Create New Token
  3. Place kaggle.json at ~/.kaggle/kaggle.json
  4. chmod 600 ~/.kaggle/kaggle.json
  5. python setup_kaggle_dataset.py
"""
import os, shutil, zipfile, random
from pathlib import Path

# ── Step 1: Download from Kaggle ──────────────────────────────────────────────
print("📥 Downloading Large Scale Fish Dataset from Kaggle...")
os.system("kaggle datasets download -d crowww/a-large-scale-fish-dataset -p ./kaggle_raw")

# ── Step 2: Unzip ─────────────────────────────────────────────────────────────
zip_path = "./kaggle_raw/a-large-scale-fish-dataset.zip"
if os.path.exists(zip_path):
    print("📦 Unzipping...")
    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall("./kaggle_raw/extracted")
    print("✅ Unzipped")
else:
    print("❌ ZIP not found. Check if download succeeded.")
    exit(1)

# ── Step 3: Map Kaggle classes → our species keys ─────────────────────────────
# Kaggle dataset has 9 classes — we map them to our keys
# Full list: https://www.kaggle.com/datasets/crowww/a-large-scale-fish-dataset
KAGGLE_TO_KEY = {
    "Gilt-Head Bream":          "snapper",       # similar reef fish
    "Red Sea Bream":            "snapper",
    "Sea Bass":                 "seer_fish",
    "Red Mullet":               "sardine",
    "Horse Mackerel":           "indian_mackerel",
    "Black Sea Sprat":          "sardine",
    "Striped Red Mullet":       "sardine",
    "Trout":                    "rohu",
    "Shrimp":                   None,             # skip — not a fish
}

# ── Step 4: Build train/val structure ────────────────────────────────────────
TRAIN_SPLIT = 0.80
SPECIES_KEYS = [
    "rohu", "catla", "hilsa", "indian_mackerel",
    "pomfret", "sardine", "snapper", "tuna", "grouper", "seer_fish"
]

for key in SPECIES_KEYS:
    os.makedirs(f"species_data/train/{key}", exist_ok=True)
    os.makedirs(f"species_data/val/{key}",   exist_ok=True)

# Find all image folders in extracted data
extracted_root = Path("./kaggle_raw/extracted")
img_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

copied = {k: 0 for k in SPECIES_KEYS}

for folder in sorted(extracted_root.rglob("*")):
    if not folder.is_dir():
        continue
    folder_name = folder.name

    # Match to our species key
    target_key = None
    for kaggle_name, key in KAGGLE_TO_KEY.items():
        if kaggle_name.lower() in folder_name.lower() and key:
            target_key = key
            break

    if not target_key:
        continue

    images = [f for f in folder.iterdir() if f.suffix.lower() in img_extensions]
    if not images:
        continue

    random.shuffle(images)
    split_idx = int(len(images) * TRAIN_SPLIT)
    train_imgs = images[:split_idx]
    val_imgs   = images[split_idx:]

    for img in train_imgs:
        dst = f"species_data/train/{target_key}/{img.name}"
        if not os.path.exists(dst):
            shutil.copy2(img, dst)
            copied[target_key] += 1

    for img in val_imgs:
        dst = f"species_data/val/{target_key}/{img.name}"
        if not os.path.exists(dst):
            shutil.copy2(img, dst)

# ── Step 5: Report ────────────────────────────────────────────────────────────
print("\n📊 Dataset Summary:")
print(f"{'Species':<20} {'Train':>8} {'Val':>8}")
print("-" * 38)
total_train = total_val = 0
for key in SPECIES_KEYS:
    t = len(list(Path(f"species_data/train/{key}").glob("*.*")))
    v = len(list(Path(f"species_data/val/{key}").glob("*.*")))
    total_train += t; total_val += v
    status = "✅" if t >= 50 else "⚠️ low"
    print(f"{key:<20} {t:>8} {v:>8}  {status}")
print("-" * 38)
print(f"{'TOTAL':<20} {total_train:>8} {total_val:>8}")

print("\n⚠️  Classes with < 50 train images may need manual images added.")
print("📁 Add extra images manually to species_data/train/<class>/")
print("\n✅ Done! Now run: python species_model.py")