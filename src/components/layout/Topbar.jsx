import React from 'react';

const Topbar = ({ title, subtitle, toggleSidebar }) => {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="mobile-toggle" onClick={toggleSidebar}>
            <i className="fas fa-bars"></i>
          </button>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="topbar-right">
        <div className="date-badge"><i className="far fa-calendar-alt mr-2"></i>{today}</div>
        <button className="icon-btn" title="Search">
          <i className="fas fa-search"></i>
        </button>
        <button className="icon-btn" title="Notifications">
          <i className="far fa-bell"></i>
          <div className="dot"></div>
        </button>
        <button className="icon-btn" title="Profile">
          <i className="far fa-user-circle"></i>
        </button>
      </div>
    </div>
  );
};

export default Topbar;
