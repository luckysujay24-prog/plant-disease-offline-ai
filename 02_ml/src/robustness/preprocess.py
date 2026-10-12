"""
preprocess.py
Python reference implementation of the multi-step downscaling pipeline.
Guarantees mathematical parity with the client-side JavaScript preprocessor
across large images (12 MP, 48 MP) and arbitrary aspect ratios.
"""

from PIL import Image

def multi_step_resize_python(img: Image.Image, target_size=(224, 224)) -> Image.Image:
    """
    Stepwise halving of dimensions using Bilinear/BICUBIC interpolation,
    followed by center square crop and final resize to target_size.
    Matches 03_app/src/image/downsample.js.
    """
    cur_w, cur_h = img.size
    target_w, target_h = target_size

    # Halve while more than 2x target size
    while cur_w // 2 >= target_w and cur_h // 2 >= target_h:
        next_w = cur_w // 2
        next_h = cur_h // 2
        img = img.resize((next_w, next_h), Image.Resampling.BILINEAR)
        cur_w, cur_h = next_w, next_h

    # Center square crop
    min_dim = min(cur_w, cur_h)
    sx = (cur_w - min_dim) // 2
    sy = (cur_h - min_dim) // 2
    cropped = img.crop((sx, sy, sx + min_dim, sy + min_dim))

    # Final resize to exact target
    final_img = cropped.resize(target_size, Image.Resampling.BILINEAR)
    return final_img
