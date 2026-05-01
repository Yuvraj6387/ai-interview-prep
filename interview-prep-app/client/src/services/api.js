import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://ai-interview-backend-4bue.onrender.com/api' 
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getCurrentUser: () => api.get('/auth/me'),
};

// Job Profile APIs
const normalizeProfileId = (profileOrId) => {
  if (!profileOrId) return '';
  if (typeof profileOrId === 'string') return profileOrId;
  return profileOrId._id || profileOrId.id || '';
};

export const profileAPI = {
  getAll: () => api.get('/profiles'),
  create: (profileData) => api.post('/profiles', profileData),
  delete: (id) => api.delete(`/profiles/${id}`),
  generateQuestions: (profileOrId) => {
    const id = normalizeProfileId(profileOrId);
    return api.post(`/profiles/${id}/generate-questions`);
  },
};

// Question APIs
export const questionAPI = {
  getByProfile: (profileId) => api.get(`/questions/profile/${profileId}`),
  getPinned: () => api.get('/questions/pinned'),
  togglePin: (id) => api.patch(`/questions/${id}/pin`),
  getExplanation: (id) => api.post(`/questions/${id}/explanation`),
};

export default api;
