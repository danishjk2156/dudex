import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Package,
  AlertTriangle,
  Upload,
  Camera,
  Image as ImageIcon,
  Link2,
  Check,
  Globe,
} from 'lucide-react';
import { animateStaggerEntrance, animateTactilePress } from '../lib/animations';
import { uploadAsset } from '../lib/supabaseService';

export function CompaniesPage() {
  const { activePage, companies, products, addCompany, updateCompany, deleteCompany, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const brandsGridRef = useRef(null);
  const fileInputRef = useRef(null);
  const quickLogoInputRef = useRef(null);
  const [quickLogoTargetCompany, setQuickLogoTargetCompany] = useState(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [logoUrlInput, setLogoUrlInput] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#4F46E5',
    image: '',
  });

  const [imageLoading, setImageLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Stagger animate brands grid
  useEffect(() => {
    if ((activePage === 'companies' || !activePage) && brandsGridRef.current && brandsGridRef.current.children.length > 0) {
      animateStaggerEntrance(brandsGridRef.current.children, {
        y: 14,
        duration: 0.35,
        stagger: 0.04,
      });
    }
  }, [activePage, searchTerm, companies.length]);

  const handleOpenAdd = (e) => {
    if (e) animateTactilePress(e);
    setEditingCompany(null);
    setFormData({ name: '', description: '', color: '#4F46E5', image: '' });
    setShowUrlInput(false);
    setLogoUrlInput('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (e, company) => {
    if (e) animateTactilePress(e);
    setEditingCompany(company);
    setFormData({
      name: company.name,
      description: company.description || '',
      color: company.color || '#4F46E5',
      image: company.image || company.logo || '',
    });
    setShowUrlInput(false);
    setLogoUrlInput('');
    setIsModalOpen(true);
  };

  /**
   * Reusable image processing helper (resizes to max 400x400 and encodes to clean PNG/SVG)
   */
  const processImageFile = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No file provided'));
      if (!file.type.startsWith('image/')) {
        return reject(new Error('Please select a valid image file (PNG, JPG, WebP, SVG)'));
      }
      if (file.size > 5 * 1024 * 1024) {
        return reject(new Error('Image file size must be under 5MB'));
      }

      if (file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result);
        reader.onerror = () => reject(new Error('Failed to read SVG image'));
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
          resolve(compressed);
        };
        img.onerror = () => reject(new Error('Could not process image file'));
        img.src = event.target?.result;
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setImageLoading(true);
    try {
      // 1. Try uploading to Supabase Storage S3 bucket (pos-assets)
      const cleanExt = file.name ? file.name.split('.').pop() : (file.type === 'image/svg+xml' ? 'svg' : 'png');
      const uploadRes = await uploadAsset(file, `brands/brand_${Date.now()}.${cleanExt}`);
      if (uploadRes.success && uploadRes.url) {
        setFormData((prev) => ({ ...prev, image: uploadRes.url, logo: uploadRes.url }));
        showToast('Brand logo uploaded to Cloud Storage!', 'success');
        return;
      }

      // 2. Offline / local fallback
      const compressed = await processImageFile(file);
      setFormData((prev) => ({ ...prev, image: compressed, logo: compressed }));
      showToast('Brand logo attached', 'info');
    } catch (err) {
      showToast(err.message || 'Image processing failed', 'error');
    } finally {
      setImageLoading(false);
    }
  };

  const handleApplyLogoUrl = () => {
    const trimmed = logoUrlInput.trim();
    if (!trimmed) {
      showToast('Please enter an image URL', 'warning');
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image/')) {
      showToast('Please enter a valid URL starting with https://', 'warning');
      return;
    }
    setFormData((prev) => ({ ...prev, image: trimmed }));
    setShowUrlInput(false);
    setLogoUrlInput('');
    showToast('Brand logo URL attached', 'info');
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image: '' }));
    showToast('Brand logo removed', 'info');
  };

  // Quick 1-click Logo Upload trigger directly from brand card
  const handleTriggerQuickLogoUpload = (e, company) => {
    if (e) {
      e.stopPropagation();
      animateTactilePress(e);
    }
    setQuickLogoTargetCompany(company);
    if (quickLogoInputRef.current) {
      quickLogoInputRef.current.value = '';
      quickLogoInputRef.current.click();
    }
  };

  const handleQuickLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !quickLogoTargetCompany) return;
    try {
      showToast(`Uploading logo for ${quickLogoTargetCompany.name}...`, 'info');
      let logoUrl = null;

      // 1. Try uploading to Supabase Storage S3 bucket
      const cleanExt = file.name ? file.name.split('.').pop() : (file.type === 'image/svg+xml' ? 'svg' : 'png');
      const uploadRes = await uploadAsset(file, `brands/brand_${quickLogoTargetCompany.id}_${Date.now()}.${cleanExt}`);
      if (uploadRes.success && uploadRes.url) {
        logoUrl = uploadRes.url;
      } else {
        logoUrl = await processImageFile(file);
      }

      await updateCompany({
        ...quickLogoTargetCompany,
        image: logoUrl,
        logo: logoUrl,
        updatedAt: new Date().toISOString(),
      });
      showToast(`Logo updated for ${quickLogoTargetCompany.name}!`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update brand logo', 'error');
    } finally {
      setQuickLogoTargetCompany(null);
      e.target.value = '';
    }
  };

  // Quick Save Logo Only (from within edit modal)
  const handleQuickSaveLogoInModal = async (e) => {
    if (e) animateTactilePress(e);
    if (!editingCompany) return;
    try {
      await updateCompany({
        ...editingCompany,
        image: formData.image,
        logo: formData.image,
        updatedAt: new Date().toISOString(),
      });
      showToast(`Logo updated for ${editingCompany.name}!`, 'success');
      setIsModalOpen(false);
    } catch (err) {
      showToast('Failed to update logo: ' + err.message, 'error');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter a company/brand name', 'warning');
      return;
    }

    if (editingCompany) {
      await updateCompany({
        ...editingCompany,
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
        image: formData.image,
        logo: formData.image,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await addCompany({
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
        image: formData.image,
        logo: formData.image,
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    const assignedProducts = products.filter((p) => p.companyId === id);
    if (assignedProducts.length > 0) {
      showToast(
        `Cannot delete brand: ${assignedProducts.length} product(s) are assigned to it. Please reassign or delete the products first.`,
        'error'
      );
      setDeleteConfirmId(null);
      return;
    }

    await deleteCompany(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-20 md:pb-8 animate-page-entrance">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white font-display tracking-tight">
              Brand & Company Management
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-normal">
            Add, edit, or remove brands and suppliers whose products you sell.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg btn-tactile-primary font-semibold text-xs sm:text-sm shrink-0 cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Brand</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] dark:text-[#94A3B8] pointer-events-none" />
        <input
          type="text"
          placeholder="Search brands by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#1E293B] dark:text-white placeholder-[#64748B] dark:placeholder-[#94A3B8] pos-input-focus shadow-2xs"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1E293B] dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Brands Cards List */}
      <div ref={brandsGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredCompanies.map((company) => {
          const companyProducts = products.filter((p) => p.companyId === company.id);
          const brandImage = company.image || company.logo;

          return (
            <div
              key={company.id}
              className="bg-white dark:bg-[#111A18] rounded-2xl p-4 sm:p-5 flex flex-col justify-between border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xs hover:shadow-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    {/* Brand Logo or Initial Fallback with 1-Click Update Overlay */}
                    <div className="relative group/logo">
                      {brandImage ? (
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-white dark:bg-[#0A1110] p-1 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xs flex items-center justify-center shrink-0">
                          <img
                            src={brandImage}
                            alt={company.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-xs text-sm shrink-0 bg-emerald-700 dark:bg-emerald-600">
                          {company.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Hover Camera Overlay for quick update */}
                      <button
                        type="button"
                        aria-label={`Update logo for ${company.name}`}
                        onClick={(e) => handleTriggerQuickLogoUpload(e, company)}
                        title="Click to change logo"
                        className="absolute inset-0 rounded-xl bg-slate-900/60 text-white opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-2xs"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <h3 className="font-display font-bold text-base text-[#1E293B] dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors duration-200 leading-tight">
                        {company.name}
                      </h3>
                      <span className="status-pill bg-slate-100 dark:bg-[#0A1110] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[10px] mt-1 inline-flex items-center gap-1">
                        <Package className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        {companyProducts.length} Product(s)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Dedicated Quick Logo Update Button */}
                    <button
                      type="button"
                      aria-label={`Update logo for ${company.name}`}
                      onClick={(e) => handleTriggerQuickLogoUpload(e, company)}
                      title="Update Brand Logo"
                      className="p-2 min-w-[36px] min-h-[36px] rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-[#162220] transition-colors duration-200 flex items-center justify-center cursor-pointer"
                    >
                      <Camera className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Edit ${company.name}`}
                      onClick={(e) => handleOpenEdit(e, company)}
                      title="Edit Brand & Details"
                      className="p-2 min-w-[36px] min-h-[36px] rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-[#162220] transition-colors duration-200 flex items-center justify-center cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${company.name}`}
                      onClick={(e) => {
                        animateTactilePress(e);
                        setDeleteConfirmId(company.id);
                      }}
                      title="Delete Brand"
                      className="p-2 min-w-[36px] min-h-[36px] rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:text-[#DC2626] dark:hover:text-[#F87171] hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {company.description && (
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-2 line-clamp-2 font-normal">
                    {company.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-[#1E2E2A] flex items-center justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                <span>Brand ID: {company.id.replace('cmp_', '')}</span>
                <span className="status-pill status-pill-emerald text-[10px]">Active</span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="bg-white dark:bg-[#111A18] rounded-2xl p-10 text-center text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-sm space-y-3">
          <Building2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 opacity-60" />
          <p className="text-base font-bold text-[#1E293B] dark:text-white">
            No brands found matching "{searchTerm}"
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-lg btn-tactile-primary text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add This Brand
          </button>
        </div>
      )}

      {/* Add / Edit Company Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-md transition-colors max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E2E2A]">
              <h3 className="font-display font-bold text-base text-[#1E293B] dark:text-white">
                {editingCompany ? 'Edit Brand / Company' : 'Add New Brand / Company'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#162220] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4">
              {/* Brand Logo / Image Upload Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#1E293B] dark:text-white flex items-center gap-1.5">
                    <span>Brand Logo</span>
                    {formData.image ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#16A34A] bg-emerald-50 dark:bg-[#0A1110] px-2 py-0.5 rounded-full border border-emerald-200 dark:border-[#1E2E2A]">
                        <Check className="w-2.5 h-2.5" /> Logo Configured
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-normal">(Optional)</span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Link2 className="w-3 h-3" />
                    {showUrlInput ? 'Upload file instead' : 'Or paste image URL'}
                  </button>
                </div>

                {/* Optional URL input mode */}
                {showUrlInput && (
                  <div className="mb-3 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2 animate-in fade-in duration-150">
                    <label className="text-[11px] font-semibold text-[#1E293B] dark:text-white flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      Paste Web Image URL:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={logoUrlInput}
                        onChange={(e) => setLogoUrlInput(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#1E2E2A] bg-white dark:bg-[#0A1110] text-xs text-[#1E293B] dark:text-white placeholder-[#64748B] dark:placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                      <button
                        type="button"
                        onClick={handleApplyLogoUrl}
                        className="px-3 py-1.5 rounded-lg btn-tactile-primary text-xs font-bold transition-colors cursor-pointer shadow-xs"
                      >
                        Apply URL
                      </button>
                    </div>
                  </div>
                )}

                {formData.image ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E2E2A] bg-slate-50 dark:bg-[#0A1110]">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] p-1 flex items-center justify-center overflow-hidden shadow-xs shrink-0">
                        <img
                          src={formData.image}
                          alt="Brand Logo Preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1E293B] dark:text-white truncate">
                          Active Brand Logo
                        </p>
                        <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                          Displayed on product cards & receipts
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={imageLoading}
                        title="Upload a new logo to replace"
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] hover:bg-slate-100 dark:hover:bg-[#1E2E2A] text-[#64748B] dark:text-white transition-colors duration-200 cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
                        <span>Change</span>
                      </button>
                      {editingCompany && (
                        <button
                          type="button"
                          onClick={handleQuickSaveLogoInModal}
                          title="Save Logo Now without changing other fields"
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition-colors duration-200 cursor-pointer shadow-2xs"
                        >
                          Save Logo
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="p-1.5 text-xs rounded-lg text-[#DC2626] hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files?.[0]) {
                        handleImageUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors duration-200 flex flex-col items-center justify-center gap-1.5 ${
                      isDragging
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'border-[#E2E8F0] dark:border-[#1E2E2A] hover:border-emerald-500 bg-slate-50/50 dark:bg-[#0A1110]/50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shadow-xs border border-emerald-200 dark:border-emerald-800/40">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
                        Upload brand logo
                      </span>
                      <span className="text-xs text-[#64748B] dark:text-[#94A3B8]"> or drag & drop</span>
                    </div>
                    <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                      PNG, JPG, WebP or SVG (max 5MB, auto-optimized)
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleImageUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>

              {/* Brand Name */}
              <div>
                <label className="block text-xs font-bold text-[#1E293B] dark:text-white mb-1.5">
                  Brand / Company Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aavin, Heritage, Hatsun, Milky Mist, Amul, Nestlé..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2 text-sm text-[#1E293B] dark:text-white placeholder-[#64748B] dark:placeholder-[#94A3B8] pos-input-focus shadow-2xs"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#1E293B] dark:text-white mb-1.5">
                  Description / Category (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fresh milk packets, curd, paneer & dairy items"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2 text-sm text-[#1E293B] dark:text-white placeholder-[#64748B] dark:placeholder-[#94A3B8] pos-input-focus shadow-2xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg btn-ghost-secondary text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={imageLoading}
                  className="px-5 py-2 rounded-lg btn-tactile-primary text-xs font-bold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {imageLoading ? 'Processing...' : editingCompany ? 'Update Brand' : 'Save Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111A18] border border-rose-200 dark:border-rose-900/60 rounded-2xl shadow-2xl p-5 w-full max-w-sm transition-colors">
            <div className="flex items-center gap-3 text-[#DC2626] dark:text-rose-400 mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-display font-bold text-base text-[#1E293B] dark:text-white">
                Delete Brand?
              </h3>
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-4 font-normal">
              Are you sure you want to delete this brand? Products linked to this brand cannot be orphaned.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-2 rounded-lg btn-ghost-secondary text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-rose-700 text-white font-semibold text-xs shadow-sm active:scale-95 cursor-pointer"
              >
                Delete Brand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for 1-Click Brand Logo Upload directly from Brand Cards */}
      <input
        ref={quickLogoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleQuickLogoChange}
      />
    </div>
  );
}
