/**
 * WhatsApp Sharing & Thermal Receipt PDF Engine
 */
import { generateThermalReceiptPdf, downloadThermalReceiptPdf } from './pdf';

/**
 * Format plain text receipt for WhatsApp sharing
 */
export function generateReceiptText(bill, settings) {
  const currency = settings.currency || '₹';
  const divider = '────────────────────────';
  const doubleDivider = '════════════════════════';

  let text = `*${settings.businessName || 'G. V. MILK AGENCY'}*\n`;
  if (settings.address) text += `${settings.address}\n`;
  if (settings.city) text += `${settings.city}\n`;
  if (settings.phone) text += `Mob: ${settings.phone}\n`;
  if (settings.gstin) text += `GSTIN: ${settings.gstin}\n`;

  text += `${doubleDivider}\n`;
  text += `*BILL NO:* ${bill.billNumber}\n`;
  text += `*DATE:* ${bill.date}  *TIME:* ${bill.time || ''}\n`;
  if (bill.customerName) text += `*CUSTOMER:* ${bill.customerName}\n`;
  text += `${divider}\n`;
  text += `*ITEM NAME | QTY | PRICE | AMT*\n`;
  text += `${divider}\n`;

  if (bill.items && bill.items.length > 0) {
    bill.items.forEach((item) => {
      const itemName = (item.name || '').toUpperCase();
      const qty = item.quantity || 1;
      const price = Number(item.rate || 0).toFixed(2);
      const gstNotice = item.gstRate > 0 ? ` (GST ${item.gstRate}%)` : '';
      text += `${itemName}${gstNotice} × ${qty} @ ${currency}${price} = *${currency}${amount}*\n`;
    });
  }

  text += `${divider}\n`;
  text += `*TOTAL ITEM(S):* ${bill.totalItems || bill.items?.length || 0} | *QTY:* ${bill.totalQty || 0}\n`;
  text += `*SUBTOTAL:* ${currency}${Number(bill.subTotal || bill.taxableAmount || (bill.gstAmount ? (bill.currentAmount || bill.totalAmount) - bill.gstAmount : (bill.currentAmount || bill.totalAmount))).toFixed(2)}\n`;

  if (Number(bill.gstAmount || 0) > 0) {
    const cgst = Number(bill.cgstAmount || (Number(bill.gstAmount) / 2)).toFixed(2);
    const sgst = Number(bill.sgstAmount || (Number(bill.gstAmount) / 2)).toFixed(2);
    text += `*GST ${bill.gstRate ? `(${bill.gstRate}%)` : ''}:* +${currency}${Number(bill.gstAmount).toFixed(2)} (CGST ${currency}${cgst} + SGST ${currency}${sgst})\n`;
  }

  text += `*CURRENT BILL:* ${currency}${Number(bill.currentAmount || bill.totalAmount).toFixed(2)}\n`;

  if (Number(bill.previousDue) > 0) {
    text += `*PREVIOUS DUE:* +${currency}${Number(bill.previousDue).toFixed(2)}\n`;
  }

  if (bill.roundOff && bill.roundOff !== 0) {
    text += `*ROUND OFF:* ${currency}${Number(bill.roundOff).toFixed(2)}\n`;
  }

  text += `*TOTAL PAYABLE:* *${currency}${Number(bill.finalAmount || bill.totalAmount).toFixed(2)}*\n`;

  if (bill.paymentStatus) {
    const statusLabel =
      bill.paymentStatus === 'PAID'
        ? 'FULLY PAID'
        : bill.paymentStatus === 'PARTIAL'
        ? 'PARTIALLY PAID'
        : 'UNPAID';
    text += `${divider}\n`;
    text += `*PAYMENT STATUS:* ${statusLabel}\n`;
    text += `*AMOUNT PAID:* ${currency}${Number(bill.paidAmount !== undefined ? bill.paidAmount : bill.finalAmount).toFixed(2)}\n`;
    text += `*BALANCE DUE:* *${currency}${Number(bill.unpaidAmount || 0).toFixed(2)}*\n`;
  }

  text += `${doubleDivider}\n`;
  text += `📄 *Thermal Receipt PDF Attached*\n`;
  text += `✨ *THANK YOU! VISIT AGAIN* ✨`;

  return text;
}

/**
 * Share Thermal Receipt via WhatsApp as a PDF document
 * Preserves authentic thermal format
 */
export async function shareReceiptViaWhatsApp(bill, settings, elementRef = null) {
  const receiptText = generateReceiptText(bill, settings);

  try {
    // 1. Generate the authentic Thermal Receipt PDF
    const { pdfFile, pdfBlob, fileName } = await generateThermalReceiptPdf(bill, settings, elementRef);

    // 2. Try native Web Share API with PDF Document file (works on Android Chrome, iOS Safari, etc.)
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          title: `Bill #${bill.billNumber} - ${settings.businessName || 'Receipt'}`,
          text: receiptText,
          files: [pdfFile],
        });
        return { success: true, method: 'web_share_pdf' };
      } catch (e) {
        if (e.name === 'AbortError') {
          return { success: false, aborted: true };
        }
        console.warn('Web Share failed, falling back to WhatsApp URL with PDF download:', e);
      }
    }

    // 3. Desktop / Unsupported Web Share Fallback:
    // Trigger PDF download for the user so they have the exact thermal PDF file
    const downloadUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 4000);

    // Open WhatsApp with pre-filled message and direct chat
    const encodedText = encodeURIComponent(receiptText);
    let whatsappUrl = `https://wa.me/?text=${encodedText}`;
    if (bill.customerPhone) {
      const cleanPhone = bill.customerPhone.replace(/\D/g, '');
      if (cleanPhone) {
        whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
      }
    }

    window.open(whatsappUrl, '_blank');
    return { success: true, method: 'whatsapp_url_with_pdf_download', downloaded: true };
  } catch (error) {
    console.error('Error generating/sharing PDF receipt:', error);
    // Ultimate fallback to WhatsApp text
    const encodedText = encodeURIComponent(receiptText);
    let whatsappUrl = `https://wa.me/?text=${encodedText}`;
    if (bill.customerPhone) {
      const cleanPhone = bill.customerPhone.replace(/\D/g, '');
      if (cleanPhone) {
        whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
      }
    }
    window.open(whatsappUrl, '_blank');
    return { success: true, method: 'whatsapp_url_text_only' };
  }
}
