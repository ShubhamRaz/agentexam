import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWeakTopics } from '../services/performance';
import { getStudyPlan, updateTaskStatus, generateStudyPlan } from '../services/plan';

const StudyPlan = () => {
  const [weakTopics, setWeakTopics] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [topicsData, planData] = await Promise.all([
        getWeakTopics().catch(() => []),
        getStudyPlan().catch(() => null)
      ]);
      setWeakTopics(topicsData || []);
      setPlan(planData);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      const newPlan = await generateStudyPlan();
      setPlan(newPlan);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      // Optimistically update the UI
      setPlan(prev => {
        if (!prev) return prev;
        const newTasks = prev.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
        return { ...prev, tasks: newTasks };
      });
      await updateTaskStatus(taskId, newStatus);
    } catch (e) {
      // Revert if error (just fetch again for simplicity here)
      fetchData();
    }
  };

  // Group tasks by date
  const tasksByDate = {};
  if (plan && plan.tasks) {
    plan.tasks.forEach(task => {
      const d = task.date;
      if (!tasksByDate[d]) tasksByDate[d] = [];
      tasksByDate[d].push(task);
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="study-plan-page max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="text-2xl font-bold mb-1">Your Personalized Plan</h3>
          <p className="text-muted text-sm">Generated based on your mock test performance and analytics.</p>
        </div>
        <button className="btn btn-primary" onClick={handleGeneratePlan} disabled={generating || loading}>
          {generating ? <><i className="fas fa-spinner fa-spin mr-2"></i>Regenerating...</> : <><i className="fas fa-sync-alt mr-2"></i>Regenerate Plan</>}
        </button>
      </div>

      <div className="grid-2col">
        {/* Weak Topics */}
        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-bullseye text-danger mr-2"></i>Priority Topics (Weak Areas)</h4>
          </div>
          {loading ? (
            <div className="p-4 text-center text-muted"><i className="fas fa-spinner fa-spin mr-2"></i>Loading...</div>
          ) : weakTopics.length === 0 ? (
            <div className="p-6 text-center text-muted">
              <i className="fas fa-star text-warning text-2xl mb-2 block"></i>
              <p className="text-sm">No weak topics yet! Keep taking exams to get personalized recommendations.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-2">
              {weakTopics.map((topic) => (
                <div key={topic.topic_id} className="p-3 rounded-md" style={{ background: '#fee2e2', border: '1px solid #fecaca' }}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="font-medium" style={{ color: '#991b1b' }}>{topic.topic_name}</div>
                    <span className="text-sm font-bold" style={{ color: '#ef4444' }}>{Math.round(topic.accuracy)}%</span>
                  </div>
                  <div className="text-xs" style={{ color: '#b91c1c' }}>
                    {topic.attempts} attempt{topic.attempts !== 1 ? 's' : ''}
                  </div>
                  <Link to="/exams" className="text-xs font-semibold mt-2 inline-block" style={{ color: '#1d4ed8' }}>
                    Practice this topic <i className="fas fa-arrow-right ml-1"></i>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly Plan Tasks */}
        <div className="flex flex-col gap-6">
          <div className="card">
            <div className="card-header">
              <h4><i className="fas fa-list-check text-warning mr-2"></i>Weekly Task Schedule</h4>
            </div>
            
            {loading ? (
               <div className="p-4 text-center text-muted"><i className="fas fa-spinner fa-spin mr-2"></i>Loading plan...</div>
            ) : !plan || !plan.tasks || plan.tasks.length === 0 ? (
               <div className="p-6 text-center text-muted border-2 border-dashed border-light rounded-md bg-input m-4">
                <i className="fas fa-hourglass-half text-2xl mb-2 text-warning block"></i>
                <p className="text-sm font-medium">No active plan</p>
                <button className="btn btn-primary mt-3 btn-sm" onClick={handleGeneratePlan} disabled={generating}>Generate Now</button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 p-4">
                {Object.keys(tasksByDate).sort().map(dateStr => {
                  const isToday = dateStr === todayStr;
                  const displayDate = isToday ? 'Today' : new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                  
                  return (
                    <div key={dateStr} className="mb-2">
                      <h5 className="font-bold text-sm text-main mb-2 border-b border-light pb-1">{displayDate}</h5>
                      <div className="flex flex-col gap-2">
                        {tasksByDate[dateStr].map(task => (
                          <div key={task.id} className="study-item flex items-center p-3 border border-light rounded-md hover:bg-input transition-colors">
                            <div className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 ${task.priority === 'HIGH' ? 'bg-danger' : task.priority === 'MEDIUM' ? 'bg-warning' : 'bg-primary'}`}></div>
                            <div className="flex-1">
                              <div className="text-sm font-medium" style={{ color: task.status === 'COMPLETED' ? '#9ca3af' : 'var(--text-main)', textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none' }}>
                                {task.title}
                              </div>
                              <div className="text-xs text-muted flex items-center gap-3 mt-1">
                                <span><i className="far fa-clock mr-1"></i>{task.duration_minutes}m</span>
                                <span>{task.task_type}</span>
                              </div>
                            </div>
                            <div className="flex-shrink-0 ml-3">
                              {task.status === 'COMPLETED' ? (
                                <button className="text-success hover:text-success text-sm" onClick={() => handleStatusChange(task.id, 'PENDING')}>
                                  <i className="fas fa-check-circle text-xl"></i>
                                </button>
                              ) : task.status === 'IN_PROGRESS' ? (
                                <button className="btn btn-success btn-sm p-1 px-3 text-xs" onClick={() => handleStatusChange(task.id, 'COMPLETED')}>
                                  Done
                                </button>
                              ) : (
                                <button className="btn btn-outline-primary btn-sm p-1 px-3 text-xs" onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}>
                                  Start
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyPlan;
