/**
 * Arabic Quality Layer - Pre/Post Processing Utilities
 * v1: Safe & Conservative - No meaning-destructive transforms
 */

// ============= TYPE DEFINITIONS =============

export type ScriptMode = 'arabic' | 'english' | 'mixed' | 'arabizi';
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

export interface DialectDetectionResult {
  dialect: DialectPreset | 'unknown';
  confidence: 'high' | 'medium' | 'low' | 'none';
  markers: string[];
}

export interface NormalizationOptions {
  // SAFE - enabled by default
  normalizeYaAtWordEnd?: boolean;
  fixPunctuation?: boolean;
  // RISKY - disabled by default
  normalizeHamza?: boolean;
  normalizeTaMarbuta?: boolean;
}

export interface ProcessingMetadata {
  processing_version: string;
  script_mode: ScriptMode;
  dialect_detected: DialectDetectionResult;
  dialect_used: DialectPreset | 'auto';
  numeral_mode: NumeralMode;
  formality: Formality;
  code_switch: CodeSwitchMode;
}

// ============= CONSTANTS =============

// Dialect detection patterns with multiple markers
const DIALECT_MARKERS: Record<DialectPreset, RegExp> = {
  msa: /(?:)/,  // MSA is detected by absence of dialect markers
  egyptian: /إيه|عايز|كده|ازيك|ازاي|ليه|مش|ده|دي|بتاع|طب|اوي|كمان/g,
  gulf: /شلونك|وش|هالحين|أبي|ابي|يالله|زين|حده|اشوفك|ابغى|كذا|وايد/g,
  levantine: /هلق|هلأ|شو|بدي|كيفك|هيك|منيح|بعدين|ليش|هاد|كتير/g,
  maghrebi: /واش|راك|بغيت|لاباس|كيداير|زوين|بزاف|ماشي|كيفاش/g,
};

// Arabizi patterns (Arabic written with Latin + numbers)
const ARABIZI_PATTERN = /\b(?:2|3|5|6|7|8|9)(?=[a-zA-Z])|(?<=[a-zA-Z])(?:2|3|5|6|7|8|9)\b|ma3|7abibi|3arabi|inshallah|wallah|yalla/i;

// Numeral maps
const WESTERN_TO_ARABIC_NUMERALS: Record<string, string> = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩',
};

const ARABIC_TO_WESTERN_NUMERALS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

