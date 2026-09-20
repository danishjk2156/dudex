import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  Store,
  Package,
  Plus,
  Trash2,
  Printer,
  Clock,
  ShoppingCart,
  ChevronRight,
  Receipt,
  AlertCircle,
  Save,
} from 'lucide-react';
import { formatCurrency, formatDate, generateId } from '../lib/utils';
import { animateTactilePress } from '../lib/animations';
import { PaymentModal } from '../components/billing/PaymentModal';

const getTodayDateInput = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function BillingPage() {
  const {
    shops,
    companies,
    products,
    bills,
    settings,
    createDeliveryBill,
    getShopOutstandingBalance,
    setGeneratedBill,
    showToast,
    dailyDraft,
    setDailyDraft,
    clearDailyDraft,
  } = useApp();

  const [activeView, setActiveView] = useState('billing'); // 'billing' | 'today_bills'
  const customCustomerName = dailyDraft?.customCustomerName || '';
  const setCustomCustomerName = (val) => setDailyDraft({ customCustomerName: val });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLogFilterDate] = useState('ALL');
  const [logSearch, setLogSearch] = useState('');
  const [paymentModalConfig, setPaymentModalConfig] = useState({
    isOpen: false,
    mode: 'print',
  });

  // Form State backed directly by AppContext dailyDraft
  const deliveryDate = dailyDraft?.deliveryDate || getTodayDateInput();
  const selectedShopId = dailyDraft?.selectedShopId || '';
  const rawRows =
    dailyDraft?.productRows && dailyDraft.productRows.length > 0
      ? dailyDraft.productRows
      : [
          {
            id: 'row-1',
            brandId: '',
            productId: '',
            productName: '',
            price: 0,
            quantity: 1,
            unit: '—',
            gstRate: 0,
          },
        ];

  const productRows = useMemo(() => {
    return rawRows.map((row) => {
      if (row.gstRate === undefined && row.productId) {
        const prod = products.find((p) => p.id === row.productId);
        return {
          ...row,
          gstRate: prod?.gstRate !== undefined ? Number(prod.gstRate) : 0,
        };
      }
      return {
        ...row,
        gstRate: row.gstRate !== undefined ? row.gstRate : 0,
      };
    });
  }, [rawRows, products]);

  const setDeliveryDate = (val) => setDailyDraft({ deliveryDate: val });
  const setSelectedShopId = (val) => setDailyDraft({ selectedShopId: val });
  const setProductRows = (updater) => {
    const nextRows = typeof updater === 'function' ? updater(productRows) : updater;
    setDailyDraft({ productRows: nextRows });
  };

  // Selected shop object
  const currentShop = useMemo(() => {
    return shops.find((s) => s.id === selectedShopId) || null;
  }, [shops, selectedShopId]);

  // Previous balance due for the selected shop
  const previousDue = useMemo(() => {
    return selectedShopId ? getShopOutstandingBalance(selectedShopId) : 0;
  }, [getShopOutstandingBalance, selectedShopId]);

  // Companies Map for fast lookup
  const companyMap = useMemo(() => {
    const map = {};
    companies.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [companies]);

  // Table Row Operations
  const handleAddRow = (e) => {
    if (e) animateTactilePress(e);
    setProductRows((prev) => [
      ...prev,
      {
        id: generateId(),
        brandId: '',
        productId: '',
        productName: '',
        price: 0,
        quantity: 1,
        unit: '—',
        gstRate: 0,
      },
    ]);
  };

  const handleRemoveRow = (rowId) => {
    setProductRows((prev) => {
      const remaining = prev.filter((r) => r.id !== rowId);
      return remaining.length > 0
        ? remaining
        : [
            {
              id: generateId(),
              brandId: '',
              productId: '',
              productName: '',
              price: 0,
              quantity: 1,
              unit: '—',
              gstRate: 0,
            },
          ];
    });
  };

  const handleRowChange = (rowId, field, value) => {
    setProductRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        if (field === 'brandId') {
          return {
            ...row,
            brandId: value,
            productId: '',
            productName: '',
            price: 0,
            unit: '—',
            gstRate: 0,
          };
        }
        if (field === 'productId') {
          const prod = products.find((p) => p.id === value);
          if (prod) {
            return {
              ...row,
              productId: prod.id,
              productName: prod.name,
              brandId: prod.companyId || row.brandId,
              price: Number(prod.rate) || 0,
              unit: prod.unit || 'Packet',
              gstRate: prod.gstRate !== undefined ? Number(prod.gstRate) : 0,
            };
          }
        }
        if (field === 'price') {
          return { ...row, price: value === '' ? '' : Math.max(0, Number(value)) };
        }
        if (field === 'quantity') {
          return { ...row, quantity: value === '' ? '' : Math.max(1, parseInt(value, 10) || 1) };
        }
        if (field === 'gstRate') {
          return { ...row, gstRate: value === '' ? '' : Math.max(0, Number(value)) };
        }
        return { ...row, [field]: value };
      })
    );
  };

  // Item-level Calculations
  const { totalQuantity, subTotal, gstAmount, cgstAmount, sgstAmount, grandTotal, gstRatesList } = useMemo(() => {
    let qty = 0;
    let itemsSum = 0;
    let taxSum = 0;
    const ratesSet = new Set();

    productRows.forEach((row) => {
      if (row.productId) {
        const q = Number(row.quantity) || 0;
        const p = Number(row.price) || 0;
        const itemGst =
          row.gstRate !== undefined && row.gstRate !== '' && !isNaN(Number(row.gstRate))
            ? Number(row.gstRate)
            : 0;

        const lineTaxable = Math.round(q * p * 100) / 100;
        const lineTax = Math.round((lineTaxable * (itemGst / 100)) * 100) / 100;

        qty += q;
        itemsSum += lineTaxable;
        taxSum += lineTax;
        ratesSet.add(itemGst);
      }
    });

    const sub = Math.round(itemsSum * 100) / 100;
    const tax = Math.round(taxSum * 100) / 100;
    const cgst = Math.round((tax / 2) * 100) / 100;
    const sgst = Math.round((tax - cgst) * 100) / 100;
    const total = Math.round((sub + tax) * 100) / 100;

    return {
      totalQuantity: qty,
      subTotal: sub,
      gstAmount: tax,
      cgstAmount: cgst,
      sgstAmount: sgst,
      grandTotal: total,
      gstRatesList: Array.from(ratesSet),
    };
  }, [productRows]);

  const netPayableTotal = useMemo(() => {
    return Math.round((grandTotal + previousDue) * 100) / 100;
  }, [grandTotal, previousDue]);

  // Validation
  const validateForm = () => {
    const validRows = productRows.filter(
      (r) => r.productId && Number(r.quantity) > 0
    );

    if (validRows.length === 0) {
      showToast('Please select at least one product with quantity', 'warning');
      return false;
    }

    return validRows;
  };

  // Open payment modal for Print & Save
  const handlePrintAndSave = (e) => {
    if (e) animateTactilePress(e);
    const validRows = validateForm();
    if (!validRows) return;
    setPaymentModalConfig({ isOpen: true, mode: 'print' });
  };

  // Open payment modal for Save without print
  const handleSaveWithoutPrint = (e) => {
    if (e) animateTactilePress(e);
    const validRows = validateForm();
    if (!validRows) return;
    setPaymentModalConfig({ isOpen: true, mode: 'save' });
  };

  // Final confirmation from PaymentModal
  const handleConfirmPayment = async ({ paymentStatus, paidAmount, unpaidAmount }) => {
    const validRows = validateForm();
    if (!validRows) return;

    setIsSubmitting(true);
    try {
      const shopName = currentShop
        ? `${currentShop.name}${currentShop.area ? ` (${currentShop.area})` : ''}`
        : customCustomerName
        ? customCustomerName
        : 'Walk-in Retail Customer';

      await createDeliveryBill({
        shopId: selectedShopId || 'walkin',
        shopName,
        shopPhone: currentShop?.phone || '',
        date: deliveryDate,
        items: validRows,
        isPrint: paymentModalConfig.mode === 'print',
        paymentStatus,
        paidAmount,
        unpaidAmount,
        previousDue,
      });

      // Empty the delivery items and draft for the next bill
      clearDailyDraft();
      setPaymentModalConfig({ isOpen: false, mode: 'print' });
      showToast(
        paymentModalConfig.mode === 'print'
          ? 'Bill generated & printed successfully!'
          : 'Delivery entry recorded!',
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('Error saving bill: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Saved Delivery records list
  const savedDeliveryEntries = useMemo(() => {
    const todayFormatted = formatDate(new Date());
    const query = logSearch.toLowerCase().trim();

    return bills.filter((b) => {
      if (selectedLogFilterDate === 'TODAY' && b.date !== todayFormatted) return false;
      if (selectedLogFilterDate === 'SELECTED' && b.dateRaw && b.dateRaw !== deliveryDate) return false;

      if (query) {
        const matchesShop = (b.customerName || '').toLowerCase().includes(query);
        const matchesBillNo = (b.billNumber || '').toLowerCase().includes(query);
        const matchesItems = (b.items || []).some((i) =>
          (i.name || '').toLowerCase().includes(query)
        );
        return matchesShop || matchesBillNo || matchesItems;
      }
      return true;
    });
  }, [bills, logSearch, selectedLogFilterDate, deliveryDate]);

  return (
    <div className="flex-1 flex flex-col space-y-3 max-w-6xl w-full mx-auto pb-28 sm:pb-4 animate-page-entrance">
      {/* 1. Compact Header with View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#E2E8F0] dark:border-[#1E2E2A]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-display font-black border border-emerald-200 dark:border-emerald-800/40 shadow-xs shrink-0">
            <Receipt className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-display font-black text-[#1E293B] dark:text-[#F8FAFC] tracking-tight leading-tight">
              New Delivery Bill
            </h1>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              One-screen POS workspace • Add items & generate thermal receipts without scrolling
            </p>
          </div>
        </div>

        {/* View Switcher: New Bill vs Today's Log */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0A1110] rounded-xl border border-[#E2E8F0] dark:border-[#1E2E2A] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveView('billing')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeView === 'billing'
                ? 'bg-white dark:bg-[#111A18] text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B]'
            }`}
          >
            Create Bill
          </button>
          <button
            type="button"
            onClick={() => setActiveView('today_bills')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'today_bills'
                ? 'bg-white dark:bg-[#111A18] text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Today&apos;s Bills ({savedDeliveryEntries.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Billing View (1-Page Responsive Layout) */}
      {activeView === 'billing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          {/* Left Column: Customer & Delivery Items Table (8 Cols) */}
          <div className="lg:col-span-8 space-y-2.5">
            {/* Customer & Date Compact Bar */}
            <div className="bg-white dark:bg-[#111A18] rounded-xl p-2.5 sm:p-3 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-2xs space-y-2 transition-colors">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* Shop / Client Dropdown */}
                <div className="sm:col-span-5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-label font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                      Customer / Shop
                    </label>
                    {previousDue > 0 && (
                      <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                        Prev: +{formatCurrency(previousDue, settings.currency)}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Store className="w-3.5 h-3.5 text-[#1E3A5F] dark:text-[#60A5FA] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={selectedShopId}
                      onChange={(e) => {
                        setSelectedShopId(e.target.value);
                        if (e.target.value) setCustomCustomerName('');
                      }}
                      className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#1E2E2A] bg-white dark:bg-[#0A1110] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-medium pos-input-focus transition-colors cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-[#0A1110] text-[#1E293B] dark:text-[#F8FAFC]">— Select Registered Shop (Optional) —</option>
                      {shops.map((s) => (
                        <option key={s.id} value={s.id} className="bg-white dark:bg-[#0A1110] text-[#1E293B] dark:text-[#F8FAFC]">
                          {s.name} {s.area ? `(${s.area})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Walk-in Customer Name Input */}
                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-label font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider mb-1">
                    Custom Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customCustomerName}
                    onChange={(e) => {
                      setCustomCustomerName(e.target.value);
                      if (e.target.value) setSelectedShopId('');
                    }}
                    placeholder="e.g. Anand Milk Point"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#1E2E2A] bg-white dark:bg-[#0A1110] text-[#1E293B] dark:text-[#F8FAFC] text-xs placeholder-[#94A3B8] pos-input-focus transition-colors"
                  />
                </div>

                {/* Delivery Date */}
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-label font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider mb-1">
                    Bill Date
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#1E2E2A] bg-white dark:bg-[#0A1110] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-medium pos-input-focus transition-colors cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Items Card */}
            <div className="bg-white dark:bg-[#111A18] rounded-2xl p-3 sm:p-4 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xs space-y-3 transition-colors">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] dark:border-[#1E2E2A]">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="type-heading-sm text-[#0F172A] dark:text-[#F8FAFC]">
                    Delivery Items
                  </h2>
                </div>
                <span className="type-caption font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {productRows.filter((r) => r.productId).length} items listed
                </span>
              </div>

              {/* Scrollable Rows Container (fits inside 1 page) */}
              {/* Desktop Table View (sm and up) */}
              <div className="hidden sm:block overflow-x-auto max-h-[280px] sm:max-h-[320px] xl:max-h-[380px] overflow-y-auto no-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-white dark:bg-[#111A18] z-10">
                    <tr className="border-b border-[#E2E8F0] dark:border-[#1E2E2A] text-slate-500 dark:text-slate-400 type-caption">
                      <th className="pb-2 font-bold w-28 sm:w-36">Brand</th>
                      <th className="pb-2 font-bold min-w-[130px]">Product</th>
                      <th className="pb-2 font-bold text-right w-20">Rate (₹)</th>
                      <th className="pb-2 font-bold text-center w-16">GST %</th>
                      <th className="pb-2 font-bold text-center w-16">Qty</th>
                      <th className="pb-2 font-bold text-right w-24">Total</th>
                      <th className="pb-2 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E2E2A]">
                    {productRows.map((row) => {
                      const lineTaxable = (Number(row.quantity) || 0) * (Number(row.price) || 0);
                      const itemGst =
                        row.gstRate !== undefined && row.gstRate !== '' && !isNaN(Number(row.gstRate))
                          ? Number(row.gstRate)
                          : 0;
                      const lineGst = Math.round((lineTaxable * (itemGst / 100)) * 100) / 100;
                      const lineTotal = lineTaxable + lineGst;

                      const brandProducts = products.filter(
                        (p) => !row.brandId || p.companyId === row.brandId
                      );

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-[#162220] transition-colors">
                          <td className="py-2 pr-2">
                            <select
                              value={row.brandId}
                              onChange={(e) => handleRowChange(row.id, 'brandId', e.target.value)}
                              className="w-full p-1.5 rounded-lg bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#0F172A] dark:text-[#F8FAFC] text-xs focus:outline-none focus:border-[#D97706]"
                            >
                              <option value="" className="bg-white dark:bg-[#0A1110] text-[#0F172A] dark:text-[#F8FAFC]">All Brands</option>
                              {companies.map((c) => (
                                <option key={c.id} value={c.id} className="bg-white dark:bg-[#0A1110] text-[#0F172A] dark:text-[#F8FAFC]">
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 pr-2">
                            <select
                              value={row.productId}
                              onChange={(e) => handleRowChange(row.id, 'productId', e.target.value)}
                              className="w-full p-1.5 rounded-lg bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#0F172A] dark:text-[#F8FAFC] text-xs font-medium focus:outline-none focus:border-[#D97706]"
                            >
                              <option value="" className="bg-white dark:bg-[#0A1110] text-[#0F172A] dark:text-[#F8FAFC]">Select Product</option>
                              {brandProducts.map((p) => (
                                <option key={p.id} value={p.id} className="bg-white dark:bg-[#0A1110] text-[#0F172A] dark:text-[#F8FAFC]">
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 pr-2 text-right">
                            <input
                              type="number"
                              value={row.price}
                              onChange={(e) => handleRowChange(row.id, 'price', e.target.value)}
                              className="w-18 p-1.5 rounded-lg bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-right font-mono tabular-nums text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#D97706]"
                            />
                          </td>
                          <td className="py-2 px-1 text-center">
                            <div className="relative inline-block">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={row.gstRate !== undefined ? row.gstRate : 0}
                                onChange={(e) => handleRowChange(row.id, 'gstRate', e.target.value)}
                                className="w-14 p-1.5 pr-4 rounded-lg bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-center font-mono tabular-nums text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#D97706]"
                              />
                              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">%</span>
                            </div>
                          </td>
                          <td className="py-2 px-1 text-center">
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) => handleRowChange(row.id, 'quantity', e.target.value)}
                              className="w-14 p-1.5 rounded-lg bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-center font-mono tabular-nums text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#D97706]"
                            />
                          </td>
                          <td className="py-2 pl-2 text-right font-mono tabular-nums">
                            <span className="font-bold text-amber-600 dark:text-amber-400 block text-xs">
                              {formatCurrency(lineTotal, settings.currency)}
                            </span>
                            {lineGst > 0 && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-normal">
                                tax +{formatCurrency(lineGst, settings.currency)}
                              </span>
                            )}
                          </td>
                          <td className="py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(row.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                              title="Remove row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (phone screens < 640px) */}
              <div className="sm:hidden space-y-2 max-h-[320px] overflow-y-auto pr-0.5">
                {productRows.map((row) => {
                  const lineTaxable = (Number(row.quantity) || 0) * (Number(row.price) || 0);
                  const itemGst =
                    row.gstRate !== undefined && row.gstRate !== '' && !isNaN(Number(row.gstRate))
                      ? Number(row.gstRate)
                      : 0;
                  const lineGst = Math.round((lineTaxable * (itemGst / 100)) * 100) / 100;
                  const lineTotal = lineTaxable + lineGst;

                  const brandProducts = products.filter(
                    (p) => !row.brandId || p.companyId === row.brandId
                  );

                  return (
                    <div
                      key={row.id}
                      className="p-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E2E2A] bg-slate-50/70 dark:bg-[#111A18] space-y-2.5"
                    >
                      {/* Brand & Product Selectors */}
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-5">
                          <select
                            value={row.brandId}
                            onChange={(e) => handleRowChange(row.id, 'brandId', e.target.value)}
                            className="w-full p-2 rounded-lg bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#0F172A] dark:text-[#F8FAFC] text-xs focus:outline-none focus:border-[#D97706]"
                          >
                            <option value="">All Brands</option>
                            {companies.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-7">
                          <select
                            value={row.productId}
                            onChange={(e) => handleRowChange(row.id, 'productId', e.target.value)}
                            className="w-full p-2 rounded-lg bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#0F172A] dark:text-[#F8FAFC] text-xs font-semibold focus:outline-none focus:border-[#D97706]"
                          >
                            <option value="">Select Product</option>
                            {brandProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Rate, GST %, Stepper Qty, Total & Delete */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/80">
                        {/* Rate */}
                        <div className="flex items-center gap-1">
                          <span className="type-caption text-slate-500 dark:text-slate-400">Rate:</span>
                          <input
                            type="number"
                            value={row.price}
                            onChange={(e) => handleRowChange(row.id, 'price', e.target.value)}
                            className="w-16 p-1 rounded-lg bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-center font-mono tabular-nums font-bold text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#D97706]"
                          />
                        </div>

                        {/* GST % */}
                        <div className="flex items-center gap-1">
                          <span className="type-caption text-slate-500 dark:text-slate-400">GST:</span>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={row.gstRate !== undefined ? row.gstRate : 0}
                              onChange={(e) => handleRowChange(row.id, 'gstRate', e.target.value)}
                              className="w-14 p-1 pr-4 rounded-lg bg-white dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-center font-mono tabular-nums font-bold text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#D97706]"
                            />
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">%</span>
                          </div>
                        </div>

                        {/* Qty Stepper */}
                        <div className="flex items-center gap-1 bg-white dark:bg-[#0A1110] p-0.5 rounded-lg border border-[#E2E8F0] dark:border-[#1E2E2A]">
                          <button
                            type="button"
                            onClick={() => handleRowChange(row.id, 'quantity', Math.max(1, (Number(row.quantity) || 1) - 1))}
                            className="w-6 h-6 rounded flex items-center justify-center text-sm font-black hover:bg-slate-100 dark:hover:bg-[#162220] cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-mono tabular-nums font-bold text-xs">
                            {row.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRowChange(row.id, 'quantity', (Number(row.quantity) || 0) + 1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-sm font-black hover:bg-slate-100 dark:hover:bg-[#162220] cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Line Total & Remove */}
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="font-mono tabular-nums font-bold text-xs text-amber-600 dark:text-amber-400 block">
                              {formatCurrency(lineTotal, settings.currency)}
                            </span>
                            {lineGst > 0 && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-normal">
                                +{formatCurrency(lineGst, settings.currency)} GST
                              </span>
                            )}
                          </div>

                          {/* Remove */}
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleAddRow}
                className="btn-secondary-action w-full py-2 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Add Another Product Line</span>
              </button>
            </div>
          </div>

          {/* Right Column: Order Summary & Generate Bill (4 Cols) — ALWAYS IN VIEW WITHOUT SCROLLING */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-white dark:bg-[#111A18] rounded-2xl p-4 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xs space-y-3.5 transition-colors">
              {/* Summary Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] dark:border-[#1E2E2A]">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="type-caption font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Bill Summary
                  </h3>
                </div>
                <span className="type-caption font-mono tabular-nums px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold border border-amber-200/60 dark:border-amber-800/40">
                  {totalQuantity} {totalQuantity === 1 ? 'unit' : 'units'}
                </span>
              </div>

              {/* Customer Pill */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-xs">
                <span className="type-caption block text-slate-500 dark:text-slate-400 mb-0.5">
                  Billed To
                </span>
                <p className="font-bold text-[#0F172A] dark:text-white truncate">
                  {currentShop ? currentShop.name : (customCustomerName || 'Walk-in Retail Customer')}
                </p>
              </div>

              {/* Big Payable Total Block (Warm Amber Highlight) */}
              <div className="text-center py-3.5 px-3 bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-emerald-50/40 dark:from-[#0A1110] dark:to-[#111A18] rounded-xl border border-amber-200/70 dark:border-amber-900/40 shadow-xs">
                <span className="type-caption block text-slate-500 dark:text-slate-400 mb-1">
                  Total Payable Amount
                </span>
                <span className="text-2xl sm:text-3xl font-mono tabular-nums font-black text-amber-600 dark:text-amber-400 block tracking-tight">
                  {formatCurrency(netPayableTotal, settings.currency)}
                </span>
              </div>

              {/* Line-item Financial Breakdown */}
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-0.5">
                <div className="flex justify-between items-center">
                  <span>Items Subtotal:</span>
                  <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-white">
                    {formatCurrency(subTotal, settings.currency)}
                  </span>
                </div>
                {gstAmount > 0 ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span>
                        GST {gstRatesList.length === 1 ? `(${gstRatesList[0]}%)` : '(Multi-rate)'}:
                      </span>
                      <span className="font-mono tabular-nums font-medium text-[#0F172A] dark:text-white">
                        +{formatCurrency(gstAmount, settings.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 pl-2">
                      <span>• CGST:</span>
                      <span className="font-mono tabular-nums">+{formatCurrency(cgstAmount, settings.currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 pl-2">
                      <span>• SGST:</span>
                      <span className="font-mono tabular-nums">+{formatCurrency(sgstAmount, settings.currency)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center text-slate-400">
                    <span>GST (0% Exempt):</span>
                    <span className="font-mono tabular-nums">+{formatCurrency(0, settings.currency)}</span>
                  </div>
                )}
                {previousDue > 0 && (
                  <div className="flex justify-between items-center text-amber-700 dark:text-amber-400 font-semibold">
                    <span>Previous Balance Due:</span>
                    <span className="font-mono tabular-nums">+{formatCurrency(previousDue, settings.currency)}</span>
                  </div>
                )}
              </div>

              {/* Primary Action Buttons — Warm Amber Accent for Generate & Print Bill */}
              <div className="space-y-2 pt-2.5 border-t border-[#E2E8F0] dark:border-[#1E2E2A]">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handlePrintAndSave}
                  className="btn-primary-action w-full py-3 text-sm font-bold shadow-md cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>Generate & Print Bill</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveWithoutPrint}
                  className="btn-secondary-action w-full py-2.5 text-xs font-bold cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Save Without Print</span>
                </button>

                {totalQuantity > 0 && (
                  <button
                    type="button"
                    onClick={clearDailyDraft}
                    className="w-full py-1 text-[11px] text-slate-400 hover:text-rose-600 font-medium transition-colors cursor-pointer text-center"
                  >
                    Clear Current Draft
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Today's Saved Bills View (When Switched) */}
      {activeView === 'today_bills' && (
        <section className="space-y-3 bg-white dark:bg-[#111A18] rounded-2xl p-4 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-sm transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0] dark:border-[#1E2E2A]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1E3A5F] dark:text-[#60A5FA]" />
              <h2 className="font-display font-bold text-sm text-[#1E293B] dark:text-[#F8FAFC]">
                Today&apos;s Saved Delivery Bills ({savedDeliveryEntries.length})
              </h2>
            </div>
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search saved bills..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#1E293B] dark:text-[#F8FAFC] text-xs placeholder-[#94A3B8] pos-input-focus"
              />
            </div>
          </div>

          <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E2E2A]">
            {savedDeliveryEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
                No delivery bills recorded for today yet. Use the Create Bill tab above to generate one.
              </div>
            ) : (
              savedDeliveryEntries.map((bill) => (
                <div
                  key={bill.id}
                  onClick={() => setGeneratedBill(bill)}
                  className="py-3 px-2 flex items-center justify-between hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A] transition-colors cursor-pointer rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40">
                      #{bill.billNumber}
                    </span>
                    <div>
                      <p className="font-bold text-xs text-[#1E293B] dark:text-[#F8FAFC]">
                        {bill.customerName || 'Retail Customer'}
                      </p>
                      <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                        {bill.date} {bill.time} • {bill.totalItems || bill.items?.length || 0} item(s) • {bill.totalQty || 0} units
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {bill.paymentStatus && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono ${
                          bill.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : bill.paymentStatus === 'PARTIAL'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {bill.paymentStatus === 'PAID'
                          ? 'Paid'
                          : bill.paymentStatus === 'PARTIAL'
                          ? 'Partial'
                          : 'Unpaid'}
                      </span>
                    )}
                    <span className="font-mono font-bold text-xs text-[#1E3A5F] dark:text-[#60A5FA]">
                      {formatCurrency(bill.finalAmount || bill.totalAmount, settings.currency)}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* 4. Mobile Bottom Summary Dock (Docked at bottom of screen) */}
      {totalQuantity > 0 && activeView === 'billing' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-dock px-4 py-2.5 border-t border-[#E2E8F0] dark:border-[#1E2E2A] shadow-[0_-6px_25px_rgba(15,23,42,0.08)] dark:shadow-[0_-6px_25px_rgba(0,0,0,0.7)] transition-all flex items-center justify-between gap-2 safe-area-pb">
          <div>
            <span className="type-caption block text-slate-500 dark:text-slate-400">
              {totalQuantity} {totalQuantity === 1 ? 'unit' : 'units'}
            </span>
            <span className="font-mono tabular-nums font-black text-lg text-amber-600 dark:text-amber-400">
              {formatCurrency(netPayableTotal, settings.currency)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSaveWithoutPrint}
              className="btn-secondary-action px-3.5 py-2 text-xs font-bold rounded-xl"
            >
              Save
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handlePrintAndSave}
              className="btn-primary-action px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span>Generate</span>
            </button>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      <PaymentModal
        isOpen={paymentModalConfig.isOpen}
        onClose={() => setPaymentModalConfig({ isOpen: false, mode: 'print' })}
        onConfirm={handleConfirmPayment}
        shopName={
          currentShop
            ? `${currentShop.name}${currentShop.area ? ` (${currentShop.area})` : ''}`
            : customCustomerName || 'Retail Customer'
        }
        subTotal={subTotal}
        gstRate={gstRatesList.length === 1 ? gstRatesList[0] : (gstRatesList.length > 1 ? 'Multi' : 0)}
        gstRatesList={gstRatesList}
        gstAmount={gstAmount}
        currentAmount={grandTotal}
        previousDue={previousDue}
        currency={settings.currency || '₹'}
        isSubmitting={isSubmitting}
        mode={paymentModalConfig.mode}
      />
    </div>
  );
}
