import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { toast } from 'sonner';
import api from '../services/api';
import type { User, LoginCredentials, StudentSignupData, FacultySignupData } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signupStudent: (data: StudentSignupData) => Promise<{ userId: string; email: string }>;
  signupFaculty: (data: FacultySignupData) => Promise<{ userId: string; email: string }>;
  verifyOTP: (userId: string, otp: string) => Promise<void>;
  resendOTP: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ userId: string }>;
  resetPassword: (userId: string, otp: string, newPassword: string) => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  // ============================
  // INITIAL LOAD
  // ============================
  useEffect(() => {
    const initialize = async () => {
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');

      if (storedAccessToken && storedUser) {
        try {
          setToken(storedAccessToken);
          setUser(JSON.parse(storedUser));

          api.defaults.headers.common['Authorization'] = `Bearer ${storedAccessToken}`;

          const response = await api.get('/auth/me');

          if (response.data.user) {
            setUser(response.data.user);
            localStorage.setItem('user', JSON.stringify(response.data.user));
          }
        } catch (error) {
          await logout();
        }
      }

      setIsLoading(false);
    };

    initialize();
  }, []);

  // ============================
  // LOGIN
  // ============================
  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);

      const response = await api.post('/auth/login', credentials);
      const { user, accessToken, refreshToken } = response.data;

      setUser(user);
      setToken(accessToken);

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // ============================
  // SIGNUP
  // ============================
  const signupStudent = async (data: StudentSignupData) => {
    const response = await api.post('/auth/signup-student', data);
    return { userId: response.data.userId, email: response.data.email };
  };

  const signupFaculty = async (data: FacultySignupData) => {
    const response = await api.post('/auth/signup-faculty', data);
    return { userId: response.data.userId, email: response.data.email };
  };

  // ============================
  // VERIFY OTP
  // ============================
  const verifyOTP = async (userId: string, otp: string) => {
    await api.post('/auth/verify-otp', { userId, otp });
  };

  const resendOTP = async (userId: string) => {
    await api.post('/auth/resend-otp', { userId });
  };

  // ============================
  // LOGOUT
  // ============================
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { }

    setUser(null);
    setToken(null);

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    delete api.defaults.headers.common['Authorization'];
  };

  // ============================
  // PASSWORD RESET
  // ============================
  const forgotPassword = async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return { userId: response.data.userId as string };
  };

  const resetPassword = async (userId: string, otp: string, newPassword: string) => {
    await api.post('/auth/reset-password', { userId, otp, newPassword });
  };

  // ============================
  // REFRESH TOKEN
  // ============================
  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (!storedRefreshToken) return false;

      const response = await api.post('/auth/refresh', {
        refreshToken: storedRefreshToken
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data;

      setToken(accessToken);

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      return true;
    } catch {
      await logout();
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        signupStudent,
        signupFaculty,
        verifyOTP,
        resendOTP,
        logout,
        forgotPassword,
        resetPassword,
        refreshAccessToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
