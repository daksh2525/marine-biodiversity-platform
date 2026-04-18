import os
import shutil
import random

SOURCE_DIR = "kaggle_raw/extracted/Fish_Dataset/Fish_Dataset"
TARGET_DIR = "species_data"

TRAIN_SPLIT = 0.8

os.makedirs(f"{TARGET_DIR}/train", exist_ok=True)
os.makedirs(f"{TARGET_DIR}/val", exist_ok=True)

for fish in os.listdir(SOURCE_DIR):
    fish_path = os.path.join(SOURCE_DIR, fish)
    
    if not os.path.isdir(fish_path):
        continue
    
    # Inner folder (same name as fish)
    image_folder = os.path.join(fish_path, fish)
    
    if not os.path.exists(image_folder):
        continue
    
    images = [f for f in os.listdir(image_folder) if f.endswith(".png")]
    random.shuffle(images)
    
    split = int(len(images) * TRAIN_SPLIT)
    train_imgs = images[:split]
    val_imgs = images[split:]
    
    os.makedirs(f"{TARGET_DIR}/train/{fish}", exist_ok=True)
    os.makedirs(f"{TARGET_DIR}/val/{fish}", exist_ok=True)
    
    for img in train_imgs:
        shutil.copy(os.path.join(image_folder, img),
                    os.path.join(TARGET_DIR, "train", fish, img))
    
    for img in val_imgs:
        shutil.copy(os.path.join(image_folder, img),
                    os.path.join(TARGET_DIR, "val", fish, img))
    
    print(f"{fish}: {len(train_imgs)} train, {len(val_imgs)} val")

print("\n✅ Dataset ready for training!")