import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

const StudyPlan = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const result = await api.getDashboard(); // using dashboard data for study plan tasks
      setData(result);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-muted"><i className="fas fa-spinner fa-spin mr-2"></i>Loading study plan...</div>;
  }

  return (
    <div className="study-plan-page max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="text-2xl font-bold mb-1">Your Personalized Plan</h3>
          <p className="text-muted text-sm">Generated based on your mock test performance and PYQ analysis.</p>
        </div>
        <button className="btn btn-primary"><i className="far fa-calendar-alt"></i> Sync to Calendar</button>
      </div>

      <div className="grid-2col">
        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-list-check text-warning mr-2"></i>Today's Tasks</h4>
            <span className="link">Mark All Done</span>
          </div>
          <div>
            {data.studyPlanToday.map(task => (
              <div key={task.id} className="study-item">
                <div className={`priority ${task.priority === 'high' ? 'priority-high' : 'priority-medium'}`}></div>
                <div className="info">
                  <div className="title">{task.title}</div>
                  <div className="meta">
                    <i className="far fa-clock mr-1"></i> {task.duration} · Priority: {task.priority}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {task.status === 'done' ? (
                    <span className="status done"><i className="fas fa-check mr-1"></i> Completed</span>
                  ) : (
                    <button className={`btn btn-sm ${task.status === 'in-progress' ? 'btn-primary' : 'btn-outline-primary'}`}>
                      {task.status === 'in-progress' ? <><i className="fas fa-play mr-1"></i> Continue</> : <><i className="fas fa-play mr-1"></i> Start</>}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="card">
            <div className="card-header">
              <h4><i className="fas fa-bullseye text-danger mr-2"></i>Weak Areas (Priority)</h4>
              <span className="link">View Analysis</span>
            </div>
            <div className="flex flex-col gap-3">
              {data.weakTopics.map((topic, i) => (
                <div key={i} className="p-3 bg-red-50 border border-red-100 rounded-md">
                  <div className="font-medium text-red-900">{topic.name}</div>
                  <div className="text-xs text-red-700 mt-1">{topic.subject}</div>
                  <Link to="/exams" className="text-xs text-blue-600 font-semibold mt-2 inline-block">
                    Take practice test <i className="fas fa-arrow-right ml-1"></i>
                  </Link>
                </div>
              ))}
            </div>
          </div>
          
          <div className="card">
            <div className="card-header">
              <h4><i className="far fa-calendar-alt text-blue-600 mr-2"></i>Upcoming This Week</h4>
            </div>
            <div className="p-6 text-center text-muted border-2 border-dashed border-light rounded-md bg-input">
              <i className="fas fa-lock text-2xl mb-2 text-light"></i>
              <p className="text-sm">Complete today's tasks to unlock tomorrow's AI recommendations.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyPlan;
