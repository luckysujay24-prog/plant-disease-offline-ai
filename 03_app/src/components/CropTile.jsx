import React from 'react';

const CROP_ICONS = {
  apple: '🍎',
  blueberry: '🫐',
  cherry: '🍒',
  corn: '🌽',
  grape: '🍇',
  orange: '🍊',
  peach: '🍑',
  bell_pepper: '🫑',
  potato: '🥔',
  raspberry: '🍇',
  soybean: '🫘',
  squash: '🎃',
  strawberry: '🍓',
  tomato: '🍅',
  unknown: '🌿',
};

export function CropTile({ cropSlug, displayName, isSelected, onClick }) {
  const icon = CROP_ICONS[cropSlug] || '🌿';
  return (
    <div
      className={`crop-tile ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <span className="crop-icon">{icon}</span>
      <span>{displayName}</span>
    </div>
  );
}
