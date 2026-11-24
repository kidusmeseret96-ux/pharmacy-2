import React, { useEffect, useRef, useState } from 'react';
import { Download, Plus, Upload, X } from 'lucide-react';
import { compressImageFile, downloadDataUrlOrAsset } from '../lib/api.ts';
import { soundEngine } from '../lib/soundEngine.ts';
import type { Drug, DrugKind, DrugKindIconKey, StorageRequirement } from '../types/pharmacy.ts';
import { MedicineIcon } from './MedicineIcon.tsx';
import { MagneticButton, UiSticker } from './MotionPrimitives.tsx';

const STUDIO_GALLERY = [
  {
    label: 'Tablets Pack',
    url: '/src/assets/images/drug_antibiotic_tablets_1795526154308.jpg',
  },
  {
    label: 'Injection Vial',
    url: '/src/assets/images/drug_insulin_injection_1795526155012.jpg',
  },
  {
    label: 'Syrup Bottle',
    url: '/src/assets/images/drug_cough_syrup_1795526154725.jpg',
  },
  {
    label: 'Inhaler Device',
    url: '/src/assets/images/drug_inhaler_respiratory_1795526154988.jpg',
  },
];

interface DrugFormModalProps {
  open: boolean;
  editingDrug: Drug | null;
  drugKinds: DrugKind[];
  currencySymbol: string;
  onClose: () => void;
  onCreateDrugKind: (payload: { label: string; unitLabel?: string; iconKey?: DrugKindIconKey }) => Promise<DrugKind>;
  onSave: (payload: Omit<Drug, 'id' | 'createdAt' | 'updatedAt'>, editingId?: string) => Promise<void>;
}

