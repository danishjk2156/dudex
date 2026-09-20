/**
 * Thermal Receipt PDF Generator
 * Renders thermal receipts with 100% authentic styling into PDF documents
 */
import html2canvas from 'html2canvas';

/**
 * Generates an offscreen DOM element matching the exact ThermalReceipt format
 */
function createOffscreenReceiptElement(bill, settings) {
  const currency = settings?.currency || '₹';
  const container = document.createElement('div');

  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.width = '320px';
  container.style.backgroundColor = '#faf9f6';
  container.style.color = '#1a1a1a';
  container.style.fontFamily = "'JetBrains Mono', 'Courier New', monospace";
  container.style.fontSize = '12px';
  container.style.padding = '16px';
  container.style.boxSizing = 'border-box';
  container.style.border = '1px solid #d6d3d1';

  let itemsHtml = '';
  if (bill.items && bill.items.length > 0) {
    itemsHtml = bill.items
      .map((item) => {
        const name = (item.name || '').toUpperCase();
        const qty = item.quantity || 1;
        const rate = Number(item.rate || 0).toFixed(2);
        const amount = (Number(qty) * Number(rate)).toFixed(2);

        return `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; line-height: 1.2;">
          <div style="width: 50%; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${name}
            <div style="font-size: 8.5px; font-weight: normal; color: #78716c;">GST: ${item.gstRate !== undefined && item.gstRate !== null ? item.gstRate : 0}%</div>
          </div>
          <div style="width: 15%; text-align: center; font-weight: bold;">${qty}</div>
          <div style="width: 17%; text-align: right; color: #44403c;">${rate}</div>
          <div style="width: 18%; text-align: right; font-weight: bold;">${amount}</div>
        </div>
      `;
      })
      .join('');
  }

  const gstHtml =
    Number(bill.gstAmount || 0) > 0
      ? `
    <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #1c1917; margin-top: 3px;">
      <span>GST ${bill.isUniformRate && bill.gstRate !== undefined ? `(${bill.gstRate}%)` : (bill.gstSlabs?.length > 1 ? `(${bill.gstSlabs.map((s) => `${s}%`).join(', ')})` : '')}:</span>
      <span>+${currency}${Number(bill.gstAmount).toFixed(2)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 10px; color: #57534e; padding-left: 8px;">
      <span>CGST:</span>
      <span>+${currency}${Number(bill.cgstAmount || (Number(bill.gstAmount) / 2)).toFixed(2)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 10px; color: #57534e; padding-left: 8px;">
      <span>SGST:</span>
      <span>+${currency}${Number(bill.sgstAmount || (Number(bill.gstAmount) / 2)).toFixed(2)}</span>
    </div>
  `
      : `
    <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #1c1917; margin-top: 3px;">
      <span>GST (0% EXEMPT):</span>
      <span>${currency}0.00</span>
    </div>
  `;

  const previousDueHtml =
    Number(bill.previousDue) > 0
      ? `
    <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #1c1917; margin-top: 3px;">
      <span>PREVIOUS DUE:</span>
      <span>+${currency}${Number(bill.previousDue).toFixed(2)}</span>
    </div>
  `
      : '';

  const roundOffHtml =
    bill.roundOff && bill.roundOff !== 0
      ? `
    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #44403c; margin-top: 3px;">
      <span>ROUND-OFF:</span>
      <span>${currency}${Number(bill.roundOff).toFixed(2)}</span>
    </div>
  `
      : '';

  const paymentDetailsHtml = bill.paymentStatus
    ? `
    <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dotted #78716c; font-size: 11px;">
      <div style="display: flex; justify-content: space-between; font-weight: bold; color: #292524;">
        <span>STATUS:</span>
        <span style="font-weight: 800;">${bill.paymentStatus === 'PAID' ? 'FULLY PAID' : bill.paymentStatus === 'PARTIAL' ? 'PARTIALLY PAID' : 'UNPAID'}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: bold; color: #1c1917; margin-top: 2px;">
        <span>PAID:</span>
        <span>${currency}${Number(bill.paidAmount !== undefined ? bill.paidAmount : bill.finalAmount).toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 12px; color: #000; margin-top: 2px;">
        <span>BALANCE DUE:</span>
        <span>${currency}${Number(bill.unpaidAmount || 0).toFixed(2)}</span>
      </div>
    </div>
  `
    : '';

  container.innerHTML = `
    <!-- Header -->
    <div style="text-align: center; padding-bottom: 8px; border-bottom: 2px dashed #292524;">
      ${
        settings?.logo
          ? `<div style="text-align: center; margin-bottom: 6px;">
               <img src="${settings.logo}" alt="Logo" style="max-height: 48px; max-width: 140px; object-fit: contain; margin: 0 auto; display: block;" />
             </div>`
          : ''
      }
      <h2 style="margin: 0; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
        ${settings?.businessName || 'G. V. MILK AGENCY'}
      </h2>
      ${
        settings?.address
          ? `<p style="margin: 2px 0 0 0; font-size: 11px; font-weight: 600; color: #292524; text-transform: uppercase;">${settings.address}</p>`
          : ''
      }
      ${
        settings?.city
          ? `<p style="margin: 1px 0 0 0; font-size: 11px; font-weight: 600; color: #292524; text-transform: uppercase;">${settings.city}</p>`
          : ''
      }
      ${
        settings?.phone
          ? `<p style="margin: 3px 0 0 0; font-size: 11px; font-weight: 700; color: #1c1917;">MOB. ${settings.phone}</p>`
          : ''
      }
      ${
        settings?.gstin
          ? `<p style="margin: 2px 0 0 0; font-size: 10px; font-weight: 600; color: #44403c;">GSTIN: ${settings.gstin}</p>`
          : ''
      }
    </div>

    <!-- Bill Meta -->
    <div style="padding: 8px 0; border-bottom: 1px dashed #44403c; font-size: 11px;">
      <div style="display: flex; justify-content: space-between; font-weight: bold;">
        <span>BILL NO: ${bill.billNumber}</span>
        <span>DATE: ${bill.date}</span>
      </div>
      <div style="display: flex; justify-content: space-between; color: #292524; margin-top: 2px;">
        <span>${bill.customerName ? `CUST: ${bill.customerName}` : ''}</span>
        <span>TIME: ${bill.time || ''}</span>
      </div>
    </div>

    <!-- Table Header -->
    <div style="padding: 6px 0; border-bottom: 2px dashed #292524; font-size: 10px; font-weight: bold;">
      <div style="display: flex; justify-content: space-between;">
        <span style="width: 50%;">ITEM NAME</span>
        <span style="width: 15%; text-align: center;">QTY</span>
        <span style="width: 17%; text-align: right;">PRICE</span>
        <span style="width: 18%; text-align: right;">AMOUNT</span>
      </div>
    </div>

    <!-- Items -->
    <div style="padding: 8px 0; border-bottom: 2px dashed #292524; font-size: 11px;">
      ${itemsHtml}
    </div>

    <!-- Summary -->
    <div style="padding: 8px 0; border-bottom: 2px dashed #292524; font-size: 11px;">
      <div style="display: flex; justify-content: space-between; font-weight: bold; color: #1c1917;">
        <span>TOTAL ITEM(S): ${bill.totalItems || bill.items?.length || 0}</span>
        <span>QTY: ${bill.totalQty || 0}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: bold; color: #1c1917; margin-top: 3px;">
        <span>SUBTOTAL:</span>
        <span>${currency}${Number(bill.subTotal || bill.taxableAmount || (bill.gstAmount ? (bill.currentAmount || bill.totalAmount) - bill.gstAmount : (bill.currentAmount || bill.totalAmount))).toFixed(2)}</span>
      </div>
      ${gstHtml}
      <div style="display: flex; justify-content: space-between; font-weight: bold; color: #1c1917; margin-top: 3px; border-top: 1px dotted #78716c; padding-top: 3px;">
        <span>CURRENT BILL:</span>
        <span>${currency}${Number(bill.currentAmount || bill.totalAmount).toFixed(2)}</span>
      </div>
      ${previousDueHtml}
      ${roundOffHtml}
      <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 800; color: #000; margin-top: 4px; border-top: 1px dashed #292524; padding-top: 4px;">
        <span>TOTAL PAYABLE:</span>
        <span>${currency}${Number(bill.finalAmount || bill.totalAmount).toFixed(2)}</span>
      </div>
      ${paymentDetailsHtml}
    </div>

    <!-- Footer -->
    <div style="padding-top: 12px; padding-bottom: 4px; text-align: center; font-size: 10px; font-weight: bold; letter-spacing: 1px; color: #292524; text-transform: uppercase;">
      <p style="margin: 0; border-top: 1px dotted #78716c; padding-top: 4px;">═════════════════════════</p>
      <p style="margin: 4px 0; font-size: 11px; font-weight: 800;">THANK YOU! VISIT AGAIN</p>
      <p style="margin: 0;">═════════════════════════</p>
    </div>
  `;

  return container;
}

