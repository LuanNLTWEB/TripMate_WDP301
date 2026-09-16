const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Retrieve the current stored token
 */
export const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

/**
 * Save auth token and user
 */
export const setAuthData = (token, user, rememberMe = true) => {
  if (rememberMe) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  } else {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(user));
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

/**
 * Clear stored auth token and user
 */
export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

/**
 * Fetch wrapper with default headers and auth token
 */
export const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    error.status = response.status;
    error.errors = data.errors || [];
    throw error;
  }

  return data;
};

// Auth API endpoints
export const authApi = {
  login: (credentials) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),

  register: (userData) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),

  getMe: () => apiRequest('/auth/me', {
    method: 'GET'
  }),

  updateProfile: (profileData) => apiRequest('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData)
  })
};

export const accountApi = {
  getAll: (search = '') => apiRequest(`/admin/accounts${search ? `?search=${encodeURIComponent(search)}` : ''}`, { method: 'GET' }),
  getById: (id) => apiRequest(`/admin/accounts/${id}`, { method: 'GET' }),
  create: (accountData) => apiRequest('/admin/accounts', { method: 'POST', body: JSON.stringify(accountData) }),
  update: (id, accountData) => apiRequest(`/admin/accounts/${id}`, { method: 'PUT', body: JSON.stringify(accountData) }),
  setStatus: (id, isActive) => apiRequest(`/admin/accounts/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
  remove: (id) => apiRequest(`/admin/accounts/${id}`, { method: 'DELETE' })
};

export const destinationApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.isPopular) query.append('isPopular', params.isPopular);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/destinations${queryString}`, { method: 'GET' });
  },
  getById: (id) => apiRequest(`/destinations/${id}`, { method: 'GET' })
  ,create: (destination) => apiRequest('/destinations', {
    method: 'POST',
    body: JSON.stringify(destination)
  }),
  updateStatus: (id, status) => apiRequest(`/destinations/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  }),
  update: (id, destination) => apiRequest(`/destinations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(destination)
  })
};

export const destinationCategoryApi = {
  getAll: () => apiRequest('/destination-categories', { method: 'GET' }),
  create: (category) => apiRequest('/destination-categories', {
    method: 'POST',
    body: JSON.stringify(category)
  }),
  update: (id, category) => apiRequest(`/destination-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(category)
  }),
  remove: (id) => apiRequest(`/destination-categories/${id}`, { method: 'DELETE' })
};

export const itineraryApi = {
  list: () => apiRequest('/itineraries', { method: 'GET' }),
  create: (itinerary) => apiRequest('/itineraries', {
    method: 'POST',
    body: JSON.stringify(itinerary)
  }),
  addActivity: (id, activity) => apiRequest(`/itineraries/${id}/activities`, {
    method: 'POST',
    body: JSON.stringify(activity)
  })
};

export default authApi;
