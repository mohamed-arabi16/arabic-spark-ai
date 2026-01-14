/**
 * Model and task explanations for the "Why this model?" tooltip
 */

export const modelExplanations: Record<string, { en: string; ar: string }> = {
  'openai/gpt-5.2': {
    en: 'Latest flagship model for general tasks. Best for daily chat.',
    ar: 'النموذج الرئيسي الأحدث للمهام العامة. الأفضل للدردشة اليومية.'
  },
  'openai/gpt-5-nano': {
    en: 'Fastest and most economical. Great for simple questions.',
    ar: 'الأسرع والأكثر اقتصاداً. مثالي للأسئلة البسيطة.'
  },
  'openai/gpt-image-1.5': {
    en: 'ChatGPT\'s latest image generation model.',
    ar: 'أحدث نموذج لتوليد الصور من ChatGPT.'
  },
  'openai/o3-deep-research': {
    en: 'Specialized for deep research and complex analysis.',
    ar: 'متخصص في البحث العميق والتحليل المعقد.'
  },
  'google/gemini-flash-3': {
    en: 'Fast and efficient for everyday tasks.',
    ar: 'سريع وفعال للمهام اليومية.'
  },
  'google/gemini-3-pro': {
    en: 'Optimized for deep analysis and complex reasoning.',
    ar: 'محسّن للتحليل العميق والاستنتاج المعقد.'
  },
  'google/nanobanana-pro': {
    en: 'Default image generation model. Cost-effective and fast.',
    ar: 'نموذج توليد الصور الافتراضي. اقتصادي وسريع.'
  },
  'google/gemini-deep-research': {
    en: 'Best for in-depth research tasks with citations.',
    ar: 'الأفضل لمهام البحث المعمق مع الاستشهادات.'
  },
  'anthropic/opus-4.5': {
    en: 'Most intelligent Claude model. Best for complex tasks.',
    ar: 'أذكى نموذج كلود. الأفضل للمهام المعقدة.'
  },
  'anthropic/sonnet-4.5': {
    en: 'High performance reasoning with balanced cost.',
    ar: 'استدلال عالي الأداء بتكلفة متوازنة.'
  },
  'anthropic/haiku-4.5': {
    en: 'Fast responses for quick conversations.',
    ar: 'ردود سريعة للمحادثات السريعة.'
  },
  'anthropic/deep-research': {
    en: 'Claude\'s deep research model for thorough analysis.',
    ar: 'نموذج كلود للبحث العميق والتحليل الشامل.'
  },
};

export const taskExplanations: Record<string, { en: string; ar: string }> = {
  chat: {
    en: 'Selected for conversational tasks. Balanced speed and quality.',
    ar: 'مختار للمحادثات. توازن بين السرعة والجودة.'
  },
  deep_think: {
    en: 'Best for complex reasoning and analysis.',
    ar: 'الأفضل للتحليل والاستنتاج المعقد.'
  },
  deep_research: {
    en: 'Optimized for in-depth research and exploration.',
    ar: 'محسّن للبحث والاستكشاف المعمق.'
  },
  image: {
    en: 'High-quality image generation model.',
    ar: 'نموذج توليد صور عالي الجودة.'
  },
  fast: {
    en: 'Fastest option for quick responses.',
    ar: 'الخيار الأسرع للردود السريعة.'
  },
};

export const routingModeExplanations: Record<string, { en: string; ar: string }> = {
  auto: {
    en: 'Model selected automatically based on your task type and settings.',
    ar: 'يتم اختيار النموذج تلقائياً بناءً على نوع المهمة وإعداداتك.'
  },
  manual: {
    en: 'You have manually selected this model.',
    ar: 'لقد اخترت هذا النموذج يدوياً.'
  },
};

export function getModelExplanation(modelId: string, locale: string): string {
  const explanation = modelExplanations[modelId];
  if (!explanation) return locale === 'ar' ? 'نموذج ذكاء اصطناعي' : 'AI model';
  return locale === 'ar' ? explanation.ar : explanation.en;
}

export function getTaskExplanation(task: string, locale: string): string {
  const explanation = taskExplanations[task];
  if (!explanation) return locale === 'ar' ? 'مختار للمهمة الحالية' : 'Selected for current task';
  return locale === 'ar' ? explanation.ar : explanation.en;
}

export function getRoutingExplanation(mode: 'auto' | 'manual', locale: string): string {
  const explanation = routingModeExplanations[mode];
  return locale === 'ar' ? explanation.ar : explanation.en;
}
