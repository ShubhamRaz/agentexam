import client from './client';

export async function getProfile() {
  const response = await client.get('/students/me');
  return response.data;
}

export async function updateProfile(updates) {
  const response = await client.put('/students/me', updates);
  return response.data;
}
