import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const Performance = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const result = await api.getPerformanceData();
      setData(result);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-muted"><i className="fas fa-spinner fa-spin mr-2"></i>Loading analytics...</div>;
  }

  return (
    <div className="performance-page max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="text-2xl font-bold">Performance Analytics</h3>
          <p className="text-muted text-sm mt-1">Track your progress across multiple mock tests and topics.</p>
        </div>
        <button className="btn btn-outline-primary"><i className="fas fa-download"></i> Export Report</button>
      </div>

      <div className="grid-2col mb-8">
        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-chart-line text-blue-600 mr-2"></i>Overall Score Trend</h4>
            <span className="link">Details</span>
          </div>
          <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#7a9abb', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#7a9abb', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: '#fff' }}
                />
                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-chart-bar text-purple-600 mr-2"></i>Accuracy by Topic</h4>
            <span className="link">Details</span>
          </div>
          <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#7a9abb', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#7a9abb', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: '#fff' }}
                  cursor={{ fill: 'rgba(59,130,246,0.05)' }}
                />
                <Bar dataKey="accuracy" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h4><i className="fas fa-history text-blue-600 mr-2"></i>Recent Test Submissions</h4>
        </div>
        <div className="mock-preview mt-2">
            {[
              { name: 'Theory Mock #4 · DSA Focus', sub: '15 MCQs · 5 Short · 2 Long · 45 min', score: '78%', type: 'good', border: 'border-l-primary' },
              { name: 'Theory Mock #3 · Algorithms', sub: '12 MCQs · 6 Short · 3 Long · 50 min', score: '62%', type: 'warn', border: 'border-l-warning' },
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
    </div>
  );
};

export default Performance;
