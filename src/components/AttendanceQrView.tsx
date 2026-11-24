import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  LogIn,
  LogOut,
  Printer,
  QrCode,
  ShoppingBag,
  UserCheck,
} from 'lucide-react';
import { downloadCanvasPng } from '../lib/api.ts';
import { formatClinicDate, getEffectiveNow } from '../lib/ethiopianCalendar.ts';
import { getTranslator } from '../lib/i18n.ts';
import { soundEngine } from '../lib/soundEngine.ts';
import { YoyaPharmacyEmblem, YoyaWordmark } from './MedicineIcon.tsx';
import { MagneticButton, UiSticker } from './MotionPrimitives.tsx';
import { QrScannerModal } from './QrScannerModal.tsx';
import type {
  AttendanceQrConfig,
  AttendanceRecord,
  AttendanceSummary,
  AuthUser,
  ClinicSettings,
  Language,
  PayrollPayment,
  PayrollStatusEntry,
  Transaction,
} from '../types/pharmacy.ts';

interface AttendanceQrViewProps {
  qrConfig: AttendanceQrConfig | null;
  attendance: AttendanceRecord[];
  settings: ClinicSettings;
  language: Language;
  exportsLocked?: boolean;
  onSimulatePunch: (type: 'clock_in' | 'clock_out', qrToken: string) => Promise<void>;
}

