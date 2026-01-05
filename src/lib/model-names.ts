/**
 * Model ID to friendly display name mapping
 */

export const modelFriendlyNames: Record<string, { en: string; ar: string; shortEn?: string; shortAr?: string }> = {
  'openai/gpt-5.2': { en: 'GPT-5.2', ar: 'جي بي تي 5.2', shortEn: 'GPT-5.2', shortAr: 'GPT-5.2' },
  'openai/gpt-5-nano': { en: 'GPT-5 Nano', ar: 'جي بي تي 5 نانو', shortEn: 'Nano', shortAr: 'نانو' },
  'openai/gpt-image-1.5': { en: 'GPT Image 1.5', ar: 'جي بي تي صور 1.5' },
  'openai/sora-2-pro': { en: 'Sora 2 Pro', ar: 'سورا 2 برو' },
  'openai/o3-deep-research': { en: 'o3 Deep Research', ar: 'o3 بحث عميق' },
  'google/gemini-flash-3': { en: 'Gemini Flash 3', ar: 'جيميني فلاش 3', shortEn: 'Flash', shortAr: 'فلاش' },
  'google/gemini-3-pro': { en: 'Gemini 3 Pro', ar: 'جيميني 3 برو', shortEn: 'Gemini Pro', shortAr: 'جيميني برو' },
  'google/nanobanana-pro': { en: 'NanoBanana Pro', ar: 'نانو بنانا برو' },
  'google/veo-2.1': { en: 'Veo 2.1', ar: 'فيو 2.1' },
  'anthropic/opus-4.5': { en: 'Claude Opus 4.5', ar: 'كلود أوبوس 4.5', shortEn: 'Opus', shortAr: 'أوبوس' },
  'anthropic/sonnet-4.5': { en: 'Claude Sonnet 4.5', ar: 'كلود سونيت 4.5', shortEn: 'Sonnet', shortAr: 'سونيت' },
  'anthropic/haiku-4.5': { en: 'Claude Haiku 4.5', ar: 'كلود هايكو 4.5', shortEn: 'Haiku', shortAr: 'هايكو' },
  'anthropic/deep-research': { en: 'Claude Deep Research', ar: 'كلود بحث عميق' },
};

export const providerNames: Record<string, { en: string; ar: string }> = {
  openai: { en: 'OpenAI', ar: 'أوبن إيه آي' },
  google: { en: 'Google', ar: 'جوجل' },
  anthropic: { en: 'Anthropic', ar: 'أنثروبيك' },
};

export function getModelDisplayName(modelId: string, locale: string, short = false): string {
  const names = modelFriendlyNames[modelId];
  if (!names) return modelId.split('/').pop() || modelId;
  
  if (short) {
    if (locale === 'ar') return names.shortAr || names.ar;
    return names.shortEn || names.en;
  }
  
  return locale === 'ar' ? names.ar : names.en;
}

export function getProviderDisplayName(provider: string, locale: string): string {
  const names = providerNames[provider];
  if (!names) return provider;
  return locale === 'ar' ? names.ar : names.en;
}

export function parseModelId(modelId: string): { provider: string; model: string } {
  const parts = modelId.split('/');
  return {
    provider: parts[0] || 'unknown',
    model: parts[1] || modelId,
  };
}
