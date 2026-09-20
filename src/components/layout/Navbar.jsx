import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Store, ShoppingCart, Sun, Moon, User, Menu } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { animateTactilePress } from '../../lib/animations';
import { UserAvatar } from '../profile/UserAvatar';

export function Navbar() {
  const {
    settings = {},
    cart = { items: [] },
    activePage,
    setActivePage,
    isDark,
    toggleTheme,
    dailyDraftCount = 0,
    dailyDraftTotal = 0,
    isProfileOpen,
    toggleProfile,
    currentUser,
    logout,
    toggleMobileNav,
  } = useApp();
  const cartItemCount = (cart?.items || []).reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = (cart?.items || []).reduce((sum, item) => sum + item.quantity * item.rate, 0);

  const effectiveCount = dailyDraftCount > 0 ? dailyDraftCount : cartItemCount;
  const effectiveTotal = dailyDraftCount > 0 ? dailyDraftTotal : cartTotal;
  const [cartBump, setCartBump] = useState(false);

  useEffect(() => {
    if (effectiveCount > 0) {
      setCartBump(true);
      const timer = setTimeout(() => setCartBump(false), 280);
      return () => clearTimeout(timer);
    }
  }, [effectiveCount]);

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-[#0A1110]/95 backdrop-blur-lg text-[#1E293B] dark:text-[#F8FAFC] border-b border-[#E2E8F0] dark:border-[#1E2E2A] px-3 sm:px-6 py-2.5 shadow-[0_1px_3px_rgba(30,58,95,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand / Business info & Route Indicator */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* YouTube-style 3 lines Menu Button (Phone mode only, hidden in laptop mode) */}
          <button
            type="button"
            onClick={(e) => {
              animateTactilePress(e);
              toggleMobileNav();
            }}
            aria-label="Navigation menu"
            title="Menu"
            className="flex md:hidden p-2 -ml-1 rounded-xl text-[#1E3A5F] dark:text-[#60A5FA] hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors cursor-pointer items-center justify-center shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* On mobile: show business logo & name since sidebar is hidden */}
          <div
            className="flex md:hidden items-center gap-2.5 cursor-pointer select-none"
            onClick={() => setActivePage('dashboard')}
          >
            {settings.logo ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#F8FAFC] dark:bg-[#0A1110] p-0.5 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xs flex items-center justify-center shrink-0">
                <img
                  src={settings.logo}
                  alt={settings.businessName || 'Business Logo'}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#059669] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Store className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-sm tracking-tight text-[#0F172A] dark:text-[#F8FAFC] font-headline leading-tight truncate max-w-[150px]">
                {settings.businessName || 'BUSINESS BILLING'}
              </h1>
              <p className="type-caption truncate max-w-[150px] text-slate-500 dark:text-slate-400">
                {settings.city || 'Universal POS'}
              </p>
            </div>
          </div>

          {/* On desktop: show sleek active workspace badge & current date */}
          <div className="hidden md:flex items-center gap-2.5 select-none">
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-xs text-slate-600 dark:text-slate-300 transition-all duration-200">
              <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse"></span>
              <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] capitalize">
                {activePage === 'billing' ? 'Daily Entry & Billing' : activePage}
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="type-caption text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Right Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Dark / Light Mode Toggle Button */}
          <button
            onClick={(e) => {
              animateTactilePress(e);
              toggleTheme();
            }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
            className="p-2 rounded-xl bg-slate-100 dark:bg-[#0A1110] hover:bg-slate-200 dark:hover:bg-[#162220] text-slate-700 dark:text-slate-200 border border-[#E2E8F0] dark:border-[#1E2E2A] flex items-center justify-center cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-500 hover:rotate-90 transition-transform duration-300 ease-out" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 hover:-rotate-12 transition-transform duration-300 ease-out" />
            )}
          </button>

          {/* Quick Cart / Billing status */}
          <button
            onClick={(e) => {
              animateTactilePress(e);
              setActivePage('billing');
            }}
            className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
              activePage === 'billing'
                ? 'bg-[#059669] text-white shadow-xs border border-[#047857]'
                : 'bg-slate-100 dark:bg-[#0A1110] hover:bg-slate-200 dark:hover:bg-[#162220] text-slate-600 dark:text-slate-300 border border-[#E2E8F0] dark:border-[#1E2E2A]'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Daily Entry</span>
            {effectiveCount > 0 && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold font-mono tabular-nums transition-transform ${
                  cartBump ? 'animate-cart-bump' : ''
                } ${
                  activePage === 'billing'
                    ? 'bg-amber-400 text-slate-900'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {effectiveCount}
              </span>
            )}
            {effectiveTotal > 0 && (
              <span className="hidden md:inline font-mono tabular-nums font-bold text-xs text-emerald-600 dark:text-emerald-400">
                ({formatCurrency(effectiveTotal, settings.currency)})
              </span>
            )}
          </button>

          {/* Profile Trigger on Right Side */}
          <button
            onClick={(e) => {
              animateTactilePress(e);
              toggleProfile();
            }}
            title={currentUser ? `Logged in as ${currentUser.name}` : "User Profile"}
            aria-label="Open profile panel"
            className={`relative flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl text-xs font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
              isProfileOpen || activePage === 'profile'
                ? 'bg-emerald-50 dark:bg-[#111A18] text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 shadow-xs'
                : 'bg-slate-100 dark:bg-[#0A1110] hover:bg-slate-200 dark:hover:bg-[#162220] text-slate-600 dark:text-slate-300 border-[#E2E8F0] dark:border-[#1E2E2A]'
            }`}
          >
            <UserAvatar
              photo={settings.userPhoto}
              name={currentUser?.name || settings.ownerName || 'User'}
              size="xs"
              ring={false}
              className="w-5 h-5"
            />
            <span className="hidden sm:inline font-medium text-xs max-w-[100px] truncate">
              {currentUser?.name ? currentUser.name.split(' ')[0] : 'Profile'}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] ring-1.5 ring-white dark:ring-[#0F172A] shrink-0"></span>
          </button>
        </div>
      </div>
    </header>
  );
}
