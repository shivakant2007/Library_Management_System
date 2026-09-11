import { apiRequest } from './api';

export const issueBook = (data) =>
  apiRequest('/transactions/issue', {
    method: 'POST',
    body: data
  });

export const returnBook = (transactionId) =>
  apiRequest('/transactions/return', {
    method: 'POST',
    body: { transactionId }
  });

export const getActiveTransactions = () =>
  apiRequest('/transactions/active', { method: 'GET' });

export const getTransactions = () =>
  apiRequest('/transactions', { method: 'GET' });

export const getTransaction = (id) =>
  apiRequest(`/transactions/${id}`, { method: 'GET' });
