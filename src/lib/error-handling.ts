/**
 * Enhanced error handling utilities for production
 * Provides standardized error parsing, user-friendly messages, and error reporting
 */

import { toast } from 'sonner';
import i18n from '@/i18n';

// Error codes that the backend can return
export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_INPUT'
  | 'SERVER_ERROR'
  | 'DAILY_BUDGET_EXCEEDED'
  | 'CREDIT_LIMIT_EXCEEDED'
  | 'PROJECT_BUDGET_EXCEEDED'
  | 'TRIAL_LIMIT_REACHED'
  | 'NO_API_KEYS'
  | 'ALL_PROVIDERS_FAILED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface ApiError {
  error: string;
  error_code: ErrorCode;
  details?: Record<string, unknown>;
  message_ar?: string;
  message_en?: string;
}

export interface ParsedError {
  code: ErrorCode;
  message: string;
  messageAr: string;
  messageEn: string;
  httpStatus?: number;
  details?: Record<string, unknown>;
  isRetryable: boolean;
  action?: 'signup' | 'upgrade' | 'wait' | 'contact_support';
}

// Bilingual error messages for all error codes
const ERROR_MESSAGES: Record<ErrorCode, { en: string; ar: string }> = {
  UNAUTHORIZED: {
    en: 'Please sign in to continue.',
    ar: 'يرجى تسجيل الدخول للمتابعة.',
  },
  RATE_LIMIT_EXCEEDED: {
    en: 'Too many requests. Please wait a moment and try again.',
    ar: 'طلبات كثيرة جداً. يرجى الانتظار قليلاً والمحاولة مرة أخرى.',
  },
  INVALID_INPUT: {
    en: 'Invalid input. Please check your data and try again.',
    ar: 'إدخال غير صالح. يرجى التحقق من البيانات والمحاولة مرة أخرى.',
  },
  SERVER_ERROR: {
    en: 'Something went wrong on our end. Please try again later.',
    ar: 'حدث خطأ من جانبنا. يرجى المحاولة لاحقاً.',
  },
  DAILY_BUDGET_EXCEEDED: {
    en: 'You\'ve reached your daily usage limit. Upgrade or try again tomorrow.',
    ar: 'لقد وصلت إلى حد الاستخدام اليومي. قم بالترقية أو حاول غداً.',
  },
  CREDIT_LIMIT_EXCEEDED: {
    en: 'Your credit limit has been reached. Please add credits to continue.',
    ar: 'تم الوصول إلى حد الائتمان. يرجى إضافة رصيد للمتابعة.',
  },
  PROJECT_BUDGET_EXCEEDED: {
    en: 'This project\'s budget has been exceeded.',
    ar: 'تم تجاوز ميزانية هذا المشروع.',
  },
  TRIAL_LIMIT_REACHED: {
    en: 'Your free trial has ended. Sign up to continue using all features.',
    ar: 'انتهت الفترة التجريبية المجانية. سجل للمتابعة.',
  },
  NO_API_KEYS: {
    en: 'AI service is not configured. Please contact support.',
    ar: 'خدمة الذكاء الاصطناعي غير مُعدة. يرجى التواصل مع الدعم.',
  },
  ALL_PROVIDERS_FAILED: {
    en: 'AI services are temporarily unavailable. Please try again later.',
    ar: 'خدمات الذكاء الاصطناعي غير متاحة مؤقتاً. يرجى المحاولة لاحقاً.',
  },
  NETWORK_ERROR: {
    en: 'Network error. Please check your internet connection.',
    ar: 'خطأ في الشبكة. يرجى التحقق من اتصالك بالإنترنت.',
  },
  TIMEOUT: {
    en: 'Request timed out. Please try again.',
    ar: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.',
  },
  UNKNOWN: {
    en: 'An unexpected error occurred. Please try again.',
    ar: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
  },
};

// Which errors can be retried
const RETRYABLE_ERRORS: ErrorCode[] = [
  'RATE_LIMIT_EXCEEDED',
  'SERVER_ERROR',
  'ALL_PROVIDERS_FAILED',
  'NETWORK_ERROR',
  'TIMEOUT',
];

// Suggested actions for errors
const ERROR_ACTIONS: Partial<Record<ErrorCode, 'signup' | 'upgrade' | 'wait' | 'contact_support'>> = {
  TRIAL_LIMIT_REACHED: 'signup',
  DAILY_BUDGET_EXCEEDED: 'upgrade',
  CREDIT_LIMIT_EXCEEDED: 'upgrade',
  RATE_LIMIT_EXCEEDED: 'wait',
  NO_API_KEYS: 'contact_support',
};

