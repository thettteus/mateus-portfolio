'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export type WorkCase = {
  id: string;
  name: string;
  role: string;
  type: string;
  status?: string;
  live?: boolean;
  lead: string;
  call?: { label: string; text: ReactNode };
  stack: string[];
  links: { label: string; href: string }[];
  media: ReactNode;
  mediaClass?: string;
};

/**
 * WorkCases — the project index: one row per project (role, type, status) that
 * opens into the story, the decision that shaped it, and a picture. One open
 * at a time; the first starts open.
 */
export default function WorkCases({ cases }: { cases: WorkCase[] }) {
  const list = useRef<HTMLOListElement>(null);
  const [open, setOpen] = useState<string | null>(cases[0]?.id ?? null);
  const [anim, setAnim] = useState('');

  // rules draw and rows resolve once, when the list scrolls in
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !list.current) return;
    setAnim(' js-anim');
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); setAnim(' js-anim is-in'); }
    }, { threshold: 0.1 });
    io.observe(list.current);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div className="wk-cols wk-grid" aria-hidden="true">
        <span>Project</span><span>Role</span><span>Type</span><span>Status</span>
      </div>

      <ol className={`wk-cases${anim}`} ref={list}>
        {cases.map((c, r) => {
          const isOpen = open === c.id;
          return (
            <li className={`wk-case${isOpen ? ' is-open' : ''}`} key={c.id} style={{ '--r': r } as CSSProperties}>
              <h3>
                <button
                  className="wk-row wk-grid"
                  type="button"
                  id={`case-${c.id}-btn`}
                  aria-expanded={isOpen}
                  aria-controls={`case-${c.id}`}
                  onClick={() => setOpen(isOpen ? null : c.id)}
                >
                  <span className="wk-title">{c.name}</span>
                  <span className="wk-role">{c.role}</span>
                  <span className="wk-type">{c.type}</span>
                  <span className="wk-status">
                    {c.live && <span className="wk-live" aria-hidden="true" />}
                    {c.status}
                  </span>
                  <span className="wk-icon" aria-hidden="true" />
                </button>
              </h3>
              <div className="wk-panel" id={`case-${c.id}`} role="region" aria-labelledby={`case-${c.id}-btn`} inert={!isOpen}>
                <div className="wk-clip">
                  <div className="wk-inner wk-grid">
                    <div className="wk-text">
                      <p className="wk-lead">{c.lead}</p>
                      {c.call && (
                        <figure className="wk-call">
                          <figcaption>{c.call.label}</figcaption>
                          <blockquote>{c.call.text}</blockquote>
                        </figure>
                      )}
                      <dl className="wk-meta">
                        <div><dt>Built with</dt><dd>{c.stack.join(', ')}</dd></div>
                      </dl>
                      <p className="wk-links">
                        {c.links.map((l) => (
                          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
                        ))}
                      </p>
                    </div>
                    <figure className={`wk-media${c.mediaClass ? ` ${c.mediaClass}` : ''}`}>{c.media}</figure>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
