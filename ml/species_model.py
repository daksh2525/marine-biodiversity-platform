"""
species_model.py
Transfer Learning with MobileNetV2 for fish species classification.
Run: python3 species_model.py
"""

import os, json
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.utils.class_weight import compute_class_weight  # ✅ FIX 3 — added

import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import GlobalAveragePooling2D, Dense, Dropout, BatchNormalization
from tensorflow.keras.models import Model
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from tensorflow.keras.optimizers import Adam

# ── GPU Setup (M1 Mac) ────────────────────────────────────────────────────────
gpus = tf.config.list_physical_devices("GPU")
if gpus:
    try:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
        print(f"✅ Apple Metal GPU enabled: {len(gpus)} device(s)")
    except RuntimeError as e:
        print(f"⚠️  GPU config error: {e}")
else:
    print("⚠️  No GPU found, using CPU (slower)")

# ── Config ────────────────────────────────────────────────────────────────────
IMG_SIZE        = 224
BATCH_SIZE      = 16
EPOCHS_FROZEN   = 15
EPOCHS_FINETUNE = 15
DATA_DIR        = "species_data"
MODEL_PATH      = "models/species_model.keras"
INDEX_PATH      = "models/class_indices.json"
SKIP_CLASSES    = {"Shrimp"}   # not a fish — excluded from training
MIN_IMAGES      = 30           # skip classes with fewer images than this

os.makedirs("models", exist_ok=True)

# ── Print class folders ───────────────────────────────────────────────────────
print("\n📁 Classes found in train/:")
all_classes = sorted(os.listdir(os.path.join(DATA_DIR, "train")))
for cls in all_classes:
    cls_path = os.path.join(DATA_DIR, "train", cls)
    if not os.path.isdir(cls_path):
        continue
    count    = len([f for f in os.listdir(cls_path)
                    if f.lower().endswith((".jpg",".jpeg",".png",".bmp",".webp"))])
    skip_tag = " ← SKIP (not fish)" if cls in SKIP_CLASSES else \
               f" ← SKIP (only {count} images)" if count < MIN_IMAGES else ""
    print(f"   {cls:<25} {count:>5} images{skip_tag}")

# ── Build valid class list ────────────────────────────────────────────────────
valid_classes = [
    c for c in all_classes
    if os.path.isdir(os.path.join(DATA_DIR, "train", c))
    and c not in SKIP_CLASSES
    and len([f for f in os.listdir(os.path.join(DATA_DIR, "train", c))
             if f.lower().endswith((".jpg",".jpeg",".png",".bmp",".webp"))]) >= MIN_IMAGES
]
print(f"\n✅ Using {len(valid_classes)} classes: {valid_classes}")

# ── Data Generators ───────────────────────────────────────────────────────────
# ✅ FIX 1 — Augmentation badaya
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=30,           # 15 → 30
    width_shift_range=0.2,       # 0.1 → 0.2
    height_shift_range=0.2,      # 0.1 → 0.2
    zoom_range=0.25,             # 0.15 → 0.25
    horizontal_flip=True,
    brightness_range=[0.7, 1.3], # [0.85,1.15] → zyada range
    shear_range=0.15,            # ✅ naya add kiya
    fill_mode="nearest",
)
val_datagen = ImageDataGenerator(rescale=1./255)

train_gen = train_datagen.flow_from_directory(
    os.path.join(DATA_DIR, "train"),
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    classes=valid_classes,
    shuffle=True,
)
val_gen = val_datagen.flow_from_directory(
    os.path.join(DATA_DIR, "val"),
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    classes=valid_classes,
    shuffle=False,
)

if train_gen.samples == 0:
    raise ValueError("❌ No training images found! Check species_data/train/")
if val_gen.samples == 0:
    raise ValueError("❌ No validation images found! Check species_data/val/")

NUM_CLASSES = len(train_gen.class_indices)
print(f"\n   Train : {train_gen.samples} images across {NUM_CLASSES} classes")
print(f"   Val   : {val_gen.samples} images")

# Save class indices for Flask API
with open(INDEX_PATH, "w") as f:
    json.dump(train_gen.class_indices, f, indent=2)
print(f"   Saved class indices → {INDEX_PATH}")

# ✅ FIX 3 — Class weights compute karo
class_weights = compute_class_weight(
    class_weight='balanced',
    classes=np.unique(train_gen.classes),
    y=train_gen.classes
)
class_weight_dict = dict(enumerate(class_weights))
print(f"\n   Class weights: {class_weight_dict}")

# ── Build Model ───────────────────────────────────────────────────────────────
base = MobileNetV2(
    input_shape=(IMG_SIZE, IMG_SIZE, 3),
    include_top=False,
    weights="imagenet",
)
base.trainable = False

