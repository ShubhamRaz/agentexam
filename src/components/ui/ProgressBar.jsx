import React from 'react';

const ProgressBar = ({ label, value, max = 100, colorClass = 'fill-primary', showValue = true }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="progress-container">
      {(label || showValue) && (
        <div className="progress-header">
          {label && <span className="progress-label">{label}</span>}
          {showValue && <span className="progress-value">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className="progress-bar">
        <div 
          className={`progress-fill ${colorClass}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
