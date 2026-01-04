import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeArabic(text: string): string {
  if (!text) return "";
  return text
    .replace(/[أإآ]/g, "ا") // Normalize Alef
    .replace(/ة/g, "ه") // Normalize Teh Marbuta
    .replace(/[\u064B-\u065F\u0640]/g, "") // Remove Tatweel and Diacritics
    .toLowerCase(); // For English parts
}
