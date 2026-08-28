'use client';
import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode, CSSProperties } from 'react';

type MotionTag = 'div' | 'header' | 'article' | 'aside' | 'section' | 'p';

interface FadeInProps {
  as?: MotionTag;
  children: ReactNode;
  className?: string;
  delay?: number;
  style?: CSSProperties;
}

export function FadeIn({ as = 'div', children, className, delay = 0, style }: FadeInProps) {
  const reduced = useReducedMotion();
  const Tag = motion[as];

  return (
    <Tag
      className={className}
      style={style}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-32px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: delay * 0.65 }}
    >
      {children}
    </Tag>
  );
}