// Patterns for protected content (never transform numerals in these)
const PROTECTED_PATTERNS = [
  /```[\s\S]*?```/g,           // Code fences
  /`[^`]+`/g,                  // Inline code
  /https?:\/\/\S+/g,           // URLs
  /\S+@\S+\.\S+/g,             // Emails
  /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, // UUIDs
  /[a-zA-Z][\w.-]*\/[\w.-]+/g, // Model names (e.g., openai/gpt-4o)
  /\b[a-zA-Z]+-?\d+\.?\d*\b/g, // Versions (gpt-4.1, claude-3.5)
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, // IP addresses
  /sk_[a-zA-Z0-9]+/g,          // API keys
  /pk_[a-zA-Z0-9]+/g,          // Publishable keys
];

// Safe defaults for normalization
const SAFE_DEFAULTS: NormalizationOptions = {
  normalizeYaAtWordEnd: true,
  fixPunctuation: true,
  normalizeHamza: false,      // DANGEROUS - off by default
  normalizeTaMarbuta: false,  // DANGEROUS - off by default
};

// ============= DETECTION FUNCTIONS =============

/**
 * Detect script/language mode (independent of dialect)
 */
export function detectScriptMode(text: string): ScriptMode {
  // Check for Arabizi first
  if (ARABIZI_PATTERN.test(text)) return 'arabizi';
  
  // Count character types
  const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  
  // Pure English (no Arabic)
  if (arabicChars === 0 && latinChars > 0) return 'english';
  
  // Significant code-switching (>30% Latin in Arabic text)
  if (arabicChars > 0 && latinChars > arabicChars * 0.3) return 'mixed';
  
  // Predominantly Arabic
  if (arabicChars > 0) return 'arabic';
  
  return 'english';
}

/**
 * Detect dialect with confidence score
 * Returns the dialect with most markers found
 */
export function detectDialectWithConfidence(text: string): DialectDetectionResult {
  const foundMarkers: Record<DialectPreset, string[]> = {
    msa: [],
    egyptian: [],
    gulf: [],
    levantine: [],
    maghrebi: [],
  };
  
  // Check each dialect's markers
  for (const [dialect, pattern] of Object.entries(DIALECT_MARKERS)) {
    if (dialect === 'msa') continue; // MSA detected by absence
    
    const matches = text.match(pattern);
    if (matches) {
      foundMarkers[dialect as DialectPreset] = [...new Set(matches)]; // Dedupe
    }
  }
  
  // Find dialect with most unique markers
  let topDialect: DialectPreset | 'unknown' = 'unknown';
  let maxMarkers = 0;
  
  for (const [dialect, markers] of Object.entries(foundMarkers)) {
    if (dialect === 'msa') continue;
    if (markers.length > maxMarkers) {
      maxMarkers = markers.length;
      topDialect = dialect as DialectPreset;
    }
  }
  
  // Determine confidence based on marker count
  let confidence: 'high' | 'medium' | 'low' | 'none' = 'none';
  if (maxMarkers >= 3) {
    confidence = 'high';
  } else if (maxMarkers === 2) {
    confidence = 'medium';
  } else if (maxMarkers === 1) {
    confidence = 'low';
  }
  
  // If no dialect markers found, it's likely MSA
  if (topDialect === 'unknown' && detectScriptMode(text) === 'arabic') {
    topDialect = 'msa';
    confidence = 'low'; // Not certain, just no colloquial markers
  }
  
  return {
    dialect: topDialect,
    confidence,
    markers: foundMarkers[topDialect as DialectPreset] || [],
  };
}

/**
 * Check if text contains Arabizi
 */
export function isArabizi(text: string): boolean {
  return ARABIZI_PATTERN.test(text);
}

// Legacy function - kept for backwards compatibility
export function detectArabicMode(text: string): ScriptMode {
  return detectScriptMode(text);
}

// Legacy function - kept for backwards compatibility  
export function detectDialect(text: string): DialectPreset | null {
  const result = detectDialectWithConfidence(text);
  return result.dialect === 'unknown' ? null : result.dialect;
}

// ============= NORMALIZATION =============

/**
 * Normalize Arabic orthography (conservative defaults)
 * Only applies safe transformations by default
 */
export function normalizeArabic(
  text: string, 
  options: NormalizationOptions = SAFE_DEFAULTS
): string {
  let result = text;
  
  // SAFE: Ya at word end (widely acceptable)
  if (options.normalizeYaAtWordEnd) {
    result = result.replace(/ى(?=\s|$|[،؛؟!؛])/g, 'ي');
  }
  
  // SAFE: Punctuation spacing
  if (options.fixPunctuation) {
    // Add space after Arabic punctuation if missing (but not before newlines)
    result = result.replace(/([،؛؟!])(?=[^\s\n])/g, '$1 ');
    // Remove space before punctuation
    result = result.replace(/\s+([،؛؟!])/g, '$1');
  }
  
  // RISKY: Only if explicitly enabled
  if (options.normalizeHamza) {
    // Only at word start, and only أ/إ → ا (preserve آ)
    result = result.replace(/(?<=^|\s)[أإ]/gm, 'ا');
  }
  
  if (options.normalizeTaMarbuta) {
    result = result.replace(/ة(?=\s|$)/g, 'ه');
  }
  
  return result;
}

// ============= NUMERAL CONVERSION (PROTECTED) =============

interface TextSpan {
  start: number;
  end: number;
}

/**
 * Get spans of text that should not be transformed
 */
function getProtectedSpans(text: string): TextSpan[] {
  const spans: TextSpan[] = [];
  
  for (const pattern of PROTECTED_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }
  
  // Sort and merge overlapping spans
  spans.sort((a, b) => a.start - b.start);
  const merged: TextSpan[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span.start <= last.end) {
      last.end = Math.max(last.end, span.end);
    } else {
      merged.push({ ...span });
    }
  }
  
  return merged;
}

/**
 * Apply numeral policy with protection for code/URLs/IDs
 * Only transforms numerals in prose text
 */
export function applyNumeralPolicySafe(text: string, mode: NumeralMode): string {
  if (mode === 'western') {
    // Convert Arabic numerals to Western (simple, no protection needed)
    return text.replace(/[٠-٩]/g, (d) => ARABIC_TO_WESTERN_NUMERALS[d] || d);
  }
  
  // For Arabic numerals, protect code/URLs/IDs
  const protectedSpans = getProtectedSpans(text);
  
  // If no protected spans, simple replacement
  if (protectedSpans.length === 0) {
    return text.replace(/[0-9]/g, (d) => WESTERN_TO_ARABIC_NUMERALS[d] || d);
  }
  
  // Build result by processing unprotected segments only
  let result = '';
  let lastEnd = 0;
  
  for (const span of protectedSpans) {
    // Process unprotected text before this span
    const unprotectedPart = text.slice(lastEnd, span.start);
    result += unprotectedPart.replace(/[0-9]/g, (d) => WESTERN_TO_ARABIC_NUMERALS[d] || d);
    
    // Add protected text unchanged
    result += text.slice(span.start, span.end);
    lastEnd = span.end;
  }
  
  // Process remaining text after last protected span
  const remaining = text.slice(lastEnd);
  result += remaining.replace(/[0-9]/g, (d) => WESTERN_TO_ARABIC_NUMERALS[d] || d);
  
  return result;
}

// Legacy function - kept but now uses safe version
export function applyNumeralPolicy(text: string, mode: NumeralMode): string {
  return applyNumeralPolicySafe(text, mode);
}

// ============= POLICY BLOCK BUILDING =============

/**
 * Build dialect policy block for system prompt injection
 * Uses structured rules instead of example expressions
 */
export function buildDialectPolicyBlock(options: DialectOptions): string {
  const dialectRules: Record<DialectPreset, string> = {
    msa: `VARIETY: Modern Standard Arabic (الفصحى)
