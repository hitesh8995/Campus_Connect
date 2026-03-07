export interface User {
  id: string;
  _id?: string;
  role: 'superadmin' | 'faculty' | 'coordinator' | 'student';
  name: string;
  email: string;
  emailVerified: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  rollNo?: string;
  department: string;
  section?: string;
  yearOfAdmission?: number;
  currentYear?: number;
  facultyId?: string;
  designation?: string;
  clubId?: string | Club;
  isActive: boolean;
  createdAt?: string;
}

export interface Club {
  id: string;
  _id?: string;
  name: string;
  description: string;
  logo?: string;
  createdBy: string;
  assignedFaculty?: string | User;
  coordinators?: string[] | User[];
  isActive: boolean;
  socialLinks?: {
    website?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
  totalEvents?: number;
  totalMembers?: number;
  createdAt?: string;
}

export interface Event {
  id: string;
  _id?: string;
  title: string;
  description: string;
  shortDescription?: string;
  clubId: string | Club;
  createdBy: string | User;
  status: 'pending_approval' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  isPublished: boolean;
  eventDate: string;
  eventEndDate?: string;
  venue: string;
  registrationStart: string;
  registrationEnd: string;
  isPaid: boolean;
  price: number;
  currency?: string;
  maxCapacity?: number;
  registeredCount: number;
  bannerImage?: string;
  gallery?: string[];
  category: 'Technical' | 'Cultural' | 'Sports' | 'Workshop' | 'Seminar' | 'Hackathon' | 'Other';
  tags?: string[];
  averageRating: number;
  totalReviews: number;
  rejectionReason?: string;
  approvedBy?: string | User;
  approvedAt?: string;
  attendanceEnabled?: boolean;
  createdAt?: string;
  // Virtual fields
  isRegistrationOpen?: boolean;
  isFull?: boolean;
  registrationStatus?: string | null;
}

export interface Registration {
  id: string;
  _id?: string;
  userId: string | User;
  eventId: string | Event;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'free' | 'failed' | 'refunded';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  ticketId?: string;
  qrCode?: string;
  registeredAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  attended: boolean;
  attendedAt?: string;
  markedBy?: string | User;
  amountPaid: number;
  expiresAt?: string;
}

export interface Payment {
  id: string;
  _id?: string;
  registrationId: string;
  userId: string;
  eventId: string | Event;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partially_refunded';
  method?: string;
  refundAmount?: number;
  refundReason?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  _id?: string;
  userId: string | User;
  eventId: string;
  registrationId: string;
  rating: number;
  comment?: string;
  isVisible: boolean;
  isFlagged: boolean;
  flagReason?: string;
  likes: number;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  _id?: string;
  action: string;
  performedBy: string | User;
  performedByRole: string;
  targetUser?: string | User;
  targetEvent?: string | Event;
  targetClub?: string | Club;
  details?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

export interface DashboardStats {
  users: {
    total: number;
    students: number;
    faculty: number;
    coordinators: number;
    pendingApproval: number;
  };
  clubs: {
    total: number;
    active: number;
  };
  events: {
    total: number;
    pending: number;
    approved: number;
    completed: number;
    cancelled: number;
  };
  registrations: {
    total: number;
    confirmed: number;
    pending: number;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  department: string;
}

export interface StudentSignupData extends SignupData {
  rollNo: string;
  section: string;
  yearOfAdmission: number;
  currentYear: number;
}

export interface FacultySignupData extends SignupData {
  facultyId: string;
  designation: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}
