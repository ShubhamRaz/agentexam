import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import MaterialsList from './pages/MaterialsList';
import TheoryExam from './pages/TheoryExam';
import StudyPlan from './pages/StudyPlan';
import Performance from './pages/Performance';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="materials" element={<MaterialsList />} />
          <Route path="exams" element={<TheoryExam />} />
          <Route path="practical" element={<div className="p-4">Practical Simulation (Coming Soon)</div>} />
          <Route path="viva" element={<div className="p-4">AI Viva (Coming Soon)</div>} />
          <Route path="performance" element={<Performance />} />
          <Route path="study-plan" element={<StudyPlan />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
