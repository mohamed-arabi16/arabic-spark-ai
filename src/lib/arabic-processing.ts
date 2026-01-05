/**
 * Arabic Quality Layer - Pre/Post Processing Utilities
 * Handles dialect detection, normalization, and formatting
 */

export type ArabicMode = 'msa' | 'simple' | 'dialect' | 'mixed' | 'arabizi' | 'english';
export type DialectPreset = 'msa' | 'egyptian' | 'gulf' | 'levantine' | 'maghrebi';
export type Formality = 'formal' | 'casual';
export type CodeSwitchMode = 'arabic_only' | 'mixed';
export type NumeralMode = 'western' | 'arabic';

export interface DialectOptions {
  dialect: DialectPreset;
  formality?: Formality;
  codeSwitch?: CodeSwitchMode;
  numeralMode?: NumeralMode;
}

export interface NormalizationOptions {
  normalizeHamza?: boolean;
  normalizeYa?: boolean;
  normalizeTaMarbuta?: boolean;
  fixPunctuation?: boolean;
}

// Dialect detection patterns
const DIALECT_MARKERS = {
  egyptian: /إيه|عايز|كده|ازيك|ليه|مش|ده|دي|بتاع|طب/,
  gulf: /شلونك|وش|هالحين|أبي|يالله|زين|حده|اشوفك/,
  levantine: /هلق|شو|بدي|كيفك|هيك|منيح|بعدين|هلأ/,
  maghrebi: /واش|راك|بغيت|لاباس|كيداير|زوين/,
};

// Arabizi patterns (Arabic written with Latin + numbers)
const ARABIZI_PATTERN = /\b(?:2|3|5|6|7|8|9)(?=[a-zA-Z])|(?<=[a-zA-Z])(?:2|3|5|6|7|8|9)\b|ma3|7abibi|3arabi|kif|shukran/i;

/**
 * Detect the Arabic mode of the input text
 */
export function detectArabicMode(text: string): ArabicMode {
  // Check for Arabizi first
  if (ARABIZI_PATTERN.test(text)) return 'arabizi';
  
  // Count character types
  const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  
  // Pure English
  if (arabicChars === 0 && latinChars > 0) return 'english';
  
  // Mixed content
  if (latinChars > arabicChars * 0.3 && arabicChars > 0) return 'mixed';
  
  // Check for dialect markers
  for (const [dialect, pattern] of Object.entries(DIALECT_MARKERS)) {
    if (pattern.test(text)) return 'dialect';
  }
  
  // Default to MSA if mostly Arabic without dialect markers
  if (arabicChars > 0) return 'msa';
  
  return 'english';
}

/**
 * Detect specific dialect from text
 */
export function detectDialect(text: string): DialectPreset | null {
  for (const [dialect, pattern] of Object.entries(DIALECT_MARKERS)) {
    if (pattern.test(text)) return dialect as DialectPreset;
  }
  return null;
}

/**
 * Normalize Arabic orthography (configurable)
 */
export function normalizeArabic(text: string, options: NormalizationOptions = {}): string {
  let result = text;
  
  if (options.normalizeHamza) {
    result = result.replace(/[أإآ]/g, 'ا');
  }
  
  if (options.normalizeYa) {
    result = result.replace(/ى(?=\s|$)/g, 'ي');
  }
  
  if (options.normalizeTaMarbuta) {
    // Context-aware: only at word end
    result = result.replace(/ة(?=\s|$)/g, 'ه');
  }
  
  if (options.fixPunctuation) {
    // Add space after Arabic punctuation if missing
    result = result.replace(/([،؛؟!])(?=\S)/g, '$1 ');
    // Remove space before punctuation
    result = result.replace(/\s+([،؛؟!])/g, '$1');
  }
  
  return result;
}

/**
 * Convert Arabizi to Arabic (simplified)
 */
export function convertArabizi(text: string): string {
  const map: Record<string, string> = {
    '2': 'ء',
    '3': 'ع',
    '5': 'خ',
    '6': 'ط',
    '7': 'ح',
    '8': 'غ',
    '9': 'ق',
  };
  
  // Basic number replacement
  let result = text.replace(/[2356789]/g, (m) => map[m] || m);
  
  // Common word replacements
  const commonWords: Record<string, string> = {
    'kif': 'كيف',
    'shu': 'شو',
    'marhaba': 'مرحبا',
    'shukran': 'شكراً',
    'habibi': 'حبيبي',
    'yalla': 'يالله',
    'ana': 'أنا',
    'inta': 'أنت',
  };
  
  for (const [latin, arabic] of Object.entries(commonWords)) {
    result = result.replace(new RegExp(`\\b${latin}\\b`, 'gi'), arabic);
  }
  
  return result;
}

