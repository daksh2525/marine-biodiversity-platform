"""
otolith_model.py
ResNet50 transfer learning for otolith age/stock classification.
Run: python3 otolith_model.py
Output: models/otolith_model.keras + models/otolith_labels.json
"""

import os, json
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix

import tensorflow as tf
from tensorflow.keras.applications import ResNet50
from tensorflow.keras.layers import (GlobalAveragePooling2D, Dense,
                                     Dropout, BatchNormalization)
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from tensorflow.keras.optimizers import Adam

# ── GPU (M1 Mac) ──────────────────────────────────────────────────────────────
gpus = tf.config.list_physical_devices("GPU")
if gpus:
    for gpu in gpus:
        tf.config.experimental.set_memory_growth(gpu, True)
    print(f"✅ GPU enabled: {len(gpus)} device(s)")

# ── Config ────────────────────────────────────────────────────────────────────
IMG_SIZE   = 224
BATCH_SIZE = 16
DATA_DIR   = "otolith_data"
MODEL_PATH = "models/otolith_model.keras"
LABEL_PATH = "models/otolith_labels.json"

os.makedirs("models", exist_ok=True)
os.makedirs(f"{DATA_DIR}/train", exist_ok=True)
os.makedirs(f"{DATA_DIR}/val",   exist_ok=True)

# ── Generate synthetic training data if none exists ───────────────────────────
def generate_synthetic_otolith_data(base_dir, n_per_class=100):
    """
    Creates synthetic grayscale 'otolith-like' images with concentric rings.
    Stock classes: stock_A (young/fast), stock_B (normal), stock_C (old/slow)
    """
    import cv2
    classes = {"stock_A": (2, 4), "stock_B": (5, 7), "stock_C": (8, 12)}
    for split in ["train", "val"]:
        n = n_per_class if split == "train" else n_per_class // 4
        for cls, (min_r, max_r) in classes.items():
            out = os.path.join(base_dir, split, cls)
            os.makedirs(out, exist_ok=True)
            existing = len([f for f in os.listdir(out)
                            if f.endswith(".png")])
            if existing >= n:
                continue
            for i in range(existing, n):
                img  = np.ones((224, 224), dtype=np.uint8) * 40
                cx, cy = 112, 112
                n_rings = np.random.randint(min_r, max_r + 1)
                spacing = 80 // max(n_rings, 1)
                for j in range(1, n_rings + 1):
                    r     = j * spacing + np.random.randint(-2, 3)
                    thick = np.random.choice([1, 2])
                    bright= np.random.randint(150, 230)
                    cv2.circle(img, (cx, cy), r, bright, thick)
                # Add noise
                noise = np.random.normal(0, 15, img.shape).astype(np.int16)
                img   = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
                img_rgb = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
                cv2.imwrite(os.path.join(out, f"otolith_{i:04d}.png"), img_rgb)
    print("✅ Synthetic otolith dataset generated")

# Check if data exists
has_data = any(
    len(os.listdir(os.path.join(DATA_DIR, "train", c))) > 0
    for c in os.listdir(os.path.join(DATA_DIR, "train"))
    if os.path.isdir(os.path.join(DATA_DIR, "train", c))
) if os.path.exists(os.path.join(DATA_DIR, "train")) else False

if not has_data:
    print("⚠️  No otolith data found — generating synthetic dataset...")
    generate_synthetic_otolith_data(DATA_DIR, n_per_class=200)

# ── Data Generators ───────────────────────────────────────────────────────────
train_gen = ImageDataGenerator(
    rescale=1./255, rotation_range=30, zoom_range=0.2,
    horizontal_flip=True, vertical_flip=True,
    brightness_range=[0.7, 1.3], fill_mode="nearest",
).flow_from_directory(
    f"{DATA_DIR}/train", target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE, class_mode="categorical", shuffle=True,
)
val_gen = ImageDataGenerator(rescale=1./255).flow_from_directory(
    f"{DATA_DIR}/val", target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE, class_mode="categorical", shuffle=False,
)

NUM_CLASSES = len(train_gen.class_indices)
print(f"\n✅ Classes ({NUM_CLASSES}): {list(train_gen.class_indices.keys())}")
print(f"   Train: {train_gen.samples} | Val: {val_gen.samples}")

with open(LABEL_PATH, "w") as f:
    json.dump({"classes": train_gen.class_indices,
               "idx_to_class": {str(v): k for k, v in train_gen.class_indices.items()}}, f, indent=2)

# ── Build ResNet50 Model ──────────────────────────────────────────────────────
base = ResNet50(input_shape=(IMG_SIZE, IMG_SIZE, 3),
                include_top=False, weights="imagenet")
base.trainable = False

x   = GlobalAveragePooling2D()(base.output)
x   = BatchNormalization()(x)
x   = Dense(256, activation="relu")(x)
x   = Dropout(0.4)(x)
out = Dense(NUM_CLASSES, activation="softmax")(x)
model = Model(inputs=base.input, outputs=out)

# ── Phase 1: Frozen base ──────────────────────────────────────────────────────
print("\n[Phase 1] Training top layers...")
model.compile(optimizer=Adam(1e-3), loss="categorical_crossentropy", metrics=["accuracy"])
h1 = model.fit(train_gen, validation_data=val_gen, epochs=15,
               callbacks=[EarlyStopping(patience=5, restore_best_weights=True),
                          ReduceLROnPlateau(patience=3)], verbose=1)

# ── Phase 2: Fine-tune last 10 layers ────────────────────────────────────────
print("\n[Phase 2] Fine-tuning...")
base.trainable = True
for layer in base.layers[:-10]:
    layer.trainable = False

model.compile(optimizer=Adam(2e-5), loss="categorical_crossentropy", metrics=["accuracy"])
h2 = model.fit(train_gen, validation_data=val_gen, epochs=15,
               callbacks=[EarlyStopping(patience=7, restore_best_weights=True),
                          ReduceLROnPlateau(patience=4),
                          ModelCheckpoint(MODEL_PATH, save_best_only=True)], verbose=1)

model.save(MODEL_PATH)
print(f"\n✅ Model saved → {MODEL_PATH}")

# ── Evaluation ────────────────────────────────────────────────────────────────
val_gen.reset()
loss, acc = model.evaluate(val_gen, verbose=0)
print(f"   Val Accuracy: {acc*100:.2f}%")

val_gen.reset()
y_pred = np.argmax(model.predict(val_gen, verbose=0), axis=1)
y_true = val_gen.classes
names  = list(train_gen.class_indices.keys())
print(classification_report(y_true, y_pred, target_names=names))

# ── Plots ─────────────────────────────────────────────────────────────────────
acc_all  = h1.history["accuracy"]     + h2.history["accuracy"]
val_all  = h1.history["val_accuracy"] + h2.history["val_accuracy"]

fig, axes = plt.subplots(1, 2, figsize=(14, 5))
fig.suptitle("ResNet50 — Otolith Stock Classifier")
axes[0].plot(acc_all, label="Train"); axes[0].plot(val_all, label="Val")
axes[0].axvline(len(h1.history["accuracy"]), color="gray", linestyle="--")
axes[0].set_title("Accuracy"); axes[0].legend()

cm = confusion_matrix(y_true, y_pred)
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
            xticklabels=names, yticklabels=names, ax=axes[1])
axes[1].set_title("Confusion Matrix")
plt.tight_layout()
plt.savefig("models/otolith_report.png", dpi=150)
plt.show()
print("✅ Done! Run: python3 app.py")