# ✅ FIX 2 — Dense layers strong kiye
x   = base.output
x   = GlobalAveragePooling2D()(x)
x   = BatchNormalization()(x)
x   = Dense(512, activation="relu")(x)  # 256 → 512
x   = Dropout(0.5)(x)                   # 0.4 → 0.5
x   = Dense(256, activation="relu")(x)  # ✅ naya layer add kiya
x   = Dropout(0.3)(x)                   # ✅ naya layer add kiya
out = Dense(NUM_CLASSES, activation="softmax")(x)

model = Model(inputs=base.input, outputs=out)
print(f"\n   Total params    : {model.count_params():,}")
print(f"   Trainable params: {sum([tf.size(w).numpy() for w in model.trainable_weights]):,}")

# ── Phase 1: Train top layers only (base frozen) ──────────────────────────────
print("\n[Phase 1] Training top layers (base frozen)...")
model.compile(
    optimizer=Adam(learning_rate=1e-3),
    loss="categorical_crossentropy",
    metrics=["accuracy"],
)

h1 = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=EPOCHS_FROZEN,
    class_weight=class_weight_dict,      # ✅ FIX 3 — class weights add kiye
    callbacks=[
        EarlyStopping(patience=5, restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(factor=0.5, patience=3, verbose=1),
    ],
    verbose=1,
)

# ── Phase 2: Fine-tune last 30 layers ────────────────────────────────────────
print("\n[Phase 2] Fine-tuning last 30 layers (very low LR to avoid forgetting)...")
base.trainable = True
for layer in base.layers[:-30]:         # ✅ FIX 4 — 10 → 30 layers
    layer.trainable = False

model.compile(
    optimizer=Adam(learning_rate=2e-5),  # very low LR — critical!
    loss="categorical_crossentropy",
    metrics=["accuracy"],
)

h2 = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=EPOCHS_FINETUNE,
    class_weight=class_weight_dict,      # ✅ FIX 3 — class weights add kiye
    callbacks=[
        EarlyStopping(patience=7, restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(factor=0.3, patience=4, verbose=1),
        ModelCheckpoint(MODEL_PATH, save_best_only=True, verbose=1),
    ],
    verbose=1,
)

# Explicit save as backup
model.save(MODEL_PATH)
print(f"\n✅ Model saved → {MODEL_PATH}")

# ── Evaluation ────────────────────────────────────────────────────────────────
print("\n[Evaluating on validation set...]")
val_gen.reset()
loss, acc = model.evaluate(val_gen, verbose=0)
print(f"   Val Accuracy : {acc * 100:.2f}%")
print(f"   Val Loss     : {loss:.4f}")

val_gen.reset()
y_pred_probs = model.predict(val_gen, verbose=0)
y_pred       = np.argmax(y_pred_probs, axis=1)
y_true       = val_gen.classes
class_names  = list(train_gen.class_indices.keys())

# Only report on labels that appear in y_true
unique_labels = sorted(set(y_true))
unique_names  = [class_names[i] for i in unique_labels]

print("\n📊 Classification Report:")
print(classification_report(y_true, y_pred,
      labels=unique_labels, target_names=unique_names))

# ── Training Curves ───────────────────────────────────────────────────────────
acc_all   = h1.history["accuracy"]     + h2.history["accuracy"]
val_all   = h1.history["val_accuracy"] + h2.history["val_accuracy"]
loss_all  = h1.history["loss"]         + h2.history["loss"]
vloss_all = h1.history["val_loss"]     + h2.history["val_loss"]
epochs_x  = range(1, len(acc_all) + 1)
p2_start  = len(h1.history["accuracy"])

fig, axes = plt.subplots(1, 2, figsize=(14, 5))
fig.suptitle("MobileNetV2 — Fish Species Classifier", fontsize=13)

axes[0].plot(epochs_x, acc_all,  label="Train Acc",  color="#2196F3")
axes[0].plot(epochs_x, val_all,  label="Val Acc",    color="#4CAF50")
axes[0].axvline(p2_start, color="gray", linestyle="--", label="Fine-tune start")
axes[0].set_title("Accuracy"); axes[0].legend(); axes[0].set_xlabel("Epoch")

axes[1].plot(epochs_x, loss_all,  label="Train Loss", color="#F44336")
axes[1].plot(epochs_x, vloss_all, label="Val Loss",   color="#FF9800")
axes[1].axvline(p2_start, color="gray", linestyle="--")
axes[1].set_title("Loss"); axes[1].legend(); axes[1].set_xlabel("Epoch")

plt.tight_layout()
plt.savefig("models/training_curves.png", dpi=150)
plt.show()

# ── Confusion Matrix ──────────────────────────────────────────────────────────
cm = confusion_matrix(y_true, y_pred)
fig2, ax = plt.subplots(figsize=(12, 10))
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
            xticklabels=class_names, yticklabels=class_names, ax=ax)
ax.set_xlabel("Predicted"); ax.set_ylabel("Actual")
ax.set_title(f"Confusion Matrix — Val Accuracy: {acc * 100:.1f}%")
plt.tight_layout()
plt.savefig("models/confusion_matrix.png", dpi=150)
plt.show()

print("\n✅ All done! Run: python3 app.py")