/**
 * db.js
 * IndexedDB persistence layer for Crop Health PWA (database: cropHealthDB).
 * Version: 3 (CR-02 Migration: weatherCache and forecastCache stores removed).
 *
 * Stores:
 * - scans (keyPath: scanId)
 * - images (key: scanId, Blob)
 * - profile (key: 'userProfile')
 * - session (key: 'userSession')
 * - settings (key: 'appSettings')
 * - syncLog (autoIncrement: true)
 *
 * Invariant: A failed sync NEVER deletes local data.
 * Crash Recovery: App launch resets any record stuck in 'SYNCING' back to 'PENDING_SYNC'.
 */

import { openDB } from 'idb';

const DB_NAME = 'cropHealthDB';
const DB_VERSION = 3;

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // 1. scans store
      if (!db.objectStoreNames.contains('scans')) {
        const scanStore = db.createObjectStore('scans', { keyPath: 'scanId' });
        scanStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        scanStore.createIndex('createdAt', 'createdAt', { unique: false });
        scanStore.createIndex('selectedCrop', 'selectedCrop', { unique: false });
      }

      // 2. images store (Blobs)
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images');
      }

      // 3. profile store
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile');
      }

      // 4. session store
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session');
      }

      // 5. settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }

      // 6. syncLog store
      if (!db.objectStoreNames.contains('syncLog')) {
        db.createObjectStore('syncLog', { autoIncrement: true });
      }

      // CR-02 Migration: Cleanly delete legacy weatherCache & forecastCache stores
      if (db.objectStoreNames.contains('weatherCache')) {
        db.deleteObjectStore('weatherCache');
      }
      if (db.objectStoreNames.contains('forecastCache')) {
        db.deleteObjectStore('forecastCache');
      }
    },
  });
}

/**
 * Startup recovery: Resets orphaned SYNCING state to PENDING_SYNC.
 */
export async function recoverStuckSyncs() {
  const db = await getDB();
  const tx = db.transaction('scans', 'readwrite');
  const index = tx.store.index('syncStatus');
  const stuckScans = await index.getAll('SYNCING');

  for (const scan of stuckScans) {
    scan.syncStatus = 'PENDING_SYNC';
    scan.updatedAt = new Date().toISOString();
    await tx.store.put(scan);
  }
  await tx.done;
  if (stuckScans.length > 0) {
    console.log(`Recovered ${stuckScans.length} scans from SYNCING to PENDING_SYNC.`);
  }
}

/**
 * Scan operations
 */
export async function saveScan(scanData, imageBlob = null) {
  const db = await getDB();
  const tx = db.transaction(['scans', 'images'], 'readwrite');

  await tx.objectStore('scans').put(scanData);
  if (imageBlob && scanData.scanId) {
    await tx.objectStore('images').put(imageBlob, scanData.scanId);
  }
  await tx.done;
  return scanData.scanId;
}

export async function getScan(scanId) {
  const db = await getDB();
  return db.get('scans', scanId);
}

export async function getImageBlob(scanId) {
  const db = await getDB();
  return db.get('images', scanId);
}

export async function getAllScans() {
  const db = await getDB();
  const scans = await db.getAllFromIndex('scans', 'createdAt');
  return scans.reverse(); // newest first
}

export async function getScansBySyncStatus(status) {
  const db = await getDB();
  return db.getAllFromIndex('scans', 'syncStatus', status);
}

export async function updateScanSyncStatus(scanId, status, errorMsg = null) {
  const db = await getDB();
  const scan = await db.get('scans', scanId);
  if (!scan) return;

  scan.syncStatus = status;
  scan.updatedAt = new Date().toISOString();
  if (errorMsg) {
    scan.lastSyncError = errorMsg;
    scan.syncAttempts = (scan.syncAttempts || 0) + 1;
  }
  await db.put('scans', scan);
}

/**
 * Settings & Session
 */
export async function getSettings() {
  const db = await getDB();
  const settings = await db.get('settings', 'appSettings');
  return settings || {
    cloudBackupEnabled: false,
    imageUploadEnabled: false,
    language: 'en',
  };
}

export async function saveSettings(settings) {
  const db = await getDB();
  return db.put('settings', settings, 'appSettings');
}
export const updateSettings = saveSettings;

export async function getSession() {
  const db = await getDB();
  return db.get('session', 'userSession');
}

export async function saveSession(session) {
  const db = await getDB();
  return db.put('session', session, 'userSession');
}

export async function clearAllLocalData() {
  const db = await getDB();
  const tx = db.transaction(['scans', 'images', 'syncLog'], 'readwrite');
  await tx.objectStore('scans').clear();
  await tx.objectStore('images').clear();
  await tx.objectStore('syncLog').clear();
  await tx.done;
}