export function AttendanceQrView({
  qrConfig,
  attendance,
  settings,
  language,
  exportsLocked = false,
  onSimulatePunch,
}: AttendanceQrViewProps) {
  const t = getTranslator(language);
  const [clockInDataUrl, setClockInDataUrl] = useState<string>('');
  const [clockOutDataUrl, setClockOutDataUrl] = useState<string>('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const clockInUrl = qrConfig ? `${origin}/?attendance=clock_in&qr=${qrConfig.clockInToken}` : '';
  const clockOutUrl = qrConfig ? `${origin}/?attendance=clock_out&qr=${qrConfig.clockOutToken}` : '';

  useEffect(() => {
    if (!qrConfig) return;
    void QRCode.toDataURL(clockInUrl, {
      width: 320,
      margin: 2,
      color: { dark: '#0D6E52', light: '#FFFFFF' },
    }).then(setClockInDataUrl);

    void QRCode.toDataURL(clockOutUrl, {
      width: 320,
      margin: 2,
      color: { dark: '#B97716', light: '#FFFFFF' },
    }).then(setClockOutDataUrl);
  }, [qrConfig, clockInUrl, clockOutUrl]);

  function downloadQrPoster(type: 'clock_in' | 'clock_out', qrDataUrl: string) {
    if (!qrDataUrl) return;
    soundEngine.playTap();
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 780;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = type === 'clock_in' ? '#0D6E52' : '#B97716';
      ctx.fillRect(0, 0, canvas.width, 18);

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'center';
      const titleText = (settings.clinicName || 'YOYA Pharmacy').slice(0, 32);
      ctx.fillText(titleText, canvas.width / 2, 86, canvas.width - 64);

      ctx.fillStyle = type === 'clock_in' ? '#0D6E52' : '#B97716';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(type === 'clock_in' ? t('clockInQr') : t('clockOutQr'), canvas.width / 2, 134, canvas.width - 64);

      ctx.drawImage(img, 100, 175, 440, 440);

      ctx.fillStyle = '#475569';
      ctx.font = '600 20px sans-serif';
      ctx.fillText(
        type === 'clock_in' ? 'Scan on arrival at the pharmacy' : 'Scan before leaving your shift',
        canvas.width / 2,
        668
      );
      ctx.fillStyle = '#94A3B8';
      ctx.font = '15px monospace';
      ctx.fillText('Official YOYA Attendance Terminal', canvas.width / 2, 718);

      downloadCanvasPng(canvas, type === 'clock_in' ? 'yoya-clock-in-qr.png' : 'yoya-clock-out-qr.png');
    };
    img.src = qrDataUrl;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <UiSticker kind="attendance" className="w-11 h-11 rounded-2xl hidden sm:flex" />
          <div className="min-w-0">
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">{t('attendanceQr')}</h2>
            <p className="text-xs sm:text-sm text-[#526077] dark:text-[#93A8C8]">
              Print and place these two QR codes inside the pharmacy. Workers scan to record exact clock-in/clock-out times and automatic lateness tracking.
            </p>
          </div>
        </div>

        <MagneticButton
          type="button"
          disabled={exportsLocked}
          onClick={() => {
            if (exportsLocked) return;
            soundEngine.playTap();
            window.print();
          }}
          className="no-print inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-2xl text-xs font-semibold disabled:opacity-45"
        >
          <Printer className="w-4 h-4" />
          Print Both QR Posters
        </MagneticButton>
      </div>

      {/* Dual Printable QR Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="apple-surface rounded-[26px] p-6 flex flex-col items-center text-center space-y-4">
          <div className="flex flex-col items-center gap-1">
            <YoyaPharmacyEmblem className="w-9 h-9" />
            <YoyaWordmark size="xs" customName={settings.clinicName} />
          </div>
          <div className="inline-flex items-center gap-2 text-sm font-bold text-[#0D6E52] dark:text-[#22C58B]">
            <LogIn className="w-4 h-4" />
            {t('clockInQr')}
          </div>
          {clockInDataUrl ? (
            <div className="p-3.5 sm:p-4 rounded-3xl bg-white shadow-sm border border-black/[0.06]">
              <img src={clockInDataUrl} alt="Clock-In QR Code" className="w-44 h-44 sm:w-52 sm:h-52" />
            </div>
          ) : (
            <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-3xl apple-inset flex items-center justify-center">
              <QrCode className="w-10 h-10 text-[#5B6470]" />
            </div>
          )}
          <div className="space-y-1 max-w-full">
            <p className="text-xs font-semibold">Scan on arrival at the pharmacy</p>
            <p className="text-[11px] font-mono text-[#5B6470] dark:text-[#98A2AE] break-all max-w-xs">
              {clockInUrl}
            </p>
          </div>
          {qrConfig && (
            <div className="no-print flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={!clockInDataUrl || exportsLocked}
                onClick={() => downloadQrPoster('clock_in', clockInDataUrl)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-2xl bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-xs font-semibold disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                {t('downloadQr')}
              </button>
              <button
                type="button"
                onClick={() => void onSimulatePunch('clock_in', qrConfig.clockInToken)}
                className="px-4 py-2.5 min-h-[44px] rounded-2xl apple-inset text-xs font-semibold hover:opacity-80"
              >
                Test Clock-In
              </button>
            </div>
          )}
        </div>

        <div className="apple-surface rounded-[26px] p-5 sm:p-6 flex flex-col items-center text-center space-y-4">
          <div className="flex flex-col items-center gap-1">
            <YoyaPharmacyEmblem className="w-9 h-9" />
            <YoyaWordmark size="xs" customName={settings.clinicName} />
          </div>
          <div className="inline-flex items-center gap-2 text-sm font-bold text-[#B97716] dark:text-[#E5A93C]">
            <LogOut className="w-4 h-4" />
            {t('clockOutQr')}
          </div>
          {clockOutDataUrl ? (
            <div className="p-3.5 sm:p-4 rounded-3xl bg-white shadow-sm border border-black/[0.06]">
              <img src={clockOutDataUrl} alt="Clock-Out QR Code" className="w-44 h-44 sm:w-52 sm:h-52" />
            </div>
          ) : (
            <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-3xl apple-inset flex items-center justify-center">
              <QrCode className="w-10 h-10 text-[#5B6470]" />
            </div>
          )}
          <div className="space-y-1 max-w-full">
            <p className="text-xs font-semibold">Scan before leaving shift</p>
            <p className="text-[11px] font-mono text-[#5B6470] dark:text-[#98A2AE] break-all max-w-xs">
              {clockOutUrl}
            </p>
          </div>
          {qrConfig && (
            <div className="no-print flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={!clockOutDataUrl || exportsLocked}
                onClick={() => downloadQrPoster('clock_out', clockOutDataUrl)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-2xl bg-[#B97716] dark:bg-[#E5A93C] text-white dark:text-[#111827] text-xs font-semibold disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                {t('downloadQr')}
              </button>
              <button
                type="button"
                onClick={() => void onSimulatePunch('clock_out', qrConfig.clockOutToken)}
                className="px-4 py-2.5 min-h-[44px] rounded-2xl apple-inset text-xs font-semibold hover:opacity-80"
              >
                Test Clock-Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Live Attendance Log for Owner */}
      <div className="no-print apple-surface rounded-[24px] overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold">Worker Clock-In & Clock-Out Log</h3>
            <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
              Live timestamp and punctuality record for every employee.
            </p>
          </div>
          <span className="font-mono text-xs text-[#5B6470] dark:text-[#98A2AE]">
            {attendance.length} records
          </span>
        </div>

        <div className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
          {attendance.slice(0, 60).map((rec) => (
            <div key={rec.id} className="px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    rec.type === 'clock_in'
                      ? 'bg-[#0D6E52]/12 dark:bg-[#22C58B]/15 text-[#0D6E52] dark:text-[#22C58B]'
                      : 'bg-amber-500/15 text-[#B97716] dark:text-[#E5A93C]'
                  }`}
                >
                  {rec.type === 'clock_in' ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {rec.workerName} ·{' '}
                    <span className="text-xs font-normal text-[#5B6470] dark:text-[#98A2AE] capitalize">
                      {rec.workerRole}
                    </span>
                  </p>
                  <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE] font-mono break-words">
                    {rec.type === 'clock_in' ? t('clockIn') : t('clockOut')}
                    {rec.scheduledTime ? ` · Scheduled ${rec.scheduledTime}` : ''}
                    {rec.source === 'qr_scan' ? ' · QR Scan' : ' · Portal'}
                  </p>
                </div>
              </div>

              <div className="sm:text-right font-mono tabular-nums pl-11 sm:pl-0">
                <p className="font-semibold">
                  {formatClinicDate(rec.timestamp, settings.calendarMode, language, true)}
                </p>
                {rec.attendanceStatus === 'late' && (
                  <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                    {t('late')} (+{rec.lateMinutes ?? 0} min)
                  </p>
                )}
                {rec.attendanceStatus === 'on_time' && (
                  <p className="text-[11px] font-semibold text-[#0D6E52] dark:text-[#22C58B]">
                    {t('onTime')}
                  </p>
                )}
                {rec.attendanceStatus === 'early_leave' && (
                  <p className="text-[11px] font-semibold text-[#B97716] dark:text-[#E5A93C]">
                    Early Leave (-{rec.lateMinutes ?? 0} min)
                  </p>
                )}
              </div>
            </div>
          ))}
          {attendance.length === 0 && (
            <p className="py-10 text-center text-sm text-[#5B6470] dark:text-[#98A2AE]">
              No clock-in or clock-out records yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function WorkerSalaryAndAttendanceView({
  user,
  transactions,
  attendance,
  attendanceSummary,
  scheduledClockIn,
  scheduledClockOut,
  myPayroll,
  myPayments,
  settings,
  language,
  onPunch,
  onPunchQr,
}: {
  user: AuthUser;
  transactions: Transaction[];
  attendance: AttendanceRecord[];
  attendanceSummary: AttendanceSummary;
  scheduledClockIn: string;
  scheduledClockOut: string;
  myPayroll: PayrollStatusEntry | null;
  myPayments: PayrollPayment[];
  settings: ClinicSettings;
  language: Language;
  onPunch: (type: 'clock_in' | 'clock_out') => Promise<void>;
  onPunchQr: (type: 'clock_in' | 'clock_out', qrToken: string) => Promise<void>;
}) {
  const t = getTranslator(language);
  const cur = settings.currencySymbol;
  const [scannerOpen, setScannerOpen] = useState(false);

  const salesMetrics = useMemo(() => {
    const todayPrefix = getEffectiveNow(settings.dateOffsetDays).toISOString().slice(0, 10);
    let totalSold = 0;
    let todaySold = 0;
    let unitsSold = 0;
    for (const txn of transactions) {
      totalSold += txn.totalAmount;
      if (txn.createdAt.slice(0, 10) === todayPrefix) {
        todaySold += txn.totalAmount;
      }
      for (const item of txn.items) {
        unitsSold += item.baseUnitsDeducted ?? item.quantity;
      }
    }
    return {
      totalSold,
      todaySold,
      unitsSold,
      orderCount: transactions.length,
    };
  }, [transactions, settings.dateOffsetDays]);

  return (
    <div className="space-y-6">
      {/* Worker Personal Identity & Schedule Header */}
      <div className="apple-surface rounded-[26px] p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          {user.photoImage ? (
            <img
              src={user.photoImage}
              alt={user.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-black/[0.06] dark:border-white/[0.08] shrink-0"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl apple-inset flex items-center justify-center font-display font-bold text-lg sm:text-xl shrink-0">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-lg sm:text-xl font-bold truncate">{user.name}</h2>
            <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] truncate">
              @{user.username} · {user.jobTitle || user.role} · {user.shift || 'Full-Time'}
            </p>
            <p className="text-xs font-mono text-[#0D6E52] dark:text-[#22C58B] mt-1">
              Shift Schedule: {scheduledClockIn} – {scheduledClockOut}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              setScannerOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-2xl yoya-btn-primary text-white text-xs font-semibold"
          >
            <QrCode className="w-4 h-4" />
            {t('scanQrCode')}
          </button>
          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playAddToCart();
                void onPunch('clock_in');
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-2xl bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-xs font-semibold"
            >
              <LogIn className="w-4 h-4" />
              {t('clockIn')}
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                void onPunch('clock_out');
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-2xl apple-inset text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" />
              {t('clockOut')}
            </button>
          </div>
        </div>
      </div>

      {/* Personal Sales + Lateness KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="apple-surface rounded-[22px] p-4 sm:p-5 space-y-1 min-w-0">
          <div className="flex items-center justify-between text-xs text-[#5B6470] dark:text-[#98A2AE]">
            <span className="truncate">Today Sold</span>
            <ShoppingBag className="w-4 h-4 text-[#0D6E52] dark:text-[#22C58B] shrink-0" />
          </div>
          <p className="font-display text-lg sm:text-2xl font-bold font-mono tabular-nums truncate">
            {salesMetrics.todaySold.toLocaleString()} {cur}
          </p>
          <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE] font-mono truncate">
            Total: {salesMetrics.totalSold.toLocaleString()} {cur} ({salesMetrics.orderCount})
          </p>
        </div>

        <div className="apple-surface rounded-[22px] p-4 sm:p-5 space-y-1 min-w-0">
          <div className="flex items-center justify-between text-xs text-[#5B6470] dark:text-[#98A2AE]">
            <span className="truncate">{t('lateDays')}</span>
            <AlertTriangle
              className={`w-4 h-4 shrink-0 ${
                attendanceSummary.lateDaysCount > 0
                  ? 'text-red-500'
                  : 'text-[#0D6E52] dark:text-[#22C58B]'
              }`}
            />
          </div>
          <p
            className={`font-display text-lg sm:text-2xl font-bold font-mono tabular-nums ${
              attendanceSummary.lateDaysCount > 0 ? 'text-red-600 dark:text-red-400' : ''
            }`}
          >
            {attendanceSummary.lateDaysCount}
          </p>
          <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE] font-mono truncate">
            {attendanceSummary.totalLateMinutes} min late
          </p>
        </div>

        <div className="apple-surface rounded-[22px] p-4 sm:p-5 space-y-1 min-w-0">
          <div className="flex items-center justify-between text-xs text-[#5B6470] dark:text-[#98A2AE]">
            <span className="truncate">On-Time</span>
            <UserCheck className="w-4 h-4 text-[#0D6E52] dark:text-[#22C58B] shrink-0" />
          </div>
          <p className="font-display text-lg sm:text-2xl font-bold font-mono tabular-nums">
            {attendanceSummary.onTimeDaysCount}
          </p>
          <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE] font-mono truncate">
            {attendanceSummary.totalDaysWorked} day(s) attended
          </p>
        </div>

        <div className="apple-surface rounded-[22px] p-4 sm:p-5 space-y-1 min-w-0">
          <div className="flex items-center justify-between text-xs text-[#5B6470] dark:text-[#98A2AE]">
            <span className="truncate">{t('monthlySalary')}</span>
            <Banknote className="w-4 h-4 text-[#B97716] dark:text-[#E5A93C] shrink-0" />
          </div>
          <p className="font-display text-lg sm:text-2xl font-bold font-mono tabular-nums truncate">
            {myPayroll ? `${myPayroll.profile.monthlySalary.toLocaleString()} ${cur}` : '—'}
          </p>
          <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE] truncate">
            {myPayroll ? (myPayroll.paymentForMonth ? t('paid') : t('upcoming')) : 'Not set yet'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Salary Card */}
        <div className="lg:col-span-6 apple-surface rounded-[24px] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-[#0D6E52] dark:text-[#22C58B]" />
              <h3 className="font-display text-base font-bold">{t('monthlySalary')}</h3>
            </div>
            {myPayroll && (
              <span
                className={`text-xs font-semibold ${
                  myPayroll.status === 'paid'
                    ? 'text-[#0D6E52] dark:text-[#22C58B]'
                    : myPayroll.status === 'overdue'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-[#B97716] dark:text-[#E5A93C]'
                }`}
              >
                {myPayroll.status === 'paid'
                  ? t('paid')
                  : myPayroll.status === 'overdue'
                    ? t('overdue')
                    : myPayroll.status === 'due_soon'
                      ? t('dueSoon')
                      : t('upcoming')}
              </span>
            )}
          </div>

          {myPayroll ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl apple-inset flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">{myPayroll.profile.workDescription}</p>
                  <p className="font-display text-2xl font-bold font-mono tabular-nums mt-1">
                    {myPayroll.profile.monthlySalary.toLocaleString()} {cur}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">Month {myPayroll.monthKey}</p>
                  <p className="text-xs font-mono tabular-nums mt-0.5">
                    Payday: {formatClinicDate(myPayroll.dueDate, settings.calendarMode, language)}
                  </p>
                </div>
              </div>

              {myPayroll.paymentForMonth ? (
                <div className="p-4 rounded-2xl border border-[#0D6E52]/30 dark:border-[#22C58B]/30 bg-[#0D6E52]/10 dark:bg-[#22C58B]/10 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#0D6E52] dark:text-[#22C58B] shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-[#0D6E52] dark:text-[#22C58B]">
                      {myPayroll.monthKey} Salary Confirmed Paid
                    </p>
                    <p className="text-[#5B6470] dark:text-[#98A2AE] font-mono tabular-nums">
                      {myPayroll.paymentForMonth.amount.toLocaleString()} {cur} ·{' '}
                      {myPayroll.paymentForMonth.paymentMethod.replace('_', ' ').toUpperCase()} ·{' '}
                      {formatClinicDate(myPayroll.paymentForMonth.paidAt, settings.calendarMode, language)}
                    </p>
                    {myPayroll.paymentForMonth.reference && (
                      <p className="text-[#5B6470] dark:text-[#98A2AE]">
                        Ref: {myPayroll.paymentForMonth.reference}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl apple-inset text-xs text-[#5B6470] dark:text-[#98A2AE] flex items-center gap-2.5">
                  <CalendarClock className="w-4 h-4 text-[#B97716] dark:text-[#E5A93C]" />
                  <span>
                    Scheduled for {formatClinicDate(myPayroll.dueDate, settings.calendarMode, language)}. Owner confirmation will appear here once paid.
                  </span>
                </div>
              )}

              {myPayments.length > 0 && (
                <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08] space-y-2">
                  <p className="text-xs font-semibold text-[#5B6470] dark:text-[#98A2AE]">Recent Salary Receipts</p>
                  {myPayments.slice(0, 5).map((pay) => (
                    <div key={pay.id} className="flex justify-between text-xs font-mono tabular-nums">
                      <span>
                        {pay.monthKey} · {pay.paymentMethod.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="font-semibold">
                        {pay.amount.toLocaleString()} {cur}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#5B6470] dark:text-[#98A2AE] py-6">
              Your monthly salary schedule has not been configured by the owner yet.
            </p>
          )}
        </div>

        {/* Worker Clock-In & Lateness History */}
        <div className="lg:col-span-6 apple-surface rounded-[24px] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#0D6E52] dark:text-[#22C58B]" />
            <h3 className="font-display text-base font-bold">My Clock-In & Lateness Record</h3>
          </div>

          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
            {attendance.slice(0, 15).map((rec) => (
              <div key={rec.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 text-xs">
                <div>
                  <span
                    className={`font-semibold ${
                      rec.type === 'clock_in'
                        ? 'text-[#0D6E52] dark:text-[#22C58B]'
                        : 'text-[#B97716] dark:text-[#E5A93C]'
                    }`}
                  >
                    {rec.type === 'clock_in' ? t('clockIn') : t('clockOut')}
                  </span>
                  {rec.attendanceStatus === 'late' && (
                    <span className="ml-2 text-red-600 dark:text-red-400 font-semibold">
                      · {t('late')} (+{rec.lateMinutes ?? 0}m)
                    </span>
                  )}
                  {rec.attendanceStatus === 'on_time' && (
                    <span className="ml-2 text-[#0D6E52] dark:text-[#22C58B]">· {t('onTime')}</span>
                  )}
                </div>
                <span className="font-mono tabular-nums text-[11px] sm:text-xs text-[#5B6470] dark:text-[#98A2AE]">
                  {formatClinicDate(rec.timestamp, settings.calendarMode, language, true)} ·{' '}
                  {rec.source === 'qr_scan' ? 'QR' : 'Portal'}
                </span>
              </div>
            ))}
            {attendance.length === 0 && (
              <p className="py-8 text-center text-xs text-[#5B6470] dark:text-[#98A2AE]">
                Scan the pharmacy Clock-In QR code or tap Clock In above when starting your shift.
              </p>
            )}
          </div>
        </div>
      </div>

      <QrScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onValidQr={onPunchQr}
      />
    </div>
  );
}
