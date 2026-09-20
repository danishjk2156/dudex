/**
 * Utility functions for billing, formatting, and calculations
 */

export function formatCurrency(amount, currency = '₹') {
  const num = Number(amount) || 0;
  const symbol = currency || '₹';
  return `${symbol}${num.toFixed(2)}`;
}

export function formatDate(dateInput = new Date()) {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-');
    return `${day}/${month}/${year.slice(-2)}`;
  }
  const d = new Date(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2); // 2-digit year like 26
  return `${day}/${month}/${year}`;
}

export function formatTime(dateInput = new Date()) {
  const d = new Date(dateInput);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

export function formatDateTimeReadable(dateInput = new Date()) {
  const d = new Date(dateInput);
  const dateStr = formatDate(d);
  const timeStr = formatTime(d);
  return `${dateStr} ${timeStr}`;
}

export function padBillNumber(num) {
  const n = parseInt(num, 10) || 1;
  return String(n).padStart(4, '0');
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function calculateBillSummary(items = [], fallbackGstRate = 0) {
  const totalItems = items.length;
  let totalQty = 0;
  let taxableAmount = 0;
  let gstAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;

  const gstRatesSet = new Set();
  const slabs = {};

  items.forEach((item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate ?? item.price) || 0;
    const itemGstRate =
      item.gstRate !== undefined && item.gstRate !== null && item.gstRate !== ''
        ? Math.max(0, Number(item.gstRate))
        : Math.max(0, Number(fallbackGstRate) || 0);

    const lineTaxable = Math.round(qty * rate * 100) / 100;
    const lineGst = Math.round((lineTaxable * (itemGstRate / 100)) * 100) / 100;
    const lineCgst = Math.round((lineGst / 2) * 100) / 100;
    const lineSgst = Math.round((lineGst - lineCgst) * 100) / 100;

    totalQty += qty;
    taxableAmount += lineTaxable;
    gstAmount += lineGst;
    cgstAmount += lineCgst;
    sgstAmount += lineSgst;

    gstRatesSet.add(itemGstRate);
    if (!slabs[itemGstRate]) {
      slabs[itemGstRate] = { rate: itemGstRate, taxable: 0, gst: 0, cgst: 0, sgst: 0 };
    }
    slabs[itemGstRate].taxable = Math.round((slabs[itemGstRate].taxable + lineTaxable) * 100) / 100;
    slabs[itemGstRate].gst = Math.round((slabs[itemGstRate].gst + lineGst) * 100) / 100;
    slabs[itemGstRate].cgst = Math.round((slabs[itemGstRate].cgst + lineCgst) * 100) / 100;
    slabs[itemGstRate].sgst = Math.round((slabs[itemGstRate].sgst + lineSgst) * 100) / 100;
  });

  taxableAmount = Math.round(taxableAmount * 100) / 100;
  gstAmount = Math.round(gstAmount * 100) / 100;
  cgstAmount = Math.round(cgstAmount * 100) / 100;
  sgstAmount = Math.round(sgstAmount * 100) / 100;

  const rawTotal = taxableAmount + gstAmount;
  const finalAmount = Math.round(rawTotal * 100) / 100;
  const roundOff = Math.round((finalAmount - rawTotal) * 100) / 100;

  const isUniformRate = gstRatesSet.size === 1;
  const uniformGstRate = isUniformRate ? Array.from(gstRatesSet)[0] : null;

  return {
    totalItems,
    totalQty,
    subTotal: taxableAmount,
    taxableAmount,
    gstRate: uniformGstRate !== null ? uniformGstRate : (totalItems > 0 ? Array.from(gstRatesSet)[0] : 0),
    isUniformRate,
    gstAmount,
    cgstAmount,
    sgstAmount,
    gstSlabs: Object.values(slabs),
    totalAmount: finalAmount,
    roundOff,
    finalAmount,
  };
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
