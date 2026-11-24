import type { Drug, SaleUnitTier } from '../types/pharmacy.ts';

export interface UnitOptionInfo {
  tier: SaleUnitTier;
  label: string;
  multiplier: number; // Base units per 1 of this tier
  price: number;      // Selling price per 1 of this tier
  maxQtyAvailable: number;
}

export function getDrugUnitOptions(drug: Drug): UnitOptionInfo[] {
  const unitsPerPack = Math.max(1, Math.floor(drug.unitsPerPack ?? 1));
  const packsPerBox = Math.max(1, Math.floor(drug.packsPerBox ?? 1));
  const baseName = (drug.baseUnitName || 'Unit').trim();
  const packName = (drug.packUnitName || 'Strip').trim();
  const boxName = (drug.boxUnitName || 'Box').trim();

  const options: UnitOptionInfo[] = [
    {
      tier: 'base',
      label: baseName,
      multiplier: 1,
      price: drug.sellingPrice,
      maxQtyAvailable: Math.max(0, drug.stock),
    },
  ];

  if (unitsPerPack > 1) {
    const packPrice =
      drug.packSellingPrice && drug.packSellingPrice > 0
        ? drug.packSellingPrice
        : Number((drug.sellingPrice * unitsPerPack).toFixed(2));
    options.push({
      tier: 'pack',
      label: `${packName} (${unitsPerPack} ${baseName}s)`,
      multiplier: unitsPerPack,
      price: packPrice,
      maxQtyAvailable: Math.floor(Math.max(0, drug.stock) / unitsPerPack),
    });
  }

  if (packsPerBox > 1) {
    const boxMultiplier = unitsPerPack * packsPerBox;
    const boxPrice =
      drug.boxSellingPrice && drug.boxSellingPrice > 0
        ? drug.boxSellingPrice
        : Number((drug.sellingPrice * boxMultiplier).toFixed(2));
    options.push({
      tier: 'box',
      label: `${boxName} (${boxMultiplier} ${baseName}s)`,
      multiplier: boxMultiplier,
      price: boxPrice,
      maxQtyAvailable: Math.floor(Math.max(0, drug.stock) / boxMultiplier),
    });
  }

  return options;
}

export function getUnitMultiplier(drug: Drug, tier: SaleUnitTier = 'base'): number {
  const unitsPerPack = Math.max(1, Math.floor(drug.unitsPerPack ?? 1));
  const packsPerBox = Math.max(1, Math.floor(drug.packsPerBox ?? 1));
  if (tier === 'box' && packsPerBox > 1) return unitsPerPack * packsPerBox;
  if (tier === 'pack' && unitsPerPack > 1) return unitsPerPack;
  return 1;
}

export function getUnitPrice(drug: Drug, tier: SaleUnitTier = 'base'): number {
  const opt = getDrugUnitOptions(drug).find((o) => o.tier === tier);
  return opt ? opt.price : drug.sellingPrice;
}

export function getUnitShortLabel(drug: Drug, tier: SaleUnitTier = 'base'): string {
  if (tier === 'box' && (drug.packsPerBox ?? 1) > 1) return drug.boxUnitName || 'Box';
  if (tier === 'pack' && (drug.unitsPerPack ?? 1) > 1) return drug.packUnitName || 'Strip';
  return drug.baseUnitName || 'Unit';
}

export function formatStockBreakdown(drug: Drug): string {
  const unitsPerPack = Math.max(1, Math.floor(drug.unitsPerPack ?? 1));
  const packsPerBox = Math.max(1, Math.floor(drug.packsPerBox ?? 1));
  const baseName = drug.baseUnitName || 'unit';
  if (unitsPerPack <= 1 && packsPerBox <= 1) {
    return `${drug.stock}`;
  }
  const boxMultiplier = unitsPerPack * packsPerBox;
  const boxes = packsPerBox > 1 ? Math.floor(drug.stock / boxMultiplier) : 0;
  const remAfterBox = drug.stock - boxes * boxMultiplier;
  const strips = unitsPerPack > 1 ? Math.floor(remAfterBox / unitsPerPack) : 0;
  const singles = remAfterBox - strips * unitsPerPack;

  const parts: string[] = [];
  if (boxes > 0) parts.push(`${boxes} ${drug.boxUnitName || 'Box'}`);
  if (strips > 0) parts.push(`${strips} ${drug.packUnitName || 'Strip'}`);
  if (singles > 0 || parts.length === 0) parts.push(`${singles} ${baseName}`);
  return `${drug.stock} ${baseName}s (${parts.join(' · ')})`;
}
