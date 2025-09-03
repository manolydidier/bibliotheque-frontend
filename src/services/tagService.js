import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const tagService = {
  
  getAllTags: () => api.get('/tags'),
  
  
  getTag: (id) => api.get(`/tags/${id}`),
  
 
  createTag: (tagData) => api.post('/tags', tagData),
  
  
  updateTag: (id, tagData) => api.put(`/tags/${id}`, tagData),
  
  
  deleteTag: (id) => api.delete(`/tags/${id}`),
};

export default api;