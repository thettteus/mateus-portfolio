'use client';

import type { PointerEvent, ReactNode } from 'react';
import ArrowUpRight from './ArrowUpRight';

type Props = {
  href: string;
  /** sm: a project's main link · md: the hero · lg: the contact screen */
  size?: 'sm' | 'md' | 'lg';
  /** opens the booking page in a new tab */
  external?: boolean;
  className?: string;
  children?: ReactNode;
};

// the deeper green fills the button from where the pointer comes in
function fillFrom(e: PointerEvent<HTMLAnchorElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}

/** The one call to action, the same button everywhere it appears. */
export default function BookCall({ href, size = 'md', external, className, children = 'Book a call' }: Props) {
  return (
    <a
      className={`book book-${size}${className ? ` ${className}` : ''}`}
      href={href}
      onPointerEnter={fillFrom}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <span>{children}</span>
      <ArrowUpRight />
    </a>
  );
}
