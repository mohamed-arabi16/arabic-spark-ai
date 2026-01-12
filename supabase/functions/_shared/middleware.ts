/**
 * Production-ready middleware utilities for Supabase Edge Functions
 * Provides rate limiting, input validation, and security headers
 */

// Rate limiting configuration per endpoint
const RATE_LIMITS: Record<string, { requests: number; windowMs: number }> = {
  chat: { requests: 60, windowMs: 60000 },        // 60 requests per minute
  'ai-gateway': { requests: 60, windowMs: 60000 }, // 60 requests per minute
  'generate-image': { requests: 10, windowMs: 60000 }, // 10 images per minute
  research: { requests: 20, windowMs: 60000 },    // 20 research requests per minute
  'extract-memory': { requests: 30, windowMs: 60000 }, // 30 extractions per minute
  'export-data': { requests: 5, windowMs: 300000 }, // 5 exports per 5 minutes
  default: { requests: 100, windowMs: 60000 },    // Default: 100 per minute
};

// In-memory rate limit store (in production, use Redis/Deno KV)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Standard CORS headers for all responses
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

/**
 * Security headers for production
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Combine all headers for responses
 */
export function getResponseHeaders(contentType = 'application/json'): Record<string, string> {
  return {
    ...corsHeaders,
    ...securityHeaders,
    'Content-Type': contentType,
  };
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  error_code: string;
  details?: Record<string, unknown>;
  message_ar?: string;
  message_en?: string;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: string,
  errorCode: string,
  status: number,
  details?: Record<string, unknown>
): Response {
  const body: ErrorResponse = {
    error,
    error_code: errorCode,
    details,
  };

  // Add bilingual messages for common errors
  const bilingualMessages: Record<string, { ar: string; en: string }> = {
    UNAUTHORIZED: {
      ar: 'غير مصرح. يرجى تسجيل الدخول.',
      en: 'Unauthorized. Please sign in.',
    },
    RATE_LIMIT_EXCEEDED: {
      ar: 'تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً.',
      en: 'Rate limit exceeded. Please try again later.',
    },
    INVALID_INPUT: {
      ar: 'إدخال غير صالح. يرجى التحقق من البيانات.',
      en: 'Invalid input. Please check your data.',
    },
    SERVER_ERROR: {
      ar: 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.',
      en: 'Server error occurred. Please try again later.',
    },
    DAILY_BUDGET_EXCEEDED: {
      ar: 'تم تجاوز الميزانية اليومية.',
      en: 'Daily budget exceeded.',
    },
    CREDIT_LIMIT_EXCEEDED: {
      ar: 'تم الوصول إلى الحد الائتماني.',
      en: 'Credit limit reached.',
    },
    TRIAL_LIMIT_REACHED: {
      ar: 'انتهت الفترة التجريبية. يرجى التسجيل للمتابعة.',
      en: 'Trial limit reached. Please sign up to continue.',
    },
  };

  const messages = bilingualMessages[errorCode];
  if (messages) {
    body.message_ar = messages.ar;
    body.message_en = messages.en;
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: getResponseHeaders(),
  });
}

/**
 * Rate limiting middleware
 * Returns null if allowed, Response if rate limited
 */
export function checkRateLimit(
  userId: string,
  endpoint: string
): Response | null {
  const limits = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
  const key = `${userId}:${endpoint}`;
  const now = Date.now();

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // Start new window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + limits.windowMs,
    });
    return null;
  }

  if (record.count >= limits.requests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return createErrorResponse(
      'Rate limit exceeded',
      'RATE_LIMIT_EXCEEDED',
      429,
      { retry_after_seconds: retryAfter }
    );
  }

  record.count++;
  return null;
}

/**
 * Input validation utilities
 */