/**
 * Parse an API error response into a standardized format
 */
export function parseApiError(error: unknown, httpStatus?: number): ParsedError {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message: getLocalizedMessage('NETWORK_ERROR'),
      messageEn: ERROR_MESSAGES.NETWORK_ERROR.en,
      messageAr: ERROR_MESSAGES.NETWORK_ERROR.ar,
      isRetryable: true,
    };
  }

  // Timeout errors
  if (error instanceof Error && error.name === 'AbortError') {
    return {
      code: 'TIMEOUT',
      message: getLocalizedMessage('TIMEOUT'),
      messageEn: ERROR_MESSAGES.TIMEOUT.en,
      messageAr: ERROR_MESSAGES.TIMEOUT.ar,
      isRetryable: true,
    };
  }

  // API error response
  if (typeof error === 'object' && error !== null) {
    const apiError = error as Partial<ApiError>;
    const code = (apiError.error_code as ErrorCode) || 'UNKNOWN';
    
    return {
      code,
      message: getLocalizedMessage(code, apiError.message_en, apiError.message_ar),
      messageEn: apiError.message_en || ERROR_MESSAGES[code]?.en || ERROR_MESSAGES.UNKNOWN.en,
      messageAr: apiError.message_ar || ERROR_MESSAGES[code]?.ar || ERROR_MESSAGES.UNKNOWN.ar,
      httpStatus,
      details: apiError.details,
      isRetryable: RETRYABLE_ERRORS.includes(code),
      action: ERROR_ACTIONS[code],
    };
  }

  // String error
  if (typeof error === 'string') {
    return {
      code: 'UNKNOWN',
      message: error,
      messageEn: error,
      messageAr: error,
      httpStatus,
      isRetryable: false,
    };
  }

  // Unknown error
  return {
    code: 'UNKNOWN',
    message: getLocalizedMessage('UNKNOWN'),
    messageEn: ERROR_MESSAGES.UNKNOWN.en,
    messageAr: ERROR_MESSAGES.UNKNOWN.ar,
    httpStatus,
    isRetryable: false,
  };
}

/**
 * Get localized error message based on current language
 */
function getLocalizedMessage(code: ErrorCode, customEn?: string, customAr?: string): string {
  const lang = i18n.language || 'en';
  const messages = ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN;
  
  if (lang === 'ar') {
    return customAr || messages.ar;
  }
  return customEn || messages.en;
}

/**
 * Show error toast with appropriate styling
 */
export function showErrorToast(error: ParsedError, options?: {
  showAction?: boolean;
  onAction?: () => void;
}): void {
  const toastOptions: Parameters<typeof toast.error>[1] = {};

  if (options?.showAction && error.action) {
    const actionLabels: Record<string, { en: string; ar: string }> = {
      signup: { en: 'Sign Up', ar: 'التسجيل' },
      upgrade: { en: 'Upgrade', ar: 'الترقية' },
      wait: { en: 'Retry', ar: 'إعادة المحاولة' },
      contact_support: { en: 'Contact Support', ar: 'التواصل مع الدعم' },
    };

    const label = actionLabels[error.action];
    if (label) {
      toastOptions.action = {
        label: i18n.language === 'ar' ? label.ar : label.en,
        onClick: options.onAction || (() => {}),
      };
    }
  }

  toast.error(error.message, toastOptions);
}

/**
 * Handle API response and parse errors
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json();
  }

  let errorData: unknown;
  try {
    errorData = await response.json();
  } catch {
    errorData = { error: response.statusText };
  }

  const parsed = parseApiError(errorData, response.status);
  throw parsed;
}

/**
 * Log error for debugging (in development) or reporting (in production)
 */
export function logError(error: ParsedError, context?: Record<string, unknown>): void {
  const errorLog = {
    code: error.code,
    message: error.messageEn,
    httpStatus: error.httpStatus,
    details: error.details,
    context,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  };

  // In development, log to console
  if (import.meta.env.DEV) {
    console.error('Application Error:', errorLog);
  }

  // In production, this would send to an error reporting service
  // Example: Sentry.captureException(error, { extra: errorLog });
}

/**
 * Generic error handler for use in try-catch blocks
 */
export function handleError(
  error: unknown,
  options?: {
    showToast?: boolean;
    logError?: boolean;
    context?: Record<string, unknown>;
  }
): ParsedError {
  const parsed = parseApiError(error);

  if (options?.logError !== false) {
    logError(parsed, options?.context);
  }

  if (options?.showToast !== false) {
    showErrorToast(parsed);
  }

  return parsed;
}
