import api from './axios';

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData, userData instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data)
};

export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (formData) => api.post('/users', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, data) => api.put(`/users/${id}`, data),
  updateWithPhoto: (id, formData) => api.put(`/users/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, data) => api.post(`/users/${id}/reset-password`, data)
};

export const stallsAPI = {
  getAll: (params) => api.get('/stalls', { params }),
  getById: (id) => api.get(`/stalls/${id}`),
  create: (data) => api.post('/stalls', data),
  update: (id, data) => api.put(`/stalls/${id}`, data),
  delete: (id) => api.delete(`/stalls/${id}`),
  getDashboard: () => api.get('/stalls/dashboard'),
  getMeterReadings: (id) => api.get(`/stalls/${id}/meters`),
  recordMeterReading: (id, data) => api.post(`/stalls/${id}/meters`, data)
};

export const billsAPI = {
  getAll: (params) => api.get('/bills', { params }),
  getById: (id) => api.get(`/bills/${id}`),
  create: (data) => api.post('/bills', data),
  update: (id, data) => api.put(`/bills/${id}`, data),
  uploadPayment: (id, formData) => api.post(`/bills/${id}/payment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  verifyPayment: (paymentId, data) => api.post(`/bills/payment/${paymentId}/verify`, data),
  getHistory: () => api.get('/bills/history'),
  calculate: (data) => api.post('/bills/calculate', data),
  getDueBills: () => api.get('/bills/due-soon')
};

export const contractsAPI = {
  getAll: (params) => api.get('/contracts', { params }),
  getById: (id) => api.get(`/contracts/${id}`),
  create: (formData) => api.post('/contracts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, formData) => api.put(`/contracts/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  terminate: (id) => api.post(`/contracts/${id}/terminate`),
  requestTermination: (id) => api.post(`/contracts/${id}/request-termination`),
  rejectTermination: (id) => api.post(`/contracts/${id}/reject-termination`)
};

export const maintenanceAPI = {
  getAll: (params) => api.get('/maintenance', { params }),
  getById: (id) => api.get(`/maintenance/${id}`),
  create: (formData) => api.post('/maintenance', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, formData) => api.put(`/maintenance/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/maintenance/${id}`),
  assignStaff: (id, data) => api.post(`/maintenance/${id}/assign`, data),
  updateStatus: (id, data) => api.put(`/maintenance/${id}/status`, data),
  uploadCompletion: (id, formData) => api.post(`/maintenance/${id}/completion`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

export const settingsAPI = {
  getAll: () => api.get('/settings'),
  getUtilityRates: () => api.get('/settings/utility-rates'),
  updateUtilityRates: (data) => api.put('/settings/utility-rates', data),
  update: (settings) => api.put('/settings', { settings })
};


export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  delete: (id) => api.delete(`/notifications/${id}`)
};

export const foodCourtsAPI = {
  getAll: () => api.get('/food-courts'),
  updateImage: (id, formData) => api.put(`/food-courts/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};


