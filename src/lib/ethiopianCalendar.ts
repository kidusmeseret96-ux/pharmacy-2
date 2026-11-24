import type { CalendarMode, Language } from '../types/pharmacy.ts';

export interface EthiopianDateParts {
  year: number;
  month: number; // 1..13
  day: number;   // 1..30 (or 1..5/6 in month 13)
  monthNameEn: string;
  monthNameAm: string;
  monthNameOm: string;
}

const EC_MONTHS_EN = [
  'Meskerem',
  'Tikimt',
  'Hidar',
  'Tahsas',
  'Tir',
  'Yekatit',
  'Megabit',
  'Miazia',
  'Ginbot',
  'Sene',
  'Hamle',
  'Nehase',
  'Pagume',
];

const EC_MONTHS_AM = [
  'መስከረም',
  'ጥቅምት',
  'ኅዳር',
  'ታኅሣሥ',
  'ጥር',
  'የካቲት',
  'መጋቢት',
  'ሚያዝያ',
  'ግንቦት',
  'ሰኔ',
  'ሐምሌ',
  'ነሐሴ',
  'ጳጉሜን',
];

const EC_MONTHS_OM = [
  'Fulbaana',
  'Onkoloolessa',
  'Sadaasa',
  'Muddee',
  'Amajjii',
  'Guraandhala',
  'Bitooteessa',
  'Elba',
  'Caamsaa',
  'Waxabajjii',
  'Adoolessa',
  'Hagayya',
  'Qaammee',
];

export const ETHIOPIAN_MONTHS = EC_MONTHS_EN.map((en, i) => ({
  month: i + 1,
  en,
  am: EC_MONTHS_AM[i],
  om: EC_MONTHS_OM[i],
}));

// Convert Gregorian year/month/day to Julian Day Number
function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

// Convert Julian Day Number to Gregorian Date (year, month, day)
function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  const f = jdn + 1401 + Math.floor((Math.floor((4 * jdn + 274277) / 146097) * 3) / 4) - 38;
  const e = 4 * f + 3;
  const g = Math.floor((e % 1461) / 4);
  const h = 5 * g + 2;
  const day = Math.floor((h % 153) / 5) + 1;
  const month = ((Math.floor(h / 153) + 2) % 12) + 1;
  const year = Math.floor(e / 1461) - 4716 + Math.floor((14 - month) / 12);
  return { year, month, day };
}

const ETHIOPIC_EPOCH = 1723856; // JDN of 1 Meskerem 1 E.C. (August 29, 8 AD Julian)

function jdnToEthiopian(jdn: number): EthiopianDateParts {
  const r = (jdn - ETHIOPIC_EPOCH) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year = 4 * Math.floor((jdn - ETHIOPIC_EPOCH) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  const idx = Math.min(Math.max(0, month - 1), 12);
  return {
    year,
    month,
    day,
    monthNameEn: EC_MONTHS_EN[idx],
    monthNameAm: EC_MONTHS_AM[idx],
    monthNameOm: EC_MONTHS_OM[idx],
  };
}

function ethiopianToJdn(year: number, month: number, day: number): number {
  return ETHIOPIC_EPOCH + 365 * (year - 1) + Math.floor(year / 4) + 30 * (month - 1) + day - 1;
}

export function toEthiopianDate(input: Date | string): EthiopianDateParts {
  let d: Date;
  if (typeof input === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
      const [y, m, day] = input.trim().split('-').map(Number);
      return jdnToEthiopian(gregorianToJdn(y, m, day));
    }
    d = new Date(input);
  } else {
    d = input;
  }
  if (Number.isNaN(d.getTime())) {
    d = new Date();
  }
  const jdn = gregorianToJdn(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return jdnToEthiopian(jdn);
}

export function ethiopianToGregorianIso(year: number, month: number, day: number): string {
  const clampedMonth = Math.min(Math.max(1, Math.floor(month)), 13);
  const maxDay = clampedMonth === 13 ? (year % 4 === 3 ? 6 : 5) : 30;
  const clampedDay = Math.min(Math.max(1, Math.floor(day)), maxDay);
  const jdn = ethiopianToJdn(year, clampedMonth, clampedDay);
  const gc = jdnToGregorian(jdn);
  return `${gc.year}-${String(gc.month).padStart(2, '0')}-${String(gc.day).padStart(2, '0')}`;
}

export function formatEthiopianShort(input: Date | string, lang: Language = 'en'): string {
  const ec = toEthiopianDate(input);
  const mName = lang === 'am' ? ec.monthNameAm : lang === 'om' ? ec.monthNameOm : ec.monthNameEn;
  const suffix = lang === 'am' ? 'ዓ.ም' : 'E.C.';
  return `${mName} ${ec.day}, ${ec.year} ${suffix}`;
}

export function getEffectiveNow(dateOffsetDays = 0): Date {
  return new Date(Date.now() + (Number(dateOffsetDays) || 0) * 24 * 60 * 60 * 1000);
}

export function formatClinicDate(
  input: Date | string,
  calendarMode: CalendarMode = 'both',
  lang: Language = 'en',
  includeTime = false
): string {
  const d = typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())
    ? new Date(`${input.trim()}T12:00:00`)
    : new Date(input);

  if (Number.isNaN(d.getTime())) return String(input);

  const gcStr = d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const ecStr = formatEthiopianShort(input, lang);
  const timePart = includeTime
    ? ` · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : '';

  if (calendarMode === 'ethiopian') return `${ecStr}${timePart}`;
  if (calendarMode === 'gregorian') return `${gcStr}${timePart}`;
  return `${ecStr} (${gcStr})${timePart}`;
}