/**
 * Build dialect policy block for system prompt injection
 */
export function buildDialectPolicyBlock(options: DialectOptions): string {
  const dialectBlocks: Record<DialectPreset, string> = {
    msa: `LANGUAGE: Use Modern Standard Arabic (الفصحى). Be formal, use classical grammar.
Examples: "كيف حالك؟" "أريد هذا" "ماذا حدث؟"`,
    egyptian: `LANGUAGE: Use Egyptian Arabic (مصري). Use expressions like إيه، كده، ازيك، عايز. Be conversational.
Examples: "ازيك؟ عامل ايه؟" "أنا عايز ده" "ايه اللي حصل؟"`,
    gulf: `LANGUAGE: Use Gulf Arabic (خليجي). Use expressions like شلونك، وش، هالحين، أبي. Be friendly.
Examples: "شلونك؟ عساك طيب" "أبي هذا" "وش صار؟"`,
    levantine: `LANGUAGE: Use Levantine Arabic (شامي). Use expressions like كيفك، هلق، شو، بدي. Be warm.
Examples: "كيفك؟" "بدي هاد" "شو صار؟"`,
    maghrebi: `LANGUAGE: Use Maghrebi Arabic (مغاربي). Use Moroccan/Algerian expressions. Be direct.
Examples: "واش راك؟ لاباس؟" "بغيت هذا" "واش؟"`,
  };
  
  let policy = dialectBlocks[options.dialect] || dialectBlocks.msa;
  
  // Add formality
  if (options.formality === 'formal') {
    policy += `\nTONE: Formal and respectful. Use complete sentences and proper grammar.`;
  } else {
    policy += `\nTONE: Casual and friendly. Use natural conversational style.`;
  }
  
  // Add code-switch preference
  if (options.codeSwitch === 'arabic_only') {
    policy += `\nCODE-SWITCH: Respond in Arabic only. Avoid English unless technical terms absolutely require it.`;
  } else {
    policy += `\nCODE-SWITCH: Mixed language allowed. Use technical terms in English when natural.`;
  }
  
  // Add numeral mode
  if (options.numeralMode === 'arabic') {
    policy += `\nNUMERALS: Use Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) for all numbers.`;
  }
  
  return policy;
}

// Western to Arabic numeral map
const WESTERN_TO_ARABIC_NUMERALS: Record<string, string> = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩',
};

const ARABIC_TO_WESTERN_NUMERALS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

/**
 * Apply numeral policy to text
 */
export function applyNumeralPolicy(text: string, mode: NumeralMode): string {
  if (mode === 'arabic') {
    return text.replace(/[0-9]/g, (d) => WESTERN_TO_ARABIC_NUMERALS[d] || d);
  } else {
    return text.replace(/[٠-٩]/g, (d) => ARABIC_TO_WESTERN_NUMERALS[d] || d);
  }
}

/**
 * Apply bidi isolation for mixed-script content
 * Wraps LTR sequences with Unicode bidi isolates
 */
export function applyBidiIsolation(text: string): string {
  const LRI = '\u2066'; // Left-to-Right Isolate
  const PDI = '\u2069'; // Pop Directional Isolate
  
  return text
    // Code blocks
    .replace(/`[^`]+`/g, (m) => `${LRI}${m}${PDI}`)
    // URLs
    .replace(/https?:\/\/\S+/g, (m) => `${LRI}${m}${PDI}`)
    // Email addresses
    .replace(/\S+@\S+\.\S+/g, (m) => `${LRI}${m}${PDI}`)
    // Technical terms (camelCase, snake_case, kebab-case)
    .replace(/\b[a-zA-Z][a-zA-Z0-9]*(?:[-_][a-zA-Z0-9]+)+\b/g, (m) => `${LRI}${m}${PDI}`)
    .replace(/\b[a-z]+[A-Z][a-zA-Z0-9]*\b/g, (m) => `${LRI}${m}${PDI}`);
}

/**
 * Get dialect display name
 */
export function getDialectDisplayName(dialect: DialectPreset, language: 'en' | 'ar' = 'en'): string {
  const names: Record<DialectPreset, { en: string; ar: string }> = {
    msa: { en: 'Modern Standard Arabic', ar: 'الفصحى' },
    egyptian: { en: 'Egyptian', ar: 'مصري' },
    gulf: { en: 'Gulf', ar: 'خليجي' },
    levantine: { en: 'Levantine', ar: 'شامي' },
    maghrebi: { en: 'Maghrebi', ar: 'مغاربي' },
  };
  
  return names[dialect]?.[language] || dialect;
}
