/**
 * Unit tests for formatters utilities
 * Tests locale-aware number formatting with caching optimization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getNumeralMode,
  formatLocalizedNumber,
  formatLocalizedCurrency,
  formatLocalizedDate,
} from '../lib/formatters';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('getNumeralMode', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should return western by default', () => {
    expect(getNumeralMode()).toBe('western');
  });

  it('should return arabic when set in localStorage', () => {
    localStorageMock.getItem.mockReturnValue('arabic');
    expect(getNumeralMode()).toBe('arabic');
  });

  it('should return western when localStorage returns null', () => {
    localStorageMock.getItem.mockReturnValue(null);
    expect(getNumeralMode()).toBe('western');
  });
});

describe('formatLocalizedNumber', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('western');
  });

  it('should format numbers with default 4 decimals', () => {
    const result = formatLocalizedNumber(123.456789, 'en');
    expect(result).toBe('123.4568');
  });

  it('should format numbers with custom decimals', () => {
    const result = formatLocalizedNumber(123.456789, 'en', 2);
    expect(result).toBe('123.46');
  });

  it('should handle string input', () => {
    const result = formatLocalizedNumber('123.456', 'en', 2);
    expect(result).toBe('123.46');
  });

  it('should return original string for invalid numbers', () => {
    const result = formatLocalizedNumber('not-a-number', 'en');
    expect(result).toBe('not-a-number');
  });

  it('should handle zero decimals', () => {
    const result = formatLocalizedNumber(123.456, 'en', 0);
    expect(result).toBe('123');
  });

  it('should format with Arabic numerals when mode is arabic', () => {
    localStorageMock.getItem.mockReturnValue('arabic');
    const result = formatLocalizedNumber(123, 'ar', 0);
    // Arabic-Egyptian locale uses Eastern Arabic numerals
    expect(result).toBe('١٢٣');
  });
});

describe('formatLocalizedCurrency', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('western');
  });

  it('should format currency with USD', () => {
    const result = formatLocalizedCurrency(123.45, 'en');
    expect(result).toContain('123.45');
    expect(result).toContain('$');
  });

  it('should format currency with Arabic numerals when mode is arabic', () => {
    localStorageMock.getItem.mockReturnValue('arabic');
    const result = formatLocalizedCurrency(123.45, 'ar');
    // Should contain Arabic numerals
    expect(result).toMatch(/[٠-٩]/);
  });
});

describe('formatLocalizedDate', () => {
  it('should format date for English locale', () => {
    const date = new Date('2024-06-15');
    const result = formatLocalizedDate(date, 'en');
    expect(result).toContain('Jun');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('should format date for Arabic locale', () => {
    const date = new Date('2024-06-15');
    const result = formatLocalizedDate(date, 'ar');
    // Arabic locale should format differently
    expect(result).toBeTruthy();
  });

  it('should handle string date input', () => {
    const result = formatLocalizedDate('2024-06-15', 'en');
    expect(result).toContain('Jun');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });
});

describe('Formatter Caching Performance', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('western');
  });

  it('should efficiently format multiple numbers (caching test)', () => {
    // This test verifies that multiple calls don't significantly slow down
    // due to formatter recreation - the caching should make this fast
    const start = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      formatLocalizedNumber(i * 1.5, 'en', 2);
    }
    
    const duration = performance.now() - start;
    
    // Should be very fast with caching (< 100ms for 1000 calls)
    expect(duration).toBeLessThan(100);
  });

  it('should efficiently format multiple currencies (caching test)', () => {
    const start = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      formatLocalizedCurrency(i * 1.5, 'en');
    }
    
    const duration = performance.now() - start;
    
    // Should be very fast with caching
    expect(duration).toBeLessThan(100);
  });

  it('should efficiently format multiple dates (caching test)', () => {
    const start = performance.now();
    const date = new Date('2024-06-15');
    
    for (let i = 0; i < 1000; i++) {
      formatLocalizedDate(date, 'en');
    }
    
    const duration = performance.now() - start;
    
    // Should be very fast with caching
    expect(duration).toBeLessThan(100);
  });
});
