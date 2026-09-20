/**
 * Web Bluetooth API & ESC/POS Command Encoder + High-Fidelity Thermal Browser Print
 * Supports 58mm (2-inch, 32 col) and 80mm (3-inch, 48 col) thermal printers.
 */

// Standard Bluetooth Service and Characteristic UUIDs for POS Printers
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Common Chinese POS Printers
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent Service
  '0000e0ff-0000-1000-8000-00805f9b34fb',
];

let bluetoothDevice = null;
let printerCharacteristic = null;

export async function connectBluetoothPrinter() {
  if (!navigator.bluetooth) {
    throw new Error('Web Bluetooth API is not supported in this browser. Please use Chrome on Android or Desktop.');
  }

  try {
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICES,
    });

    const server = await bluetoothDevice.gatt.connect();

    // Search for matching primary service
    let service = null;
    for (const serviceUuid of PRINTER_SERVICES) {
      try {
        service = await server.getPrimaryService(serviceUuid);
        if (service) break;
      } catch (e) {
        // Continue search
      }
    }

    if (!service) {
      const services = await server.getPrimaryServices();
      if (services.length > 0) {
        service = services[0];
      }
    }

    if (!service) {
      throw new Error('No compatible thermal printer service found on this device.');
    }

    // Search for writable characteristic
    const characteristics = await service.getCharacteristics();
    printerCharacteristic = characteristics.find(
      (c) => c.properties.write || c.properties.writeWithoutResponse
    );

    // Fallback: search all services for a writable characteristic if not found
    if (!printerCharacteristic) {
      const allServices = await server.getPrimaryServices();
      for (const s of allServices) {
        try {
          const chars = await s.getCharacteristics();
          const writable = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse);
          if (writable) {
            printerCharacteristic = writable;
            break;
          }
        } catch (e) {
          // Continue
        }
      }
    }

    if (!printerCharacteristic) {
      throw new Error('No writable characteristic found on the printer.');
    }

    return {
      connected: true,
      deviceName: bluetoothDevice.name || 'Bluetooth Thermal Printer',
    };
  } catch (error) {
    console.error('Bluetooth connection error:', error);
    throw error;
  }
}

export function isPrinterConnected() {
  return !!(bluetoothDevice && bluetoothDevice.gatt && bluetoothDevice.gatt.connected && printerCharacteristic);
}

export async function disconnectBluetoothPrinter() {
  if (bluetoothDevice && bluetoothDevice.gatt && bluetoothDevice.gatt.connected) {
    bluetoothDevice.gatt.disconnect();
  }
  bluetoothDevice = null;
  printerCharacteristic = null;
  return true;
}

/**
 * Safely writes a chunk of bytes to a Bluetooth GATT characteristic
 */
async function writeCharacteristicChunk(characteristic, chunk) {
  if (characteristic.properties.writeWithoutResponse && characteristic.writeValueWithoutResponse) {
    await characteristic.writeValueWithoutResponse(chunk);
  } else if (characteristic.writeValueWithResponse) {
    await characteristic.writeValueWithResponse(chunk);
  } else {
    await characteristic.writeValue(chunk);
  }
}

/**
 * Format currency symbol safely for ESC/POS printer hardware
 * ESC/POS thermal printers use CP437/ASCII; Unicode '₹' prints corrupted 'â‚¹' characters.
 */
function cleanCurrencyForEscPos(currency = '₹') {
  if (!currency || currency === '₹') return 'Rs.';
  // If ASCII, keep it; otherwise fallback to Rs.
  return /^[\x20-\x7E]+$/.test(currency) ? currency : 'Rs.';
}

/**
 * ESC/POS Command Builder for Raw Thermal Printing
 */
export class EscPosEncoder {
  constructor(paperWidth = '58mm') {
    this.buffer = [];
    this.paperWidth = paperWidth;
    this.charsPerLine = paperWidth === '80mm' ? 48 : 32;
  }

  // Raw byte push
  addBytes(...bytes) {
    this.buffer.push(...bytes);
    return this;
  }

  // Initialize printer
  init() {
    return this.addBytes(0x1B, 0x40); // ESC @
  }

