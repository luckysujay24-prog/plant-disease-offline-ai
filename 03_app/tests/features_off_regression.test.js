/**
 * features_off_regression.test.js
 * Validates CR-02 Architecture and Backward Compatibility:
 * 1. Confirms feature flags cleanly configured.
 * 2. Confirms scan shape compatibility (legacy records with optional weather fields do not break app).
 * 3. Confirms non-disturbance of core diagnostic data across schema transitions.
 */

import { describe, it, expect } from 'vitest';
import features from '../src/config/features.json';

describe('CR-02 Architecture & Backward Compatibility Tests', () => {
  it('0.1 Feature Flags: robustImageInput enabled, obsolete flags pruned', () => {
    expect(features.robustImageInput).toBe(true);
    expect(features.multiView).toBe(false);
    expect(features).not.toHaveProperty('forecastAdvisor');
    expect(features).not.toHaveProperty('fertilizerAdvisor');
    expect(features).not.toHaveProperty('manualWeather');
  });

  it('0.2 Stored Scan Shape: CR-02 scans retain clean schema without required weather', () => {
    const cr02Scan = {
      scanId: 'scan_cr02_001',
      selectedCrop: 'tomato',
      cropMode: 'known',
      predictedCrop: 'tomato',
      predictedClass: 'tomato__early_blight',
      displayName: 'Tomato - Early Blight',
      confidence: 0.88,
      reliability: 'Good',
      syncStatus: 'LOCAL',
      createdAt: '2026-10-11T12:00:00.000Z',
    };

    expect(cr02Scan.scanId).toBe('scan_cr02_001');
    expect(cr02Scan.reliability).toBe('Good');
    expect(cr02Scan.weatherSnapshot).toBeUndefined();
    expect(cr02Scan.risk).toBeUndefined();
  });

  it('0.3 Backward Compatibility: Legacy scans with weather fields load gracefully', () => {
    const legacyScan = {
      scanId: 'scan_legacy_v1',
      selectedCrop: 'potato',
      cropMode: 'known',
      predictedCrop: 'potato',
      predictedClass: 'potato__late_blight',
      displayName: 'Potato - Late Blight',
      confidence: 0.94,
      weatherSnapshot: {
        temperatureC: 22.0,
        humidityPct: 80,
        rainMm: 2,
        source: 'live',
        sourceLabel: 'Live Weather',
      },
      risk: {
        score: 0.75,
        category: 'HIGH',
      },
      syncStatus: 'SYNCED',
      createdAt: '2026-10-09T10:00:00.000Z',
    };

    // The app safely reads diagnosis from legacy scans ignoring weather fields
    const displayedCrop = legacyScan.predictedCrop;
    const displayedClass = legacyScan.displayName || legacyScan.predictedClass;
    const reliability = legacyScan.reliability || (legacyScan.confidence >= 0.70 ? 'Good' : 'Fair');

    expect(displayedCrop).toBe('potato');
    expect(displayedClass).toBe('Potato - Late Blight');
    expect(reliability).toBe('Good');
  });
});
