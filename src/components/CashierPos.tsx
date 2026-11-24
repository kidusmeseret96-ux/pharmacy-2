import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  CloudOff,
  FileText,
  History,
  Minus,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Snowflake,
  Trash2,
  Vault,
  Wifi,
  X,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { formatClinicDate } from '../lib/ethiopianCalendar.ts';
import { getTranslator } from '../lib/i18n.ts';
import { offlineStore } from '../lib/offlineStore.ts';
import { soundEngine } from '../lib/soundEngine.ts';
import {
  formatStockBreakdown,
  getDrugUnitOptions,
  getUnitMultiplier,
  getUnitPrice,
  getUnitShortLabel,
} from '../lib/unitConversion.ts';
import type {
  AuthUser,
  ClinicSettings,
  Drug,
  DrugKind,
  Language,
  OfflineQueuedSale,
  ParkedCart,
  PaymentMethod,
  SaleUnitTier,
  Transaction,
} from '../types/pharmacy.ts';
import { CameraCaptureModal } from './CameraCaptureModal.tsx';
import { DrugThumbnail, MedicineIcon, resolveDrugKind } from './MedicineIcon.tsx';
import { MagneticButton, StickerImage, UiSticker } from './MotionPrimitives.tsx';

interface CartItem {
  drug: Drug;
  quantity: number;
  unitTier: SaleUnitTier;
}

interface CashierPosProps {
  user: AuthUser;
  drugs: Drug[];
  drugKinds: DrugKind[];
  transactions: Transaction[];
  settings: ClinicSettings;
  language: Language;
  isOnline: boolean;
  posLocked?: boolean;
  pendingSales: OfflineQueuedSale[];
  syncingOffline: boolean;
  onSyncOffline: () => Promise<void>;
  onOfflineSaleQueued: (sale: OfflineQueuedSale) => void;
  onSaleCompleted: (txn: Transaction, triggeredLowStock: string[]) => Promise<void>;
  onOpenReceipt: (txn: Transaction) => void;
}

