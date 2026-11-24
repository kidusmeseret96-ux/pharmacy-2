import React, { useMemo, useState } from 'react';
import { AlertTriangle, Edit3, FileSpreadsheet, Lock, MapPin, PackagePlus, Plus, Search, Snowflake, Trash2, X } from 'lucide-react';
import { formatClinicDate } from '../lib/ethiopianCalendar.ts';
import { soundEngine } from '../lib/soundEngine.ts';
import { formatStockBreakdown } from '../lib/unitConversion.ts';
import type { CalendarMode, Drug, DrugKind, DrugKindIconKey, Language } from '../types/pharmacy.ts';
import { DrugThumbnail, MedicineIcon, resolveDrugKind } from './MedicineIcon.tsx';
import { MagneticButton, UiSticker } from './MotionPrimitives.tsx';

interface OwnerInventoryProps {
  drugs: Drug[];
  drugKinds: DrugKind[];
  currencySymbol: string;
  calendarMode: CalendarMode;
  language: Language;
  canDelete: boolean;
  inventoryWriteLocked?: boolean;
  onAddDrug: () => void;
  onOpenAddStock: (initialDrugId?: string) => void;
  onOpenRestockSheet?: () => void;
  onCreateDrugKind: (payload: { label: string; unitLabel?: string; iconKey?: DrugKindIconKey }) => Promise<DrugKind>;
  onUpdateDrugKind?: (id: string, payload: { label?: string; unitLabel?: string; iconKey?: DrugKindIconKey }) => Promise<DrugKind>;
  onDeleteDrugKind?: (id: string) => Promise<void>;
  onEditDrug: (drug: Drug) => void;
  onDeleteDrug: (drug: Drug) => Promise<void>;
}

