import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layout
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Auth pages (public)
import Login from './pages/Login';
import Register from './pages/Register';

// Protected pages
import Dashboard from './pages/Dashboard';
import MaterialsList from './pages/MaterialsList';
import UploadMaterial from './pages/UploadMaterial';
import Syllabus from './pages/Syllabus';
import PYQs from './pages/PYQs';
import TheoryExam from './pages/TheoryExam';
import Results from './pages/Results';
import Practical from './pages/Practical';
import Viva from './pages/Viva';
import Performance from './pages/Performance';
import Readiness from './pages/Readiness';
import StudyPlan from './pages/StudyPlan';
import ProfileSettings from './pages/ProfileSettings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes — all nested under MainLayout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="materials" element={<MaterialsList />} />
          <Route path="upload-material" element={<UploadMaterial />} />
          <Route path="syllabus" element={<Syllabus />} />
          <Route path="pyqs" element={<PYQs />} />
          <Route path="exams" element={<TheoryExam />} />
          <Route path="results" element={<Results />} />
          <Route path="practical" element={<Practical />} />
          <Route path="viva" element={<Viva />} />
          <Route path="performance" element={<Performance />} />
          <Route path="readiness" element={<Readiness />} />
          <Route path="study-plan" element={<StudyPlan />} />
          <Route path="profile" element={<ProfileSettings />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