export function CashierPos({
  user,
  drugs,
  drugKinds,
  transactions,
  settings,
  language,
  isOnline,
  posLocked = false,
  pendingSales,
  syncingOffline,
  onSyncOffline,
  onOfflineSaleQueued,
  onSaleCompleted,
  onOpenReceipt,
}: CashierPosProps) {
  const t = getTranslator(language);
  const [search, setSearch] = useState('');
  const [formFilter, setFormFilter] = useState<string>('all');
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState('');
  const [splitCashAmount, setSplitCashAmount] = useState('');
  const [splitSecondMethod, setSplitSecondMethod] = useState<'transfer' | 'card'>('transfer');
  const [paymentProofImage, setPaymentProofImage] = useState('');
  const [prescriptionImage, setPrescriptionImage] = useState('');
  const [patientReference, setPatientReference] = useState('');
  const [notes, setNotes] = useState('');
  const [captureTarget, setCaptureTarget] = useState<'payment' | 'prescription' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [showShiftHistory, setShowShiftHistory] = useState(false);

  // Hold / Park Carts
  const [parkedCarts, setParkedCarts] = useState<ParkedCart[]>([]);
  const [showParkedDrawer, setShowParkedDrawer] = useState(false);

  // Blind End-of-Shift Cash Count
  const [showBlindCloseModal, setShowBlindCloseModal] = useState(false);
  const [countedCash, setCountedCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [submittingClose, setSubmittingClose] = useState(false);

  // Mobile POS Shelf / Bag switcher
  const [mobilePane, setMobilePane] = useState<'shelf' | 'bag'>('shelf');

  const cur = settings.currencySymbol;

  useEffect(() => {
    void offlineStore.getParkedCarts().then(setParkedCarts);
  }, []);

  const filteredDrugs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drugs.filter((d) => {
      if (onlyInStock && d.stock <= 0) return false;
      if (formFilter !== 'all' && d.dosageForm !== formFilter) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.genericName.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.barcode.toLowerCase().includes(q) ||
        (d.shelfLocation ?? '').toLowerCase().includes(q)
      );
    });
  }, [drugs, search, formFilter, onlyInStock]);

  // Base units already allocated in cart per drug
  function getAllocatedBaseUnits(drugId: string, excludeTier?: SaleUnitTier): number {
    return cart
      .filter((c) => c.drug.id === drugId && c.unitTier !== excludeTier)
      .reduce((acc, c) => acc + c.quantity * getUnitMultiplier(c.drug, c.unitTier), 0);
  }

  function addToCart(drug: Drug, preferredTier?: SaleUnitTier) {
    if (drug.stock <= 0) {
      soundEngine.playWarning();
      return;
    }
    const tier: SaleUnitTier =
      preferredTier ?? ((drug.unitsPerPack ?? 1) > 1 && drug.stock >= (drug.unitsPerPack ?? 1) ? 'pack' : 'base');
    const mult = getUnitMultiplier(drug, tier);
    const allocatedOthers = getAllocatedBaseUnits(drug.id, tier);

    setError(null);
    setCart((prev) => {
      const existing = prev.find((c) => c.drug.id === drug.id && c.unitTier === tier);
      const nextQty = (existing?.quantity ?? 0) + 1;
      if (allocatedOthers + nextQty * mult > drug.stock) {
        soundEngine.playWarning();
        setError(`Only ${drug.stock} ${drug.baseUnitName || 'units'} of ${drug.name} in stock.`);
        return prev;
      }
      soundEngine.playAddToCart();
      if (existing) {
        return prev.map((c) =>
          c.drug.id === drug.id && c.unitTier === tier ? { ...c, quantity: nextQty } : c
        );
      }
      return [...prev, { drug, quantity: 1, unitTier: tier }];
    });
  }

  function updateItemTier(drugId: string, oldTier: SaleUnitTier, newTier: SaleUnitTier) {
    if (oldTier === newTier) return;
    setError(null);
    setCart((prev) => {
      const target = prev.find((c) => c.drug.id === drugId && c.unitTier === oldTier);
      if (!target) return prev;
      const mult = getUnitMultiplier(target.drug, newTier);
      const maxQty = Math.floor(
        Math.max(0, target.drug.stock - getAllocatedBaseUnits(drugId, oldTier)) / mult
      );
      if (maxQty <= 0) {
        soundEngine.playWarning();
        setError(`Not enough stock for 1 ${getUnitShortLabel(target.drug, newTier)}.`);
        return prev;
      }
      soundEngine.playTap();
      const clampedQty = Math.min(target.quantity, maxQty);
      const merged = prev.find((c) => c.drug.id === drugId && c.unitTier === newTier);
      if (merged) {
        return prev
          .filter((c) => !(c.drug.id === drugId && c.unitTier === oldTier))
          .map((c) =>
            c.drug.id === drugId && c.unitTier === newTier
              ? { ...c, quantity: Math.min(maxQty, c.quantity + clampedQty) }
              : c
          );
      }
      return prev.map((c) =>
        c.drug.id === drugId && c.unitTier === oldTier
          ? { ...c, unitTier: newTier, quantity: clampedQty }
          : c
      );
    });
  }

  function updateCartQty(drugId: string, unitTier: SaleUnitTier, nextQty: number) {
    if (nextQty <= 0) {
      soundEngine.playTap();
      setCart((prev) => prev.filter((c) => !(c.drug.id === drugId && c.unitTier === unitTier)));
      return;
    }
    setCart((prev) =>
      prev.map((c) => {
        if (c.drug.id !== drugId || c.unitTier !== unitTier) return c;
        const mult = getUnitMultiplier(c.drug, unitTier);
        const maxAvail = Math.floor(
          Math.max(0, c.drug.stock - getAllocatedBaseUnits(drugId, unitTier)) / mult
        );
        const clamped = Math.min(nextQty, Math.max(1, maxAvail));
        return { ...c, quantity: clamped };
      })
    );
  }

  const requiresPrescription = cart.some((item) => item.drug.requiresPrescription);
  const subtotal = cart.reduce(
    (acc, item) => acc + getUnitPrice(item.drug, item.unitTier) * item.quantity,
    0
  );
  const taxAmount = Number(((subtotal * settings.taxRatePercent) / 100).toFixed(2));
  const totalAmount = Number((subtotal + taxAmount).toFixed(2));
  const cashTenderedNum = Number(cashTendered) || 0;
  const changeDue = paymentMethod === 'cash' && cashTenderedNum > totalAmount ? cashTenderedNum - totalAmount : 0;

  const splitCashNum = Number(splitCashAmount) || 0;
  const splitRemainingNum = Math.max(0, Number((totalAmount - splitCashNum).toFixed(2)));
  const cartTotalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  async function handleHoldCart() {
    if (cart.length === 0) return;
    soundEngine.playTap();
    const parked: ParkedCart = {
      id: `park_${Date.now()}`,
      label: patientReference.trim() || `Customer #${parkedCarts.length + 1}`,
      createdAt: new Date().toISOString(),
      items: cart.map((c) => ({
        drugId: c.drug.id,
        quantity: c.quantity,
        unitTier: c.unitTier,
      })),
      paymentMethod,
      patientReference,
      notes,
    };
    await offlineStore.saveParkedCart(parked);
    setParkedCarts((prev) => [parked, ...prev]);
    setCart([]);
    setPatientReference('');
    setNotes('');
    setCashTendered('');
    setSplitCashAmount('');
    setStatusNotice(`Cart parked as "${parked.label}".`);
  }

  async function handleResumeParked(parked: ParkedCart) {
    soundEngine.playAddToCart();
    const restored: CartItem[] = [];
    for (const item of parked.items) {
      const liveDrug = drugs.find((d) => d.id === item.drugId);
      if (liveDrug && liveDrug.stock > 0) {
        const mult = getUnitMultiplier(liveDrug, item.unitTier);
        const maxQty = Math.floor(liveDrug.stock / mult);
        if (maxQty > 0) {
          restored.push({
            drug: liveDrug,
            unitTier: item.unitTier,
            quantity: Math.min(item.quantity, maxQty),
          });
        }
      }
    }
    setCart(restored);
    setPaymentMethod(parked.paymentMethod);
    setPatientReference(parked.patientReference);
    setNotes(parked.notes);
    await offlineStore.removeParkedCart(parked.id);
    setParkedCarts((prev) => prev.filter((p) => p.id !== parked.id));
    setShowParkedDrawer(false);
  }

  async function handleDiscardParked(id: string) {
    soundEngine.playTap();
    await offlineStore.removeParkedCart(id);
    setParkedCarts((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (cart.length === 0) {
      setError('Add at least one medicine to the cart.');
      return;
    }
    if (paymentMethod === 'split') {
      if (!Number.isFinite(splitCashNum) || splitCashNum <= 0 || splitCashNum >= totalAmount) {
        soundEngine.playWarning();
        setError(`Enter a valid cash portion between 1 and ${(totalAmount - 0.01).toFixed(2)} ${cur}.`);
        return;
      }
    }
    if (paymentMethod !== 'cash' && !paymentProofImage) {
      soundEngine.playWarning();
      setError('Upload or capture a picture of the payment confirmation message.');
      return;
    }
    if (requiresPrescription && !prescriptionImage) {
      soundEngine.playWarning();
      setError('One or more items require a prescription (Rx). Capture the prescription image.');
      return;
    }

    setSubmitting(true);
    const clientSyncId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const nowIso = new Date().toISOString();
    const salePayload = {
      items: cart.map((c) => ({ drugId: c.drug.id, quantity: c.quantity, unitTier: c.unitTier })),
      paymentMethod,
      cashTendered: paymentMethod === 'cash' && cashTenderedNum > 0 ? cashTenderedNum : undefined,
      splitCashAmount: paymentMethod === 'split' ? splitCashNum : undefined,
      splitSecondMethod: paymentMethod === 'split' ? splitSecondMethod : undefined,
      paymentProofImage: paymentMethod !== 'cash' ? paymentProofImage : undefined,
      prescriptionImage: requiresPrescription ? prescriptionImage : undefined,
      patientReference: patientReference.trim() || undefined,
      notes: notes.trim() || undefined,
      clientSyncId,
      offlineCreatedAt: nowIso,
    };

    try {
      if (!isOnline) {
        throw new TypeError('Offline');
      }
      const res = await api.createTransaction(salePayload);
      soundEngine.playSaleComplete();
      setCart([]);
      setCashTendered('');
      setSplitCashAmount('');
      setPaymentProofImage('');
      setPrescriptionImage('');
      setPatientReference('');
      setNotes('');
      await onSaleCompleted(res.transaction, res.triggeredLowStock);
      onOpenReceipt(res.transaction);
    } catch (err) {
      // Queue durably in IndexedDB if offline or network failure (not business validation error!)
      const isNetworkIssue =
        !isOnline ||
        err instanceof TypeError ||
        (err instanceof Error && /failed to fetch|network|offline/i.test(err.message));

      if (isNetworkIssue) {
        const offlineReceiptNumber = `OFF-${nowIso.slice(2, 10).replace(/-/g, '')}-${String(
          pendingSales.length + 1
        ).padStart(3, '0')}`;
        const queued: OfflineQueuedSale = {
          clientSyncId,
          offlineReceiptNumber,
          createdAt: nowIso,
          cashierId: user.id,
          cashierName: user.name,
          payload: salePayload,
          estimatedTotal: totalAmount,
        };
        await offlineStore.enqueueSale(queued);
        onOfflineSaleQueued(queued);

        const provisionalTxn: Transaction = {
          id: clientSyncId,
          receiptNumber: offlineReceiptNumber,
          cashierId: user.id,
          cashierName: user.name,
          items: cart.map((c) => {
            const mult = getUnitMultiplier(c.drug, c.unitTier);
            const price = getUnitPrice(c.drug, c.unitTier);
            return {
              drugId: c.drug.id,
              drugName: c.drug.name,
              dosageForm: c.drug.dosageForm,
              strength: c.drug.strength,
              quantity: c.quantity,
              unitTier: c.unitTier,
              unitLabel: getUnitShortLabel(c.drug, c.unitTier),
              baseUnitsDeducted: c.quantity * mult,
              unitSellingPrice: price,
              lineTotal: Number((price * c.quantity).toFixed(2)),
              requiresPrescription: c.drug.requiresPrescription,
            };
          }),
          subtotal: Number(subtotal.toFixed(2)),
          taxAmount,
          totalAmount,
          paymentMethod,
          cashTendered: paymentMethod === 'cash' && cashTenderedNum > 0 ? cashTenderedNum : undefined,
          changeDue: paymentMethod === 'cash' ? changeDue : undefined,
          splitCashAmount: paymentMethod === 'split' ? splitCashNum : undefined,
          splitNonCashAmount: paymentMethod === 'split' ? splitRemainingNum : undefined,
          splitSecondMethod: paymentMethod === 'split' ? splitSecondMethod : undefined,
          paymentProofImage: paymentMethod !== 'cash' ? paymentProofImage : undefined,
          prescriptionImage: requiresPrescription ? prescriptionImage : undefined,
          patientReference: patientReference.trim() || undefined,
          notes: notes.trim() || undefined,
          syncedFromOffline: true,
          createdAt: nowIso,
        };

        soundEngine.playSaleComplete();
        setCart([]);
        setCashTendered('');
        setSplitCashAmount('');
        setPaymentProofImage('');
        setPrescriptionImage('');
        setPatientReference('');
        setNotes('');
        setStatusNotice(`Saved offline (${offlineReceiptNumber}). Will sync automatically when internet returns.`);
        onOpenReceipt(provisionalTxn);
      } else {
        soundEngine.playWarning();
        setError(err instanceof Error ? err.message : 'Checkout failed.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBlindShiftClose(e: React.FormEvent) {
    e.preventDefault();
    const counted = Number(countedCash);
    if (!Number.isFinite(counted) || counted < 0) return;
    setSubmittingClose(true);
    try {
      await api.submitBlindShiftClose({
        countedCash: counted,
        notes: closeNotes.trim() || undefined,
      });
      soundEngine.playSaleComplete();
      setShowBlindCloseModal(false);
      setCountedCash('');
      setCloseNotes('');
      setStatusNotice(`Blind cash count submitted (${counted.toFixed(2)} ${cur}). Sent to owner.`);
    } catch (err) {
      soundEngine.playWarning();
      setError(err instanceof Error ? err.message : 'Failed to submit shift close.');
    } finally {
      setSubmittingClose(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Apple-style Offline / Hold / Blind Shift Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              isOnline
                ? 'bg-[#0D6E52]/10 dark:bg-[#22C58B]/15 text-[#0D6E52] dark:text-[#22C58B]'
                : 'bg-amber-500/15 text-[#B97716] dark:text-[#E5A93C]'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
            {isOnline ? t('onlineMode') : t('offlineMode')}
          </div>

          {pendingSales.length > 0 && (
            <button
              type="button"
              disabled={!isOnline || syncingOffline}
              onClick={() => void onSyncOffline()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 text-[#B97716] dark:text-[#E5A93C] text-xs font-semibold disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingOffline ? 'animate-spin' : ''}`} />
              {pendingSales.length} {t('pendingSync')} {isOnline ? `· ${t('syncNow')}` : ''}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              setShowParkedDrawer(!showParkedDrawer);
            }}
            className="apple-surface inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-2xl text-xs font-semibold transition-transform active:scale-95"
          >
            <PauseCircle className="w-3.5 h-3.5 text-[#B97716] dark:text-[#E5A93C]" />
            {t('parkedCarts')} ({parkedCarts.length})
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              setShowBlindCloseModal(true);
            }}
            className="apple-surface inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-2xl text-xs font-semibold transition-transform active:scale-95"
          >
            <Vault className="w-3.5 h-3.5 text-[#0D6E52] dark:text-[#22C58B]" />
            {t('blindShiftClose')}
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              setShowShiftHistory(!showShiftHistory);
            }}
            className="apple-surface inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-2xl text-xs font-semibold transition-transform active:scale-95"
          >
            <History className="w-3.5 h-3.5" />
            {showShiftHistory ? 'Back to Counter' : `My Sales (${transactions.length})`}
          </button>
        </div>
      </div>

      {statusNotice && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#0D6E52]/10 dark:bg-[#22C58B]/12 text-[#0D6E52] dark:text-[#22C58B] text-xs font-medium">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {statusNotice}
          </span>
          <button type="button" onClick={() => setStatusNotice(null)} className="p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {showParkedDrawer && (
        <div className="apple-surface rounded-[22px] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-bold">{t('parkedCarts')}</h4>
            <button type="button" onClick={() => setShowParkedDrawer(false)} className="text-xs text-[#5B6470]">
              Close
            </button>
          </div>
          {parkedCarts.length === 0 ? (
            <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] py-2">
              No parked carts. Use &ldquo;{t('holdCart')}&rdquo; inside the checkout bag to save a customer&rsquo;s cart while they wait.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {parkedCarts.map((p) => (
                <div key={p.id} className="p-3.5 rounded-2xl apple-inset flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{p.label}</p>
                    <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE] font-mono tabular-nums">
                      {p.items.length} line(s) · {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleResumeParked(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-[11px] font-semibold"
                    >
                      <PlayCircle className="w-3 h-3" />
                      Resume
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDiscardParked(p.id)}
                      className="p-1.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showShiftHistory ? (
        <div className="apple-surface rounded-[24px] overflow-hidden">
          <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold">Recent Dispensing Receipts</h3>
              <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
                Tap any receipt to reprint.
              </p>
            </div>
          </div>
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
            {transactions.slice(0, 20).map((txn) => (
              <div
                key={txn.id}
                className="px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold truncate">
                    {txn.receiptNumber} · {txn.paymentMethod.toUpperCase()}
                    {txn.syncedFromOffline ? ' · Offline Synced' : ''}
                  </p>
                  <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] mt-0.5 break-words">
                    {txn.items.map((i) => `${i.drugName} ×${i.quantity}`).join(', ')}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="sm:text-right">
                    <p className="font-mono tabular-nums font-bold text-sm">
                      {txn.totalAmount.toFixed(2)} {cur}
                    </p>
                    <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE] font-mono">
                      {formatClinicDate(txn.createdAt, settings.calendarMode, language, true)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenReceipt(txn)}
                    className="px-3.5 py-2 min-h-[40px] rounded-xl apple-inset text-xs font-semibold"
                  >
                    Receipt
                  </button>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="py-12 text-center text-sm text-[#5B6470] dark:text-[#98A2AE]">
                No sales completed yet.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Shelf / Dispensing Bag Toggle */}
          <div className="lg:hidden grid grid-cols-2 gap-1.5 p-1 rounded-2xl apple-surface">
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                setMobilePane('shelf');
              }}
              className={`py-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                mobilePane === 'shelf'
                  ? 'bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] shadow-sm'
                  : 'text-[#5B6470] dark:text-[#98A2AE]'
              }`}
            >
              Medicine Shelf ({filteredDrugs.length})
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                setMobilePane('bag');
              }}
              className={`py-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 ${
                mobilePane === 'bag'
                  ? 'bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] shadow-sm'
                  : 'text-[#5B6470] dark:text-[#98A2AE]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Bag ({cartTotalItems}) · {totalAmount.toFixed(0)} {cur}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 columns: Available Medicine Shelf */}
          <div className={`lg:col-span-7 space-y-4 min-w-0 ${mobilePane === 'shelf' ? 'block' : 'hidden lg:block'}`}>
            <div className="apple-surface rounded-[22px] p-3.5 sm:p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6470] dark:text-[#98A2AE]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search drug, generic, barcode, or shelf..."
                    className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-2xl apple-inset text-sm focus:outline-none focus:ring-2 focus:ring-[#0D6E52] dark:focus:ring-[#22C58B]"
                  />
                </div>
                <label className="inline-flex items-center justify-center gap-2 text-xs font-medium cursor-pointer px-3 py-2.5 min-h-[44px] rounded-2xl apple-inset shrink-0">
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                    className="accent-[#0D6E52]"
                  />
                  In Stock Only
                </label>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 max-w-full">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    setFormFilter('all');
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    formFilter === 'all'
                      ? 'bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310]'
                      : 'apple-inset text-[#5B6470] dark:text-[#98A2AE]'
                  }`}
                >
                  All Kinds
                </button>
                {drugKinds.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playTap();
                      setFormFilter(kind.id);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredDrugs.map((drug) => {
                const outOfStock = drug.stock <= 0;
                const lowStock = drug.stock > 0 && drug.stock <= drug.lowStockThreshold;
                const kindLabel = resolveDrugKind(drug.dosageForm, drugKinds).label;
                const unitOpts = getDrugUnitOptions(drug);
                const hasMultipleUnits = unitOpts.length > 1;

                return (
                  <motion.div
                    key={drug.id}
                    whileTap={!outOfStock ? { scale: 0.985 } : undefined}
                    onClick={() => !outOfStock && addToCart(drug)}
                    role="button"
                    tabIndex={outOfStock ? -1 : 0}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !outOfStock) {
                        e.preventDefault();
                        addToCart(drug);
                      }
                    }}
                    className={`text-left p-4 rounded-[22px] apple-surface transition-all flex gap-3.5 ${
                      outOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'
                    }`}
                  >
                    <DrugThumbnail
                      imageUrl={drug.imageUrl}
                      dosageForm={drug.dosageForm}
                      drugKinds={drugKinds}
                      name={drug.name}
                      className="w-12 h-12 rounded-2xl"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-display font-bold text-sm truncate">{drug.name}</p>
                          <span className="font-mono tabular-nums font-bold text-sm text-[#0D6E52] dark:text-[#22C58B] shrink-0">
                            {drug.sellingPrice.toFixed(0)} {cur}
                          </span>
                        </div>
                        <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] truncate">
                          {drug.strength} · {kindLabel}
                          {drug.shelfLocation ? ` · ${drug.shelfLocation}` : ''}
                        </p>
                      </div>

                      {hasMultipleUnits && !outOfStock && (
                        <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {unitOpts.map((opt) => (
                            <button
                              key={opt.tier}
                              type="button"
                              disabled={opt.maxQtyAvailable <= 0}
                              onClick={() => addToCart(drug, opt.tier)}
                              className="px-2.5 py-1.5 min-h-[34px] rounded-xl apple-inset text-[11px] font-semibold hover:bg-[#0D6E52]/12 hover:text-[#0D6E52] dark:hover:text-[#22C58B] disabled:opacity-40"
                            >
                              +{getUnitShortLabel(drug, opt.tier)} ({opt.price.toFixed(0)})
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] font-medium">
                        <span
                          className={
                            outOfStock
                              ? 'text-red-600 dark:text-red-400 font-semibold'
                              : lowStock
                                ? 'text-[#B97716] dark:text-[#E5A93C] font-semibold'
                                : 'text-[#5B6470] dark:text-[#98A2AE]'
                          }
                        >
                          {outOfStock ? 'Out of Stock' : formatStockBreakdown(drug)}
                        </span>

                        <span className="flex items-center gap-1.5 text-[#5B6470] dark:text-[#98A2AE]">
                          {drug.storageRequirement === 'refrigerated' && (
                            <Snowflake className="w-3 h-3 text-sky-500" />
                          )}
                          {drug.requiresPrescription ? (
                            <span className="text-[#B97716] dark:text-[#E5A93C] font-semibold">Rx</span>
                          ) : (
                            <span>OTC</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right 5 columns: Apple Checkout Sheet */}
          <form
            onSubmit={handleCheckout}
            className={`lg:col-span-5 min-w-0 apple-surface rounded-[26px] p-4 sm:p-5 space-y-4 lg:sticky lg:top-6 ${
              mobilePane === 'bag' ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="flex items-center justify-between border-b border-blue-500/10 dark:border-cyan-400/12 pb-3.5">
              <div className="flex items-center gap-2.5">
                <UiSticker kind="bag" className="w-8 h-8 rounded-xl" />
                <h3 className="font-display text-base font-bold">Dispensing Bag</h3>
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleHoldCart()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl apple-inset text-xs font-semibold text-[#B97716] dark:text-[#E5A93C]"
                    >
                      <PauseCircle className="w-3.5 h-3.5" />
                      {t('holdCart')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playTap();
                        setCart([]);
                      }}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center space-y-3 flex flex-col items-center">
                <StickerImage asset="careHeart" alt="Care heart" className="w-14 h-14 rounded-2xl" />
                <p className="text-sm font-medium text-[#526077] dark:text-[#93A8C8]">
                  Select medicines from the left shelf to begin a sale.
                </p>
                <p className="text-xs text-[#526077] dark:text-[#93A8C8]">
                  Prices are locked by the owner and cannot be edited at the counter.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {cart.map((item) => {
                    const unitOptions = getDrugUnitOptions(item.drug);
                    const unitPrice = getUnitPrice(item.drug, item.unitTier);
                    const lineTotal = unitPrice * item.quantity;
                    return (
                      <motion.div
                        key={`${item.drug.id}_${item.unitTier}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        className="p-3 rounded-2xl apple-inset space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                          <div className="min-w-0 flex-1 basis-[140px]">
                            <p className="text-xs font-semibold truncate">
                              {item.drug.name}
                              {item.drug.requiresPrescription && (
                                <span className="ml-1.5 text-[#B97716] dark:text-[#E5A93C]">· Rx</span>
                              )}
                            </p>
                            <p className="text-[11px] font-mono tabular-nums text-[#5B6470] dark:text-[#98A2AE]">
                              {unitPrice.toFixed(2)} {cur} / {getUnitShortLabel(item.drug, item.unitTier)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.drug.id, item.unitTier, item.quantity - 1)}
                              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08]"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-7 text-center font-mono tabular-nums text-xs font-bold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.drug.id, item.unitTier, item.quantity + 1)}
                              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08]"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-right shrink-0 ml-auto">
                            <p className="font-mono tabular-nums text-xs font-bold">
                              {lineTotal.toFixed(2)} {cur}
                            </p>
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.drug.id, item.unitTier, 0)}
                              className="text-[11px] text-red-600 dark:text-red-400 hover:underline py-0.5"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {unitOptions.length > 1 && (
                          <div className="flex items-center gap-1 pt-1 border-t border-black/[0.05] dark:border-white/[0.06]">
                            {unitOptions.map((opt) => (
                              <button
                                key={opt.tier}
                                type="button"
                                onClick={() => updateItemTier(item.drug.id, item.unitTier, opt.tier)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                                  item.unitTier === opt.tier
                                    ? 'bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310]'
                                    : 'text-[#5B6470] dark:text-[#98A2AE] hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                              >
                                {getUnitShortLabel(item.drug, opt.tier)} ({opt.price.toFixed(0)})
                              </button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Totals */}
            <div className="p-3.5 rounded-2xl apple-inset space-y-1.5 text-xs">
              <div className="flex justify-between text-[#5B6470] dark:text-[#98A2AE]">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{subtotal.toFixed(2)} {cur}</span>
              </div>
              <div className="flex justify-between text-[#5B6470] dark:text-[#98A2AE]">
                <span>Tax ({settings.taxRatePercent}%)</span>
                <span className="font-mono tabular-nums">{taxAmount.toFixed(2)} {cur}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-1.5 border-t border-black/[0.06] dark:border-white/[0.08]">
                <span>Total Due</span>
                <span className="font-mono tabular-nums text-[#0D6E52] dark:text-[#22C58B]">
                  {totalAmount.toFixed(2)} {cur}
                </span>
              </div>
            </div>

            {/* Payment Method (Cash, Transfer, Card, Split) */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-[#5B6470] dark:text-[#98A2AE]">
                {t('paymentMethod')}
              </label>
              <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl apple-inset">
                {(
                  [
                    { id: 'cash', label: t('cash'), sticker: 'cash' },
                    { id: 'transfer', label: t('transfer'), sticker: 'transfer' },
                    { id: 'card', label: t('card'), sticker: 'card' },
                    { id: 'split', label: t('split'), sticker: 'split' },
                  ] as const
                ).map((m) => {
                  const active = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playTap();
                        setPaymentMethod(m.id);
                      }}
                      className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-[11px] font-semibold transition-all ${
                        active
                          ? 'apple-surface text-[#1464F6] dark:text-[#22D3EE] shadow-sm'
                          : 'text-[#526077] dark:text-[#93A8C8]'
                      }`}
                    >
                      <UiSticker kind={m.sticker} className="w-6 h-6 rounded-lg" />
                      {m.label}
                    </button>
                  );
                })}
              </div>

              {paymentMethod === 'cash' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl apple-inset">
                  <div>
                    <label className="block text-[11px] text-[#5B6470] dark:text-[#98A2AE] mb-1">
                      Cash Received ({cur})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder={totalAmount.toFixed(2)}
                      className="w-full px-3 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono tabular-nums"
                    />
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center sm:text-right">
                    <span className="text-[11px] text-[#5B6470] dark:text-[#98A2AE]">Change Due</span>
                    <span className="font-mono tabular-nums font-bold text-sm text-[#0D6E52] dark:text-[#22C58B]">
                      {changeDue.toFixed(2)} {cur}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'split' && (
                <div className="p-3.5 rounded-2xl apple-inset space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#5B6470] dark:text-[#98A2AE] mb-1">
                        Cash Portion ({cur}) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={splitCashAmount}
                        onChange={(e) => setSplitCashAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#5B6470] dark:text-[#98A2AE] mb-1">
                        2nd Method ({splitRemainingNum.toFixed(2)} {cur})
                      </label>
                      <select
                        value={splitSecondMethod}
                        onChange={(e) => setSplitSecondMethod(e.target.value as 'transfer' | 'card')}
                        className="w-full px-3 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs"
                      >
                        <option value="transfer">Telebirr / Bank Transfer</option>
                        <option value="card">Card POS</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod !== 'cash' && (
                <div className="p-3.5 rounded-2xl border border-[#0D6E52]/30 dark:border-[#22C58B]/30 bg-[#0D6E52]/8 dark:bg-[#22C58B]/10 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#0D6E52] dark:text-[#22C58B]">
                      {t('paymentProofRequired')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCaptureTarget('payment')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-xs font-semibold"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      {paymentProofImage ? 'Retake' : 'Take Picture'}
                    </button>
                  </div>
                  {paymentProofImage ? (
                    <div className="flex items-center gap-3">
                      <img src={paymentProofImage} alt="Payment confirmation" className="w-16 h-12 object-cover rounded-xl" />
                      <span className="text-xs font-medium text-[#0D6E52] dark:text-[#22C58B] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Attached
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE]">
                      Capture the Telebirr / CBE Birr confirmation message or card slip.
                    </p>
                  )}
                </div>
              )}
            </div>

            {requiresPrescription && (
              <div className="p-3.5 rounded-2xl border border-amber-400/50 dark:border-amber-700/50 bg-amber-50/70 dark:bg-amber-950/25 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 inline-flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {t('rxImageRequired')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCaptureTarget('prescription')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#B97716] dark:bg-[#E5A93C] text-white dark:text-[#111827] text-xs font-semibold"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {prescriptionImage ? 'Retake Rx' : 'Capture Rx'}
                  </button>
                </div>
                {prescriptionImage ? (
                  <div className="flex items-center gap-3">
                    <img src={prescriptionImage} alt="Prescription verification" className="w-16 h-12 object-cover rounded-xl" />
                    <span className="text-xs font-medium text-[#0D6E52] dark:text-[#22C58B] inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Prescription attached
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Cannot complete sale until prescription image is attached.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                value={patientReference}
                onChange={(e) => setPatientReference(e.target.value)}
                placeholder="Patient name / Rx # (optional)"
                className="px-3.5 py-2 rounded-xl apple-inset text-xs"
              />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Shift note (optional)"
                className="px-3.5 py-2 rounded-xl apple-inset text-xs"
              />
            </div>

            {posLocked && (
              <div className="flex items-start gap-2 p-3 rounded-2xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>POS checkout is temporarily locked by the software vendor. Call 0945206759.</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <MagneticButton
              type="submit"
              disabled={submitting || cart.length === 0 || posLocked}
              className="w-full py-3.5 px-5 min-h-[48px] rounded-2xl font-display font-bold text-sm disabled:opacity-45"
            >
              {posLocked
                ? 'POS Locked by Vendor'
                : submitting
                  ? 'Processing...'
                  : !isOnline
                    ? `Save Offline Sale (${totalAmount.toFixed(2)} ${cur})`
                    : `${t('completeSale')} (${totalAmount.toFixed(2)} ${cur})`}
            </MagneticButton>
          </form>
        </div>

        {/* Mobile Floating Bag Action Bar when browsing shelf */}
        {mobilePane === 'shelf' && cart.length > 0 && (
          <div className="lg:hidden fixed bottom-[70px] inset-x-3.5 z-30">
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                setMobilePane('bag');
              }}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[48px] rounded-2xl yoya-btn-primary text-white dark:text-[#081310] shadow-xl text-xs font-bold"
            >
              <span className="inline-flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 shrink-0" />
                View Bag ({cartTotalItems} items)
              </span>
              <span className="font-mono tabular-nums text-sm">
                {totalAmount.toFixed(2)} {cur} →
              </span>
            </button>
          </div>
        )}
      </div>
      )}

      {/* Blind End-of-Shift Cash Count Modal */}
      {showBlindCloseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto yoya-scroll-contain"
          onClick={() => setShowBlindCloseModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            className="w-full max-w-md apple-surface yoya-modal-panel outline-none rounded-[26px] shadow-2xl overflow-hidden max-h-[88vh] overflow-y-auto yoya-scroll-contain"
          >
            <div className="apple-glass flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <Vault className="w-5 h-5 text-[#0D6E52] dark:text-[#22C58B]" />
                <div>
                  <h3 className="font-display text-base font-bold">{t('blindShiftClose')}</h3>
                  <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
                    Count physical Birr in the drawer. Expected total is hidden for integrity.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBlindCloseModal(false)}
                className="p-2 rounded-full apple-inset"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleBlindShiftClose} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                  Physical Cash Counted ({cur}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder="Enter exact drawer cash total..."
                  className="w-full px-4 py-3 rounded-2xl apple-inset text-lg font-mono tabular-nums font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                  Handover Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Any drawer notes for the owner..."
                  className="w-full px-3.5 py-2.5 rounded-2xl apple-inset text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBlindCloseModal(false)}
                  className="px-4 py-2 rounded-xl apple-inset text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClose}
                  className="px-5 py-2 rounded-xl bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-xs font-semibold"
                >
                  {submittingClose ? 'Submitting...' : 'Submit Blind Count'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CameraCaptureModal
        open={captureTarget !== null}
        title={
          captureTarget === 'payment'
            ? 'Capture Payment Confirmation Message'
            : 'Capture Medical Prescription (Rx)'
        }
        subtitle={
          captureTarget === 'payment'
            ? 'Snap a photo of the Telebirr/CBE/Bank transfer screen or upload the screenshot.'
            : 'Take a clear photo of the patient prescription before dispensing.'
        }
        onClose={() => setCaptureTarget(null)}
        onCapture={(dataUrl) => {
          if (captureTarget === 'payment') {
            setPaymentProofImage(dataUrl);
          } else if (captureTarget === 'prescription') {
            setPrescriptionImage(dataUrl);
          }
        }}
      />
    </div>
  );
}
