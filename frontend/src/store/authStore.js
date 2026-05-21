import { create } from 'zustand';
import { fetchMe, loginUser, registerUser, verifyOtp } from '../services/api';

function profileKey(user) {
  return user?.id ? `profile:${user.id}` : user?.email ? `profile:${user.email}` : '';
}

function applyProfileOverrides(user) {
  const key = profileKey(user);
  if (!key) {
    return user;
  }

  try {
    const overrides = JSON.parse(window.localStorage.getItem(key) || '{}');
    return { ...user, ...overrides };
  } catch {
    return user;
  }
}

export const useAuthStore = create((set, get) => ({
  user: null,
  token: window.localStorage.getItem('token'),
  loading: false,
  error: '',
  success: '',
  pendingVerificationEmail: '',
  hydrate: async () => {
    if (!get().token) {
      return;
    }
    try {
      const user = await fetchMe();
      set({ user: applyProfileOverrides(user), error: '' });
    } catch {
      window.localStorage.removeItem('token');
      set({ user: null, token: null, error: '' });
    }
  },
  login: async ({ email, password }) => {
    set({ loading: true, error: '', success: '' });
    try {
      const token = await loginUser({ email, password });
      window.localStorage.setItem('token', token.access_token);
      const user = applyProfileOverrides(await fetchMe());
      set({ user, token: token.access_token, loading: false, success: 'Logged in' });
      return user;
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message || error.response?.data?.detail || 'Login failed' });
      throw error;
    }
  },
  signup: async ({ name, email, password }) => {
    set({ loading: true, error: '', success: '' });
    try {
      const registration = await registerUser({ name, email, password });
      set({
        loading: false,
        pendingVerificationEmail: email,
        success: registration.otp
          ? `Signup successful. Development OTP: ${registration.otp}`
          : 'Signup successful. Enter the OTP sent to your email.',
      });
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message || error.response?.data?.detail || 'Signup failed' });
      throw error;
    }
  },
  verifySignupOtp: async ({ email, otp }) => {
    set({ loading: true, error: '', success: '' });
    try {
      await verifyOtp({ email, otp });
      set({ loading: false, pendingVerificationEmail: '', success: 'Email verified. You can login now.' });
    } catch (error) {
      set({
        loading: false,
        error: error.response?.data?.message || error.response?.data?.detail || 'OTP verification failed',
      });
      throw error;
    }
  },
  guestLogin: () => {
    window.localStorage.removeItem('token');
    const guestUser = {
      id: 'guest',
      email: 'guest@jiobasket.local',
      full_name: 'Guest User',
      role: 'customer',
      is_guest: true,
    };
    set({ user: guestUser, token: null, loading: false, error: '', success: 'Browsing as guest' });
    return guestUser;
  },
  logout: () => {
    window.localStorage.removeItem('token');
    set({ user: null, token: null, success: '', error: '' });
  },
  updateProfile: (updates) => {
    const currentUser = get().user;
    const nextUser = { ...currentUser, ...updates };
    const key = profileKey(currentUser);
    if (key) {
      const persisted = {
        full_name: nextUser.full_name,
        email: nextUser.email,
        phone: nextUser.phone,
      };
      window.localStorage.setItem(key, JSON.stringify(persisted));
    }
    set({ user: nextUser, success: 'Profile updated', error: '' });
  },
}));
