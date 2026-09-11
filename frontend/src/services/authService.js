import { apiRequest, setToken, removeToken } from './api';

export const login = async (email, password) => {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password }
  });

  if (data.token) {
    setToken(data.token);
  }

  return data;
};

export const fetchCurrentUser = async () => {
  const data = await apiRequest('/auth/me', {
    method: 'GET'
  });
  return data.user || data;
};

export const logout = () => {
  removeToken();
};
