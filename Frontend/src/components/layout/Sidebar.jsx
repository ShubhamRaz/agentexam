import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = ({ isOpen, toggleSidebar }) => {
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
        <NavLink to="/materials" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-upload"></i>
          <span>Materials & Analysis</span>
        </NavLink>
        
        <div className="nav-section">Evaluation</div>
        <NavLink to="/exams" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-file-alt"></i>
          <span>Theory Exams</span>
        </NavLink>
        <NavLink to="/practical" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-flask"></i>
          <span>Practical & Lab</span>
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

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">SR</div>
            <div className="user-info">
              <div className="name">Shubham Raj</div>
              <div className="role">B.Tech CS - Sem 6</div>
            </div>
          </div>
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
