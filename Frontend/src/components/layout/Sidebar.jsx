// ============================================
// AGENTEXAM — Sidebar Navigation
// ============================================
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, FileText, ClipboardList,
  PenTool, FlaskConical, Mic, BarChart3, Target,
  CalendarCheck, User, GraduationCap, LogOut, Settings
} from 'lucide-react';
import { getInitials } from '../../utils/helpers';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Materials', path: '/materials', icon: BookOpen },
  { label: 'Syllabus', path: '/syllabus', icon: FileText },
  { label: 'PYQ Analysis', path: '/pyq-analysis', icon: ClipboardList },
  { section: 'Practice' },
  { label: 'Theory Exam', path: '/exam', icon: PenTool },
  { label: 'Practical', path: '/practical', icon: FlaskConical },
  { label: 'AI Viva', path: '/viva', icon: Mic, badge: 'AI' },
  { section: 'Analytics' },
  { label: 'Performance', path: '/performance', icon: BarChart3 },
  { label: 'Readiness', path: '/readiness', icon: Target },
  { label: 'Study Plan', path: '/study-plan', icon: CalendarCheck },
];

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-header">
          <NavLink to="/dashboard" className="sidebar-logo" onClick={onClose}>
            <div className="sidebar-logo-icon">
              <GraduationCap size={20} />
            </div>
            <div className="sidebar-logo-text">
              Agent<span>Exam</span>
            </div>
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item, i) => {
            if (item.section) {
              return (
                <div key={i} className="sidebar-section-label">
                  {item.section}
                </div>
              );
            }

            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <Icon size={20} className="sidebar-link-icon" />
                <span>{item.label}</span>
                {item.badge && <span className="sidebar-link-badge">{item.badge}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer / User */}
        <div className="sidebar-footer">
          <NavLink to="/profile" className="sidebar-user" onClick={onClose}>
            <div className="avatar avatar-sm">
              {getInitials('Prerna Sharma')}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">Prerna Sharma</div>
              <div className="sidebar-user-email">B.Tech CS — Sem 4</div>
            </div>
            <Settings size={16} style={{ color: 'var(--color-text-tertiary)' }} />
          </NavLink>
        </div>
      </aside>
    </>
  );
}
