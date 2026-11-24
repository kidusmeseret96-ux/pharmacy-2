import React from 'react';
import { Download, Printer, X } from 'lucide-react';
import { downloadCanvasPng } from '../lib/api.ts';
import { formatClinicDate } from '../lib/ethiopianCalendar.ts';
import { soundEngine } from '../lib/soundEngine.ts';
import type { ClinicSettings, Language, Transaction } from '../types/pharmacy.ts';
import { YoyaPharmacyEmblem, YoyaWordmark } from './MedicineIcon.tsx';

interface ReceiptModalProps {
  transaction: Transaction | null;
  settings: ClinicSettings;
  language: Language;
  exportsLocked?: boolean;
  onClose: () => void;
}

export function ReceiptModal({
  transaction,
  settings,
  language,
  exportsLocked = false,
  onClose,
}: ReceiptModalProps) {
  if (!transaction) return null;

  const cur = settings.currencySymbol;
  const calMode = settings.calendarMode || 'both';

  function downloadReceiptPng() {
    if (!transaction || exportsLocked) return;
    soundEngine.playTap();
    const width = 620;
    const height = Math.max(540, 380 + transaction.items.length * 46);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#0D6E52';
    ctx.fillRect(0, 0, width, 12);

    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillText((settings.clinicName || 'YOYA Pharmacy').slice(0, 34), width / 2, 58, width - 64);

    ctx.fillStyle = '#526077';
    ctx.font = '14px monospace';
    ctx.fillText(
      `${settings.licenseNumber ? `License ${settings.licenseNumber} · ` : ''}${transaction.receiptNumber}`,
      width / 2,
      86,
      width - 64
    );
    ctx.fillText(formatClinicDate(transaction.createdAt, calMode, language, true), width / 2, 110, width - 64);
    ctx.fillText(`Cashier: ${transaction.cashierName}`, width / 2, 134, width - 64);

    ctx.strokeStyle = '#CBD5E1';
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(40, 156);
    ctx.lineTo(width - 40, 156);
    ctx.stroke();
    ctx.setLineDash([]);

    let y = 190;
    ctx.textAlign = 'left';
    for (const item of transaction.items) {
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      const safeName = item.drugName.length > 36 ? `${item.drugName.slice(0, 35)}…` : item.drugName;
      ctx.fillText(safeName, 40, y, 360);

      ctx.textAlign = 'right';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`${item.lineTotal.toFixed(2)} ${cur}`, width - 40, y);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748B';
      ctx.font = '13px monospace';
      ctx.fillText(
        `${item.quantity} ${item.unitLabel || 'unit'} × ${item.unitSellingPrice.toFixed(2)} ${cur} (${item.strength})`,
        40,
        y + 20,
        width - 80
      );
      y += 46;
    }

    ctx.strokeStyle = '#CBD5E1';
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(40, y + 6);
    ctx.lineTo(width - 40, y + 6);
    ctx.stroke();
    ctx.setLineDash([]);

    y += 38;
    ctx.fillStyle = '#526077';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Subtotal', 40, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${transaction.subtotal.toFixed(2)} ${cur}`, width - 40, y);

    y += 24;
    ctx.textAlign = 'left';
    ctx.fillText(`Tax (${settings.taxRatePercent}%)`, 40, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${transaction.taxAmount.toFixed(2)} ${cur}`, width - 40, y);

    y += 34;
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Total (${transaction.paymentMethod.toUpperCase()})`, 40, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${transaction.totalAmount.toFixed(2)} ${cur}`, width - 40, y);

    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'center';
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillText(settings.receiptFooter || '', width / 2, height - 30, width - 64);

    downloadCanvasPng(canvas, `${transaction.receiptNumber}.png`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto yoya-scroll-contain"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        className="w-full max-w-md my-4 sm:my-8 apple-surface yoya-modal-panel outline-none rounded-[28px] shadow-2xl overflow-hidden"
      >
        <div className="no-print apple-glass flex items-center justify-between gap-2 px-4 sm:px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <h3 className="font-display text-base font-bold truncate">Dispensing Receipt</h3>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={exportsLocked}
              onClick={downloadReceiptPng}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full apple-inset text-xs font-semibold disabled:opacity-45"
              title={exportsLocked ? 'Exports locked by software vendor' : 'Download PNG Receipt'}
            >
              <Download className="w-3.5 h-3.5" />
              PNG
            </button>
            <button
              type="button"
              disabled={exportsLocked}
              onClick={() => {
                if (!exportsLocked) window.print();
              }}
              title={exportsLocked ? 'Printing locked by software vendor' : 'Print Receipt'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-xs font-semibold shadow-sm disabled:opacity-45"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-full apple-inset hover:opacity-80"
              aria-label="Close receipt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5 text-sm max-h-[78vh] overflow-y-auto yoya-scroll-contain">
          <div className="text-center space-y-1.5 border-b border-dashed border-black/15 dark:border-white/15 pb-4">
            <YoyaPharmacyEmblem className="w-12 h-12 mx-auto" />
            <div className="flex justify-center">
              <YoyaWordmark size="sm" showTagline customName={settings.clinicName} />
            </div>
            <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
              License {settings.licenseNumber} · {transaction.receiptNumber}
            </p>
            <p className="text-xs font-mono tabular-nums text-[#5B6470] dark:text-[#98A2AE]">
              {formatClinicDate(transaction.createdAt, calMode, language, true)}
            </p>
            <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
              Cashier: {transaction.cashierName}
              {transaction.syncedFromOffline ? ' · Synced Offline' : ''}
            </p>
            {transaction.patientReference && (
              <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
                Patient / Ref: {transaction.patientReference}
              </p>
            )}
          </div>

          <div className="space-y-2.5">
            {transaction.items.map((item, idx) => (
              <div key={`${item.drugId}_${item.unitTier ?? 'base'}_${idx}`} className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">
                    {item.drugName}
                    {item.requiresPrescription && (
                      <span className="ml-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        · Rx
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] font-mono tabular-nums">
                    {item.quantity} {item.unitLabel || 'unit'} × {item.unitSellingPrice.toFixed(2)} {cur} ({item.strength})
                  </p>
                </div>
                <span className="font-mono tabular-nums font-semibold">
                  {item.lineTotal.toFixed(2)} {cur}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-black/15 dark:border-white/15 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-[#5B6470] dark:text-[#98A2AE]">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{transaction.subtotal.toFixed(2)} {cur}</span>
            </div>
            <div className="flex justify-between text-[#5B6470] dark:text-[#98A2AE]">
              <span>Tax ({settings.taxRatePercent}%)</span>
              <span className="font-mono tabular-nums">{transaction.taxAmount.toFixed(2)} {cur}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-1">
              <span>
                Total Paid ({transaction.paymentMethod === 'split'
                  ? `SPLIT: CASH + ${(transaction.splitSecondMethod || 'transfer').toUpperCase()}`
                  : transaction.paymentMethod.toUpperCase()})
              </span>
              <span className="font-mono tabular-nums">{transaction.totalAmount.toFixed(2)} {cur}</span>
            </div>

            {transaction.paymentMethod === 'split' && (
              <div className="flex justify-between text-[#5B6470] dark:text-[#98A2AE] font-mono tabular-nums">
                <span>Split Breakdown</span>
                <span>
                  Cash {(transaction.splitCashAmount ?? 0).toFixed(2)} {cur} +{' '}
                  {(transaction.splitSecondMethod || 'transfer').toUpperCase()}{' '}
                  {(transaction.splitNonCashAmount ?? 0).toFixed(2)} {cur}
                </span>
              </div>
            )}

            {transaction.cashTendered !== undefined && (
              <div className="flex justify-between text-[#5B6470] dark:text-[#98A2AE]">
                <span>Cash Tendered / Change</span>
                <span className="font-mono tabular-nums">
                  {transaction.cashTendered.toFixed(2)} {cur} / {(transaction.changeDue ?? 0).toFixed(2)} {cur}
                </span>
              </div>
            )}
          </div>

          {(transaction.paymentProofImage || transaction.prescriptionImage) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              {transaction.paymentProofImage && (
                <div>
                  <p className="text-[11px] font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                    Payment Message Proof
                  </p>
                  <img
                    src={transaction.paymentProofImage}
                    alt="Payment proof"
                    className="w-full h-24 object-cover rounded-xl border border-black/[0.06] dark:border-white/[0.08]"
                  />
                </div>
              )}
              {transaction.prescriptionImage && (
                <div>
                  <p className="text-[11px] font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                    Prescription Image
                  </p>
                  <img
                    src={transaction.prescriptionImage}
                    alt="Prescription"
                    className="w-full h-24 object-cover rounded-xl border border-black/[0.06] dark:border-white/[0.08]"
                  />
                </div>
              )}
            </div>
          )}

          <p className="text-center text-xs text-[#5B6470] dark:text-[#98A2AE] pt-2 border-t border-dashed border-black/15 dark:border-white/15">
            {settings.receiptFooter}
          </p>
        </div>
      </div>
    </div>
  );
}
