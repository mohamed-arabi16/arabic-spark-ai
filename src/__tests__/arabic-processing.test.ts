/**
 * Unit tests for Arabic processing utilities
 * Tests dialect detection, script mode detection, normalization, and numeral conversion
 */

import { describe, it, expect } from 'vitest';
import {
  detectScriptMode,
  detectDialectWithConfidence,
  isArabizi,
  normalizeArabic,
  applyNumeralPolicySafe,
  buildDialectPolicyBlock,
  getDialectDisplayName,
} from '../lib/arabic-processing';

describe('detectScriptMode', () => {
  it('should detect pure Arabic text', () => {
    expect(detectScriptMode('مرحبا كيف حالك')).toBe('arabic');
    expect(detectScriptMode('السلام عليكم')).toBe('arabic');
  });

  it('should detect pure English text', () => {
    expect(detectScriptMode('Hello, how are you?')).toBe('english');
    expect(detectScriptMode('This is a test')).toBe('english');
  });

  it('should detect mixed Arabic and English', () => {
    // More than 30% Latin characters
    expect(detectScriptMode('مرحبا Hello كيف حالك how are you')).toBe('mixed');
  });

  it('should detect Arabizi (Arabic in Latin script)', () => {
    expect(detectScriptMode('7abibi keefak')).toBe('arabizi');
    expect(detectScriptMode('ma3 el salama')).toBe('arabizi');
    expect(detectScriptMode('yalla inshallah')).toBe('arabizi');
  });
});

describe('detectDialectWithConfidence', () => {
  it('should detect Egyptian Arabic with high confidence', () => {
    const result = detectDialectWithConfidence('إيه كده عايز ازيك');
    expect(result.dialect).toBe('egyptian');
    expect(result.confidence).toBe('high');
    expect(result.markers.length).toBeGreaterThanOrEqual(3);
  });

  it('should detect Gulf Arabic with high confidence', () => {
    const result = detectDialectWithConfidence('شلونك وش تبي هالحين');
    expect(result.dialect).toBe('gulf');
    expect(result.confidence).toBe('high');
  });

  it('should detect Levantine Arabic', () => {
    const result = detectDialectWithConfidence('كيفك شو بدي هلق');
    expect(result.dialect).toBe('levantine');
    expect(result.confidence).toBe('high');
  });

  it('should detect Maghrebi Arabic', () => {
    const result = detectDialectWithConfidence('واش راك كيفاش');
    expect(result.dialect).toBe('maghrebi');
    expect(result.confidence).toBe('high');
  });

  it('should return MSA with low confidence for formal Arabic', () => {
    const result = detectDialectWithConfidence('أهلاً وسهلاً بكم');
    expect(result.dialect).toBe('msa');
  });

  it('should handle text with few markers as low confidence', () => {
    const result = detectDialectWithConfidence('مش عارف');
    expect(result.confidence).toBe('low');
  });
});

describe('isArabizi', () => {
  it('should detect Arabizi patterns', () => {
    expect(isArabizi('7abibi')).toBe(true);
    expect(isArabizi('ma3')).toBe(true);
    expect(isArabizi('3arabi')).toBe(true);
    expect(isArabizi('inshallah')).toBe(true);
    expect(isArabizi('wallah')).toBe(true);
    expect(isArabizi('yalla')).toBe(true);
  });

  it('should not detect regular English as Arabizi', () => {
    expect(isArabizi('hello world')).toBe(false);
    expect(isArabizi('programming code')).toBe(false);
  });
});

describe('normalizeArabic', () => {
  it('should normalize Ya at word end by default', () => {
    const result = normalizeArabic('على');
    expect(result).toBe('علي');
  });

  it('should fix punctuation spacing', () => {
    const result = normalizeArabic('مرحبا،كيف');
    expect(result).toBe('مرحبا، كيف');
  });

  it('should remove space before punctuation', () => {
    const result = normalizeArabic('مرحبا ،');
    expect(result).toBe('مرحبا،');
  });

  it('should not normalize Hamza by default (risky)', () => {
    const result = normalizeArabic('أنا إنسان');
    expect(result).toBe('أنا إنسان'); // Should stay unchanged
  });

  it('should normalize Hamza when explicitly enabled', () => {
    const result = normalizeArabic('أنا', { normalizeHamza: true });
    expect(result).toBe('انا');
  });
});

