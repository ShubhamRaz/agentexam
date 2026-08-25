import client from './client';

export async function getSubjects() {
  const response = await client.get('/subjects');
  return response.data;
}

export async function getSubject(subjectId) {
  const response = await client.get(`/subjects/${subjectId}`);
  return response.data;
}

export async function getSubjectUnits(subjectId) {
  const response = await client.get(`/subjects/${subjectId}/units`);
  return response.data;
}

export async function getSyllabus(subjectId) {
  // Returns syllabus materials.
  const response = await client.get(`/subjects/${subjectId}/syllabus`);
  return {
    materials: response.data
  };
}

export async function getUnitTopics(unitId) {
  const response = await client.get(`/units/${unitId}/topics`);
  return response.data;
}
