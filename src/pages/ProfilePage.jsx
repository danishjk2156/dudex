import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  User,
  Store,
  Phone,
  Mail,
  MapPin,
  FileText,
  Camera,
  Trash2,
  CheckCircle2,
  TrendingUp,
  Package,
  Printer,
  Moon,
  Sun,
  ShieldCheck,
  Settings as SettingsIcon,
  Download,
  Calendar,
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { animateStaggerEntrance, animateTactilePress } from '../lib/animations';
import { exportAllData } from '../lib/db';
import { uploadAsset } from '../lib/supabaseService';

export function ProfilePage() {
  const {
    activePage,
    settings,
    updateSettings,
    showToast,
    bills = [],
    shops = [],
    products = [],
    setActivePage,
    isDark,
    toggleTheme,
  } = useApp();

  const fileInputRef = useRef(null);
  const profileContainerRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);

  const [formData, setFormData] = useState({
    businessName: settings.businessName || '',
    ownerName: settings.ownerName || 'Store Administrator',
    phone: settings.phone || '',
    email: settings.email || '',
    address: settings.address || '',
    area: settings.area || '',
    city: settings.city || '',
    gstin: settings.gstin || '',
    paperSize: settings.paperSize || '58mm',
    logo: settings.logo || '',
  });

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
        paperSize: settings.paperSize || '58mm',
        logo: settings.logo || '',
      });
    }
  }, [settings]);

  // Today metrics
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayBills = bills.filter((b) => {
    if (!b.createdAt && !b.dateRaw) return false;
    const billDate = b.dateRaw || b.createdAt.slice(0, 10);
    return billDate === todayStr;
  });
  const todaySalesTotal = todayBills.reduce((sum, b) => sum + (Number(b.finalAmount) || 0), 0);

  const handleLogoUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be under 5MB', 'error');
      return;
    }

    setLogoLoading(true);
    try {
      // 1. Try uploading directly to Supabase Storage S3 bucket
      const cleanExt = file.name ? file.name.split('.').pop() : (file.type === 'image/svg+xml' ? 'svg' : 'png');
      const uploadRes = await uploadAsset(file, `avatars/profile_${Date.now()}.${cleanExt}`);
      if (uploadRes.success && uploadRes.url) {
        setFormData((prev) => ({ ...prev, logo: uploadRes.url }));
        setLogoLoading(false);
        showToast('Image uploaded to Cloud Storage! Click "Save Changes" to apply.', 'success');
        return;
      }

      // 2. Offline / local fallback: Data URL
      if (file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result;
          setFormData((prev) => ({ ...prev, logo: result }));
          setLogoLoading(false);
          showToast('Profile image selected. Remember to save changes.', 'info');
        };
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 400;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL('image/png');
          setFormData((prev) => ({ ...prev, logo: compressed }));
          setLogoLoading(false);
          showToast('Profile image selected. Remember to save changes.', 'info');
        };
        img.src = event.target?.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setLogoLoading(false);
      showToast('Upload failed: ' + err.message, 'error');
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
        paperSize: formData.paperSize,
        logo: formData.logo,
      });
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save profile: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const data = await exportAllData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `POS_Profile_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup exported successfully', 'success');
    } catch (e) {
      showToast('Export failed: ' + e.message, 'error');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'POS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Stagger animate profile sections on activation
  useEffect(() => {
    if ((activePage === 'profile' || !activePage) && profileContainerRef.current && profileContainerRef.current.children.length > 0) {
      animateStaggerEntrance(profileContainerRef.current.children, {
        y: 14,
        duration: 0.38,
        stagger: 0.05,
      });
    }
  }, [activePage]);

  return (
    <div ref={profileContainerRef} className="space-y-6 max-w-6xl mx-auto pb-16 animate-page-entrance">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800">
              <User className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Account & Store Profile
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">
            Business & User Profile
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your store identity, contact info, billing headers, and account preferences.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Backup</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePage('settings')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-indigo-200/80 dark:border-indigo-800"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Identity & Metrics Card */}
        <div className="space-y-6">
          {/* Identity Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm text-center">
            {/* Logo/Avatar */}
            <div className="relative inline-block mx-auto mb-4 group">
              {formData.logo ? (
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 p-2 border-2 border-indigo-200 dark:border-indigo-700 shadow-md flex items-center justify-center">
                  <img
                    src={formData.logo}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 text-white font-bold text-3xl flex items-center justify-center shadow-lg shadow-indigo-500/25 border-2 border-white dark:border-slate-700">
                  {getInitials(formData.businessName)}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={logoLoading}
                className="absolute inset-0 rounded-2xl bg-black/60 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer text-xs font-semibold gap-1 backdrop-blur-xs"
              >
                <Camera className="w-6 h-6" />
                <span>Upload</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]);
                }}
              />
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {formData.businessName || 'Business Name'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {formData.ownerName || 'Store Administrator'}
            </p>

            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ACTIVE POS NODE
              </span>
            </div>

            {formData.logo && (
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, logo: '' }));
                  showToast('Photo cleared. Click Save Changes.', 'info');
                }}
                className="mt-3 text-xs text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Photo
              </button>
            )}

            {/* Quick Contacts */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-left text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium truncate">{formData.phone || 'No phone set'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium truncate">{formData.email || 'No email set'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium truncate">
                  {formData.city || formData.address || 'Address not configured'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Operations Today
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Today's Sales</div>
                <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(todaySalesTotal, settings.currency)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Delivered Bills</div>
                <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                  {todayBills.length}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Client Shops</div>
                <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                  {shops.length}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Catalog Items</div>
                <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                  {products.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns: Profile Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">
              Edit Business & Account Credentials
            </h2>

            <div className="space-y-4">
              {/* Business Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Business / Store Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="e.g. G. V. MILK AGENCY"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Owner / Manager */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Owner / Administrator Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="e.g. Store Owner"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Phone / WhatsApp Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. 9840865510"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="owner@agency.com"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Street Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Street / Area Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. SOLAN NAGAR"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* City & GSTIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    City / State / Pincode
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. CHENNAI - 600109"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    GSTIN / Tax ID
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                      placeholder="Optional GSTIN"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Paper Size */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Thermal Paper Width
                </label>
                <select
                  value={formData.paperSize}
                  onChange={(e) => setFormData({ ...formData, paperSize: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="58mm">58mm (Standard 2-Inch)</option>
                  <option value="80mm">80mm (Wide 3-Inch)</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm flex items-center gap-2 cursor-pointer transition-colors active:scale-98 disabled:opacity-50"
                >
                  {isSaving ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
