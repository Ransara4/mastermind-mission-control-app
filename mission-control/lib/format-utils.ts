import type { MCSettings } from "@/lib/mc-settings-types";

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Format a Date (or ISO string) according to the user's dateFormat setting.
 * Falls back to 'MMM DD, YYYY' if settings not provided.
 */
export function formatDate(
  date: Date | string | number,
  settings?: Pick<MCSettings, 'dateFormat'>
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);

  const fmt = settings?.dateFormat ?? 'MMM DD, YYYY';
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const monthShort = MONTHS_SHORT[d.getMonth()];

  switch (fmt) {
    case 'DD/MM/YYYY':   return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':   return `${year}-${month}-${day}`;
    default:             return `${monthShort} ${day}, ${year}`;
  }
}

/**
 * Format a Date according to the user's timeFormat setting.
 */
export function formatTime(
  date: Date | string | number,
  settings?: Pick<MCSettings, 'timeFormat'>
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);

  const fmt = settings?.timeFormat ?? '12h';
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');

  if (fmt === '24h') {
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  const h = hours % 12 || 12;
  return `${h}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`;
}

/**
 * Format a Date as date + time together.
 */
export function formatDateTime(
  date: Date | string | number,
  settings?: Pick<MCSettings, 'dateFormat' | 'timeFormat'>
): string {
  return `${formatDate(date, settings)}  ${formatTime(date, settings)}`;
}

/**
 * Format a number as currency.
 * If secondary currency is set and exchange rate > 0, optionally appends secondary.
 *
 * Usage:
 *   formatCurrency(49.99, settings)           // "$49.99"
 *   formatCurrency(49.99, settings, true)     // "$49.99 (Rp 799,840)"
 */
export function formatCurrency(
  amount: number,
  settings?: Pick<MCSettings, 'currencyPrimary' | 'currencySecondary' | 'currencyExchangeRate'>,
  showSecondary = false
): string {
  const primary = settings?.currencyPrimary ?? 'USD';
  const secondary = settings?.currencySecondary ?? 'IDR';
  const rate = settings?.currencyExchangeRate ?? 16000;

  const primaryFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: primary,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  if (!showSecondary || secondary === 'None' || secondary === primary || rate <= 0) {
    return primaryFormatted;
  }

  const secondaryAmount = amount * rate;
  const secondaryFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: secondary,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(secondaryAmount);

  return `${primaryFormatted} (${secondaryFormatted})`;
}

/**
 * Get pagination slice for a given page number and rowsPerPage setting.
 * Returns { start, end, totalPages }.
 *
 * Usage:
 *   const { start, end } = getPaginationSlice(currentPage, items.length, settings);
 *   const pageItems = items.slice(start, end);
 */
export function getPaginationSlice(
  page: number,
  totalItems: number,
  settings?: Pick<MCSettings, 'rowsPerPage'>
): { start: number; end: number; totalPages: number; perPage: number } {
  const perPage = settings?.rowsPerPage ?? 25;
  const totalPages = Math.ceil(totalItems / perPage);
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  return {
    start: safePage * perPage,
    end: Math.min(safePage * perPage + perPage, totalItems),
    totalPages,
    perPage,
  };
}
