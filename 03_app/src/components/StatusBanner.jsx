import React from 'react';

export function StatusBanner({ isOnline, aiReadyStatus }) {
  return (
    <div className="status-banner">
      <span className={`status-dot ${isOnline ? '' : 'offline'}`} />
      <span>{isOnline ? 'Online' : 'Offline — core features available'}</span>
      <span style={{ opacity: 0.5 }}>|</span>
      <span>{aiReadyStatus || 'AI ready on this device'}</span>
    </div>
  );
}
