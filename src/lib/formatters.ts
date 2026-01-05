/**
 * Get current numeral preference from localStorage
 */
export function getNumeralMode(): 'western' | 'arabic' {
  if (typeof window === 'undefined') return 'western';
  return (localStorage.getItem('app_numerals') as 'western' | 'arabic') || 'western';
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
    return new Intl.NumberFormat(effectiveLocale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
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

  return new Intl.NumberFormat(effectiveLocale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

/**
 * Format date with proper locale
 */
export function formatLocalizedDate(date: Date | string, locale: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
