import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/':
        return { title: 'Welcome, Shubham!', subtitle: 'Here is your overall exam readiness and today\'s plan.' };
      case '/materials':
        return { title: 'Study Materials', subtitle: 'Upload and analyze syllabus, notes, and PYQs.' };
      case '/exams':
        return { title: 'Theory Mock Tests', subtitle: 'Practice with adaptive mock tests based on your syllabus.' };
      case '/practical':
        return { title: 'Practical & Lab', subtitle: 'Simulate lab experiments and practical exams.' };
      case '/viva':
        return { title: 'AI Viva Simulation', subtitle: 'Prepare for oral examinations with adaptive AI viva.' };
      case '/performance':
        return { title: 'Performance Analytics', subtitle: 'Track your progress and identify weak areas.' };
      case '/study-plan':
        return { title: 'Personalized Study Plan', subtitle: 'Your recommended revision schedule.' };
      default:
        return { title: 'AgentExam', subtitle: 'AI-Powered Exam Preparation' };
    }
  };

  const { title, subtitle } = getPageInfo();

  return (
    <div className="app">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <main className="main">
        <Topbar title={title} subtitle={subtitle} toggleSidebar={toggleSidebar} />
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
