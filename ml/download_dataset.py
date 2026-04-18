"""
download_dataset.py
Auto-downloads fish images using icrawler (free, no API key needed).
Run: pip install icrawler
     python download_dataset.py
"""
import os
from icrawler.builtin import GoogleImageCrawler, BingImageCrawler

SPECIES = {
    "rohu":            "Labeo rohita fish",
    "catla":           "Catla catla fish India",
    "hilsa":           "Hilsa fish Tenualosa ilisha",
    "indian_mackerel": "Indian Mackerel Rastrelliger kanagurta",
    "pomfret":         "Silver Pomfret fish India",
    "sardine":         "Indian oil sardine fish",
    "snapper":         "Red Snapper fish",
    "tuna":            "Yellowfin Tuna fish",
    "grouper":         "Grouper fish Epinephelus",
    "seer_fish":       "Seer fish Scomberomorus India",
}

IMAGES_PER_CLASS = 150   # increase to 300+ for better accuracy
SPLITS = {"train": IMAGES_PER_CLASS, "val": 40}

for split, count in SPLITS.items():
    for folder, query in SPECIES.items():
        save_dir = f"species_data/{split}/{folder}"
        os.makedirs(save_dir, exist_ok=True)

        existing = len([f for f in os.listdir(save_dir)
                        if f.lower().endswith((".jpg",".jpeg",".png"))])
        if existing >= count:
            print(f"✅ Skipping {split}/{folder} ({existing} images already)")
            continue

        print(f"📥 Downloading {count} images → {save_dir}")
        try:
            crawler = GoogleImageCrawler(storage={"root_dir": save_dir})
            crawler.crawl(keyword=query, max_num=count)
        except Exception as e:
            print(f"  Google failed ({e}), trying Bing...")
            crawler = BingImageCrawler(storage={"root_dir": save_dir})
            crawler.crawl(keyword=query, max_num=count)

        downloaded = len([f for f in os.listdir(save_dir)
                          if f.lower().endswith((".jpg",".jpeg",".png"))])
        print(f"  ✔ {downloaded} images in {save_dir}")

print("\n✅ Dataset download complete!")
print("Now run: python species_model.py")