export function OwnerInventory({
  drugs,
  drugKinds,
  currencySymbol,
  calendarMode,
  language,
  canDelete,
  inventoryWriteLocked = false,
  onAddDrug,
  onOpenAddStock,
  onOpenRestockSheet,
  onCreateDrugKind,
  onUpdateDrugKind,
  onDeleteDrugKind,
  onEditDrug,
  onDeleteDrug,
}: OwnerInventoryProps) {
  const [search, setSearch] = useState('');
  const [formFilter, setFormFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'rx' | 'otc' | 'low'>('all');
  const [showKindModal, setShowKindModal] = useState(false);
  const [editingKindId, setEditingKindId] = useState<string | null>(null);
  const [kindLabel, setKindLabel] = useState('');
  const [kindUnit, setKindUnit] = useState('Packs');
  const [kindIcon, setKindIcon] = useState<DrugKindIconKey>('box');
  const [kindError, setKindError] = useState<string | null>(null);

  const cur = currencySymbol;
  const lowStockCount = useMemo(
    () => drugs.filter((d) => d.stock <= d.lowStockThreshold).length,
    [drugs]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drugs.filter((d) => {
      if (formFilter !== 'all' && d.dosageForm !== formFilter) return false;
      if (statusFilter === 'rx' && !d.requiresPrescription) return false;
      if (statusFilter === 'otc' && d.requiresPrescription) return false;
      if (statusFilter === 'low' && d.stock > d.lowStockThreshold) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.genericName.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.barcode.toLowerCase().includes(q) ||
        (d.shelfLocation ?? '').toLowerCase().includes(q)
      );
    });
  }, [drugs, search, formFilter, statusFilter]);

  function resetKindForm() {
    setEditingKindId(null);
    setKindLabel('');
    setKindUnit('Packs');
    setKindIcon('box');
    setKindError(null);
  }

  async function handleSaveKind(e: React.FormEvent) {
    e.preventDefault();
    if (!kindLabel.trim()) return;
    setKindError(null);
    try {
      if (editingKindId && onUpdateDrugKind) {
        await onUpdateDrugKind(editingKindId, {
          label: kindLabel.trim(),
          unitLabel: kindUnit.trim() || 'Units',
          iconKey: kindIcon,
        });
      } else {
        await onCreateDrugKind({
          label: kindLabel.trim(),
          unitLabel: kindUnit.trim() || 'Units',
          iconKey: kindIcon,
        });
      }
      soundEngine.playAddToCart();
      resetKindForm();
    } catch (err) {
      soundEngine.playWarning();
      setKindError(err instanceof Error ? err.message : 'Failed to save drug kind.');
    }
  }

  async function handleRemoveKind(kindId: string) {
    if (!onDeleteDrugKind) return;
    setKindError(null);
    try {
      await onDeleteDrugKind(kindId);
      soundEngine.playTap();
      if (editingKindId === kindId) resetKindForm();
    } catch (err) {
      soundEngine.playWarning();
      setKindError(err instanceof Error ? err.message : 'Could not delete drug kind.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <UiSticker kind="inventory" className="w-11 h-11 rounded-2xl hidden sm:flex" />
          <div className="min-w-0">
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">Drug Catalog & Stock Thresholds</h2>
            <p className="text-xs sm:text-sm text-[#526077] dark:text-[#93A8C8]">
              Configure buying cost, retail selling price ({cur}), box/strip/tablet ratios, shelf codes, and low-stock triggers.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {onOpenRestockSheet && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onOpenRestockSheet();
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-2xl apple-surface text-xs font-semibold hover:opacity-80 whitespace-nowrap shrink-0 border border-[#1464F6]/25 dark:border-cyan-400/25 text-[#1464F6] dark:text-[#22D3EE]"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Restock Order Sheet
              {lowStockCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-lg bg-amber-500/15 text-[#B97716] dark:text-[#E5A93C] text-[10px] font-mono font-bold">
                  {lowStockCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            disabled={inventoryWriteLocked}
            onClick={() => {
              soundEngine.playTap();
              resetKindForm();
              setShowKindModal(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-2xl apple-surface text-xs font-semibold hover:opacity-80 whitespace-nowrap shrink-0 disabled:opacity-45"
          >
            <Plus className="w-4 h-4" />
            Manage Drug Kinds
          </button>

          <button
            type="button"
            disabled={inventoryWriteLocked}
            onClick={() => {
              soundEngine.playTap();
              onOpenAddStock();
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-2xl border border-[#0D6E52]/30 dark:border-[#22C58B]/30 text-[#0D6E52] dark:text-[#22C58B] bg-[#0D6E52]/10 dark:bg-[#22C58B]/10 text-xs font-semibold hover:bg-[#0D6E52]/15 whitespace-nowrap shrink-0 disabled:opacity-45"
          >
            <PackagePlus className="w-4 h-4" />
            Add Stock
          </button>

          <MagneticButton
            type="button"
            disabled={inventoryWriteLocked}
            onClick={() => {
              soundEngine.playTap();
              onAddDrug();
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-2xl text-sm font-semibold whitespace-nowrap shrink-0 flex-1 sm:flex-none disabled:opacity-45"
          >
            <Plus className="w-4 h-4" />
            Add Medicine
          </MagneticButton>
        </div>
      </div>

      {inventoryWriteLocked && (
        <div className="p-3.5 rounded-2xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0" />
          Inventory modifications are temporarily locked by the software vendor. Call 0945206759 for assistance.
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="p-3.5 sm:p-4 apple-surface rounded-[24px] space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6470] dark:text-[#98A2AE]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medicine name, generic, shelf code..."
              className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-2xl apple-inset text-sm outline-none focus:ring-2 focus:ring-[#0D6E52] dark:focus:ring-[#22C58B]"
            />
          </div>

          <div className="grid grid-cols-4 sm:flex items-center gap-1 p-1 rounded-2xl apple-inset w-full sm:w-auto">
            {(
              [
                ['all', 'All'],
                ['rx', 'Rx Only'],
                ['otc', 'OTC'],
                ['low', 'Low Stock'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  setStatusFilter(key);
                }}
                className={`px-2 sm:px-3 py-2 min-h-[38px] rounded-xl text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap text-center ${
                  statusFilter === key
                    ? 'apple-surface shadow-sm text-[#111827] dark:text-[#F5F7FA]'
                    : 'text-[#5B6470] dark:text-[#98A2AE]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              setFormFilter('all');
            }}
            className={`px-3 py-2 min-h-[38px] rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
              formFilter === 'all'
                ? 'bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310]'
                : 'apple-inset text-[#5B6470] dark:text-[#98A2AE]'
            }`}
          >
            All Drug Kinds
          </button>
          {drugKinds.map((kind) => (
            <button
              key={kind.id}
              type="button"
              onClick={() => {
                soundEngine.playTap();
                setFormFilter(kind.id);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                formFilter === kind.id
                  ? 'bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310]'
                  : 'apple-inset text-[#5B6470] dark:text-[#98A2AE]'
              }`}
            >
              <MedicineIcon form={kind.id} drugKinds={drugKinds} className="w-3.5 h-3.5" />
              {kind.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Inventory Cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((drug) => {
          const buy = drug.buyingPrice ?? 0;
          const profit = drug.sellingPrice - buy;
          const margin = drug.sellingPrice > 0 ? ((profit / drug.sellingPrice) * 100).toFixed(0) : '0';
          const isLow = drug.stock <= drug.lowStockThreshold;
          const { label: kindLabel } = resolveDrugKind(drug.dosageForm, drugKinds);

          return (
            <div key={drug.id} className="apple-surface rounded-[22px] p-4 space-y-3">
              <div className="flex items-start gap-3">
                <DrugThumbnail
                  imageUrl={drug.imageUrl}
                  dosageForm={drug.dosageForm}
                  drugKinds={drugKinds}
                  name={drug.name}
                  className="w-12 h-12 rounded-2xl shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-sm font-bold text-[#111827] dark:text-[#F5F7FA] leading-snug">
                      {drug.name}
                    </p>
                    <span className="font-mono tabular-nums font-bold text-sm text-[#0D6E52] dark:text-[#22C58B] shrink-0">
                      {drug.sellingPrice.toFixed(2)} {cur}
                    </span>
                  </div>
                  <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] truncate">
                    {drug.strength} · {kindLabel} · {drug.requiresPrescription ? 'Rx Required' : 'OTC'}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] mt-1">
                    {drug.shelfLocation && (
                      <span className="inline-flex items-center gap-1 font-mono text-[#0D6E52] dark:text-[#22C58B]">
                        <MapPin className="w-3 h-3" />
                        Shelf {drug.shelfLocation}
                      </span>
                    )}
                    {drug.storageRequirement === 'refrigerated' && (
                      <span className="inline-flex items-center gap-0.5 text-sky-600 dark:text-sky-400 font-medium">
                        <Snowflake className="w-3 h-3" /> 2–8°C
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl apple-inset">
                  <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE]">Stock Level</p>
                  <p className={`font-mono tabular-nums font-bold mt-0.5 ${isLow ? 'text-[#B97716] dark:text-[#E5A93C]' : ''}`}>
                    {formatStockBreakdown(drug)}
                  </p>
                  <p className="text-[10px] text-[#5B6470] dark:text-[#98A2AE] font-mono">
                    Alert &lt; {drug.lowStockThreshold}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl apple-inset">
                  <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE]">Buy & Profit</p>
                  <p className="font-mono tabular-nums font-semibold mt-0.5">
                    Buy {buy.toFixed(2)} {cur}
                  </p>
                  <p className="text-[10px] font-mono text-[#0D6E52] dark:text-[#22C58B] font-semibold">
                    +{profit.toFixed(2)} {cur} ({margin}%)
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-[#5B6470] dark:text-[#98A2AE]">
                <span>Lot {drug.batchNumber}</span>
                <span>Exp {formatClinicDate(drug.expiryDate, calendarMode, language)}</span>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.07]">
                <button
                  type="button"
                  disabled={inventoryWriteLocked}
                  onClick={() => {
                    soundEngine.playTap();
                    onOpenAddStock(drug.id);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 min-h-[42px] rounded-xl bg-[#0D6E52]/10 dark:bg-[#22C58B]/15 text-[#0D6E52] dark:text-[#22C58B] text-xs font-semibold disabled:opacity-45"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  Add Stock
                </button>
                <button
                  type="button"
                  disabled={inventoryWriteLocked}
                  onClick={() => {
                    soundEngine.playTap();
                    onEditDrug(drug);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 min-h-[42px] rounded-xl apple-inset text-xs font-semibold disabled:opacity-45"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
                {canDelete && (
                  <button
                    type="button"
                    disabled={inventoryWriteLocked}
                    onClick={() => void onDeleteDrug(drug)}
                    aria-label="Delete"
                    className="p-2.5 min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl text-red-600 dark:text-red-400 bg-red-500/10 disabled:opacity-45"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="apple-surface rounded-[22px] py-12 text-center text-sm text-[#5B6470] dark:text-[#98A2AE]">
            No medicines match your current filter.
          </div>
        )}
      </div>

      {/* Desktop Inventory Table */}
      <div className="hidden md:block apple-surface rounded-[24px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] text-[#5B6470] dark:text-[#98A2AE]">
                <th className="py-3.5 px-4 font-semibold">Medicine & Shelf</th>
                <th className="py-3.5 px-4 font-semibold">Drug Kind & Rx</th>
                <th className="py-3.5 px-4 font-semibold text-right">Buying</th>
                <th className="py-3.5 px-4 font-semibold text-right">Selling (Base / Pack / Box)</th>
                <th className="py-3.5 px-4 font-semibold text-right">Margin</th>
                <th className="py-3.5 px-4 font-semibold">Stock Breakdown</th>
                <th className="py-3.5 px-4 font-semibold">Batch & Expiry</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
              {filtered.map((drug) => {
                const buy = drug.buyingPrice ?? 0;
                const profit = drug.sellingPrice - buy;
                const margin = drug.sellingPrice > 0 ? ((profit / drug.sellingPrice) * 100).toFixed(0) : '0';
                const isLow = drug.stock <= drug.lowStockThreshold;
                const { label: kindLabel } = resolveDrugKind(drug.dosageForm, drugKinds);

                return (
                  <tr
                    key={drug.id}
                    className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <DrugThumbnail
                          imageUrl={drug.imageUrl}
                          dosageForm={drug.dosageForm}
                          drugKinds={drugKinds}
                          name={drug.name}
                          className="w-11 h-11 rounded-2xl"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#111827] dark:text-[#F5F7FA] truncate">
                            {drug.name}
                          </p>
                          <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] truncate">
                            {drug.strength} · {drug.category}
                          </p>
                          {drug.shelfLocation && (
                            <p className="inline-flex items-center gap-1 text-[11px] font-mono text-[#0D6E52] dark:text-[#22C58B] mt-0.5">
                              <MapPin className="w-3 h-3" />
                              Shelf {drug.shelfLocation}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <p className="font-medium inline-flex items-center gap-1.5">
                          <MedicineIcon
                            form={drug.dosageForm}
                            drugKinds={drugKinds}
                            className="w-3.5 h-3.5 text-[#0D6E52] dark:text-[#22C58B]"
                          />
                          {kindLabel}
                        </p>
                        <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE]">
                          {drug.requiresPrescription ? (
                            <span className="font-semibold text-[#B97716] dark:text-[#E5A93C]">Rx Required</span>
                          ) : (
                            'OTC / No Rx'
                          )}
                          {drug.storageRequirement === 'refrigerated' && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 text-sky-600 dark:text-sky-400">
                              · <Snowflake className="w-3 h-3" /> 2–8°C
                            </span>
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#5B6470] dark:text-[#98A2AE]">
                      {buy.toFixed(2)} {cur}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      <p className="font-bold text-sm">
                        {drug.sellingPrice.toFixed(2)} {cur}
                        <span className="text-[11px] font-normal text-[#5B6470] dark:text-[#98A2AE]">
                          /{drug.baseUnitName || 'unit'}
                        </span>
                      </p>
                      {(drug.unitsPerPack ?? 1) > 1 && (
                        <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE]">
                          {drug.packUnitName || 'Strip'}: {(drug.packSellingPrice && drug.packSellingPrice > 0 ? drug.packSellingPrice : drug.sellingPrice * (drug.unitsPerPack ?? 1)).toFixed(2)} {cur}
                        </p>
                      )}
                      {(drug.packsPerBox ?? 1) > 1 && (
                        <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE]">
                          {drug.boxUnitName || 'Box'}: {(drug.boxSellingPrice && drug.boxSellingPrice > 0 ? drug.boxSellingPrice : drug.sellingPrice * (drug.unitsPerPack ?? 1) * (drug.packsPerBox ?? 1)).toFixed(2)} {cur}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#0D6E52] dark:text-[#22C58B] font-semibold">
                      +{profit.toFixed(2)} {cur} ({margin}%)
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1 min-w-[140px]">
                        <p className={`font-mono tabular-nums ${isLow ? 'font-bold text-[#B97716] dark:text-[#E5A93C]' : 'font-semibold'}`}>
                          {formatStockBreakdown(drug)}
                        </p>
                        <p className="text-[11px] font-mono tabular-nums text-[#5B6470] dark:text-[#98A2AE]">
                          Reorder below {drug.lowStockThreshold}
                        </p>
                        {isLow && (
                          <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B97716] dark:text-[#E5A93C]">
                            <AlertTriangle className="w-3 h-3" />
                            {drug.stock === 0 ? 'Out of stock' : 'Below threshold'}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums">
                      <p>{drug.batchNumber}</p>
                      <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE]">
                        Exp {formatClinicDate(drug.expiryDate, calendarMode, language)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          disabled={inventoryWriteLocked}
                          onClick={() => {
                            soundEngine.playTap();
                            onOpenAddStock(drug.id);
                          }}
                          title="Add Stock"
                          className="p-2 rounded-xl text-[#0D6E52] dark:text-[#22C58B] hover:bg-[#0D6E52]/10 disabled:opacity-45"
                        >
                          <PackagePlus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={inventoryWriteLocked}
                          onClick={() => {
                            soundEngine.playTap();
                            onEditDrug(drug);
                          }}
                          title="Edit"
                          className="p-2 rounded-xl text-[#5B6470] dark:text-[#98A2AE] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] disabled:opacity-45"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            disabled={inventoryWriteLocked}
                            onClick={() => void onDeleteDrug(drug)}
                            title="Delete"
                            className="p-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-45"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-[#5B6470] dark:text-[#98A2AE]">
                    No medicines match your current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manage Drug Kinds Modal (Add / Edit / Delete) */}
      {showKindModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto yoya-scroll-contain"
          onClick={() => {
            resetKindForm();
            setShowKindModal(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            className="w-full max-w-lg my-6 apple-surface yoya-modal-panel outline-none rounded-[28px] p-6 space-y-5 shadow-2xl max-h-[88vh] overflow-y-auto yoya-scroll-contain"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-bold">
                {editingKindId ? 'Edit Drug Kind' : 'Manage Drug Kinds'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  resetKindForm();
                  setShowKindModal(false);
                }}
                className="p-2 rounded-full apple-inset"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveKind} className="space-y-3.5 p-4 rounded-2xl apple-inset">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold">
                  {editingKindId ? 'Update Selected Drug Kind' : 'Add New Drug Kind'}
                </p>
                {editingKindId && (
                  <button
                    type="button"
                    onClick={resetKindForm}
                    className="text-xs font-semibold text-[#5B6470] dark:text-[#98A2AE] hover:underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                    Kind Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={kindLabel}
                    onChange={(e) => setKindLabel(e.target.value)}
                    placeholder="e.g. IV Infusion Bag, Spray"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                    Unit Label
                  </label>
                  <input
                    type="text"
                    value={kindUnit}
                    onChange={(e) => setKindUnit(e.target.value)}
                    placeholder="e.g. Bags, Sachets, Bottles"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                  Icon Emblem
                </label>
                <select
                  value={kindIcon}
                  onChange={(e) => setKindIcon(e.target.value as DrugKindIconKey)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-sm outline-none"
                >
                  <option value="box">Pack / Box</option>
                  <option value="tablet">Tablet</option>
                  <option value="capsule">Capsule</option>
                  <option value="injection">Needle / Syringe</option>
                  <option value="syrup">Bottle / Liquid</option>
                  <option value="inhaler">Inhaler</option>
                  <option value="cream">Cream Tube</option>
                  <option value="drops">Dropper</option>
                </select>
              </div>

              {kindError && (
                <div className="p-2.5 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
                  {kindError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-xs font-semibold"
                >
                  {editingKindId ? 'Update Drug Kind' : 'Save Drug Kind'}
                </button>
              </div>
            </form>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <p className="text-xs font-bold text-[#5B6470] dark:text-[#98A2AE]">
                Existing Drug Kinds ({drugKinds.length})
              </p>
              {drugKinds.map((kind) => (
                <div
                  key={kind.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl apple-inset text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MedicineIcon form={kind.id} drugKinds={drugKinds} className="w-4 h-4 text-[#0D6E52] dark:text-[#22C58B] shrink-0" />
                    <span className="font-semibold truncate">{kind.label}</span>
                    <span className="text-[11px] text-[#5B6470] dark:text-[#98A2AE] shrink-0">
                      ({kind.unitLabel})
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {onUpdateDrugKind && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playTap();
                          setEditingKindId(kind.id);
                          setKindLabel(kind.label);
                          setKindUnit(kind.unitLabel);
                          setKindIcon(kind.iconKey);
                          setKindError(null);
                        }}
                        className="p-1.5 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                        title="Edit drug kind"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && onDeleteDrugKind && (
                      <button
                        type="button"
                        onClick={() => void handleRemoveKind(kind.id)}
                        className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10"
                        title="Delete drug kind"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
