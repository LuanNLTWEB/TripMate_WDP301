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
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

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
  }),

  forgotPassword: (data) => apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  verifyOtp: (data) => apiRequest('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  resendOtp: (data) => apiRequest('/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  resetPassword: (data) => apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};

export const accountApi = {
  getAll: (params = '') => {
    if (typeof params === 'string') {
      const search = params;
      return apiRequest(`/admin/accounts${search ? `?search=${encodeURIComponent(search)}` : ''}`, { method: 'GET' });
    }
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/admin/accounts${queryString}`, { method: 'GET' });
  },
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

export const activityLogApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.action && params.action !== 'all') query.append('action', params.action);
    if (params.targetType && params.targetType !== 'all') query.append('targetType', params.targetType);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/admin/activity-logs${queryString}`, { method: 'GET' });
  }
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
  getManaged: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.categoryId) query.append('categoryId', params.categoryId);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/destinations/management${queryString}`, { method: 'GET' });
  },
  getManagedById: (id) => apiRequest(`/destinations/management/${id}`, { method: 'GET' }),
  // START UC-17 Create Destination
  create: (destination) => apiRequest('/destinations', {
    method: 'POST',
    body: JSON.stringify(destination)
  }),
  // END UC-17 Create Destination
  // START UC-121 Update Destination Status
  updateStatus: (id, status) => apiRequest(`/destinations/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  }),
  // END UC-121 Update Destination Status
  update: (id, destination) => apiRequest(`/destinations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(destination)
  }),
  remove: (id) => apiRequest(`/destinations/${id}`, { method: 'DELETE' }),
  getFavorites: () => apiRequest('/destinations/favorites', { method: 'GET' }),
  toggleFavorite: (id) => apiRequest(`/destinations/${id}/favorite`, { method: 'POST' }),
  removeFavorite: (id) => apiRequest(`/destinations/${id}/favorite`, { method: 'DELETE' })
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
  listShared: () => apiRequest('/itineraries/shared', { method: 'GET' }),
  // START UC-48 View Personal Itinerary
  list: () => apiRequest('/itineraries', { method: 'GET' }),
  // END UC-48 View Personal Itinerary
  getBudget: (id) => apiRequest(`/itineraries/${id}/budget`, { method: 'GET' }),
  create: (itinerary) => apiRequest('/itineraries', {
    method: 'POST',
    body: JSON.stringify(itinerary)
  }),
  update: (id, itinerary) => apiRequest(`/itineraries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(itinerary)
  }),
  // START UC-53 Add Activity to Itinerary
  addActivity: (id, activity) => apiRequest(`/itineraries/${id}/activities`, {
    method: 'POST',
    body: JSON.stringify(activity)
  }),
  // END UC-53 Add Activity to Itinerary
  // START UC-58 Check Time Conflict
  getConflicts: (id) => apiRequest(`/itineraries/${id}/conflicts`, {
    method: 'GET'
  }),
  checkTimeConflict: (id, payload) => apiRequest(`/itineraries/${id}/conflicts/check`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  // END UC-58 Check Time Conflict
  reorderActivities: (id, activities) => apiRequest(`/itineraries/${id}/activities/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ activities })
  }),
  removeActivity: (id, activityId) => apiRequest(`/itineraries/${id}/activities/${activityId}`, {
    method: 'DELETE'
  }),
  updateActivity: (id, activityId, activity) => apiRequest(`/itineraries/${id}/activities/${activityId}`, {
    method: 'PUT',
    body: JSON.stringify(activity)
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
  // START UC-48 View Personal Itinerary
  getById: (id) => apiRequest(`/itineraries/${id}`, {
    method: 'GET'
  }),
  // END UC-48 View Personal Itinerary
  duplicate: (id, payload) => apiRequest(`/itineraries/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify(payload || {})
  }),
  share: (id, payload) => apiRequest(`/itineraries/${id}/share`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  removeCollaborator: (id, userId) => apiRequest(`/itineraries/${id}/collaborators/${userId}`, {
    method: 'DELETE'
  }),
  // START UC-137 Leave Itinerary
  leave: (id, newOwnerId) => apiRequest(`/itineraries/${id}/leave`, {
    method: 'DELETE',
    ...(newOwnerId ? { body: JSON.stringify({ newOwnerId }) } : {})
  }),
  // END UC-137 Leave Itinerary
  // START UC-120 Transfer Itinerary Ownership
  transferOwnership: (id, newOwnerId) => apiRequest(`/itineraries/${id}/owner`, {
    method: 'PUT',
    body: JSON.stringify({ newOwnerId })
  }),
  // END UC-120 Transfer Itinerary Ownership
  changeCollaboratorRole: (id, userId, permission) => apiRequest(`/itineraries/${id}/collaborators/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ permission })
  }),
  invite: (id, payload) => apiRequest(`/itineraries/${id}/invitations`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  deleteSentInvitation: (id, notificationId) => apiRequest(`/itineraries/${id}/invitations/${notificationId}`, {
    method: 'DELETE'
  }),
  listCollaborators: (id) => apiRequest(`/itineraries/${id}/collaborators`, { method: 'GET' }),
  listReceivedInvitations: (status) => apiRequest(
    `/itineraries/invitations${status ? `?status=${encodeURIComponent(status)}` : ''}`,
    { method: 'GET' }
  ),
  respondInvitation: (notificationId, action) => apiRequest(`/itineraries/invitations/${notificationId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ action })
  }),
  addComment: (id, content) => apiRequest(`/itineraries/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content })
  }),
  deleteComment: (id, commentId) => apiRequest(`/itineraries/${id}/comments/${commentId}`, {
    method: 'DELETE'
  }),
  updatePackingItem: (id, itemId, payload) => apiRequest(`/itineraries/${id}/packing-items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  removePackingItem: (id, itemId) => apiRequest(`/itineraries/${id}/packing-items/${itemId}`, {
    method: 'DELETE'
  }),
  // START UC-62 Duplicate Itinerary / Save Shared Itinerary to My Account (BR-73)
  duplicate: (id, payload) => apiRequest(`/itineraries/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify(payload || {})
  }),
  // END UC-62 Duplicate Itinerary / Save Shared Itinerary to My Account
  delete: (id) => apiRequest(`/itineraries/${id}`, { method: 'DELETE' })
};

export const statsApi = {
  // START UC-102 View Platform Statistics
  getPlatformStats: () => apiRequest('/stats/platform', { method: 'GET' }),
  // END UC-102 View Platform Statistics
  getAdminStats: (params = {}) => {
    const query = new URLSearchParams();
    if (params.months) query.append('months', params.months);
    const queryString = query.toString() ? '?' + query.toString() : '';
    return apiRequest('/stats/admin' + queryString, { method: 'GET' });
  }
};

export const announcementApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/announcements${queryString}`, { method: 'GET' });
  },
  getById: (id) => apiRequest(`/announcements/${id}`, { method: 'GET' }),
  getManaged: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.audience && params.audience !== 'all') query.append('audience', params.audience);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/announcements/management${queryString}`, { method: 'GET' });
  },
  create: (announcement) => apiRequest('/announcements', {
    method: 'POST',
    body: JSON.stringify(announcement)
  }),
  update: (id, announcement) => apiRequest(`/announcements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(announcement)
  }),
  delete: (id) => apiRequest(`/announcements/${id}`, {
    method: 'DELETE'
  })
};

