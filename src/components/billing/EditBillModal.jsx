import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import {
  X,
  Receipt,
  Calendar,
  User,
  Store,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Clock,
  Coins,
  AlertCircle,
  Package,
  ArrowRight,
  Phone,
} from 'lucide-react';
import { formatCurrency, formatDate, calculateBillSummary, generateId } from '../../lib/utils';
import { animateTactilePress } from '../../lib/animations';

export function EditBillModal({ bill, isOpen, onClose, onSave }) {
  const { shops, companies, products, settings, showToast } = useApp();

  const [date, setDate] = useState('');
  const [shopMode, setShopMode] = useState('registered'); // 'registered' | 'custom'
  const [selectedShopId, setSelectedShopId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState([]);
  const [previousDue, setPreviousDue] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [paidAmount, setPaidAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New item add state
  const [newBrandId, setNewBrandId] = useState('');
  const [newProductId, setNewProductId] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);

  // Reset or populate state when modal opens or bill changes
  useEffect(() => {
    if (bill && isOpen) {
      // Date Raw or formatted
      let dateVal = '';
      if (bill.dateRaw) {
        dateVal = bill.dateRaw;
      } else if (bill.createdAt) {
        dateVal = bill.createdAt.slice(0, 10);
      } else {
        dateVal = new Date().toISOString().slice(0, 10);
      }
      setDate(dateVal);

      if (bill.shopId && bill.shopId !== 'walkin') {
        setShopMode('registered');
        setSelectedShopId(bill.shopId);
        setCustomerName(bill.customerName || '');
        setCustomerPhone(bill.customerPhone || '');
      } else {
        setShopMode(bill.shopId === 'walkin' || !bill.shopId ? 'custom' : 'registered');
        setSelectedShopId(bill.shopId || '');
        setCustomerName(bill.customerName || '');
        setCustomerPhone(bill.customerPhone || '');
      }

      setItems(
        (bill.items || []).map((item) => ({
          id: item.id || generateId(),
          productId: item.productId || '',
          companyId: item.companyId || item.brandId || '',
          name: item.name || item.productName || 'Item',
          rate: Number(item.rate) || Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          unit: item.unit || 'Packet',
          total: (Number(item.rate) || Number(item.price) || 0) * (Number(item.quantity) || 1),
        }))
      );

      setPreviousDue(Number(bill.previousDue) || 0);
      setPaymentStatus(bill.paymentStatus || 'PAID');
      setPaidAmount(bill.paidAmount !== undefined ? Number(bill.paidAmount) : Number(bill.finalAmount || 0));

      // Reset new item pickers
      setNewBrandId(companies[0]?.id || '');
      setNewProductId('');
      setNewPrice('');
      setNewQuantity(1);
    }
  }, [bill, isOpen, companies]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Products filtered by selected brand in add item section
  const filteredAvailableProducts = useMemo(() => {
    if (!newBrandId) return products;
    return products.filter((p) => p.companyId === newBrandId);
  }, [products, newBrandId]);

  // When new brand changes, reset product selection
  useEffect(() => {
    if (filteredAvailableProducts.length > 0) {
      const first = filteredAvailableProducts[0];
      setNewProductId(first.id);
      setNewPrice(first.rate || 0);
    } else {
      setNewProductId('');
      setNewPrice('');
    }
  }, [newBrandId, filteredAvailableProducts]);

  // When product selection changes, set default price
  const handleProductSelectChange = (pId) => {
    setNewProductId(pId);
    const prod = products.find((p) => p.id === pId);
    if (prod) {
      setNewPrice(prod.rate || 0);
    }
  };

  // Add Item to table
  const handleAddItem = (e) => {
    if (e) animateTactilePress(e);
    if (!newProductId) {
      showToast('Please select a product to add', 'warning');
      return;
    }

    const prod = products.find((p) => p.id === newProductId);
    if (!prod) return;

    const rate = Number(newPrice) >= 0 ? Number(newPrice) : Number(prod.rate) || 0;
    const qty = Math.max(1, parseInt(newQuantity, 10) || 1);

    // Check if already in items
    const existingIndex = items.findIndex((i) => i.productId === prod.id);
    if (existingIndex > -1) {
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === existingIndex
            ? {
                ...it,
                rate,
                quantity: it.quantity + qty,
                total: rate * (it.quantity + qty),
              }
            : it
        )
      );
      showToast(`Updated quantity for ${prod.name}`, 'info');
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: generateId(),
          productId: prod.id,
          companyId: prod.companyId || newBrandId,
          name: prod.name,
          rate,
          quantity: qty,
          unit: prod.unit || 'Packet',
          gstRate: prod.gstRate !== undefined ? Number(prod.gstRate) : 0,
          total: rate * qty,
        },
      ]);
      showToast(`Added ${prod.name} to bill`, 'success');
    }

    setNewQuantity(1);
  };

  // Remove Item
  const handleRemoveItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Update item row
  const handleItemChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === 'quantity') {
          const qty = value === '' ? '' : Math.max(1, parseInt(value, 10) || 1);
          const total = (Number(item.rate) || 0) * (Number(qty) || 0);
          return { ...item, quantity: qty, total };
        }
        if (field === 'rate') {
          const rate = value === '' ? '' : Math.max(0, Number(value));
          const total = (Number(rate) || 0) * (Number(item.quantity) || 0);
          return { ...item, rate, total };
        }
        if (field === 'gstRate') {
          return { ...item, gstRate: value === '' ? '' : Math.max(0, Number(value)) };
        }
        return { ...item, [field]: value };
      })
    );
  };

  // Recalculate bill financial summary with item-level GST
  const summary = useMemo(() => {
    return calculateBillSummary(items);
  }, [items]);

  const currentAmount = summary.finalAmount;
  const netTotalPayable = Math.round((currentAmount + Number(previousDue || 0)) * 100) / 100;

  // Derive calculated unpaid amount
  const unpaidAmount = useMemo(() => {
    if (paymentStatus === 'PAID') return 0;
    if (paymentStatus === 'UNPAID') return netTotalPayable;
    const paid = Math.max(0, Number(paidAmount) || 0);
    return Math.max(0, Math.round((netTotalPayable - paid) * 100) / 100);
  }, [paymentStatus, paidAmount, netTotalPayable]);

  // Handle Payment Status change
  const handleStatusChange = (status) => {
    setPaymentStatus(status);
    if (status === 'PAID') {
      setPaidAmount(netTotalPayable);
    } else if (status === 'UNPAID') {
      setPaidAmount(0);
    } else if (status === 'PARTIAL') {
      if (paidAmount === 0 || paidAmount >= netTotalPayable) {
        setPaidAmount(Math.round(netTotalPayable / 2));
      }
    }
  };

  // Save changes
  const handleSave = async (e) => {
    if (e) animateTactilePress(e);

    if (items.length === 0) {
      showToast('Bill must contain at least one item', 'warning');
      return;
    }

    // Verify valid items
    const invalidItem = items.find((i) => !i.quantity || Number(i.quantity) <= 0);
    if (invalidItem) {
      showToast('All items must have a quantity of at least 1', 'warning');
      return;
    }

    let finalShopId = '';
    let finalCustomerName = '';
    let finalCustomerPhone = '';

    if (shopMode === 'registered') {
      finalShopId = selectedShopId || '';
      const chosenShop = shops.find((s) => s.id === selectedShopId);
      finalCustomerName = chosenShop
        ? `${chosenShop.name}${chosenShop.area ? ` (${chosenShop.area})` : ''}`
        : customerName || 'Retail Customer';
      finalCustomerPhone = chosenShop ? chosenShop.phone || '' : customerPhone;
    } else {
      finalShopId = 'walkin';
      finalCustomerName = customerName.trim() || 'Walk-in Retail Customer';
      finalCustomerPhone = customerPhone.trim();
    }

    setIsSubmitting(true);
    try {
      const updatedData = {
        ...bill,
        shopId: finalShopId,
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
        dateRaw: date,
        date: formatDate(date),
        items,
        previousDue: Number(previousDue) || 0,
        paymentStatus,
        paidAmount: paymentStatus === 'PAID' ? netTotalPayable : paymentStatus === 'UNPAID' ? 0 : Number(paidAmount) || 0,
        unpaidAmount,
      };

      await onSave(updatedData);
      onClose();
    } catch (err) {
      console.error('Update bill error:', err);
      showToast('Failed to update bill: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !bill) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-modal-pop">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.35)] my-auto flex flex-col transition-colors max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Pinned at top */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0] dark:border-[#1E2E2A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center shadow-2xs">
              <Receipt className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base sm:text-lg text-[#1E293B] dark:text-white">
                  Update Bill Record
                </h3>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                  #{bill.billNumber}
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Modify items, customer information, rates, or payment details.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162220] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-4 text-xs">
          {/* Row 1: Date & Customer Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Bill Date */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1">
                Bill Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] dark:text-[#94A3B8] pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-[#1E293B] dark:text-white pos-input-focus"
                />
              </div>
            </div>

            {/* Shop Mode Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1">
                Customer Type
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-[#0A1110] rounded-xl border border-[#E2E8F0] dark:border-[#1E2E2A]">
                <button
                  type="button"
                  onClick={() => setShopMode('registered')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    shopMode === 'registered'
                      ? 'bg-white dark:bg-[#111A18] text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  Registered Shop
                </button>
                <button
                  type="button"
                  onClick={() => setShopMode('custom')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    shopMode === 'custom'
                      ? 'bg-white dark:bg-[#111A18] text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  Custom / Retail
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Customer Details based on Mode */}
          {shopMode === 'registered' ? (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1">
                Select Shop
              </label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] dark:text-[#94A3B8] pointer-events-none" />
                <select
                  value={selectedShopId}
                  onChange={(e) => {
                    setSelectedShopId(e.target.value);
                    const s = shops.find((shop) => shop.id === e.target.value);
                    if (s) {
                      setCustomerName(`${s.name}${s.area ? ` (${s.area})` : ''}`);
                      setCustomerPhone(s.phone || '');
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-[#1E293B] dark:text-white pos-input-focus"
                >
                  <option value="">-- Choose Registered Shop --</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.area ? `(${s.area})` : ''} - {s.phone || 'No phone'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1">
                  Customer / Business Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] dark:text-[#94A3B8] pointer-events-none" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name..."
                    className="w-full bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-[#1E293B] dark:text-white pos-input-focus"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1">
                  Customer Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] dark:text-[#94A3B8] pointer-events-none" />
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="10-digit phone number"
                    className="w-full bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-[#1E293B] dark:text-white pos-input-focus font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section: Items Table */}
          <div className="border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl overflow-hidden">
            <div className="bg-slate-50 dark:bg-[#0A1110] px-3.5 py-2 border-b border-[#E2E8F0] dark:border-[#1E2E2A] flex items-center justify-between">
              <span className="font-bold text-xs text-[#1E293B] dark:text-white flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                Bill Line Items ({items.length})
              </span>
              <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Total Units: {summary.totalQty}
              </span>
            </div>

            <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E2E2A] max-h-56 overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">
                  No items in this bill. Use the selector below to add items.
                </div>
              ) : (
                items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-2.5 sm:px-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60 dark:hover:bg-[#162220] transition-colors"
                  >
                    {/* Item Name */}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#1E293B] dark:text-white truncate">
                        {item.name}
                      </p>
                      <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                        {item.unit || 'Unit'}
                      </span>
                    </div>

                    {/* Controls Row (Full width on mobile, inline on desktop) */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      {/* Rate Input */}
                      <div className="w-20 shrink-0">
                        <label className="type-caption text-slate-500 dark:text-slate-400 block">Rate (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={item.rate}
                          onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                          className="w-full bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-md px-1.5 py-1 text-xs font-mono tabular-nums text-right text-[#0F172A] dark:text-white focus:outline-none focus:border-[#D97706]"
                        />
                      </div>

                      {/* GST % Input */}
                      <div className="w-14 shrink-0">
                        <label className="type-caption text-slate-500 dark:text-slate-400 block">GST %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={item.gstRate !== undefined ? item.gstRate : 0}
                          onChange={(e) => handleItemChange(item.id, 'gstRate', e.target.value)}
                          className="w-full bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-md px-1 py-1 text-xs font-mono tabular-nums text-center text-[#0F172A] dark:text-white focus:outline-none focus:border-[#D97706]"
                        />
                      </div>

                      {/* Quantity Input with Stepper */}
                      <div className="w-20 shrink-0">
                        <label className="type-caption text-slate-500 dark:text-slate-400 block">Qty</label>
                        <div className="flex items-center border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-md overflow-hidden bg-white dark:bg-[#111A18]">
                          <button
                            type="button"
                            onClick={() => handleItemChange(item.id, 'quantity', Math.max(1, (Number(item.quantity) || 1) - 1))}
                            className="px-1.5 py-1 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162220] cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                            className="w-full text-center text-xs font-bold font-mono tabular-nums text-[#0F172A] dark:text-white border-0 p-0 focus:ring-0"
                          />
                          <button
                            type="button"
                            onClick={() => handleItemChange(item.id, 'quantity', (Number(item.quantity) || 0) + 1)}
                            className="px-1.5 py-1 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162220] cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Row Total */}
                      <div className="w-18 sm:w-20 shrink-0 text-right">
                        <label className="type-caption text-slate-500 dark:text-slate-400 block">Total</label>
                        <span className="font-mono tabular-nums font-bold text-xs text-amber-600 dark:text-amber-400">
                          {formatCurrency(item.total, settings.currency)}
                        </span>
                      </div>

                      {/* Remove Action */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer self-end mb-0.5 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Add Product Bar */}
            <div className="p-2.5 bg-slate-50 dark:bg-[#0A1110] border-t border-[#E2E8F0] dark:border-[#1E2E2A] flex flex-wrap items-center gap-2">
              <select
                value={newBrandId}
                onChange={(e) => setNewBrandId(e.target.value)}
                className="bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-lg px-2 py-1.5 text-xs text-[#0F172A] dark:text-white flex-1 sm:flex-none min-w-[100px] focus:outline-none focus:border-[#D97706]"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={newProductId}
                onChange={(e) => handleProductSelectChange(e.target.value)}
                className="bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-lg px-2 py-1.5 text-xs text-[#0F172A] dark:text-white flex-1 sm:flex-1 min-w-[140px] focus:outline-none focus:border-[#D97706]"
              >
                <option value="">-- Select Product --</option>
                {filteredAvailableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatCurrency(p.rate, settings.currency)})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  className="w-16 bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-lg px-2 py-1.5 text-xs text-center font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#D97706]"
                />

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="btn-primary-action px-3 py-1.5 rounded-lg text-white font-semibold text-xs flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section: Financial Summary & Previous Due */}
          <div className="bg-slate-50 dark:bg-[#0A1110] rounded-xl p-3 border border-[#E2E8F0] dark:border-[#1E2E2A] space-y-1.5">
            <div className="flex justify-between items-center text-[#64748B] dark:text-[#94A3B8] text-xs">
              <span>Items Subtotal:</span>
              <span className="font-mono tabular-nums font-medium text-[#0F172A] dark:text-white">
                {formatCurrency(summary.subTotal, settings.currency)}
              </span>
            </div>

            <div className="flex justify-between items-center text-[#64748B] dark:text-[#94A3B8] text-xs">
              <span>GST {summary.isUniformRate && summary.gstRate !== null ? `(${summary.gstRate}%)` : summary.gstAmount > 0 ? '(Multi-rate)' : '(0%)'}:</span>
              <span className="font-mono tabular-nums font-medium text-[#0F172A] dark:text-white">
                +{formatCurrency(summary.gstAmount, settings.currency)}
              </span>
            </div>
            {summary.gstAmount > 0 && (
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 text-[11px] pl-2">
                <span>• CGST: {formatCurrency(summary.cgstAmount, settings.currency)} | SGST: {formatCurrency(summary.sgstAmount, settings.currency)}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-[#64748B] dark:text-[#94A3B8] text-xs">
              <span>Bill Items Total:</span>
              <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-white">
                {formatCurrency(currentAmount, settings.currency)}
              </span>
            </div>

            {/* Previous Due Input */}
            <div className="flex justify-between items-center pt-1 border-t border-[#E2E8F0] dark:border-[#1E2E2A] text-xs">
              <span className="text-amber-700 dark:text-amber-400 font-medium">Previous Balance Due:</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-[#64748B]">{settings.currency}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={previousDue}
                  onChange={(e) => setPreviousDue(Math.max(0, Number(e.target.value)))}
                  className="w-20 bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-md px-2 py-0.5 text-xs text-right font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#D97706]"
                />
              </div>
            </div>

            {/* Net Total Payable */}
            <div className="flex justify-between items-center pt-1.5 border-t border-[#E2E8F0] dark:border-[#1E2E2A] font-bold text-sm">
              <span className="text-[#0F172A] dark:text-white">Net Total Payable:</span>
              <span className="font-mono tabular-nums font-black text-base text-amber-600 dark:text-amber-400">
                {formatCurrency(netTotalPayable, settings.currency)}
              </span>
            </div>
          </div>

          {/* Section: Payment Reconciliation */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
              Payment Status & Reconciliation
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange('PAID')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  paymentStatus === 'PAID'
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                    : 'bg-white dark:bg-[#111A18] text-[#64748B] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#1E2E2A] hover:border-emerald-500'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Fully Paid</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('PARTIAL')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  paymentStatus === 'PARTIAL'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white dark:bg-[#111A18] text-[#64748B] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#1E2E2A] hover:border-amber-500'
                }`}
              >
                <Coins className="w-4 h-4" />
                <span>Partial Paid</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('UNPAID')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  paymentStatus === 'UNPAID'
                    ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                    : 'bg-white dark:bg-[#111A18] text-[#64748B] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#1E2E2A] hover:border-rose-500'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Unpaid (Credit)</span>
              </button>
            </div>

            {/* Paid Amount Input if Partial */}
            {paymentStatus === 'PARTIAL' && (
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#0F172A] dark:text-white">Amount Paid Now:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono tabular-nums text-xs text-slate-500">{settings.currency}</span>
                    <input
                      type="number"
                      min="0"
                      max={netTotalPayable}
                      step="1"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value)))}
                      className="w-28 bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-md px-2 py-1 text-xs text-right font-mono tabular-nums font-bold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#D97706]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-bold">
                  <span>Remaining Unpaid Balance:</span>
                  <span className="font-mono tabular-nums">{formatCurrency(unpaidAmount, settings.currency)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions - Pinned at bottom */}
        <div className="px-5 py-3 border-t border-[#E2E8F0] dark:border-[#1E2E2A] bg-slate-50/50 dark:bg-[#111A18] flex items-center justify-end gap-2.5 shrink-0 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-secondary-action px-4 py-2 text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="btn-primary-action px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-white" />
            <span>{isSubmitting ? 'Updating Bill...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
