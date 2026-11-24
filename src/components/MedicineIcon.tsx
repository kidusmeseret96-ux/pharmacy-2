import React from 'react';
import type { DrugKind, DrugKindIconKey } from '../types/pharmacy.ts';

export const DEFAULT_DOSAGE_META: Record<
  string,
  { label: string; unitLabel: string; iconKey: DrugKindIconKey }
> = {
  tablet: { label: 'Tablet', unitLabel: 'Boxes / Packs', iconKey: 'tablet' },
  capsule: { label: 'Capsule', unitLabel: 'Bottles / Strips', iconKey: 'capsule' },
  injection: { label: 'Needle / Injection', unitLabel: 'Vials / Pens', iconKey: 'injection' },
  syrup: { label: 'Syrup / Liquid', unitLabel: 'Bottles', iconKey: 'syrup' },
  inhaler: { label: 'Inhaler', unitLabel: 'Canisters', iconKey: 'inhaler' },
  cream: { label: 'Topical Cream', unitLabel: 'Tubes', iconKey: 'cream' },
  drops: { label: 'Eye / Ear Drops', unitLabel: 'Dropper Vials', iconKey: 'drops' },
  suppository: { label: 'Suppository', unitLabel: 'Packs', iconKey: 'suppository' },
};

export function resolveDrugKind(form: string, drugKinds?: DrugKind[]): { label: string; iconKey: DrugKindIconKey } {
  const found = drugKinds?.find((k) => k.id === form);
  if (found) return { label: found.label, iconKey: found.iconKey };
  const fallback = DEFAULT_DOSAGE_META[form];
  if (fallback) return { label: fallback.label, iconKey: fallback.iconKey };
  return { label: form.replace(/_/g, ' '), iconKey: 'box' };
}

/**
 * YOYA Pharmacy — Exact Cross + Golden Swoosh + Botanical Leaf emblem
 * matching the official YOYA Pharmacy brand artwork.
 */
export function YoyaPharmacyEmblem({
  className = 'w-12 h-12',
  variant = 'auto',
}: {
  className?: string;
  variant?: 'auto' | 'emerald' | 'white';
}) {
  const uid = React.useId();
  const crossGrad = `${uid}_cross`;
  const goldGrad = `${uid}_gold`;
  const leafDarkGrad = `${uid}_leafd`;
  const leafLightGrad = `${uid}_leafl`;

  return (
    <svg viewBox="0 0 96 96" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={crossGrad} x1="16" y1="8" x2="64" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={variant === 'white' ? '#FFFFFF' : '#0A7A4B'} />
          <stop offset="100%" stopColor={variant === 'white' ? '#E6F4ED' : '#064E31'} />
        </linearGradient>
        <linearGradient id={goldGrad} x1="20" y1="74" x2="78" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D68E18" />
          <stop offset="48%" stopColor="#F8C759" />
          <stop offset="100%" stopColor="#E19C24" />
        </linearGradient>
        <linearGradient id={leafDarkGrad} x1="36" y1="40" x2="76" y2="76" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#129947" />
          <stop offset="100%" stopColor="#075E34" />
        </linearGradient>
        <linearGradient id={leafLightGrad} x1="36" y1="26" x2="74" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#65E043" />
          <stop offset="100%" stopColor="#16A34A" />
        </linearGradient>
      </defs>

      {/* Rounded Pharmacy Cross positioned slightly upper-left */}
      <path
        d="M34 11C34 8.79 35.79 7 38 7H50C52.21 7 54 8.79 54 11V23H66C68.21 23 70 24.79 70 27V39C70 41.21 68.21 43 66 43H54V55C54 57.21 52.21 59 50 59H38C35.79 59 34 57.21 34 55V43H22C19.79 43 18 41.21 18 39V27C18 24.79 19.79 23 22 23H34V11Z"
        fill={variant === 'auto' ? undefined : `url(#${crossGrad})`}
        className={
          variant === 'auto'
            ? 'fill-[#086B43] dark:fill-[#F4FBF7]'
            : undefined
        }
      />

      {/* Sweeping Two-Tone Botanical Leaf (upper-left bright lime, lower-right deep emerald, midrib gap) */}
      <path
        d="M44.5 69.5C41.8 57.2 49.4 39.8 75.5 31.5C69.2 40.2 58.6 52.8 46.8 69.2C46 70.3 44.8 70.3 44.5 69.5Z"
        fill={`url(#${leafLightGrad})`}
      />
      <path
        d="M48.5 70.8C58.8 55.6 69.8 42.5 77.6 33.4C79.4 55.8 68.2 72.2 49.5 72.5C48.2 72.5 47.8 71.8 48.5 70.8Z"
        fill={`url(#${leafDarkGrad})`}
      />

      {/* Sweeping Golden Crescent Swoosh cutting diagonally beneath the cross & framing the leaf */}
      <path
        d="M21 59.5C29.5 76.2 49.2 76.8 61.5 66.2C47.8 79.4 26.8 76.4 23.2 57.2C21.6 48.8 29.8 39.4 45.2 31.8C57.6 25.8 69.5 23.5 78.2 26.8C68.2 21.8 54.5 23.5 41.2 30.2C24.5 38.6 15.8 49.5 21 59.5Z"
        fill={`url(#${goldGrad})`}
      />
    </svg>
  );
}

