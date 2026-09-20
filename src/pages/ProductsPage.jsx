import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Package, Plus, Edit2, Trash2, Search, X, Check, Building2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { animateStaggerEntrance, animateTactilePress } from '../lib/animations';

export function ProductsPage() {
  const { activePage, products, companies, addProduct, updateProduct, updateProductRate, deleteProduct, settings, showToast, setActivePage } = useApp();

  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [inlineRateEditId, setInlineRateEditId] = useState(null);
  const [inlineRateVal, setInlineRateVal] = useState('');
  const productsGridRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    companyId: '',
    name: '',
    rate: '',
    unit: 'Packet',
    gstRate: 0,
    status: 'active',
  });

  const unitsList = ['Packet', 'Liter', 'Half-Liter', 'Kg', 'Gram', 'Piece', 'Pouch', 'Bottle', 'Can', 'Box', 'Cup'];

  const filteredProducts = products.filter((p) => {
    const matchesCompany = selectedCompanyFilter === 'ALL' || p.companyId === selectedCompanyFilter;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (companies.find((c) => c.id === p.companyId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCompany && matchesSearch;
  });

  // Stagger animate products grid
  useEffect(() => {
    if ((activePage === 'products' || !activePage) && productsGridRef.current && productsGridRef.current.children.length > 0) {
      animateStaggerEntrance(productsGridRef.current.children, {
        y: 14,
        duration: 0.35,
        stagger: 0.03,
      });
    }
  }, [activePage, selectedCompanyFilter, searchTerm, products.length]);

  const handleOpenAdd = (e) => {
    if (e) animateTactilePress(e);
    if (companies.length === 0) {
      showToast('Please add at least one brand first before creating products', 'warning');
      setActivePage('companies');
      return;
    }

    setEditingProduct(null);
    setFormData({
      companyId: companies[0]?.id || '',
      name: '',
      rate: '',
      unit: 'Packet',
      gstRate: 0,
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (e, product) => {
    if (e) animateTactilePress(e);
    setEditingProduct(product);
    setFormData({
      companyId: product.companyId,
      name: product.name,
      rate: product.rate,
      unit: product.unit || 'Packet',
      gstRate: product.gstRate !== undefined ? product.gstRate : 0,
      status: product.status || 'active',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter a product name', 'warning');
      return;
    }
    if (!formData.companyId) {
      showToast('Please select a brand/company', 'warning');
      return;
    }
    if (Number(formData.rate) < 0 || isNaN(Number(formData.rate)) || formData.rate === '') {
      showToast('Please enter a valid selling rate', 'warning');
      return;
    }

    const parsedGstRate = formData.gstRate !== '' && !isNaN(Number(formData.gstRate))
      ? Math.max(0, Number(formData.gstRate))
      : 0;

    if (editingProduct) {
      await updateProduct({
        ...editingProduct,
        companyId: formData.companyId,
        name: formData.name.trim(),
        rate: Number(formData.rate),
        unit: formData.unit?.trim() || 'Packet',
        gstRate: parsedGstRate,
        status: formData.status,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await addProduct({
        ...formData,
        name: formData.name.trim(),
        rate: Number(formData.rate),
        unit: formData.unit?.trim() || 'Packet',
        gstRate: parsedGstRate,
      });
    }

    setIsModalOpen(false);
  };

  const startInlineRateEdit = (product) => {
    setInlineRateEditId(product.id);
    setInlineRateVal(String(product.rate));
  };

  const saveInlineRate = async (productId) => {
    if (inlineRateVal !== '' && !isNaN(Number(inlineRateVal))) {
      await updateProductRate(productId, inlineRateVal);
    }
    setInlineRateEditId(null);
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-20 md:pb-8 animate-page-entrance">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white font-display tracking-tight">
              Product & Rate Management
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-normal">
            Add products with selling price, unit type, brand association & active status.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg btn-tactile-primary font-semibold text-xs sm:text-sm shrink-0 cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Create Product</span>
        </button>
      </div>

      {/* Brand Filter Pills & Search */}
      <div className="space-y-3">
        {/* Horizontal Brand Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={(e) => {
              animateTactilePress(e);
              setSelectedCompanyFilter('ALL');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap min-h-[36px] cursor-pointer transition-all ${
              selectedCompanyFilter === 'ALL'
                ? 'filter-pill-active'
                : 'filter-pill'
            }`}
          >
            All Brands ({products.length})
          </button>
          {companies.map((c) => {
            const count = products.filter((p) => p.companyId === c.id).length;
            const isSelected = selectedCompanyFilter === c.id;

            return (
              <button
                key={c.id}
                onClick={(e) => {
                  animateTactilePress(e);
                  setSelectedCompanyFilter(c.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 min-h-[36px] cursor-pointer transition-all ${
                  isSelected
                    ? 'filter-pill-active'
                    : 'filter-pill'
                }`}
              >
                {(c.image || c.logo) && (
                  <img
                    src={c.image || c.logo}
                    alt=""
                    className="w-3.5 h-3.5 rounded object-contain bg-white shrink-0"
                  />
                )}
                <span>{c.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-black/25 text-white'
                      : 'bg-slate-100 dark:bg-[#0A1110] text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] dark:text-[#94A3B8] pointer-events-none" />
          <input
            type="text"
            placeholder="Search products by name or brand..."
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
      </div>

      {/* Products Grid */}
      <div ref={productsGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredProducts.map((product) => {
          const company = companies.find((c) => c.id === product.companyId);
          const isInactive = product.status === 'inactive';
          const isEditingRate = inlineRateEditId === product.id;
          const brandLogo = company?.image || company?.logo;

          return (
            <div
              key={product.id}
              className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between border transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md ${
                isInactive
                  ? 'opacity-65 bg-[#F8FAFC]/50 dark:bg-[#111A18]/40 border-[#E2E8F0] dark:border-[#1E2E2A] shadow-2xs'
                  : 'bg-white dark:bg-[#111A18] border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xs hover:border-emerald-500/50 dark:hover:border-emerald-500/50'
              }`}
            >
              <div>
                {/* Brand Badge & Status Pill */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-50 dark:bg-[#0A1110] text-[#1E293B] dark:text-[#93C5FD] border border-[#E2E8F0] dark:border-[#1E2E2A] flex items-center gap-1.5">
                    {brandLogo ? (
                      <img
                        src={brandLogo}
                        alt=""
                        className="w-3.5 h-3.5 rounded object-contain bg-white shrink-0"
                      />
                    ) : (
                      <Building2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    )}
                    <span className="truncate">{company?.name || 'Unassigned'}</span>
                  </span>

                  {/* Status Badges */}
                  {isInactive ? (
                    <span className="status-pill status-pill-slate text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      Inactive
                    </span>
                  ) : (
                    <span className="status-pill status-pill-emerald text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span>
                      Active
                    </span>
                  )}
                </div>

                {/* Product Name */}
                <h3 className="font-display font-bold text-sm sm:text-base text-[#1E293B] dark:text-white leading-snug mt-1">
                  {product.name}
                </h3>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-normal">
                    Unit: <span className="text-[#1E293B] dark:text-white font-semibold">{product.unit || 'Packet'}</span>
                  </p>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/40">
                    GST: {product.gstRate !== undefined ? product.gstRate : 0}%
                  </span>
                </div>
              </div>

              {/* Price & Action Row */}
              <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-[#1E2E2A] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase font-bold block">Selling Price</span>
                  {isEditingRate ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[#1E293B] dark:text-white text-xs font-mono">₹</span>
                      <input
                        type="number"
                        autoFocus
                        value={inlineRateVal}
                        onChange={(e) => setInlineRateVal(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveInlineRate(product.id)}
                        className="w-20 bg-white dark:bg-[#0A1110] border border-emerald-600 rounded-md px-1.5 py-0.5 text-xs text-[#1E293B] dark:text-white font-mono font-bold focus:outline-none"
                      />
                      <button
                        onClick={() => saveInlineRate(product.id)}
                        className="p-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white active:scale-95 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => startInlineRateEdit(product)}
                      className="cursor-pointer group/rate flex items-center gap-1"
                      title="Click to quickly edit rate"
                    >
                      <span className="font-mono font-bold text-base text-slate-800 dark:text-emerald-300">
                        {formatCurrency(product.rate, settings.currency)}
                      </span>
                      <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] group-hover/rate:text-emerald-700 underline decoration-dotted">
                        (edit)
                      </span>
                    </div>
                  )}
                </div>

                {/* Edit & Delete buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Edit ${product.name}`}
                    onClick={(e) => handleOpenEdit(e, product)}
                    className="p-2 min-w-[36px] min-h-[36px] rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-[#1E2E2A] transition-colors flex items-center justify-center cursor-pointer"
                    title="Edit Product"
                  >
                    <Edit2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${product.name}`}
                    onClick={(e) => {
                      animateTactilePress(e);
                      deleteProduct(product.id);
                    }}
                    className="p-2 min-w-[36px] min-h-[36px] rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:text-[#DC2626] dark:hover:text-[#F87171] hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center justify-center cursor-pointer"
                    title="Delete Product"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="bg-white dark:bg-[#111A18] rounded-2xl p-10 text-center text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-sm space-y-3">
          <Package className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 opacity-60" />
          <p className="text-base font-bold text-[#1E293B] dark:text-white">No products found</p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-lg btn-tactile-primary text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" /> Create Product
          </button>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/80 backdrop-blur-md animate-modal-pop">
          <div className="bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-md transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E2E2A]">
              <h3 className="font-bold text-base text-[#1E293B] dark:text-white font-display">
                {editingProduct ? 'Edit Product' : 'Create New Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E2E2A] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4">
              {/* Select Brand / Company */}
              <div>
                <label className="block text-xs font-bold text-[#1E293B] dark:text-[#94A3B8] mb-1.5 font-label">
                  Select Brand / Company <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  required
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                  className="w-full bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2.5 text-sm text-[#1E293B] dark:text-white pos-input-focus shadow-2xs"
                >
                  <option value="" disabled>-- Choose a Brand --</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-[#1E293B] dark:text-[#94A3B8] mb-1.5 font-label">
                  Product Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aavin Blue, Heritage Curd, Supergold..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2.5 text-sm text-[#1E293B] dark:text-white placeholder-[#64748B] dark:placeholder-[#94A3B8] pos-input-focus shadow-2xs"
                />
              </div>

              {/* Selling Price / Rate & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1E293B] dark:text-[#94A3B8] mb-1.5 font-label">
                    Selling Rate (₹) <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 20.00"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    className="w-full bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2.5 text-sm text-[#1E293B] dark:text-white placeholder-[#64748B] dark:placeholder-[#94A3B8] font-mono font-bold pos-input-focus shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E293B] dark:text-[#94A3B8] mb-1.5 font-label">
                    Unit Type
                  </label>
                  <input
                    type="text"
                    list="units-list"
                    placeholder="e.g. Packet, Liter, 500ml..."
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2.5 text-sm text-[#1E293B] dark:text-white placeholder-[#64748B] dark:placeholder-[#94A3B8] pos-input-focus shadow-2xs"
                  />
                  <datalist id="units-list">
                    {unitsList.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* GST Rate (%) & Slab Selectors */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#1E293B] dark:text-[#94A3B8] font-label">
                    GST Rate (%)
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {Number(formData.gstRate) === 0
                      ? '0% (Exempt / Fresh Milk)'
                      : `Standard Slab: ${formData.gstRate}%`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={formData.gstRate}
                      onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                      className="w-full bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2.5 text-sm text-[#1E293B] dark:text-white placeholder-[#64748B] dark:placeholder-[#94A3B8] font-mono font-bold pos-input-focus shadow-2xs pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                      %
                    </span>
                  </div>

                  {/* Common GST Slab Quick Buttons */}
                  <div className="flex gap-1">
                    {[0, 5, 12, 18].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setFormData({ ...formData, gstRate: rate })}
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                          Number(formData.gstRate) === rate
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-2xs ring-1 ring-amber-400/40'
                            : 'bg-white dark:bg-[#0A1110] text-slate-600 dark:text-slate-400 border-[#E2E8F0] dark:border-[#1E2E2A] hover:bg-slate-50 dark:hover:bg-[#162220]'
                        }`}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status (Active / Inactive) */}
              <div>
                <label className="block text-xs font-bold text-[#1E293B] dark:text-[#94A3B8] mb-1.5 font-label">
                  Product Availability Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'active' })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                      formData.status === 'active'
                        ? 'status-pill-emerald ring-1 ring-emerald-600'
                        : 'btn-ghost-secondary'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span> Active (In Stock)
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'inactive' })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                      formData.status === 'inactive'
                        ? 'bg-slate-200 dark:bg-[#0A1110] text-[#1E293B] dark:text-white border-[#E2E8F0] dark:border-[#1E2E2A]'
                        : 'btn-ghost-secondary'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                  </button>
                </div>
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
                  className="px-5 py-2 rounded-lg btn-tactile-primary text-xs font-bold cursor-pointer shadow-xs"
                >
                  {editingProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
