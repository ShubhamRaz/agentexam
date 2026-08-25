import client from './client';

export async function getStudyPlan() {
  const response = await client.get('/study-plan/me');
  const d = response.data;
  
  // Group tasks by date to match frontend expectation
  const daysMap = {};
  (d.tasks || []).forEach(task => {
    const dateKey = task.date || 'Unknown Date';
    if (!daysMap[dateKey]) {
      daysMap[dateKey] = {
        date: dateKey,
        label: new Date(dateKey).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' }),
        isToday: new Date(dateKey).toDateString() === new Date().toDateString(),
        tasks: []
      };
    }
    daysMap[dateKey].tasks.push({
      id: task.id,
      title: task.title || task.topic || 'Study Session',
      subject: task.subject || 'General',
      type: task.type || 'study',
      priority: task.priority || 'medium',
      duration: task.duration || '1h',
      completed: task.completed || false
    });
  });
  
  const daysArray = Object.values(daysMap).sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return {
    totalDays: daysArray.length || 7,
    days: daysArray.length > 0 ? daysArray : [{ date: new Date().toISOString(), label: 'Today', isToday: true, tasks: [] }]
  };
}

export async function completeTask(taskId) {
  const response = await client.post(`/study-plan/tasks/${taskId}/complete`);
  return response.data;
}
