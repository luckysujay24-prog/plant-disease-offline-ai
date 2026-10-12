import React, { useState } from 'react';
import labelsData from '../config/labels.json';
import { CropTile } from '../components/CropTile.jsx';

export function ChooseCrop({ onSelectCrop }) {
  const [searchQuery, setSearchQuery] = useState('');
  const crops = labelsData.crops;
  const displayNames = labelsData.cropDisplayNames;

  const filteredCrops = crops.filter(c =>
    (displayNames[c] || c).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Choose Your Crop</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Selecting your crop ensures accurate condition diagnosis.
        </p>
      </div>

      <input
        type="text"
        placeholder="Search crops..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        style={{
          padding: '12px 16px',
          borderRadius: '8px',
          border: '2px solid var(--border)',
          fontSize: '1rem',
          outline: 'none',
        }}
      />

      {/* "I'm not sure" Tile */}
      <div
        className="crop-tile"
        style={{
          borderStyle: 'dashed',
          borderColor: 'var(--primary)',
          backgroundColor: '#f1f8e9',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          padding: '16px 20px',
          gap: '16px',
        }}
        onClick={() => onSelectCrop({ slug: 'unknown', mode: 'unknown', displayName: "I'm not sure" })}
      >
        <span style={{ fontSize: '2rem' }}>🌿</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 700 }}>I'm not sure which crop</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            AI will identify both the crop and the disease condition
          </div>
        </div>
      </div>

      {/* Supported Crop Tiles */}
      <div className="crop-grid">
        {filteredCrops.map(slug => (
          <CropTile
            key={slug}
            cropSlug={slug}
            displayName={displayNames[slug] || slug}
            onClick={() => onSelectCrop({ slug, mode: 'known', displayName: displayNames[slug] || slug })}
          />
        ))}
      </div>

      {filteredCrops.length === 0 && (
        <div className="tips-box" style={{ backgroundColor: '#ffebee', borderColor: '#e53935' }}>
          <strong>Crop Not Supported</strong>
          <p style={{ marginTop: '4px' }}>
            We do not have a trained model for this crop yet. Supported crops: {crops.map(c => displayNames[c]).join(', ')}.
          </p>
        </div>
      )}
    </div>
  );
}
