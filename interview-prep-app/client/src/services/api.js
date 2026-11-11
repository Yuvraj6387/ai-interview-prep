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

// The backend sleeps on its free plan and takes a while to wake up. Nudge it as
// soon as the page loads so it wakes while the visitor is reading the landing
// page, rather than after they click something and are left waiting. A signed-in
// visitor already wakes it with /auth/me, so skip the extra request for them.
export const warmUpServer = () => {
  if (localStorage.getItem('token')) return;
  api.get('/health').catch(() => {});
};

// Auth APIs
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getCurrentUser: () => api.get('/auth/me'),
  google: (credential) => api.post('/auth/google', { credential }),
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
  generateDescription: (payload) => api.post('/profiles/generate-description', payload),
  delete: (id) => api.delete(`/profiles/${id}`),
  generateQuestions: (profileOrId) => {
    const id = normalizeProfileId(profileOrId);
    return api.post(`/profiles/${id}/generate-questions`);
  },
};

// Resume APIs
export const resumeAPI = {
  getMine: () => api.get('/resume'),
  upload: (file) => {
    const formData = new FormData();
    formData.append('resume', file);
    return api.post('/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  match: (jobDescription) => api.post('/resume/match', { jobDescription }),
  atsScan: (targetRole) => api.post('/resume/ats-scan', { targetRole }),
  rewriteBullet: (bullet, targetRole) => api.post('/resume/rewrite-bullet', { bullet, targetRole }),
};

// Resume Builder APIs (saved resume versions)
export const builderAPI = {
  list: () => api.get('/builder'),
  create: () => api.post('/builder'),
  importFromUpload: () => api.post('/builder/import'),
  get: (id) => api.get(`/builder/${id}`),
  save: (id, { title, template, accentColor, content }) => api.put(`/builder/${id}`, { title, template, accentColor, content }),
  duplicate: (id) => api.post(`/builder/${id}/duplicate`),
  remove: (id) => api.delete(`/builder/${id}`),
  summary: (content, targetRole) => api.post('/builder/summary', { content, targetRole }),
  tailor: (id, jobDescription) => api.post(`/builder/${id}/tailor`, { jobDescription }),
};

// Interview (adaptive mock interview) APIs
export const interviewAPI = {
  start: (config) => api.post('/interviews', config),
  submitAnswer: (id, payload) => api.post(`/interviews/${id}/answer`, payload),
  end: (id) => api.post(`/interviews/${id}/end`),
  getAll: () => api.get('/interviews'),
  getById: (id) => api.get(`/interviews/${id}`),
};

// Learning roadmap (study plan built from the user's own goal)
export const roadmapAPI = {
  get: () => api.get('/roadmap'),
  create: ({ goal, level, duration }) => api.post('/roadmap', { goal, level, duration }),
  toggleItem: (day, kind, index, done) => api.patch('/roadmap/item', { day, kind, index, done }),
  remove: () => api.delete('/roadmap'),
};

export const notesAPI = {
  list: (search = '') => api.get('/notes', { params: search ? { search } : {} }),
  mine: () => api.get('/notes/mine'),
  get: (id) => api.get(`/notes/${id}`),
  create: (note) => api.post('/notes', note),
  update: (id, note) => api.put(`/notes/${id}`, note),
  remove: (id) => api.delete(`/notes/${id}`),
};

export const dsaAPI = {
  list: () => api.get('/dsa/problems'),
  get: (id) => api.get(`/dsa/problems/${id}`),
  // Java only: JavaScript runs in the browser (utils/jsRunner.js).
  run: (id, language, code) => api.post(`/dsa/problems/${id}/run`, { language, code }),
  submit: (id, language, code, passedCount) => api.post(`/dsa/problems/${id}/submit`, { language, code, passedCount }),
  hint: (id, level, language, code) => api.post(`/dsa/problems/${id}/hint`, { level, language, code }),
  review: (id, language, code) => api.post(`/dsa/problems/${id}/review`, { language, code }),
};

// Question APIs
export const questionAPI = {
  getByProfile: (profileId) => api.get(`/questions/profile/${profileId}`),
  getPinned: () => api.get('/questions/pinned'),
  togglePin: (id) => api.patch(`/questions/${id}/pin`),
  getExplanation: (id) => api.post(`/questions/${id}/explanation`),
};

export default api;
