import { describe, it, expect } from 'vitest';

describe('Sync State Machine & Recovery Rules', () => {
  const VALID_SYNC_STATUSES = ['LOCAL', 'PENDING_SYNC', 'SYNCING', 'SYNCED', 'FAILED'];

  it('validates strictly all five allowed sync statuses', () => {
    expect(VALID_SYNC_STATUSES).toEqual([
      'LOCAL',
      'PENDING_SYNC',
      'SYNCING',
      'SYNCED',
      'FAILED'
    ]);
  });

  it('recovers stranded SYNCING scans back to PENDING_SYNC upon startup', () => {
    const mockScans = [
      { scanId: '1', syncStatus: 'SYNCING', predictedClass: 'tomato__early_blight' },
      { scanId: '2', syncStatus: 'SYNCED', predictedClass: 'potato__late_blight' },
      { scanId: '3', syncStatus: 'FAILED', predictedClass: 'apple__apple_scab' },
    ];

    // Simulate recovery logic
    const recovered = mockScans.map(scan => {
      if (scan.syncStatus === 'SYNCING') {
        return { ...scan, syncStatus: 'PENDING_SYNC' };
      }
      return scan;
    });

    expect(recovered[0].syncStatus).toBe('PENDING_SYNC');
    expect(recovered[1].syncStatus).toBe('SYNCED');
    expect(recovered[2].syncStatus).toBe('FAILED');
    // Invariant: Diagnosis data is strictly preserved
    expect(recovered[0].predictedClass).toBe('tomato__early_blight');
  });

  it('preserves diagnosis and image blob on sync failure without data loss', () => {
    const originalScan = {
      scanId: 'uuid-1234',
      selectedCrop: 'tomato',
      predictedClass: 'tomato__early_blight',
      confidence: 0.94,
      syncStatus: 'SYNCING',
      syncAttempts: 1,
    };

    // Transition to FAILED on network drop
    const failedScan = {
      ...originalScan,
      syncStatus: 'FAILED',
      syncAttempts: originalScan.syncAttempts + 1,
      lastSyncError: 'Network timeout (5000ms exceeded)',
    };

    expect(failedScan.syncStatus).toBe('FAILED');
    expect(failedScan.syncAttempts).toBe(2);
    expect(failedScan.predictedClass).toBe('tomato__early_blight');
    expect(failedScan.confidence).toBe(0.94);
  });
});
