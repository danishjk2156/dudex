import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  History,
  Search,
  Calendar,
  Download,
  Trash2,
  Printer,
  ChevronRight,
  Share2,
  Receipt,
  User,
  Clock,
  Building2,
  X,
  Edit2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { downloadThermalReceiptPdf } from '../lib/receiptPdf';
import { animateStaggerEntrance, animateTactilePress } from '../lib/animations';
import { EditBillModal } from '../components/billing/EditBillModal';

export function HistoryPage() {
  const { activePage, bills, settings, setGeneratedBill, deleteBill, updateBill, showToast, setActivePage } = useApp();

  const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, YESTERDAY, 7DAYS, 30DAYS, CUSTOM
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [editingBill, setEditingBill] = useState(null);
  const billsListRef = useRef(null);

  // Helper date calculators
  const today = new Date();
  const todayStr = formatDate(today);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  // Filter Bills
  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      // Date Filter
      let matchesDate = true;
      if (dateFilter === 'TODAY') {
        matchesDate = bill.date === todayStr;
      } else if (dateFilter === 'YESTERDAY') {
        matchesDate = bill.date === yesterdayStr;
      } else if (dateFilter === '7DAYS') {
        const billD = new Date(bill.createdAt || bill.date);
        const diffDays = (today.getTime() - billD.getTime()) / (1000 * 3600 * 24);
        matchesDate = diffDays <= 7;
      } else if (dateFilter === '30DAYS') {
        const billD = new Date(bill.createdAt || bill.date);
        const diffDays = (today.getTime() - billD.getTime()) / (1000 * 3600 * 24);
        matchesDate = diffDays <= 30;
      } else if (dateFilter === 'CUSTOM') {
        if (customStartDate && customEndDate) {
          const bDate = bill.createdAt ? bill.createdAt.slice(0, 10) : bill.date;
          matchesDate = bDate >= customStartDate && bDate <= customEndDate;
        }
      }

      // Search Term Filter
      const matchesSearch =
        bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bill.customerName && bill.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (bill.customerPhone && bill.customerPhone.includes(searchTerm)) ||
        bill.items.some((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesDate && matchesSearch;
    });
  }, [bills, dateFilter, customStartDate, customEndDate, searchTerm, todayStr, yesterdayStr]);

  // Stagger Entrance on filtered bills & Tab Switch
  useEffect(() => {
    if ((activePage === 'history' || !activePage) && billsListRef.current && billsListRef.current.children.length > 0) {
      animateStaggerEntrance(billsListRef.current.children, {
        y: 12,
        duration: 0.32,
        stagger: 0.03,
      });
    }
  }, [activePage, dateFilter, searchTerm, customStartDate, customEndDate, bills.length]);

  // Totals of filtered list
  const totalFilteredRevenue = filteredBills.reduce(
    (sum, b) => sum + (Number(b.finalAmount) || Number(b.totalAmount) || 0),
    0
  );
  const totalFilteredItems = filteredBills.reduce((sum, b) => sum + (b.totalQty || 0), 0);

  // Quick Direct PDF Download
  const handleQuickDownloadPdf = async (e, bill) => {
    e.stopPropagation();
    animateTactilePress(e);
    try {
      showToast(`Generating PDF for Bill #${bill.billNumber}...`, 'info');
      const res = await downloadThermalReceiptPdf(bill, settings, null);
      if (res && res.success) {
        showToast(`Saved ${res.fileName}`, 'success');
      }
    } catch (err) {
      showToast('Download error: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-24 md:pb-8 animate-page-entrance">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white font-display tracking-tight">
              Bill History & Records
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-normal">
            Search by bill number, date, amount, or product details. View, re-share, or re-print past bills.
          </p>
        </div>

        <button
          onClick={(e) => {
            animateTactilePress(e);
            setActivePage('billing');
          }}
          className="px-4 py-2.5 rounded-lg btn-tactile-primary font-semibold text-xs sm:text-sm shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Receipt className="w-4 h-4" />
          <span>Create New Bill</span>
        </button>
      </div>

      {/* Date Filter Tabs + Custom Date Picker */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'ALL', label: 'All Bills' },
            { id: 'TODAY', label: "Today's Bills" },
            { id: 'YESTERDAY', label: 'Yesterday' },
            { id: '7DAYS', label: 'Last 7 Days' },
            { id: '30DAYS', label: 'Last 30 Days' },
            { id: 'CUSTOM', label: 'Custom Range...' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={(e) => {
                animateTactilePress(e);
                setDateFilter(tab.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap min-h-[36px] cursor-pointer transition-all ${
                dateFilter === tab.id
                  ? 'filter-pill-active'
                  : 'filter-pill'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Custom Date Pickers */}
        {dateFilter === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-xl animate-in fade-in shadow-sm">
            <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-md px-2.5 py-1 text-xs text-[#1E293B] dark:text-white pos-input-focus"
            />
            <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-md px-2.5 py-1 text-xs text-[#1E293B] dark:text-white pos-input-focus"
            />
          </div>
        )}
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] dark:text-[#94A3B8] pointer-events-none" />
        <input
          type="text"
          placeholder="Search by Bill #, Customer name/phone, product name..."
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

      {/* Filter Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white dark:bg-[#111A18] rounded-2xl p-3.5 sm:p-4 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-sm">
        <div>
          <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] uppercase font-bold block">Total Bills Found</span>
          <span className="text-lg sm:text-xl font-extrabold text-[#1E293B] dark:text-white font-display">
            {filteredBills.length} <span className="text-xs font-normal text-[#64748B] dark:text-[#94A3B8]">bills</span>
          </span>
        </div>

        <div>
          <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] uppercase font-bold block">Total Quantity Sold</span>
          <span className="text-lg sm:text-xl font-extrabold text-[#1E293B] dark:text-white font-display">
            {totalFilteredItems} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">units</span>
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <span className="type-caption block text-slate-500 dark:text-slate-400">Total Revenue</span>
          <span className="text-lg sm:text-xl font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalFilteredRevenue, settings.currency)}
          </span>
        </div>
      </div>

      {/* Bills List */}
      <div ref={billsListRef} className="space-y-3">
        {filteredBills.map((bill) => {
          const totalAmt = bill.finalAmount || bill.totalAmount;

          return (
            <div
              key={bill.id}
              onClick={(e) => {
                animateTactilePress(e);
                setGeneratedBill(bill);
              }}
              className="bg-white dark:bg-[#111A18] rounded-2xl p-3.5 sm:p-4 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xs hover:shadow-md transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[#D97706] dark:hover:border-[#F59E0B] cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3.5 group"
            >
              {/* Left Side Info */}
              <div className="flex items-start gap-3">
                {/* Horizontal Monospace Bill Chip */}
                <div className="font-mono tabular-nums text-xs font-bold px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 shadow-2xs shrink-0 self-start mt-0.5">
                  #{bill.billNumber}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="type-heading-sm text-[#0F172A] dark:text-white group-hover:text-[#D97706] dark:group-hover:text-[#FBBF24] transition-colors">
                      Bill #{bill.billNumber}
                    </h3>

                    {bill.customerName && (
                      <span className="status-pill bg-slate-100 dark:bg-[#0A1110] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[10px] inline-flex items-center gap-1">
                        <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> {bill.customerName}
                      </span>
                    )}

                    {bill.customerPhone && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        ({bill.customerPhone})
                      </span>
                    )}

                    {/* Payment Status Pill */}
                    {bill.paymentStatus && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono tabular-nums ${
                          bill.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : bill.paymentStatus === 'PARTIAL'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {bill.paymentStatus === 'PAID'
                          ? 'Fully Paid'
                          : bill.paymentStatus === 'PARTIAL'
                          ? `Partial • Paid ${formatCurrency(bill.paidAmount, settings.currency)}`
                          : 'Unpaid (Credit)'}
                      </span>
                    )}
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                    <span>{bill.date}</span>
                    <span>•</span>
                    <span>{bill.time}</span>
                    <span>•</span>
                    <span>{bill.totalItems} item(s)</span>
                    <span>•</span>
                    <span>{bill.totalQty} total units</span>
                  </div>

                  {/* Summary of first few items */}
                  <div className="type-body-sm text-slate-500 dark:text-slate-400 mt-1 truncate max-w-md">
                    Items: {bill.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                  </div>
                </div>
              </div>

              {/* Right Side: Total & Actions */}
              <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-[#E2E8F0] dark:border-[#1E2E2A]">
                <div className="text-left md:text-right">
                  <span className="font-mono tabular-nums font-bold text-base sm:text-lg text-emerald-600 dark:text-emerald-400 block">
                    {formatCurrency(totalAmt, settings.currency)}
                  </span>
                  {Number(bill.unpaidAmount) > 0 ? (
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums block">
                      Balance Due: {formatCurrency(bill.unpaidAmount, settings.currency)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono tabular-nums">
                      {bill.items.length} line item(s)
                    </span>
                  )}
                  {Number(bill.previousDue) > 0 && (
                    <span className="text-[9px] text-amber-700 dark:text-amber-400 font-mono tabular-nums block">
                      (incl. {formatCurrency(bill.previousDue, settings.currency)} prev)
                    </span>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Download PDF for Bill #${bill.billNumber}`}
                    onClick={(e) => handleQuickDownloadPdf(e, bill)}
                    title="Download Thermal PDF"
                    className="p-2 min-w-[36px] min-h-[36px] rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162220] transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Print Receipt for Bill #${bill.billNumber}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      animateTactilePress(e);
                      setGeneratedBill(bill);
                    }}
                    title="Print Receipt"
                    className="p-2 min-w-[36px] min-h-[36px] rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#D97706] dark:hover:text-[#FBBF24] hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Printer className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Update Bill #${bill.billNumber}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      animateTactilePress(e);
                      setEditingBill(bill);
                    }}
                    title="Update Bill"
                    className="p-2 min-w-[36px] min-h-[36px] rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162220] transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete Bill #${bill.billNumber}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      animateTactilePress(e);
                      setDeleteConfirmId(bill.id);
                    }}
                    title="Delete Bill"
                    className="p-2 min-w-[36px] min-h-[36px] rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:text-[#DC2626] dark:hover:text-[#F87171] hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBills.length === 0 && (
        <div className="bg-white dark:bg-[#111A18] rounded-2xl p-10 text-center text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-sm space-y-3">
          <Receipt className="w-10 h-10 mx-auto opacity-30 text-[#64748B] dark:text-[#94A3B8]" />
          <p className="text-base font-bold text-[#1E293B] dark:text-white">No bills match your filters</p>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-sm mx-auto font-normal">
            Try adjusting your search query or select "All Bills" to view previous records.
          </p>
          <button
            onClick={(e) => {
              animateTactilePress(e);
              setDateFilter('ALL');
              setSearchTerm('');
            }}
            className="px-4 py-2 rounded-lg btn-ghost-secondary text-xs font-bold cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111A18] border border-rose-200 dark:border-rose-900/60 rounded-2xl shadow-2xl p-5 w-full max-w-sm transition-colors">
            <h3 className="font-display font-bold text-base text-[#1E293B] dark:text-white mb-2">
              Delete Bill Record?
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-4 font-normal">
              Are you sure you want to permanently delete this bill record from local storage? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-2 rounded-lg btn-ghost-secondary text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteBill(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-rose-700 text-white font-semibold text-xs shadow-sm active:scale-95 cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Update Bill Modal */}
      {editingBill && (
        <EditBillModal
          bill={editingBill}
          isOpen={Boolean(editingBill)}
          onClose={() => setEditingBill(null)}
          onSave={async (updatedData) => {
            await updateBill(updatedData);
            setEditingBill(null);
          }}
        />
      )}
    </div>
  );
}
