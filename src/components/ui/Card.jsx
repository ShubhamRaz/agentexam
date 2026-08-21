import React from 'react';

export const Card = ({ children, className = '', ...props }) => {
  return (
    <div className={`card ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ title, actionText, onActionClick, children, className = '' }) => {
  return (
    <div className={`card-header ${className}`.trim()}>
      {title && <h4>{title}</h4>}
      {actionText && (
        <button className="link" onClick={onActionClick}>
          {actionText}
        </button>
      )}
      {children}
    </div>
  );
};

export const CardContent = ({ children, className = '' }) => {
  return <div className={`card-content ${className}`.trim()}>{children}</div>;
};

export default Card;
