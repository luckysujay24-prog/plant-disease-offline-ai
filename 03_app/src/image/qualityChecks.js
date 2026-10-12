/**
 * qualityChecks.js
 * Fast, lightweight on-device image quality assessment.
 * Computes blur (Laplacian variance), exposure (luminance), and plant-likeness (ExG index).
 * Zero network calls; zero external dependencies.
 */

import imageQualityConfig from '../config/image-quality.json';

export function analyzeImageQuality(canvas) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const numPixels = width * height;

  let totalLuminance = 0;
  let totalExG = 0;
  const gray = new Float32Array(numPixels);

  // 1. Luminance & Excess Green Index (ExG)
  for (let i = 0; i < numPixels; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];

    // Perceived luminance
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
    gray[i] = lum;
    totalLuminance += lum;

    // Normalized color coordinates
    const sum = r + g + b || 1;
    const normR = r / sum;
    const normG = g / sum;
    const normB = b / sum;
    const exg = 2 * normG - normR - normB;
    totalExG += exg;
  }

  const avgLuminance = totalLuminance / numPixels;
  const avgExG = totalExG / numPixels;

  // 2. Blur detection: Variance of Laplacian
  let laplacianSum = 0;
  let laplacianSqSum = 0;
  let count = 0;

  // Compute 3x3 discrete Laplacian on grayscale
  for (let y = 1; y < height - 1; y += 2) { // step by 2 for ultra-fast mobile execution
    for (let x = 1; x < width - 1; x += 2) {
      const idx = y * width + x;
      const val =
        gray[idx - width] +
        gray[idx + width] +
        gray[idx - 1] +
        gray[idx + 1] -
        4 * gray[idx];

      laplacianSum += val;
      laplacianSqSum += val * val;
      count++;
    }
  }

  const meanLap = count > 0 ? laplacianSum / count : 0;
  const blurScore = count > 0 ? (laplacianSqSum / count - meanLap * meanLap) * 1000 : 0;

  // 3. Threshold Evaluations
  const { thresholds, messages } = imageQualityConfig;
  const isBlurry = blurScore < thresholds.blurThresholdLaplacian;
  const isDark = avgLuminance < thresholds.minLuminanceDark;
  const isOverexposed = avgLuminance > thresholds.maxLuminanceOverexposed;
  const isPlant = avgExG >= thresholds.minVegetationIndexExG;

  let hint = null;
  if (!isPlant) {
    hint = messages.notPlantLeaf;
  } else if (isDark) {
    hint = messages.darkWarning;
  } else if (isOverexposed) {
    hint = messages.overexposedWarning;
  } else if (isBlurry) {
    hint = messages.blurWarning;
  }

  return {
    blurScore: parseFloat(blurScore.toFixed(2)),
    isBlurry,
    luminance: parseFloat(avgLuminance.toFixed(2)),
    isDark,
    isOverexposed,
    plantLikenessScore: parseFloat(avgExG.toFixed(3)),
    isPlant,
    hint,
  };
}
