import React from 'react';
import { Link } from 'react-router-dom';
import ProgressRing from '../components/ui/ProgressRing';

const Dashboard = () => {
  return (
    <div className="dashboard">
      {/* Readiness Card */}
      <div className="readiness-card mb-8">
        <div className="readiness-left">
          <ProgressRing size={80} strokeWidth={8} percentage={72} color="#3b82f6" />
          <div className="readiness-text">
            <h3>Exam Readiness: <span style={{ color: '#3b82f6' }}>72%</span></h3>
            <p>Based on 4 mock tests, 2 practical sessions, and 6 viva questions. You're on track — focus on <strong>Data Structures</strong> and <strong>Algorithms</strong>.</p>
          </div>
        </div>
        <div className="readiness-action">
          <Link to="/exams" className="btn btn-primary"><i className="fas fa-play"></i> Start Mock Test</Link>
          <Link to="/performance" className="btn btn-outline-light"><i className="fas fa-file-pdf"></i> View Report</Link>
        </div>
      </div>

      {/* Grid 3: Quick Stats */}
      <div className="grid-3col mb-8">
        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-file-alt text-blue-600 mr-2"></i>Mock Tests</h4>
            <span className="link">View all</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">4</span>
            <span className="text-sm text-light">completed</span>
          </div>
          <div className="flex gap-4 mt-2 text-sm text-muted">
            <span><span className="font-semibold text-success">72%</span> avg. score</span>
            <span><span className="font-semibold text-warning">3</span> weak topics</span>
          </div>
          <div className="quick-actions mt-4 flex gap-3">
            <button className="btn btn-primary btn-sm flex-1"><i className="fas fa-plus"></i> New</button>
            <button className="btn btn-secondary btn-sm flex-1"><i className="fas fa-redo"></i> Retake</button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-flask text-purple-600 mr-2"></i>Practical / Viva</h4>
            <span className="link">View all</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">2</span>
            <span className="text-sm text-light">sessions</span>
          </div>
          <div className="flex gap-4 mt-2 text-sm text-muted">
            <span><span className="font-semibold text-success">68%</span> readiness</span>
            <span><span className="font-semibold text-purple-600">5</span> viva Qs</span>
          </div>
          <div className="quick-actions mt-4 flex gap-3">
            <button className="btn btn-purple btn-sm flex-1"><i className="fas fa-microphone"></i> Start Viva</button>
            <button className="btn btn-secondary btn-sm flex-1"><i className="fas fa-code"></i> Lab</button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-tasks text-warning mr-2"></i>Study Plan</h4>
            <span className="link">Edit</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">8</span>
            <span className="text-sm text-light">topics left</span>
          </div>
          <div className="flex gap-4 mt-2 text-sm text-muted">
            <span><span className="font-semibold text-danger">3</span> high priority</span>
            <span><span className="font-semibold text-success">4</span> completed</span>
          </div>
          <div className="quick-actions mt-4 flex gap-3">
            <Link to="/study-plan" className="btn btn-secondary btn-sm flex-1"><i className="fas fa-eye"></i> View Plan</Link>
            <button className="btn btn-success btn-sm flex-1"><i className="fas fa-check"></i> Mark Done</button>
          </div>
        </div>
      </div>

      {/* Grid 2: Topic Weightage + Study Plan */}
      <div className="grid-2col mb-8">
        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-chart-pie text-blue-600 mr-2"></i>Topic Weightage</h4>
            <span className="link">Based on PYQs</span>
          </div>
          <div>
            {[
              { label: 'DSA', pct: 92, color: 'fill-blue' },
              { label: 'Algorithms', pct: 78, color: 'fill-purple' },
              { label: 'DBMS', pct: 65, color: 'fill-success' },
              { label: 'OS', pct: 54, color: 'fill-warning' },
              { label: 'Networks', pct: 41, color: 'fill-teal' },
              { label: 'SE', pct: 28, color: 'fill-danger' }
            ].map(topic => (
              <div className="topic-bar" key={topic.label}>
                <span className="label font-medium w-[70px]">{topic.label}</span>
                <div className="track flex-1 bg-input rounded-full h-2 overflow-hidden mx-3">
                  <div className={`fill h-full rounded-full ${topic.color}`} style={{ width: `${topic.pct}%` }}></div>
                </div>
                <span className="pct text-sm font-semibold w-10 text-right">{topic.pct}%</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-light">
            <i className="fas fa-info-circle"></i> High-probability topics based on last 5 PYQs.
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-list-check text-warning mr-2"></i>Your Study Plan</h4>
            <span className="link">Update</span>
          </div>
          <div>
            {[
              { title: 'Data Structures (Trees & Graphs)', meta: 'High priority · 2 mock tests failed', priority: 'high', status: 'in-progress' },
              { title: 'Sorting Algorithms', meta: 'High priority · 65% accuracy', priority: 'high', status: 'in-progress' },
              { title: 'SQL Joins & Normalization', meta: 'Medium priority · 78% accuracy', priority: 'medium', status: 'pending' },
              { title: 'Process Scheduling', meta: 'Low priority · 85% accuracy', priority: 'low', status: 'done' },
              { title: 'Network Topologies', meta: 'Low priority · 90% accuracy', priority: 'low', status: 'done' }
            ].map((task, i) => (
              <div className="study-item flex items-center gap-3 py-2 border-b border-light last:border-0" key={i}>
                <div className={`priority w-1.5 h-8 rounded-md ${task.priority === 'high' ? 'bg-danger' : task.priority === 'medium' ? 'bg-warning' : 'bg-success'}`}></div>
                <div className="info flex-1">
                  <div className="title text-sm font-medium">{task.title}</div>
                  <div className="meta text-xs text-light mt-0.5">{task.meta}</div>
                </div>
                <span className={`status text-xs font-semibold px-3 py-1 rounded-full ${
                  task.status === 'done' ? 'bg-green-100 text-success' : 
                  task.status === 'in-progress' ? 'bg-blue-100 text-primary' : 
                  'bg-input text-muted'
                }`}>
                  {task.status === 'done' ? 'Completed' : task.status === 'in-progress' ? 'In progress' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid 2: Mock Test History + Viva Preview */}
      <div className="grid-2col mb-8">
        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-history text-blue-600 mr-2"></i>Mock Test History</h4>
            <span className="link">All tests</span>
          </div>
          <div className="mock-preview flex flex-col gap-3">
            {[
              { name: 'Theory Mock #4 · DSA Focus', sub: '15 MCQs · 5 Short · 2 Long · 45 min', score: '78%', type: 'good', border: 'border-l-primary' },
              { name: 'Theory Mock #3 · Algorithms', sub: '12 MCQs · 6 Short · 3 Long · 50 min', score: '62%', type: 'warn', border: 'border-l-warning' },
              { name: 'Theory Mock #2 · DBMS + OS', sub: '10 MCQs · 4 Short · 1 Long · 40 min', score: '84%', type: 'good', border: 'border-l-success' },
              { name: 'Theory Mock #1 · Full Syllabus', sub: '20 MCQs · 8 Short · 4 Long · 60 min', score: '51%', type: 'bad', border: 'border-l-danger' },
            ].map((mock, i) => (
              <div className={`mock-row flex items-center gap-3 p-3 bg-input rounded-md border-l-4 ${mock.border}`} key={i}>
                <span className="icon text-primary text-lg"><i className="fas fa-file-alt"></i></span>
                <div className="detail flex-1">
                  <div className="name text-sm font-medium">{mock.name}</div>
                  <div className="sub text-xs text-light mt-0.5">{mock.sub}</div>
                </div>
                <span className={`score font-bold text-lg ${mock.type === 'good' ? 'text-success' : mock.type === 'warn' ? 'text-warning' : 'text-danger'}`}>{mock.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-microphone-alt text-purple-600 mr-2"></i>Practical & Viva Sessions</h4>
            <span className="link">New session</span>
          </div>
          <div className="viva-preview flex flex-col gap-3">
            {[
              { name: 'Binary Tree Traversal', sub: 'Experiment · 3 viva Qs', tag: 'Ready 82%', status: 'ready', border: 'border-l-purple-500' },
              { name: 'Sorting Algorithm Implementation', sub: 'Experiment · 2 viva Qs', tag: 'In review', status: 'pending', border: 'border-l-warning' },
              { name: 'SQL Query Optimization', sub: 'Experiment · 4 viva Qs', tag: 'Needs work', status: 'pending', border: 'border-l-danger' },
              { name: 'Process Synchronization', sub: 'Experiment · 2 viva Qs', tag: 'Ready 91%', status: 'ready', border: 'border-l-success' }
            ].map((viva, i) => (
              <div className={`viva-item flex items-center gap-3 p-3 bg-input rounded-md border-l-4 ${viva.border}`} key={i}>
                <span className="icon text-purple-600 text-lg"><i className="fas fa-flask"></i></span>
                <div className="detail flex-1">
                  <div className="name text-sm font-medium">{viva.name}</div>
                  <div className="sub text-xs text-light mt-0.5">{viva.sub}</div>
                </div>
                <span className={`tag text-xs font-semibold px-3 py-1 rounded-full ${viva.status === 'ready' ? 'bg-green-100 text-success' : 'bg-yellow-100 text-warning'}`}>
                  {viva.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Upload Materials + Progress Chart */}
      <div className="grid-2col mb-8">
        {/* Upload */}
        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-cloud-upload-alt text-blue-600 mr-2"></i>Upload Materials</h4>
            <span className="link">Manage</span>
          </div>
          <div className="upload-zone" id="uploadZone">
            <i className="fas fa-file-upload"></i>
            <h5>Drop files here or click to browse</h5>
            <p>Upload syllabus, PYQs, notes, or lab manuals</p>
            <div className="formats">Supports PDF, DOCX, JPG, PNG</div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="bg-blue-50 px-3 py-1 rounded-full text-xs font-medium text-main"><i className="fas fa-check-circle text-success mr-1"></i> Syllabus.pdf</span>
            <span className="bg-blue-50 px-3 py-1 rounded-full text-xs font-medium text-main"><i className="fas fa-check-circle text-success mr-1"></i> PYQ_2025.pdf</span>
            <span className="bg-blue-50 px-3 py-1 rounded-full text-xs font-medium text-main"><i className="fas fa-check-circle text-success mr-1"></i> Notes_DSA.docx</span>
            <span className="bg-blue-50 px-3 py-1 rounded-full text-xs font-medium text-main"><i className="fas fa-clock text-warning mr-1"></i> Lab_Manual.pdf</span>
          </div>
        </div>

        {/* Progress Chart */}
        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-chart-bar text-blue-600 mr-2"></i>Performance Trend</h4>
            <span className="link">Details</span>
          </div>
          <div className="chart-placeholder">
            <div className="chart-bar" style={{ height: '44px' }}></div>
            <div className="chart-bar" style={{ height: '72px' }}></div>
            <div className="chart-bar" style={{ height: '56px' }}></div>
            <div className="chart-bar" style={{ height: '88px' }}></div>
            <div className="chart-bar" style={{ height: '62px' }}></div>
            <div className="chart-bar" style={{ height: '94px' }}></div>
            <div className="chart-bar" style={{ height: '48px' }}></div>
            <div className="chart-bar" style={{ height: '76px' }}></div>
          </div>
          <div className="chart-labels">
            <span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span>
            <span>Week 5</span><span>Week 6</span><span>Week 7</span><span>Week 8</span>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-xs">
            <span className="flex items-center"><span className="w-3 h-3 rounded-sm bg-blue-600 mr-1.5"></span>Theory</span>
            <span className="flex items-center"><span className="w-3 h-3 rounded-sm bg-purple-600 mr-1.5"></span>Practical</span>
            <span className="text-muted ml-auto"><i className="fas fa-arrow-up text-success mr-1"></i> +12% this week</span>
          </div>
        </div>
      </div>
      
      {/* Footer note */}
      <div className="mt-8 pt-4 border-t border-light text-xs text-light flex justify-between flex-wrap gap-2">
        <span>AgentExam v1.0 · AI-powered autonomous exam preparation</span>
        <span><i className="fas fa-shield-alt mr-1"></i> Data encrypted · <i className="fas fa-lock mr-1"></i> Secure</span>
      </div>
    </div>
  );
};

export default Dashboard;
