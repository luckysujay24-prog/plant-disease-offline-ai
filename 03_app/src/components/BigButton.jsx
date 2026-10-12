import React from 'react';

export function BigButton({ title, subtitle, icon, onClick, variant = 'secondary' }) {
  return (
    <button
      className={`big-button ${variant === 'primary' ? 'primary' : ''}`}
      onClick={onClick}
    >
      {icon && <span className="big-button-icon">{icon}</span>}
      <div className="big-button-text">
        <span>{title}</span>
        {subtitle && <span className="big-button-subtitle">{subtitle}</span>}
      </div>
    </button>
  );
}
