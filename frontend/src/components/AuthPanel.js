import React, { useState } from 'react';
import { LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function AuthPanel({ onDone }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    otp: '',
  });
  const login = useAuthStore((state) => state.login);
  const signup = useAuthStore((state) => state.signup);
  const verifySignupOtp = useAuthStore((state) => state.verifySignupOtp);
  const guestLogin = useAuthStore((state) => state.guestLogin);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const success = useAuthStore((state) => state.success);
  const pendingVerificationEmail = useAuthStore((state) => state.pendingVerificationEmail);

  const updateForm = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      if (mode === 'verify') {
        await verifySignupOtp({ email: pendingVerificationEmail || form.email, otp: form.otp });
        setMode('login');
        return;
      }
      if (mode === 'signup') {
        await signup({ name: form.name, email: form.email, password: form.password });
        setMode('verify');
        return;
      }
      const user = await login({ email: form.email, password: form.password });
      onDone(user);
    } catch {
      return;
    }
  };

  return (
    <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[1fr_430px]">
        <div className="hidden min-h-[520px] lg:block">
          <img
            alt="Grocery delivery basket"
            className="h-full w-full object-cover"
            src="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=1200&q=80"
          />
        </div>
        <form className="p-6 sm:p-8" onSubmit={submit}>
          <div className="mb-6 inline-flex rounded-md bg-slate-100 p-1">
            {['login', 'signup'].map((item) => (
              <button
                className={`h-10 rounded-md px-4 text-sm font-black capitalize ${
                  mode === item ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                }`}
                key={item}
                onClick={() => setMode(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
          <h1 className="text-3xl font-black text-slate-950">
            {mode === 'login' ? 'Welcome back' : mode === 'verify' ? 'Verify email' : 'Create your account'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
           
          </p>
          {error && (
            <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
              {success}
            </div>
          )}

          {mode === 'signup' && (
            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Name</span>
              <span className="flex items-center gap-2 rounded-md border border-slate-200 px-3">
                <UserRound size={18} className="text-slate-400" />
                <input
                  className="h-11 w-full outline-none"
                  onChange={(event) => updateForm('name', event.target.value)}
                  value={form.name}
                />
              </span>
            </label>
          )}

          {mode !== 'verify' && (
            <label className="mt-5 block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Email</span>
            <span className="flex items-center gap-2 rounded-md border border-slate-200 px-3">
              <Mail size={18} className="text-slate-400" />
              <input
                className="h-11 w-full outline-none"
                onChange={(event) => updateForm('email', event.target.value)}
                type="email"
                value={form.email}
              />
            </span>
            </label>
          )}

          {mode !== 'verify' && (
            <label className="mt-5 block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Password</span>
            <span className="flex items-center gap-2 rounded-md border border-slate-200 px-3">
              <LockKeyhole size={18} className="text-slate-400" />
              <input
                className="h-11 w-full outline-none"
                onChange={(event) => updateForm('password', event.target.value)}
                type="password"
                value={form.password}
              />
            </span>
            </label>
          )}

          {mode === 'verify' && (
            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">6-digit OTP</span>
              <input
                className="h-11 w-full rounded-md border border-slate-200 px-3 tracking-widest outline-none"
                maxLength="6"
                onChange={(event) => updateForm('otp', event.target.value)}
                required
                value={form.otp}
              />
            </label>
          )}

          <button
            className="mt-6 h-11 w-full rounded-md bg-emerald-600 text-sm font-black text-white hover:bg-emerald-700"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : mode === 'verify' ? 'Verify OTP' : 'Sign up'}
          </button>
          {mode === 'login' && (
            <button
              className="mt-3 h-11 w-full rounded-md border border-slate-200 bg-white text-sm font-black text-slate-700 hover:bg-slate-50"
              disabled={loading}
              onClick={() => onDone(guestLogin())}
              type="button"
            >
              Continue as Guest
            </button>
          )}
        </form>
      </div>
    </section>
  );
}
