import React from 'react';

const ProgressRing = ({ percentage = 0, color = '#3b82f6' }) => {
  return (
    <div 
      className="readiness-score-ring"
      style={{
        background: `conic-gradient(${color} 0% ${percentage}%, rgba(255, 255, 255, 0.15) ${percentage}% 100%)`
      }}
    >
      <div className="inner">{Math.round(percentage)}%</div>
    </div>
  );
};

export default ProgressRing;
