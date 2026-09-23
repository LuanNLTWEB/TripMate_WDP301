const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

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

export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

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
  }),

  changePassword: (passwordData) => apiRequest('/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify(passwordData)
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

export const roleApi = {
  getAll: () => apiRequest('/admin/roles', { method: 'GET' }),
  create: (roleData) => apiRequest('/admin/roles', { method: 'POST', body: JSON.stringify(roleData) }),
  update: (id, roleData) => apiRequest(`/admin/roles/${id}`, { method: 'PUT', body: JSON.stringify(roleData) }),
  remove: (id) => apiRequest(`/admin/roles/${id}`, { method: 'DELETE' })
};

export const destinationApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.isPopular) query.append('isPopular', params.isPopular);
    if (params.search) query.append('search', params.search);
    if (params.categoryId) query.append('categoryId', params.categoryId);
    if (params.minRating) query.append('minRating', params.minRating);
    if (params.sort) query.append('sort', params.sort);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/destinations${queryString}`, { method: 'GET' });
  },
  getById: (id) => apiRequest(`/destinations/${id}`, { method: 'GET' }),
  create: (destination) => apiRequest('/destinations', {
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
  }),
  remove: (id) => apiRequest(`/destinations/${id}`, { method: 'DELETE' }),
  getFavorites: () => apiRequest('/destinations/favorites', { method: 'GET' }),
  toggleFavorite: (id) => apiRequest(`/destinations/${id}/favorite`, { method: 'POST' })
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

export const tourCategoryApi = {
  getAll: () => apiRequest('/tour-categories', { method: 'GET' }),
  create: (category) => apiRequest('/tour-categories', {
    method: 'POST',
    body: JSON.stringify(category)
  }),
  update: (id, category) => apiRequest(`/tour-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(category)
  }),
  remove: (id) => apiRequest(`/tour-categories/${id}`, { method: 'DELETE' })
};

export const itineraryApi = {
  list: () => apiRequest('/itineraries', { method: 'GET' }),
  listShared: () => apiRequest('/itineraries/shared', { method: 'GET' }),
  create: (itinerary) => apiRequest('/itineraries', {
    method: 'POST',
    body: JSON.stringify(itinerary)
  }),
  addActivity: (id, activity) => apiRequest(`/itineraries/${id}/activities`, {
    method: 'POST',
    body: JSON.stringify(activity)
  }),
  reorderActivities: (id, activities) => apiRequest(`/itineraries/${id}/activities/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ activities })
  }),
  removeActivity: (id, activityId) => apiRequest(`/itineraries/${id}/activities/${activityId}`, {
    method: 'DELETE'
  }),
  addDestination: (id, destinationId) => apiRequest(`/itineraries/${id}/destinations`, {
    method: 'POST',
    body: JSON.stringify({ destinationId })
  }),
  removeDestination: (id, destinationId) => apiRequest(`/itineraries/${id}/destinations/${destinationId}`, {
    method: 'DELETE'
  }),
  addTour: (id, tourId) => apiRequest(`/itineraries/${id}/tours`, {
    method: 'POST',
    body: JSON.stringify({ tourId })
  }),
  removeTour: (id, tourId) => apiRequest(`/itineraries/${id}/tours/${tourId}`, {
    method: 'DELETE'
  }),
  duplicate: (id, payload = {}) => apiRequest(`/itineraries/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  delete: (id) => apiRequest(`/itineraries/${id}`, { method: 'DELETE' })
};

export const statsApi = {
  getPlatformStats: () => apiRequest('/stats/platform', { method: 'GET' })
};

export const reviewApi = {
  getByTour: (tourId) => apiRequest(`/reviews/tours/${tourId}`, { method: 'GET' })
};

export const tourApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.departure) query.append('departure', params.departure);
    if (params.destination) query.append('destination', params.destination);
    if (params.maxPrice) query.append('maxPrice', params.maxPrice);
    if (params.minSeats) query.append('minSeats', params.minSeats);
    if (params.sort) query.append('sort', params.sort);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/tours${queryString}`, { method: 'GET' });
  },
  getById: (id) => apiRequest(`/tours/${id}`, { method: 'GET' }),
  getManaged: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/tours/management${queryString}`, { method: 'GET' });
  },
  getManagedById: (id) => apiRequest(`/tours/management/${id}`, { method: 'GET' }),
  setStatus: (id, status, reason = '') => apiRequest(`/tours/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason })
  }),
  getFavorites: () => apiRequest('/tours/favorites', { method: 'GET' }),
  saveFavorite: (id) => apiRequest(`/tours/${id}/favorite`, { method: 'POST' }),
  removeFavorite: (id) => apiRequest(`/tours/${id}/favorite`, { method: 'DELETE' })
};

export default authApi;
