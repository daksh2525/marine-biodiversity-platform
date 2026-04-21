"""
otolith_processor.py
OpenCV-based ring detection pipeline for otolith images.
Returns: ring_count, age_estimate, annotated_image (base64)
"""

import cv2
import numpy as np
import base64
from scipy.signal import savgol_filter, find_peaks

def preprocess_otolith(img_array):
    """Convert to grayscale, denoise with Gaussian, enhance contrast with CLAHE."""
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    else:
        gray = img_array.copy()

    # Gaussian blur for denoising (no PyWavelets needed)
    denoised = cv2.GaussianBlur(gray, (5, 5), 0)

    # CLAHE contrast enhancement
    clahe    = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)

    return enhanced

def detect_rings(enhanced):
    """Detect growth rings using edge detection + Hough circles."""
    # Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(enhanced, (5, 5), 0)

    # Canny edge detection
    edges = cv2.Canny(blurred, threshold1=30, threshold2=100)

    # Morphological closing to connect broken ring edges
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)

    # Find center of otolith (largest bright region)
    _, thresh = cv2.threshold(enhanced, 0, 255,
                               cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL,
                                    cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        largest   = max(contours, key=cv2.contourArea)
        M         = cv2.moments(largest)
        cx = int(M["m10"] / M["m00"]) if M["m00"] != 0 else enhanced.shape[1] // 2
        cy = int(M["m01"] / M["m00"]) if M["m00"] != 0 else enhanced.shape[0] // 2
    else:
        cx, cy = enhanced.shape[1] // 2, enhanced.shape[0] // 2

    # Radial profile — detect intensity dips (ring boundaries)
    max_r   = min(cx, cy, enhanced.shape[1] - cx, enhanced.shape[0] - cy) - 5
    profile = []
    for r in range(5, max_r):
        angles  = np.linspace(0, 2 * np.pi, max(12, r))
        pts_x   = (cx + r * np.cos(angles)).astype(int)
        pts_y   = (cy + r * np.sin(angles)).astype(int)
        pts_x   = np.clip(pts_x, 0, enhanced.shape[1] - 1)
        pts_y   = np.clip(pts_y, 0, enhanced.shape[0] - 1)
        profile.append(np.mean(enhanced[pts_y, pts_x]))

    profile = np.array(profile)

    # Smooth the profile
    if len(profile) > 11:
        smooth = savgol_filter(profile, window_length=11, polyorder=3)
    else:
        smooth = profile

    # Find local minima (ring boundaries = dark bands)
    min_spacing = max(3, max_r // 25)
    valleys, _  = find_peaks(-smooth, distance=min_spacing, prominence=2)

    ring_radii = [v + 5 for v in valleys]   # offset back to actual radii
    ring_count = len(ring_radii)

    return ring_count, ring_radii, (cx, cy), closed

def annotate_image(img_array, ring_radii, center):
    """Draw colored rings on the original image."""
    annotated = img_array.copy()
    if len(annotated.shape) == 2:
        annotated = cv2.cvtColor(annotated, cv2.COLOR_GRAY2BGR)
    elif annotated.shape[2] == 4:
        annotated = cv2.cvtColor(annotated, cv2.COLOR_RGBA2BGR)

    cx, cy = center
    colors = [
        (0, 255, 0),    # green
        (0, 165, 255),  # orange
        (0, 0, 255),    # red
        (255, 0, 0),    # blue
        (0, 255, 255),  # yellow
    ]

    for i, r in enumerate(ring_radii):
        color = colors[i % len(colors)]
        cv2.circle(annotated, (cx, cy), r, color, 2)
        # Label every other ring
        if i % 2 == 0:
            lx = int(cx + r * 0.7)
            ly = int(cy - r * 0.7)
            lx = np.clip(lx, 10, annotated.shape[1] - 30)
            ly = np.clip(ly, 10, annotated.shape[0] - 10)
            cv2.putText(annotated, str(i + 1), (lx, ly),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

    # Draw center point
    cv2.circle(annotated, (cx, cy), 4, (255, 255, 255), -1)

    # Add ring count label
    cv2.putText(annotated, f"Rings: {len(ring_radii)}", (10, 25),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

    return annotated

def compute_growth_rate(ring_radii):
    """Estimate growth rate from ring spacing."""
    if len(ring_radii) < 2:
        return "Unknown", []
    spacings = np.diff(ring_radii)
    avg      = np.mean(spacings)
    if avg > 15:   return "Fast",   spacings.tolist()
    if avg > 7:    return "Normal", spacings.tolist()
    return "Slow", spacings.tolist()

def image_to_base64(img_array):
    """Convert numpy image array to base64 PNG string."""
    if img_array.dtype != np.uint8:
        img_array = (img_array * 255).astype(np.uint8)
    _, buf = cv2.imencode(".png", img_array)
    return base64.b64encode(buf).decode("utf-8")

def analyze_otolith(file_bytes):
    """
    Full pipeline: bytes → preprocess → detect → annotate → return results.
    Returns dict with all results.
    """
    import io
    from PIL import Image as PILImage

    # Decode image
    img    = PILImage.open(io.BytesIO(file_bytes)).convert("RGB")
    orig   = np.array(img)

    # Resize to standard size for consistent ring detection
    h, w   = orig.shape[:2]
    scale  = 600 / max(h, w)
    if scale < 1:
        orig = cv2.resize(orig, (int(w * scale), int(h * scale)))

    # Pipeline
    enhanced               = preprocess_otolith(orig)
    ring_count, ring_radii, center, edges = detect_rings(enhanced)
    growth_rate, spacings  = compute_growth_rate(ring_radii)
    annotated              = annotate_image(orig, ring_radii, center)

    # Age = ring count (each ring ≈ 1 year in most species)
    age_years = max(1, ring_count)

    # Stock ID based on growth pattern
    if growth_rate == "Fast" and age_years <= 3:
        stock_id = "A"   # young, fast-growing stock
    elif growth_rate == "Slow" or age_years >= 8:
        stock_id = "C"   # old / slow stock
    else:
        stock_id = "B"   # normal

    return {
        "ring_count":       ring_count,
        "age_years":        age_years,
        "growth_rate":      growth_rate,
        "stock_id":         stock_id,
        "ring_spacings":    spacings,
        "annotated_image":  image_to_base64(annotated),
        "original_image":   image_to_base64(cv2.cvtColor(orig, cv2.COLOR_RGB2BGR)),
    }