export function DrugFormModal({
  open,
  editingDrug,
  drugKinds,
  currencySymbol,
  onClose,
  onCreateDrugKind,
  onSave,
}: DrugFormModalProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [strength, setStrength] = useState('');
  const [category, setCategory] = useState('Antibiotics');
  const [dosageForm, setDosageForm] = useState<string>('tablet');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('40');
  const [lowStockThreshold, setLowStockThreshold] = useState('12');

  // Box / Strip / Base conversion fields
  const [baseUnitName, setBaseUnitName] = useState('Tablet');
  const [packUnitName, setPackUnitName] = useState('Strip');
  const [boxUnitName, setBoxUnitName] = useState('Box');
  const [unitsPerPack, setUnitsPerPack] = useState('1');
  const [packsPerBox, setPacksPerBox] = useState('1');
  const [packSellingPrice, setPackSellingPrice] = useState('');
  const [boxSellingPrice, setBoxSellingPrice] = useState('');
  const [shelfLocation, setShelfLocation] = useState('');

  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('2028-06-30');
  const [manufacturer, setManufacturer] = useState('');
  const [barcode, setBarcode] = useState('');
  const [storageRequirement, setStorageRequirement] = useState<StorageRequirement>('room_temp');
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showNewKind, setShowNewKind] = useState(false);
  const [newKindLabel, setNewKindLabel] = useState('');
  const [newKindIcon, setNewKindIcon] = useState<DrugKindIconKey>('box');

  useEffect(() => {
    if (!open) return;
    setError(null);
    setShowNewKind(false);
    setNewKindLabel('');
    if (editingDrug) {
      setName(editingDrug.name);
      setGenericName(editingDrug.genericName);
      setStrength(editingDrug.strength);
      setCategory(editingDrug.category);
      setDosageForm(editingDrug.dosageForm);
      setBuyingPrice(String(editingDrug.buyingPrice ?? 0));
      setSellingPrice(String(editingDrug.sellingPrice));
      setStock(String(editingDrug.stock));
      setLowStockThreshold(String(editingDrug.lowStockThreshold));
      setBaseUnitName(editingDrug.baseUnitName || 'Unit');
      setPackUnitName(editingDrug.packUnitName || 'Strip');
      setBoxUnitName(editingDrug.boxUnitName || 'Box');
      setUnitsPerPack(String(editingDrug.unitsPerPack ?? 1));
      setPacksPerBox(String(editingDrug.packsPerBox ?? 1));
      setPackSellingPrice(editingDrug.packSellingPrice ? String(editingDrug.packSellingPrice) : '');
      setBoxSellingPrice(editingDrug.boxSellingPrice ? String(editingDrug.boxSellingPrice) : '');
      setShelfLocation(editingDrug.shelfLocation || '');
      setRequiresPrescription(editingDrug.requiresPrescription);
      setBatchNumber(editingDrug.batchNumber);
      setExpiryDate(editingDrug.expiryDate);
      setManufacturer(editingDrug.manufacturer);
      setBarcode(editingDrug.barcode);
      setStorageRequirement(editingDrug.storageRequirement);
      setImageUrl(editingDrug.imageUrl || '');
      setNotes(editingDrug.notes || '');
    } else {
      setName('');
      setGenericName('');
      setStrength('');
      setCategory('Antibiotics');
      setDosageForm(drugKinds[0]?.id || 'tablet');
      setBuyingPrice('');
      setSellingPrice('');
      setStock('100');
      setLowStockThreshold('20');
      setBaseUnitName('Tablet');
      setPackUnitName('Strip');
      setBoxUnitName('Box');
      setUnitsPerPack('10');
      setPacksPerBox('10');
      setPackSellingPrice('');
      setBoxSellingPrice('');
      setShelfLocation('');
      setRequiresPrescription(false);
      setBatchNumber(`LOT-${Date.now().toString().slice(-5)}`);
      setExpiryDate('2028-06-30');
      setManufacturer('');
      setBarcode('');
      setStorageRequirement('room_temp');
      setImageUrl('');
      setNotes('');
    }
  }, [open, editingDrug, drugKinds]);

  if (!open) return null;

  const buyNum = Number(buyingPrice) || 0;
  const sellNum = Number(sellingPrice) || 0;
  const unitProfit = sellNum - buyNum;
  const marginPct = sellNum > 0 ? ((unitProfit / sellNum) * 100).toFixed(1) : '0.0';
  const uPerPack = Math.max(1, Math.floor(Number(unitsPerPack) || 1));
  const pPerBox = Math.max(1, Math.floor(Number(packsPerBox) || 1));

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 720, 0.8);
      setImageUrl(compressed);
      soundEngine.playShutter();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image.');
    }
  }

  async function handleAddNewKind() {
    if (!newKindLabel.trim()) return;
    try {
      const created = await onCreateDrugKind({
        label: newKindLabel.trim(),
        iconKey: newKindIcon,
      });
      setDosageForm(created.id);
      setNewKindLabel('');
      setShowNewKind(false);
      soundEngine.playAddToCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add new drug kind.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave(
        {
          name,
          genericName,
          strength,
          category,
          dosageForm,
          buyingPrice: Number(buyingPrice),
          sellingPrice: Number(sellingPrice),
          baseUnitName: baseUnitName.trim() || 'Unit',
          packUnitName: packUnitName.trim() || 'Strip',
          boxUnitName: boxUnitName.trim() || 'Box',
          unitsPerPack: uPerPack,
          packsPerBox: pPerBox,
          packSellingPrice: Number(packSellingPrice) > 0 ? Number(packSellingPrice) : undefined,
          boxSellingPrice: Number(boxSellingPrice) > 0 ? Number(boxSellingPrice) : undefined,
          shelfLocation: shelfLocation.trim(),
          stock: Math.floor(Number(stock)),
          lowStockThreshold: Math.floor(Number(lowStockThreshold)),
          requiresPrescription,
          batchNumber,
          expiryDate,
          manufacturer,
          barcode,
          storageRequirement,
          imageUrl,
          notes,
        },
        editingDrug?.id
      );
      soundEngine.playAddToCart();
      onClose();
    } catch (err) {
      soundEngine.playWarning();
      setError(err instanceof Error ? err.message : 'Failed to save medicine.');
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
        className="w-full max-w-3xl my-4 sm:my-8 apple-surface yoya-modal-panel outline-none rounded-[26px] shadow-2xl overflow-hidden"
      >
        <div className="apple-glass flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-blue-500/10 dark:border-cyan-400/12">
          <div className="flex items-center gap-3 min-w-0">
            <UiSticker kind="inventory" className="w-9 h-9 rounded-xl hidden sm:flex" />
            <div className="min-w-0">
              <h3 className="font-display text-base sm:text-lg font-bold truncate">
                {editingDrug ? 'Edit Medicine Record' : 'Add New Medicine to Catalog'}
              </h3>
              <p className="text-xs text-[#526077] dark:text-[#93A8C8]">
                Configure pricing in {currencySymbol}, box/strip/tablet packaging, and reorder threshold.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full apple-inset text-[#5B6470] dark:text-[#98A2AE] hover:opacity-80 shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto yoya-scroll-contain">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#5B6470] dark:text-[#98A2AE]">
                Drug Kind / Dosage Form
              </label>
              <button
                type="button"
                onClick={() => setShowNewKind(!showNewKind)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D6E52] dark:text-[#22C58B] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Drug Kind
              </button>
            </div>

            {showNewKind && (
              <div className="p-3 rounded-2xl apple-inset flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={newKindLabel}
                  onChange={(e) => setNewKindLabel(e.target.value)}
                  placeholder="e.g. IV Infusion Bag, Sachet, Spray..."
                  className="w-full sm:w-auto sm:flex-1 min-w-0 px-3 py-2 rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.07] dark:border-white/[0.08] text-xs"
                />
                <select
                  value={newKindIcon}
                  onChange={(e) => setNewKindIcon(e.target.value as DrugKindIconKey)}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.07] dark:border-white/[0.08] text-xs"
                >
                  <option value="box">Pack / Box Icon</option>
                  <option value="tablet">Tablet Icon</option>
                  <option value="capsule">Capsule Icon</option>
                  <option value="injection">Needle Icon</option>
                  <option value="syrup">Bottle Icon</option>
                  <option value="inhaler">Inhaler Icon</option>
                  <option value="cream">Tube Icon</option>
                  <option value="drops">Drops Icon</option>
                </select>
                <button
                  type="button"
                  onClick={() => void handleAddNewKind()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-xs font-semibold"
                >
                  Save Kind
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {drugKinds.map((kind) => {
                const active = dosageForm === kind.id;
                return (
                  <button
                    key={kind.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playTap();
                      setDosageForm(kind.id);
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border text-left text-xs font-medium transition-all ${
                      active
                        ? 'border-[#0D6E52] dark:border-[#22C58B] bg-[#0D6E52]/10 dark:bg-[#22C58B]/15 text-[#0D6E52] dark:text-[#22C58B]'
                        : 'border-black/[0.06] dark:border-white/[0.07] apple-inset text-[#5B6470] dark:text-[#98A2AE]'
                    }`}
                  >
                    <MedicineIcon form={kind.id} drugKinds={drugKinds} className="w-4 h-4 shrink-0" />
                    <span className="truncate">{kind.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Brand / Display Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Amoxicillin Clavulanate"
                className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Strength / Volume
              </label>
              <input
                type="text"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                placeholder="e.g. 500mg / 10mL"
                className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Generic Molecule
              </label>
              <input
                type="text"
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                placeholder="Generic name"
                className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Antibiotics..."
                className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Manufacturer
              </label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="Supplier"
                className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Shelf / Rack Code
              </label>
              <input
                type="text"
                value={shelfLocation}
                onChange={(e) => setShelfLocation(e.target.value)}
                placeholder="e.g. Shelf A-02"
                className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm"
              />
            </div>
          </div>

          {/* Pricing & Base Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-2xl apple-inset">
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Buying / {baseUnitName} ({currencySymbol}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={buyingPrice}
                onChange={(e) => setBuyingPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-sm font-mono tabular-nums"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Selling / {baseUnitName} ({currencySymbol}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-sm font-mono tabular-nums"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Stock ({baseUnitName}s) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-sm font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Low Alert ({baseUnitName}s) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-sm font-mono tabular-nums"
              />
            </div>
            <div className="sm:col-span-4 flex items-center justify-between text-xs pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-[#5B6470] dark:text-[#98A2AE]">Base Unit Margin</span>
              <span
                className={`font-mono tabular-nums font-semibold ${
                  unitProfit >= 0 ? 'text-[#0D6E52] dark:text-[#22C58B]' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {unitProfit.toFixed(2)} {currencySymbol} profit / {baseUnitName} · {marginPct}%
              </span>
            </div>
          </div>

          {/* Box / Strip / Base Conversion Setup */}
          <div className="p-4 rounded-2xl apple-inset space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold">Box / Strip / Unit Packaging Conversion</p>
              <span className="text-[11px] font-mono text-[#5B6470] dark:text-[#98A2AE]">
                1 {boxUnitName} = {pPerBox} {packUnitName}s = {uPerPack * pPerBox} {baseUnitName}s
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#5B6470] dark:text-[#98A2AE] mb-1">Base Unit Name</label>
                <input
                  type="text"
                  value={baseUnitName}
                  onChange={(e) => setBaseUnitName(e.target.value)}
                  placeholder="Tablet"
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#5B6470] dark:text-[#98A2AE] mb-1">Pack / Strip Name</label>
                <input
                  type="text"
                  value={packUnitName}
                  onChange={(e) => setPackUnitName(e.target.value)}
                  placeholder="Strip"
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#5B6470] dark:text-[#98A2AE] mb-1">Box Name</label>
                <input
                  type="text"
                  value={boxUnitName}
                  onChange={(e) => setBoxUnitName(e.target.value)}
                  placeholder="Box"
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-[#5B6470] dark:text-[#98A2AE] mb-1">
                  {baseUnitName}s / {packUnitName}
                </label>
                <input
                  type="number"
                  min="1"
                  value={unitsPerPack}
                  onChange={(e) => setUnitsPerPack(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#5B6470] dark:text-[#98A2AE] mb-1">
                  {packUnitName}s / {boxUnitName}
                </label>
                <input
                  type="number"
                  min="1"
                  value={packsPerBox}
                  onChange={(e) => setPacksPerBox(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#5B6470] dark:text-[#98A2AE] mb-1">
                  {packUnitName} Price ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={packSellingPrice}
                  onChange={(e) => setPackSellingPrice(e.target.value)}
                  placeholder={sellNum > 0 ? String((sellNum * uPerPack).toFixed(0)) : 'Auto'}
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#5B6470] dark:text-[#98A2AE] mb-1">
                  {boxUnitName} Price ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={boxSellingPrice}
                  onChange={(e) => setBoxSellingPrice(e.target.value)}
                  placeholder={sellNum > 0 ? String((sellNum * uPerPack * pPerBox).toFixed(0)) : 'Auto'}
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Storage Condition
              </label>
              <select
                value={storageRequirement}
                onChange={(e) => setStorageRequirement(e.target.value as StorageRequirement)}
                className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm"
              >
                <option value="room_temp">Room Temperature (15–25°C)</option>
                <option value="refrigerated">Cold Chain (2–8°C)</option>
                <option value="controlled">Controlled Vault</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <label className="flex items-center justify-between gap-4 p-4 rounded-2xl apple-inset cursor-pointer">
              <div>
                <p className="text-sm font-semibold">Prescription Required (Rx)</p>
                <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
                  Seller must capture prescription photo before selling
                </p>
              </div>
              <input
                type="checkbox"
                checked={requiresPrescription}
                onChange={(e) => setRequiresPrescription(e.target.checked)}
                className="w-5 h-5 accent-[#0D6E52]"
              />
            </label>

            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Barcode / SKU
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Auto-generated if empty"
                className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm font-mono"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-[#5B6470] dark:text-[#98A2AE]">
              Product Picture
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl apple-inset text-xs font-semibold hover:opacity-80"
              >
                <Upload className="w-4 h-4" />
                Upload Photo
              </button>
              {STUDIO_GALLERY.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    setImageUrl(preset.url);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs transition-colors ${
                    imageUrl === preset.url
                      ? 'border-[#0D6E52] dark:border-[#22C58B] text-[#0D6E52] dark:text-[#22C58B] bg-[#0D6E52]/10'
                      : 'border-black/[0.07] dark:border-white/[0.08] text-[#5B6470] dark:text-[#98A2AE]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              {imageUrl && (
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playTap();
                      const safeName = (name || 'medicine').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
                      void downloadDataUrlOrAsset(imageUrl, `${safeName}-photo.jpg`);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D6E52] dark:text-[#22C58B] hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Clear Photo
                  </button>
                </div>
              )}
            </div>
            {imageUrl && (
              <div className="w-20 h-20 rounded-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.08]">
                <img src={imageUrl} alt="Drug preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
              Dispensing Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dosage guidance or storage notes..."
              className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm"
            />
          </div>

          {error && (
            <div className="p-3 rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] rounded-xl apple-inset text-sm font-medium hover:opacity-80"
            >
              Cancel
            </button>
            <MagneticButton
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingDrug ? 'Save Changes' : 'Add Medicine'}
            </MagneticButton>
          </div>
        </form>
      </div>
    </div>
  );
}
