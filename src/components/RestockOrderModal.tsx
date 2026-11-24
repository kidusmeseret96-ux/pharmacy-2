import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ClipboardCopy,
  Download,
  FileSpreadsheet,
  Lock,
  Plus,
  Printer,
  Trash2,
  X,
} from 'lucide-react';
import { downloadCanvasPng } from '../lib/api.ts';
import { formatClinicDate, getEffectiveNow } from '../lib/ethiopianCalendar.ts';
import { soundEngine } from '../lib/soundEngine.ts';
import { formatStockBreakdown, getDrugUnitOptions, getUnitMultiplier, getUnitShortLabel } from '../lib/unitConversion.ts';
import type {
  CalendarMode,
  Drug,
  DrugKind,
  Language,
  SaleUnitTier,
  Supplier,
} from '../types/pharmacy.ts';
import { MedicineIcon, resolveDrugKind } from './MedicineIcon.tsx';

interface RestockOrderModalProps {
  open: boolean;
  drugs: Drug[];
  drugKinds: DrugKind[];
  suppliers?: Supplier[];
  clinicName: string;
  currencySymbol: string;
  calendarMode: CalendarMode;
  dateOffsetDays: number;
  language: Language;
  exportsLocked?: boolean;
  onClose: () => void;
}

interface OrderLine {
  drugId: string;
  included: boolean;
  qty: number;
  unitTier: SaleUnitTier;
}

function getSuggestedLine(drug: Drug): OrderLine {
  const unitsPerPack = Math.max(1, Math.floor(drug.unitsPerPack ?? 1));
  const packsPerBox = Math.max(1, Math.floor(drug.packsPerBox ?? 1));
  const targetBase = Math.max(10, drug.lowStockThreshold * 3 - drug.stock);

  if (packsPerBox > 1) {
    const boxMult = unitsPerPack * packsPerBox;
    const boxes = Math.max(1, Math.ceil(targetBase / boxMult));
    return { drugId: drug.id, included: true, qty: boxes, unitTier: 'box' };
  }
  if (unitsPerPack > 1) {
    const packs = Math.max(1, Math.ceil(targetBase / unitsPerPack));
    return { drugId: drug.id, included: true, qty: packs, unitTier: 'pack' };
  }
  return {
    drugId: drug.id,
    included: true,
    qty: Math.max(10, targetBase),
    unitTier: 'base',
  };
}

