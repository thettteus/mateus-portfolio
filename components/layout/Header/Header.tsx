'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import BookCall from '@/components/ui/BookCall';

// Next.js's viewport.themeColor only tracks OS prefers-color-scheme, not this
// site's manual toggle — override the rendered meta tags so the iOS status
// bar / Dynamic Island area matches whichever theme is actually active.
function syncThemeColorMeta(theme: 'light' | 'dark') {
  const color = theme === 'dark' ? '#161718' : '#f5f5f3';
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color));
}

// The theme change blooms out of the toggle: the new theme's snapshot is
// masked by a soft radial gradient (solid to BLOOM_CORE of its radius, then
// feathered to nothing) that grows from the button until it covers the
// farthest corner. No hard edge, no shape: the new light just spreads.
const BLOOM_CORE = 0.7;
const BLOOM_MS = 1000;
function bloom(from: Element | null) {
  const r = from?.getBoundingClientRect();
  const x = r ? r.left + r.width / 2 : innerWidth - 40;
  const y = r ? r.top + r.height / 2 : 40;
  const reach = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const d = (2 * reach) / BLOOM_CORE; // the solid core alone reaches every corner
  return {
    maskSize: ['0px 0px', `${d}px ${d}px`],
    maskPosition: [`${x}px ${y}px`, `${x - d / 2}px ${y - d / 2}px`],
  };
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
      if (!header) return;
      const y = window.scrollY;
      // the bar's hairline only appears once there is page under it; an
      // attribute, not a class, so React's className updates never clear it
      header.toggleAttribute('data-scrolled', y > 8);
      if (openRef.current) return;
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
    onScroll();
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

  const toggleTheme = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    const origin = e.currentTarget;
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
    const vt = doc.startViewTransition(apply);
    vt.ready.then(() => {
      html.animate(bloom(origin), {
        duration: BLOOM_MS,
        easing: 'cubic-bezier(0.45, 0, 0.15, 1)',
        fill: 'forwards',
        pseudoElement: '::view-transition-new(root)',
      });
    }).catch(() => {});
  }, []);

  return (
    <header ref={headerRef} className={`topbar${open ? ' is-open' : ''}`}>
      <motion.span className="scroll-progress" style={{ scaleX: progress }} aria-hidden="true" />
      <div className="container topbar-inner">
        <a className="tb-logo" href="#top" onClick={() => setOpen(false)}>Matt P. S.</a>

        <nav className="nav" id="site-nav" aria-label="Page sections">
          {LINKS.map((l) => (
            // on desktop "Book a call" stands in for Contact
            <a key={l.href} href={l.href} className={l.href === '#contact' ? 'nav-contact' : undefined} onClick={() => setOpen(false)}>{l.label}</a>
          ))}
        </nav>

        <div className="topbar-right">
          <BookCall href="#contact" size="sm" className="tb-cta" />
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
