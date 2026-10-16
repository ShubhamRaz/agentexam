// ============================================
// AGENTEXAM — Main App with Routing
// ============================================
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui';
import AppLayout from './layouts/AppLayout';

// Auth pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';

// App pages
import Dashboard from './pages/Dashboard';
import Materials from './pages/Materials';
import SyllabusAnalysis from './pages/SyllabusAnalysis';
import PYQAnalysis from './pages/PYQAnalysis';
import TheoryExam from './pages/TheoryExam';
import PracticalExam from './pages/PracticalExam';
import AIViva from './pages/AIViva';
import Performance from './pages/Performance';
import Readiness from './pages/Readiness';
import StudyPlan from './pages/StudyPlan';
import Profile from './pages/Profile';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* App routes (with sidebar layout) */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/syllabus" element={<SyllabusAnalysis />} />
            <Route path="/pyq-analysis" element={<PYQAnalysis />} />
            <Route path="/exam" element={<TheoryExam />} />
            <Route path="/practical" element={<PracticalExam />} />
            <Route path="/viva" element={<AIViva />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/readiness" element={<Readiness />} />
            <Route path="/study-plan" element={<StudyPlan />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
