import React from 'react';

const LoadingState = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8" style={{ minHeight: '200px' }}>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" style={{ borderColor: 'var(--primary)' }}></div>
      <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
    </div>
  );
};

export default LoadingState;