describe('applyNumeralPolicySafe', () => {
  it('should convert Western numerals to Arabic', () => {
    const result = applyNumeralPolicySafe('لدي 5 تفاحات', 'arabic');
    expect(result).toBe('لدي ٥ تفاحات');
  });

  it('should convert Arabic numerals to Western', () => {
    const result = applyNumeralPolicySafe('لدي ٥ تفاحات', 'western');
    expect(result).toBe('لدي 5 تفاحات');
  });

  it('should NOT convert numerals in code blocks', () => {
    const code = '```javascript\nconst x = 123;\n```';
    const result = applyNumeralPolicySafe(code, 'arabic');
    expect(result).toContain('123'); // Should stay Western
  });

  it('should NOT convert numerals in URLs', () => {
    const text = 'زر الموقع https://example.com/page123';
    const result = applyNumeralPolicySafe(text, 'arabic');
    expect(result).toContain('page123'); // Should stay Western
  });

  it('should NOT convert numerals in UUIDs', () => {
    const text = 'المعرف: 550e8400-e29b-41d4-a716-446655440000';
    const result = applyNumeralPolicySafe(text, 'arabic');
    expect(result).toContain('550e8400'); // Should stay Western
  });

  it('should NOT convert numerals in model names', () => {
    const text = 'استخدم نموذج openai/gpt-4.1';
    const result = applyNumeralPolicySafe(text, 'arabic');
    expect(result).toContain('gpt-4.1'); // Should stay Western
  });

  it('should NOT convert numerals in IP addresses', () => {
    const text = 'الخادم: 192.168.1.1';
    const result = applyNumeralPolicySafe(text, 'arabic');
    expect(result).toContain('192.168.1.1'); // Should stay Western
  });

  it('should NOT convert numerals in inline code', () => {
    const text = 'استخدم الدالة `calculate(123)`';
    const result = applyNumeralPolicySafe(text, 'arabic');
    expect(result).toContain('123'); // Should stay Western
  });
});

describe('buildDialectPolicyBlock', () => {
  it('should build MSA policy block', () => {
    const policy = buildDialectPolicyBlock({ dialect: 'msa' });
    expect(policy).toContain('Modern Standard Arabic');
    expect(policy).toContain('Classical Arabic grammar');
  });

  it('should build Egyptian policy block', () => {
    const policy = buildDialectPolicyBlock({ dialect: 'egyptian' });
    expect(policy).toContain('Egyptian Arabic');
    expect(policy).toContain('مش');
  });

  it('should include formality setting', () => {
    const formalPolicy = buildDialectPolicyBlock({ dialect: 'msa', formality: 'formal' });
    expect(formalPolicy).toContain('Formal');

    const casualPolicy = buildDialectPolicyBlock({ dialect: 'msa', formality: 'casual' });
    expect(casualPolicy).toContain('Casual');
  });

  it('should include code-switching setting', () => {
    const arabicOnly = buildDialectPolicyBlock({ dialect: 'msa', codeSwitch: 'arabic_only' });
    expect(arabicOnly).toContain('Arabic only');

    const mixed = buildDialectPolicyBlock({ dialect: 'msa', codeSwitch: 'mixed' });
    expect(mixed).toContain('Natural code-switching');
  });

  it('should include numeral setting when Arabic', () => {
    const policy = buildDialectPolicyBlock({ dialect: 'msa', numeralMode: 'arabic' });
    expect(policy).toContain('Eastern Arabic numerals');
  });
});

describe('getDialectDisplayName', () => {
  it('should return English display names', () => {
    expect(getDialectDisplayName('msa', 'en')).toBe('Modern Standard Arabic');
    expect(getDialectDisplayName('egyptian', 'en')).toBe('Egyptian');
    expect(getDialectDisplayName('gulf', 'en')).toBe('Gulf');
    expect(getDialectDisplayName('levantine', 'en')).toBe('Levantine');
    expect(getDialectDisplayName('maghrebi', 'en')).toBe('Maghrebi');
    expect(getDialectDisplayName('auto', 'en')).toBe('Auto (Recommended)');
  });

  it('should return Arabic display names', () => {
    expect(getDialectDisplayName('msa', 'ar')).toBe('الفصحى');
    expect(getDialectDisplayName('egyptian', 'ar')).toBe('مصري');
    expect(getDialectDisplayName('gulf', 'ar')).toBe('خليجي');
    expect(getDialectDisplayName('levantine', 'ar')).toBe('شامي');
    expect(getDialectDisplayName('maghrebi', 'ar')).toBe('مغاربي');
    expect(getDialectDisplayName('auto', 'ar')).toBe('تلقائي (موصى به)');
  });
});
