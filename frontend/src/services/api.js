import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

// Campaign APIs
export const campaignApi = {
  list: (params) => 
    api.get('/campaigns/', { params }),
  
  get: (id) => 
    api.get(`/campaigns/${id}/`),
  
  create: (data) => 
    api.post('/campaigns/', data),
  
  update: (id, data) => 
    api.patch(`/campaigns/${id}/`, data),
  
  activate: (id) => 
    api.post(`/campaigns/${id}/activate/`),
  
  pause: (id) => 
    api.post(`/campaigns/${id}/pause/`),
  
  complete: (id) => 
    api.post(`/campaigns/${id}/complete/`),
  
  mintFunds: (id, amount, purpose) => 
    api.post(`/campaigns/${id}/mint_funds/`, { amount, purpose }),
  
  distribute: (id, data) => 
    api.post(`/campaigns/${id}/distribute/`, data),
  
  getStats: (id) => 
    api.get(`/campaigns/${id}/stats/`),
  
  getBeneficiaries: (id) => 
    api.get(`/campaigns/${id}/beneficiaries/`),
  
  getPublic: () => 
    api.get('/campaigns/public/'),
};

// Beneficiary APIs
export const beneficiaryApi = {
  list: (params) => 
    api.get('/auth/beneficiaries/', { params }),
  
  get: (id) => 
    api.get(`/auth/beneficiaries/${id}/`),
  
  register: (data) => 
    api.post('/auth/beneficiaries/register/', data),
  
  verify: (userId, status, notes) => 
    api.post('/auth/beneficiaries/verify/', { user_id: userId, status, notes }),
  
  pending: () => 
    api.get('/auth/beneficiaries/pending/'),
  
  getSpending: (id) => 
    api.get(`/auth/beneficiaries/${id}/spending/`),
};

// Merchant APIs
export const merchantApi = {
  list: (params) => 
    api.get('/auth/merchants/', { params }),
  
  get: (id) => 
    api.get(`/auth/merchants/${id}/`),
  
  create: (data) => 
    api.post('/auth/merchants/', data),
  
  registerOnChain: (id) => 
    api.post(`/auth/merchants/${id}/register_on_chain/`),
};

// Transaction APIs
export const transactionApi = {
  list: (params) => 
    api.get('/transactions/logs/', { params }),
  
  get: (id) => 
    api.get(`/transactions/logs/${id}/`),
  
  getFlagged: () => 
    api.get('/transactions/logs/flagged/'),
  
  clearFlag: (id, reason) => 
    api.post(`/transactions/logs/${id}/clear_flag/`, { reason }),
  
  getTransparency: () => 
    api.get('/transactions/transparency/'),
  
  export: (format, params) => 
    api.get('/transactions/export/', { 
      params: { format, ...params },
      responseType: format === 'csv' ? 'blob' : 'json'
    }),
};

// ML APIs
export const mlApi = {
  checkFraud: (data) => 
    api.post('/ml/fraud-check/', data),
  
  getBeneficiaryRisk: (id) => 
    api.get(`/ml/beneficiary-risk/${id}/`),
  
  trainModel: () => 
    api.post('/ml/train/'),
  
  getModelStatus: () => 
    api.get('/ml/status/'),
  
  analyzeAll: (limit) => 
    api.post('/ml/analyze-all/', { limit }),
};

// Wallet APIs
export const walletApi = {
  list: () => 
    api.get('/auth/wallets/'),
  
  connect: (address, signature, message) => 
    api.post('/auth/connect-wallet/', { address, signature, message }),
  
  setPrimary: (id) => 
    api.post(`/auth/wallets/${id}/set_primary/`),
};

// Admin Stats
export const adminApi = {
  getStats: () => 
    api.get('/auth/admin/stats/'),
};
