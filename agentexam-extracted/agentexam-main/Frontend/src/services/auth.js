import client from './client';

export async function login(email, password) {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', password);

  const response = await client.post('/auth/login', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  if (response.data.access_token) {
    localStorage.setItem('agentexam_token', response.data.access_token);
  }
  return response.data;
}

export async function register(name, email, password) {
  const response = await client.post('/auth/register', {
    name,
    email,
    password,
  });
  return response.data;
}

export async function getCurrentUser() {
  const response = await client.get('/auth/me');
  return response.data;
}

export function logout() {
  localStorage.removeItem('agentexam_token');
  window.location.href = '/login';
}
