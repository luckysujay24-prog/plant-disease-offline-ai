import React, { useState, useEffect } from 'react';
import { BigButton } from '../components/BigButton.jsx';
import { getAllScans } from '../offline/db.js';

export function Home({ onNavigate, onSelectScan }) {
  const [recentScans, setRecentScans] = useState([]);

  useEffect(() => {
    getAllScans().then(scans => {
      setRecentScans(scans.slice(0, 3));
    });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <BigButton
        title="Detect Disease"
        subtitle="Photograph leaf for instant offline diagnosis"
        icon="🔍"
        variant="primary"
        onClick={() => onNavigate('choose-crop')}
      />

      <BigButton
        title="Crop Care"
        subtitle="Evidence-based care guides and preventive nutrition"
        icon="🌿"
        onClick={() => onNavigate('crop-care')}
      />

      <BigButton
        title="My Results"
        subtitle="Review previous scans saved on this device"
        icon="📋"
        onClick={() => onNavigate('history')}
      />

      <BigButton
        title="Settings & Cloud"
        subtitle="Language, demo district, and backup options"
        icon="⚙️"
        onClick={() => onNavigate('settings')}
      />

      <div className="card" style={{ marginTop: '8px' }}>
        <h3 className="card-title">Recent Diagnoses</h3>
        {recentScans.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No previous scans found on this device. Tap <strong>Detect Disease</strong> to start.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentScans.map(scan => (
              <div
                key={scan.scanId}
                onClick={() => onSelectScan(scan)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'var(--bg)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{scan.displayName || scan.predictedClass}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(scan.createdAt).toLocaleDateString()} • {((scan.confidence || 0) * 100).toFixed(0)}% confidence
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
                  View →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
