/**
 * Premium Motion System — Liquid Glass Design
 * Framer Motion variants and utilities for consistent animations
 */

import { Variants, Transition } from 'framer-motion';

// ═══════════════════════════════════════════════════════════
// TIMING TOKENS
// ═══════════════════════════════════════════════════════════

export const timing = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.4,
  slower: 0.5,
} as const;

export const easing = {
  // Premium Apple-like easing
  smooth: [0.16, 1, 0.3, 1] as const,
  bounce: [0.34, 1.56, 0.64, 1] as const,
  easeOut: [0, 0, 0.2, 1] as const,
  easeIn: [0.4, 0, 1, 1] as const,
};

// ═══════════════════════════════════════════════════════════
// TRANSITION PRESETS
// ═══════════════════════════════════════════════════════════

export const transitions: Record<string, Transition> = {
  default: {
    duration: timing.normal,
    ease: easing.smooth,
  },
  fast: {
    duration: timing.fast,
    ease: easing.easeOut,
  },
  slow: {
    duration: timing.slow,
    ease: easing.smooth,
  },
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
  bounce: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
  },
};

// ═══════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════

// Fade in with subtle upward motion
export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.default,
  },
};

// Scale in from slightly smaller
export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.default,
  },
};

// Card hover effect — lift + glow
export const cardHover: Variants = {
  rest: {
    y: 0,
    scale: 1,
    boxShadow: '0 4px 6px -1px hsl(0 0% 0% / 0.05), 0 10px 15px -3px hsl(0 0% 0% / 0.08)',
  },
  hover: {
    y: -4,
    scale: 1.01,
    boxShadow: '0 8px 16px hsl(0 0% 0% / 0.08), 0 20px 40px hsl(0 0% 0% / 0.12)',
    transition: transitions.fast,
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
};

// Button press effect
export const buttonPress: Variants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: transitions.fast,
  },
  tap: { 
    scale: 0.97,
    transition: { duration: 0.1 },
  },
};

// Staggered list items
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.default,
  },
};

// Page transition
export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: timing.slow,
      ease: easing.smooth,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: timing.fast,
      ease: easing.easeIn,
    },
  },
};

// Modal/Dialog animation
export const modalAnimation: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: timing.normal,
      ease: easing.smooth,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: timing.fast,
      ease: easing.easeIn,
    },
  },
};

// Parallax scroll effect (subtle)
export const parallax = {
  slow: { y: [0, -20] },
  medium: { y: [0, -40] },
  fast: { y: [0, -60] },
};

// ═══════════════════════════════════════════════════════════
// REDUCED MOTION HELPERS
// ═══════════════════════════════════════════════════════════

export const reducedMotionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.01 } },
};

// Hook to detect reduced motion preference
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Get variants based on motion preference
export function getVariants(variants: Variants): Variants {
  if (prefersReducedMotion()) {
    return reducedMotionVariants;
  }
  return variants;
}
