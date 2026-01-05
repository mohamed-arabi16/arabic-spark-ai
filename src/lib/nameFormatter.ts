/**
 * Properly format a display name with correct title casing
 * Handles Arabic names (no case change) and Latin names (title case)
 */
export function formatDisplayName(name: string | null | undefined): string {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      // Check if the word contains Arabic characters - don't change case
      if (/[\u0600-\u06FF]/.test(word)) return word;
      // Title case for Latin names (first letter uppercase, rest lowercase)
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();
}

/**
 * Get first name only from a full name, properly formatted
 */
export function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  const formatted = formatDisplayName(fullName);
  return formatted.split(' ')[0] || '';
}
