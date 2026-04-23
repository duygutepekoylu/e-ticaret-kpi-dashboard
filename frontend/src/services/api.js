import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — JWT token ekle
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — 401 gelince login'e yönlendir
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ---- Auth ----
export const login = (email, password) =>
  api.post('/auth/login', { email, password });

export const getMe = () => api.get('/me');

// ---- KPI ----
export const getKpiSummary = (params) => api.get('/kpi/summary', { params });
export const runKpi = () => api.post('/kpi/run');

// ---- Dashboard ----
export const getDashboardTrend = (params) => api.get('/dashboard/trend', { params });
export const getChannelPerformance = (params) => api.get('/dashboard/channel-performance', { params });
export const getPlatformPerformance = (params) => api.get('/dashboard/platform-performance', { params });
export const getCampaignPerformance = (params) => api.get('/dashboard/campaign-performance', { params });
export const getFunnel = (params) => api.get('/dashboard/funnel', { params });

// ---- Filters ----
export const getChannels = () => api.get('/filters/channels');
export const getCampaigns = () => api.get('/filters/campaigns');
export const getDevices = () => api.get('/filters/devices');
export const getCities = () => api.get('/filters/cities');
export const getDateRange = () => api.get('/filters/date-range');

// ---- Views ----
export const getViews = () => api.get('/views');
export const getView = (id) => api.get(`/views/${id}`);
export const createView = (data) => api.post('/views', data);
export const updateView = (id, data) => api.put(`/views/${id}`, data);
export const deleteView = (id) => api.delete(`/views/${id}`);

// ---- Segments ----
export const getSegments = () => api.get('/segments');
export const getSegment = (id) => api.get(`/segments/${id}`);
export const previewSegment = (id) => api.get(`/segments/${id}/preview`);
export const createSegment = (data) => api.post('/segments', data);
export const updateSegment = (id, data) => api.put(`/segments/${id}`, data);
export const deleteSegment = (id) => api.delete(`/segments/${id}`);

// ---- Export ----
export const exportData = (table, params) => api.get('/export', { params: { table, ...params } });

// ---- Logs ----
export const getAuditLogs = (params) => api.get('/logs/audit', { params });
export const getApiLogs = (params) => api.get('/logs/api', { params });

// ---- Imports ----
export const uploadImport = (formData) =>
  api.post('/imports', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getImports = () => api.get('/imports');
export const getImportPreview = (id) => api.get(`/imports/${id}/preview`);
export const commitImport = (id) => api.post(`/imports/${id}/commit`);
export const rollbackImport = (id) => api.delete(`/imports/${id}`);
export const getImportErrors = (id) => api.get(`/imports/${id}/errors`);

export default api;
