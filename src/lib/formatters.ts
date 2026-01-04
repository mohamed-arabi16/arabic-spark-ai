export function formatLocalizedNumber(value: number | string, locale: string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return value.toString();

  try {
    // If locale is Arabic, use Arabic-Indic numerals?
    // User preference might be needed here, but standard 'ar-EG' uses Eastern Arabic numerals often.
    // 'ar-SA' uses them too.
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(num);
  } catch (e) {
    return num.toFixed(4);
  }
}
