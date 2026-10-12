"""
augmentations.py
Realistic image degradation transformations for training robust edge models
and benchmarking model stability (Experiment E8).
"""

import io
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

def apply_jpeg_compression(img: Image.Image, quality: int = 50) -> Image.Image:
    """Simulates WhatsApp/messaging recompression artifacts."""
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    buf.seek(0)
    return Image.open(buf)

def apply_blur(img: Image.Image, radius: float = 1.5) -> Image.Image:
    """Simulates camera defocus and slight hand shake."""
    return img.filter(ImageFilter.GaussianBlur(radius=radius))

def apply_low_light_noise(img: Image.Image, brightness_factor: float = 0.5, noise_std: float = 8.0) -> Image.Image:
    """Simulates indoor/shadow lighting and mobile sensor noise."""
    enhancer = ImageEnhance.Brightness(img)
    dim_img = enhancer.enhance(brightness_factor)
    arr = np.array(dim_img, dtype=np.float32)
    noise = np.random.normal(0, noise_std, arr.shape)
    noisy_arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(noisy_arr)

def apply_downscale_upscale(img: Image.Image, scale_factor: float = 0.25) -> Image.Image:
    """Simulates low-resolution sensors and forwarded thumbnails."""
    w, h = img.size
    small_w = max(16, int(w * scale_factor))
    small_h = max(16, int(h * scale_factor))
    downscaled = img.resize((small_w, small_h), Image.Resampling.BILINEAR)
    return downscaled.resize((w, h), Image.Resampling.BILINEAR)

def apply_random_degradation(img: Image.Image, rng=np.random) -> Image.Image:
    """Applies a random mixture of realistic field degradations for training augmentation."""
    deg_img = img.copy()
    if rng.rand() < 0.5:
        q = rng.randint(20, 80)
        deg_img = apply_jpeg_compression(deg_img, quality=q)
    if rng.rand() < 0.4:
        r = rng.uniform(0.5, 2.0)
        deg_img = apply_blur(deg_img, radius=r)
    if rng.rand() < 0.4:
        b = rng.uniform(0.4, 0.8)
        deg_img = apply_low_light_noise(deg_img, brightness_factor=b, noise_std=rng.uniform(3, 10))
    if rng.rand() < 0.3:
        s = rng.uniform(0.2, 0.5)
        deg_img = apply_downscale_upscale(deg_img, scale_factor=s)
    return deg_img
