import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings,
  Store,
  Printer,
  Bluetooth,
  Download,
  Upload,
  Trash2,
  Save,
  AlertTriangle,
  Sun,
  Moon,
  Laptop,
  Image as ImageIcon,
  Check,
  X,
} from 'lucide-react';
import { connectBluetoothPrinter, disconnectBluetoothPrinter, isPrinterConnected, printThermalReceipt } from '../lib/printer';
import { exportAllData, importData, clearStore } from '../lib/db';
import { animateStaggerEntrance, animateTactilePress } from '../lib/animations';
import { uploadAsset } from '../lib/supabaseService';

export function SettingsPage() {
  const { activePage, settings, updateSettings, showToast, refreshData, theme, setTheme } = useApp();
  const fileInputRef = useRef(null);
  const settingsContainerRef = useRef(null);

  const [formData, setFormData] = useState({
    businessName: settings.businessName || '',
    address: settings.address || '',
    area: settings.area || '',
    city: settings.city || '',
    phone: settings.phone || '',
    gstin: settings.gstin || '',
    currency: settings.currency || '₹',
    paperSize: settings.paperSize || '58mm',
    logo: settings.logo || '',
  });

  const [isDragging, setIsDragging] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData((prev) => ({
        ...prev,
        businessName: settings.businessName ?? prev.businessName,
        address: settings.address ?? prev.address,
        area: settings.area ?? prev.area,
        city: settings.city ?? prev.city,
        phone: settings.phone ?? prev.phone,
        gstin: settings.gstin ?? prev.gstin,
        currency: settings.currency ?? prev.currency,
        paperSize: settings.paperSize ?? prev.paperSize,
        logo: settings.logo ?? prev.logo,
      }));
    }
  }, [settings]);

  const [btConnected, setBtConnected] = useState(isPrinterConnected());
  const [btDeviceName, setBtDeviceName] = useState('');
  const [isConnectingBt, setIsConnectingBt] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleLogoUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG, WebP)', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Logo image size must be under 5MB', 'error');
      return;
    }

    setLogoLoading(true);
    try {
      // 1. Try direct upload to Supabase Storage S3 Bucket if connected
      const cleanExt = file.name ? file.name.split('.').pop() : (file.type === 'image/svg+xml' ? 'svg' : 'png');
      const uploadRes = await uploadAsset(file, `logos/business_logo_${Date.now()}.${cleanExt}`);
      if (uploadRes.success && uploadRes.url) {
        setFormData((prev) => ({ ...prev, logo: uploadRes.url }));
        setLogoLoading(false);
        showToast('Logo uploaded to Cloud Storage! Click "Save Business Details" to apply.', 'success');
        return;
      }

      // 2. Offline / Local fallback: Process as local data URL
      if (file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result;
          setFormData((prev) => ({ ...prev, logo: result }));
          setLogoLoading(false);
          showToast('Logo uploaded! Click "Save Business Details" to save changes.', 'success');
        };
        reader.onerror = () => {
          setLogoLoading(false);
          showToast('Failed to read SVG image', 'error');
        };
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const maxDimension = 480;
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
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
          showToast('Logo uploaded! Click "Save Business Details" to save changes.', 'success');
        };
        img.onerror = () => {
          setLogoLoading(false);
          showToast('Could not process image file', 'error');
        };
        img.src = event.target?.result;
      };
      reader.onerror = () => {
        setLogoLoading(false);
        showToast('Failed to read image file', 'error');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setLogoLoading(false);
      showToast('Failed to upload logo: ' + err.message, 'error');
    }
  };

  const handleRemoveLogo = (e) => {
    if (e) e.stopPropagation();
    setFormData((prev) => ({ ...prev, logo: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Logo removed. Click "Save Business Details" to apply.', 'info');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleLogoUpload(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleLogoUpload(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    animateTactilePress(e);
    await updateSettings(formData);
    showToast('Business settings saved successfully', 'success');
  };

  const handleConnectPrinter = async (e) => {
    animateTactilePress(e);
    setIsConnectingBt(true);
    try {
      const res = await connectBluetoothPrinter();
      setBtConnected(true);
      setBtDeviceName(res.deviceName || 'Thermal Printer');
      showToast(`Connected to ${res.deviceName}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Bluetooth connection error: ' + err.message, 'error');
    } finally {
      setIsConnectingBt(false);
    }
  };

  const handleDisconnectPrinter = async (e) => {
    animateTactilePress(e);
    await disconnectBluetoothPrinter();
    setBtConnected(false);
    setBtDeviceName('');
    showToast('Printer disconnected', 'info');
  };

  const handleTestPrint = async (e) => {
    animateTactilePress(e);
    try {
      showToast('Preparing thermal test print...', 'info');
      const testBill = {
        billNumber: 101,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        customerName: 'COUNTER SALE',
        customerPhone: formData.phone || '9840865510',
        items: [
          { id: 't1', name: 'Aavin Blue 500ml', quantity: 2, unit: 'Packet', rate: 20 },
          { id: 't2', name: 'Curd 500g', quantity: 1, unit: 'Pouch', rate: 35 },
        ],
        totalItems: 2,
        totalQty: 3,
        totalAmount: 75,
        roundOff: 0,
        finalAmount: 75,
      };
      await printThermalReceipt(testBill, { ...settings, ...formData });
      showToast('Thermal test print triggered', 'success');
    } catch (err) {
      console.error(err);
      showToast('Test print failed: ' + err.message, 'error');
    }
  };

  const handleExportJSON = async (e) => {
    animateTactilePress(e);
    try {
      const data = await exportAllData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `POS_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Backup JSON exported successfully', 'success');
    } catch (err) {
      showToast('Export failed: ' + err.message, 'error');
    }
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result);
        await importData(json);
        await refreshData();
        showToast('Data imported successfully!', 'success');
      } catch (err) {
        showToast('Import failed: Invalid backup file', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = async () => {
    try {
      await clearStore('bills');
      await clearStore('products');
      await clearStore('companies');
      await refreshData();
      setShowClearConfirm(false);
      showToast('Database reset successfully', 'info');
    } catch (e) {
      showToast('Clear failed: ' + e.message, 'error');
    }
  };

  // Stagger animate settings cards on tab activation
  useEffect(() => {
    if ((activePage === 'settings' || !activePage) && settingsContainerRef.current && settingsContainerRef.current.children.length > 0) {
      animateStaggerEntrance(settingsContainerRef.current.children, {
        y: 14,
        duration: 0.38,
        stagger: 0.05,
      });
    }
  }, [activePage]);

  return (
    <div ref={settingsContainerRef} className="space-y-6 max-w-4xl mx-auto pb-20 md:pb-8 animate-page-entrance">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white font-display tracking-tight">
            Business & POS Settings
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-normal">
          Configure appearance & dark mode, business details for thermal receipts, Bluetooth printer, and backups.
        </p>
      </div>

      {/* Appearance & Dark Mode Card */}
      <div className="bg-white dark:bg-[#111A18] rounded-2xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-sm transition-colors">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0] dark:border-[#1E2E2A] mb-4">
          <Moon className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <h3 className="font-display font-bold text-base text-[#1E293B] dark:text-white">
            Appearance & Theme
          </h3>
        </div>

        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-4 font-normal">
          Choose your interface theme. Dark mode provides superior comfort in low-light environments and reduces battery consumption on OLED displays.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Light Mode Option */}
          <button
            type="button"
            onClick={(e) => {
              animateTactilePress(e);
              setTheme('light');
            }}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-2.5 transition-all text-left cursor-pointer ${
              theme === 'light'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500/20'
                : 'border-[#E2E8F0] dark:border-[#1E2E2A] bg-white dark:bg-[#0A1110] text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#162220]'
            }`}
          >
            <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-emerald-700 text-white shadow-2xs' : 'bg-slate-100 dark:bg-[#111A18] text-[#64748B] dark:text-[#94A3B8]'}`}>
              <Sun className="w-5 h-5" />
            </div>
            <div className="text-center">
              <span className="text-xs sm:text-sm font-bold block leading-tight">Light Theme</span>
              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block mt-0.5">Clean neutral canvas</span>
            </div>
          </button>

          {/* Dark Mode Option */}
          <button
            type="button"
            onClick={(e) => {
              animateTactilePress(e);
              setTheme('dark');
            }}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-2.5 transition-all text-left cursor-pointer ${
              theme === 'dark'
                ? 'border-emerald-500 bg-[#0A1110] text-white font-bold ring-2 ring-emerald-500/30'
                : 'border-[#E2E8F0] dark:border-[#1E2E2A] bg-white dark:bg-[#0A1110] text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#162220]'
            }`}
          >
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-emerald-700 text-white shadow-2xs font-bold' : 'bg-slate-100 dark:bg-[#111A18] text-[#64748B] dark:text-[#94A3B8]'}`}>
              <Moon className="w-5 h-5" />
            </div>
            <div className="text-center">
              <span className="text-xs sm:text-sm font-bold block leading-tight">Dark Mode</span>
              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block mt-0.5">Deep obsidian & emerald</span>
            </div>
          </button>

          {/* System Mode Option */}
          <button
            type="button"
            onClick={(e) => {
              animateTactilePress(e);
              setTheme('system');
            }}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-2.5 transition-all text-left cursor-pointer ${
              theme === 'system'
                ? 'border-emerald-600 bg-emerald-50 dark:bg-[#0A1110] text-emerald-900 dark:text-white font-bold ring-2 ring-emerald-500/20'
                : 'border-[#E2E8F0] dark:border-[#1E2E2A] bg-white dark:bg-[#0A1110] text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#162220]'
            }`}
          >
            <div className={`p-2 rounded-lg ${theme === 'system' ? 'bg-emerald-700 text-white shadow-2xs' : 'bg-slate-100 dark:bg-[#111A18] text-[#64748B] dark:text-[#94A3B8]'}`}>
              <Laptop className="w-5 h-5" />
            </div>
            <div className="text-center">
              <span className="text-xs sm:text-sm font-bold block leading-tight">Sync with System</span>
              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block mt-0.5">Match OS preference</span>
            </div>
          </button>
        </div>
      </div>

      {/* Business Profile Form */}
      <div className="bg-white dark:bg-[#111A18] rounded-2xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-sm transition-colors">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0] dark:border-[#1E2E2A] mb-4">
          <Store className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <h3 className="font-display font-bold text-base text-[#1E293B] dark:text-white">
            Business / Agency Receipt Header
          </h3>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Business Logo Upload Section */}
          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Logo Preview or Upload Trigger Box */}
                {formData.logo ? (
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-xl bg-white dark:bg-[#111A18] border-2 border-emerald-500/40 p-1.5 shadow-sm flex items-center justify-center overflow-hidden">
                      <img
                        src={formData.logo}
                        alt="Business Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      title="Remove Logo"
                      className="absolute -top-2 -right-2 w-6 h-6 bg-[#DC2626] hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                    className={`w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-[#111A18] scale-105'
                        : 'border-[#E2E8F0] dark:border-[#1E2E2A] bg-white dark:bg-[#111A18] hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-[#162220]'
                    }`}
                  >
                    <ImageIcon className="w-6 h-6 text-[#64748B] dark:text-[#94A3B8] mb-1" />
                    <span className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8] text-center leading-tight px-1">
                      Upload Logo
                    </span>
                  </div>
                )}

                {/* Logo Details & Action Buttons */}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#1E293B] dark:text-white">
                      Business / Store Logo
                    </h4>
                    {formData.logo ? (
                      <span className="status-pill status-pill-emerald text-[10px] flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Logo Active
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#111A18] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#1E2E2A]">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 max-w-sm">
                    Displayed on thermal receipts, downloadable PDF bills, and navigation header.
                  </p>

                  <div className="flex items-center gap-2 mt-2.5">
                    <button
                      type="button"
                      disabled={logoLoading}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#111A18] hover:bg-slate-100 dark:hover:bg-[#162220] text-[#1E293B] dark:text-white border border-[#E2E8F0] dark:border-[#1E2E2A] text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
                    >
                      {logoLoading ? (
                        <span className="animate-spin text-xs">⏳</span>
                      ) : (
                        <UploadCloud className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      )}
                      <span>{formData.logo ? 'Change Logo' : 'Upload Image'}</span>
                    </button>

                    {formData.logo && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#DC2626] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="hidden lg:block text-right">
                <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block">
                  PNG, JPG, SVG or WEBP
                </span>
                <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block">
                  Max 5MB • Auto-optimized
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] dark:text-white mb-1.5">
                Business / Agency Name <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="e.g. G. V. MILK AGENCY"
                className="w-full bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2 text-sm text-[#1E293B] dark:text-white placeholder-[#64748B] dark:placeholder-[#94A3B8] uppercase font-bold shadow-2xs pos-input-focus"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E293B] dark:text-white mb-1.5">
                Contact Phone / Mobile <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. 9840865510"
                className="w-full bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2 text-sm text-[#1E293B] dark:text-white placeholder-[#64748B] dark:placeholder-[#94A3B8] font-mono shadow-2xs pos-input-focus"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] dark:text-white mb-1.5">
                Address / Street Line
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. SOLAN NAGAR"
                className="w-full bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2 text-sm text-[#1E293B] dark:text-white placeholder-[#64748B] dark:placeholder-[#94A3B8] uppercase shadow-2xs pos-input-focus"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E293B] dark:text-white mb-1.5">
                Area / Locality
              </label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="e.g. SOLAN NAGAR"
                className="w-full bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2 text-sm text-[#1E293B] dark:text-white placeholder-[#64748B] dark:placeholder-[#94A3B8] uppercase shadow-2xs pos-input-focus"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E293B] dark:text-white mb-1.5">
                City & PIN Code
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. CHENNAI - 600109"
                className="w-full bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2 text-sm text-[#1E293B] dark:text-white placeholder-[#64748B] dark:placeholder-[#94A3B8] uppercase shadow-2xs pos-input-focus"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] dark:text-white mb-1.5">
                GSTIN / Tax ID (Optional)
              </label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                placeholder="e.g. 33AAAAA0000A1Z5"
                className="w-full bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2 text-sm text-[#1E293B] dark:text-white placeholder-[#64748B] dark:placeholder-[#94A3B8] font-mono uppercase shadow-2xs pos-input-focus"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E293B] dark:text-white mb-1.5">
                Thermal Paper Width
              </label>
              <select
                value={formData.paperSize}
                onChange={(e) => setFormData({ ...formData, paperSize: e.target.value })}
                className="w-full bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2 text-sm text-[#1E293B] dark:text-white shadow-2xs pos-input-focus"
              >
                <option value="58mm" className="bg-white dark:bg-[#111A18] text-[#1E293B] dark:text-white">58mm (Standard 2-inch)</option>
                <option value="80mm" className="bg-white dark:bg-[#111A18] text-[#1E293B] dark:text-white">80mm (Wide 3-inch)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg btn-tactile-primary font-semibold text-xs sm:text-sm cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Save Business Details</span>
            </button>
          </div>
        </form>
      </div>

      {/* Bluetooth Thermal Printer Card */}
      <div className="bg-white dark:bg-[#111A18] rounded-2xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-sm transition-colors">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0] dark:border-[#1E2E2A] mb-4">
          <Printer className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <h3 className="font-display font-bold text-base text-[#1E293B] dark:text-white">
            Bluetooth Thermal Printer Setup
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50/80 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A]">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${
                btConnected
                  ? 'bg-emerald-50 dark:bg-[#0A1110] text-[#16A34A] dark:text-[#4ADE80] border border-emerald-200 dark:border-[#1E2E2A]'
                  : 'bg-white dark:bg-[#111A18] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#1E2E2A]'
              }`}
            >
              <Bluetooth className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#1E293B] dark:text-white">
                  {btConnected ? (btDeviceName || 'Thermal Printer') : 'No Printer Paired'}
                </span>
                <span className={`status-pill text-[10px] ${btConnected ? 'status-pill-emerald' : 'status-pill-slate'}`}>
                  {btConnected ? 'CONNECTED' : 'NOT CONNECTED'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-normal">
                {btConnected
                  ? 'Ready to print ESC/POS thermal receipts directly via Web Bluetooth'
                  : 'Pair your 58mm or 80mm ESC/POS Bluetooth thermal printer'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleTestPrint}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white dark:bg-[#111A18] hover:bg-slate-100 dark:hover:bg-[#162220] text-[#1E293B] dark:text-white border border-[#E2E8F0] dark:border-[#1E2E2A] text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Test Print</span>
            </button>
            {btConnected ? (
              <button
                onClick={handleDisconnectPrinter}
                className="w-full sm:w-auto px-4 py-2 rounded-lg btn-ghost-secondary font-bold text-xs cursor-pointer"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnectPrinter}
                disabled={isConnectingBt}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg btn-tactile-primary font-semibold text-xs disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Bluetooth className="w-4 h-4" />
                <span>{isConnectingBt ? 'Searching...' : 'Connect Printer'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Data Management Card */}
      <div className="bg-white dark:bg-[#111A18] rounded-2xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-sm transition-colors">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0] dark:border-[#1E2E2A] mb-4">
          <Download className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <h3 className="font-display font-bold text-base text-[#1E293B] dark:text-white">
            Data Backup & Restore
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-2 p-3 rounded-lg btn-ghost-secondary font-bold text-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Export Backup (JSON)</span>
          </button>

          {/* Import JSON */}
          <label className="flex items-center justify-center gap-2 p-3 rounded-lg btn-ghost-secondary font-bold text-xs transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Import Backup (JSON)</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          {/* Reset Database */}
          <button
            onClick={(e) => {
              animateTactilePress(e);
              setShowClearConfirm(true);
            }}
            className="flex items-center justify-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100/70 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/80 text-[#DC2626] dark:text-rose-300 font-bold text-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-[#DC2626] dark:text-rose-400" />
            <span>Reset Database</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111A18] border border-rose-200 dark:border-rose-900/60 rounded-2xl shadow-xl p-5 sm:p-6 w-full max-w-sm transition-colors">
            <div className="flex items-center gap-3 text-[#DC2626] dark:text-rose-400 mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-display font-bold text-base text-[#1E293B] dark:text-white">Reset All Data?</h3>
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-4 font-normal">
              This will erase all saved bills, products, and brand records. Please export a JSON backup first if you want to keep your data.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-2 rounded-lg btn-ghost-secondary text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllData}
                className="px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-rose-700 text-white font-semibold text-xs shadow-sm active:scale-95 cursor-pointer"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
