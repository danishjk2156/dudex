import React from 'react';
import { useApp } from '../../context/AppContext';
import { LayoutDashboard, Store, Building2, Package, Receipt, History, Settings } from 'lucide-react';
import { animateTactilePress } from '../../lib/animations';

export function BottomNav() {
  const { activePage, setActivePage, cart, dailyDraftCount = 0 } = useApp();
  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const effectiveCount = dailyDraftCount > 0 ? dailyDraftCount : cartCount;

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'shops', label: 'Shops', icon: Store },
    { id: 'companies', label: 'Brands', icon: Building2 },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'billing', label: 'Billing', icon: Receipt, badge: effectiveCount },
    { id: 'history', label: 'Reports', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0A1110]/95 backdrop-blur-xl text-[#64748B] dark:text-[#94A3B8] border-t border-[#E2E8F0] dark:border-[#1E2E2A] px-1 sm:px-3 py-1 safe-area-pb transition-all duration-300 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          const isBilling = item.id === 'billing';

          return (
            <button
              key={item.id}
              onClick={(e) => {
                animateTactilePress(e);
                setActivePage(item.id);
              }}
              type="button"
              aria-label={`Navigate to ${item.label}`}
              className={`relative flex flex-col items-center justify-center py-1 px-1 sm:px-2 min-h-[44px] min-w-[42px] sm:min-w-[48px] rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? isBilling
                    ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                    : 'text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'text-[#94A3B8] dark:text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#F8FAFC] font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-amber-600 text-white font-bold font-mono tabular-nums text-[9px] w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] tracking-tight mt-0.5 leading-none">{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-0.5 w-2.5 sm:w-3 h-0.5 sm:h-1 bg-emerald-600 dark:bg-emerald-400 rounded-full transition-all duration-200"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
