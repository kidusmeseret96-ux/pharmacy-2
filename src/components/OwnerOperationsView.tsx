import React, { useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Building2,
  CheckCircle2,
  Edit3,
  Plus,
  Receipt,
  ShieldCheck,
  Trash2,
  Vault,
  X,
} from 'lucide-react';
import { formatClinicDate } from '../lib/ethiopianCalendar.ts';
import { getTranslator } from '../lib/i18n.ts';
import { soundEngine } from '../lib/soundEngine.ts';
import type {
  AuditLogEntry,
  CalendarMode,
  ExpenseCategory,
  ExpenseRecord,
  Language,
  PayrollMethod,
  ShiftCloseReport,
  Supplier,
  SupplierInvoice,
} from '../types/pharmacy.ts';
import { UiSticker } from './MotionPrimitives.tsx';

interface OwnerOperationsViewProps {
  shiftCloses: ShiftCloseReport[];
  expenses: ExpenseRecord[];
  suppliers: Supplier[];
  supplierInvoices: SupplierInvoice[];
  auditLog: AuditLogEntry[];
  auditChainValid: boolean;
  currencySymbol: string;
  calendarMode: CalendarMode;
  language: Language;
  onCreateExpense: (payload: {
    title: string;
    category: ExpenseCategory;
    amount: number;
    paymentMethod: PayrollMethod;
    date?: string;
    notes?: string;
  }) => Promise<void>;
  onUpdateExpense?: (
    id: string,
    payload: {
      title?: string;
      category?: ExpenseCategory;
      amount?: number;
      paymentMethod?: PayrollMethod;
      date?: string;
      notes?: string;
    }
  ) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onCreateSupplier: (payload: {
    name: string;
    phone: string;
    tinNumber?: string;
    address?: string;
    notes?: string;
  }) => Promise<void>;
  onUpdateSupplier?: (
    id: string,
    payload: {
      name?: string;
      phone?: string;
      tinNumber?: string;
      address?: string;
      notes?: string;
    }
  ) => Promise<void>;
  onDeleteSupplier?: (id: string) => Promise<void>;
  onCreateSupplierInvoice: (payload: {
    supplierId: string;
    invoiceNumber?: string;
    itemsSummary?: string;
    totalAmount: number;
    paidAmount?: number;
    dueDate?: string;
  }) => Promise<void>;
  onUpdateSupplierInvoice?: (
    id: string,
    payload: {
      supplierId?: string;
      invoiceNumber?: string;
      itemsSummary?: string;
      totalAmount?: number;
      dueDate?: string;
    }
  ) => Promise<void>;
  onPaySupplierInvoice: (
    invoiceId: string,
    payload: { amount: number; method: PayrollMethod; reference?: string }
  ) => Promise<void>;
  onDeleteSupplierInvoice?: (invoiceId: string) => Promise<void>;
}

type SubTab = 'shifts' | 'expenses' | 'suppliers' | 'audit';

