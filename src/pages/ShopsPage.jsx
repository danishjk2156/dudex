import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import {
  Store,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  X,
  Phone,
  MapPin,
  User,
  CheckCircle2,
  Receipt,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { animateStaggerEntrance, animateTactilePress } from '../lib/animations';
import { formatCurrency } from '../lib/utils';

export function ShopsPage() {
  const { activePage, shops, addShop, updateShop, deleteShop, bills, settings, getShopOutstandingBalance, showToast, setActivePage, updateCartMeta } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState('All Areas');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [viewingShop, setViewingShop] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const tableBodyRef = useRef(null);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isFormModalOpen) setIsFormModalOpen(false);
        if (viewingShop) setViewingShop(null);
        if (deleteConfirmId) setDeleteConfirmId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormModalOpen, viewingShop, deleteConfirmId]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    owner: '',
    phone: '',
    area: '',
    address: '',
    status: 'ACTIVE',
  });

  // Extract unique areas for the filter dropdown
  const uniqueAreas = useMemo(() => {
    const areas = new Set(shops.map((s) => s.area?.trim()).filter(Boolean));
    return ['All Areas', ...Array.from(areas)];
  }, [shops]);

  // Filtered Shops List
  const filteredShops = useMemo(() => {
    return shops.filter((shop) => {
      const matchSearch =
        shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (shop.owner && shop.owner.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (shop.phone && shop.phone.includes(searchTerm)) ||
        (shop.area && shop.area.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchArea = areaFilter === 'All Areas' || shop.area?.trim().toLowerCase() === areaFilter.toLowerCase();
      const matchStatus = statusFilter === 'All Statuses' || shop.status === statusFilter;

      return matchSearch && matchArea && matchStatus;
    });
  }, [shops, searchTerm, areaFilter, statusFilter]);

  // Stagger animate shop table rows on search, filter, or tab activation
  useEffect(() => {
    if ((activePage === 'shops' || !activePage) && tableBodyRef.current && tableBodyRef.current.children.length > 0) {
      animateStaggerEntrance(tableBodyRef.current.children, {
        y: 10,
        duration: 0.3,
        stagger: 0.025,
      });
    }
  }, [activePage, searchTerm, areaFilter, statusFilter, shops.length]);

  const handleOpenAdd = (e) => {
    if (e) animateTactilePress(e);
    setEditingShop(null);
    setFormData({
      name: '',
      owner: '',
      phone: '',
      area: '',
      address: '',
      status: 'ACTIVE',
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (shop, e) => {
    if (e) {
      e.stopPropagation();
      animateTactilePress(e);
    }
    setEditingShop(shop);
    setFormData({
      name: shop.name || '',
      owner: shop.owner || '',
      phone: shop.phone || '',
      area: shop.area || '',
      address: shop.address || '',
      status: shop.status || 'ACTIVE',
    });
    setIsFormModalOpen(true);
  };

  const handleSaveShop = async (e) => {
    e.preventDefault();
    animateTactilePress(e);

    if (!formData.name.trim()) {
      showToast('Shop Name is required', 'warning');
      return;
    }

    try {
      if (editingShop) {
        await updateShop({
          ...editingShop,
          ...formData,
        });
      } else {
        await addShop(formData);
      }
      setIsFormModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to save shop: ' + err.message, 'error');
    }
  };

  const handleDeleteConfirm = async (id, e) => {
    if (e) animateTactilePress(e);
    try {
      await deleteShop(id);
      setDeleteConfirmId(null);
      if (viewingShop?.id === id) setViewingShop(null);
    } catch (err) {
      showToast('Failed to delete shop: ' + err.message, 'error');
    }
  };

  // Quick action to start billing for this shop
  const handleStartBillingForShop = (shop, e) => {
    if (e) animateTactilePress(e);
    updateCartMeta({
      customerName: `${shop.name}${shop.owner ? ` (${shop.owner})` : ''}`,
      customerPhone: shop.phone || '',
    });
    setViewingShop(null);
    setActivePage('billing');
    showToast(`Billing customer set to "${shop.name}"`, 'success');
  };

  // Shop billing history calculation
  const getShopBills = (shop) => {
    if (!shop) return [];
    return bills.filter(
      (b) =>
        (shop.phone && b.customerPhone === shop.phone) ||
        (b.customerName && b.customerName.toLowerCase().includes(shop.name.toLowerCase()))
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 md:pb-8 animate-page-entrance">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold shadow-xs">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-[#F8FAFC] font-display tracking-tight">
                Shop Management
              </h1>
              <span className="status-pill bg-[#F1F5F9] dark:bg-[#0A1110] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[10px] font-bold">
                {shops.length} OUTLETS
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] font-normal mt-0.5">
              Manage retail outlets and customer history
            </p>
          </div>
        </div>

        {/* Search Bar Top Right */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search shop, brand, date..."
            className="w-full bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-[#1E293B] dark:text-[#F8FAFC] placeholder-[#94A3B8] shadow-2xs pos-input-focus transition-all duration-200"
          />
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-[#111A18] rounded-2xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-sm transition-colors duration-200">
        {/* Card Header & Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0] dark:border-[#1E2E2A]">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#1E293B] dark:text-[#F8FAFC] font-display">
              Outlet Directory
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] font-normal mt-0.5">
              Maintain details, contact info, and delivery histories of retail stores.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl btn-tactile-primary font-semibold text-xs sm:text-sm shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Shop</span>
          </button>
        </div>

        {/* Filters Row (Search, Area Filter, Status) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 py-4">
          <div className="sm:col-span-6">
            <label className="block text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, owner, area..."
                className="w-full bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#1E293B] dark:text-[#F8FAFC] placeholder-[#94A3B8] shadow-2xs pos-input-focus transition-all duration-200"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F8FAFC] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">
              Area Filter
            </label>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1E293B] dark:text-[#F8FAFC] shadow-2xs pos-input-focus cursor-pointer transition-all duration-200"
            >
              {uniqueAreas.map((area) => (
                <option key={area} value={area} className="bg-white dark:bg-[#0A1110] text-[#1E293B] dark:text-[#F8FAFC]">
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1E293B] dark:text-[#F8FAFC] shadow-2xs pos-input-focus cursor-pointer transition-all duration-200"
            >
              <option value="All Statuses" className="bg-white dark:bg-[#0A1110] text-[#1E293B] dark:text-[#F8FAFC]">All Statuses</option>
              <option value="ACTIVE" className="bg-white dark:bg-[#0A1110] text-[#1E293B] dark:text-[#F8FAFC]">ACTIVE</option>
              <option value="INACTIVE" className="bg-white dark:bg-[#0A1110] text-[#1E293B] dark:text-[#F8FAFC]">INACTIVE</option>
            </select>
          </div>
        </div>

        {/* Desktop Table of Shops (Tablet / Desktop: sm and up) */}
        <div className="hidden sm:block overflow-x-auto rounded-xl border border-[#E2E8F0] dark:border-[#1E2E2A] mt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] dark:bg-[#0A1110] border-b border-[#E2E8F0] dark:border-[#1E2E2A] text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">SHOP NAME</th>
                <th className="py-3 px-4">OWNER</th>
                <th className="py-3 px-4">PHONE</th>
                <th className="py-3 px-4">AREA</th>
                <th className="py-3 px-4 text-right">BALANCE DUE</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody ref={tableBodyRef} className="divide-y divide-[#E2E8F0] dark:divide-[#1E2E2A] text-xs sm:text-sm transition-opacity duration-200">
              {filteredShops.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#64748B] dark:text-[#94A3B8] animate-fade-in">
                    <Store className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#64748B]" />
                    <p className="font-semibold text-[#1E293B] dark:text-[#F8FAFC]">No shops found matching filter</p>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">Try clearing filters or click "+ Add Shop"</p>
                  </td>
                </tr>
              ) : (
                filteredShops.map((shop, idx) => (
                  <tr
                    key={shop.id}
                    style={{ animationDelay: `${idx * 30}ms` }}
                    className="hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A] transition-colors duration-200 group cursor-default animate-row-in"
                  >
                    {/* Shop Name */}
                    <td className="py-3.5 px-4 sm:px-6 font-semibold">
                      <button
                        onClick={() => setViewingShop(shop)}
                        className="text-slate-800 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200 font-bold hover:underline text-left cursor-pointer transition-colors duration-200 font-display"
                      >
                        {shop.name}
                      </button>
                    </td>

                    {/* Owner */}
                    <td className="py-3.5 px-4 text-[#1E293B] dark:text-[#F8FAFC]">
                      {shop.owner || '—'}
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 font-mono font-medium text-[#1E293B] dark:text-[#F8FAFC]">
                      {shop.phone || '—'}
                    </td>

                    {/* Area */}
                    <td className="py-3.5 px-4 text-[#64748B] dark:text-[#94A3B8]">
                      {shop.area || '—'}
                    </td>

                    {/* Outstanding Due */}
                    <td className="py-3.5 px-4 text-right">
                      {(() => {
                        const bal = getShopOutstandingBalance(shop.id);
                        return bal > 0 ? (
                          <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                            {formatCurrency(bal, settings.currency)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                            {formatCurrency(0, settings.currency)}
                          </span>
                        );
                      })()}
                    </td>

                    {/* Status Pill */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold tracking-wider uppercase transition-transform duration-150 hover:scale-105 select-none ${
                          shop.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-[#16A34A] dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {shop.status || 'ACTIVE'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Button (Eye) */}
                        <button
                          type="button"
                          onClick={() => setViewingShop(shop)}
                          title="View Shop Details & History"
                          className="p-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#64748B] dark:text-[#94A3B8] hover:text-emerald-700 dark:hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-50/50 dark:hover:bg-[#162220] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Button (Pencil) */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(shop, e)}
                          title="Edit Shop"
                          className="p-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#64748B] dark:text-[#94A3B8] hover:text-emerald-700 dark:hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-50/50 dark:hover:bg-[#162220] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete Button (Red Trash) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(shop.id);
                          }}
                          title="Delete Shop"
                          className="p-1.5 rounded-lg bg-[#DC2626] hover:bg-red-700 text-white shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards List (phone screens < 640px) */}
        <div className="sm:hidden space-y-2.5 mt-2">
          {filteredShops.length === 0 ? (
            <div className="py-12 text-center text-[#64748B] dark:text-[#94A3B8]">
              <Store className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#64748B]" />
              <p className="font-semibold text-[#1E293B] dark:text-[#F8FAFC]">No shops found matching filter</p>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">Try clearing filters or click "+ Add Shop"</p>
            </div>
          ) : (
            filteredShops.map((shop) => {
              const bal = getShopOutstandingBalance(shop.id);
              return (
                <div
                  key={shop.id}
                  className="bg-slate-50/70 dark:bg-[#111A18] rounded-xl p-3 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-2xs space-y-2"
                >
                  {/* Top row: Name & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => setViewingShop(shop)}
                      className="text-sm font-display font-bold text-[#1E3A5F] dark:text-[#60A5FA] text-left hover:underline cursor-pointer leading-tight"
                    >
                      {shop.name}
                    </button>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                        shop.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40'
                          : 'bg-slate-100 text-slate-600 dark:bg-[#0A1110] dark:text-slate-400 border border-slate-200 dark:border-[#1E2E2A]'
                      }`}
                    >
                      {shop.status || 'ACTIVE'}
                    </span>
                  </div>

                  {/* Details: Owner, Area & Phone */}
                  <div className="grid grid-cols-2 gap-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                    {shop.owner && (
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                        <span className="truncate">{shop.owner}</span>
                      </div>
                    )}
                    {shop.area && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                        <span className="truncate">{shop.area}</span>
                      </div>
                    )}
                    {shop.phone && (
                      <div className="col-span-2 flex items-center gap-1.5 pt-0.5 font-mono">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <a href={`tel:${shop.phone}`} className="hover:underline text-[#1E293B] dark:text-[#F8FAFC]">
                          {shop.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Balance & Actions Row */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E2E2A]">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-[#64748B] dark:text-[#94A3B8] block">
                        Balance Due
                      </span>
                      {bal > 0 ? (
                        <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                          {formatCurrency(bal, settings.currency)}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                          {formatCurrency(0, settings.currency)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleStartBillingForShop(shop, e)}
                        className="px-2.5 py-1 rounded-lg btn-tactile-primary text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Create Bill"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Bill</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewingShop(shop)}
                        className="p-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E3A5F] dark:hover:text-[#60A5FA] cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(shop, e)}
                        className="p-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E3A5F] dark:hover:text-[#60A5FA] cursor-pointer"
                        title="Edit Shop"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(shop.id);
                        }}
                        className="p-1.5 rounded-lg bg-[#DC2626] hover:bg-red-700 text-white cursor-pointer"
                        title="Delete Shop"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit Shop Modal */}
      {isFormModalOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-fade-in"
          >
            <div className="relative w-full max-w-lg bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-2xl shadow-2xl p-5 sm:p-6 my-auto transition-colors animate-modal-pop">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E2E2A] mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold border border-emerald-200 dark:border-emerald-800/40 shadow-xs">
                    <Store className="w-4 h-4" />
                  </div>
                  <h3 id="form-modal-title" className="font-display font-bold text-base sm:text-lg text-[#1E293B] dark:text-[#F8FAFC]">
                    {editingShop ? 'Edit Shop Details' : 'Add New Retail Shop'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsFormModalOpen(false)}
                  className="text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#162220] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveShop} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">
                      Shop / Store Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. ABC Stores"
                      className="w-full bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2 text-sm text-[#1E293B] dark:text-[#F8FAFC] placeholder-[#94A3B8] shadow-2xs pos-input-focus font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">
                      Owner / Contact Person
                    </label>
                    <input
                      type="text"
                      value={formData.owner}
                      onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                      placeholder="e.g. Kumar"
                      className="w-full bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2 text-sm text-[#1E293B] dark:text-[#F8FAFC] placeholder-[#94A3B8] shadow-2xs pos-input-focus"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">
                      Phone / Mobile
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. 9840123456"
                      className="w-full bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2 text-sm text-[#1E293B] dark:text-[#F8FAFC] placeholder-[#94A3B8] font-mono shadow-2xs pos-input-focus"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">
                      Area / Locality
                    </label>
                    <input
                      type="text"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      placeholder="e.g. Solan Nagar"
                      className="w-full bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2 text-sm text-[#1E293B] dark:text-[#F8FAFC] placeholder-[#94A3B8] shadow-2xs pos-input-focus"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">
                    Full Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. 12, Main Road, Solan Nagar"
                    className="w-full bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2 text-sm text-[#1E293B] dark:text-[#F8FAFC] placeholder-[#94A3B8] shadow-2xs pos-input-focus"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl px-3.5 py-2 text-sm text-[#1E293B] dark:text-[#F8FAFC] shadow-2xs pos-input-focus cursor-pointer font-bold"
                  >
                    <option value="ACTIVE" className="bg-white dark:bg-[#0A1110] text-[#1E293B] dark:text-[#F8FAFC]">ACTIVE</option>
                    <option value="INACTIVE" className="bg-white dark:bg-[#0A1110] text-[#1E293B] dark:text-[#F8FAFC]">INACTIVE</option>
                  </select>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E2E8F0] dark:border-[#1E2E2A]">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="px-4 py-2 rounded-xl btn-ghost-secondary text-xs sm:text-sm font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl btn-tactile-primary text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
                  >
                    {editingShop ? 'Save Changes' : 'Create Shop'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* View Shop Details Modal */}
      {viewingShop &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-fade-in"
          >
            <div className="relative w-full max-w-lg bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-2xl shadow-2xl p-5 sm:p-6 my-auto transition-colors animate-modal-pop">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E2E2A]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold border border-emerald-200 dark:border-emerald-800/40">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 id="view-modal-title" className="font-display font-bold text-lg text-[#1E293B] dark:text-[#F8FAFC] leading-tight">
                      {viewingShop.name}
                    </h3>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Retail Outlet Profile</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingShop(null)}
                  className="text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#162220] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-4">
                {/* Key Meta Grid */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-xs">
                  <div>
                    <span className="text-[#64748B] dark:text-[#94A3B8] block">Owner / Contact</span>
                    <span className="font-bold text-[#1E293B] dark:text-[#F8FAFC] mt-0.5 block">
                      {viewingShop.owner || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] dark:text-[#94A3B8] block">Phone Number</span>
                    <span className="font-mono font-bold text-[#1E293B] dark:text-[#F8FAFC] mt-0.5 block">
                      {viewingShop.phone || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] dark:text-[#94A3B8] block">Area / Locality</span>
                    <span className="font-semibold text-[#1E293B] dark:text-[#F8FAFC] mt-0.5 block">
                      {viewingShop.area || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] dark:text-[#94A3B8] block">Status</span>
                    <span
                      className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        viewingShop.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-700 dark:bg-[#0A1110] dark:text-slate-400 border border-slate-200 dark:border-[#1E2E2A]'
                      }`}
                    >
                      {viewingShop.status || 'ACTIVE'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] dark:text-[#94A3B8] block">Outstanding Balance Due</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5 block text-sm">
                      {formatCurrency(getShopOutstandingBalance(viewingShop.id), settings.currency)}
                    </span>
                  </div>
                  {viewingShop.address && (
                    <div className="col-span-2 pt-1 border-t border-[#E2E8F0] dark:border-[#1E2E2A]">
                      <span className="text-[#64748B] dark:text-[#94A3B8] block">Full Address</span>
                      <span className="text-[#1E293B] dark:text-[#F8FAFC] mt-0.5 block">
                        {viewingShop.address}
                      </span>
                    </div>
                  )}
                </div>

                {/* Purchase History for this Shop */}
                <div>
                  <h4 className="text-xs font-bold text-[#1E3A5F] dark:text-[#60A5FA] uppercase tracking-wider mb-2">
                    Recent Bills / Deliveries
                  </h4>
                  {(() => {
                    const shopBills = getShopBills(viewingShop);
                    if (shopBills.length === 0) {
                      return (
                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] italic py-2">
                          No recorded bills for this shop yet.
                        </p>
                      );
                    }
                    return (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {shopBills.slice(0, 5).map((b) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-xs"
                          >
                            <div>
                              <span className="font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                                Bill #{b.billNumber}
                              </span>
                              <span className="text-[#64748B] dark:text-[#94A3B8] ml-2">{b.date}</span>
                              {b.paymentStatus && (
                                <span className="ml-2 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#111A18] text-slate-600 dark:text-slate-300">
                                  {b.paymentStatus}
                                </span>
                              )}
                            </div>
                            <span className="font-mono font-bold text-emerald-600 dark:text-[#4ADE80]">
                              {formatCurrency(b.finalAmount || b.totalAmount, settings.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E2E2A] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => handleOpenEdit(viewingShop, e)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl btn-ghost-secondary text-xs font-bold cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Shop</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleStartBillingForShop(viewingShop, e)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl btn-tactile-primary text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
                >
                  <span>New Bill for this Shop</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (() => {
        const shopToDelete = shops.find((s) => s.id === deleteConfirmId);
        return createPortal(
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
          >
            <div className="relative w-full max-w-sm bg-white dark:bg-[#111A18] border border-rose-200 dark:border-rose-900/60 rounded-2xl shadow-2xl p-5 text-center transition-colors animate-modal-pop">
              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 id="delete-dialog-title" className="font-display font-bold text-base text-[#1E293B] dark:text-[#F8FAFC]">
                Delete "{shopToDelete?.name || 'this Shop'}"?
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 mb-5">
                {shopToDelete?.area ? `Located in ${shopToDelete.area}. ` : ''}This action will remove the outlet from active records. Past generated bills remain safely archived.
              </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl btn-ghost-secondary text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={(e) => handleDeleteConfirm(deleteConfirmId, e)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
        );
      })()}
    </div>
  );
}
