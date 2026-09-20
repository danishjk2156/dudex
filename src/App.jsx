import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNavDrawer } from './components/layout/MobileNavDrawer';
import { ToastContainer } from './components/ui/Toast';
import { ReceiptModal } from './components/receipt/ReceiptModal';

// Pages
import { Dashboard } from './pages/Dashboard';
import { ShopsPage } from './pages/ShopsPage';
import { BillingPage } from './pages/BillingPage';
import { ProductsPage } from './pages/ProductsPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthPage } from './pages/AuthPage';
import { ProfileDrawer } from './components/profile/ProfileDrawer';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

function MainContent() {
  const { activePage, setActivePage, openProfile, currentUser, isLoading } = useApp();

  const validPages = ['dashboard', 'shops', 'billing', 'products', 'companies', 'history', 'settings'];
  const displayPage = validPages.includes(activePage) ? activePage : 'dashboard';

  React.useEffect(() => {
    if (activePage === 'profile') {
      openProfile();
      setActivePage('dashboard');
    }
  }, [activePage, openProfile, setActivePage]);

  // Auth gatekeeper: If no user session is active, show the Login/Signup screen
  if (!currentUser) {
    return (
      <>
        <AuthPage />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex-1 flex flex-col bg-[#EEF2F0] dark:bg-[#0A1110] text-[#1E293B] dark:text-[#F8FAFC] transition-all duration-300 w-full">
      <Navbar />

      <div className="flex-1 flex w-full max-w-7xl mx-auto items-stretch">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Persistent Page Containers (Preserves active forms, selections, and inputs across tab switches) */}
        <main className="flex-1 p-2.5 sm:p-5 md:p-6 pb-6 min-w-0 max-w-full flex flex-col">
          <div className={displayPage === 'dashboard' ? 'flex-1 flex flex-col animate-page-entrance' : 'hidden'}>
            <Dashboard />
          </div>
          <div className={displayPage === 'shops' ? 'flex-1 flex flex-col animate-page-entrance' : 'hidden'}>
            <ShopsPage />
          </div>
          <div className={displayPage === 'billing' ? 'flex-1 flex flex-col animate-page-entrance' : 'hidden'}>
            <BillingPage />
          </div>
          <div className={displayPage === 'products' ? 'block animate-page-entrance' : 'hidden'}>
            <ProductsPage />
          </div>
          <div className={displayPage === 'companies' ? 'block animate-page-entrance' : 'hidden'}>
            <CompaniesPage />
          </div>
          <div className={displayPage === 'history' ? 'block animate-page-entrance' : 'hidden'}>
            <HistoryPage />
          </div>
          <div className={displayPage === 'settings' ? 'block animate-page-entrance' : 'hidden'}>
            <SettingsPage />
          </div>
        </main>
      </div>

      {/* YouTube-style Left Navigation Drawer */}
      <MobileNavDrawer />

      {/* Global Right-Side Profile Drawer */}
      <ProfileDrawer />

      {/* Global Receipt Modal & Toasts */}
      <ReceiptModal />
      <ToastContainer />
    </div>
  );
}
 
export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
