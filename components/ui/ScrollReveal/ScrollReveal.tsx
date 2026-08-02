'use client';

import { useEffect } from 'react';

export default function ScrollReveal() {
  useEffect(() => {
    const html = document.documentElement;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        html.classList.add('transitions-ready');
      });
    });

    const NAV_SECTIONS = ['depth', 'projects', 'process', 'ai', 'writing', 'contact'];

    const updateActive = () => {
      const y = window.scrollY + 120;
      const sections = NAV_SECTIONS.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
      let activeId = '';
      for (const s of sections) {
        if (s.offsetTop <= y) activeId = s.id;
      }
      document.querySelectorAll<HTMLAnchorElement>('.nav a').forEach(a => {
        a.classList.toggle('nav-active', a.getAttribute('href') === `#${activeId}`);
      });
    };

    window.addEventListener('scroll', updateActive, { passive: true });
    updateActive();

    return () => window.removeEventListener('scroll', updateActive);
  }, []);

  return null;
}
