import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  User,
  Store,
  Phone,
  Mail,
  MapPin,
  FileText,
  Camera,
  Trash2,
  Save,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Package,
  Printer,
  Moon,
  Sun,
  Settings as SettingsIcon,
  ExternalLink,
  Upload,
  LogOut,
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { animateStaggerEntrance, animateTactilePress } from '../../lib/animations';
import { UserAvatar } from './UserAvatar';
import { uploadAsset } from '../../lib/supabaseService';

export function ProfileDrawer() {
  const {
    isProfileOpen,
    closeProfile,
    settings,
    updateSettings,
    showToast,
    bills = [],
    shops = [],
    products = [],
    setActivePage,
    isDark,
    toggleTheme,
    currentUser,
    logout,
  } = useApp();

  const fileInputRef = useRef(null);
  const drawerBodyRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

  const [formData, setFormData] = useState({
    businessName: settings.businessName || '',
    ownerName: settings.ownerName || 'Store Administrator',
    phone: settings.phone || '',
    email: settings.email || '',
    address: settings.address || '',
    area: settings.area || '',
    city: settings.city || '',
    gstin: settings.gstin || '',
    currency: settings.currency || '₹',
    paperSize: settings.paperSize || '58mm',
    logo: settings.logo || '',
    userPhoto: settings.userPhoto || '',
  });

  // Keep form data synced when settings change
  useEffect(() => {
    if (settings) {
      setFormData({
        businessName: settings.businessName || '',
        ownerName: settings.ownerName || 'Store Administrator',
        phone: settings.phone || '',
        email: settings.email || '',
        address: settings.address || '',
        area: settings.area || '',
        city: settings.city || '',
        gstin: settings.gstin || '',
        currency: settings.currency || '₹',
        paperSize: settings.paperSize || '58mm',
        logo: settings.logo || '',
        userPhoto: settings.userPhoto || '',
      });
    }
  }, [settings]);

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isProfileOpen) {
        closeProfile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProfileOpen, closeProfile]);

  // Calculate live business stats
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayBills = bills.filter((b) => {
    if (!b.createdAt && !b.dateRaw) return false;
    const billDate = b.dateRaw || b.createdAt.slice(0, 10);
    return billDate === todayStr;
  });
  const todaySalesTotal = todayBills.reduce((sum, b) => sum + (Number(b.finalAmount) || 0), 0);

  // Handle User Profile Photo Upload with client-side center-crop canvas resizing (400x400)
  const handlePhotoUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG, WebP)', 'error');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('Profile photo size must be under 8MB', 'error');
      return;
    }

    setPhotoLoading(true);
    try {
      // 1. Try uploading directly to Supabase Storage S3 bucket
      const cleanExt = file.name ? file.name.split('.').pop() : 'jpg';
      const uploadRes = await uploadAsset(file, `avatars/user_${Date.now()}.${cleanExt}`);
      if (uploadRes.success && uploadRes.url) {
        setFormData((prev) => ({ ...prev, userPhoto: uploadRes.url }));
        updateSettings({
          ...settings,
          userPhoto: uploadRes.url,
        });
        setPhotoLoading(false);
        showToast('Profile photo uploaded to Cloud Storage!', 'success');
        return;
      }

      // 2. Offline / local fallback
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Center-crop to a square canvas
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;

          const targetDim = 400;
          const canvas = document.createElement('canvas');
          canvas.width = targetDim;
          canvas.height = targetDim;
          const ctx = canvas.getContext('2d');

          // Smooth high-quality scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(img, sx, sy, size, size, 0, 0, targetDim, targetDim);

          const compressed = canvas.toDataURL('image/jpeg', 0.92);
          setFormData((prev) => ({ ...prev, userPhoto: compressed }));

          // Save directly to settings so the photo reflects instantly everywhere
          updateSettings({
            ...settings,
            userPhoto: compressed,
          });

          setPhotoLoading(false);
          showToast('Profile photo updated successfully!', 'success');
        };
        img.onerror = () => {
          setPhotoLoading(false);
          showToast('Could not process image file', 'error');
        };
        img.src = event.target?.result;
      };
      reader.onerror = () => {
        setPhotoLoading(false);
        showToast('Failed to read image file', 'error');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setPhotoLoading(false);
      showToast('Upload error: ' + err.message, 'error');
    }
  };

  const handleRemovePhoto = async () => {
    setFormData((prev) => ({ ...prev, userPhoto: '', logo: '' }));
    try {
      await updateSettings({
        ...settings,
        userPhoto: '',
        logo: '',
      });
      showToast('Profile photo removed. Reverted to default avatar.', 'info');
    } catch (err) {
      showToast('Failed to remove photo', 'error');
    }
  };

  const handleSaveProfile = async (e) => {
    if (e) animateTactilePress(e);
    setIsSaving(true);
    try {
      await updateSettings({
        ...settings,
        businessName: formData.businessName.trim(),
        ownerName: formData.ownerName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        area: formData.area.trim(),
        city: formData.city.trim(),
        gstin: formData.gstin.trim(),
        currency: '₹',
        paperSize: formData.paperSize,
        logo: formData.logo,
        userPhoto: formData.userPhoto,
      });
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to update profile: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'POS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Stagger animate drawer sections when opened
  useEffect(() => {
    if (isProfileOpen && drawerBodyRef.current && drawerBodyRef.current.children.length > 0) {
      animateStaggerEntrance(drawerBodyRef.current.children, {
        y: 12,
        duration: 0.32,
        stagger: 0.04,
        delay: 0.1,
      });
    }
  }, [isProfileOpen]);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs z-40 transition-opacity duration-300 ${
          isProfileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeProfile}
        aria-hidden="true"
      />

      {/* Slide-over Profile Drawer on the Right Side */}
      <aside
        className={`fixed top-0 sm:top-3 bottom-0 sm:bottom-3 right-0 sm:right-3 z-50 w-full sm:w-[480px] md:w-[520px] bg-white dark:bg-[#111A18] text-[#1E293B] dark:text-white border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden transform transition-transform duration-300 ease-in-out ${
          isProfileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Profile Panel"
      >
        {/* Drawer Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E2E2A] flex items-center justify-between bg-slate-50/70 dark:bg-[#0A1110]/80 backdrop-blur-md rounded-t-3xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/40">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-[#1E293B] dark:text-white tracking-tight leading-tight">
                Profile & Identity
              </h2>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Business credentials & operator profile
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={closeProfile}
              title="Close panel"
              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162220] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div ref={drawerBodyRef} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Profile Hero Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50/40 via-slate-50 to-white dark:from-[#0A1110] dark:via-[#111A18] dark:to-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              {/* Circular User Avatar with camera trigger */}
              <div className="relative shrink-0 group">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer transition-transform hover:scale-102 active:scale-98"
                  title="Click to change profile photo"
                >
                  <UserAvatar
                    photo={formData.userPhoto}
                    name={formData.ownerName || formData.businessName}
                    size="xl"
                    ring={true}
                    className="shadow-md"
                  />
                </div>

                {/* Floating Camera Button on bottom-right corner of avatar */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoLoading}
                  title="Upload profile photo"
                  aria-label="Upload profile photo"
                  className="absolute -bottom-1 -right-1 p-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white shadow-md border-2 border-white dark:border-[#111A18] transition-all hover:scale-110 active:scale-95 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handlePhotoUpload(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              {/* Identity Info & Upload Actions */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-[#0A1110] text-[#16A34A] dark:text-[#4ADE80] border border-emerald-200 dark:border-[#1E2E2A]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span>
                    ACTIVE POS
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                    <ShieldCheck className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                    Verified Operator
                  </span>
                </div>

                <h3 className="font-bold text-lg text-[#1E293B] dark:text-white truncate">
                  {formData.ownerName || 'Store Administrator'}
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                  {formData.businessName || 'G. V. MILK AGENCY'}
                </p>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 truncate">
                  {formData.city || formData.address || 'Chennai, India'}
                </p>

                {/* Explicit Photo Upload & Remove Buttons */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photoLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{formData.userPhoto ? 'Change Photo' : 'Upload Photo'}</span>
                  </button>

                  {formData.userPhoto && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#DC2626] dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1.5">
                  JPG, PNG or WebP • Auto-crops to circular profile photo
                </p>
              </div>
            </div>
          </div>

          {/* Quick Business Metrics */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-center">
              <div className="flex items-center justify-center text-emerald-700 dark:text-emerald-400 mb-1">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="font-mono font-bold text-sm sm:text-base text-[#1E293B] dark:text-white">
                {todayBills.length}
              </div>
              <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-tight">
                Today Bills
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-center">
              <div className="flex items-center justify-center text-[#16A34A] dark:text-[#4ADE80] mb-1">
                <Store className="w-4 h-4" />
              </div>
              <div className="font-mono font-bold text-sm sm:text-base text-[#1E293B] dark:text-white">
                {shops.length}
              </div>
              <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-tight">
                Total Shops
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-center">
              <div className="flex items-center justify-center text-[#14B8A6] dark:text-[#2DD4BF] mb-1">
                <Package className="w-4 h-4" />
              </div>
              <div className="font-mono font-bold text-sm sm:text-base text-[#1E293B] dark:text-white">
                {products.length}
              </div>
              <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-tight">
                Products
              </div>
            </div>
          </div>

          {/* Form Fields: Editable Profile */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                Business Details
              </h4>
              <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Prints on receipts</span>
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] dark:text-white mb-1.5">
                Business Name <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <Store className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="e.g. G. V. MILK AGENCY"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#1E293B] dark:text-white pos-input-focus transition-all font-semibold"
                />
              </div>
            </div>

            {/* Owner / Contact Name */}
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] dark:text-white mb-1.5">
                Owner / Manager Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  placeholder="e.g. Store Owner / Cashier"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#1E293B] dark:text-white pos-input-focus transition-all"
                />
              </div>
            </div>

            {/* Phone & Email Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] dark:text-white mb-1.5">
                  Mobile / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 9840865510"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#1E293B] dark:text-white pos-input-focus transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E293B] dark:text-white mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="owner@agency.com"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#1E293B] dark:text-white pos-input-focus transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Address & City */}
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] dark:text-white mb-1.5">
                Street / Area
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. SOLAN NAGAR"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#1E293B] dark:text-white pos-input-focus transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] dark:text-white mb-1.5">
                  City / State / Pincode
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. CHENNAI - 600109"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#1E293B] dark:text-white pos-input-focus transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E293B] dark:text-white mb-1.5">
                  GSTIN / Tax ID
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    placeholder="Optional GSTIN"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#1E293B] dark:text-white pos-input-focus transition-all uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Thermal Paper Size */}
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] dark:text-white mb-1.5">
                Receipt Paper Size
              </label>
              <select
                value={formData.paperSize}
                onChange={(e) => setFormData({ ...formData, paperSize: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#1E293B] dark:text-white pos-input-focus transition-all"
              >
                <option value="58mm">58mm (2-Inch Thermal)</option>
                <option value="80mm">80mm (3-Inch Thermal)</option>
              </select>
            </div>
          </div>

          {/* Quick Hardware & System Tools */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
              System Shortcuts
            </h4>

            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2 text-xs font-medium text-[#1E293B] dark:text-white">
                {isDark ? <Moon className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> : <Sun className="w-4 h-4 text-[#F59E0B]" />}
                <span>Interface Theme</span>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#1E293B] dark:text-white shadow-2xs hover:bg-slate-100 dark:hover:bg-[#162220] transition-colors cursor-pointer"
              >
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </button>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-[#E2E8F0] dark:border-[#1E2E2A] pt-2">
              <div className="flex items-center gap-2 text-xs font-medium text-[#1E293B] dark:text-white">
                <Printer className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>Thermal Printer Setup</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActivePage('settings');
                  closeProfile();
                }}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                Configure <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Active Terminal Operator & Sign Out */}
          {currentUser && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                  ACTIVE TERMINAL OPERATOR
                </span>
                <div className="text-xs font-bold text-[#1E293B] dark:text-white truncate">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-mono">
                  +91 {currentUser.phone}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  closeProfile();
                  logout();
                }}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#111A18] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[#DC2626] dark:text-rose-400 border border-[#E2E8F0] dark:border-[#1E2E2A] hover:border-rose-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#E2E8F0] dark:border-[#1E2E2A] bg-white dark:bg-[#111A18] flex items-center gap-3 rounded-b-3xl">
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-98 disabled:opacity-50"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Profile</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={closeProfile}
            className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-[#0A1110] hover:bg-slate-200 dark:hover:bg-[#162220] text-[#1E293B] dark:text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </aside>
    </>
  );
}
