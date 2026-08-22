import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user } = useAuth();

  const displayName = user?.name || 'Student';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const roleLabel = user?.role
    ? `${user.role.charAt(0)}${user.role.slice(1).toLowerCase()} Account`
    : 'Student Account';

  return (
    <>
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo-icon">A</div>
          <h1>Agent<span>Exam</span></h1>
        </div>

        <div className="nav-section">Main</div>
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <i className="fas fa-th-large"></i>
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/study-plan" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-tasks"></i>
          <span>Study Plan</span>
        </NavLink>

        <div className="nav-section">Preparation</div>
        <NavLink to="/upload-material" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-upload"></i>
          <span>Upload Material</span>
        </NavLink>
        <NavLink to="/materials" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-folder-open"></i>
          <span>My Materials</span>
        </NavLink>
        <NavLink to="/syllabus" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-book"></i>
          <span>Syllabus</span>
        </NavLink>
        <NavLink to="/pyqs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-history"></i>
          <span>PYQs</span>
        </NavLink>


        <div className="nav-section">Evaluation</div>
        <NavLink to="/exams" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-file-alt"></i>
          <span>Theory Exams</span>
        </NavLink>
        <NavLink to="/practical" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-flask"></i>
          <span>Practical &amp; Lab</span>
        </NavLink>
        <NavLink to="/viva" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-microphone-alt"></i>
          <span>AI Viva</span>
        </NavLink>

        <div className="nav-section">Analytics</div>
        <NavLink to="/performance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-chart-line"></i>
          <span>Performance</span>
        </NavLink>
        <NavLink to="/results" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-clipboard-check"></i>
          <span>Results</span>
        </NavLink>
        <NavLink to="/readiness" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-brain"></i>
          <span>Readiness</span>
        </NavLink>

        <div className="sidebar-footer">
          <NavLink to="/profile" className="user-card block" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="name">{displayName}</div>
              <div className="role">{roleLabel}</div>
            </div>
          </NavLink>
        </div>
      </div>
      <div
        className={`overlay ${isOpen ? 'open' : ''}`}
        onClick={toggleSidebar}
      ></div>
    </>
  );
};

export default Sidebar;