export const reviewApi = {
  getByTour: (tourId) => apiRequest(`/reviews/tours/${tourId}`, { method: 'GET' }),
  getEligibility: (tourId) => apiRequest(`/reviews/tours/${tourId}/eligibility`, { method: 'GET' }),
  create: (tourId, payload) => apiRequest(`/reviews/tours/${tourId}`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  delete: (id) => apiRequest(`/reviews/${id}`, { method: 'DELETE' }),
  hide: (id, moderationReason) => apiRequest(`/reviews/${id}/hide`, {
    method: 'PATCH',
    body: JSON.stringify({ moderationReason })
  }),
  // START Vote Helpful on Tour Review
  voteHelpful: (id) => apiRequest(`/reviews/${id}/vote-helpful`, { method: 'POST' }),
  // END Vote Helpful on Tour Review
  // START UC-89 Update Tour Review
  update: (id, payload) => apiRequest(`/reviews/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  // END UC-89 Update Tour Review
  // START UC-95 Restore Review
  restore: (id) => apiRequest(`/reviews/${id}/restore`, { method: 'PATCH' }),
  // END UC-95 Restore Review
  report: (id, payload) => apiRequest(`/reviews/${id}/report`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getForModeration: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.deleted) query.append('deleted', params.deleted);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/reviews/moderation${queryString}`, { method: 'GET' });
  },
  getReported: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/reviews/reported${queryString}`, { method: 'GET' });
  },
  moderate: (id, payload) => apiRequest(`/reviews/${id}/moderate`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
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
  // START UC-25 View Tour Details
  getById: (id) => apiRequest(`/tours/${id}`, { method: 'GET' }),
  // END UC-25 View Tour Details
  checkAvailability: (id, date = '') => {
    const queryString = date ? `?date=${encodeURIComponent(date)}` : '';
    return apiRequest(`/tours/${id}/availability${queryString}`, { method: 'GET' });
  },
  create: (tour) => apiRequest('/tours', {
    method: 'POST',
    body: JSON.stringify(tour)
  }),
  update: (id, tour) => apiRequest(`/tours/${id}`, {
    method: 'PUT',
    body: JSON.stringify(tour)
  }),
  remove: (id) => apiRequest(`/tours/${id}`, { method: 'DELETE' }),
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
  restore: (id) => apiRequest(`/tours/${id}/restore`, { method: 'PATCH' }),
  // START UC-30 View Favorite Tours
  getFavorites: () => apiRequest('/tours/favorites', { method: 'GET' }),
  // END UC-30 View Favorite Tours
  saveFavorite: (id) => apiRequest(`/tours/${id}/favorite`, { method: 'POST' }),
  removeFavorite: (id) => apiRequest(`/tours/${id}/favorite`, { method: 'DELETE' }),
  requestRevision: (id, note) => apiRequest(`/tours/${id}/revision`, {
    method: 'PATCH',
    body: JSON.stringify({ note })
  }),
  // START UC-35 View Approval Status
  getProviderTours: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/tours/provider${queryString}`, { method: 'GET' });
  },
  getProviderById: (id) => apiRequest(`/tours/provider/${id}`, { method: 'GET' }),
  // END UC-35 View Approval Status
  // START UC-24 Duplicate Tour
  duplicate: (id) => apiRequest(`/tours/${id}/duplicate`, { method: 'POST' }),
  // END UC-24 Duplicate Tour
  setDetails: (id, details) => apiRequest(`/tours/${id}/details`, {
    method: 'PUT',
    body: JSON.stringify(details)
  }),
  createSchedule: (id, scheduleData) => apiRequest(`/tours/${id}/schedule`, {
    method: 'POST',
    body: JSON.stringify(scheduleData)
  }),
  updateSchedule: (id, scheduleId, scheduleData) => apiRequest(`/tours/${id}/schedule/${scheduleId}`, {
    method: 'PUT',
    body: JSON.stringify(scheduleData)
  }),
  deleteSchedule: (id, scheduleId) => apiRequest(`/tours/${id}/schedule/${scheduleId}`, {
    method: 'DELETE'
  }),
  getSchedule: (id) => apiRequest(`/tours/${id}/schedule`, { method: 'GET' }),
  // START UC-45 Update Tour Capacity
  updateCapacity: (id, availableSeats) => apiRequest(`/tours/${id}/capacity`, {
    method: 'PUT',
    body: JSON.stringify({ availableSeats })
  }),
  // END UC-45 Update Tour Capacity
  updatePrice: (id, price) => apiRequest(`/tours/${id}/price`, {
    method: 'PATCH',
    body: JSON.stringify({ price })
  }),
  updateDeparture: (id, payload) => apiRequest(`/tours/${id}/departure`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
};
export const departureApi = {
  // START UC-40 Create Tour Departure
  create: (payload) => apiRequest('/departures', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  // END UC-40 Create Tour Departure
  listByTour: (tourId) => apiRequest(`/departures?tourId=${tourId}`, { method: 'GET' }),
  exportManifest: async (id) => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/departures/${id}/manifest`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    if (!response.ok) {
      let message = 'Không thể xuất danh sách đoàn khách.';
      try {
        const data = await response.json();
        message = data.message || message;
      } catch {
        // Giữ thông báo mặc định khi server không trả về JSON.
      }
      throw new Error(message);
    }

    return response.blob();
  },
  update: (id, payload) => apiRequest(`/departures/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  // START UC-43 Cancel Tour Departure
  cancel: (id, payload) => apiRequest(`/departures/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify(payload || {})
  })
  // END UC-43 Cancel Tour Departure
};

export const uploadApi = {
  uploadImage: (formData) => apiRequest('/upload', {
    method: 'POST',
    body: formData
  })
};

export const bookingApi = {
  create: (tourId, bookingData) => apiRequest(`/bookings/${tourId}`, {
    method: 'POST',
    body: JSON.stringify(bookingData)
  }),
  getMyBookings: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.append('status', params.status);
    const qs = searchParams.toString();
    return apiRequest(`/bookings/my${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
  getProviderRequests: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/bookings/provider${queryString}`, { method: 'GET' });
  },
  approveBooking: (id) => apiRequest(`/bookings/provider/${id}/confirm`, { method: 'PATCH' }),
  confirmBooking: (id) => apiRequest(`/bookings/provider/${id}/confirm`, { method: 'PATCH' }),
  // START UC-78 Respond to Booking (Provider)
  respondBooking: (id, payload) => apiRequest(`/bookings/provider/${id}/respond`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  }),
  // END UC-78 Respond to Booking (Provider)
  // START UC-86 Mark Booking as No-Show (Provider)
  markNoShow: (id, noShowReason) => apiRequest(`/bookings/provider/${id}/no-show`, {
    method: 'PATCH',
    body: JSON.stringify({ noShowReason })
  }),
  // END UC-86 Mark Booking as No-Show (Provider)
  // START UC-82 Download Booking Voucher (Customer)
  getVoucher: (id) => apiRequest(`/bookings/${id}/voucher`, { method: 'GET' }),
  // END UC-82 Download Booking Voucher (Customer)

  // START UC-85 Confirm Payment & Check-in
  // Provider xác nhận đã thu tiền tại điểm đón rồi điểm danh khách lên xe.
  confirmPayment: (id, payload = {}) => apiRequest(`/bookings/provider/${id}/payment`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  }),
  checkIn: (id) => apiRequest(`/bookings/provider/${id}/check-in`, { method: 'PATCH' }),
  // END UC-85 Confirm Payment & Check-in
  completeBooking: (id) => apiRequest(`/bookings/provider/${id}/complete`, { method: 'PATCH' }),

  // START UC-123 Export Provider Booking Report
  exportProviderReport: async ({ from, to } = {}) => {
    const query = new URLSearchParams();
    if (from) query.append('from', from);
    if (to) query.append('to', to);
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/bookings/provider/report?${query.toString()}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    if (!response.ok) {
      let message = 'Không thể xuất báo cáo đặt tour.';
      try {
        const data = await response.json();
        message = data.message || message;
      } catch {
        // Keep the user-facing fallback when the server does not return JSON.
      }
      throw new Error(message);
    }

    return response.blob();
  },
  // END UC-123 Export Provider Booking Report
  getById: (id) => apiRequest(`/bookings/${id}`, { method: 'GET' }),
  // START UC-74 Cancel Booking
  cancel: (id, reason) => apiRequest(`/bookings/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ reason })
  }),
  // END UC-74 Cancel Booking
  // START STT 156 Reset No-Show Count (Staff)
  resetNoShow: (userId, reason) => apiRequest(`/bookings/users/${userId}/reset-no-show`, {
    method: 'PATCH',
    body: JSON.stringify({ reason })
  })
  // END STT 156 Reset No-Show Count (Staff)
};

