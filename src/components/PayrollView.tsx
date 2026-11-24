import React, { useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, Edit3, Plus, Trash2, X } from 'lucide-react';
import { formatClinicDate } from '../lib/ethiopianCalendar.ts';
import { getTranslator } from '../lib/i18n.ts';
import { soundEngine } from '../lib/soundEngine.ts';
import type {
  CalendarMode,
  Language,
  PayrollMethod,
  PayrollPayment,
  PayrollStatusEntry,
  StaffUser,
} from '../types/pharmacy.ts';
import { UiSticker } from './MotionPrimitives.tsx';

interface PayrollViewProps {
  staff: StaffUser[];
  entries: PayrollStatusEntry[];
  payments: PayrollPayment[];
  currencySymbol: string;
  calendarMode: CalendarMode;
  language: Language;
  onSaveProfile: (payload: {
    workerId: string;
    workDescription: string;
    monthlySalary: number;
    paydayDay: number;
  }) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  onConfirmPayment: (
    profileId: string,
    payload: { paymentMethod: PayrollMethod; amount?: number; reference?: string }
  ) => Promise<void>;
  onUpdatePayment?: (
    paymentId: string,
    payload: { paymentMethod?: PayrollMethod; amount?: number; reference?: string }
  ) => Promise<void>;
  onDeletePayment?: (paymentId: string) => Promise<void>;
}

const PAYROLL_METHODS: { id: PayrollMethod; label: string }[] = [
  { id: 'telebirr', label: 'Telebirr' },
  { id: 'cbe_birr', label: 'CBE Birr' },
  { id: 'cash', label: 'Cash' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'check', label: 'Check' },
];

