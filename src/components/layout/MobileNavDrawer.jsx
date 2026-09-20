import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import {
  Menu,
  X,
  LayoutDashboard,
  Store,
  Building2,
  Package,
  Receipt,
  History,
  Settings,
  Sun,
  Moon,
  User,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { animateTactilePress } from '../../lib/animations';

export function MobileNavDrawer() {
  const {
    isMobileNavOpen,
    closeMobileNav,
    activePage,
    setActivePage,
    settings,
    dailyDraftCount = 0,
    cart,
    currentUser,
    openProfile,
    logout,
    isDark,
    toggleTheme,
  } = useApp();

  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const effectiveCount = dailyDraftCount > 0 ? dailyDraftCount : cartCount;

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileNavOpen) {
        closeMobileNav();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileNavOpen, closeMobileNav]);

  // Automatically close mobile drawer if screen is resized to laptop/desktop (>= 768px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileNavOpen) {
        closeMobileNav();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileNavOpen, closeMobileNav]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isMobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileNavOpen]);

  if (!isMobileNavOpen) return null;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview & daily metrics' },
    { id: 'billing', label: 'New Delivery Bill', icon: Receipt, desc: 'POS billing & counter sales', badge: effectiveCount },
    { id: 'shops', label: 'Shops & Outlets', icon: Store, desc: 'Client outlets & due balances' },
    { id: 'companies', label: 'Brands & Companies', icon: Building2, desc: 'Dairy brands & supply lines' },
    { id: 'products', label: 'Products & Rates', icon: Package, desc: 'Item catalog & prices' },
    { id: 'history', label: 'Bill History & Records', icon: History, desc: 'Past receipts & reprints' },
    { id: 'settings', label: 'Agency Settings', icon: Settings, desc: 'Printer & receipt setup' },
  ];

  const drawerContent = (
    <div className="md:hidden fixed inset-0 z-50 flex">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300 animate-fade-in cursor-pointer"
        onClick={closeMobileNav}
        aria-hidden="true"
      />

      {/* Slide-out Left Drawer Panel (YouTube Style) */}
      <div
        className="relative w-72 sm:w-80 max-w-[85vw] bg-white dark:bg-[#0A1110] text-[#1E293B] dark:text-[#F8FAFC] h-full shadow-[6px_0_30px_rgba(0,0,0,0.35)] flex flex-col z-10 border-r border-[#E2E8F0] dark:border-[#1E2E2A] animate-slide-in-left select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with 3-line Menu Button & Business Brand (YouTube Header Style) */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] dark:border-[#1E2E2A] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* 3 lines toggle button to close drawer like YouTube */}
            <button
              type="button"
              onClick={closeMobileNav}
              aria-label="Close navigation drawer"
              title="Close menu"
              className="p-2 -ml-1 rounded-xl text-emerald-800 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-[#162220] transition-colors cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand Logo & Name */}
            <div
              className="flex items-center gap-2 cursor-pointer min-w-0"
              onClick={() => {
                setActivePage('dashboard');
                closeMobileNav();
              }}
            >
              {settings.logo ? (
                <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-100 dark:bg-[#0A1110] p-0.5 border border-[#E2E8F0] dark:border-[#1E2E2A] shrink-0">
                  <img
                    src={settings.logo}
                    alt={settings.businessName || 'Brand Logo'}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <Store className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="font-display font-black text-sm tracking-tight text-[#1E293B] dark:text-[#F8FAFC] truncate leading-tight">
                  {settings.businessName || 'BUSINESS BILLING'}
                </h2>
                <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] truncate">
                  {settings.city || 'Universal POS'}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={closeMobileNav}
            aria-label="Close menu"
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162220] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider font-bold text-[#94A3B8] dark:text-[#64748B] px-3 py-1 font-label">
            EXPLORE
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={(e) => {
                  animateTactilePress(e);
                  setActivePage(item.id);
                  closeMobileNav();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer active:scale-98 ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/60 shadow-xs'
                    : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#162220] hover:text-[#1E293B] dark:hover:text-[#F8FAFC] font-medium'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-[#64748B] dark:text-[#94A3B8]'
                    }`}
                  />
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm block font-display leading-tight truncate">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-[#94A3B8] dark:text-[#64748B] block truncate leading-tight font-normal">
                      {item.desc}
                    </span>
                  </div>
                </div>

                {item.badge > 0 && (
                  <span className="text-[10px] font-bold font-mono tabular-nums px-2 py-0.5 rounded-full bg-amber-600 text-white shrink-0 shadow-xs">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer: Operator Profile & Theme Switcher */}
        <div className="p-3 border-t border-[#E2E8F0] dark:border-[#1E2E2A] bg-slate-50/60 dark:bg-[#0A1110] shrink-0 space-y-2">
          {/* Operator Card */}
          {currentUser && (
            <div
              onClick={() => {
                closeMobileNav();
                openProfile();
              }}
              className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] hover:border-emerald-500/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-xs shrink-0">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#1E293B] dark:text-white truncate leading-tight">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] truncate">
                    +91 {currentUser.phone}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
            </div>
          )}

          {/* Quick Controls: Dark/Light Mode & Sign Out */}
          <div className="flex items-center justify-between gap-2 pt-1 text-xs">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-white transition-colors cursor-pointer font-medium"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-700" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                closeMobileNav();
                logout();
              }}
              title="Sign Out"
              className="p-1.5 rounded-lg bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
