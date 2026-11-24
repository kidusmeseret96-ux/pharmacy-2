import React, { useState } from 'react';

export const STICKER_ASSETS = {
  capsuleHero: '/src/assets/images/sticker_capsule_hero_1795530312633.jpg',
  pharmacyStore: '/src/assets/images/sticker_pharmacy_store_1795530313494.jpg',
  pillBottle: '/src/assets/images/sticker_pill_bottle_1795530313958.jpg',
  careHeart: '/src/assets/images/sticker_care_heart_1795530314446.jpg',
} as const;

export type StickerAssetKey = keyof typeof STICKER_ASSETS;

export function StickerImage({
  asset,
  alt,
  className = 'w-14 h-14',
  floating = false,
}: {
  asset: StickerAssetKey;
  alt: string;
  className?: string;
  floating?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`rounded-2xl bg-gradient-to-br from-[#2589FF] via-[#0EA5E9] to-[#10B981] flex items-center justify-center text-white shadow-md shrink-0 ${className}`}
        aria-label={alt}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-1/2 h-1/2" aria-hidden="true">
          <path
            d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5V4z"
            fill="currentColor"
            opacity="0.95"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/40 dark:border-cyan-400/25 shadow-[0_10px_24px_-8px_rgba(20,100,246,0.45)] dark:shadow-[0_10px_28px_-6px_rgba(34,211,238,0.35)] shrink-0 ${
        floating ? 'yoya-float-gentle' : ''
      } ${className}`}
    >
      <img
        src={STICKER_ASSETS[asset]}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/25"
      />
    </div>
  );
}

export type UiStickerKind =
  | 'sales'
  | 'profit'
  | 'inventory'
  | 'alert'
  | 'cash'
  | 'transfer'
  | 'card'
  | 'split'
  | 'rx'
  | 'shield'
  | 'payroll'
  | 'attendance'
  | 'bag'
  | 'operations';

const STICKER_STYLES: Record<
  UiStickerKind,
  { bg: string; glow: string }
> = {
  sales: {
    bg: 'from-[#3B82F6] via-[#2563EB] to-[#0EA5E9]',
    glow: 'shadow-[0_8px_18px_-6px_rgba(37,99,235,0.55)]',
  },
  profit: {
    bg: 'from-[#10B981] via-[#059669] to-[#06B6D4]',
    glow: 'shadow-[0_8px_18px_-6px_rgba(16,185,129,0.5)]',
  },
  inventory: {
    bg: 'from-[#8B5CF6] via-[#7C3AED] to-[#6366F1]',
    glow: 'shadow-[0_8px_18px_-6px_rgba(124,58,237,0.5)]',
  },
  alert: {
    bg: 'from-[#F59E0B] via-[#EA580C] to-[#EF4444]',
    glow: 'shadow-[0_8px_18px_-6px_rgba(245,158,11,0.5)]',
  },
  cash: {
    bg: 'from-[#10B981] to-[#0D9488]',
    glow: 'shadow-[0_6px_14px_-5px_rgba(16,185,129,0.45)]',
  },
  transfer: {
    bg: 'from-[#0EA5E9] to-[#2563EB]',
    glow: 'shadow-[0_6px_14px_-5px_rgba(14,165,233,0.45)]',
  },
  card: {
    bg: 'from-[#6366F1] to-[#8B5CF6]',
    glow: 'shadow-[0_6px_14px_-5px_rgba(99,102,241,0.45)]',
  },
  split: {
    bg: 'from-[#EC4899] to-[#8B5CF6]',
    glow: 'shadow-[0_6px_14px_-5px_rgba(236,72,153,0.45)]',
  },
  rx: {
    bg: 'from-[#F59E0B] to-[#D97706]',
    glow: 'shadow-[0_6px_14px_-5px_rgba(217,119,6,0.45)]',
  },
  shield: {
    bg: 'from-[#10B981] via-[#0EA5E9] to-[#2563EB]',
    glow: 'shadow-[0_6px_16px_-5px_rgba(14,165,233,0.45)]',
  },
  payroll: {
    bg: 'from-[#F97316] to-[#F59E0B]',
    glow: 'shadow-[0_6px_14px_-5px_rgba(249,115,22,0.45)]',
  },
  attendance: {
    bg: 'from-[#06B6D4] to-[#3B82F6]',
    glow: 'shadow-[0_6px_14px_-5px_rgba(6,182,212,0.45)]',
  },
  bag: {
    bg: 'from-[#2563EB] to-[#06B6D4]',
    glow: 'shadow-[0_6px_14px_-5px_rgba(37,99,235,0.45)]',
  },
  operations: {
    bg: 'from-[#0EA5E9] to-[#8B5CF6]',
    glow: 'shadow-[0_6px_14px_-5px_rgba(14,165,233,0.45)]',
  },
};

export function UiSticker({
  kind,
  className = 'w-10 h-10',
}: {
  kind: UiStickerKind;
  className?: string;
}) {
  const style = STICKER_STYLES[kind];

  const renderGlyph = () => {
    switch (kind) {
      case 'sales':
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-[54%] h-[54%]" aria-hidden="true">
            <path d="M4 17l5-5 4 3 7-8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 7h4v4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'profit':
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-[54%] h-[54%]" aria-hidden="true">
            <circle cx="12" cy="12" r="7.5" stroke="white" strokeWidth="2" />
            <path d="M12 7.5v9M14.8 9.8c0-1.1-1.2-1.8-2.8-1.8s-2.8.7-2.8 1.8c0 1.2 1.1 1.6 2.8 2s2.8.8 2.8 2c0 1.1-1.2 1.8-2.8 1.8s-2.8-.7-2.8-1.8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        );
      case 'inventory':
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-[54%] h-[54%]" aria-hidden="true">
            <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        );
      case 'alert':
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-[54%] h-[54%]" aria-hidden="true">
            <path d="M12 4L3.5 19h17L12 4z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 10v4M12 16.8h.01" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        );
      case 'cash':
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-[54%] h-[54%]" aria-hidden="true">
            <rect x="3.5" y="6.5" width="17" height="11" rx="2.5" stroke="white" strokeWidth="2" />
            <circle cx="12" cy="12" r="2.5" stroke="white" strokeWidth="1.8" />
          </svg>
        );
      case 'transfer':
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-[54%] h-[54%]" aria-hidden="true">
            <rect x="6.5" y="3" width="11" height="18" rx="2.5" stroke="white" strokeWidth="2" />
            <path d="M10.5 17.5h3" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'card':
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-[54%] h-[54%]" aria-hidden="true">
            <rect x="3" y="5.5" width="18" height="13" rx="2.5" stroke="white" strokeWidth="2" />
            <path d="M3 10h18M7 14.5h4" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'split':
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-[54%] h-[54%]" aria-hidden="true">
            <path d="M12 19v-7l-5.5-5.5M12 12l5.5-5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 10V6.5h3.5M19 10V6.5h-3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'rx':
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-[54%] h-[54%]" aria-hidden="true">
            <path d="M6 17V6h4.5a3 3 0 010 6H6m4.5 0l6 6m0-4l-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'shield':
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-[54%] h-[54%]" aria-hidden="true">
            <path d="M12 3l7 3v5.5c0 4.5-3 8.2-7 9.5-4-1.3-7-5-7-9.5V6l7-3z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
            <path d="M9.2 12.2l2 2 3.8-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'payroll':
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-[54%] h-[54%]" aria-hidden="true">
            <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="white" strokeWidth="2" />
            <path d="M8 3v3M16 3v3M4 9.5h16M9.5 14h5" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'attendance':
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-[54%] h-[54%]" aria-hidden="true">
            <rect x="4" y="4" width="6.5" height="6.5" rx="1.2" stroke="white" strokeWidth="2" />
            <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" stroke="white" strokeWidth="2" />
            <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" stroke="white" strokeWidth="2" />
            <path d="M14 14h2.5v2.5M19.5 19.5H17v-2" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'bag':
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-[54%] h-[54%]" aria-hidden="true">
            <path d="M6 8h12l1 12H5L6 8z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
            <path d="M9 8V6.5a3 3 0 016 0V8" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'operations':
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-[54%] h-[54%]" aria-hidden="true">
            <path d="M12 4v16M4 12h16" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br ${style.bg} ${style.glow} flex items-center justify-center shrink-0 overflow-hidden border border-white/35 dark:border-white/20 ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent"
      />
      {renderGlyph()}
    </div>
  );
}

/**
 * Lightweight static ambient aurora backdrop (zero idle animation/blur repaints).
 */
export function AmbientBackdrop({ darkMode }: { darkMode: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="no-print pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        backgroundImage: darkMode
          ? 'radial-gradient(620px circle at 8% 4%, rgba(29, 107, 255, 0.14), transparent 65%), radial-gradient(560px circle at 92% 24%, rgba(6, 182, 212, 0.11), transparent 65%), radial-gradient(540px circle at 38% 95%, rgba(139, 92, 246, 0.1), transparent 65%)'
          : 'radial-gradient(620px circle at 8% 4%, rgba(59, 130, 246, 0.11), transparent 65%), radial-gradient(560px circle at 92% 24%, rgba(14, 165, 233, 0.09), transparent 65%), radial-gradient(540px circle at 38% 95%, rgba(16, 185, 129, 0.08), transparent 65%)',
      }}
    />
  );
}

/**
 * Primary CTA Button with crisp CSS hover/tap response and zero pointer-move re-renders.
 */
interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'emerald';
  children: React.ReactNode;
}

export function MagneticButton({
  variant = 'primary',
  className = '',
  children,
  disabled,
  ...rest
}: MagneticButtonProps) {
  const variantClass = variant === 'emerald' ? 'yoya-btn-emerald' : 'yoya-btn-primary';

  return (
    <button
      disabled={disabled}
      className={`relative overflow-hidden active:scale-[0.98] ${variantClass} ${className}`}
      {...rest}
    >
      <span className="relative z-10 inline-flex items-center justify-center gap-2 w-full">
        {children}
      </span>
    </button>
  );
}

/**
 * Elevated glass card with fast CSS hover shadow (zero pointer-move re-renders).
 */
export function TiltGlassCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`apple-surface transition-shadow duration-150 hover:shadow-[0_14px_30px_-12px_rgba(20,100,246,0.18)] dark:hover:shadow-[0_14px_34px_-12px_rgba(34,211,238,0.2)] ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Crisp instant tabular number readout (no per-frame RAF loops across KPI strips).
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/**
 * Lightweight section container without IntersectionObserver scroll stalls.
 */
export function RevealSection({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return <div className={className}>{children}</div>;
}

/**
 * Premium Dashboard Skeleton Shimmer matching KPI strip & analytics workspace.
 */
export function PremiumSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading workspace">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="h-32 rounded-[24px] apple-surface yoya-shimmer p-5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded-full apple-inset" />
              <div className="w-9 h-9 rounded-2xl apple-inset" />
            </div>
            <div className="h-7 w-36 rounded-xl apple-inset" />
            <div className="h-2.5 w-28 rounded-full apple-inset" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 h-72 rounded-[26px] apple-surface yoya-shimmer p-6 flex flex-col justify-between">
          <div className="h-4 w-48 rounded-full apple-inset" />
          <div className="h-40 w-full rounded-2xl apple-inset" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-12 rounded-2xl apple-inset" />
            <div className="h-12 rounded-2xl apple-inset" />
            <div className="h-12 rounded-2xl apple-inset" />
          </div>
        </div>
        <div className="lg:col-span-5 h-72 rounded-[26px] apple-surface yoya-shimmer p-6 space-y-4">
          <div className="h-4 w-36 rounded-full apple-inset" />
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-10 rounded-xl apple-inset" />
          ))}
        </div>
      </div>
    </div>
  );
}