/**
 * Creates a compliant PDF 1.4 binary array from a JPEG ArrayBuffer
 */
function buildThermalPdfBinary(jpegBytes, widthPt, heightPt, imageWidth, imageHeight) {
  const enc = new TextEncoder();
  const chunks = [];
  let byteOffset = 0;
  const offsets = [];

  function addChunk(strOrBytes) {
    const b = typeof strOrBytes === 'string' ? enc.encode(strOrBytes) : strOrBytes;
    chunks.push(b);
    byteOffset += b.byteLength;
  }

  function recordObj(objNum) {
    offsets[objNum] = byteOffset;
    addChunk(`${objNum} 0 obj\n`);
  }

  // PDF Header with binary identification bytes
  addChunk(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));

  // Object 1: Catalog
  recordObj(1);
  addChunk('<<\n  /Type /Catalog\n  /Pages 2 0 R\n>>\nendobj\n');

  // Object 2: Pages
  recordObj(2);
  addChunk('<<\n  /Type /Pages\n  /Kids [3 0 R]\n  /Count 1\n>>\nendobj\n');

  // Object 3: Page (Custom Thermal paper aspect ratio)
  recordObj(3);
  addChunk(`<<\n  /Type /Page\n  /Parent 2 0 R\n  /MediaBox [0 0 ${widthPt.toFixed(2)} ${heightPt.toFixed(2)}]\n  /Resources <<\n    /XObject <<\n      /Im0 4 0 R\n    >>\n    /ProcSet [/PDF /ImageC]\n  >>\n  /Contents 5 0 R\n>>\nendobj\n`);

  // Object 4: Image XObject (JPEG stream)
  recordObj(4);
  addChunk(`<<\n  /Type /XObject\n  /Subtype /Image\n  /Width ${imageWidth}\n  /Height ${imageHeight}\n  /ColorSpace /DeviceRGB\n  /BitsPerComponent 8\n  /Filter /DCTDecode\n  /Length ${jpegBytes.byteLength}\n>>\nstream\n`);
  addChunk(jpegBytes);
  addChunk('\nendstream\nendobj\n');

  // Object 5: Content stream (Draw image fitting exact thermal roll page)
  const contentStream = `q\n${widthPt.toFixed(2)} 0 0 ${heightPt.toFixed(2)} 0 0 cm\n/Im0 Do\nQ\n`;
  const contentBytes = enc.encode(contentStream);

  recordObj(5);
  addChunk(`<<\n  /Length ${contentBytes.byteLength}\n>>\nstream\n`);
  addChunk(contentBytes);
  addChunk('endstream\nendobj\n');

  // Cross-reference table
  const startXref = byteOffset;
  addChunk('xref\n0 6\n');
  addChunk('0000000000 65535 f \r\n');
  for (let i = 1; i <= 5; i++) {
    const offStr = String(offsets[i]).padStart(10, '0');
    addChunk(`${offStr} 00000 n \r\n`);
  }

  // Trailer
  addChunk(`trailer\n<<\n  /Size 6\n  /Root 1 0 R\n>>\nstartxref\n${startXref}\n%%EOF\n`);

  // Concatenate all chunks into a single Uint8Array
  const totalLength = chunks.reduce((acc, c) => acc + c.byteLength, 0);
  const pdfBytes = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    pdfBytes.set(chunk, pos);
    pos += chunk.byteLength;
  }

  return pdfBytes;
}

