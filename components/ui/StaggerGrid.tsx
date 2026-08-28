'use client';
import { motion, useReducedMotion, Variants } from 'framer-motion';
import { ReactNode } from 'react';

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

type MotionTag = 'div' | 'article' | 'header' | 'ul';

interface StaggerGridProps {
  children: ReactNode;
  className?: string;
}

interface StaggerItemProps {
  as?: MotionTag;
  children: ReactNode;
  className?: string;
}

export function StaggerGrid({ children, className }: StaggerGridProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial={reduced ? false : 'hidden'}
      whileInView="show"
      viewport={{ once: true, margin: '-32px' }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ as = 'div', children, className }: StaggerItemProps) {
  const reduced = useReducedMotion();
  const Tag = motion[as];
  // click replays just the motif draw-in (.is-drawn) — .is-in (the persistent
  // lit/ignite state) is never touched, so lighting stays intact on replay
  const replay = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    if (!el.classList.contains('is-drawn')) return;
    el.classList.remove('is-drawn');
    void el.offsetWidth; // force reflow so the browser registers the removal
    el.classList.add('is-drawn');
  };
  return (
    <Tag
      className={className}
      variants={reduced ? {} : itemVariants}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      // scroll-triggered: mark the item once it enters view so its motif can
      // draw itself in (previously the motif only animated on hover, which on
      // touch meant a tap was required)
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      onViewportEnter={(entry) => entry?.target.classList.add('is-in', 'is-drawn')}
      onClick={replay}
    >
      {children}
    </Tag>
  );
}
