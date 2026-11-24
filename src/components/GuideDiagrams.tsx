import React from 'react';
import {
  Banknote,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ClipboardCopy,
  Clock,
  CreditCard,
  Download,
  Edit3,
  FileSpreadsheet,
  Globe,
  IdCard,
  KeyRound,
  LogIn,
  LogOut,
  Moon,
  Package,
  PackagePlus,
  PauseCircle,
  Phone,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Snowflake,
  Split,
  Trash2,
  Upload,
  UserPlus,
  Vault,
  Volume2,
  Wifi,
} from 'lucide-react';
import type { GuideCategoryId } from '../lib/guideContent.ts';
import { getTranslator, LANGUAGE_LABELS } from '../lib/i18n.ts';
import type { Language } from '../types/pharmacy.ts';
import { MedicineIcon, YoyaPharmacyEmblem, YoyaWordmark } from './MedicineIcon.tsx';
import { STICKER_ASSETS, UiSticker } from './MotionPrimitives.tsx';

interface GuideDiagramProps {
  categoryId: GuideCategoryId;
  language: Language;
  clinicName: string;
  currencySymbol: string;
  activeStep: number | null;
  onSelectStep: (stepNumber: number) => void;
}

function CalloutArrowBadge({
  stepNumber,
  active,
  direction = 'down',
}: {
  stepNumber: number;
  active: boolean;
  direction?: 'down' | 'right' | 'left' | 'up';
}) {
  return (
    <span
      className={`group inline-flex items-center gap-1 rounded-full transition-transform duration-150 ${
        active ? 'scale-110' : 'group-hover:scale-105'
      }`}
    >
      <span
        className={`w-6 h-6 rounded-full font-mono text-xs font-extrabold flex items-center justify-center shadow-md border-2 transition-colors ${
          active
            ? 'bg-[#F59E0B] text-[#0F172A] border-white ring-4 ring-[#F59E0B]/35'
            : 'bg-[#1464F6] dark:bg-[#22D3EE] text-white dark:text-[#04101F] border-white dark:border-[#0B142A]'
        }`}
      >
        {stepNumber}
      </span>
      <svg
        viewBox="0 0 28 20"
        className={`w-6 h-4 shrink-0 ${
          active ? 'text-[#F59E0B]' : 'text-[#1464F6] dark:text-[#22D3EE]'
        } ${
          direction === 'down'
            ? 'rotate-90'
            : direction === 'up'
              ? '-rotate-90'
              : direction === 'left'
                ? 'rotate-180'
                : ''
        }`}
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2 10h20M16 4l7 6-7 6"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function HighlightFrame({
  stepNumber,
  activeStep,
  onSelect,
  arrowPos = 'top',
  children,
  className = '',
}: {
  stepNumber: number;
  activeStep: number | null;
  onSelect: (n: number) => void;
  arrowPos?: 'top' | 'left' | 'bottom';
  children: React.ReactNode;
  className?: string;
}) {
  const isActive = activeStep === stepNumber;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(stepNumber)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(stepNumber);
        }
      }}
      className={`relative rounded-2xl transition-all cursor-pointer ${
        isActive
          ? 'ring-2 ring-[#F59E0B] bg-amber-500/[0.08] shadow-[0_0_0_5px_rgba(245,158,11,0.14)]'
          : 'ring-1 ring-[#1464F6]/20 dark:ring-cyan-400/25 hover:ring-[#1464F6]/50 dark:hover:ring-cyan-400/55'
      } ${className}`}
    >
      {arrowPos === 'top' && (
        <div className="mb-1.5 flex items-center gap-1">
          <CalloutArrowBadge
            stepNumber={stepNumber}
            active={isActive}
            direction="down"
          />
        </div>
      )}
      {arrowPos === 'left' ? (
        <div className="flex items-center gap-2">
          <CalloutArrowBadge
            stepNumber={stepNumber}
            active={isActive}
            direction="right"
          />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      ) : (
        children
      )}
      {arrowPos === 'bottom' && (
        <div className="mt-1.5 flex items-center gap-1">
          <CalloutArrowBadge
            stepNumber={stepNumber}
            active={isActive}
            direction="up"
          />
        </div>
      )}
    </div>
  );
}

