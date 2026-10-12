import React from 'react';

export function ReliabilityBadge({ level = 'Low' }) {
  const getColor = (lvl) => {
    switch (lvl) {
      case 'Good':
        return { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7' };
      case 'Fair':
        return { bg: '#fff3e0', text: '#e65100', border: '#ffcc80' };
      case 'Low':
      default:
        return { bg: '#f5f5f5', text: '#616161', border: '#e0e0e0' };
    }
  };

  const style = getColor(level);

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '0.78rem',
        fontWeight: 700,
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      {level} Reliability
    </span>
  );
}
