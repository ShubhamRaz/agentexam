// ============================================
// AGENTEXAM — App Layout
// ============================================
import { useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

const pageTitles = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Your exam preparation overview' },
  '/materials': { title: 'Materials', subtitle: 'Manage your study materials' },
  '/syllabus': { title: 'Syllabus Analysis', subtitle: 'AI-analyzed topic importance and weightage' },
  '/pyq-analysis': { title: 'PYQ Analysis', subtitle: 'Previous year question patterns and trends' },
  '/exam': { title: 'Theory Exam', subtitle: 'Practice with AI-generated questions' },
  '/practical': { title: 'Practical Exam', subtitle: 'Lab experiments and code submissions' },
  '/viva': { title: 'AI Viva', subtitle: 'AI-powered viva voce practice' },
  '/performance': { title: 'Performance', subtitle: 'Track your progress and identify weak areas' },
  '/readiness': { title: 'Exam Readiness', subtitle: 'How prepared are you for the exam?' },
  '/study-plan': { title: 'Study Plan', subtitle: 'Your personalized AI study schedule' },
  '/profile': { title: 'Profile & Settings', subtitle: 'Manage your account' },
  '/exam/test': { title: 'Exam', subtitle: '' },
  '/exam/results': { title: 'Results', subtitle: 'Review your performance' },
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const pageInfo = pageTitles[location.pathname] || { title: 'AgentExam', subtitle: '' };

  // Full-screen pages (like exam test mode) skip layout
  if (location.pathname === '/exam/test') {
    return <Outlet />;
  }

  const token = localStorage.getItem('agentexam_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="app-main">
        <Header
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
          onMenuToggle={() => setSidebarOpen(prev => !prev)}
        />
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
