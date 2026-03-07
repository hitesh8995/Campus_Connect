import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './components/ThemeProvider';

// Layouts
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import FacultyLayout from './layouts/FacultyLayout';
import CoordinatorLayout from './layouts/CoordinatorLayout';
import StudentLayout from './layouts/StudentLayout';

// Public Pages
import Home from './pages/Home';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import Clubs from './pages/Clubs';
import ClubDetails from './pages/ClubDetails';

// Auth Pages
import Login from './pages/auth/Login';
import StudentSignup from './pages/auth/StudentSignup';
import FacultySignup from './pages/auth/FacultySignup';
import VerifyOTP from './pages/auth/VerifyOTP';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import PendingUsers from './pages/admin/PendingUsers';
import ManageUsers from './pages/admin/ManageUsers';
import ManageClubs from './pages/admin/ManageClubs';
import PendingEvents from './pages/admin/PendingEvents';
import AuditLogs from './pages/admin/AuditLogs';

// Faculty Pages
import FacultyDashboard from './pages/faculty/Dashboard';
import CreateEvent from './pages/faculty/CreateEvent';
import ManageEvents from './pages/faculty/ManageEvents';
import EventRegistrations from './pages/faculty/EventRegistrations';
import ManageClub from './pages/faculty/ManageClub';

// Coordinator Pages
import CoordinatorDashboard from './pages/coordinator/Dashboard';
import CoordinatorEvents from './pages/coordinator/Events';
import AttendanceList from './pages/coordinator/AttendanceList';
import Attendance from './pages/coordinator/Attendance';
import VerifyTicket from './pages/coordinator/VerifyTicket';

// Student Pages
import StudentDashboard from './pages/student/Dashboard';
import MyRegistrations from './pages/student/MyRegistrations';
import MyTickets from './pages/student/MyTickets';
import MyReviews from './pages/student/MyReviews';

// Protected Route Components
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="campus-connect-theme">
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Home />} />
              <Route path="events" element={<Events />} />
              <Route path="events/:eventId" element={<EventDetails />} />
              <Route path="clubs" element={<Clubs />} />
              <Route path="clubs/:clubId" element={<ClubDetails />} />
            </Route>

            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup/student" element={<StudentSignup />} />
            <Route path="/signup/faculty" element={<FacultySignup />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="pending-users" element={<PendingUsers />} />
              <Route path="users" element={<ManageUsers />} />
              <Route path="clubs" element={<ManageClubs />} />
              <Route path="pending-events" element={<PendingEvents />} />
              <Route path="audit-logs" element={<AuditLogs />} />
            </Route>

            {/* Faculty Routes */}
            <Route path="/faculty" element={
              <ProtectedRoute allowedRoles={['faculty', 'superadmin']}>
                <FacultyLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/faculty/dashboard" replace />} />
              <Route path="dashboard" element={<FacultyDashboard />} />
              <Route path="club" element={<ManageClub />} />
              <Route path="events/create" element={<CreateEvent />} />
              <Route path="events" element={<ManageEvents />} />
              <Route path="events/:eventId/registrations" element={<EventRegistrations />} />
            </Route>

            {/* Coordinator Routes */}
            <Route path="/coordinator" element={
              <ProtectedRoute allowedRoles={['coordinator', 'faculty', 'superadmin']}>
                <CoordinatorLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/coordinator/dashboard" replace />} />
              <Route path="dashboard" element={<CoordinatorDashboard />} />
              <Route path="events" element={<CoordinatorEvents />} />
              <Route path="attendance" element={<AttendanceList />} />
              <Route path="attendance/:eventId" element={<Attendance />} />
              <Route path="verify-ticket" element={<VerifyTicket />} />
            </Route>

            {/* Student Routes */}
            <Route path="/student" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/student/dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="registrations" element={<MyRegistrations />} />
              <Route path="tickets" element={<MyTickets />} />
              <Route path="reviews" element={<MyReviews />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
