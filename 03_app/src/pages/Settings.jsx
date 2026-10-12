import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings, getDB } from '../offline/db.js';
import { triggerSync } from '../offline/syncManager.js';
import modelMetaData from '../config/model_meta.json';

export function Settings() {
  const [settings, setSettings] = useState({
    language: 'en',
    cloudBackupEnabled: false,
    imageUploadEnabled: false,
  });
  const [syncStatus, setSyncStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    getSettings().then(s => {
      setSettings(prev => ({ ...prev, ...s }));
    });
  }, []);

  const handleToggleBackup = async (val) => {
    const updated = { ...settings, cloudBackupEnabled: val };
    setSettings(updated);
    await updateSettings(updated);
    showNotice('Settings updated');
  };

  const handleToggleImage = async (val) => {
    const updated = { ...settings, imageUploadEnabled: val };
    setSettings(updated);
    await updateSettings(updated);
    showNotice('Settings updated');
  };

  const handleLanguageChange = async (language) => {
    const updated = { ...settings, language };
    setSettings(updated);
    await updateSettings(updated);
    showNotice('Language preference saved');
  };

  const showNotice = (msg) => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus('Connecting and synchronizing...');
    try {
      const res = await triggerSync();
      if (res.status === 'complete') {
        setSyncStatus(`Sync finished: ${res.syncedCount} uploaded, ${res.failedCount} failed.`);
      } else if (res.status === 'disabled_by_user') {
        setSyncStatus('Cloud backup is disabled. Turn it on above to synchronize.');
      } else if (res.status === 'idle') {
        setSyncStatus('All scans on this device are already synchronized.');
      } else {
        setSyncStatus(`Sync status: ${res.status}`);
      }
    } catch (e) {
      setSyncStatus(`Sync failed: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearAllData = async () => {
    if (window.confirm('Clear all local diagnostic scan records from this device?')) {
      const db = await getDB();
      await db.clear('scans');
      await db.clear('images');
      await db.clear('syncLog');
      showNotice('All local records cleared');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Settings & Cloud</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          App configuration, language, and optional AWS cloud backup
        </p>
      </div>

      {saveMsg && (
        <div style={{ background: '#e8f5e9', color: 'var(--primary-dark)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
          ✓ {saveMsg}
        </div>
      )}

      {/* Language Selector */}
      <div className="card">
        <h3 className="card-title">Language</h3>
        <select
          value={settings.language}
          onChange={e => handleLanguageChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '2px solid var(--border)',
            fontSize: '0.95rem',
            background: '#fff'
          }}
        >
          <option value="en">English (Default)</option>
          <option value="te">తెలుగు (Telugu - Preview)</option>
          <option value="hi">हिन्दी (Hindi - Preview)</option>
          <option value="ta">தமிழ் (Tamil - Preview)</option>
        </select>
      </div>

      {/* Optional Cloud Sync */}
      <div className="card">
        <h3 className="card-title">Optional Cloud Backup</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Diagnosis always runs 100% offline. Enabling cloud backup allows your records to be synced to AWS when you connect to Wi-Fi.
        </p>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '10px' }}>
          <input
            type="checkbox"
            checked={!!settings.cloudBackupEnabled}
            onChange={e => handleToggleBackup(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Enable Cloud Backup (AWS)</span>
        </label>

        {settings.cloudBackupEnabled && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '14px', marginLeft: '28px' }}>
            <input
              type="checkbox"
              checked={!!settings.imageUploadEnabled}
              onChange={e => handleToggleImage(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Include leaf photos in cloud upload</span>
          </label>
        )}

        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="big-button"
          style={{ minHeight: '44px', justifyContent: 'center', fontSize: '0.9rem' }}
        >
          {isSyncing ? '⏳ Synchronizing...' : '🔄 Sync Now'}
        </button>

        {syncStatus && (
          <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {syncStatus}
          </div>
        )}
      </div>

      {/* System & Model Information */}
      <div className="card">
        <h3 className="card-title">Edge AI Model Information</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
          <div><strong>Architecture:</strong> MobileNetV3-Small (Depthwise Separable CNN)</div>
          <div><strong>Supported Crops:</strong> 14 crops, 38 conditions</div>
          <div><strong>Dataset:</strong> PlantVillage (54,303 images)</div>
          <div><strong>Input Resolution:</strong> 224 x 224 px RGB</div>
          <div><strong>Model Version:</strong> {modelMetaData.modelVersion}</div>
          <div><strong>Offline Runtime:</strong> TensorFlow.js in Browser (Zero network requests)</div>
          <div><strong>Reliability Bands:</strong> Good (≥70%), Fair (40–69%), Low (&lt;40%)</div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ borderColor: 'var(--danger)' }}>
        <h3 style={{ color: 'var(--danger)', fontSize: '1rem', fontWeight: 700 }}>Device Storage</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Remove all cached images and diagnostic history from this phone.
        </p>
        <button
          onClick={handleClearAllData}
          style={{
            padding: '8px 16px',
            background: 'var(--danger)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Clear All Device Storage
        </button>
      </div>
    </div>
  );
}