// START UC-66 Submit Booking Complaint
// Ảnh được upload trước qua /complaints/evidence (FormData, field `image`),
// sau đó gửi khiếu nại bằng JSON kèm mảng URL `evidenceImages`.
export const complaintApi = {
  uploadEvidence: (formData) => apiRequest('/complaints/evidence', {
    method: 'POST',
    body: formData
  }),
  create: (payload) => apiRequest('/complaints', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  // UC-66 – customer xem khiếu nại của mình; UC-81/153/154 – staff tra cứu/xử lý.
  getMine: () => apiRequest('/complaints/my', { method: 'GET' }),
  cancel: (id) => apiRequest(`/complaints/${id}/cancel`, { method: 'PATCH' }),
  getManaged: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/complaints/management${queryString}`, { method: 'GET' });
  },
  getById: (id) => apiRequest(`/complaints/management/${id}`, { method: 'GET' }),
  resolve: (id, payload) => apiRequest(`/complaints/${id}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  }),
  // START STT 68 Update Booking Complaint (Customer)
  update: (id, payload) => apiRequest(`/complaints/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
  // END STT 68 Update Booking Complaint (Customer)
};
// END UC-66 Submit Booking Complaint

export const notificationApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.type && params.type !== 'all') query.append('type', params.type);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/notifications${qs}`, { method: 'GET' });
  },
  getManaged: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.targetType) query.append('targetType', params.targetType);
    if (params.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/notifications/management${qs}`, { method: 'GET' });
  },
  create: (payload) => apiRequest('/notifications', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  markAsRead: (id) => apiRequest(`/notifications/${id}/read`, {
    method: 'PATCH'
  }),
  markAllAsRead: () => apiRequest('/notifications/read-all', {
    method: 'PATCH'
  }),
  update: (id, payload) => apiRequest(`/notifications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  delete: (id) => apiRequest(`/notifications/${id}`, {
    method: 'DELETE'
  })
};

// START UC-130 View Tour Submission List
// API bài gửi duyệt tour: staff thấy toàn bộ, provider chỉ thấy bài của mình.
export const tourSubmissionApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/tour-submissions${queryString}`, { method: 'GET' });
  },
  // END UC-130 View Tour Submission List
  getById: (id) => apiRequest(`/tour-submissions/${id}`, { method: 'GET' }),
  // START UC-128 Create Tour Submission
  create: (payload) => apiRequest('/tour-submissions', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  // END UC-128 Create Tour Submission
  // START UC-129 Update Tour Submission
  // Provider gửi nội dung đã sửa, staff gửi status kèm reviewNote.
  update: (id, payload) => apiRequest(`/tour-submissions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  // END UC-129 Update Tour Submission
  // START UC-131 Delete Tour Submission
  remove: (id) => apiRequest(`/tour-submissions/${id}`, { method: 'DELETE' })
  // END UC-131 Delete Tour Submission
};

export default authApi;