export const validators = {
  /**
   * Validate string input
   */
  string(value: unknown, options?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    required?: boolean;
  }): { valid: boolean; error?: string } {
    const opts = { required: false, ...options };

    if (value === undefined || value === null || value === '') {
      if (opts.required) {
        return { valid: false, error: 'Field is required' };
      }
      return { valid: true };
    }

    if (typeof value !== 'string') {
      return { valid: false, error: 'Must be a string' };
    }

    if (opts.minLength !== undefined && value.length < opts.minLength) {
      return { valid: false, error: `Minimum length is ${opts.minLength}` };
    }

    if (opts.maxLength !== undefined && value.length > opts.maxLength) {
      return { valid: false, error: `Maximum length is ${opts.maxLength}` };
    }

    if (opts.pattern && !opts.pattern.test(value)) {
      return { valid: false, error: 'Invalid format' };
    }

    return { valid: true };
  },

  /**
   * Validate array input
   */
  array(value: unknown, options?: {
    minLength?: number;
    maxLength?: number;
    required?: boolean;
  }): { valid: boolean; error?: string } {
    const opts = { required: false, ...options };

    if (value === undefined || value === null) {
      if (opts.required) {
        return { valid: false, error: 'Field is required' };
      }
      return { valid: true };
    }

    if (!Array.isArray(value)) {
      return { valid: false, error: 'Must be an array' };
    }

    if (opts.minLength !== undefined && value.length < opts.minLength) {
      return { valid: false, error: `Minimum length is ${opts.minLength}` };
    }

    if (opts.maxLength !== undefined && value.length > opts.maxLength) {
      return { valid: false, error: `Maximum length is ${opts.maxLength}` };
    }

    return { valid: true };
  },

  /**
   * Validate UUID format
   */
  uuid(value: unknown, required = false): { valid: boolean; error?: string } {
    if (value === undefined || value === null || value === '') {
      if (required) {
        return { valid: false, error: 'Field is required' };
      }
      return { valid: true };
    }

    if (typeof value !== 'string') {
      return { valid: false, error: 'Must be a string' };
    }

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(value)) {
      return { valid: false, error: 'Invalid UUID format' };
    }

    return { valid: true };
  },

  /**
   * Validate enum value
   */
  enum(value: unknown, allowedValues: string[], required = false): { valid: boolean; error?: string } {
    if (value === undefined || value === null || value === '') {
      if (required) {
        return { valid: false, error: 'Field is required' };
      }
      return { valid: true };
    }

    if (typeof value !== 'string') {
      return { valid: false, error: 'Must be a string' };
    }

    if (!allowedValues.includes(value)) {
      return { valid: false, error: `Must be one of: ${allowedValues.join(', ')}` };
    }

    return { valid: true };
  },
};

/**
 * Sanitize text input to prevent injection attacks
 */
export function sanitizeText(text: string): string {
  // Remove null bytes
  let sanitized = text.replace(/\0/g, '');
  
  // Limit length to prevent DoS
  const MAX_TEXT_LENGTH = 100000; // 100KB
  if (sanitized.length > MAX_TEXT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_TEXT_LENGTH);
  }

  return sanitized;
}

/**
 * Structured logging helper
 */
export function log(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  data?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data,
  };

  switch (level) {
    case 'debug':
      console.debug(JSON.stringify(logEntry));
      break;
    case 'info':
      console.log(JSON.stringify(logEntry));
      break;
    case 'warn':
      console.warn(JSON.stringify(logEntry));
      break;
    case 'error':
      console.error(JSON.stringify(logEntry));
      break;
  }
}

/**
 * Handle CORS preflight requests
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

/**
 * Extract user ID from request (JWT or session)
 */
export async function extractUserId(req: Request, supabase: { auth: { getUser: () => Promise<{ data: { user: { id: string } | null }, error: unknown }> } }): Promise<{
  userId: string | null;
  isAnonymous: boolean;
  error?: Response;
}> {
  const authHeader = req.headers.get('Authorization');
  const sessionId = req.headers.get('x-session-id');

  // Try JWT authentication first
  if (authHeader) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      return { userId: user.id, isAnonymous: false };
    }
  }

  // Fall back to anonymous session
  if (sessionId) {
    return { userId: sessionId, isAnonymous: true };
  }

  return {
    userId: null,
    isAnonymous: false,
    error: createErrorResponse(
      'Authentication required',
      'UNAUTHORIZED',
      401
    ),
  };
}
