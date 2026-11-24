import React, { useMemo, useState } from 'react';
import { Download, Eye, FileCheck2, Receipt, Search, X } from 'lucide-react';
import { downloadDataUrlOrAsset } from '../lib/api.ts';
import { formatClinicDate } from '../lib/ethiopianCalendar.ts';
import { soundEngine } from '../lib/soundEngine.ts';
import type { CalendarMode, Language, PaymentMethod, Transaction } from '../types/pharmacy.ts';
import { UiSticker } from './MotionPrimitives.tsx';

interface OwnerTransactionsProps {
  transactions: Transaction[];
  currencySymbol: string;
  calendarMode: CalendarMode;
  language: Language;
  exportsLocked?: boolean;
  onOpenReceipt: (txn: Transaction) => void;
}

export function OwnerTransactions({
  transactions,
  currencySymbol,
  calendarMode,
  language,
  exportsLocked = false,
  onOpenReceipt,
}: OwnerTransactionsProps) {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | PaymentMethod>('all');
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const cur = currencySymbol;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (methodFilter !== 'all' && t.paymentMethod !== methodFilter) return false;
      if (!q) return true;
      return (
        t.receiptNumber.toLowerCase().includes(q) ||
        t.cashierName.toLowerCase().includes(q) ||
        (t.patientReference ?? '').toLowerCase().includes(q) ||
        t.items.some((i) => i.drugName.toLowerCase().includes(q))
      );
    });
  }, [transactions, search, methodFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 min-w-0">
        <UiSticker kind="profit" className="w-11 h-11 rounded-2xl hidden sm:flex" />
        <div className="min-w-0">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">Transaction & Compliance Audit Log</h2>
          <p className="text-xs sm:text-sm text-[#526077] dark:text-[#93A8C8]">
            Inspect every cashier sale, net profit per order, split payments, payment message screenshots, and prescription uploads.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 sm:p-4 apple-surface rounded-[24px]">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6470] dark:text-[#98A2AE]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search receipt #, cashier, drug, or patient..."
            className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-2xl apple-inset text-sm outline-none"
          />
        </div>

        <div className="grid grid-cols-5 sm:flex items-center gap-1 p-1 rounded-2xl apple-inset w-full sm:w-auto">
          {(['all', 'cash', 'transfer', 'card', 'split'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                soundEngine.playTap();
                setMethodFilter(m);
              }}
              className={`px-1.5 sm:px-3 py-2 min-h-[38px] rounded-xl text-[11px] sm:text-xs font-semibold capitalize transition-all text-center truncate ${
                methodFilter === m
                  ? 'apple-surface shadow-sm text-[#111827] dark:text-[#F5F7FA]'
                  : 'text-[#5B6470] dark:text-[#98A2AE]'
              }`}
            >
              {m === 'transfer' ? 'Transfer' : m}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Transaction Cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((txn) => (
          <div key={txn.id} className="apple-surface rounded-[22px] p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-xs font-bold text-[#111827] dark:text-[#F5F7FA] truncate">
                  {txn.receiptNumber}
                  {txn.syncedFromOffline && (
                    <span className="ml-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      · Offline Synced
                    </span>
                  )}
                </p>
                <p className="text-[11px] font-mono text-[#5B6470] dark:text-[#98A2AE]">
                  {formatClinicDate(txn.createdAt, calendarMode, language, true)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono tabular-nums font-bold text-sm">
                  {txn.totalAmount.toFixed(2)} {cur}
                </p>
                <p className="text-[11px] font-mono tabular-nums font-semibold text-[#0D6E52] dark:text-[#22C58B]">
                  +{(txn.totalProfit ?? 0).toFixed(2)} {cur}
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl apple-inset space-y-1 text-xs">
              <p className="font-medium break-words">
                {txn.items.map((i) => `${i.drugName} (${i.quantity} ${i.unitLabel || 'unit'})`).join(', ')}
              </p>
              <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE]">
                Cashier: <strong className="text-[#111827] dark:text-[#F5F7FA]">{txn.cashierName}</strong>
                {txn.patientReference ? ` · ${txn.patientReference}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-medium capitalize">
                {txn.paymentMethod === 'split'
                  ? `Split: Cash ${(txn.splitCashAmount ?? 0).toFixed(0)} + ${(txn.splitSecondMethod || 'transfer').toUpperCase()} ${(txn.splitNonCashAmount ?? 0).toFixed(0)} ${cur}`
                  : txn.paymentMethod === 'transfer'
                    ? 'Mobile / Bank Transfer'
                    : txn.paymentMethod}
              </span>

              <div className="flex items-center gap-2">
                {txn.paymentProofImage && (
                  <span className="inline-flex items-center gap-1 text-[#0D6E52] dark:text-[#22C58B] font-semibold">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    Pay Proof
                  </span>
                )}
                {txn.prescriptionImage && (
                  <span className="inline-flex items-center gap-1 text-[#B97716] dark:text-[#E5A93C] font-semibold">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    Rx Photo
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.07]">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  setSelectedTxn(txn);
                }}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 min-h-[42px] rounded-xl apple-inset text-xs font-semibold"
              >
                <Eye className="w-3.5 h-3.5" />
                Audit Order
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  onOpenReceipt(txn);
                }}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 min-h-[42px] rounded-xl bg-[#0D6E52]/10 dark:bg-[#22C58B]/15 text-[#0D6E52] dark:text-[#22C58B] text-xs font-semibold"
              >
                <Receipt className="w-3.5 h-3.5" />
                Receipt
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="apple-surface rounded-[22px] py-12 text-center text-sm text-[#5B6470] dark:text-[#98A2AE]">
            No transactions match your filter.
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block apple-surface rounded-[24px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] text-[#5B6470] dark:text-[#98A2AE]">
                <th className="py-3.5 px-4 font-semibold">Receipt & Time</th>
                <th className="py-3.5 px-4 font-semibold">Cashier</th>
                <th className="py-3.5 px-4 font-semibold">Medicines Dispensed</th>
                <th className="py-3.5 px-4 font-semibold">Payment</th>
                <th className="py-3.5 px-4 font-semibold">Attachments</th>
                <th className="py-3.5 px-4 font-semibold text-right">Total</th>
                <th className="py-3.5 px-4 font-semibold text-right">Profit</th>
                <th className="py-3.5 px-4 font-semibold text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
              {filtered.map((txn) => (
                <tr key={txn.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-mono tabular-nums">
                    <p className="font-semibold text-[#111827] dark:text-[#F5F7FA]">
                      {txn.receiptNumber}
                      {txn.syncedFromOffline && (
                        <span className="ml-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          · Offline Synced
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE]">
                      {formatClinicDate(txn.createdAt, calendarMode, language, true)}
                    </p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-sm">{txn.cashierName}</p>
                    {txn.patientReference && (
                      <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE]">{txn.patientReference}</p>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-medium">
                      {txn.items
                        .map((i) => `${i.drugName} (${i.quantity} ${i.unitLabel || 'unit'})`)
                        .join(', ')}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 font-medium">
                    {txn.paymentMethod === 'split' ? (
                      <div className="font-mono tabular-nums">
                        <p className="font-semibold">Split Pay</p>
                        <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE]">
                          Cash {(txn.splitCashAmount ?? 0).toFixed(0)} + {(txn.splitSecondMethod || 'transfer').toUpperCase()}{' '}
                          {(txn.splitNonCashAmount ?? 0).toFixed(0)} {cur}
                        </p>
                      </div>
                    ) : (
                      <span className="capitalize">
                        {txn.paymentMethod === 'transfer' ? 'Mobile / Bank Transfer' : txn.paymentMethod}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2 text-[11px]">
                      {txn.paymentProofImage && (
                        <span className="inline-flex items-center gap-1 text-[#0D6E52] dark:text-[#22C58B] font-semibold">
                          <FileCheck2 className="w-3.5 h-3.5" />
                          Pay Proof
                        </span>
                      )}
                      {txn.prescriptionImage && (
                        <span className="inline-flex items-center gap-1 text-[#B97716] dark:text-[#E5A93C] font-semibold">
                          <FileCheck2 className="w-3.5 h-3.5" />
                          Rx Photo
                        </span>
                      )}
                      {!txn.paymentProofImage && !txn.prescriptionImage && (
                        <span className="text-[#5B6470] dark:text-[#98A2AE]">—</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-sm">
                    {txn.totalAmount.toFixed(2)} {cur}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#0D6E52] dark:text-[#22C58B]">
                    +{(txn.totalProfit ?? 0).toFixed(2)} {cur}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playTap();
                          setSelectedTxn(txn);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl apple-inset text-xs font-medium hover:opacity-80"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Audit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playTap();
                          onOpenReceipt(txn);
                        }}
                        className="p-1.5 rounded-xl apple-inset hover:opacity-80"
                        title="Open Receipt"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-[#5B6470] dark:text-[#98A2AE]">
                    No transactions match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Drawer Modal */}
      {selectedTxn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto yoya-scroll-contain"
          onClick={() => setSelectedTxn(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            className="w-full max-w-2xl my-6 apple-surface yoya-modal-panel outline-none rounded-[28px] shadow-2xl overflow-hidden"
          >
            <div className="apple-glass flex items-center justify-between px-4 sm:px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="min-w-0">
                <h3 className="font-display text-base sm:text-lg font-bold truncate">
                  Audit · {selectedTxn.receiptNumber}
                </h3>
                <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] truncate">
                  Cashier: {selectedTxn.cashierName} · {formatClinicDate(selectedTxn.createdAt, calendarMode, language, true)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="p-2.5 min-h-[42px] min-w-[42px] flex items-center justify-center rounded-full apple-inset hover:opacity-80 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[80vh] overflow-y-auto yoya-scroll-contain">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="p-3.5 rounded-2xl apple-inset">
                  <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">Total Collected</p>
                  <p className="font-mono tabular-nums text-lg font-bold mt-1">
                    {selectedTxn.totalAmount.toFixed(2)} {cur}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl apple-inset">
                  <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">Wholesale Drug Cost</p>
                  <p className="font-mono tabular-nums text-lg font-bold mt-1">
                    {(selectedTxn.totalCost ?? 0).toFixed(2)} {cur}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl apple-inset">
                  <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">Gross Profit</p>
                  <p className="font-mono tabular-nums text-lg font-bold mt-1 text-[#0D6E52] dark:text-[#22C58B]">
                    +{(selectedTxn.totalProfit ?? 0).toFixed(2)} {cur}
                  </p>
                </div>
              </div>

              {selectedTxn.paymentMethod === 'split' && (
                <div className="p-3.5 rounded-2xl apple-inset flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
                  <span className="font-semibold">Split Payment Allocation:</span>
                  <span>
                    Cash: {(selectedTxn.splitCashAmount ?? 0).toFixed(2)} {cur} ·{' '}
                    {(selectedTxn.splitSecondMethod || 'transfer').toUpperCase()}:{' '}
                    {(selectedTxn.splitNonCashAmount ?? 0).toFixed(2)} {cur}
                  </span>
                </div>
              )}

              <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="apple-inset text-[#5B6470] dark:text-[#98A2AE]">
                    <tr>
                      <th className="py-2.5 px-3 font-medium">Drug</th>
                      <th className="py-2.5 px-3 font-medium text-right">Qty / Unit</th>
                      <th className="py-2.5 px-3 font-medium text-right">Base Cost</th>
                      <th className="py-2.5 px-3 font-medium text-right">Tier Sell</th>
                      <th className="py-2.5 px-3 font-medium text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
                    {selectedTxn.items.map((item, idx) => (
                      <tr key={`${item.drugId}_${item.unitTier ?? 'base'}_${idx}`}>
                        <td className="py-2.5 px-3 font-medium">
                          {item.drugName} ({item.strength})
                          {item.requiresPrescription && (
                            <span className="ml-1.5 text-amber-700 dark:text-amber-300 font-semibold">· Rx</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {item.quantity} {item.unitLabel || 'unit'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {(item.unitBuyingPrice ?? 0).toFixed(2)} {cur}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {item.unitSellingPrice.toFixed(2)} {cur}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                          {item.lineTotal.toFixed(2)} {cur}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl apple-inset">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-semibold">Payment Confirmation Proof</p>
                    {selectedTxn.paymentProofImage && !exportsLocked && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playTap();
                          void downloadDataUrlOrAsset(
                            selectedTxn.paymentProofImage!,
                            `${selectedTxn.receiptNumber}-payment-proof.jpg`
                          );
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-[11px] font-semibold"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    )}
                  </div>
                  {selectedTxn.paymentProofImage ? (
                    <img
                      src={selectedTxn.paymentProofImage}
                      alt="Payment proof"
                      className="w-full h-48 object-contain rounded-xl bg-black/10"
                    />
                  ) : (
                    <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] py-8 text-center">
                      {selectedTxn.paymentMethod === 'cash'
                        ? 'Paid in Cash (no transfer screenshot required).'
                        : 'No payment image attached.'}
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-2xl apple-inset">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-semibold">Prescription Image Verification</p>
                    {selectedTxn.prescriptionImage && !exportsLocked && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playTap();
                          void downloadDataUrlOrAsset(
                            selectedTxn.prescriptionImage!,
                            `${selectedTxn.receiptNumber}-prescription.jpg`
                          );
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-[11px] font-semibold"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    )}
                  </div>
                  {selectedTxn.prescriptionImage ? (
                    <img
                      src={selectedTxn.prescriptionImage}
                      alt="Prescription proof"
                      className="w-full h-48 object-contain rounded-xl bg-black/10"
                    />
                  ) : (
                    <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] py-8 text-center">
                      No prescription required for items in this order.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
