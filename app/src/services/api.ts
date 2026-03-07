import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==========================
// REQUEST INTERCEPTOR
// ==========================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ==========================
// RESPONSE INTERCEPTOR
// ==========================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (error.response?.data?.code === 'TOKEN_EXPIRED') {
        try {
          const refreshToken = localStorage.getItem('refreshToken');

          if (!refreshToken) {
            throw new Error('No refresh token found');
          }

          const response = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken }
          );

          const { accessToken, refreshToken: newRefreshToken } =
            response.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          api.defaults.headers.common[
            'Authorization'
          ] = `Bearer ${accessToken}`;

          originalRequest.headers[
            'Authorization'
          ] = `Bearer ${accessToken}`;

          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');

          window.location.href = '/login';

          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

// ==========================
// AUTH API
// ==========================
export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials);

    const { accessToken, refreshToken, user } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }

    return response;
  },

  signupStudent: (data: any) =>
    api.post('/auth/signup-student', data),

  signupFaculty: (data: any) =>
    api.post('/auth/signup-faculty', data),

  verifyOTP: (userId: string, otp: string) =>
    api.post('/auth/verify-otp', { userId, otp }),

  resendOTP: (userId: string) =>
    api.post('/auth/resend-otp', { userId }),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (data: {
    userId: string;
    otp: string;
    newPassword: string;
  }) => api.post('/auth/reset-password', data),

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    return api.post('/auth/logout');
  },

  me: () => api.get('/auth/me'),
};

// ==========================
// ADMIN API
// ==========================
export const adminAPI = {
  getDashboard: () =>
    api.get('/admin/dashboard'),

  getPendingUsers: (params?: {
    role?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get('/admin/pending-users', { params }),

  approveUser: (
    userId: string,
    status: 'approved' | 'rejected',
    reason?: string
  ) =>
    api.patch(`/admin/approve-user/${userId}`, {
      status,
      reason,
    }),

  getUsers: (params?: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get('/admin/users', { params }),

  createClub: (data: any) =>
    api.post('/admin/clubs', data),

  getClubs: () =>
    api.get('/admin/clubs'),

  updateClub: (clubId: string, data: any) =>
    api.put(`/admin/clubs/${clubId}`, data),

  assignCoordinators: (clubId: string, studentIds: string[]) =>
    api.post(`/admin/clubs/${clubId}/coordinators`, {
      studentIds,
    }),

  removeCoordinator: (clubId: string, coordinatorId: string) =>
    api.delete(`/admin/clubs/${clubId}/coordinators/${coordinatorId}`),

  removeFaculty: (clubId: string) =>
    api.delete(`/admin/clubs/${clubId}/faculty`),

  getPendingEvents: () =>
    api.get('/admin/pending-events'),

  approveEvent: (
    eventId: string,
    status: 'approved' | 'rejected',
    reason?: string
  ) =>
    api.patch(`/admin/approve-event/${eventId}`, {
      status,
      reason,
    }),

  getAuditLogs: (params?: {
    action?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get('/admin/audit-logs', { params }),
};

// ==========================
// EVENTS API
// ==========================
export const eventsAPI = {
  getEvents: (params?: any) =>
    api.get('/events', { params }),

  getEvent: (eventId: string) =>
    api.get(`/events/${eventId}`),

  createEvent: (data: any) =>
    api.post('/events', data),

  updateEvent: (eventId: string, data: any) =>
    api.put(`/events/${eventId}`, data),

  deleteEvent: (eventId: string) =>
    api.delete(`/events/${eventId}`),

  getEventRegistrations: (eventId: string, params?: any) =>
    api.get(`/events/${eventId}/registrations`, { params }),
};

// ==========================
// REGISTRATIONS API
// ==========================
export const registrationsAPI = {
  register: (eventId: string) =>
    api.post(`/registrations/events/${eventId}/register`),

  getMyRegistrations: (params?: any) =>
    api.get('/registrations/my-registrations', { params }),

  getTicket: (registrationId: string) =>
    api.get(`/registrations/${registrationId}/ticket`),

  cancelRegistration: (registrationId: string) =>
    api.delete(`/registrations/${registrationId}`),

  verifyPayment: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) =>
    api.post('/payments/verify', data),
};

// ==========================
// PAYMENTS API
// ==========================
export const paymentsAPI = {
  verifyPayment: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) =>
    api.post('/payments/verify', data),

  getMyPayments: () =>
    api.get('/payments/my-payments'),
};

// ==========================
// REVIEWS API
// ==========================
export const reviewsAPI = {
  createReview: (eventId: string, data: {
    rating: number;
    comment?: string;
  }) =>
    api.post(`/reviews/events/${eventId}`, data),

  getEventReviews: (eventId: string, params?: any) =>
    api.get(`/reviews/events/${eventId}`, { params }),

  getMyReviews: () =>
    api.get('/reviews/my-reviews'),

  deleteReview: (reviewId: string) =>
    api.delete(`/reviews/${reviewId}`),
};

// ==========================
// FACULTY API
// ==========================
export const facultyAPI = {
  assignCoordinators: (clubId: string, studentIds: string[]) =>
    api.post(`/faculty/clubs/${clubId}/coordinators`, { studentIds }),

  removeCoordinator: (clubId: string, coordinatorId: string) =>
    api.delete(`/faculty/clubs/${clubId}/coordinators/${coordinatorId}`),
};

// ==========================
// COORDINATOR API
// ==========================
export const coordinatorAPI = {
  getEvents: (params?: any) =>
    api.get('/coordinator/events', { params }),

  getEventRegistrations: (eventId: string, params?: any) =>
    api.get(`/coordinator/events/${eventId}/registrations`, { params }),

  markAttendance: (registrationId: string, attended: boolean) =>
    api.post(`/coordinator/registrations/${registrationId}/attendance`, {
      attended,
    }),

  verifyTicket: (ticketId: string) =>
    api.post('/coordinator/verify-ticket', { ticketId }),

  exportRegistrations: (eventId: string, params?: any) =>
    api.get(`/coordinator/export-registrations/${eventId}`, {
      params,
      responseType: 'blob',
    }),
};

// ==========================
// CLUBS API
// ==========================
export const clubsAPI = {
  getClubs: () =>
    api.get('/clubs'),

  getClub: (clubId: string) =>
    api.get(`/clubs/${clubId}`),

  getClubEvents: (clubId: string, params?: any) =>
    api.get(`/clubs/${clubId}/events`, { params }),
};

// ==========================
// USERS API
// ==========================
export const usersAPI = {
  getProfile: () =>
    api.get('/users/profile'),

  updateProfile: (data: any) =>
    api.put('/users/profile', data),

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
  }) =>
    api.put('/users/change-password', data),

  getFaculty: () =>
    api.get('/users/faculty'),

  getStudents: (params?: any) =>
    api.get('/users/students', { params }),
};

export default api;
