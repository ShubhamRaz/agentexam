import React from 'react';

const ErrorState = ({ message = 'Something went wrong.', onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center" style={{ minHeight: '200px' }}>
      <div className="mb-4 text-red-500" style={{ color: 'var(--danger, #ef4444)', fontSize: '48px' }}>
        <i className="fas fa-exclamation-triangle"></i>
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Error</h3>
      <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorState;