GRAMMAR: Classical Arabic grammar, case endings optional
VOCABULARY: Formal register, avoid colloquialisms`,
    
    egyptian: `VARIETY: Egyptian Arabic
GRAMMAR: Egyptian verb conjugations, negation with مش
VOCABULARY: Egyptian vocabulary (عايز, كده, ازاي)`,
    
    gulf: `VARIETY: Gulf Arabic (UAE/Saudi/Qatar)
GRAMMAR: Gulf verb forms, ابي/ابغى for "want"
VOCABULARY: Gulf vocabulary (شلونك, هالحين, وايد)`,
    
    levantine: `VARIETY: Levantine Arabic (Syrian/Lebanese/Palestinian)
GRAMMAR: Levantine conjugations, بدي for "want"
VOCABULARY: Levantine vocabulary (كيفك, هلق, كتير)`,
    
    maghrebi: `VARIETY: Maghrebi Arabic (Moroccan/Algerian/Tunisian)
GRAMMAR: Maghrebi verb forms, كاين for existence
VOCABULARY: Maghrebi vocabulary (واش, لاباس, بزاف)`,
  };

  let policy = dialectRules[options.dialect] || dialectRules.msa;
  
  // Formality as a rule
  policy += `\nTONE: ${
    options.formality === 'formal' 
      ? 'Formal, respectful. Complete sentences, proper grammar.' 
      : 'Casual, conversational. Natural flow, friendly.'
  }`;
  
  // Code-switch as a rule
  policy += `\nCODE-SWITCHING: ${
    options.codeSwitch === 'arabic_only' 
      ? 'Arabic only. Translate technical terms if possible.' 
      : 'Natural code-switching allowed for technical terms.'
  }`;
  
  // Numerals as a rule
  if (options.numeralMode === 'arabic') {
    policy += `\nNUMERALS: Use Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩)`;
  }
  
  return policy;
}

// ============= DISPLAY UTILITIES =============

/**
 * Get dialect display name
 */
export function getDialectDisplayName(dialect: DialectPreset | 'auto', language: 'en' | 'ar' = 'en'): string {
  const names: Record<DialectPreset | 'auto', { en: string; ar: string }> = {
    auto: { en: 'Auto (Recommended)', ar: 'تلقائي (موصى به)' },
    msa: { en: 'Modern Standard Arabic', ar: 'الفصحى' },
    egyptian: { en: 'Egyptian', ar: 'مصري' },
    gulf: { en: 'Gulf', ar: 'خليجي' },
    levantine: { en: 'Levantine', ar: 'شامي' },
    maghrebi: { en: 'Maghrebi', ar: 'مغاربي' },
  };
  
  return names[dialect]?.[language] || dialect;
}

// ============= RENDER-TIME UTILITIES (UI ONLY) =============

/**
 * For render-time bidi isolation - do NOT use on stored text
 * This is called only in UI components, not backend
 */
export function renderTextWithBidiClass(text: string): string {
  // This should be used with CSS class .bidi-isolate
  // The actual isolation happens via CSS unicode-bidi: isolate
  return text;
}

// NOTE: The old applyBidiIsolation function that mutated text with Unicode
// isolates has been removed. Use CSS-based isolation instead:
// .bidi-isolate { unicode-bidi: isolate; }
