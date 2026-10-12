import React, { useState, useEffect } from 'react';
import { getAllScans, getImageBlob, getDB } from '../offline/db.js';
import { ReliabilityBadge } from '../components/ReliabilityBadge.jsx';
import labelsData from '../config/labels.json';

export function History({ onSelectScan }) {
  const [scans, setScans] = useState([]);
  const [thumbnails, setThumbnails] = useState({});
  const [filterCrop, setFilterCrop] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadScans = async () => {
    setLoading(true);
    const records = await getAllScans();
    setScans(records);

    // Load thumbnails asynchronously
    const thumbs = {};
    for (const s of records) {
      try {
        const blob = await getImageBlob(s.scanId);
        if (blob) {
          thumbs[s.scanId] = URL.createObjectURL(blob);
        }
      } catch (e) {
        // ignore missing blob
      }
    }
    setThumbnails(thumbs);
    setLoading(false);
  };

  useEffect(() => {
    loadScans();
    return () => {
      // Revoke created blob URLs
      Object.values(thumbnails).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to delete all saved scan records from this device?')) {
      const db = await getDB();
      await db.clear('scans');
      await db.clear('images');
      setScans([]);
      setThumbnails({});
    }
  };

  const filteredScans = scans.filter(s => {
    if (filterCrop === 'all') return true;
    return s.selectedCrop === filterCrop || s.predictedCrop === filterCrop;
  });

  const getSyncLabel = (status) => {
    switch (status) {
      case 'SYNCED':
        return { text: '☁️ Synced', color: 'var(--primary)' };
      case 'SYNCING':
        return { text: '⏳ Syncing...', color: 'var(--accent)' };
      case 'PENDING_SYNC':
        return { text: '📤 Queued for Cloud', color: '#ff9800' };
      case 'FAILED':
        return { text: '⚠️ Sync Failed', color: 'var(--danger)' };
      case 'LOCAL':
      default:
        return { text: '💾 Saved on device', color: 'var(--text-muted)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Scan History</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {scans.length} diagnoses saved offline on this device
          </p>
        </div>
        {scans.length > 0 && (
          <button
            onClick={handleClearHistory}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              background: '#fff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Filter by crop */}
      {scans.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => setFilterCrop('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              background: filterCrop === 'all' ? 'var(--primary)' : '#fff',
              color: filterCrop === 'all' ? '#fff' : 'var(--text)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            All Crops ({scans.length})
          </button>
          {labelsData.crops.map(slug => {
            const count = scans.filter(s => s.selectedCrop === slug || s.predictedCrop === slug).length;
            if (count === 0) return null;
            const name = labelsData.cropDisplayNames[slug] || slug;
            return (
              <button
                key={slug}
                onClick={() => setFilterCrop(slug)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid var(--border)',
                  background: filterCrop === slug ? 'var(--primary)' : '#fff',
                  color: filterCrop === slug ? '#fff' : 'var(--text)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading saved scans...</p>
      ) : filteredScans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <span style={{ fontSize: '2.5rem' }}>🍃</span>
          <h3 style={{ marginTop: '12px' }}>No Saved Diagnoses</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            When you photograph and diagnose a leaf, your results are saved here automatically.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredScans.map(scan => {
            const syncInfo = getSyncLabel(scan.syncStatus);
            const thumbUrl = thumbnails[scan.scanId];

            return (
              <div
                key={scan.scanId}
                onClick={() => onSelectScan(scan, thumbUrl)}
                className="card"
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px',
                  cursor: 'pointer',
                  alignItems: 'center'
                }}
              >
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt="Leaf"
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      flexShrink: 0
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '8px',
                      background: '#e0e0e0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      flexShrink: 0
                    }}
                  >
                    🌿
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {labelsData.cropDisplayNames[scan.predictedCrop] || scan.predictedCrop}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: syncInfo.color }}>
                      {syncInfo.text}
                    </span>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {scan.displayName || scan.predictedClass}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(scan.createdAt).toLocaleDateString()} • {((scan.confidence || 0) * 100).toFixed(0)}%
                    </span>
                    <ReliabilityBadge level={scan.reliability || (scan.confidence >= 0.70 ? 'Good' : scan.confidence >= 0.40 ? 'Fair' : 'Low')} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
