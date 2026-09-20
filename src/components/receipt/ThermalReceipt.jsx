import React from 'react';
import { formatCurrency } from '../../lib/utils';

/**
 * ThermalReceipt Component: Authentically renders a 58mm/80mm thermal receipt
 * Uses JetBrains Mono for exact character alignment, realistic paper texture,
 * subtle dashed dividers, and inset paper shadow.
 */
export const ThermalReceipt = React.forwardRef(({ bill, settings }, ref) => {
  if (!bill) return null;

  const currency = settings.currency || '₹';

  return (
    <div
      ref={ref}
      id="thermal-receipt-printable"
      data-papersize={settings?.paperSize || '58mm'}
      className={`receipt-paper p-5 mx-auto font-mono tabular-nums text-xs text-stone-950 rounded-sm select-all transition-all shadow-2xl ${
        settings?.paperSize === '80mm' ? 'w-[340px] sm:w-[380px]' : 'w-[285px] sm:w-[300px]'
      }`}
    >
      {/* Top Header */}
      <div className="text-center pb-2 border-b border-dashed border-stone-400">
        {settings?.logo && (
          <div className="flex justify-center mb-1.5">
            <img
              src={settings.logo}
              alt={settings.businessName || 'Business Logo'}
              className="max-h-12 max-w-[140px] object-contain filter grayscale contrast-125"
            />
          </div>
        )}
        <h2 className="font-extrabold text-sm tracking-wider uppercase text-black font-mono">
          {settings.businessName || 'G. V. MILK AGENCY'}
        </h2>
        {settings.address && (
          <p className="text-[11px] font-medium text-stone-800 leading-tight uppercase mt-0.5">
            {settings.address}
          </p>
        )}
        {settings.city && (
          <p className="text-[11px] font-medium text-stone-800 leading-tight uppercase">
            {settings.city}
          </p>
        )}
        {settings.phone && (
          <p className="text-[11px] font-bold text-stone-900 mt-0.5">
            MOB. {settings.phone}
          </p>
        )}
        {settings.gstin && (
          <p className="text-[10px] font-semibold text-stone-700">
            GSTIN: {settings.gstin}
          </p>
        )}
      </div>

      {/* Bill Meta */}
      <div className="py-2 border-b border-dashed border-stone-300 text-[11px] space-y-0.5">
        <div className="flex justify-between font-bold text-stone-900">
          <span>BILL NO: {bill.billNumber}</span>
          <span>DATE: {bill.date}</span>
        </div>
        <div className="flex justify-between text-stone-700">
          <span className="truncate max-w-[140px]">
            {bill.customerName ? `CUST: ${bill.customerName}` : ''}
          </span>
          <span>TIME: {bill.time}</span>
        </div>
      </div>

      {/* Item Table Header */}
      <div className="py-1.5 border-b border-dashed border-stone-400 text-[10px] font-bold">
        <div className="grid grid-cols-12 gap-1 text-stone-900">
          <div className="col-span-6 text-left">ITEM NAME</div>
          <div className="col-span-2 text-center">QTY</div>
          <div className="col-span-2 text-right">PRICE</div>
          <div className="col-span-2 text-right">AMOUNT</div>
        </div>
      </div>

      {/* Items List */}
      <div className="py-2 border-b border-dashed border-stone-300 space-y-1.5 text-[11px]">
        {bill.items.map((item, index) => {
          const qty = item.quantity;
          const price = Number(item.rate).toFixed(2);
          const amount = (Number(item.quantity) * Number(item.rate)).toFixed(2);

          return (
            <div key={item.id || index} className="grid grid-cols-12 gap-1 items-start leading-tight">
              <div className="col-span-6 font-semibold uppercase text-stone-950 truncate">
                {item.name}
                <span className="block text-[9px] font-normal text-stone-600 font-mono">
                  GST: {item.gstRate !== undefined && item.gstRate !== null ? `${item.gstRate}%` : '0%'}
                </span>
              </div>
              <div className="col-span-2 text-center font-bold text-stone-900">
                {qty}
              </div>
              <div className="col-span-2 text-right text-stone-800">
                {price}
              </div>
              <div className="col-span-2 text-right font-bold text-stone-950">
                {amount}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Section */}
      <div className="py-2 border-b border-dashed border-stone-400 space-y-1 text-[11px]">
        <div className="flex justify-between font-bold text-stone-900">
          <span>TOTAL ITEM(S): {bill.totalItems}</span>
          <span>QTY: {bill.totalQty}</span>
        </div>

        <div className="flex justify-between font-bold text-stone-900 pt-0.5">
          <span>SUBTOTAL:</span>
          <span>{currency}{Number(bill.subTotal || bill.taxableAmount || (bill.gstAmount ? (bill.currentAmount || bill.totalAmount) - bill.gstAmount : (bill.currentAmount || bill.totalAmount))).toFixed(2)}</span>
        </div>

        {Number(bill.gstAmount || 0) > 0 ? (
          <>
            <div className="flex justify-between font-bold text-stone-900">
              <span>GST {bill.isUniformRate && bill.gstRate !== undefined ? `(${bill.gstRate}%)` : (bill.gstSlabs?.length > 1 ? `(${bill.gstSlabs.map(s => `${s}%`).join(', ')})` : '')}:</span>
              <span>+{currency}{Number(bill.gstAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-stone-600 pl-2">
              <span>CGST:</span>
              <span>+{currency}{Number(bill.cgstAmount || (Number(bill.gstAmount) / 2)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-stone-600 pl-2">
              <span>SGST:</span>
              <span>+{currency}{Number(bill.sgstAmount || (Number(bill.gstAmount) / 2)).toFixed(2)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-stone-600 text-[10px]">
            <span>GST (0% EXEMPT):</span>
            <span>{currency}0.00</span>
          </div>
        )}

        <div className="flex justify-between font-bold text-stone-900 pt-0.5 border-t border-dotted border-stone-300">
          <span>CURRENT BILL:</span>
          <span>{currency}{Number(bill.currentAmount || bill.totalAmount).toFixed(2)}</span>
        </div>

        {Number(bill.previousDue) > 0 && (
          <div className="flex justify-between font-bold text-stone-900">
            <span>PREVIOUS DUE:</span>
            <span>+{currency}{Number(bill.previousDue).toFixed(2)}</span>
          </div>
        )}

        {bill.roundOff && bill.roundOff !== 0 ? (
          <div className="flex justify-between text-[10px] text-stone-700">
            <span>ROUND-OFF:</span>
            <span>{currency}{Number(bill.roundOff).toFixed(2)}</span>
          </div>
        ) : null}

        <div className="flex justify-between font-extrabold text-sm pt-1 text-black border-t border-dotted border-stone-300">
          <span>TOTAL PAYABLE:</span>
          <span>{currency}{Number(bill.finalAmount || bill.totalAmount).toFixed(2)}</span>
        </div>

        {/* Payment Details */}
        {bill.paymentStatus && (
          <div className="pt-1.5 mt-1 border-t border-dashed border-stone-300 space-y-0.5">
            <div className="flex justify-between text-stone-800 font-bold text-[10px]">
              <span>STATUS:</span>
              <span className="font-extrabold">
                {bill.paymentStatus === 'PAID'
                  ? 'FULLY PAID'
                  : bill.paymentStatus === 'PARTIAL'
                  ? 'PARTIALLY PAID'
                  : 'UNPAID'}
              </span>
            </div>
            <div className="flex justify-between text-stone-900 font-bold">
              <span>PAID:</span>
              <span>{currency}{Number(bill.paidAmount !== undefined ? bill.paidAmount : bill.finalAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-black font-extrabold">
              <span>BALANCE DUE:</span>
              <span>{currency}{Number(bill.unpaidAmount || 0).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2.5 pb-1 text-center text-[10px] font-bold tracking-wider text-stone-800 uppercase space-y-0.5">
        <p className="border-t border-dashed border-stone-300 pt-1">
          ═════════════════════════
        </p>
        <p className="text-[11px] font-extrabold">THANK YOU! VISIT AGAIN</p>
        <p>═════════════════════════</p>
      </div>
    </div>
  );
});
