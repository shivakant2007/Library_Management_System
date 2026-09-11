import { apiRequest } from './api';

export const getBooks = () => apiRequest('/books', { method: 'GET' });

export const getBook = (id) => apiRequest(`/books/${id}`, { method: 'GET' });

export const createBook = (data) =>
  apiRequest('/books', {
    method: 'POST',
    body: data
  });

export const updateBook = (id, data) =>
  apiRequest(`/books/${id}`, {
    method: 'PUT',
    body: data
  });

export const deleteBook = (id) =>
  apiRequest(`/books/${id}`, {
    method: 'DELETE'
  });
