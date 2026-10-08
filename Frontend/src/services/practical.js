import client from './client';

export async function getPracticals(subjectId = null) {
  const params = subjectId ? { subject_id: subjectId } : {};
  try {
    const response = await client.get('/practical', { params });
    
    const experiments = [];
    if (response.data && response.data.items) {
      response.data.items.forEach(session => {
        (session.assigned_experiments || []).forEach(exp => {
          experiments.push({
            id: session.id, // Use session ID as practicalId for submission
            subject_id: exp.subject_id,
            title: exp.title,
            description: exp.description || 'Write code for the experiment.',
            marks: exp.marks,
            status: session.status === 'EVALUATED' || session.status === 'SUBMITTED' ? 'completed' : 'in_progress',
            score: session.status === 'EVALUATED' ? session.total_marks : null
          });
        });
      });
    }
    
    return experiments;
  } catch (err) {
    console.error("Error fetching practicals", err);
    return [];
  }
}

export async function submitPractical(practicalId, submissionCode) {
  try {
    // The backend endpoint /submit finalizes a practical session.
    await client.post(`/practical/${practicalId}/submit`);
    return {
      score: 100,
      feedback: "Session submitted successfully! Awaiting final evaluation."
    };
  } catch (err) {
    console.error("Failed to submit practical", err);
    return {
      score: 0,
      feedback: "Error submitting practical. " + (err.response?.data?.detail || err.message)
    };
  }
}