export function GuideDiagram({
  categoryId,
  language,
  clinicName,
  currencySymbol,
  activeStep,
  onSelectStep,
}: GuideDiagramProps) {
  const t = getTranslator(language);
  const cur = currencySymbol || 'Br';

  if (categoryId === 'getting_started') {
    return (
      <div className="rounded-[24px] border border-blue-500/15 dark:border-cyan-400/20 bg-gradient-to-br from-[#F4F8FF] to-[#E6F0FF] dark:from-[#081229] dark:to-[#0C1938] p-4 sm:p-5 space-y-4">
        {/* Annotated Top Bar Mockup */}
        <div className="apple-surface rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <YoyaPharmacyEmblem className="w-8 h-8 shrink-0" />
            <YoyaWordmark size="xs" customName={clinicName} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <HighlightFrame
              stepNumber={4}
              activeStep={activeStep}
              onSelect={onSelectStep}
              arrowPos="left"
              className="p-1"
            >
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D6E52] dark:text-[#22C58B]">
                  <Wifi className="w-3.5 h-3.5" />
                  {t('onlineMode')}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-200 text-[11px] font-semibold whitespace-nowrap">
                  <RefreshCw className="w-3 h-3" />
                  {t('syncNow')} (2)
                </span>
              </div>
            </HighlightFrame>
          </div>
        </div>

        {/* Split Mockup: Left Sidebar Controls + Center Sign-In Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          <div className="md:col-span-5 apple-surface rounded-2xl p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-2.5">
              <HighlightFrame
                stepNumber={1}
                activeStep={activeStep}
                onSelect={onSelectStep}
                arrowPos="top"
                className="p-2.5"
              >
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl apple-inset text-xs font-semibold">
                  <Globe className="w-4 h-4 text-[#1464F6] dark:text-[#22D3EE] shrink-0" />
                  <span className="truncate">{LANGUAGE_LABELS[language]}</span>
                </div>
              </HighlightFrame>

              <HighlightFrame
                stepNumber={3}
                activeStep={activeStep}
                onSelect={onSelectStep}
                arrowPos="top"
                className="p-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl apple-inset text-xs font-semibold">
                    <Moon className="w-3.5 h-3.5 text-[#1464F6] dark:text-[#22D3EE]" />
                    {t('nightMode')}
                  </span>
                  <span className="p-2 rounded-xl apple-inset">
                    <Volume2 className="w-4 h-4 text-[#1464F6] dark:text-[#22D3EE]" />
                  </span>
                </div>
              </HighlightFrame>
            </div>

            <HighlightFrame
              stepNumber={5}
              activeStep={activeStep}
              onSelect={onSelectStep}
              arrowPos="top"
              className="p-2.5"
            >
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl apple-inset text-xs">
                <Calendar className="w-4 h-4 text-[#0D6E52] dark:text-[#22C58B] shrink-0" />
                <span className="font-semibold truncate">{t('settingsKit')}</span>
              </div>
            </HighlightFrame>
          </div>

          <div className="md:col-span-7 apple-surface rounded-2xl p-4 flex flex-col justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={STICKER_ASSETS.pharmacyStore}
                alt={clinicName}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover border border-black/[0.08] shrink-0"
              />
              <div className="min-w-0">
                <p className="font-display text-sm font-bold truncate">{t('welcomeBack')}</p>
                <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE] truncate">
                  {t('loginSub')}
                </p>
              </div>
            </div>

            <HighlightFrame
              stepNumber={2}
              activeStep={activeStep}
              onSelect={onSelectStep}
              arrowPos="top"
              className="p-3"
            >
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="px-3 py-2 rounded-xl apple-inset text-xs text-[#5B6470] dark:text-[#98A2AE] truncate">
                    {t('username')}
                  </div>
                  <div className="px-3 py-2 rounded-xl apple-inset text-xs text-[#5B6470] dark:text-[#98A2AE] truncate">
                    {t('password')}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1464F6] dark:text-[#22D3EE]">
                    <KeyRound className="w-3 h-3" />
                    {t('forgotPassword')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl yoya-btn-primary text-xs font-semibold">
                    <LogIn className="w-3.5 h-3.5" />
                    {t('signIn')}
                  </span>
                </div>
              </div>
            </HighlightFrame>

            <div className="px-3 py-2 rounded-xl apple-inset flex items-center gap-2 text-[11px] text-[#5B6470] dark:text-[#98A2AE]">
              <Phone className="w-3.5 h-3.5 text-[#1464F6] dark:text-[#22D3EE] shrink-0" />
              <span>{t('supportHelp')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (categoryId === 'pos_sales') {
    return (
      <div className="rounded-[24px] border border-blue-500/15 dark:border-cyan-400/20 bg-gradient-to-br from-[#F4F8FF] to-[#E6F0FF] dark:from-[#081229] dark:to-[#0C1938] p-4 sm:p-5 space-y-4">
        {/* POS Header Bar */}
        <div className="apple-surface rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl apple-inset text-xs text-[#5B6470] dark:text-[#98A2AE] flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Amoxicillin / Shelf A-04...</span>
          </div>

          <HighlightFrame
            stepNumber={2}
            activeStep={activeStep}
            onSelect={onSelectStep}
            arrowPos="left"
            className="p-1"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl apple-inset text-xs font-semibold whitespace-nowrap">
              <PauseCircle className="w-3.5 h-3.5 text-[#D97706]" />
              {t('parkedCarts')} (1)
            </span>
          </HighlightFrame>

          <HighlightFrame
            stepNumber={6}
            activeStep={activeStep}
            onSelect={onSelectStep}
            arrowPos="left"
            className="p-1"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl apple-inset text-xs font-semibold whitespace-nowrap">
              <Vault className="w-3.5 h-3.5 text-[#0D6E52] dark:text-[#22C58B]" />
              {t('blindShiftClose')}
            </span>
          </HighlightFrame>
        </div>

        {/* Catalog Card + Checkout Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-5 apple-surface rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/src/assets/images/drug_antibiotic_tablets_1795526154308.jpg"
                alt="Amoxicillin sample"
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover border border-black/[0.08] shrink-0"
              />
              <div className="min-w-0">
                <p className="font-display text-sm font-bold truncate">Amoxicillin 500mg</p>
                <p className="text-[11px] font-mono text-[#5B6470] dark:text-[#98A2AE]">
                  Shelf A-04 · 120 units · {t('rxRequired')}
                </p>
              </div>
            </div>

            <HighlightFrame
              stepNumber={1}
              activeStep={activeStep}
              onSelect={onSelectStep}
              arrowPos="top"
              className="p-2.5"
            >
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5 text-[11px] font-semibold">
                  <span className="py-1.5 px-2 rounded-lg yoya-btn-primary text-center">Cap</span>
                  <span className="py-1.5 px-2 rounded-lg apple-inset text-center">Pack (10)</span>
                  <span className="py-1.5 px-2 rounded-lg apple-inset text-center">Box (100)</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono text-xs font-bold">180 {cur}</span>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl yoya-btn-emerald text-xs font-semibold">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </span>
                </div>
              </div>
            </HighlightFrame>
          </div>

          <div className="lg:col-span-7 apple-surface rounded-2xl p-4 space-y-3">
            <HighlightFrame
              stepNumber={3}
              activeStep={activeStep}
              onSelect={onSelectStep}
              arrowPos="top"
              className="p-2.5"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-semibold">
                <span className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl apple-inset">
                  <Banknote className="w-3.5 h-3.5 text-[#0D6E52]" /> {t('cash')}
                </span>
                <span className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl yoya-btn-primary">
                  <Phone className="w-3.5 h-3.5" /> {t('transfer')}
                </span>
                <span className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl apple-inset">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-500" /> {t('card')}
                </span>
                <span className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl apple-inset">
                  <Split className="w-3.5 h-3.5 text-purple-500" /> {t('split')}
                </span>
              </div>
            </HighlightFrame>

            <HighlightFrame
              stepNumber={4}
              activeStep={activeStep}
              onSelect={onSelectStep}
              arrowPos="top"
              className="p-2.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2 rounded-xl border border-amber-400/50 bg-amber-500/10 flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-amber-800 dark:text-amber-200 truncate">
                    {t('rxImageRequired')}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500 text-white shrink-0">
                    <Camera className="w-3 h-3" /> / <Upload className="w-3 h-3" />
                  </span>
                </div>
                <div className="p-2 rounded-xl border border-blue-400/50 bg-blue-500/10 flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-blue-800 dark:text-blue-200 truncate">
                    {t('paymentProofRequired')}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1464F6] text-white shrink-0">
                    <Camera className="w-3 h-3" /> / <Upload className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </HighlightFrame>

            <HighlightFrame
              stepNumber={5}
              activeStep={activeStep}
              onSelect={onSelectStep}
              arrowPos="top"
              className="p-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl yoya-btn-primary text-xs font-semibold">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  {t('completeSale')}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl apple-inset text-xs font-semibold">
                  <Printer className="w-3.5 h-3.5" />
                  <Download className="w-3.5 h-3.5" />
                </span>
              </div>
            </HighlightFrame>
          </div>
        </div>
      </div>
    );
  }

  if (categoryId === 'inventory_restock') {
    return (
      <div className="rounded-[24px] border border-blue-500/15 dark:border-cyan-400/20 bg-gradient-to-br from-[#F4F8FF] to-[#E6F0FF] dark:from-[#081229] dark:to-[#0C1938] p-4 sm:p-5 space-y-4">
        {/* Inventory Toolbar */}
        <div className="apple-surface rounded-2xl p-3 flex flex-wrap items-center gap-2.5">
          <HighlightFrame stepNumber={1} activeStep={activeStep} onSelect={onSelectStep} arrowPos="top" className="p-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl yoya-btn-primary text-xs font-semibold whitespace-nowrap">
              <Plus className="w-3.5 h-3.5" />
              {t('newMedicine')}
            </span>
          </HighlightFrame>

          <HighlightFrame stepNumber={2} activeStep={activeStep} onSelect={onSelectStep} arrowPos="top" className="p-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl apple-inset text-xs font-semibold whitespace-nowrap">
              <Package className="w-3.5 h-3.5 text-[#7C3AED]" />
              {t('addDrugKind')}
            </span>
          </HighlightFrame>

          <HighlightFrame stepNumber={3} activeStep={activeStep} onSelect={onSelectStep} arrowPos="top" className="p-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl apple-inset text-xs font-semibold whitespace-nowrap">
              <PackagePlus className="w-3.5 h-3.5 text-[#0D6E52] dark:text-[#22C58B]" />
              {t('addStock')}
            </span>
          </HighlightFrame>

          <HighlightFrame stepNumber={4} activeStep={activeStep} onSelect={onSelectStep} arrowPos="top" className="p-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl yoya-btn-emerald text-xs font-semibold whitespace-nowrap">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Restock Order Sheet (4)
            </span>
          </HighlightFrame>
        </div>

        {/* Sample Medicine Row + Restock Export Strip */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7 apple-surface rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/src/assets/images/drug_cough_syrup_1795526154725.jpg"
                alt="Syrup sample"
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-xl object-cover shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <MedicineIcon form="syrup" className="w-3.5 h-3.5 text-[#1464F6]" />
                  <p className="text-sm font-bold truncate">Pediatric Syrup 100ml</p>
                  <Snowflake className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                </div>
                <p className="text-[11px] font-mono text-red-600 dark:text-red-400">
                  Stock: 4 · Low Alert: 15 · Buy: 120 {cur} / Sell: 175 {cur}
                </p>
              </div>
            </div>

            <HighlightFrame stepNumber={5} activeStep={activeStep} onSelect={onSelectStep} arrowPos="left" className="p-1.5">
              <div className="inline-flex items-center gap-1.5">
                <span className="p-2 rounded-xl apple-inset text-[#1464F6] dark:text-[#22D3EE]">
                  <Edit3 className="w-3.5 h-3.5" />
                </span>
                <span className="p-2 rounded-xl apple-inset text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </span>
              </div>
            </HighlightFrame>
          </div>

          <div className="md:col-span-5 apple-surface rounded-2xl p-4 flex flex-col justify-center gap-2">
            <div className="flex items-center gap-2 text-xs font-bold">
              <img
                src={STICKER_ASSETS.pillBottle}
                alt="Restock Order"
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-lg object-cover shrink-0"
              />
              <span>Restock Sheet Exports</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl apple-inset text-[11px] font-semibold">
                <ClipboardCopy className="w-3 h-3" /> Copy List
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl apple-inset text-[11px] font-semibold">
                <Download className="w-3 h-3" /> PNG
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl yoya-btn-primary text-[11px] font-semibold">
                <Printer className="w-3 h-3" /> Print
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (categoryId === 'attendance_qr') {
    return (
      <div className="rounded-[24px] border border-blue-500/15 dark:border-cyan-400/20 bg-gradient-to-br from-[#F4F8FF] to-[#E6F0FF] dark:from-[#081229] dark:to-[#0C1938] p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Clinic Wall QR Poster */}
        <div className="lg:col-span-5 apple-surface rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <UiSticker kind="attendance" className="w-8 h-8 rounded-xl" />
            <p className="font-display text-sm font-bold">{t('clockInQr')}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white border border-black/10 flex items-center justify-center">
            <QrCode className="w-24 h-24 text-[#0F172A]" />
          </div>
          <HighlightFrame stepNumber={1} activeStep={activeStep} onSelect={onSelectStep} arrowPos="top" className="p-2">
            <div className="flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl yoya-btn-emerald text-xs font-semibold">
                <Download className="w-3.5 h-3.5" /> {t('downloadQr')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl apple-inset text-xs font-semibold">
                <Printer className="w-3.5 h-3.5" /> Print
              </span>
            </div>
          </HighlightFrame>
        </div>

        {/* Right: Worker Portal & Scanner */}
        <div className="lg:col-span-7 apple-surface rounded-2xl p-4 space-y-3 flex flex-col justify-between">
          <HighlightFrame stepNumber={2} activeStep={activeStep} onSelect={onSelectStep} arrowPos="top" className="p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl yoya-btn-primary text-xs font-semibold">
                <QrCode className="w-4 h-4" /> {t('scanQrCode')}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[#0D6E52] text-white text-xs font-semibold">
                  <LogIn className="w-3.5 h-3.5" /> {t('clockIn')}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl apple-inset text-xs font-semibold">
                  <LogOut className="w-3.5 h-3.5" /> {t('clockOut')}
                </span>
              </div>
            </div>
          </HighlightFrame>

          <HighlightFrame stepNumber={3} activeStep={activeStep} onSelect={onSelectStep} arrowPos="top" className="p-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1464F6] dark:text-[#22D3EE]" />
                <span className="font-mono font-semibold">08:32 AM (Shift 08:30 + 5m)</span>
              </div>
              <span className="font-semibold text-[#0D6E52] dark:text-[#22C58B]">
                {t('onTime')}
              </span>
            </div>
          </HighlightFrame>

          <HighlightFrame stepNumber={4} activeStep={activeStep} onSelect={onSelectStep} arrowPos="top" className="p-2.5">
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2 rounded-xl apple-inset">
                <p className="text-[10px] text-[#5B6470] dark:text-[#98A2AE]">Today Sold</p>
                <p className="text-xs font-bold">4,250 {cur}</p>
              </div>
              <div className="p-2 rounded-xl apple-inset">
                <p className="text-[10px] text-[#5B6470] dark:text-[#98A2AE]">{t('lateDays')}</p>
                <p className="text-xs font-bold text-[#0D6E52] dark:text-[#22C58B]">0</p>
              </div>
              <div className="p-2 rounded-xl apple-inset">
                <p className="text-[10px] text-[#5B6470] dark:text-[#98A2AE]">{t('monthlySalary')}</p>
                <p className="text-xs font-bold text-[#0D6E52] dark:text-[#22C58B]">{t('paid')}</p>
              </div>
            </div>
          </HighlightFrame>
        </div>
      </div>
    );
  }

  if (categoryId === 'staff_payroll') {
    return (
      <div className="rounded-[24px] border border-blue-500/15 dark:border-cyan-400/20 bg-gradient-to-br from-[#F4F8FF] to-[#E6F0FF] dark:from-[#081229] dark:to-[#0C1938] p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 apple-surface rounded-2xl p-4 space-y-3">
          <HighlightFrame stepNumber={1} activeStep={activeStep} onSelect={onSelectStep} arrowPos="top" className="p-2.5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                  <UserPlus className="w-4 h-4 text-[#1464F6]" />
                  {t('roleSeller')} / {t('roleManager')}
                </span>
                <span className="font-mono text-[11px] text-[#0D6E52] dark:text-[#22C58B]">
                  08:30 – 17:30 · 5m
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="px-2.5 py-1 rounded-lg yoya-btn-primary">{t('roleSeller')}</span>
                <span className="px-2.5 py-1 rounded-lg apple-inset">{t('roleManager')}</span>
                <span className="px-2.5 py-1 rounded-lg apple-inset inline-flex items-center gap-1">
                  <Edit3 className="w-3 h-3" /> {t('edit')}
                </span>
              </div>
            </div>
          </HighlightFrame>

          <HighlightFrame stepNumber={2} activeStep={activeStep} onSelect={onSelectStep} arrowPos="top" className="p-2.5">
            <div className="grid grid-cols-3 gap-2 text-[11px] text-center font-semibold">
              <div className="p-2 rounded-xl apple-inset space-y-1">
                <Camera className="w-4 h-4 mx-auto text-[#1464F6]" />
                <p className="truncate">{t('profilePhoto')}</p>
              </div>
              <div className="p-2 rounded-xl apple-inset space-y-1">
                <IdCard className="w-4 h-4 mx-auto text-[#0D6E52]" />
                <p className="truncate">{t('faydaFront')}</p>
              </div>
              <div className="p-2 rounded-xl apple-inset space-y-1">
                <IdCard className="w-4 h-4 mx-auto text-[#7C3AED]" />
                <p className="truncate">{t('faydaBack')}</p>
              </div>
            </div>
          </HighlightFrame>
        </div>

        <div className="lg:col-span-6 apple-surface rounded-2xl p-4 space-y-3 flex flex-col justify-between">
          <HighlightFrame stepNumber={3} activeStep={activeStep} onSelect={onSelectStep} arrowPos="top" className="p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold">{t('payroll')}</p>
                <p className="font-mono text-[11px] text-[#5B6470] dark:text-[#98A2AE]">
                  12,500 {cur} · Telebirr / CBE
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl yoya-btn-emerald text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> {t('confirmPaid')}
              </span>
            </div>
          </HighlightFrame>

          <HighlightFrame stepNumber={4} activeStep={activeStep} onSelect={onSelectStep} arrowPos="top" className="p-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <KeyRound className="w-4 h-4 text-[#D97706] shrink-0" />
                <span className="font-semibold truncate">{t('settingsKit')} · Credentials</span>
              </div>
              <span className="px-2.5 py-1 rounded-lg yoya-btn-primary text-[11px] font-semibold shrink-0">
                {t('save')}
              </span>
            </div>
          </HighlightFrame>
        </div>
      </div>
    );
  }

  // finance_audit
  return (
    <div className="rounded-[24px] border border-blue-500/15 dark:border-cyan-400/20 bg-gradient-to-br from-[#F4F8FF] to-[#E6F0FF] dark:from-[#081229] dark:to-[#0C1938] p-4 sm:p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HighlightFrame stepNumber={1} activeStep={activeStep} onSelect={onSelectStep} arrowPos="top" className="p-2">
          <div className="apple-surface rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <UiSticker kind="profit" className="w-9 h-9 rounded-xl" />
              <div>
                <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE]">{t('trueNetProfit')}</p>
                <p className="font-display text-base font-bold font-mono tabular-nums">48,200 {cur}</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg apple-inset text-[11px] font-semibold">30d</span>
          </div>
        </HighlightFrame>

        <HighlightFrame stepNumber={2} activeStep={activeStep} onSelect={onSelectStep} arrowPos="top" className="p-2">
          <div className="apple-surface rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <UiSticker kind="operations" className="w-9 h-9 rounded-xl" />
              <div>
                <p className="text-xs font-bold">{t('expenses')}</p>
                <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE]">Rent, Utilities, Tax</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl yoya-btn-primary text-[11px] font-semibold">
              <Plus className="w-3 h-3" /> {t('expenses')}
            </span>
          </div>
        </HighlightFrame>

        <HighlightFrame stepNumber={3} activeStep={activeStep} onSelect={onSelectStep} arrowPos="top" className="p-2">
          <div className="apple-surface rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-[#1464F6] dark:text-[#22D3EE]" />
              <div>
                <p className="text-xs font-bold">{t('suppliers')}</p>
                <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE]">Invoices & Credit Pay</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl yoya-btn-emerald text-[11px] font-semibold">
              <Receipt className="w-3 h-3" /> Pay
            </span>
          </div>
        </HighlightFrame>

        <HighlightFrame stepNumber={4} activeStep={activeStep} onSelect={onSelectStep} arrowPos="top" className="p-2">
          <div className="apple-surface rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#0D6E52] dark:text-[#22C58B]" />
              <div>
                <p className="text-xs font-bold">{t('auditLog')}</p>
                <p className="text-[11px] text-[#0D6E52] dark:text-[#22C58B] font-semibold">
                  {t('shiftReports')} · Chain Valid
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg apple-inset text-[11px] font-mono font-bold">
              SHA-256
            </span>
          </div>
        </HighlightFrame>
      </div>
    </div>
  );
}
