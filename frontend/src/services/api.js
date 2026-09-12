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

export const destinationApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/destinations${query ? `?${query}` : ''}`);
  },

  create: (destination) => apiRequest('/destinations', {
    method: 'POST',
    body: JSON.stringify(destination)
  }),

  updateStatus: (id, status) => apiRequest(`/destinations/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  })
};

export const itineraryApi = {
  list: () => apiRequest('/itineraries'),
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
