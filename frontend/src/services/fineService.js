import { apiRequest } from './api';

export const getOverdue = () => apiRequest('/transactions/overdue', { method: 'GET' });

export const getFines = (status) => {
  const qs = status ? `?status=${status}` : '';
  return apiRequest(`/transactions/fines${qs}`, { method: 'GET' });
};

export const payFine = (id) =>
  apiRequest(`/transactions/${id}/pay-fine`, {
    method: 'POST'
  });
