/**
 * Get current numeral preference from localStorage
 */
export function getNumeralMode(): 'western' | 'arabic' {
  if (typeof window === 'undefined') return 'western';
  return (localStorage.getItem('app_numerals') as 'western' | 'arabic') || 'western';
}

// Cache for Intl.NumberFormat instances to avoid recreating them on each call
// Creating Intl.NumberFormat is expensive, so we cache them by key
const numberFormatterCache = new Map<string, Intl.NumberFormat>();
const currencyFormatterCache = new Map<string, Intl.NumberFormat>();
const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

/**
 * Get or create a cached number formatter
 */
function getNumberFormatter(locale: string, decimals: number): Intl.NumberFormat {
  const key = `${locale}-${decimals}`;
  let formatter = numberFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    numberFormatterCache.set(key, formatter);
  }
  return formatter;
}

/**
 * Get or create a cached currency formatter
 */
function getCurrencyFormatter(locale: string): Intl.NumberFormat {
  let formatter = currencyFormatterCache.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
    currencyFormatterCache.set(locale, formatter);
  }
  return formatter;
}

/**
 * Get or create a cached date formatter
 */
function getDateFormatter(locale: string): Intl.DateTimeFormat {
  let formatter = dateFormatterCache.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    dateFormatterCache.set(locale, formatter);
  }
  return formatter;
}

/**
 * Format a number with locale-aware numerals based on user preference
 */
export function formatLocalizedNumber(value: number | string, locale: string, decimals: number = 4): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return value.toString();

  const numeralMode = getNumeralMode();
  const effectiveLocale = numeralMode === 'arabic' ? 'ar-EG' : 'en-US';

  try {
    return getNumberFormatter(effectiveLocale, decimals).format(num);
  } catch (e) {
    return num.toFixed(decimals);
  }
}

/**
 * Format currency with locale-aware numerals
 */
export function formatLocalizedCurrency(value: number, locale: string): string {
  const numeralMode = getNumeralMode();
  const effectiveLocale = numeralMode === 'arabic' ? 'ar-EG' : 'en-US';

  return getCurrencyFormatter(effectiveLocale).format(value);
}

/**
 * Format date with proper locale
 */
export function formatLocalizedDate(date: Date | string, locale: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const effectiveLocale = locale === 'ar' ? 'ar-EG' : 'en-US';
  return getDateFormatter(effectiveLocale).format(d);
}
