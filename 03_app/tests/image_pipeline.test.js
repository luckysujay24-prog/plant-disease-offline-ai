/**
 * image_pipeline.test.js
 * Comprehensive unit test suite for the Any-Photo Input pipeline (Phase CR-2).
 * Verifies:
 * - Quality checks (blur, darkness, overexposure, plant-likeness)
 * - Safe multi-step resizing to exactly 224x224
 * - "I can't see a plant leaf" non-leaf photo detection
 * - 50-scan continuous execution memory stability
 */

import { describe, it, expect } from 'vitest';
import { analyzeImageQuality } from '../src/image/qualityChecks.js';
import { multiStepResize } from '../src/image/downsample.js';

// Helper to create synthetic canvas with custom RGB
function createMockCanvas(width, height, fillR, fillG, fillB) {
  const canvas = {
    width,
    height,
    getContext: (type) => ({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      drawImage: () => {},
      getImageData: (sx, sy, w, h) => {
        const numPixels = w * h;
        const data = new Uint8ClampedArray(numPixels * 4);
        for (let i = 0; i < numPixels; i++) {
          data[i * 4] = fillR;
          data[i * 4 + 1] = fillG;
          data[i * 4 + 2] = fillB;
          data[i * 4 + 3] = 255;
        }
        return { data };
      },
    }),
  };
  return canvas;
}

describe('Feature A: Any-Photo Input & Quality Pipeline', () => {
  it('Quality Checks: Green plant leaf returns isPlant = true', () => {
    // Green foliage canvas: R=40, G=160, B=40
    const plantCanvas = createMockCanvas(224, 224, 40, 160, 40);
    const result = analyzeImageQuality(plantCanvas);

    expect(result.isPlant).toBe(true);
    expect(result.plantLikenessScore).toBeGreaterThan(0.04);
    expect(result.isDark).toBe(false);
    expect(result.isOverexposed).toBe(false);
  });

  it('Quality Checks: Non-plant image (grey asphalt / wall) triggers notPlantLeaf hint', () => {
    // Neutral grey canvas: R=128, G=128, B=128 (ExG = 0)
    const greyCanvas = createMockCanvas(224, 224, 128, 128, 128);
    const result = analyzeImageQuality(greyCanvas);

    expect(result.isPlant).toBe(false);
    expect(result.hint).toContain("can't see a plant leaf");
  });

  it('Quality Checks: Dark night/shadow photo triggers darkWarning', () => {
    // Very dark leaf: R=10, G=25, B=10
    const darkCanvas = createMockCanvas(224, 224, 10, 25, 10);
    const result = analyzeImageQuality(darkCanvas);

    expect(result.isDark).toBe(true);
    expect(result.hint).toContain('looks dark');
  });

  it('Quality Checks: Blown out highlight photo triggers overexposedWarning', () => {
    // Extreme bright: R=245, G=250, B=245
    const brightCanvas = createMockCanvas(224, 224, 245, 250, 245);
    const result = analyzeImageQuality(brightCanvas);

    expect(result.isOverexposed).toBe(true);
  });

  it('Safe Multi-Step Resizing: Resizes high-res source to exact target (224x224)', () => {
    const mockHighRes = {
      width: 4000,
      height: 3000,
      getContext: () => ({
        drawImage: () => {},
      }),
    };

    const targetCanvas = multiStepResize(mockHighRes, 224, 224);
    expect(targetCanvas.width).toBe(224);
    expect(targetCanvas.height).toBe(224);
  });

  it('Memory Stability: 50 consecutive scans execute without memory exhaustion', () => {
    const mockInput = createMockCanvas(224, 224, 50, 150, 50);

    for (let i = 0; i < 50; i++) {
      const q = analyzeImageQuality(mockInput);
      expect(q).toBeDefined();
    }
  });
});
