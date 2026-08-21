import React from 'react';

const EmptyState = ({ icon = 'fa-folder-open', title = 'No Data Found', message = 'There is nothing to display here yet.', action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center" style={{ minHeight: '250px', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
      <div className="mb-4" style={{ color: 'var(--text-muted)', fontSize: '48px' }}>
        <i className={`fas ${icon}`}></i>
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
