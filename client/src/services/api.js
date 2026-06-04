import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

// Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto refresh on 401
let isRefreshing = false;
let queue = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject }))
          .then((token) => { original.headers.Authorization = `Bearer ${token}`; return api(original); });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        queue.forEach((p) => p.resolve(data.accessToken));
        queue = [];
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (e) {
        queue.forEach((p) => p.reject(e));
        queue = [];
        localStorage.clear();
        window.location.href = '/login';
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Typed service functions ──────────────────────────────────────────────────

export const authService = {
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
};

export const dashboardService = {
  getData: () => api.get('/dashboard'),
};

export const materialsService = {
  getAll: (params) => api.get('/materials', { params }),
  getOne: (id) => api.get(`/materials/${id}`),
  create: (data) => api.post('/materials', data),
  update: (id, data) => api.put(`/materials/${id}`, data),
  delete: (id) => api.delete(`/materials/${id}`),
  bulkImport: (materials) => api.post('/materials/bulk-import', { materials }),
  getCategories: () => api.get('/materials/categories'),
  getLowStock: () => api.get('/materials/low-stock'),
};

export const vendorsService = {
  getAll: (params) => api.get('/vendors', { params }),
  getOne: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`),
};

export const warehousesService = {
  getAll: () => api.get('/warehouses'),
  getOne: (id) => api.get(`/warehouses/${id}`),
  create: (data) => api.post('/warehouses', data),
  update: (id, data) => api.put(`/warehouses/${id}`, data),
  createLocation: (whId, data) => api.post(`/warehouses/${whId}/locations`, data),
};

export const inventoryService = {
  getTransactions: (params) => api.get('/inventory/transactions', { params }),
  createTransaction: (data) => api.post('/inventory/transactions', data),
};

export const qualityService = {
  getInspections: (params) => api.get('/quality/inspections', { params }),
  createInspection: (data) => api.post('/quality/inspections', data),
  updateInspection: (id, data) => api.put(`/quality/inspections/${id}`, data),
};

export const purchaseOrderService = {
  getAll: (params) => api.get('/purchase-orders', { params }),
  getOne: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
};

export const movementsService = {
  getAll: (params) => api.get('/movements', { params }),
  create: (data) => api.post('/movements', data),
};

export const notificationsService = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const auditService = {
  getLogs: (params) => api.get('/audit-logs', { params }),
};

export const searchService = {
  search: (q) => api.get('/search', { params: { q } }),
};

export const reportsService = {
  materials: (params) => api.get('/reports/materials', { params, responseType: 'blob' }),
  inventory: (params) => api.get('/reports/inventory', { params, responseType: 'blob' }),
  audit: (params) => api.get('/reports/audit', { params, responseType: 'blob' }),
  quality: (params) => api.get('/reports/quality', { params, responseType: 'blob' }),
  cnotes: (params) => api.get('/reports/cnotes', { params, responseType: 'blob' }),
  sivs: (params) => api.get('/reports/sivs', { params, responseType: 'blob' }),
};

export const cnoteService = {
  getAll: (params) => api.get('/cnotes', { params }),
  getOne: (id) => api.get(`/cnotes/${id}`),
  create: (data) => api.post('/cnotes', data),
  update: (id, data) => api.put(`/cnotes/${id}`, data),
  delete: (id) => api.delete(`/cnotes/${id}`),
};

export const sivService = {
  getAll: (params) => api.get('/sivs', { params }),
  getOne: (id) => api.get(`/sivs/${id}`),
  create: (data) => api.post('/sivs', data),
  update: (id, data) => api.put(`/sivs/${id}`, data),
  approve: (id) => api.put(`/sivs/${id}/approve`),
  issue: (id) => api.put(`/sivs/${id}/issue`),
  delete: (id) => api.delete(`/sivs/${id}`),
};

export const filesService = {
  upload: (formData) => api.post('/files', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getFiles: (params) => api.get('/files', { params }),
  delete: (id) => api.delete(`/files/${id}`),
};

export const usersService = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
};

export const workflowsService = {
  getAll: () => api.get('/workflows'),
  create: (data) => api.post('/workflows', data),
  update: (id, data) => api.put(`/workflows/${id}`, data),
};

export const organizationService = {
  get: () => api.get('/organization'),
  update: (data) => api.put('/organization', data),
};

export const downloadBlob = (blobData, filename, mimeType) => {
  const blob = new Blob([blobData], mimeType ? { type: mimeType } : undefined);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