export function PayrollView({
  staff,
  entries,
  payments,
  currencySymbol,
  calendarMode,
  language,
  onSaveProfile,
  onDeleteProfile,
  onConfirmPayment,
  onUpdatePayment,
  onDeletePayment,
}: PayrollViewProps) {
  const t = getTranslator(language);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [workerId, setWorkerId] = useState(staff[0]?.id || '');
  const [workDescription, setWorkDescription] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [paydayDay, setPaydayDay] = useState('28');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [payingEntry, setPayingEntry] = useState<PayrollStatusEntry | null>(null);
  const [payMethod, setPayMethod] = useState<PayrollMethod>('telebirr');
  const [payReference, setPayReference] = useState('');
  const [paying, setPaying] = useState(false);

  const [editingPayment, setEditingPayment] = useState<PayrollPayment | null>(null);
  const [editPayAmount, setEditPayAmount] = useState('');
  const [editPayMethod, setEditPayMethod] = useState<PayrollMethod>('telebirr');
  const [editPayRef, setEditPayRef] = useState('');
  const [savingPaymentEdit, setSavingPaymentEdit] = useState(false);

  const dueAlerts = entries.filter((e) => e.status === 'due_soon' || e.status === 'overdue');

  function resetScheduleForm() {
    setEditingProfileId(null);
    setWorkerId(staff[0]?.id || '');
    setWorkDescription('');
    setMonthlySalary('');
    setPaydayDay('28');
    setError(null);
  }

  function startEditProfile(entry: PayrollStatusEntry) {
    soundEngine.playTap();
    setEditingProfileId(entry.profile.id);
    setWorkerId(entry.profile.workerId);
    setWorkDescription(entry.profile.workDescription);
    setMonthlySalary(String(entry.profile.monthlySalary));
    setPaydayDay(String(entry.profile.paydayDay));
    setError(null);
  }

  async function handleAddSchedule(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const selectedWorker = staff.find((s) => s.id === workerId);
      await onSaveProfile({
        workerId,
        workDescription: workDescription.trim() || selectedWorker?.jobTitle || 'Pharmacy Staff',
        monthlySalary: Number(monthlySalary),
        paydayDay: Number(paydayDay),
      });
      soundEngine.playAddToCart();
      resetScheduleForm();
    } catch (err) {
      soundEngine.playWarning();
      setError(err instanceof Error ? err.message : 'Failed to save salary schedule.');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmPay(e: React.FormEvent) {
    e.preventDefault();
    if (!payingEntry) return;
    setPaying(true);
    try {
      await onConfirmPayment(payingEntry.profile.id, {
        paymentMethod: payMethod,
        amount: payingEntry.profile.monthlySalary,
        reference: payReference || undefined,
      });
      soundEngine.playSaleComplete();
      setPayingEntry(null);
      setPayReference('');
    } finally {
      setPaying(false);
    }
  }

  function startEditPayment(pay: PayrollPayment) {
    soundEngine.playTap();
    setEditingPayment(pay);
    setEditPayAmount(String(pay.amount));
    setEditPayMethod(pay.paymentMethod);
    setEditPayRef(pay.reference || '');
  }

  async function handleSavePaymentEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPayment || !onUpdatePayment) return;
    setSavingPaymentEdit(true);
    try {
      await onUpdatePayment(editingPayment.id, {
        amount: Number(editPayAmount),
        paymentMethod: editPayMethod,
        reference: editPayRef.trim(),
      });
      soundEngine.playSaleComplete();
      setEditingPayment(null);
    } finally {
      setSavingPaymentEdit(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 min-w-0">
        <UiSticker kind="payroll" className="w-11 h-11 rounded-2xl hidden sm:flex" />
        <div className="min-w-0">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">{t('payroll')}</h2>
          <p className="text-xs sm:text-sm text-[#526077] dark:text-[#93A8C8]">
            Assign each worker’s duties, monthly salary in {currencySymbol}, and payday. Receive alerts as paydays approach or pass, and confirm monthly payouts directly to each worker’s portal.
          </p>
        </div>
      </div>

      {dueAlerts.length > 0 && (
        <div className="space-y-2.5">
          {dueAlerts.map((item) => (
            <div
              key={item.profile.id}
              className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-[22px] border ${
                item.status === 'overdue'
                  ? 'border-red-300 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30'
                  : 'border-amber-300 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/25'
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle
                  className={`w-5 h-5 ${
                    item.status === 'overdue'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-[#B97716] dark:text-[#E5A93C]'
                  }`}
                />
                <div>
                  <p className="text-sm font-bold">
                    {item.profile.workerName} ·{' '}
                    {item.status === 'overdue'
                      ? `${t('overdue')} (${Math.abs(item.daysUntilDue)}d past ${formatClinicDate(item.dueDate, calendarMode, language)})`
                      : item.daysUntilDue === 0
                        ? 'Payday is Today!'
                        : `${t('dueSoon')} (in ${item.daysUntilDue}d · ${formatClinicDate(item.dueDate, calendarMode, language)})`}
                  </p>
                  <p className="text-xs font-mono tabular-nums text-[#5B6470] dark:text-[#98A2AE]">
                    {item.profile.workDescription} · {item.profile.monthlySalary.toLocaleString()} {currencySymbol}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  setPayingEntry(item);
                }}
                className="px-4 py-2 rounded-2xl bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-xs font-semibold shadow-sm"
              >
                {t('confirmPaid')}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Add/Update Worker Salary Schedule */}
        <form
          onSubmit={handleAddSchedule}
          className="lg:col-span-4 p-6 apple-surface rounded-[26px] space-y-4 h-fit"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-base font-bold">
              {editingProfileId ? 'Edit Salary Schedule' : 'Assign Worker Salary & Payday'}
            </h3>
            {editingProfileId && (
              <button
                type="button"
                onClick={resetScheduleForm}
                className="text-xs font-semibold text-[#5B6470] dark:text-[#98A2AE] hover:underline"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
              Select Staff / Worker *
            </label>
            <select
              required
              value={workerId}
              onChange={(e) => {
                setWorkerId(e.target.value);
                const found = staff.find((s) => s.id === e.target.value);
                if (found && !workDescription) {
                  setWorkDescription(found.jobTitle);
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl apple-inset text-sm outline-none"
            >
              <option value="">-- Choose Worker --</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
              {t('workRole')} *
            </label>
            <input
              type="text"
              required
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="e.g. Counter Seller & Stock Clerk"
              className="w-full px-3.5 py-2.5 rounded-2xl apple-inset text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                {t('monthlySalary')} ({currencySymbol}) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                placeholder="12000"
                className="w-full px-3 py-2.5 min-h-[44px] rounded-2xl apple-inset text-sm font-mono tabular-nums outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                {t('paydayDay')} *
              </label>
              <input
                type="number"
                required
                min="1"
                max="31"
                value={paydayDay}
                onChange={(e) => setPaydayDay(e.target.value)}
                className="w-full px-3 py-2.5 min-h-[44px] rounded-2xl apple-inset text-sm font-mono tabular-nums outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || staff.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-[#0D6E52] hover:bg-[#09553F] dark:bg-[#22C58B] dark:hover:bg-[#19A874] text-white dark:text-[#081310] text-sm font-semibold shadow-sm disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {saving ? '...' : 'Save Salary Schedule'}
          </button>
          {staff.length === 0 && (
            <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
              Add workers in Staff & Users first before assigning salaries.
            </p>
          )}
        </form>

        {/* Payroll Roster & History */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 apple-surface rounded-[26px]">
            <h3 className="font-display text-base font-bold mb-4">Current Month Salary Roster</h3>
            {entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#5B6470] dark:text-[#98A2AE]">
                No worker salary schedules created yet.
              </p>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div
                    key={entry.profile.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-2xl apple-inset"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{entry.profile.workerName}</p>
                      <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] break-words">
                        {entry.profile.workDescription} · Due {formatClinicDate(entry.dueDate, calendarMode, language)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <div className="sm:text-right">
                        <p className="font-mono tabular-nums font-bold text-sm">
                          {entry.profile.monthlySalary.toLocaleString()} {currencySymbol}
                        </p>
                        <p
                          className={`text-[11px] font-semibold ${
                            entry.status === 'paid'
                              ? 'text-[#0D6E52] dark:text-[#22C58B]'
                              : entry.status === 'overdue'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-[#B97716] dark:text-[#E5A93C]'
                          }`}
                        >
                          {entry.status === 'paid'
                            ? `${t('paid')} · ${entry.paymentForMonth?.paymentMethod.replace('_', ' ').toUpperCase()}`
                            : entry.status === 'overdue'
                              ? t('overdue')
                              : entry.status === 'due_soon'
                                ? t('dueSoon')
                                : t('upcoming')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {entry.status === 'paid' ? (
                          <CheckCircle2 className="w-5 h-5 text-[#0D6E52] dark:text-[#22C58B]" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playTap();
                              setPayingEntry(entry);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-2xl bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-xs font-semibold shadow-sm"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            {t('confirmPaid')}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => startEditProfile(entry)}
                          className="p-2.5 min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl apple-inset text-[#5B6470] dark:text-[#98A2AE] hover:opacity-80"
                          aria-label="Edit salary schedule"
                          title="Edit salary schedule"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => void onDeleteProfile(entry.profile.id)}
                          className="p-2.5 min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/10"
                          aria-label="Delete payroll profile"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 apple-surface rounded-[26px]">
            <h3 className="font-display text-base font-bold mb-4">Confirmed Salary Payments History</h3>

            {/* Mobile Payments Cards */}
            <div className="md:hidden space-y-2.5">
              {payments.map((p) => (
                <div key={p.id} className="p-3.5 rounded-2xl apple-inset space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm truncate">{p.workerName}</span>
                    <span className="font-mono tabular-nums font-bold text-[#0D6E52] dark:text-[#22C58B] shrink-0">
                      {p.amount.toLocaleString()} {currencySymbol}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono text-[#5B6470] dark:text-[#98A2AE]">
                    <span>{p.monthKey} · {p.paymentMethod.replace('_', ' ').toUpperCase()}</span>
                    <span>{formatClinicDate(p.paidAt, calendarMode, language)}</span>
                  </div>
                  {p.reference && (
                    <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE]">Ref: {p.reference}</p>
                  )}
                  {(onUpdatePayment || onDeletePayment) && (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {onUpdatePayment && (
                        <button
                          type="button"
                          onClick={() => startEditPayment(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg apple-inset text-[11px] font-semibold"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                      {onDeletePayment && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playTap();
                            void onDeletePayment(p.id);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 text-[11px] font-semibold"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {payments.length === 0 && (
                <p className="py-8 text-center text-[#5B6470] dark:text-[#98A2AE] text-xs">
                  No confirmed salary payments recorded yet.
                </p>
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-[#5B6470] dark:text-[#98A2AE]">
                    <th className="pb-2.5 font-semibold">Worker</th>
                    <th className="pb-2.5 font-semibold">Month</th>
                    <th className="pb-2.5 font-semibold">Method</th>
                    <th className="pb-2.5 font-semibold">Paid Date</th>
                    <th className="pb-2.5 font-semibold text-right">Amount</th>
                    {(onUpdatePayment || onDeletePayment) && (
                      <th className="pb-2.5 font-semibold text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 font-semibold">{p.workerName}</td>
                      <td className="py-2.5 font-mono tabular-nums">{p.monthKey}</td>
                      <td className="py-2.5 uppercase font-medium">
                        {p.paymentMethod.replace('_', ' ')}
                        {p.reference ? ` (${p.reference})` : ''}
                      </td>
                      <td className="py-2.5 font-mono tabular-nums text-[#5B6470] dark:text-[#98A2AE]">
                        {formatClinicDate(p.paidAt, calendarMode, language)}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums font-bold text-[#0D6E52] dark:text-[#22C58B]">
                        {p.amount.toLocaleString()} {currencySymbol}
                      </td>
                      {(onUpdatePayment || onDeletePayment) && (
                        <td className="py-2.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            {onUpdatePayment && (
                              <button
                                type="button"
                                onClick={() => startEditPayment(p)}
                                className="p-1.5 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
                                aria-label="Edit payment"
                                title="Edit payment"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeletePayment && (
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playTap();
                                  void onDeletePayment(p.id);
                                }}
                                className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                aria-label="Delete payment"
                                title="Delete payment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={onUpdatePayment || onDeletePayment ? 6 : 5} className="py-8 text-center text-[#5B6470] dark:text-[#98A2AE]">
                        No confirmed salary payments recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Salary Payment Modal */}
      {payingEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto yoya-scroll-contain"
          onClick={() => setPayingEntry(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            onSubmit={handleConfirmPay}
            className="w-full max-w-md apple-surface yoya-modal-panel outline-none rounded-[28px] p-6 space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto yoya-scroll-contain"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Confirm Monthly Payment</h3>
              <button
                type="button"
                onClick={() => setPayingEntry(null)}
                className="p-2 rounded-full apple-inset hover:opacity-80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl apple-inset text-xs space-y-1">
              <p className="font-bold text-sm">{payingEntry.profile.workerName}</p>
              <p className="text-[#5B6470] dark:text-[#98A2AE]">
                Month {payingEntry.monthKey} · Amount:{' '}
                <span className="font-mono font-bold text-[#111827] dark:text-[#F5F7FA]">
                  {payingEntry.profile.monthlySalary.toLocaleString()} {currencySymbol}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5B6470] dark:text-[#98A2AE] mb-2">
                Select Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAYROLL_METHODS.map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playTap();
                      setPayMethod(pm.id);
                    }}
                    className={`py-2 px-3 rounded-2xl text-xs font-semibold transition-all ${
                      payMethod === pm.id
                        ? 'bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310]'
                        : 'apple-inset text-[#5B6470] dark:text-[#98A2AE]'
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Transaction Reference / Note (optional)
              </label>
              <input
                type="text"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="e.g. Telebirr Ref #FT26119..."
                className="w-full px-3.5 py-2.5 rounded-2xl apple-inset text-sm outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayingEntry(null)}
                className="px-4 py-2 rounded-2xl apple-inset text-xs font-medium"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={paying}
                className="px-5 py-2 rounded-2xl bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-xs font-semibold shadow-sm"
              >
                {paying ? '...' : t('confirmPaid')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Confirmed Salary Payment Modal */}
      {editingPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto yoya-scroll-contain"
          onClick={() => setEditingPayment(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            onSubmit={handleSavePaymentEdit}
            className="w-full max-w-md apple-surface yoya-modal-panel outline-none rounded-[28px] p-6 space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto yoya-scroll-contain"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Edit Salary Payment</h3>
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="p-2 rounded-full apple-inset hover:opacity-80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
              {editingPayment.workerName} · {editingPayment.monthKey}
            </p>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                Amount ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={editPayAmount}
                onChange={(e) => setEditPayAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl apple-inset text-sm font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                Payment Method
              </label>
              <select
                value={editPayMethod}
                onChange={(e) => setEditPayMethod(e.target.value as PayrollMethod)}
                className="w-full px-3.5 py-2.5 rounded-2xl apple-inset text-xs"
              >
                {PAYROLL_METHODS.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                Reference / Note
              </label>
              <input
                type="text"
                value={editPayRef}
                onChange={(e) => setEditPayRef(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl apple-inset text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="px-4 py-2 rounded-2xl apple-inset text-xs font-medium"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={savingPaymentEdit}
                className="px-5 py-2 rounded-2xl bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-xs font-semibold shadow-sm"
              >
                {savingPaymentEdit ? '...' : 'Update Payment'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
