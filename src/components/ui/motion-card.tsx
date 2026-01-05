/**
 * MotionCard — Premium animated card with glass treatment
 * Uses Framer Motion for smooth hover depth effects
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { cardHover, prefersReducedMotion } from '@/lib/motion';

interface MotionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated';
  interactive?: boolean;
}

const MotionCard = React.forwardRef<HTMLDivElement, MotionCardProps>(
  ({ className, variant = 'glass', interactive = true, children, onClick, ...props }, ref) => {
    const reducedMotion = prefersReducedMotion();
    
    const variantClasses = {
      default: 'bg-card border border-border',
      glass: 'glass',
      elevated: 'glass-elevated',
    };

    if (!interactive || reducedMotion) {
      return (
        <div
          ref={ref}
          className={cn(
            'rounded-2xl p-6',
            variantClasses[variant],
            'transition-shadow duration-300',
            interactive && 'hover:shadow-glass-lg cursor-pointer',
            className
          )}
          onClick={onClick}
          {...props}
        >
          {children}
        </div>
      );
    }

    return (
      <motion.div
        ref={ref}
        className={cn(
          'rounded-2xl p-6',
          variantClasses[variant],
          'cursor-pointer',
          className
        )}
        variants={cardHover}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }
);

MotionCard.displayName = 'MotionCard';

// Staggered list container for cards
interface MotionCardListProps extends React.HTMLAttributes<HTMLDivElement> {}

const MotionCardList = React.forwardRef<HTMLDivElement, MotionCardListProps>(
  ({ className, children, ...props }, ref) => {
    const reducedMotion = prefersReducedMotion();

    if (reducedMotion) {
      return (
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      );
    }

    return (
      <motion.div
        ref={ref}
        className={className}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.05,
              delayChildren: 0.1,
            },
          },
        }}
      >
        {children}
      </motion.div>
    );
  }
);

MotionCardList.displayName = 'MotionCardList';

// Individual item wrapper for staggered animations
interface MotionCardItemProps extends React.HTMLAttributes<HTMLDivElement> {}

const MotionCardItem = React.forwardRef<HTMLDivElement, MotionCardItemProps>(
  ({ className, children, ...props }, ref) => {
    const reducedMotion = prefersReducedMotion();

    if (reducedMotion) {
      return (
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      );
    }

    return (
      <motion.div
        ref={ref}
        className={className}
        variants={{
          hidden: { opacity: 0, y: 10 },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1],
            },
          },
        }}
      >
        {children}
      </motion.div>
    );
  }
);

MotionCardItem.displayName = 'MotionCardItem';

export { MotionCard, MotionCardList, MotionCardItem };