export function RestockOrderModal({
  open,
  drugs,
  drugKinds,
  suppliers = [],
  clinicName,
  currencySymbol,
  calendarMode,
  dateOffsetDays,
  language,
  exportsLocked = false,
  onClose,
}: RestockOrderModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [includeExpiring, setIncludeExpiring] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [extraDrugId, setExtraDrugId] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [copied, setCopied] = useState(false);

  const cur = currencySymbol;
  const effectiveNow = useMemo(() => getEffectiveNow(dateOffsetDays), [dateOffsetDays]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus({ preventScroll: true });

    const expiringThresholdMs = effectiveNow.getTime() + 45 * 24 * 60 * 60 * 1000;
    const candidates = drugs
      .filter((d) => {
        const isLow = d.stock <= d.lowStockThreshold;
        const isExp = includeExpiring && new Date(d.expiryDate).getTime() <= expiringThresholdMs;
        return isLow || isExp;
      })
      .sort((a, b) => {
        if (a.stock === 0 && b.stock > 0) return -1;
        if (b.stock === 0 && a.stock > 0) return 1;
        return a.stock - b.stock;
      });

    setLines(candidates.map(getSuggestedLine));
    setCopied(false);
  }, [open, drugs, includeExpiring, effectiveNow]);

  const drugById = useMemo(() => {
    const map = new Map<string, Drug>();
    for (const d of drugs) map.set(d.id, d);
    return map;
  }, [drugs]);

  const resolvedRows = useMemo(() => {
    return lines
      .map((line) => {
        const drug = drugById.get(line.drugId);
        if (!drug) return null;
        const mult = getUnitMultiplier(drug, line.unitTier);
        const baseUnits = Math.max(0, line.qty) * mult;
        const unitLabel = getUnitShortLabel(drug, line.unitTier);
        const unitCost = (drug.buyingPrice ?? 0) * mult;
        const estCost = Number((Math.max(0, line.qty) * unitCost).toFixed(2));
        return { line, drug, mult, baseUnits, unitLabel, unitCost, estCost };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [lines, drugById]);

  const selectedRows = useMemo(
    () => resolvedRows.filter((r) => r.line.included && r.line.qty > 0),
    [resolvedRows]
  );

  const totalEstimatedCost = useMemo(
    () => Number(selectedRows.reduce((sum, r) => sum + r.estCost, 0).toFixed(2)),
    [selectedRows]
  );

  const remainingCatalogDrugs = useMemo(() => {
    const inList = new Set(lines.map((l) => l.drugId));
    return drugs.filter((d) => !inList.has(d.id));
  }, [drugs, lines]);

  if (!open) return null;

  const dateLabel = formatClinicDate(effectiveNow, calendarMode, language);

  function updateLine(drugId: string, patch: Partial<OrderLine>) {
    setLines((prev) => prev.map((l) => (l.drugId === drugId ? { ...l, ...patch } : l)));
  }

  function removeLine(drugId: string) {
    setLines((prev) => prev.filter((l) => l.drugId !== drugId));
  }

  function addExtraMedicine() {
    if (!extraDrugId) return;
    const drug = drugById.get(extraDrugId);
    if (!drug) return;
    soundEngine.playTap();
    setLines((prev) => [...prev, getSuggestedLine(drug)]);
    setExtraDrugId('');
  }

  function buildOrderText(): string {
    const header = [
      `${clinicName || 'YOYA Pharmacy'} — RESTOCK PURCHASE ORDER`,
      `Date: ${dateLabel}`,
      supplierName.trim() ? `Supplier: ${supplierName.trim()}` : null,
      orderNote.trim() ? `Note: ${orderNote.trim()}` : null,
      '----------------------------------------',
    ]
      .filter(Boolean)
      .join('\n');

    const body = selectedRows
      .map(
        (r, i) =>
          `${i + 1}. ${r.drug.name} (${r.drug.strength}) — Order: ${r.line.qty} ${r.unitLabel} (${r.baseUnits} ${r.drug.baseUnitName || 'units'}) | In stock: ${r.drug.stock}${r.estCost > 0 ? ` | Est: ${r.estCost.toFixed(2)} ${cur}` : ''}`
      )
      .join('\n');

    const footer = [
      '----------------------------------------',
      `Items: ${selectedRows.length}`,
      `Estimated Wholesale Total: ${totalEstimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`,
    ].join('\n');

    return `${header}\n${body || 'No medicines selected.'}\n${footer}`;
  }

  async function handleCopyText() {
    if (selectedRows.length === 0) return;
    soundEngine.playTap();
    try {
      await navigator.clipboard.writeText(buildOrderText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  }

  function handleDownloadPng() {
    if (exportsLocked || selectedRows.length === 0) return;
    soundEngine.playTap();

    const width = 920;
    const rowHeight = 56;
    const headerHeight = 180;
    const footerHeight = 120;
    const height = Math.max(460, headerHeight + selectedRows.length * rowHeight + footerHeight);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Top accent bar
    ctx.fillStyle = '#1464F6';
    ctx.fillRect(0, 0, width, 14);

    // Header
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'left';
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${(clinicName || 'YOYA Pharmacy').slice(0, 38)} — Restock Order Sheet`, 42, 62);

    ctx.fillStyle = '#475569';
    ctx.font = '14px monospace';
    ctx.fillText(`Date: ${dateLabel}`, 42, 90);
    if (supplierName.trim()) {
      ctx.fillText(`Supplier: ${supplierName.trim().slice(0, 48)}`, 42, 112);
    }
    if (orderNote.trim()) {
      ctx.fillText(`Note: ${orderNote.trim().slice(0, 70)}`, 42, 134);
    }

    // Table header bar
    const tableTop = 152;
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(42, tableTop, width - 84, 34);
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText('#  Medicine & Strength', 54, tableTop + 22);
    ctx.fillText('Current Stock', 440, tableTop + 22);
    ctx.fillText('Order Qty', 595, tableTop + 22);
    ctx.textAlign = 'right';
    ctx.fillText(`Est. Cost (${cur})`, width - 54, tableTop + 22);

    let y = tableTop + 56;
    selectedRows.forEach((r, idx) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      const title = `${idx + 1}. ${r.drug.name} (${r.drug.strength})`.slice(0, 40);
      ctx.fillText(title, 54, y);

      ctx.fillStyle = '#64748B';
      ctx.font = '12px monospace';
      ctx.fillText(
        `${r.drug.manufacturer || 'Supplier'} · Alert <= ${r.drug.lowStockThreshold}`,
        54,
        y + 18
      );

      ctx.fillStyle = r.drug.stock === 0 ? '#DC2626' : '#B45309';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`${r.drug.stock} ${r.drug.baseUnitName || 'unit'}`, 440, y + 6);

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`${r.line.qty} ${r.unitLabel}`, 595, y + 4);
      ctx.fillStyle = '#64748B';
      ctx.font = '11px monospace';
      ctx.fillText(`(${r.baseUnits} base)`, 595, y + 20);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(r.estCost.toFixed(2), width - 54, y + 6);

      ctx.strokeStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.moveTo(42, y + 32);
      ctx.lineTo(width - 42, y + 32);
      ctx.stroke();

      y += rowHeight;
    });

    // Summary footer
    ctx.textAlign = 'left';
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Total Line Items: ${selectedRows.length}`, 42, y + 28);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0D6E52';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(
      `Estimated Wholesale Total: ${totalEstimatedCost.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${cur}`,
      width - 42,
      y + 28
    );

    const stamp = effectiveNow.toISOString().slice(0, 10);
    downloadCanvasPng(canvas, `yoya-restock-order-${stamp}.png`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto yoya-scroll-contain"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl my-4 sm:my-8 apple-surface yoya-modal-panel outline-none rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header Bar */}
        <div className="no-print apple-glass flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#1464F6]/12 dark:bg-cyan-400/15 text-[#1464F6] dark:text-[#22D3EE] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base sm:text-lg font-bold truncate">
                One-Click Supplier Restock Order Sheet
              </h3>
              <p className="text-xs text-[#526077] dark:text-[#93A8C8] truncate">
                Auto-built from low-stock thresholds ({selectedRows.length} selected) · {dateLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={selectedRows.length === 0}
              onClick={() => void handleCopyText()}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl apple-inset text-xs font-semibold disabled:opacity-45"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#0D6E52] dark:text-[#22C58B]" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy List'}
            </button>

            <button
              type="button"
              disabled={exportsLocked || selectedRows.length === 0}
              onClick={handleDownloadPng}
              title={exportsLocked ? 'Exports locked by software vendor' : 'Download PNG Order Sheet'}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl apple-inset text-xs font-semibold disabled:opacity-45"
            >
              {exportsLocked ? <Lock className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              PNG
            </button>

            <button
              type="button"
              disabled={exportsLocked || selectedRows.length === 0}
              onClick={() => {
                soundEngine.playTap();
                window.print();
              }}
              title={exportsLocked ? 'Exports locked by software vendor' : 'Print Order Sheet'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl yoya-btn-primary text-white text-xs font-semibold disabled:opacity-45"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-full apple-inset hover:opacity-80"
              aria-label="Close restock sheet"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Sheet Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto yoya-scroll-contain flex-1">
          {exportsLocked && (
            <div className="no-print p-3 rounded-2xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              PNG downloads & printing are temporarily locked by the vendor. You can still review and copy the text list.
            </div>
          )}

          {/* Printable Sheet Header (shown in print) */}
          <div className="hidden print:block border-b border-black/20 pb-3 mb-4">
            <h2 className="text-xl font-bold">{clinicName || 'YOYA Pharmacy'} — Supplier Restock Order</h2>
            <p className="text-xs font-mono">
              Date: {dateLabel}
              {supplierName.trim() ? ` · Supplier: ${supplierName.trim()}` : ''}
            </p>
            {orderNote.trim() && <p className="text-xs mt-1">Note: {orderNote.trim()}</p>}
          </div>

          {/* Controls Row */}
          <div className="no-print grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 rounded-2xl apple-inset">
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                Supplier / Wholesaler
              </label>
              <input
                type="text"
                list="yoya-supplier-suggestions"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. EPSS / Private Importer..."
                className="w-full px-3 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs outline-none"
              />
              {suppliers.length > 0 && (
                <datalist id="yoya-supplier-suggestions">
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.phone ? `${s.name} (${s.phone})` : s.name} />
                  ))}
                </datalist>
              )}
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                Delivery / Order Note
              </label>
              <input
                type="text"
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="Urgent batch / call on arrival..."
                className="w-full px-3 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs outline-none"
              />
            </div>

            <div className="sm:col-span-4 flex flex-col justify-end gap-2">
              <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer px-3 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08]">
                <input
                  type="checkbox"
                  checked={includeExpiring}
                  onChange={(e) => setIncludeExpiring(e.target.checked)}
                  className="accent-[#1464F6]"
                />
                Include expiring within 45 days
              </label>
            </div>

            {remainingCatalogDrugs.length > 0 && (
              <div className="sm:col-span-12 flex flex-wrap items-center gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                <select
                  value={extraDrugId}
                  onChange={(e) => setExtraDrugId(e.target.value)}
                  className="flex-1 min-w-[200px] px-3 py-2 min-h-[38px] rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs outline-none"
                >
                  <option value="">Add another catalog medicine to this order...</option>
                  {remainingCatalogDrugs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.strength}) — Stock: {d.stock} {d.baseUnitName || 'units'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!extraDrugId}
                  onClick={addExtraMedicine}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-xs font-semibold disabled:opacity-45"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Item
                </button>
              </div>
            )}
          </div>

          {resolvedRows.length === 0 ? (
            <div className="py-12 text-center space-y-2 rounded-2xl apple-inset">
              <AlertTriangle className="w-8 h-8 mx-auto text-[#0D6E52] dark:text-[#22C58B]" />
              <p className="text-sm font-semibold">No medicines are currently below threshold.</p>
              <p className="text-xs text-[#526077] dark:text-[#93A8C8]">
                Use &ldquo;Add another catalog medicine&rdquo; above if you still want to prepare a supplier order.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {resolvedRows.map(({ line, drug, baseUnits, unitLabel, estCost }) => {
                const unitOptions = getDrugUnitOptions(drug);
                const isOut = drug.stock === 0;
                const { label: kindLabel } = resolveDrugKind(drug.dosageForm, drugKinds);

                return (
                  <div
                    key={drug.id}
                    className={`p-3.5 rounded-2xl border transition-opacity ${
                      line.included
                        ? 'apple-inset border-black/[0.06] dark:border-white/[0.08]'
                        : 'opacity-50 apple-inset border-transparent'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={line.included}
                          onChange={(e) => updateLine(drug.id, { included: e.target.checked })}
                          className="no-print mt-1 w-4 h-4 accent-[#1464F6] shrink-0 cursor-pointer"
                          aria-label={`Include ${drug.name}`}
                        />
                        <MedicineIcon
                          form={drug.dosageForm}
                          drugKinds={drugKinds}
                          className="w-5 h-5 text-[#1464F6] dark:text-[#22D3EE] shrink-0 mt-0.5"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold truncate">{drug.name}</p>
                            <span className="text-xs text-[#526077] dark:text-[#93A8C8]">
                              {drug.strength} · {kindLabel}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                                isOut
                                  ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                                  : 'bg-amber-500/15 text-[#B97716] dark:text-[#E5A93C]'
                              }`}
                            >
                              {isOut ? 'Out of Stock' : 'Low Stock'}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono tabular-nums text-[#526077] dark:text-[#93A8C8] mt-0.5">
                            On shelf: {formatStockBreakdown(drug)} · Alert &le; {drug.lowStockThreshold} · Buy Cost:{' '}
                            {(drug.buyingPrice ?? 0).toFixed(2)} {cur}/{drug.baseUnitName || 'unit'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] font-medium text-[#526077] dark:text-[#93A8C8] sr-only">
                            Qty
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={100000}
                            value={line.qty}
                            onChange={(e) =>
                              updateLine(drug.id, {
                                qty: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                              })
                            }
                            className="w-20 px-2.5 py-2 min-h-[38px] rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.08] dark:border-white/[0.1] text-xs font-mono font-bold text-center outline-none"
                          />
                          <select
                            value={line.unitTier}
                            onChange={(e) =>
                              updateLine(drug.id, { unitTier: e.target.value as SaleUnitTier })
                            }
                            className="px-2.5 py-2 min-h-[38px] rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.08] dark:border-white/[0.1] text-xs font-semibold outline-none"
                          >
                            {unitOptions.map((opt) => (
                              <option key={opt.tier} value={opt.tier}>
                                {getUnitShortLabel(drug, opt.tier)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="text-right min-w-[110px]">
                          <p className="font-mono tabular-nums text-xs font-bold text-[#0D6E52] dark:text-[#22C58B]">
                            {estCost.toFixed(2)} {cur}
                          </p>
                          <p className="text-[10px] font-mono text-[#526077] dark:text-[#93A8C8]">
                            +{baseUnits} {drug.baseUnitName || 'unit'} ({unitLabel})
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeLine(drug.id)}
                          aria-label={`Remove ${drug.name}`}
                          className="no-print p-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Summary Footer */}
        <div className="apple-glass px-4 sm:px-6 py-3.5 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-medium text-[#526077] dark:text-[#93A8C8]">
            Selected Items: <strong className="font-mono text-[#0F172A] dark:text-[#F0F6FF]">{selectedRows.length}</strong>
          </span>
          <div className="flex items-center gap-2 font-mono tabular-nums">
            <span className="text-[#526077] dark:text-[#93A8C8]">Estimated Wholesale Budget:</span>
            <strong className="text-base font-bold text-[#0D6E52] dark:text-[#22C58B]">
              {totalEstimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {cur}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
