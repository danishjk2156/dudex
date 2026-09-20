import React from 'react';
import { useApp } from '../../context/AppContext';
import { LayoutDashboard, Store, Building2, Package, Receipt, History, Settings } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { animateTactilePress } from '../../lib/animations';

export function Sidebar() {
  const { activePage, setActivePage, cart = { items: [] }, settings = {}, dailyDraftCount = 0, dailyDraftTotal = 0 } = useApp();
  const cartCount = (cart?.items || []).reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = (cart?.items || []).reduce((sum, item) => sum + item.quantity * item.rate, 0);

  const effectiveCount = dailyDraftCount > 0 ? dailyDraftCount : cartCount;
  const effectiveTotal = dailyDraftCount > 0 ? dailyDraftTotal : cartTotal;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview & metrics' },
    { id: 'billing', label: 'Billing', icon: Receipt, desc: 'Daily bills & POS', badge: effectiveCount },
    { id: 'companies', label: 'Brands', icon: Building2, desc: 'Suppliers & dairy lines' },
    { id: 'products', label: 'Products', icon: Package, desc: 'Rates, units & items' },
    { id: 'shops', label: 'Shops', icon: Store, desc: 'Retail outlets & clients' },
    { id: 'history', label: 'Bill History', icon: History, desc: 'Transactions & receipts' },
    { id: 'settings', label: 'Settings', icon: Settings, desc: 'Printer & agency setup' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white dark:bg-[#111A18] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-2xl p-4 shrink-0 sticky top-[73px] self-start my-4 ml-3 lg:ml-4 h-[calc(100vh-93px)] overflow-y-auto transition-all duration-300 z-20 shadow-xs">
      {/* Business Branding Card */}
      <div className="flex items-center gap-3 px-2 py-3 mb-3 rounded-xl bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] transition-all duration-200">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-50 dark:bg-[#0A1110] p-0.5 border border-emerald-200 dark:border-emerald-800 shadow-xs flex items-center justify-center shrink-0">
          {settings.logo ? (
            <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <Store className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="type-heading-sm text-[#0F172A] dark:text-[#F8FAFC] truncate leading-tight">
            {settings.businessName || 'G.V. MILK AGENCY'}
          </h2>
          <p className="type-caption text-slate-500 dark:text-slate-400 truncate">
            {settings.city ? `${settings.city} Hub` : 'Dairy Distribution Hub'}
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex flex-col gap-1.5 flex-1">
        <p className="type-caption px-3 py-1 text-slate-400 dark:text-slate-500">
          MAIN MENU
        </p>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={(e) => {
                animateTactilePress(e);
                setActivePage(item.id);
              }}
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-emerald-50 dark:bg-[#0A1110] text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/60 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#162220] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-all duration-200 group-hover:scale-110 ${
                    isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-[#0F172A] dark:group-hover:text-white'
                  }`}
                />
                <span className="text-sm block leading-tight font-display">{item.label}</span>
              </div>

              {item.badge > 0 && (
                <span
                  className="text-xs font-bold font-mono tabular-nums px-2 py-0.5 rounded-full transition-transform bg-amber-500 text-white"
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Draft Notice if any */}
      {effectiveCount > 0 && (
        <div className="mt-4 p-3.5 rounded-xl glass-card-primary text-[#0F172A] dark:text-[#F8FAFC] border border-amber-200/80 dark:border-amber-800/40 transition-all duration-200">
          <div className="flex items-center justify-between text-xs font-medium mb-1">
            <span className="type-caption text-amber-800 dark:text-amber-300">Active Bill</span>
            <span className="font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">{effectiveCount} item(s)</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">Total:</span>
            <span className="text-sm font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {formatCurrency(effectiveTotal, settings.currency)}
            </span>
          </div>
          <button
            onClick={() => setActivePage('billing')}
            className="btn-primary-action w-full mt-2.5 py-1.5 rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
          >
            Review & Print
          </button>
        </div>
      )}

      {/* Offline indicator footer */}
      <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-[#1E2E2A] flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 transition-colors duration-200">
        <span>Stitch POS v2.0</span>
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          Hub Live
        </span>
      </div>
    </aside>
  );
}
