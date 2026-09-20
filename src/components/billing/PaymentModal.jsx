import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Check,
  Coins,
  Clock,
  Printer,
  Save,
  AlertCircle,
  Store,
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { animateTactilePress } from '../../lib/animations';

export function PaymentModal({
  isOpen,
  onClose,
  onConfirm,
  shopName,
  subTotal = 0,
  gstRate = 5,
  gstAmount = 0,
  currentAmount = 0,
  previousDue = 0,
  currency = '₹',
  isSubmitting = false,
  mode = 'print',
}) {
  const netTotal = Math.round((Number(currentAmount || 0) + Number(previousDue || 0)) * 100) / 100;

  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [partialAmount, setPartialAmount] = useState('');
  const partialInputRef = useRef(null);

  // Reset or initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentStatus('PAID');
      setPartialAmount(currentAmount > 0 ? String(currentAmount) : '');
    }
  }, [isOpen, currentAmount, netTotal]);

  // Auto-focus input when PARTIAL is selected
  useEffect(() => {
    if (paymentStatus === 'PARTIAL' && partialInputRef.current) {
      partialInputRef.current.focus();
      partialInputRef.current.select();
    }
  }, [paymentStatus]);

  // Keyboard shortcut: Escape to close
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

  if (!isOpen) return null;

  // Derive final paid and unpaid amounts
  let paidAmount = netTotal;
  let unpaidAmount = 0;

  if (paymentStatus === 'UNPAID') {
    paidAmount = 0;
    unpaidAmount = netTotal;
  } else if (paymentStatus === 'PARTIAL') {
    const parsed = parseFloat(partialAmount);
    paidAmount = isNaN(parsed) ? 0 : Math.max(0, Math.min(netTotal, parsed));
    unpaidAmount = Math.max(0, Math.round((netTotal - paidAmount) * 100) / 100);
  } else {
    paidAmount = netTotal;
    unpaidAmount = 0;
  }

  const handleConfirm = (e) => {
    if (e) animateTactilePress(e);
    onConfirm({
      paymentStatus,
      paidAmount,
      unpaidAmount,
      previousDue,
    });
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-md animate-modal-pop">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-2xl shadow-2xl overflow-hidden my-auto transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-[#E2E8F0] dark:border-[#1E2E2A]">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Store className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px] sm:max-w-[240px]">
                {shopName || 'Retail Customer'}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
              Payment Settlement
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162220] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Bill Summary */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 text-center bg-slate-50 dark:bg-[#0A1110] border-b border-[#E2E8F0] dark:border-[#1E2E2A]">
          <span className="type-caption block text-slate-500 dark:text-slate-400">
            Total Amount Due
          </span>
          <div className="text-2xl sm:text-3xl font-mono tabular-nums font-black text-amber-600 dark:text-amber-400 mt-0.5 tracking-tight">
            {formatCurrency(netTotal, currency)}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 mt-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            <span>Items: {formatCurrency(subTotal || currentAmount, currency)}</span>
            {gstAmount > 0 && (
              <span>
                • GST {gstRate && gstRate !== 'Multi' ? `(${gstRate}%)` : ''}: +{formatCurrency(gstAmount, currency)}
              </span>
            )}
            {previousDue > 0 && (
              <span className="text-amber-700 dark:text-amber-400 font-medium">
                • Prev Due: +{formatCurrency(previousDue, currency)}
              </span>
            )}
          </div>
        </div>

        {/* Settlement Selector: Modern Segmented Switcher */}
        <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-4">
          <div>
            <label className="type-caption block text-slate-500 dark:text-slate-400 mb-2">
              Select Payment Option
            </label>

            {/* Seamless Segmented Control */}
            <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 dark:bg-[#0A1110] border border-slate-200/50 dark:border-[#1E2E2A] rounded-xl">
              {/* Option 1: Fully Paid */}
              <button
                type="button"
                onClick={() => setPaymentStatus('PAID')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  paymentStatus === 'PAID'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Fully Paid</span>
                </div>
                <span className={`text-[10px] font-mono tabular-nums ${paymentStatus === 'PAID' ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {formatCurrency(netTotal, currency)}
                </span>
              </button>

              {/* Option 2: Partially Paid */}
              <button
                type="button"
                onClick={() => setPaymentStatus('PARTIAL')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  paymentStatus === 'PARTIAL'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Partial</span>
                </div>
                <span className={`text-[10px] font-mono tabular-nums ${paymentStatus === 'PARTIAL' ? 'text-amber-100' : 'text-slate-400'}`}>
                  Custom
                </span>
              </button>

              {/* Option 3: Unpaid */}
              <button
                type="button"
                onClick={() => setPaymentStatus('UNPAID')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  paymentStatus === 'UNPAID'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Credit / Due</span>
                </div>
                <span className={`text-[10px] font-mono tabular-nums ${paymentStatus === 'UNPAID' ? 'text-rose-100' : 'text-slate-400'}`}>
                  ₹0 Paid
                </span>
              </button>
            </div>
          </div>

          {/* Partial Payment Input Field */}
          {paymentStatus === 'PARTIAL' && (
            <div className="space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-200">Amount Collected Now</span>
                <span className="text-slate-400 font-mono tabular-nums text-[11px]">Max: {formatCurrency(netTotal, currency)}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono tabular-nums font-bold text-slate-400">
                    {currency}
                  </span>
                  <input
                    ref={partialInputRef}
                    type="number"
                    step="any"
                    min="0"
                    max={netTotal}
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full pl-7 pr-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-[#1E293B] dark:text-[#F8FAFC] font-mono tabular-nums font-bold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                {previousDue > 0 && currentAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setPartialAmount(String(currentAmount))}
                    className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#162220] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1E2E2A] transition-colors cursor-pointer shrink-0 font-mono tabular-nums"
                  >
                    Current Only
                  </button>
                )}
                {netTotal >= 50 && (
                  <button
                    type="button"
                    onClick={() => setPartialAmount(String(Math.round(netTotal / 2)))}
                    className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#162220] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1E2E2A] transition-colors cursor-pointer shrink-0 font-mono tabular-nums"
                  >
                    50%
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Clean Outcome Summary Line */}
          <div className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">Collected:</span>
              <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(paidAmount, currency)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">New Due:</span>
              <span
                className={`font-mono tabular-nums font-bold ${
                  unpaidAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {formatCurrency(unpaidAmount, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[#E2E8F0] dark:border-[#1E2E2A] bg-slate-50/50 dark:bg-[#111A18] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-secondary-action px-4 py-2 text-xs font-bold cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={
              mode === 'print'
                ? "btn-primary-action px-5 py-2 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                : "btn-mint-primary px-5 py-2 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
            }
          >
            {mode === 'print' ? (
              <>
                <Printer className="w-4 h-4 text-white" />
                <span>Confirm & Print Bill</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-white" />
                <span>Confirm & Save Entry</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