/**
 * Capture receipt DOM element or create offscreen element to generate high-res canvas
 */
export async function captureReceiptCanvas(bill, settings, elementRef) {
  let targetElement = elementRef;
  let isTemp = false;

  if (!targetElement) {
    targetElement = createOffscreenReceiptElement(bill, settings);
    document.body.appendChild(targetElement);
    isTemp = true;
  }

  try {
    const canvas = await html2canvas(targetElement, {
      scale: 3, // 3x scale for ultra-crisp thermal typography
      backgroundColor: '#faf9f6',
      useCORS: true,
      logging: false,
    });
    return canvas;
  } finally {
    if (isTemp && targetElement && targetElement.parentNode) {
      targetElement.parentNode.removeChild(targetElement);
    }
  }
}

/**
 * Generates an authentic Thermal Receipt PDF matching the exact receipt format
 * @param {Object} bill
 * @param {Object} settings
 * @param {HTMLElement} [elementRef]
 * @returns {Promise<{ pdfBlob: Blob, pdfUrl: string, pdfFile: File, fileName: string }>}
 */
export async function generateThermalReceiptPdf(bill, settings, elementRef = null) {
  const canvas = await captureReceiptCanvas(bill, settings, elementRef);
  if (!canvas) {
    throw new Error('Could not capture receipt canvas');
  }

  // Convert canvas to high-quality JPEG binary
  const jpegBlob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to convert canvas to blob'));
      },
      'image/jpeg',
      0.96
    );
  });

  const jpegBuffer = await jpegBlob.arrayBuffer();
  const jpegBytes = new Uint8Array(jpegBuffer);

  // Standard 80mm thermal receipt width in points (1 mm = ~2.83465 pt)
  // 80mm * 2.83465 ≈ 226.77 pt
  const widthPt = 226.77;
  const heightPt = widthPt * (canvas.height / canvas.width);

  // Build standard PDF 1.4 binary
  const pdfBytes = buildThermalPdfBinary(
    jpegBytes,
    widthPt,
    heightPt,
    canvas.width,
    canvas.height
  );

  const fileName = `Bill_${bill.billNumber || 'Receipt'}.pdf`;
  const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

  return {
    pdfBlob,
    pdfUrl,
    pdfFile,
    fileName,
  };
}

/**
 * Direct download helper for the thermal receipt PDF
 */
export async function downloadThermalReceiptPdf(bill, settings, elementRef = null) {
  const { pdfBlob, fileName } = await generateThermalReceiptPdf(bill, settings, elementRef);
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  return { success: true, fileName };
}
