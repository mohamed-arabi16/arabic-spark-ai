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

/**
 * Project type for getProjectName utility
 */
interface ProjectLike {
  id: string;
  name: string;
}

/**
 * Get a project's display name by ID from a list of projects.
 * Returns a fallback string for null/undefined IDs or when project is not found.
 * 
 * @param projectId - The project ID to look up
 * @param projects - List of projects to search in
 * @param fallbacks - Fallback strings for global (no project) and not found cases
 * @returns The project name or appropriate fallback
 */
export function getProjectName(
  projectId: string | null | undefined,
  projects: ProjectLike[],
  fallbacks: { global: string; notFound: string } = { global: 'Global', notFound: 'Project' }
): string {
  if (!projectId) return fallbacks.global;
  const project = projects.find(p => p.id === projectId);
  return project?.name || fallbacks.notFound;
}
