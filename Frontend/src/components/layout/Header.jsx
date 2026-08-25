// ============================================
// AGENTEXAM — Header Component
// ============================================
import { Bell, Menu, Search } from 'lucide-react';
import { SearchInput } from '../ui';

export default function Header({ title, subtitle, onMenuToggle }) {
  return (
    <header className="header">
      <div className="header-left">
        <button className="header-mobile-toggle" onClick={onMenuToggle} aria-label="Toggle menu">
          <Menu size={24} />
        </button>
        <div>
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="header-right">
        <SearchInput placeholder="Search anything..." style={{ maxWidth: '280px' }} value="" onChange={() => {}} />
        <button className="header-icon-btn" aria-label="Notifications">
          <Bell size={20} />
          <span className="notification-dot" />
        </button>
      </div>
    </header>
  );
}
