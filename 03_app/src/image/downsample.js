/**
 * downsample.js
 * Multi-step safe client-side downsampling with anti-aliasing.
 * Prevents memory spikes and eliminates aliasing artifacts from high-res (12 MP to 48 MP) captures.
 */

/**
 * Stepwise downsampling from large dimensions to target dimension
 */
export function multiStepResize(sourceCanvasOrBitmap, targetWidth, targetHeight) {
  let curW = sourceCanvasOrBitmap.width;
  let curH = sourceCanvasOrBitmap.height;

  // Use OffscreenCanvas if supported, otherwise standard canvas
  const createCanvas = (w, h) => {
    if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(w, h);
    }
    if (typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    }
    return {
      width: w,
      height: h,
      getContext: () => ({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
        drawImage: () => {},
      }),
    };
  };

  let currentSource = sourceCanvasOrBitmap;

  // Step down in halves while more than 2x larger than target
  while (curW / 2 >= targetWidth && curH / 2 >= targetHeight) {
    const nextW = Math.floor(curW / 2);
    const nextH = Math.floor(curH / 2);
    const canvas = createCanvas(nextW, nextH);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(currentSource, 0, 0, curW, curH, 0, 0, nextW, nextH);

    currentSource = canvas;
    curW = nextW;
    curH = nextH;
  }

  // Final step to exact target size (center square crop if needed)
  const finalCanvas = createCanvas(targetWidth, targetHeight);
  const finalCtx = finalCanvas.getContext('2d');
  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = 'high';

  // Compute square center crop
  const aspect = curW / curH;
  let sx = 0, sy = 0, sSize = Math.min(curW, curH);
  if (aspect > 1) {
    sx = Math.floor((curW - sSize) / 2);
  } else {
    sy = Math.floor((curH - sSize) / 2);
  }

  finalCtx.drawImage(currentSource, sx, sy, sSize, sSize, 0, 0, targetWidth, targetHeight);
  return finalCanvas;
}

/**
 * Creates 640px long-side JPEG blob for storage
 */
export function createStorageBlob(sourceCanvasOrBitmap, maxDim = 640) {
  return new Promise((resolve, reject) => {
    let w = sourceCanvasOrBitmap.width;
    let h = sourceCanvasOrBitmap.height;

    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(sourceCanvasOrBitmap, 0, 0, w, h);

    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Storage blob creation failed'));
    }, 'image/jpeg', 0.85);
  });
}
