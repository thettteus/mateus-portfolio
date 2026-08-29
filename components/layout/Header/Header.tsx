'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

// Next.js's viewport.themeColor only tracks OS prefers-color-scheme, not this
// site's manual toggle — override the rendered meta tags so the iOS status
// bar / Dynamic Island area matches whichever theme is actually active.
function syncThemeColorMeta(theme: 'light' | 'dark') {
  const color = theme === 'dark' ? '#161718' : '#f5f5f3';
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color));
}

const LINKS = [
  { href: '#depth', label: 'Stack' },
  { href: '#projects', label: 'Work' },
  { href: '#process', label: 'Process' },
  { href: '#ai', label: 'Leverage' },
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
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 180, damping: 28 });

  // Keep openRef in sync so the scroll handler can read it without a stale closure.
  useEffect(() => { openRef.current = open; }, [open]);

  // Reveal on any upward scroll; hide while scrolling down.
  // Direct DOM manipulation avoids React batching delays.
  useEffect(() => {
    const onScroll = () => {
      const header = headerRef.current;
      if (!header || openRef.current) return;
      const y = window.scrollY;
      const prev = prevY.current;
      prevY.current = y;
      if (y < 80 || y < prev) {
        header.classList.remove('is-hidden');
        lastVisibleY.current = y;
      } else if (y - lastVisibleY.current > 100) {
        header.classList.add('is-hidden');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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

  // Lock scroll + close on Escape while the mobile menu is open.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      syncThemeColorMeta(next);
      return next;
    });
  }, []);

  return (
    <>
      <header ref={headerRef} className="topbar">
        <motion.span className="scroll-progress" style={{ scaleX: progress }} aria-hidden="true" />
        <div className="container topbar-inner">
        <a className="brand" href="#top" aria-label="Back to top" onClick={() => setOpen(false)}>
          <strong>Mateus P. S.</strong>
        </a>

        <nav className="nav" aria-label="Page sections">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
        </nav>

        <div className="topbar-right">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {/* Moon — shown when dark mode is active */}
            <svg className="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            {/* Sun — shown when light mode is active */}
            <svg className="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>

          <button
            className="nav-toggle"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="nt-bars" aria-hidden="true"><i /><i /></span>
          </button>
        </div>
        </div>
      </header>

      <div id="mobile-nav" className={`mobile-nav${open ? ' is-open' : ''}`}>
        <nav aria-label="Site navigation">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
          ))}
        </nav>
      </div>
    </>
  );
}
