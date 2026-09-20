import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { ThermalReceipt } from './ThermalReceipt';
import {
  X,
  Printer,
  Share2,
  Download,
  CheckCircle2,
  PlusCircle,
  Loader2,
  FileDown,
  Edit2,
} from 'lucide-react';
import { printThermalReceipt } from '../../lib/printer';
import { downloadThermalReceiptPdf, shareThermalReceiptViaWhatsApp } from '../../lib/receiptPdf';
import { animateReceiptEjection, animateTactilePress } from '../../lib/animations';
import { EditBillModal } from '../billing/EditBillModal';

export function ReceiptModal() {
  const { generatedBill, setGeneratedBill, settings, showToast, setActivePage, updateBill } = useApp();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const receiptRef = useRef(null);
  const slotRef = useRef(null);

  // Trigger Realistic GSAP Thermal Receipt Ejection on Modal Open
  useEffect(() => {
    if (generatedBill && receiptRef.current && slotRef.current) {
      animateReceiptEjection(receiptRef.current, slotRef.current);
    }
  }, [generatedBill]);

  if (!generatedBill) return null;

  // Print Handler
  const handlePrint = async (e) => {
    if (e) animateTactilePress(e);
    setIsPrinting(true);
    try {
      showToast('Opening thermal print dialog...', 'info');
      const res = await printThermalReceipt(generatedBill, settings, receiptRef.current);
      if (res?.method === 'bluetooth') {
        showToast('Sent to Bluetooth Thermal Printer', 'success');
      } else {
        showToast('Thermal receipt ready to print', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Print failed: ' + err.message, 'error');
    } finally {
      setIsPrinting(false);
    }
  };

  // WhatsApp Share Handler
  const handleWhatsAppShare = async (e) => {
    if (e) animateTactilePress(e);
    setIsSharing(true);
    try {
      showToast('Preparing PDF receipt for WhatsApp...', 'info');
      const res = await shareThermalReceiptViaWhatsApp(generatedBill, settings, generatedBill.customerPhone);
      if (res && res.success) {
        showToast('WhatsApp opened with receipt link & summary', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Share error: ' + err.message, 'error');
    } finally {
      setIsSharing(false);
    }
  };

  // Download PDF Handler
  const handleDownloadPdf = async (e) => {
    if (e) animateTactilePress(e);
    setIsDownloading(true);
    try {
      showToast('Generating high-resolution thermal PDF...', 'info');
      const res = await downloadThermalReceiptPdf(generatedBill, settings, null);
      if (res && res.success) {
        showToast(`Downloaded ${res.fileName}`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('PDF download failed: ' + err.message, 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCreateAnotherBill = (e) => {
    if (e) animateTactilePress(e);
    setGeneratedBill(null);
    setActivePage('billing');
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-modal-pop">
      <div className="relative w-full max-w-sm bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] p-4 sm:p-5 my-auto max-h-[94vh] flex flex-col transition-colors">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E2E2A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-display font-black text-[#0F172A] dark:text-white leading-tight">
                Receipt #{generatedBill.billNumber}
              </h3>
              <p className="type-caption text-slate-500 dark:text-slate-400">Thermal POS Print Preview</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                animateTactilePress(e);
                setIsEditing(true);
              }}
              title="Update / Edit Bill"
              className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-200 font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] hover:bg-slate-200 dark:hover:bg-[#162220] transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Update</span>
            </button>
            <button
              onClick={() => setGeneratedBill(null)}
              className="text-slate-400 hover:text-[#0F172A] dark:hover:text-white p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#162220] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thermal Dispenser Slot & Ejection Preview Area */}
        <div className="flex-1 overflow-y-auto py-3 px-1 flex flex-col items-center justify-start bg-slate-100/70 dark:bg-[#0A1110] rounded-xl my-3 border border-[#E2E8F0] dark:border-[#1E2E2A] relative thermal-slot-frame">
          {/* Printer Dispenser Slot */}
          <div ref={slotRef} className="thermal-dispenser-slot shrink-0" title="Thermal Printer Ejection Slot"></div>

          {/* Animated Ejection Receipt Centered */}
          <div className="w-full flex justify-center items-center">
            <ThermalReceipt ref={receiptRef} bill={generatedBill} settings={settings} />
          </div>
        </div>

        {/* Action Buttons Dock */}
        <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E2E2A] flex flex-col gap-2 shrink-0">
          <div className="grid grid-cols-4 gap-2 text-center">
            {/* 1. Save PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading || isSharing}
              className="glass-card flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl hover:bg-slate-100 dark:hover:bg-[#162220] border border-[#E2E8F0] dark:border-[#1E2E2A] transition-all active:scale-95 cursor-pointer"
            >
              {isDownloading ? (
                <Loader2 className="w-5 h-5 text-slate-600 dark:text-slate-400 animate-spin" />
              ) : (
                <FileDown className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              )}
              <span className="type-caption font-bold text-[#0F172A] dark:text-white">Save</span>
            </button>

            {/* 2. WhatsApp Share */}
            <button
              onClick={handleWhatsAppShare}
              disabled={isSharing || isDownloading}
              className="glass-card flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 transition-all active:scale-95 cursor-pointer group"
            >
              {isSharing ? (
                <Loader2 className="w-5 h-5 text-[#059669] animate-spin" />
              ) : (
                <Share2 className="w-5 h-5 text-[#059669] group-hover:scale-110 transition-transform" />
              )}
              <span className="type-caption font-bold text-[#059669] dark:text-[#34D399]">Share</span>
            </button>

            {/* 3. Thermal Print (PRIMARY ACTION ACCENT) */}
            <button
              onClick={handlePrint}
              disabled={isPrinting || isSharing}
              className="btn-primary-action flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl transition-all active:scale-95 cursor-pointer group shadow-sm"
            >
              {isPrinting ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Printer className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
              )}
              <span className="type-caption font-bold text-white">Print</span>
            </button>

            {/* 4. New Bill */}
            <button
              onClick={handleCreateAnotherBill}
              className="btn-secondary-action flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl text-slate-700 dark:text-slate-200 shadow-xs transition-all active:scale-95 cursor-pointer group"
            >
              <PlusCircle className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:scale-110 transition-transform" />
              <span className="type-caption font-bold text-slate-700 dark:text-slate-200">New Bill</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit / Update Bill Modal */}
      {isEditing && (
        <EditBillModal
          bill={generatedBill}
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          onSave={async (updatedData) => {
            await updateBill(updatedData);
            setIsEditing(false);
          }}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