  // Text alignment: 0=Left, 1=Center, 2=Right
  align(alignment = 0) {
    return this.addBytes(0x1B, 0x61, alignment); // ESC a n
  }

  // Bold text: 1=On, 0=Off
  bold(enable = true) {
    return this.addBytes(0x1B, 0x45, enable ? 1 : 0); // ESC E n
  }

  // Underline
  underline(enable = true) {
    return this.addBytes(0x1B, 0x2D, enable ? 1 : 0); // ESC - n
  }

  // Character size: width & height (0-7)
  fontSize(width = 0, height = 0) {
    const size = (width << 4) | height;
    return this.addBytes(0x1D, 0x21, size); // GS ! n
  }

  // Add plain text with encoding and ASCII normalization for thermal ROM
  text(str = '') {
    // Replace Rupee symbol with Rs. to prevent corrupted characters on thermal ROM
    const normalized = String(str)
      .replace(/₹/g, 'Rs.')
      .replace(/[^\x20-\x7E\n\r\t]/g, ' '); // Replace non-ASCII with space

    const encoder = new TextEncoder();
    const bytes = encoder.encode(normalized);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  // Add line break
  line(str = '') {
    if (str) this.text(str);
    return this.addBytes(0x0A); // LF
  }

  // Divider lines
  divider(char = '-') {
    return this.line(char.repeat(this.charsPerLine));
  }

  doubleDivider() {
    return this.line('='.repeat(this.charsPerLine));
  }

  // Formatted 4-column row for receipts: ITEM NAME | QTY | PRICE | AMOUNT
  tableRow(item, qty, price, amount) {
    const itemWidth = this.charsPerLine === 48 ? 20 : 12;
    const qtyWidth = this.charsPerLine === 48 ? 6 : 4;
    const priceWidth = this.charsPerLine === 48 ? 10 : 7;
    const amountWidth = this.charsPerLine === 48 ? 12 : 9;

    const cleanItem = String(item || '').substring(0, itemWidth).padEnd(itemWidth, ' ');
    const cleanQty = String(qty || '').substring(0, qtyWidth).padStart(qtyWidth, ' ');
    const cleanPrice = String(price || '').substring(0, priceWidth).padStart(priceWidth, ' ');
    const cleanAmount = String(amount || '').substring(0, amountWidth).padStart(amountWidth, ' ');

    return this.line(`${cleanItem}${cleanQty}${cleanPrice}${cleanAmount}`);
  }

  // Two column row with wrapping protection
  twoColumnRow(left, right) {
    const l = String(left || '');
    const r = String(right || '');

    if (l.length + r.length + 1 > this.charsPerLine) {
      const maxL = Math.max(1, this.charsPerLine - r.length - 1);
      const truncatedL = l.substring(0, maxL);
      const spaceCount = Math.max(1, this.charsPerLine - truncatedL.length - r.length);
      return this.line(truncatedL + ' '.repeat(spaceCount) + r);
    }

    const spaceCount = Math.max(1, this.charsPerLine - l.length - r.length);
    return this.line(l + ' '.repeat(spaceCount) + r);
  }

  // Feed paper and cut
  cut() {
    this.addBytes(0x0A, 0x0A, 0x0A, 0x0A); // 4 Line feeds
    return this.addBytes(0x1D, 0x56, 0x41, 0x00); // GS V 65 0 (Full Cut)
  }

  // Get final Uint8Array
  encode() {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Isolated, high-fidelity browser thermal receipt printing
 * Uses a clean hidden iframe to prevent modal clipping, dark-mode styling, or blank-page issues.
 */
export async function printReceiptViaBrowser(bill, settings, elementRef = null) {
  const paperWidth = settings?.paperSize || '58mm';
  // Thermal print heads: 58mm paper has 48mm printable head; 80mm paper has 72mm printable head
  const printableWidthCss = paperWidth === '80mm' ? '72mm' : '48mm';
  const currency = settings?.currency || '₹';

  // Create isolated print iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();

  // Generate Items Table HTML
  let itemsHtml = '';
  if (bill.items && Array.isArray(bill.items)) {
    itemsHtml = bill.items
      .map((item) => {
        const itemTotal = (Number(item.quantity || 0) * Number(item.rate || 0)).toFixed(2);
        return `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5px; font-size: ${paperWidth === '80mm' ? '11.5px' : '10.5px'};">
            <div style="width: 44%; font-weight: 600; text-transform: uppercase; word-break: break-word; padding-right: 2px;">
              ${item.name}
              <span style="display:block; font-size: 8.5px; font-weight: normal; color: #555;">GST: ${item.gstRate !== undefined && item.gstRate !== null ? item.gstRate : 0}%</span>
            </div>
            <div style="width: 16%; text-align: center; font-weight: 500;">
              ${item.quantity} ${item.unit ? `<span style="font-size: 8.5px;">${item.unit}</span>` : ''}
            </div>
            <div style="width: 18%; text-align: right; font-weight: 500;">
              ${Number(item.rate).toFixed(2)}
            </div>
            <div style="width: 22%; text-align: right; font-weight: 700;">
              ${itemTotal}
            </div>
          </div>
        `;
      })
      .join('');
  }

  const gstHtml =
    Number(bill.gstAmount || 0) > 0
      ? `
      <div style="display: flex; justify-content: space-between; font-size: ${paperWidth === '80mm' ? '10.5px' : '9.5px'}; margin-top: 2px;">
        <span>GST ${bill.isUniformRate && bill.gstRate !== undefined ? `(${bill.gstRate}%)` : (bill.gstSlabs?.length > 1 ? `(${bill.gstSlabs.map(s => `${s}%`).join(', ')})` : '')}:</span>
        <span>+${currency}${Number(bill.gstAmount).toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 9px; color: #555; padding-left: 6px;">
        <span>CGST:</span>
        <span>+${currency}${Number(bill.cgstAmount || (Number(bill.gstAmount) / 2)).toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 9px; color: #555; padding-left: 6px;">
        <span>SGST:</span>
        <span>+${currency}${Number(bill.sgstAmount || (Number(bill.gstAmount) / 2)).toFixed(2)}</span>
      </div>
    `
      : `
      <div style="display: flex; justify-content: space-between; font-size: ${paperWidth === '80mm' ? '10px' : '9px'}; color: #666; margin-top: 2px;">
        <span>GST (0% EXEMPT):</span>
        <span>${currency}0.00</span>
      </div>
    `;

  const previousDueHtml =
    Number(bill.previousDue) > 0
      ? `
      <div style="display: flex; justify-content: space-between; font-size: 10.5px; font-weight: 700; margin-top: 2px;">
        <span>PREVIOUS DUE:</span>
        <span>+${currency}${Number(bill.previousDue).toFixed(2)}</span>
      </div>
    `
      : '';

  const roundOffHtml =
    bill.roundOff && bill.roundOff !== 0
      ? `
      <div style="display: flex; justify-content: space-between; font-size: 10.5px; margin-top: 2.5px;">
        <span>ROUND-OFF:</span>
        <span>${currency}${Number(bill.roundOff).toFixed(2)}</span>
      </div>
    `
      : '';

  const paymentDetailsHtml = bill.paymentStatus
    ? `
      <div style="margin-top: 4px; padding-top: 3px; border-top: 1px dotted #000; font-size: ${paperWidth === '80mm' ? '10.5px' : '9.5px'};">
        <div style="display: flex; justify-content: space-between; font-weight: 700;">
          <span>STATUS:</span>
          <span>${bill.paymentStatus === 'PAID' ? 'FULLY PAID' : bill.paymentStatus === 'PARTIAL' ? 'PARTIALLY PAID' : 'UNPAID'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 700;">
          <span>PAID:</span>
          <span>${currency}${Number(bill.paidAmount !== undefined ? bill.paidAmount : bill.finalAmount).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: ${paperWidth === '80mm' ? '11.5px' : '10.5px'};">
          <span>BALANCE DUE:</span>
          <span>${currency}${Number(bill.unpaidAmount || 0).toFixed(2)}</span>
        </div>
      </div>
    `
    : '';

  const logoHtml = settings?.logo
    ? `
      <div style="text-align: center; margin-bottom: 5px;">
        <img src="${settings.logo}" alt="Logo" style="max-height: 44px; max-width: 120px; object-fit: contain; margin: 0 auto; display: block; filter: grayscale(100%) contrast(125%);" />
      </div>
    `
    : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt #${bill.billNumber}</title>
        <style>
          @page {
            size: auto;
            margin: 0mm !important;
          }
          @media print {
            html, body {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              color: #000 !important;
              text-align: center !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-center-container {
              width: 100% !important;
              display: block !important;
              text-align: center !important;
              margin: 0 auto !important;
              padding: 0 !important;
            }
            .receipt-wrapper {
              display: inline-block !important;
              width: ${printableWidthCss} !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              text-align: left !important;
            }
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            width: 100%;
            margin: 0;
            padding: 0;
            background: #fff;
            color: #000;
            text-align: center;
            font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
            -webkit-font-smoothing: antialiased;
          }
          .print-center-container {
            width: 100%;
            text-align: center;
            margin: 0 auto;
            padding: 0;
          }
          .receipt-wrapper {
            display: inline-block;
            text-align: left;
            width: ${printableWidthCss};
            max-width: 100%;
            margin: 0 auto;
            padding: 2.5mm 1.5mm 6mm 1.5mm;
            box-sizing: border-box;
            font-size: ${paperWidth === '80mm' ? '11.5px' : '10.5px'};
            line-height: 1.35;
          }
          .header {
            text-align: center;
            padding-bottom: 5px;
            border-bottom: 1.5px dashed #000;
          }
          .header h2 {
            margin: 0;
            font-size: ${paperWidth === '80mm' ? '14px' : '12px'};
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header p {
            margin: 1.5px 0 0 0;
            font-size: ${paperWidth === '80mm' ? '10.5px' : '9.5px'};
          }
          .meta {
            padding: 4px 0;
            border-bottom: 1px dashed #000;
            font-size: ${paperWidth === '80mm' ? '10.5px' : '9.5px'};
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
          }
          .table-head {
            display: flex;
            justify-content: space-between;
            font-weight: 800;
            padding: 4px 0;
            border-bottom: 1.5px dashed #000;
            font-size: ${paperWidth === '80mm' ? '10.5px' : '9.5px'};
          }
          .items {
            padding: 4px 0;
            border-bottom: 1px dashed #000;
          }
          .summary {
            padding: 4px 0;
            border-bottom: 1.5px dashed #000;
          }
          .footer {
            text-align: center;
            padding-top: 5px;
            font-size: 9.5px;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="print-center-container">
          <div class="receipt-wrapper">
            <div class="header">
              ${logoHtml}
              <h2>${settings?.businessName || 'G. V. MILK AGENCY'}</h2>
              ${settings?.address ? `<p style="font-weight: 600; text-transform: uppercase;">${settings.address}</p>` : ''}
              ${settings?.city ? `<p style="font-weight: 600; text-transform: uppercase;">${settings.city}</p>` : ''}
              ${settings?.phone ? `<p style="font-weight: 700;">MOB. ${settings.phone}</p>` : ''}
              ${settings?.gstin ? `<p style="font-weight: 600;">GSTIN: ${settings.gstin}</p>` : ''}
            </div>

            <div class="meta">
              <div class="meta-row" style="font-weight: 700;">
                <span>BILL NO: ${bill.billNumber}</span>
                <span>DATE: ${bill.date}</span>
              </div>
              <div class="meta-row">
                <span>${bill.customerName ? `CUST: ${bill.customerName}` : ''}</span>
                <span>TIME: ${bill.time}</span>
              </div>
            </div>

            <div class="table-head">
              <div style="width: 44%;">ITEM NAME</div>
              <div style="width: 16%; text-align: center;">QTY</div>
              <div style="width: 18%; text-align: right;">PRICE</div>
              <div style="width: 22%; text-align: right;">AMOUNT</div>
            </div>

            <div class="items">
              ${itemsHtml}
            </div>

            <div class="summary">
              <div style="display: flex; justify-content: space-between; font-size: ${paperWidth === '80mm' ? '10.5px' : '9.5px'};">
                <span>TOTAL ITEMS: ${bill.totalItems || bill.items?.length || 0}</span>
                <span>TOTAL QTY: ${bill.totalQty || 0}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: ${paperWidth === '80mm' ? '11px' : '10px'}; font-weight: 700; margin-top: 2px;">
                <span>SUBTOTAL:</span>
                <span>${currency}${Number(bill.subTotal || bill.taxableAmount || (bill.gstAmount ? (bill.currentAmount || bill.totalAmount) - bill.gstAmount : (bill.currentAmount || bill.totalAmount))).toFixed(2)}</span>
              </div>
              ${gstHtml}
              <div style="display: flex; justify-content: space-between; font-size: ${paperWidth === '80mm' ? '11px' : '10px'}; font-weight: 700; margin-top: 2px; border-top: 1px dotted #ccc; padding-top: 2px;">
                <span>CURRENT BILL:</span>
                <span>${currency}${Number(bill.currentAmount || bill.totalAmount).toFixed(2)}</span>
              </div>
              ${previousDueHtml}
              ${roundOffHtml}
              <div style="display: flex; justify-content: space-between; font-size: ${paperWidth === '80mm' ? '13px' : '12px'}; font-weight: 800; margin-top: 3px; border-top: 1px dashed #000; padding-top: 3px;">
                <span>TOTAL PAYABLE:</span>
                <span>${currency}${Number(bill.finalAmount || bill.totalAmount).toFixed(2)}</span>
              </div>
              ${paymentDetailsHtml}
            </div>

            <div class="footer">
              <div>*** THANK YOU! VISIT AGAIN ***</div>
              <div style="font-size: 8px; font-weight: normal; margin-top: 2px; color: #666;">Universal POS Billing Engine</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  doc.write(htmlContent);
  doc.close();

  // Give fonts and images time to render completely
  await new Promise((resolve) => setTimeout(resolve, 250));

  try {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  } finally {
    setTimeout(() => {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 1500);
  }

  return { success: true, method: 'browser_iframe_print' };
}

/**
 * Print a Bill using Web Bluetooth ESC/POS (if connected) or Isolated Browser Print (fallback)
 */
export async function printThermalReceipt(bill, settings, elementRef = null) {
  const paperWidth = settings?.paperSize || '58mm';

  // Send to Bluetooth Printer if connected
  if (isPrinterConnected() && printerCharacteristic) {
    try {
      const encoder = new EscPosEncoder(paperWidth);
      const escCurrency = cleanCurrencyForEscPos(settings?.currency);

      encoder.init().align(1); // Center header

      const bName = (settings?.businessName || 'G. V. MILK AGENCY').toUpperCase();
      const maxDoubleWidth = paperWidth === '80mm' ? 24 : 16;
      if (bName.length <= maxDoubleWidth) {
        encoder.bold(true).fontSize(1, 1).line(bName).fontSize(0, 0).bold(false);
      } else {
        encoder.bold(true).fontSize(0, 1).line(bName).fontSize(0, 0).bold(false);
      }

      if (settings?.address) encoder.line(settings.address.toUpperCase());
      if (settings?.city) encoder.line(settings.city.toUpperCase());
      if (settings?.phone) encoder.line(`MOB. ${settings.phone}`);
      if (settings?.gstin) encoder.line(`GSTIN: ${settings.gstin}`);

      encoder
        .doubleDivider()
        .align(0) // Left
        .twoColumnRow(`BILL NO: ${bill.billNumber}`, `DATE: ${bill.date}`)
        .twoColumnRow(bill.customerName ? `CUST: ${bill.customerName}` : '', `TIME: ${bill.time}`)
        .divider('-')
        .bold(true)
        .tableRow('ITEM NAME', 'QTY', 'PRICE', 'AMOUNT')
        .bold(false)
        .divider('-');

      // Item Rows with wrapping protection so long names aren't cut off
      const itemWidth = paperWidth === '80mm' ? 20 : 12;
      (bill.items || []).forEach((item) => {
        const itemGst = ` [G:${item.gstRate !== undefined && item.gstRate !== null ? item.gstRate : 0}%]`;
        const itemName = `${item.name}${itemGst}`.toUpperCase();
        const qty = item.quantity;
        const price = Number(item.rate).toFixed(2);
        const amount = (Number(item.quantity) * Number(item.rate)).toFixed(2);

        if (itemName.length > itemWidth) {
          encoder.line(itemName);
          encoder.tableRow('', qty, price, amount);
        } else {
          encoder.tableRow(itemName, qty, price, amount);
        }
      });

      encoder
        .divider('-')
        .bold(true)
        .twoColumnRow(`TOTAL ITEM(S): ${bill.totalItems || bill.items?.length || 0}`, `QTY: ${bill.totalQty || 0}`)
        .twoColumnRow(`SUBTOTAL:`, `${escCurrency}${Number(bill.subTotal || bill.taxableAmount || (bill.gstAmount ? (bill.currentAmount || bill.totalAmount) - bill.gstAmount : (bill.currentAmount || bill.totalAmount))).toFixed(2)}`);

      if (Number(bill.gstAmount || 0) > 0) {
        if (Number(bill.cgstAmount || 0) > 0 || Number(bill.sgstAmount || 0) > 0) {
          encoder.twoColumnRow(`CGST:`, `+${escCurrency}${Number(bill.cgstAmount || (bill.gstAmount / 2)).toFixed(2)}`);
          encoder.twoColumnRow(`SGST:`, `+${escCurrency}${Number(bill.sgstAmount || (bill.gstAmount / 2)).toFixed(2)}`);
        } else {
          encoder.twoColumnRow(`TOTAL GST:`, `+${escCurrency}${Number(bill.gstAmount).toFixed(2)}`);
        }
      } else {
        encoder.twoColumnRow(`GST (0% EXEMPT):`, `${escCurrency}0.00`);
      }

      encoder.twoColumnRow(`CURRENT BILL:`, `${escCurrency}${Number(bill.currentAmount || bill.totalAmount).toFixed(2)}`);

      if (Number(bill.previousDue) > 0) {
        encoder.twoColumnRow(`PREVIOUS DUE:`, `+${escCurrency}${Number(bill.previousDue).toFixed(2)}`);
      }

      if (bill.roundOff && bill.roundOff !== 0) {
        encoder.twoColumnRow(`ROUND-OFF:`, `${escCurrency}${Number(bill.roundOff).toFixed(2)}`);
      }

      encoder
        .bold(true)
        .twoColumnRow(`TOTAL PAYABLE:`, `${escCurrency}${Number(bill.finalAmount || bill.totalAmount).toFixed(2)}`);

      if (bill.paymentStatus) {
        const statusLabel = bill.paymentStatus === 'PAID' ? 'FULLY PAID' : bill.paymentStatus === 'PARTIAL' ? 'PARTIAL PAID' : 'UNPAID';
        encoder
          .divider('-')
          .twoColumnRow(`STATUS:`, statusLabel)
          .twoColumnRow(`AMOUNT PAID:`, `${escCurrency}${Number(bill.paidAmount !== undefined ? bill.paidAmount : bill.finalAmount).toFixed(2)}`)
          .bold(true)
          .twoColumnRow(`BALANCE DUE:`, `${escCurrency}${Number(bill.unpaidAmount || 0).toFixed(2)}`);
      }

      encoder
        .doubleDivider()
        .align(1) // Center
        .bold(true)
        .line('THANK YOU! VISIT AGAIN')
        .bold(false)
        .cut();

      const data = encoder.encode();

      // Send in chunks of 20 bytes for universal BLE MTU compatibility
      const CHUNK_SIZE = 20;
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        await writeCharacteristicChunk(printerCharacteristic, chunk);
        await new Promise((res) => setTimeout(res, 20)); // 20ms delay between packets
      }

      return { success: true, method: 'bluetooth' };
    } catch (bleError) {
      console.warn('Bluetooth print failed, falling back to browser print:', bleError);
      return await printReceiptViaBrowser(bill, settings, elementRef);
    }
  } else {
    // Isolated high-fidelity browser print
    return await printReceiptViaBrowser(bill, settings, elementRef);
  }
}
