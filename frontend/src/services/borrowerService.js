import { apiRequest } from './api';

export const getBorrowers = (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.department) query.set('department', params.department);
  const qs = query.toString();
  const endpoint = qs ? `/borrowers?${qs}` : '/borrowers';
  return apiRequest(endpoint, { method: 'GET' });
};

export const getBorrower = (id) => apiRequest(`/borrowers/${id}`, { method: 'GET' });

export const createBorrower = (data) =>
  apiRequest('/borrowers', {
    method: 'POST',
    body: data
  });

export const updateBorrower = (id, data) =>
  apiRequest(`/borrowers/${id}`, {
    method: 'PUT',
    body: data
  });

export const deleteBorrower = (id) =>
  apiRequest(`/borrowers/${id}`, {
    method: 'DELETE'
  });
