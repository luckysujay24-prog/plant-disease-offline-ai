/**
 * decode.js
 * Off-thread safe image decoding with memory bounds and EXIF orientation preservation.
 * Supports JPEG, PNG, WebP, AVIF, GIF, BMP, and native HEIC.
 */

import imageQualityConfig from '../config/image-quality.json';
import { multiStepResize, createStorageBlob } from './downsample.js';
import { analyzeImageQuality } from './qualityChecks.js';

export async function processInputImage(fileOrBlob, options = {}) {
  const t0 = performance.now();
  const { limits, messages } = imageQualityConfig;

  // 1. File Size Guardrail
  if (fileOrBlob.size > limits.maxSizeBytes) {
    throw new Error(messages.oversized);
  }

  const mime = fileOrBlob.type || 'image/jpeg';

  // 2. Format checks (HEIC fallback check)
  if (mime.includes('heic') || mime.includes('heif')) {
    // Probe native decoding capability
    if (typeof createImageBitmap === 'undefined') {
      throw new Error(messages.unsupportedFormat);
    }
  }

  let bitmap = null;
  let decodePath = 'createImageBitmap';

  try {
    // Attempt fast off-thread createImageBitmap with EXIF auto-orientation
    if (typeof createImageBitmap !== 'undefined') {
      try {
        bitmap = await createImageBitmap(fileOrBlob, { imageOrientation: 'from-image' });
      } catch (e) {
        decodePath = 'htmlImageFallback';
      }
    }

    // Fallback to HTMLImageElement
    if (!bitmap) {
      bitmap = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(messages.unsupportedFormat));
        img.src = URL.createObjectURL(fileOrBlob);
      });
    }

    const origWidth = bitmap.width || bitmap.naturalWidth;
    const origHeight = bitmap.height || bitmap.naturalHeight;
    const totalPixels = origWidth * origHeight;

    // 3. Pixel Count Guardrail (up to 48-50 MP)
    if (totalPixels > limits.maxPixels) {
      if (bitmap.close) bitmap.close();
      throw new Error(messages.oversized);
    }

    // 4. Safe Multi-Step Resizing to 224x224 RGB input
    const modelInputCanvas = multiStepResize(bitmap, 224, 224);

    // 5. Image Quality Analysis on 224x224 Canvas
    const quality = analyzeImageQuality(modelInputCanvas);

    // 6. Generate 640px long-side compressed JPEG Blob for local storage
    const storageBlob = await createStorageBlob(bitmap, 640);

    const processMs = parseFloat((performance.now() - t0).toFixed(1));

    // Determine sizeLevel
    let sizeLevel = 'medium';
    if (Math.max(origWidth, origHeight) < 400) sizeLevel = 'small';
    else if (Math.max(origWidth, origHeight) > 1600) sizeLevel = 'large';

    const imageMeta = {
      origWidth,
      origHeight,
      origBytes: fileOrBlob.size,
      mime,
      decodePath,
      processMs,
      sizeLevel,
      quality,
    };

    // Clean up bitmap memory if closeable
    if (bitmap.close) {
      bitmap.close();
    }

    return {
      modelInputCanvas,
      storageBlob,
      imageMeta,
      quality,
    };
  } catch (err) {
    if (bitmap && bitmap.close) bitmap.close();
    throw err;
  }
}