export const ApothecaEmblem = YoyaPharmacyEmblem;

/**
 * Custom geometric YOYA (leaf inside O, crossbar-free Lambda A) + PHARMACY wordmark
 * matching the official brand typography.
 */
export function YoyaWordmark({
  size = 'md',
  showTagline = false,
  tone = 'auto',
  customName,
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  tone?: 'auto' | 'light' | 'dark';
  customName?: string;
}) {
  const isCustomNonYoya =
    customName && customName.trim().length > 0 && !/yoya/i.test(customName);

  const letterClass =
    tone === 'light'
      ? 'fill-white'
      : tone === 'dark'
        ? 'fill-[#064E31]'
        : 'fill-[#064E31] dark:fill-white';

  const subTextClass =
    tone === 'light'
      ? 'text-[#F5C65D]'
      : tone === 'dark'
        ? 'text-[#064E31]'
        : 'text-[#064E31] dark:text-[#22C58B]';

  const ruleGradient =
    tone === 'light'
      ? 'from-transparent to-[#F5C65D]'
      : 'from-transparent to-[#0D6E52] dark:to-[#22C58B]';

  if (isCustomNonYoya) {
    return (
      <span className="font-display font-bold tracking-tight whitespace-nowrap truncate">
        {customName}
      </span>
    );
  }

  if (size === 'xs') {
    return (
      <span className="inline-flex items-center gap-2 whitespace-nowrap shrink-0">
        <svg viewBox="0 0 212 46" fill="none" className="h-4 w-auto" aria-label="YOYA">
          {/* Y */}
          <path d="M4 4H14.5L24 19.5L33.5 4H44L28.5 26.5V42H19.5V26.5L4 4Z" className={letterClass} />
          {/* O ring */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M76 3.5C64.95 3.5 56 12.23 56 23C56 33.77 64.95 42.5 76 42.5C87.05 42.5 96 33.77 96 23C96 12.23 87.05 3.5 76 3.5ZM76 11.2C69.37 11.2 64 16.48 64 23C64 29.52 69.37 34.8 76 34.8C82.63 34.8 88 29.52 88 23C88 16.48 82.63 11.2 76 11.2Z"
            className={letterClass}
          />
          {/* Leaf inside O */}
          <path d="M68.8 29.8C67.8 22.8 72.2 16.2 83.2 14.8C80.5 18.8 75.8 23.8 69.8 30.2C69.3 30.7 68.9 30.4 68.8 29.8Z" fill="#4ADE80" />
          <path d="M70.8 30.6C76.2 24.4 80.8 19.4 84 15.8C84.2 25.4 79 31.8 71.2 31.4C70.6 31.3 70.4 31 70.8 30.6Z" fill="#16A34A" />
          {/* Y */}
          <path d="M108 4H118.5L128 19.5L137.5 4H148L132.5 26.5V42H123.5V26.5L108 4Z" className={letterClass} />
          {/* Open chevron A */}
          <path d="M174.5 4H183.5L204 42H193.5L179 14.5L164.5 42H154L174.5 4Z" className={letterClass} />
        </svg>
        <span className={`text-[10px] font-bold tracking-[0.24em] uppercase ${subTextClass}`}>
          PHARMACY
        </span>
      </span>
    );
  }

  const svgHeight = size === 'lg' ? 'h-10' : size === 'md' ? 'h-8' : 'h-6';
  const subSize =
    size === 'lg'
      ? 'text-[11px] tracking-[0.36em]'
      : size === 'md'
        ? 'text-[10px] tracking-[0.3em]'
        : 'text-[9px] tracking-[0.24em]';

  return (
    <div className="inline-flex flex-col items-center select-none">
      <svg viewBox="0 0 212 46" fill="none" className={`${svgHeight} w-auto`} aria-label="YOYA Pharmacy">
        {/* Y */}
        <path d="M4 4H14.5L24 19.5L33.5 4H44L28.5 26.5V42H19.5V26.5L4 4Z" className={letterClass} />
        {/* O ring */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M76 3.5C64.95 3.5 56 12.23 56 23C56 33.77 64.95 42.5 76 42.5C87.05 42.5 96 33.77 96 23C96 12.23 87.05 3.5 76 3.5ZM76 11.2C69.37 11.2 64 16.48 64 23C64 29.52 69.37 34.8 76 34.8C82.63 34.8 88 29.52 88 23C88 16.48 82.63 11.2 76 11.2Z"
          className={letterClass}
        />
        {/* Leaf inside O */}
        <path
          d="M68.5 29.8C67.5 22.8 72.2 16.2 83.2 14.8C80.5 18.8 75.8 23.8 69.8 30.2C69.3 30.7 68.7 30.4 68.5 29.8Z"
          fill="#4ADE80"
        />
        <path
          d="M70.8 30.6C76.2 24.4 80.8 19.4 84 15.8C84.2 25.4 79 31.8 71.2 31.4C70.6 31.3 70.4 31 70.8 30.6Z"
          fill="#16A34A"
        />
        {/* Y */}
        <path d="M108 4H118.5L128 19.5L137.5 4H148L132.5 26.5V42H123.5V26.5L108 4Z" className={letterClass} />
        {/* Open chevron A (Lambda) */}
        <path d="M174.5 4H183.5L204 42H193.5L179 14.5L164.5 42H154L174.5 4Z" className={letterClass} />
      </svg>

      <div className="flex items-center gap-2 mt-1 w-full justify-center">
        <span className={`h-[1.5px] flex-1 max-w-[32px] bg-gradient-to-r ${ruleGradient}`} />
        <span className={`font-display font-bold uppercase ${subSize} ${subTextClass} leading-none`}>
          PHARMACY
        </span>
        <span className={`h-[1.5px] flex-1 max-w-[32px] bg-gradient-to-l ${ruleGradient}`} />
      </div>

      {showTagline && (
        <div className="mt-2 flex flex-col items-center">
          <p
            className={`text-xs italic font-medium tracking-wide ${
              tone === 'light'
                ? 'text-white/90'
                : 'text-[#064E31]/85 dark:text-white/80'
            }`}
          >
            Health Closer. Always.
          </p>
          <svg viewBox="0 0 120 8" fill="none" className="w-24 h-2 mt-0.5" aria-hidden="true">
            <path d="M6 6C38 1.5 82 1.5 114 5" stroke="#E5A93C" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}

export function MedicineIcon({
  form,
  drugKinds,
  className = 'w-5 h-5',
}: {
  form: string;
  drugKinds?: DrugKind[];
  className?: string;
}) {
  const { iconKey } = resolveDrugKind(form, drugKinds);

  switch (iconKey) {
    case 'tablet':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M7.5 16.5L16.5 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'capsule':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect
            x="4"
            y="8.5"
            width="16"
            height="7"
            rx="3.5"
            transform="rotate(-35 12 12)"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M9.5 8.8l5 6.4" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case 'injection':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M18 3l3 3M16 5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path
            d="M14.5 6.5l3 3-8.5 8.5-3-3 8.5-8.5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M6 18l-3 3M10.5 10.5l2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'syrup':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M9.5 3h5v3h-5z" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M9 6h6l2 3.5V19a2 2 0 01-2 2H9a2 2 0 01-2-2V9.5L9 6z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M9.5 13.5h5M12 11v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'inhaler':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M8 4h6v10l4 2v4H8a2 2 0 01-2-2V6a2 2 0 012-2z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M14 14H8" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case 'cream':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M6 4h12l-1.5 11.5h-9L6 4z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <rect x="9.5" y="15.5" width="5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case 'drops':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 3.5C12 3.5 6.5 10 6.5 14.2a5.5 5.5 0 0011 0C17.5 10 12 3.5 12 3.5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M10 14.8a2 2 0 002 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'suppository':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 4c3 0 5 4 5 9v5a2 2 0 01-2 2H9a2 2 0 01-2-2v-5c0-5 2-9 5-9z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
    case 'box':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="4" y="6" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 10v6M9 13h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
  }
}

export function DrugThumbnail({
  imageUrl,
  dosageForm,
  drugKinds,
  name,
  className = 'w-14 h-14',
}: {
  imageUrl?: string;
  dosageForm: string;
  drugKinds?: DrugKind[];
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const { label } = resolveDrugKind(dosageForm, drugKinds);

  if (imageUrl && !failed) {
    return (
      <div className={`relative overflow-hidden rounded-xl border border-[#DCE3DC] dark:border-[#1F3037] bg-[#EAEFEA] dark:bg-[#17242A] shrink-0 ${className}`}>
        <img
          src={imageUrl}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-xl border border-[#DCE3DC] dark:border-[#1F3037] shrink-0 bg-emerald-600/10 dark:bg-emerald-400/15 text-emerald-700 dark:text-emerald-300 ${className}`}
      aria-label={label}
    >
      <MedicineIcon form={dosageForm} drugKinds={drugKinds} className="w-1/2 h-1/2" />
    </div>
  );
}
