/**
 * crop.js
 * Optional client-side leaf zoom and crop utility.
 * Farmers can optionally zoom into a specific lesion before AI analysis.
 */

export function cropImage(sourceCanvas, cropBox) {
  // cropBox: { x, y, width, height } in relative [0, 1] coordinates
  const sw = sourceCanvas.width;
  const sh = sourceCanvas.height;

  const sx = Math.max(0, Math.floor(cropBox.x * sw));
  const sy = Math.max(0, Math.floor(cropBox.y * sh));
  const sWidth = Math.min(sw - sx, Math.floor(cropBox.width * sw));
  const sHeight = Math.min(sh - sy, Math.floor(cropBox.height * sh));

  const canvas = document.createElement('canvas');
  canvas.width = sWidth;
  canvas.height = sHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sourceCanvas, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
  return canvas;
}
