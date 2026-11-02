'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { FITZ } from '@/components/sections/Hero/skyline';

// Next.js's viewport.themeColor only tracks OS prefers-color-scheme, not this
// site's manual toggle — override the rendered meta tags so the iOS status
// bar / Dynamic Island area matches whichever theme is actually active.
function syncThemeColorMeta(theme: 'light' | 'dark') {
  const color = theme === 'dark' ? '#161718' : '#f5f5f3';
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color));
}

// the theme sweep's edge: the hero's skyline across the screen, `y` px down
const SWEEP_POINTS = 48;
function sweepEdge(y: number) {
  const w = innerWidth, amp = innerHeight * 0.22;
  const pts = [`${w}px ${innerHeight * 2}px`, `0px ${innerHeight * 2}px`];
  for (let i = 0; i <= SWEEP_POINTS; i++) {
    const v = FITZ[Math.round((i / SWEEP_POINTS) * (FITZ.length - 1))];
    pts.push(`${((i / SWEEP_POINTS) * w).toFixed(1)}px ${(y + amp * v).toFixed(1)}px`);
  }
  return `polygon(${pts.join(', ')})`;
}

const LINKS = [
  { href: '#depth', label: 'Stack' },
  { href: '#projects', label: 'Work' },
  { href: '#leverage', label: 'Leverage' },
  { href: '#writing', label: 'Writing' },
  { href: '#contact', label: 'Contact' },
];

export default function Header() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const prevY = useRef(0);
  const lastVisibleY = useRef(0);
  const openRef = useRef(false);
  const switchTimer = useRef(0);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 180, damping: 28 });

  // Keep openRef in sync so the scroll handler can read it without a stale closure.
  useEffect(() => { openRef.current = open; }, [open]);

  // Reveal only when the reader scrolls up on purpose (wheel up, a finger
  // dragging down, the up keys); hide while scrolling down. The pinned scenes
  // nudge the page back to hold a step, and that must not count as going up.
  // Direct DOM manipulation avoids React batching delays.
  useEffect(() => {
    let upAt = -1e9;
    let touchY = 0;
    const UP_MS = 450;
    const onWheel = (e: WheelEvent) => { if (e.deltaY < 0) upAt = performance.now(); };
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0]?.clientY ?? 0; };
    const onTouchMove = (e: TouchEvent) => { if ((e.touches[0]?.clientY ?? 0) > touchY + 4) upAt = performance.now(); };
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowUp', 'PageUp', 'Home'].includes(e.key) || (e.key === ' ' && e.shiftKey)) upAt = performance.now();
    };
    const onScroll = () => {
      const header = headerRef.current;
      if (!header || openRef.current) return;
      const y = window.scrollY;
      const prev = prevY.current;
      prevY.current = y;
      if (y < 80 || (y < prev && performance.now() - upAt < UP_MS)) {
        header.classList.remove('is-hidden');
        lastVisibleY.current = y;
      } else if (y - lastVisibleY.current > 100) {
        header.classList.add('is-hidden');
      }
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (t: 'light' | 'dark') => {
      setTheme(t);
      document.documentElement.setAttribute('data-theme', t);
      syncThemeColorMeta(t);
    };
    apply(stored ?? (media.matches ? 'dark' : 'light'));
    if (stored) return; // explicit choice already made — stop following the OS setting
    const onChange = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  // Close the mobile menu on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const toggleTheme = useCallback(() => {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    const apply = () => {
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      syncThemeColorMeta(next);
      setTheme(next);
    };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // no sweep available: the colours ease across, then every other transition is back
      html.classList.add('theme-switching');
      clearTimeout(switchTimer.current);
      switchTimer.current = window.setTimeout(() => html.classList.remove('theme-switching'), 400);
      apply();
      return;
    }
    // the new theme comes in under the range's edge, sweeping up the screen
    const vt = doc.startViewTransition(apply);
    vt.ready.then(() => {
      html.animate(
        { clipPath: [sweepEdge(innerHeight * 1.25), sweepEdge(-innerHeight * 0.45)] },
        { duration: 900, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    }).catch(() => {});
  }, []);

  return (
    <header ref={headerRef} className={`topbar${open ? ' is-open' : ''}`}>
      <motion.span className="scroll-progress" style={{ scaleX: progress }} aria-hidden="true" />
      <div className="container topbar-inner">

        <nav className="nav" id="site-nav" aria-label="Page sections">
          {LINKS.map((l) => (
            // on desktop "Book a call" stands in for Contact
            <a key={l.href} href={l.href} className={l.href === '#contact' ? 'nav-contact' : undefined} onClick={() => setOpen(false)}>{l.label}</a>
          ))}
        </nav>

        <div className="topbar-right">
          <a className="tb-cta" href="#contact">Book a call</a>
          <button
            className="tb-menu"
            type="button"
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? 'Close' : 'Menu'}
          </button>
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