export function OwnerOperationsView({
  shiftCloses,
  expenses,
  suppliers,
  supplierInvoices,
  auditLog,
  auditChainValid,
  currencySymbol,
  calendarMode,
  language,
  onCreateExpense,
  onUpdateExpense,
  onDeleteExpense,
  onCreateSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onCreateSupplierInvoice,
  onUpdateSupplierInvoice,
  onPaySupplierInvoice,
  onDeleteSupplierInvoice,
}: OwnerOperationsViewProps) {
  const t = getTranslator(language);
  const [subTab, setSubTab] = useState<SubTab>('shifts');
  const cur = currencySymbol;

  // Expense form
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('rent');
  const [expAmount, setExpAmount] = useState('');
  const [expMethod, setExpMethod] = useState<PayrollMethod>('cash');
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expNotes, setExpNotes] = useState('');

  // Supplier & Invoice form
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supTin, setSupTin] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supNotes, setSupNotes] = useState('');
  const [supError, setSupError] = useState<string | null>(null);

  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invSupplierId, setInvSupplierId] = useState(suppliers[0]?.id || '');
  const [invNum, setInvNum] = useState('');
  const [invItems, setInvItems] = useState('');
  const [invTotal, setInvTotal] = useState('');
  const [invPaid, setInvPaid] = useState('0');
  const [invDue, setInvDue] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );

  // Pay invoice modal
  const [payingInvoice, setPayingInvoice] = useState<SupplierInvoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PayrollMethod>('bank_transfer');
  const [payRef, setPayRef] = useState('');

  function resetExpenseForm() {
    setEditingExpenseId(null);
    setExpTitle('');
    setExpCategory('rent');
    setExpAmount('');
    setExpMethod('cash');
    setExpDate(new Date().toISOString().slice(0, 10));
    setExpNotes('');
  }

  function startEditExpense(exp: ExpenseRecord) {
    soundEngine.playTap();
    setEditingExpenseId(exp.id);
    setExpTitle(exp.title);
    setExpCategory(exp.category);
    setExpAmount(String(exp.amount));
    setExpMethod(exp.paymentMethod);
    setExpDate(exp.date.slice(0, 10));
    setExpNotes(exp.notes || '');
  }

  function resetSupplierForm() {
    setEditingSupplierId(null);
    setSupName('');
    setSupPhone('');
    setSupTin('');
    setSupAddress('');
    setSupNotes('');
    setSupError(null);
  }

  function startEditSupplier(sup: Supplier) {
    soundEngine.playTap();
    setEditingSupplierId(sup.id);
    setSupName(sup.name);
    setSupPhone(sup.phone || '');
    setSupTin(sup.tinNumber || '');
    setSupAddress(sup.address || '');
    setSupNotes(sup.notes || '');
    setSupError(null);
  }

  function resetInvoiceForm() {
    setEditingInvoiceId(null);
    setInvSupplierId(suppliers[0]?.id || '');
    setInvNum('');
    setInvItems('');
    setInvTotal('');
    setInvPaid('0');
    setInvDue(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
    setSupError(null);
  }

  function startEditInvoice(inv: SupplierInvoice) {
    soundEngine.playTap();
    setEditingInvoiceId(inv.id);
    setInvSupplierId(inv.supplierId);
    setInvNum(inv.invoiceNumber || '');
    setInvItems(inv.itemsSummary || '');
    setInvTotal(String(inv.totalAmount));
    setInvDue(inv.dueDate ? inv.dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setSupError(null);
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expTitle.trim() || !expAmount) return;
    if (editingExpenseId && onUpdateExpense) {
      await onUpdateExpense(editingExpenseId, {
        title: expTitle.trim(),
        category: expCategory,
        amount: Number(expAmount),
        paymentMethod: expMethod,
        date: expDate,
        notes: expNotes.trim(),
      });
    } else {
      await onCreateExpense({
        title: expTitle.trim(),
        category: expCategory,
        amount: Number(expAmount),
        paymentMethod: expMethod,
        date: expDate,
        notes: expNotes.trim() || undefined,
      });
    }
    soundEngine.playAddToCart();
    resetExpenseForm();
  }

  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!supName.trim()) return;
    setSupError(null);
    try {
      if (editingSupplierId && onUpdateSupplier) {
        await onUpdateSupplier(editingSupplierId, {
          name: supName.trim(),
          phone: supPhone.trim(),
          tinNumber: supTin.trim(),
          address: supAddress.trim(),
          notes: supNotes.trim(),
        });
      } else {
        await onCreateSupplier({
          name: supName.trim(),
          phone: supPhone.trim(),
          tinNumber: supTin.trim() || undefined,
          address: supAddress.trim() || undefined,
          notes: supNotes.trim() || undefined,
        });
      }
      soundEngine.playAddToCart();
      resetSupplierForm();
    } catch (err) {
      soundEngine.playWarning();
      setSupError(err instanceof Error ? err.message : 'Failed to save supplier.');
    }
  }

  async function handleRemoveSupplier(supId: string) {
    if (!onDeleteSupplier) return;
    setSupError(null);
    try {
      await onDeleteSupplier(supId);
      soundEngine.playTap();
      if (editingSupplierId === supId) resetSupplierForm();
    } catch (err) {
      soundEngine.playWarning();
      setSupError(err instanceof Error ? err.message : 'Could not delete supplier.');
    }
  }

  async function handleAddInvoice(e: React.FormEvent) {
    e.preventDefault();
    const chosenSup = invSupplierId || suppliers[0]?.id;
    if (!chosenSup || !invTotal) return;
    setSupError(null);
    try {
      if (editingInvoiceId && onUpdateSupplierInvoice) {
        await onUpdateSupplierInvoice(editingInvoiceId, {
          supplierId: chosenSup,
          invoiceNumber: invNum.trim() || undefined,
          itemsSummary: invItems.trim() || undefined,
          totalAmount: Number(invTotal),
          dueDate: invDue,
        });
      } else {
        await onCreateSupplierInvoice({
          supplierId: chosenSup,
          invoiceNumber: invNum.trim() || undefined,
          itemsSummary: invItems.trim() || undefined,
          totalAmount: Number(invTotal),
          paidAmount: Number(invPaid) || 0,
          dueDate: invDue,
        });
      }
      soundEngine.playAddToCart();
      resetInvoiceForm();
    } catch (err) {
      soundEngine.playWarning();
      setSupError(err instanceof Error ? err.message : 'Failed to save invoice.');
    }
  }

  async function handleConfirmInvoicePay(e: React.FormEvent) {
    e.preventDefault();
    if (!payingInvoice || !payAmount) return;
    await onPaySupplierInvoice(payingInvoice.id, {
      amount: Number(payAmount),
      method: payMethod,
      reference: payRef.trim() || undefined,
    });
    soundEngine.playSaleComplete();
    setPayingInvoice(null);
    setPayAmount('');
    setPayRef('');
  }

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalSupplierOwed = supplierInvoices.reduce(
    (acc, i) => acc + Math.max(0, i.totalAmount - i.paidAmount),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <UiSticker kind="operations" className="w-11 h-11 rounded-2xl hidden sm:flex" />
          <div className="min-w-0">
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">{t('operations')}</h2>
            <p className="text-xs sm:text-sm text-[#526077] dark:text-[#93A8C8]">
              Blind shift cash reports, pharmacy operating expenses, wholesale supplier credit, and cryptographic audit ledger.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-1 p-1 rounded-2xl apple-inset w-full sm:w-auto">
          {(
            [
              { id: 'shifts', label: t('shiftReports'), icon: Vault },
              { id: 'expenses', label: t('expenses'), icon: Receipt },
              { id: 'suppliers', label: t('suppliers'), icon: Building2 },
              { id: 'audit', label: t('auditLog'), icon: ShieldCheck },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  setSubTab(tab.id);
                }}
                className={`inline-flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-white dark:bg-[#1C2128] text-[#111827] dark:text-[#F3F6F8] shadow-sm'
                    : 'text-[#5B6470] dark:text-[#98A2AE]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Blind Shift Z-Reports */}
      {subTab === 'shifts' && (
        <div className="apple-surface rounded-[24px] overflow-hidden">
          <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
            <h3 className="font-display text-base font-bold">Blind End-of-Shift Cash Reports</h3>
            <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
              Sellers enter physical drawer cash without seeing expected sales. Discrepancies appear here automatically.
            </p>
          </div>
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
            {shiftCloses.map((s) => (
              <div key={s.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">
                    {s.workerName} · {s.transactionCount} sale(s)
                  </p>
                  <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] font-mono break-words">
                    {formatClinicDate(s.closedAt, calendarMode, language, true)}
                    {s.notes ? ` · ${s.notes}` : ''}
                  </p>
                </div>
                <div className="grid grid-cols-3 sm:flex sm:items-center gap-3 sm:gap-6 font-mono tabular-nums text-xs w-full sm:w-auto">
                  <div className="sm:text-right">
                    <p className="text-[#5B6470] dark:text-[#98A2AE]">Counted</p>
                    <p className="font-bold text-xs sm:text-sm">{s.countedCash.toFixed(2)} {cur}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[#5B6470] dark:text-[#98A2AE]">Expected</p>
                    <p className="font-bold text-xs sm:text-sm">{(s.expectedCash ?? 0).toFixed(2)} {cur}</p>
                  </div>
                  <div className="sm:text-right sm:min-w-[90px]">
                    <p className="text-[#5B6470] dark:text-[#98A2AE]">Variance</p>
                    <p
                      className={`font-bold text-xs sm:text-sm ${
                        s.status === 'exact'
                          ? 'text-[#0D6E52] dark:text-[#22C58B]'
                          : s.status === 'over'
                            ? 'text-[#B97716] dark:text-[#E5A93C]'
                            : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {(s.variance ?? 0) >= 0 ? '+' : ''}
                      {(s.variance ?? 0).toFixed(2)} {cur} ({s.status?.toUpperCase()})
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {shiftCloses.length === 0 && (
              <p className="py-12 text-center text-sm text-[#5B6470] dark:text-[#98A2AE]">
                No blind shift counts submitted yet. Sellers can submit one from the POS counter.
              </p>
            )}
          </div>
        </div>
      )}

      {/* 2. Expense Tracker */}
      {subTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleAddExpense} className="lg:col-span-4 apple-surface rounded-[24px] p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold">
                {editingExpenseId ? 'Edit Business Expense' : 'Record Business Expense'}
              </h3>
              {editingExpenseId && (
                <button
                  type="button"
                  onClick={resetExpenseForm}
                  className="text-xs font-semibold text-[#5B6470] dark:text-[#98A2AE] hover:underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            <input
              type="text"
              required
              value={expTitle}
              onChange={(e) => setExpTitle(e.target.value)}
              placeholder="e.g. Shop Rent, Electric Bill, Guard..."
              className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                className="px-3 py-2.5 rounded-xl apple-inset text-xs"
              >
                <option value="rent">Rent</option>
                <option value="utilities">Utilities / Power</option>
                <option value="supplies">Packaging / Supplies</option>
                <option value="maintenance">Maintenance</option>
                <option value="license">EFDA / License</option>
                <option value="other">Other</option>
              </select>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder={`Amount (${cur})`}
                className="px-3 py-2.5 rounded-xl apple-inset text-xs font-mono tabular-nums"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={expMethod}
                onChange={(e) => setExpMethod(e.target.value as PayrollMethod)}
                className="px-3 py-2.5 rounded-xl apple-inset text-xs"
              >
                <option value="cash">Cash</option>
                <option value="telebirr">Telebirr</option>
                <option value="cbe_birr">CBE Birr</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
              <input
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="px-3 py-2.5 rounded-xl apple-inset text-xs font-mono"
              />
            </div>
            <input
              type="text"
              value={expNotes}
              onChange={(e) => setExpNotes(e.target.value)}
              placeholder="Optional note..."
              className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-xs"
            />
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              {editingExpenseId ? 'Update Expense' : 'Save Expense'}
            </button>
          </form>

          <div className="lg:col-span-8 apple-surface rounded-[24px] overflow-hidden">
            <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
              <h3 className="font-display text-base font-bold">Operating Expenses Ledger</h3>
              <span className="font-mono tabular-nums font-bold text-sm text-[#B97716] dark:text-[#E5A93C]">
                Total: {totalExpenses.toLocaleString()} {cur}
              </span>
            </div>
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
              {expenses.map((e) => (
                <div key={e.id} className="px-6 py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">
                      {e.title} <span className="text-xs font-normal text-[#5B6470] dark:text-[#98A2AE]">· {e.category}</span>
                    </p>
                    <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] font-mono">
                      {formatClinicDate(e.date, calendarMode, language)} · {e.paymentMethod.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="font-mono tabular-nums font-bold text-sm">
                      {e.amount.toLocaleString()} {cur}
                    </span>
                    {onUpdateExpense && (
                      <button
                        type="button"
                        onClick={() => startEditExpense(e)}
                        className="p-1.5 rounded-xl text-[#5B6470] dark:text-[#98A2AE] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
                        aria-label="Edit expense"
                        title="Edit expense"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void onDeleteExpense(e.id)}
                      className="p-1.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/10"
                      aria-label="Delete expense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {expenses.length === 0 && (
                <p className="py-10 text-center text-xs text-[#5B6470] dark:text-[#98A2AE]">
                  No expenses recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Suppliers & Credit Invoices */}
      {subTab === 'suppliers' && (
        <div className="space-y-6">
          {supError && (
            <div className="p-3.5 rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
              {supError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form onSubmit={handleAddSupplier} className="lg:col-span-5 apple-surface rounded-[24px] p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold">
                  {editingSupplierId ? 'Edit Wholesale Supplier' : 'Add Wholesale Supplier / Importer'}
                </h3>
                {editingSupplierId && (
                  <button
                    type="button"
                    onClick={resetSupplierForm}
                    className="text-xs font-semibold text-[#5B6470] dark:text-[#98A2AE] hover:underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={supName}
                onChange={(e) => setSupName(e.target.value)}
                placeholder="Supplier company name"
                className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  placeholder="Phone (+251...)"
                  className="px-3.5 py-2 rounded-xl apple-inset text-xs"
                />
                <input
                  type="text"
                  value={supTin}
                  onChange={(e) => setSupTin(e.target.value)}
                  placeholder="TIN Number"
                  className="px-3.5 py-2 rounded-xl apple-inset text-xs font-mono"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="Address / City (optional)"
                  className="px-3.5 py-2 rounded-xl apple-inset text-xs"
                />
                <input
                  type="text"
                  value={supNotes}
                  onChange={(e) => setSupNotes(e.target.value)}
                  placeholder="Supplier notes (optional)"
                  className="px-3.5 py-2 rounded-xl apple-inset text-xs"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-2xl bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-xs font-semibold"
              >
                {editingSupplierId ? 'Update Supplier' : 'Save Supplier'}
              </button>
            </form>

            <form onSubmit={handleAddInvoice} className="lg:col-span-7 apple-surface rounded-[24px] p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold">
                  {editingInvoiceId ? 'Edit Supplier Credit Invoice' : 'Record Supplier Credit Invoice'}
                </h3>
                {editingInvoiceId && (
                  <button
                    type="button"
                    onClick={resetInvoiceForm}
                    className="text-xs font-semibold text-[#5B6470] dark:text-[#98A2AE] hover:underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={invSupplierId || suppliers[0]?.id || ''}
                  onChange={(e) => setInvSupplierId(e.target.value)}
                  className="px-3.5 py-2 rounded-xl apple-inset text-xs font-medium"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id} className="bg-white dark:bg-[#13161B]">
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={invNum}
                  onChange={(e) => setInvNum(e.target.value)}
                  placeholder="Invoice # (optional)"
                  className="px-3.5 py-2 rounded-xl apple-inset text-xs font-mono"
                />
              </div>
              <input
                type="text"
                value={invItems}
                onChange={(e) => setInvItems(e.target.value)}
                placeholder="Delivered drugs summary (e.g. Amoxicillin 20 boxes)"
                className="w-full px-3.5 py-2 rounded-xl apple-inset text-xs"
              />
              <div className={`grid grid-cols-1 ${editingInvoiceId ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3`}>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={invTotal}
                  onChange={(e) => setInvTotal(e.target.value)}
                  placeholder={`Total (${cur})`}
                  className="px-3 py-2.5 min-h-[42px] rounded-xl apple-inset text-xs font-mono tabular-nums"
                />
                {!editingInvoiceId && (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={invPaid}
                    onChange={(e) => setInvPaid(e.target.value)}
                    placeholder={`Paid Now (${cur})`}
                    className="px-3 py-2.5 min-h-[42px] rounded-xl apple-inset text-xs font-mono tabular-nums"
                  />
                )}
                <input
                  type="date"
                  value={invDue}
                  onChange={(e) => setInvDue(e.target.value)}
                  className="px-3 py-2.5 min-h-[42px] rounded-xl apple-inset text-xs font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={suppliers.length === 0}
                className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-2xl bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-xs font-semibold disabled:opacity-50"
              >
                {editingInvoiceId ? 'Update Credit Invoice' : 'Add Credit Invoice'}
              </button>
            </form>
          </div>

          {suppliers.length > 0 && (
            <div className="apple-surface rounded-[24px] p-5 space-y-3">
              <h3 className="font-display text-base font-bold">Registered Suppliers ({suppliers.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {suppliers.map((sup) => (
                  <div
                    key={sup.id}
                    className="p-3.5 rounded-2xl apple-inset flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{sup.name}</p>
                      <p className="text-[11px] font-mono text-[#5B6470] dark:text-[#98A2AE] truncate">
                        {sup.phone || 'No phone'}
                        {sup.tinNumber ? ` · TIN ${sup.tinNumber}` : ''}
                      </p>
                      {(sup.address || sup.notes) && (
                        <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE] truncate">
                          {[sup.address, sup.notes].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {onUpdateSupplier && (
                        <button
                          type="button"
                          onClick={() => startEditSupplier(sup)}
                          className="p-2 rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
                          aria-label="Edit supplier"
                          title="Edit supplier"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteSupplier && (
                        <button
                          type="button"
                          onClick={() => void handleRemoveSupplier(sup.id)}
                          className="p-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/10"
                          aria-label="Delete supplier"
                          title="Delete supplier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="apple-surface rounded-[24px] overflow-hidden">
            <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
              <h3 className="font-display text-base font-bold">Supplier Credit Balances</h3>
              <span className="font-mono tabular-nums font-bold text-sm text-red-600 dark:text-red-400">
                Unpaid Total: {totalSupplierOwed.toLocaleString()} {cur}
              </span>
            </div>
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
              {supplierInvoices.map((inv) => {
                const balance = Math.max(0, inv.totalAmount - inv.paidAmount);
                return (
                  <div key={inv.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold">
                        {inv.supplierName} · <span className="font-mono text-xs">{inv.invoiceNumber}</span>
                      </p>
                      <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] break-words">{inv.itemsSummary}</p>
                      <p className="text-[11px] font-mono text-[#5B6470] dark:text-[#98A2AE] mt-0.5">
                        Due: {formatClinicDate(inv.dueDate, calendarMode, language)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <div className="sm:text-right font-mono tabular-nums text-xs">
                        <p className="font-bold text-sm">
                          {balance.toLocaleString()} {cur} remaining
                        </p>
                        <p className="text-[#5B6470] dark:text-[#98A2AE]">
                          Paid {inv.paidAmount.toLocaleString()} / {inv.totalAmount.toLocaleString()} {cur}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {onUpdateSupplierInvoice && (
                          <button
                            type="button"
                            onClick={() => startEditInvoice(inv)}
                            className="p-2.5 min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl apple-inset text-[#5B6470] dark:text-[#98A2AE]"
                            aria-label="Edit invoice"
                            title="Edit invoice"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteSupplierInvoice && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playTap();
                              void onDeleteSupplierInvoice(inv.id);
                            }}
                            className="p-2.5 min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/10"
                            aria-label="Delete invoice"
                            title="Delete invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {balance > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPayingInvoice(inv);
                              setPayAmount(String(balance));
                            }}
                            className="inline-flex items-center justify-center gap-1 px-4 py-2.5 min-h-[42px] rounded-xl bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-xs font-semibold shrink-0"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            Pay
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D6E52] dark:text-[#22C58B] shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                            Settled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {supplierInvoices.length === 0 && (
                <p className="py-10 text-center text-xs text-[#5B6470] dark:text-[#98A2AE]">
                  No supplier credit invoices recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Tamper-Proof Audit Log */}
      {subTab === 'audit' && (
        <div className="apple-surface rounded-[24px] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold">Tamper-Proof Cryptographic Audit Log</h3>
              <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
                Every price change, restock, sale, expense, and shift close is SHA-256 hash-chained.
              </p>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                auditChainValid
                  ? 'bg-[#0D6E52]/12 dark:bg-[#22C58B]/15 text-[#0D6E52] dark:text-[#22C58B]'
                  : 'bg-red-500/15 text-red-600 dark:text-red-400'
              }`}
            >
              {auditChainValid ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {auditChainValid ? 'SHA-256 Chain Verified' : 'Integrity Warning'}
            </div>
          </div>
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
            {auditLog.slice(0, 80).map((entry) => (
              <div key={entry.id} className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs">
                <div className="space-y-0.5 min-w-0">
                  <p className="font-semibold break-words">
                    #{entry.seq} · {entry.action} · {entry.targetName}
                  </p>
                  <p className="text-[#5B6470] dark:text-[#98A2AE] break-words">
                    {entry.actorName} ({entry.actorRole})
                    {entry.beforeSummary ? ` · Before: ${entry.beforeSummary}` : ''}
                    {entry.afterSummary ? ` · After: ${entry.afterSummary}` : ''}
                  </p>
                </div>
                <div className="sm:text-right font-mono text-[11px] text-[#5B6470] dark:text-[#98A2AE] shrink-0">
                  <p>{formatClinicDate(entry.timestamp, calendarMode, language, true)}</p>
                  <p>{entry.entryHash.slice(0, 14)}…</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supplier Invoice Payment Modal */}
      {payingInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto yoya-scroll-contain"
          onClick={() => setPayingInvoice(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            className="w-full max-w-md apple-surface yoya-modal-panel outline-none rounded-[26px] shadow-2xl overflow-hidden max-h-[88vh] overflow-y-auto yoya-scroll-contain"
          >
            <div className="apple-glass flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
              <h3 className="font-display text-base font-bold">Pay Supplier Invoice</h3>
              <button type="button" onClick={() => setPayingInvoice(null)} className="p-2 rounded-full apple-inset">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmInvoicePay} className="p-6 space-y-4">
              <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
                {payingInvoice.supplierName} · {payingInvoice.invoiceNumber}
              </p>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-sm font-mono tabular-nums font-bold"
              />
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PayrollMethod)}
                className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-xs"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="telebirr">Telebirr</option>
                <option value="cbe_birr">CBE Birr</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
              </select>
              <input
                type="text"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="Transaction / Receipt reference"
                className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-xs"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPayingInvoice(null)} className="px-4 py-2 rounded-xl apple-inset text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-xs font-semibold">
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
