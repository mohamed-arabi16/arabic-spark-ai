import { cn } from './utils';

/**
 * Wrap LTR content (model IDs, currencies, dates, tokens) with bidi isolation
 * to prevent direction issues within RTL context
 */
export function LTR({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span dir="ltr" className={cn("inline-block unicode-bidi-isolate", className)}>
      {children}
    </span>
  );
}

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
export function formatNumber(value: number, locale: string = 'en'): string {
  const numeralMode = getNumeralMode();
  // If numerals are set to 'eastern' (Arabic-Indic), use ar-EG locale for numerals
  const effectiveLocale = numeralMode === 'arabic' ? 'ar-EG' : 'en-US';
  
  return new Intl.NumberFormat(effectiveLocale, {
    useGrouping: true,
  }).format(value);
}

/**
 * Format currency with proper isolation and locale-aware numerals
 */
export function formatCurrency(value: number, locale: string = 'en'): string {
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
export function formatDate(date: Date | string, locale: string = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Use the UI locale for date formatting
  return d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format tokens/large numbers with proper grouping
 */
export function formatTokens(value: number, locale: string = 'en'): string {
  return formatNumber(value, locale);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, locale: string = 'en'): string {
  const numeralMode = getNumeralMode();
  const effectiveLocale = numeralMode === 'arabic' ? 'ar-EG' : 'en-US';
  
  return new Intl.NumberFormat(effectiveLocale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value / 100);
}
