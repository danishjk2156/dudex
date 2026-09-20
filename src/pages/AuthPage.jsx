import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Store,
  Phone,
  User,
  ShieldCheck,
  ArrowRight,
  UserPlus,
  LogIn,
  KeyRound,
  CheckCircle2,
  Sun,
  Moon,
} from 'lucide-react';
import { animateTactilePress } from '../lib/animations';

export function AuthPage() {
  const {
    login,
    signup,
    settings,
    isDark,
    toggleTheme,
    showToast,
  } = useApp();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Handle Phone input formatting (digits only, max 10)
  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(val);
  };

  const handlePINChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
  };

  // Submit Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    animateTactilePress(e);

    const cleanPhone = phone.trim().replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      showToast('Please enter a valid 10-digit mobile number', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(cleanPhone, pin);
      if (!res.success) {
        // If not found, hint to switch to signup
        if (res.error === 'User not found') {
          setMode('signup');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Signup
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    animateTactilePress(e);

    if (!name.trim()) {
      showToast('Please enter your full name', 'warning');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      showToast('Please enter a valid 10-digit mobile number', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await signup({
        name: name.trim(),
        phone: cleanPhone,
        pin,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#F1F5F9] dark:bg-[#0A1110] text-[#1E293B] dark:text-white transition-all duration-300 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-emerald-600/5 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full bg-[#14B8A6]/5 blur-3xl pointer-events-none"></div>

      {/* Top Bar with Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2">
        <button
          onClick={(e) => {
            animateTactilePress(e);
            toggleTheme();
          }}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
          className="p-2.5 rounded-xl bg-white/80 dark:bg-[#111A18]/80 backdrop-blur-md hover:bg-white dark:hover:bg-[#111A18] text-[#1E3A5F] dark:text-[#93C5FD] border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xs transition-all duration-200 cursor-pointer"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-[#F59E0B]" />
          ) : (
            <Moon className="w-4 h-4 text-[#1E3A5F]" />
          )}
        </button>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-3xl shadow-xl dark:shadow-2xl p-6 sm:p-8 z-10 transition-all duration-300 animate-modal-pop">
        {/* Business Branding Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-800 text-white shadow-md ring-4 ring-emerald-800/15 mb-3 transition-transform duration-200 hover:scale-105">
            {settings.logo ? (
              <img
                src={settings.logo}
                alt="Logo"
                className="w-10 h-10 object-contain rounded-lg"
              />
            ) : (
              <Store className="w-7 h-7" />
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1E293B] dark:text-white font-headline">
            {settings.businessName || 'UNIVERSAL BILLING POS'}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
            {mode === 'login'
              ? 'Enter your mobile number to begin your shift'
              : 'Register a new billing operator account'}
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className="flex rounded-2xl bg-slate-100 dark:bg-[#0A1110] p-1 mb-6 border border-[#E2E8F0] dark:border-[#1E2E2A]">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-[#111A18] text-emerald-800 dark:text-emerald-400 shadow-xs'
                : 'text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              mode === 'signup'
                ? 'bg-white dark:bg-[#111A18] text-emerald-800 dark:text-emerald-400 shadow-xs'
                : 'text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* FORM CONTENT */}
        {mode === 'login' ? (
          /* LOGIN FORM */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Phone Number Field */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] dark:text-white mb-1.5">
                Mobile Number <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[#64748B] dark:text-[#94A3B8] text-xs font-bold">
                  <Phone className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span>+91</span>
                </div>
                <input
                  id="login-phone-input"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                  placeholder="Enter 10-digit number"
                  value={phone}
                  onChange={handlePhoneChange}
                  autoFocus
                  className="w-full pl-16 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-sm font-semibold tracking-wide text-[#1E293B] dark:text-white placeholder-[#64748B] pos-input-focus shadow-2xs transition-all duration-200"
                />
              </div>
            </div>

            {/* Optional PIN Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#1E293B] dark:text-white flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Passcode / PIN</span>
                </label>
                <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                  (If set on account)
                </span>
              </div>
              <input
                type="password"
                maxLength={4}
                placeholder="4-digit PIN (Optional)"
                value={pin}
                onChange={handlePINChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-sm font-mono tracking-widest text-[#1E293B] dark:text-white placeholder-[#64748B] pos-input-focus shadow-2xs transition-all duration-200"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || phone.length < 10}
              className="w-full mt-2 py-3 px-4 rounded-xl btn-primary-action disabled:opacity-50 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-98"
            >
              {submitting ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <span>Sign In to POS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* SIGNUP FORM */
          <form onSubmit={handleSignupSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] dark:text-white mb-1.5">
                Full Name <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="signup-name-input"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-sm font-medium text-[#1E293B] dark:text-white placeholder-[#64748B] pos-input-focus shadow-2xs transition-all duration-200"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] dark:text-white mb-1.5">
                Mobile Number <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[#64748B] dark:text-[#94A3B8] text-xs font-bold">
                  <Phone className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span>+91</span>
                </div>
                <input
                  id="signup-phone-input"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                  placeholder="Enter 10-digit number"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full pl-16 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-sm font-semibold tracking-wide text-[#1E293B] dark:text-white placeholder-[#64748B] pos-input-focus shadow-2xs transition-all duration-200"
                />
              </div>
            </div>


            {/* Optional 4-digit PIN */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#1E293B] dark:text-white flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Optional Quick PIN</span>
                </label>
                <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                  4 digits
                </span>
              </div>
              <input
                type="password"
                maxLength={4}
                placeholder="Set 4-digit lock PIN"
                value={pin}
                onChange={handlePINChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-sm font-mono tracking-widest text-[#1E293B] dark:text-white placeholder-[#64748B] pos-input-focus shadow-2xs transition-all duration-200"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || phone.length < 10 || !name.trim()}
              className="w-full mt-2 py-3 px-4 rounded-xl btn-primary-action disabled:opacity-50 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-98"
            >
              {submitting ? (
                <span>Registering...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Registration</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Security Badge */}
        <div className="mt-6 pt-4 border-t border-[#E2E8F0] dark:border-[#1E2E2A] flex items-center justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" /> Local Encrypted POS
          </span>
          <span className="status-pill status-pill-emerald text-[10px]">
            Offline Ready
          </span>
        </div>
      </div>
    </div>
  );
}
