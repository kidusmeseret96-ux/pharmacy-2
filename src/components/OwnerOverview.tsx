import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileSpreadsheet,
  PackagePlus,
  TrendingUp,
} from 'lucide-react';
import { formatClinicDate, getEffectiveNow } from '../lib/ethiopianCalendar.ts';
import { getTranslator } from '../lib/i18n.ts';
import { soundEngine } from '../lib/soundEngine.ts';
import type {
  CalendarMode,
  Drug,
  DrugKind,
  Language,
  OverviewAnalytics,
  PayrollStatusEntry,
  StockAlert,
} from '../types/pharmacy.ts';
import { MedicineIcon, resolveDrugKind } from './MedicineIcon.tsx';
import {
  AnimatedNumber,
  MagneticButton,
  RevealSection,
  StickerImage,
  TiltGlassCard,
  UiSticker,
  type UiStickerKind,
} from './MotionPrimitives.tsx';

interface OwnerOverviewProps {
  overview: OverviewAnalytics | null;
  ownerName?: string;
  period: 'today' | '7d' | '30d' | 'all';
  onChangePeriod: (p: 'today' | '7d' | '30d' | 'all') => void;
  alerts: StockAlert[];
  payrollAlerts: PayrollStatusEntry[];
  drugs: Drug[];
  drugKinds: DrugKind[];
  currencySymbol: string;
  calendarMode: CalendarMode;
  dateOffsetDays: number;
  language: Language;
  onAcknowledgeAlert: (id: string) => Promise<void>;
  onOpenAddStock: (drugId?: string) => void;
  onOpenRestockSheet?: () => void;
  onNavigateTab: (
    tab:
      | 'overview'
      | 'inventory'
      | 'pos'
      | 'transactions'
      | 'operations'
      | 'attendance'
      | 'staff'
      | 'payroll'
      | 'settings'
  ) => void;
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = ((p0.x + p1.x) / 2).toFixed(1);
    d += ` C ${cx} ${p0.y.toFixed(1)}, ${cx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

export function OwnerOverview({
  overview,
  ownerName,
  period,
  onChangePeriod,
  alerts,
  payrollAlerts,
  drugs,
  drugKinds,
  currencySymbol,
  calendarMode,
  dateOffsetDays,
  language,
  onAcknowledgeAlert,
  onOpenAddStock,
  onOpenRestockSheet,
  onNavigateTab,
}: OwnerOverviewProps) {
  const t = getTranslator(language);
  const cur = currencySymbol;
  const unackedAlerts = alerts.filter((a) => !a.acknowledged);
  const effectiveNow = getEffectiveNow(dateOffsetDays);
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  const soonExpiringDrugs = drugs.filter((d) => {
    const daysLeft = (new Date(d.expiryDate).getTime() - effectiveNow.getTime()) / (1000 * 60 * 60 * 24);
    return daysLeft <= 45;
  });

  const dailySeries = overview?.dailySeries ?? [];
  const maxDailyVal = Math.max(
    10,
    ...dailySeries.map((d) => Math.max(d.revenue, d.profit, 0))
  );
  const maxUnitsSold = Math.max(
    1,
    ...(overview?.topDrugs.map((d) => d.unitsSold) ?? [1])
  );
  const totalBreakdownAmount = Math.max(
    1,
    (overview?.paymentBreakdown ?? []).reduce((acc, pm) => acc + pm.amount, 0)
  );

  const trueNet = overview?.trueNetProfit ?? 0;

  // Compute SVG spline coordinates for 7-day chart
  const chartGeometry = useMemo(() => {
    const W = 560;
    const H = 180;
    const padX = 24;
    const padTop = 18;
    const padBottom = 16;
    const usableW = W - padX * 2;
    const usableH = H - padTop - padBottom;
    const count = Math.max(1, dailySeries.length);

    const revPts = dailySeries.map((d, idx) => {
      const x = count === 1 ? W / 2 : padX + (idx / (count - 1)) * usableW;
      const y = padTop + usableH - (Math.max(0, d.revenue) / maxDailyVal) * usableH;
      return { x, y, day: d };
    });

    const profPts = dailySeries.map((d, idx) => {
      const x = count === 1 ? W / 2 : padX + (idx / (count - 1)) * usableW;
      const y = padTop + usableH - (Math.max(0, d.profit) / maxDailyVal) * usableH;
      return { x, y, day: d };
    });

    const revLine = buildSmoothPath(revPts);
    const profLine = buildSmoothPath(profPts);
    const baselineY = padTop + usableH;
    const revArea =
      revPts.length > 0
        ? `${revLine} L ${revPts[revPts.length - 1].x.toFixed(1)} ${baselineY} L ${revPts[0].x.toFixed(1)} ${baselineY} Z`
        : '';

    return { W, H, baselineY, revPts, profPts, revLine, profLine, revArea };
  }, [dailySeries, maxDailyVal]);

  const activeDayIdx =
    hoveredDayIdx !== null && dailySeries[hoveredDayIdx]
      ? hoveredDayIdx
      : dailySeries.length > 0
        ? dailySeries.length - 1
        : null;
  const activeDay = activeDayIdx !== null ? dailySeries[activeDayIdx] : null;

  const paymentStickers: Record<string, UiStickerKind> = {
    cash: 'cash',
    transfer: 'transfer',
    card: 'card',
  };

  return (
    <div className="space-y-6">
      {/* Header & Period Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <StickerImage
            asset="pharmacyStore"
            alt="YOYA Pharmacy Storefront"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl hidden sm:block"
          />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-[#1464F6] dark:text-[#22D3EE]">
              {t('welcomePrefix')}, {ownerName || 'Pharmacy Owner'}
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
              Financial & Stock Overview
            </h2>
            <p className="text-xs sm:text-sm text-[#526077] dark:text-[#93A8C8]">
              Real-time revenue in {cur}, true net profit after drug cost, operating expenses & salaries.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 sm:flex items-center gap-1 p-1 rounded-2xl apple-inset w-full sm:w-auto">
          {(['today', '7d', '30d', 'all'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onChangePeriod(p);
              }}
              className={`relative px-2 sm:px-3.5 py-2 min-h-[38px] rounded-xl text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap text-center ${
                period === p
                  ? 'apple-surface shadow-sm text-[#1464F6] dark:text-[#22D3EE]'
                  : 'text-[#526077] dark:text-[#93A8C8]'
              }`}
            >
              {p === 'today' ? 'Today' : p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* 4-Column Elevated 3D Tilt KPI Cards with Glossy Stickers & Number Counting */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <TiltGlassCard className="p-5 rounded-[24px] flex flex-col justify-between gap-3" delay={0}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold text-[#526077] dark:text-[#93A8C8]">
              Total Money Made
            </p>
            <UiSticker kind="sales" className="w-9 h-9 rounded-xl" />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold font-mono text-[#0F172A] dark:text-[#F0F6FF]">
            <AnimatedNumber value={overview?.totalRevenue ?? 0} decimals={2} suffix={` ${cur}`} />
          </p>
          <p className="text-xs text-[#526077] dark:text-[#93A8C8] font-mono tabular-nums">
            <AnimatedNumber value={overview?.transactionCount ?? 0} /> sales · Avg{' '}
            {(overview?.averageBasket ?? 0).toFixed(2)} {cur}
          </p>
        </TiltGlassCard>

        <TiltGlassCard className="p-5 rounded-[24px] flex flex-col justify-between gap-3" delay={0.04}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold text-[#526077] dark:text-[#93A8C8]">
              {t('trueNetProfit')}
            </p>
            <UiSticker kind="profit" className="w-9 h-9 rounded-xl" />
          </div>
          <p
            className={`font-display text-2xl sm:text-3xl font-bold font-mono ${
              trueNet >= 0 ? 'text-[#0D9464] dark:text-[#22C58B]' : 'text-red-600 dark:text-red-400'
            }`}
          >
            <AnimatedNumber value={trueNet} decimals={2} suffix={` ${cur}`} />
          </p>
          <p className="text-xs text-[#526077] dark:text-[#93A8C8] font-mono tabular-nums truncate">
            Drug {(overview?.netProfit ?? 0).toFixed(0)} − Exp {(overview?.totalExpenses ?? 0).toFixed(0)} − Pay{' '}
            {(overview?.totalPayrollPaid ?? 0).toFixed(0)}
          </p>
        </TiltGlassCard>

        <TiltGlassCard className="p-5 rounded-[24px] flex flex-col justify-between gap-3" delay={0.08}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold text-[#526077] dark:text-[#93A8C8]">
              Medicines & Credit
            </p>
            <UiSticker kind="inventory" className="w-9 h-9 rounded-xl" />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold font-mono text-[#0F172A] dark:text-[#F0F6FF]">
            <AnimatedNumber value={overview?.unitsSold ?? 0} />{' '}
            <span className="text-sm font-normal text-[#526077] dark:text-[#93A8C8]">units</span>
          </p>
          <p className="text-xs text-[#526077] dark:text-[#93A8C8] font-mono tabular-nums">
            {drugs.length} SKUs · Supplier due {(overview?.unpaidSupplierBalance ?? 0).toLocaleString()} {cur}
          </p>
        </TiltGlassCard>

        <TiltGlassCard className="p-5 rounded-[24px] flex flex-col justify-between gap-3" delay={0.12}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold text-[#526077] dark:text-[#93A8C8]">
              Stock & Payday Alerts
            </p>
            <UiSticker kind="alert" className="w-9 h-9 rounded-xl" />
          </div>
          <p
            className={`font-display text-2xl sm:text-3xl font-bold font-mono ${
              (overview?.activeLowStockCount ?? 0) + payrollAlerts.length > 0
                ? 'text-[#D97706] dark:text-[#F59E0B]'
                : 'text-[#0D9464] dark:text-[#22C58B]'
            }`}
          >
            <AnimatedNumber value={(overview?.activeLowStockCount ?? 0) + payrollAlerts.length} />
          </p>
          <p className="text-xs text-[#526077] dark:text-[#93A8C8] font-mono tabular-nums">
            {overview?.activeLowStockCount ?? 0} low stock · {payrollAlerts.length} payday alerts
          </p>
        </TiltGlassCard>
      </div>

      {/* Quick Action Tiles + Care Banner (referencing Image 1's glossy shortcut tiles & banner) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(
            [
              { tab: 'pos', label: t('posCounter'), sub: 'Dispense Rx', kind: 'bag' },
              { tab: 'inventory', label: t('catalog'), sub: `${drugs.length} SKUs`, kind: 'inventory' },
              { tab: 'transactions', label: t('transactions'), sub: 'Receipts', kind: 'sales' },
              { tab: 'attendance', label: t('attendanceQr'), sub: 'QR Clock', kind: 'attendance' },
            ] as const
          ).map((tile) => (
            <motion.button
              key={tile.tab}
              type="button"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 360, damping: 24 }}
              onClick={() => {
                soundEngine.playTap();
                onNavigateTab(tile.tab);
              }}
              className="p-3.5 rounded-[22px] apple-surface flex flex-col items-center justify-center text-center gap-2 hover:shadow-md transition-shadow"
            >
              <UiSticker kind={tile.kind} className="w-11 h-11 rounded-2xl" />
              <div className="min-w-0 w-full">
                <p className="text-xs font-bold truncate">{tile.label}</p>
                <p className="text-[10px] text-[#526077] dark:text-[#93A8C8] truncate">{tile.sub}</p>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="lg:col-span-5 p-4 sm:p-5 apple-surface rounded-[24px] flex items-center justify-between gap-4 overflow-hidden relative">
          <div className="space-y-1.5 min-w-0 flex-1">
            <p className="font-display text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F0F6FF]">
              Better Care, Healthier Counter
            </p>
            <p className="text-xs text-[#526077] dark:text-[#93A8C8]">
              Fast locked-price dispensing with automatic stock deduction.
            </p>
            <div className="pt-1">
              <MagneticButton
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  onNavigateTab('pos');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold"
              >
                <span>Open POS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </MagneticButton>
            </div>
          </div>
          <StickerImage
            asset="careHeart"
            alt="Pharmacy care heart emblem"
            floating
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl"
          />
        </div>
      </div>

      {/* Main Analytics Grid: Animated Dual-Line Curve Chart + Payment Mix & Top Drugs */}
      <RevealSection className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-4 sm:p-6 apple-surface rounded-[26px] flex flex-col justify-between min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <UiSticker kind="sales" className="w-9 h-9 rounded-xl" />
              <div>
                <h3 className="font-display text-base font-bold">7-Day Revenue & Profit Pulse</h3>
                <p className="text-xs text-[#526077] dark:text-[#93A8C8]">
                  Animated daily gross receipts vs drug margin ({cur})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-[#526077] dark:text-[#93A8C8]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0EA5E9] dark:bg-[#22D3EE] shadow-[0_0_8px_#22D3EE]" />
                Revenue
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] dark:bg-[#A855F7] shadow-[0_0_8px_#A855F7]" />
                Drug Profit
              </span>
            </div>
          </div>

          {/* Interactive Selected Day Callout */}
          {activeDay && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-2xl apple-inset text-xs">
              <span className="font-semibold text-[#0F172A] dark:text-[#F0F6FF]">{activeDay.label}</span>
              <div className="flex items-center gap-4 font-mono tabular-nums">
                <span className="text-[#0284C7] dark:text-[#22D3EE] font-bold">
                  Rev: {activeDay.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} {cur}
                </span>
                <span className="text-[#7C3AED] dark:text-[#C084FC] font-bold">
                  Profit: {activeDay.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })} {cur}
                </span>
              </div>
            </div>
          )}

          {/* Animated Smooth SVG Dual-Line Chart */}
          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${chartGeometry.W} ${chartGeometry.H}`}
              className="w-full h-44 sm:h-48 overflow-visible"
              role="img"
              aria-label="7-Day Revenue and Profit trend chart"
            >
              <defs>
                <linearGradient id="yoyaRevAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id="yoyaRevStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="50%" stopColor="#0EA5E9" />
                  <stop offset="100%" stopColor="#22D3EE" />
                </linearGradient>
                <linearGradient id="yoyaProfStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#C084FC" />
                </linearGradient>
                <filter id="yoyaLineGlow" x="-10%" y="-20%" width="120%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Subtle Horizontal Grid Lines */}
              {[0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = 18 + (chartGeometry.baselineY - 18) * ratio;
                return (
                  <line
                    key={ratio}
                    x1={16}
                    x2={chartGeometry.W - 16}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    strokeDasharray="3 4"
                    className="text-blue-900/10 dark:text-cyan-200/10"
                  />
                );
              })}

              {/* Area Fill */}
              {chartGeometry.revArea && (
                <motion.path
                  d={chartGeometry.revArea}
                  fill="url(#yoyaRevAreaGrad)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.65, delay: 0.15 }}
                />
              )}

              {/* Animated Drug Profit Line */}
              {chartGeometry.profLine && (
                <motion.path
                  key={`prof_${period}_${dailySeries.map((d) => d.profit).join(',')}`}
                  d={chartGeometry.profLine}
                  fill="none"
                  stroke="url(#yoyaProfStroke)"
                  strokeWidth={2.75}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0.4 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                />
              )}

              {/* Animated Revenue Line with Subtle Glow */}
              {chartGeometry.revLine && (
                <motion.path
                  key={`rev_${period}_${dailySeries.map((d) => d.revenue).join(',')}`}
                  d={chartGeometry.revLine}
                  fill="none"
                  stroke="url(#yoyaRevStroke)"
                  strokeWidth={3.2}
                  strokeLinecap="round"
                  filter="url(#yoyaLineGlow)"
                  initial={{ pathLength: 0, opacity: 0.5 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                />
              )}

              {/* Interactive Hover Nodes */}
              {chartGeometry.revPts.map((pt, idx) => {
                const profPt = chartGeometry.profPts[idx];
                const isSelected = activeDayIdx === idx;
                return (
                  <g
                    key={pt.day.date}
                    onMouseEnter={() => setHoveredDayIdx(idx)}
                    onClick={() => setHoveredDayIdx(idx)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={pt.x - 26}
                      y={0}
                      width={52}
                      height={chartGeometry.H}
                      fill="transparent"
                    />
                    {isSelected && (
                      <line
                        x1={pt.x}
                        x2={pt.x}
                        y1={12}
                        y2={chartGeometry.baselineY}
                        stroke="#22D3EE"
                        strokeOpacity={0.35}
                        strokeDasharray="3 3"
                      />
                    )}
                    {profPt && (
                      <circle
                        cx={profPt.x}
                        cy={profPt.y}
                        r={isSelected ? 4.5 : 3}
                        className="fill-[#8B5CF6] stroke-white dark:stroke-[#0A132A]"
                        strokeWidth={1.6}
                      />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 5.5 : 3.6}
                      className="fill-[#0EA5E9] dark:fill-[#22D3EE] stroke-white dark:stroke-[#0A132A]"
                      strokeWidth={2}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Daily X-Axis Labels */}
            <div className="grid grid-cols-7 gap-1 mt-1 text-center">
              {dailySeries.map((day, idx) => (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setHoveredDayIdx(idx)}
                  className={`py-1 rounded-lg transition-colors min-w-0 ${
                    activeDayIdx === idx
                      ? 'bg-[#1464F6]/10 dark:bg-cyan-400/15 text-[#1464F6] dark:text-[#22D3EE] font-bold'
                      : 'text-[#526077] dark:text-[#93A8C8]'
                  }`}
                >
                  <p className="text-[10px] sm:text-[11px] truncate">{day.label}</p>
                  <p className="text-[9px] sm:text-[10px] font-mono tabular-nums truncate opacity-85">
                    {day.revenue.toFixed(0)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Breakdown Cards with Glossy Stickers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-5 pt-4 border-t border-blue-500/10 dark:border-cyan-400/12">
            {(overview?.paymentBreakdown ?? []).map((pm) => {
              const pct = Math.min(100, Math.round((pm.amount / totalBreakdownAmount) * 100));
              return (
                <div key={pm.method} className="p-3.5 rounded-2xl apple-inset space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[#526077] dark:text-[#93A8C8] capitalize truncate">
                      {pm.method === 'transfer' ? 'Mobile / Bank' : pm.method}
                    </span>
                    <UiSticker
                      kind={paymentStickers[pm.method] || 'cash'}
                      className="w-6 h-6 rounded-lg"
                    />
                  </div>
                  <p className="font-mono tabular-nums text-sm sm:text-base font-bold">
                    <AnimatedNumber value={pm.amount} decimals={2} suffix={` ${cur}`} />
                  </p>
                  <div className="h-1.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(4, pct)}%` }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full bg-gradient-to-r from-[#1464F6] to-[#22D3EE]"
                    />
                  </div>
                  <p className="text-[11px] text-[#526077] dark:text-[#93A8C8] font-mono tabular-nums">
                    {pm.count} portions · {pct}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Dispensed Drugs */}
        <div className="lg:col-span-5 p-4 sm:p-6 apple-surface rounded-[26px]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <UiSticker kind="inventory" className="w-9 h-9 rounded-xl" />
              <div>
                <h3 className="font-display text-base font-bold">Most Sold Drugs</h3>
                <p className="text-xs text-[#526077] dark:text-[#93A8C8]">Top dispensed medicines by base units</p>
              </div>
            </div>
            <TrendingUp className="w-4 h-4 text-[#1464F6] dark:text-[#22D3EE]" />
          </div>

          {overview && overview.topDrugs.length > 0 ? (
            <div className="space-y-4">
              {overview.topDrugs.map((item, idx) => {
                const widthPct = Math.max(8, Math.round((item.unitsSold / maxUnitsSold) * 100));
                const { label: kindLabel } = resolveDrugKind(item.dosageForm, drugKinds);
                return (
                  <div key={item.drugId} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-mono text-[#526077] dark:text-[#93A8C8] w-4">
                          {idx + 1}.
                        </span>
                        <span className="p-1.5 rounded-xl bg-[#1464F6]/10 dark:bg-cyan-400/15 text-[#1464F6] dark:text-[#22D3EE]">
                          <MedicineIcon form={item.dosageForm} drugKinds={drugKinds} className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{item.drugName}</p>
                          <p className="text-[11px] text-[#526077] dark:text-[#93A8C8]">
                            {kindLabel} · {item.profit.toFixed(0)} {cur} profit
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-mono tabular-nums font-bold">{item.unitsSold} sold</p>
                        <p className="text-[11px] font-mono tabular-nums text-[#526077] dark:text-[#93A8C8]">
                          {item.revenue.toFixed(0)} {cur}
                        </p>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full apple-inset overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPct}%` }}
                        transition={{ duration: 0.7, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-[#2563EB] via-[#0EA5E9] to-[#22C58B]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#526077] dark:text-[#93A8C8] py-8 text-center">
              No sales recorded in this period yet.
            </p>
          )}
        </div>
      </RevealSection>

      {/* Low Stock, Expiry & Payday Notifications + Cashier Z-Report */}
      <RevealSection delay={0.05} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 p-4 sm:p-6 apple-surface rounded-[26px]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <StickerImage
                asset="pillBottle"
                alt="Low stock pill bottle alert"
                className="w-10 h-10 rounded-xl"
              />
              <h3 className="font-display text-base font-bold truncate">
                Owner Stock, Expiry & Payday Alerts
              </h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onOpenRestockSheet && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    onOpenRestockSheet();
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl apple-inset text-xs font-semibold text-[#0D6E52] dark:text-[#22C58B] hover:opacity-80"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Restock Sheet
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigateTab('inventory')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1464F6] dark:text-[#22D3EE] hover:underline shrink-0"
              >
                Manage Stock
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {unackedAlerts.length === 0 &&
          soonExpiringDrugs.length === 0 &&
          payrollAlerts.length === 0 &&
          (overview?.unpaidSupplierBalance ?? 0) === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-[#0D9464] dark:text-[#22C58B]" />
              <p className="text-sm font-medium">All medicines, supplier invoices, and payroll schedules are on track.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(overview?.unpaidSupplierBalance ?? 0) > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl apple-inset">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-[#1464F6] dark:text-[#22D3EE]" />
                    <div>
                      <p className="text-sm font-semibold">Wholesale Credit Payable</p>
                      <p className="text-xs font-mono tabular-nums text-[#526077] dark:text-[#93A8C8]">
                        {(overview?.unpaidSupplierBalance ?? 0).toLocaleString()} {cur} open with suppliers
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('operations')}
                    className="px-3 py-1.5 rounded-xl yoya-btn-primary text-xs font-semibold"
                  >
                    Open Operations
                  </button>
                </div>
              )}

              {payrollAlerts.map((payAlert) => (
                <div
                  key={`pay_${payAlert.profile.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-amber-300/70 dark:border-amber-700/50 bg-amber-50/75 dark:bg-amber-950/25"
                >
                  <div className="flex items-center gap-3">
                    <Banknote className="w-5 h-5 text-[#D97706] dark:text-[#F59E0B]" />
                    <div>
                      <p className="text-sm font-semibold">
                        Salary {payAlert.status === 'overdue' ? 'Overdue' : 'Due Soon'}: {payAlert.profile.workerName}
                      </p>
                      <p className="text-xs font-mono tabular-nums text-[#526077] dark:text-[#93A8C8]">
                        {payAlert.profile.monthlySalary.toLocaleString()} {cur} · Due{' '}
                        {formatClinicDate(payAlert.dueDate, calendarMode, language)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('payroll')}
                    className="px-3 py-1.5 rounded-xl yoya-btn-primary text-xs font-semibold"
                  >
                    Pay Salary
                  </button>
                </div>
              ))}

              {unackedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-amber-300/70 dark:border-amber-700/50 bg-amber-50/75 dark:bg-amber-950/25"
                >
                  <div className="flex items-center gap-3">
                    <MedicineIcon
                      form={alert.dosageForm}
                      drugKinds={drugKinds}
                      className="w-5 h-5 text-amber-700 dark:text-amber-300"
                    />
                    <div>
                      <p className="text-sm font-semibold">
                        {alert.drugName}
                        <span className="ml-2 text-xs font-medium text-amber-800 dark:text-amber-300">
                          {alert.severity === 'critical' ? 'Out of Stock' : 'Low Stock Warning'}
                        </span>
                      </p>
                      <p className="text-xs font-mono tabular-nums text-[#526077] dark:text-[#93A8C8]">
                        Remaining: {alert.currentStock} · Reorder threshold: {alert.threshold}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playTap();
                        onOpenAddStock(alert.drugId);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl yoya-btn-primary text-xs font-semibold"
                    >
                      <PackagePlus className="w-3.5 h-3.5" />
                      Add Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => void onAcknowledgeAlert(alert.id)}
                      className="px-2.5 py-1.5 rounded-xl apple-surface text-xs font-medium"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}

              {soonExpiringDrugs.map((drug) => (
                <div
                  key={`exp_${drug.id}`}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-2xl apple-inset"
                >
                  <div className="flex items-center gap-3">
                    <CalendarClock className="w-5 h-5 text-[#D97706] dark:text-[#F59E0B]" />
                    <div>
                      <p className="text-sm font-semibold">{drug.name} · Batch {drug.batchNumber}</p>
                      <p className="text-xs font-mono tabular-nums text-[#526077] dark:text-[#93A8C8]">
                        Expires {formatClinicDate(drug.expiryDate, calendarMode, language)} · {drug.stock} units on shelf
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#D97706] dark:text-[#F59E0B]">
                    Expiring Soon
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 p-4 sm:p-6 apple-surface rounded-[26px] min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <UiSticker kind="shield" className="w-9 h-9 rounded-xl" />
              <div>
                <h3 className="font-display text-base font-bold">Seller Shift Reconciliation</h3>
                <p className="text-xs text-[#526077] dark:text-[#93A8C8]">
                  Cash drawer vs verified transfer/card totals per seller
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('operations')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1464F6] dark:text-[#22D3EE] hover:underline"
            >
              Blind Z-Reports
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Seller Cards */}
          <div className="sm:hidden space-y-2.5">
            {(overview?.cashierPerformance ?? []).map((row) => (
              <div key={row.cashierId} className="p-3.5 rounded-2xl apple-inset space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm truncate">{row.cashierName}</p>
                  <span className="font-mono text-xs font-bold text-[#1464F6] dark:text-[#22D3EE]">
                    {row.revenue.toFixed(0)} {cur}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums">
                  <div>
                    <p className="text-[#526077] dark:text-[#93A8C8]">Sales</p>
                    <p className="font-semibold">{row.transactions}</p>
                  </div>
                  <div>
                    <p className="text-[#526077] dark:text-[#93A8C8]">Cash</p>
                    <p className="font-semibold">{row.cashTotal.toFixed(0)} {cur}</p>
                  </div>
                  <div>
                    <p className="text-[#526077] dark:text-[#93A8C8]">Non-Cash</p>
                    <p className="font-semibold">{row.nonCashTotal.toFixed(0)} {cur}</p>
                  </div>
                </div>
              </div>
            ))}
            {(overview?.cashierPerformance ?? []).length === 0 && (
              <p className="py-6 text-center text-xs text-[#526077] dark:text-[#93A8C8]">
                No seller transactions in this period.
              </p>
            )}
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-blue-500/10 dark:border-cyan-400/12 text-[#526077] dark:text-[#93A8C8]">
                  <th className="pb-2.5 font-medium">Seller</th>
                  <th className="pb-2.5 font-medium text-right">Sales</th>
                  <th className="pb-2.5 font-medium text-right">Cash Drawer</th>
                  <th className="pb-2.5 font-medium text-right">Non-Cash</th>
                  <th className="pb-2.5 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-500/10 dark:divide-cyan-400/10">
                {(overview?.cashierPerformance ?? []).map((row) => (
                  <tr key={row.cashierId}>
                    <td className="py-3 font-medium text-sm">{row.cashierName}</td>
                    <td className="py-3 text-right font-mono tabular-nums">{row.transactions}</td>
                    <td className="py-3 text-right font-mono tabular-nums">{row.cashTotal.toFixed(0)} {cur}</td>
                    <td className="py-3 text-right font-mono tabular-nums">{row.nonCashTotal.toFixed(0)} {cur}</td>
                    <td className="py-3 text-right font-mono tabular-nums font-bold">{row.revenue.toFixed(0)} {cur}</td>
                  </tr>
                ))}
                {(overview?.cashierPerformance ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#526077] dark:text-[#93A8C8]">
                      No seller transactions in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </RevealSection>
    </div>
  );
}
