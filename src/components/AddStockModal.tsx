import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { soundEngine } from '../lib/soundEngine.ts';
import { formatStockBreakdown, getDrugUnitOptions } from '../lib/unitConversion.ts';
import type { Drug, SaleUnitTier } from '../types/pharmacy.ts';
import { MagneticButton, UiSticker } from './MotionPrimitives.tsx';

interface AddStockModalProps {
  open: boolean;
  drugs: Drug[];
  initialDrugId?: string;
  currencySymbol: string;
  onClose: () => void;
  onRestock: (
    drugId: string,
    payload: {
      quantity: number;
      unitTier?: SaleUnitTier;
      batchNumber?: string;
      expiryDate?: string;
      buyingPrice?: number;
      sellingPrice?: number;
    }
  ) => Promise<void>;
}

export function AddStockModal({
  open,
  drugs,
  initialDrugId,
  currencySymbol,
  onClose,
  onRestock,
}: AddStockModalProps) {
  const [selectedDrugId, setSelectedDrugId] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [unitTier, setUnitTier] = useState<SaleUnitTier>('base');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const firstId = initialDrugId || drugs[0]?.id || '';
    setSelectedDrugId(firstId);
    const chosen = drugs.find((d) => d.id === firstId);
    if (chosen) {
      setBatchNumber(chosen.batchNumber);
      setExpiryDate(chosen.expiryDate);
      setBuyingPrice(chosen.buyingPrice !== undefined ? String(chosen.buyingPrice) : '');
      setSellingPrice(String(chosen.sellingPrice));
      setUnitTier((chosen.packsPerBox ?? 1) > 1 ? 'box' : 'base');
    }
    setQuantity('10');
  }, [open, initialDrugId, drugs]);

  function handleSelectDrug(id: string) {
    setSelectedDrugId(id);
    const chosen = drugs.find((d) => d.id === id);
    if (chosen) {
      setBatchNumber(chosen.batchNumber);
      setExpiryDate(chosen.expiryDate);
      setBuyingPrice(chosen.buyingPrice !== undefined ? String(chosen.buyingPrice) : '');
      setSellingPrice(String(chosen.sellingPrice));
      setUnitTier((chosen.packsPerBox ?? 1) > 1 ? 'box' : 'base');
    }
  }

  if (!open) return null;

  const selectedDrug = drugs.find((d) => d.id === selectedDrugId);
  const unitOptions = selectedDrug ? getDrugUnitOptions(selectedDrug) : [];
  const activeOption = unitOptions.find((o) => o.tier === unitTier) ?? unitOptions[0];
  const baseToAdd = Math.max(0, Math.floor(Number(quantity) || 0)) * (activeOption?.multiplier ?? 1);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDrugId) return;
    setError(null);
    setSaving(true);
    try {
      await onRestock(selectedDrugId, {
        quantity: Math.floor(Number(quantity)),
        unitTier,
        batchNumber: batchNumber.trim() || undefined,
        expiryDate: expiryDate.trim() || undefined,
        buyingPrice: buyingPrice ? Number(buyingPrice) : undefined,
        sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
      });
      soundEngine.playSaleComplete();
      onClose();
    } catch (err) {
      soundEngine.playWarning();
      setError(err instanceof Error ? err.message : 'Failed to add stock.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto yoya-scroll-contain"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        className="w-full max-w-lg apple-surface yoya-modal-panel outline-none rounded-[26px] shadow-2xl overflow-hidden"
      >
        <div className="apple-glass flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-blue-500/10 dark:border-cyan-400/12">
          <div className="flex items-center gap-2.5 min-w-0">
            <UiSticker kind="inventory" className="w-9 h-9 rounded-xl" />
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold truncate">Add New Stock</h3>
              <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
                Restock by Box, Strip, or Base Unit with automatic conversion.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full apple-inset hover:opacity-80 shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto yoya-scroll-contain">
          <div>
            <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
              Select Medicine *
            </label>
            <select
              required
              value={selectedDrugId}
              onChange={(e) => handleSelectDrug(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm font-medium"
            >
              {drugs.map((d) => (
                <option key={d.id} value={d.id} className="bg-white dark:bg-[#13161B]">
                  {d.name} ({d.strength}) — Stock: {d.stock}
                </option>
              ))}
            </select>
          </div>

          {selectedDrug && (
            <div className="p-3.5 rounded-2xl apple-inset flex items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-semibold">{formatStockBreakdown(selectedDrug)}</p>
                <p className="text-[#5B6470] dark:text-[#98A2AE] mt-0.5">
                  Reorder alert below {selectedDrug.lowStockThreshold}
                </p>
              </div>
              <span className="font-mono tabular-nums font-bold text-sm text-[#0D6E52] dark:text-[#22C58B]">
                +{baseToAdd}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Restock Unit *
              </label>
              <select
                value={unitTier}
                onChange={(e) => setUnitTier(e.target.value as SaleUnitTier)}
                className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm"
              >
                {unitOptions.map((opt) => (
                  <option key={opt.tier} value={opt.tier} className="bg-white dark:bg-[#13161B]">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Quantity Received *
              </label>
              <input
                type="number"
                required
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Batch / Lot Number
              </label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Buying / Base Unit ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={buyingPrice}
                onChange={(e) => setBuyingPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Selling / Base Unit ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm font-mono tabular-nums"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] rounded-xl apple-inset text-xs font-semibold"
            >
              Cancel
            </button>
            <MagneticButton
              type="submit"
              disabled={saving || drugs.length === 0}
              className="px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Confirm Restock'}
            </MagneticButton>
          </div>
        </form>
      </div>
    </div>
  );
}
