'use client';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

const EMAIL = 'mateuspdasilva369@gmail.com';
const BOOK = 'https://calendly.com/mateuspdasilva369/1-1-meeting';
const RESUME = '/assets/files/mateus_resume.pdf';
const TIME_ZONE = 'America/Vancouver';
const NAME = 'Matt P. S.';

/**
 * Contact — the last screen of the site: the ask, one filled button, who this
 * is for, the footer columns, and the name set as large as the page allows.
 */
export default function Contact() {
  const root = useRef<HTMLElement>(null);
  const main = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLParagraphElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const [clock, setClock] = useState<{ text: string; iso: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(0);


  // fit the name to the full width of the page
  useEffect(() => {
    const m = mark.current, s = inner.current;
    if (!m || !s || !root.current) return;
    const fit = () => {
      m.style.fontSize = '100px';
      const w = s.getBoundingClientRect().width;
      m.style.fontSize = (100 * m.clientWidth / w * 0.995).toFixed(2) + 'px';
    };
    const ro = new ResizeObserver(fit);
    ro.observe(root.current);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, []);

  // local time
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });
    let t = 0;
    const tick = () => {
      const now = new Date();
      setClock({ text: fmt.format(now), iso: now.toISOString() });
      t = window.setTimeout(tick, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
    };
    tick();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  // the button fills from where the pointer enters
  const fillFrom = (e: PointerEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(EMAIL); }
    catch {
      const t = document.createElement('textarea');
      t.value = EMAIL; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.append(t); t.select();
      try { document.execCommand('copy'); } catch {}
      t.remove();
    }
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className="contact" id="contact" aria-labelledby="contact-title" ref={root}>
      <div className="container">
        <div className="wk-grid">
          <div className="c-main" ref={main}>
            <h2 id="contact-title">
              <span className="line ask">Have a solution worth building?</span>
              <span className="line"><b>Let’s turn it into a product.</b></span>
            </h2>
            <p className="c-lead">From discovery and architecture to implementation and production. One engineer, end-to-end ownership.</p>

            <div className="c-actions">
              <div className="c-do">
                <a className="c-book" href={BOOK} target="_blank" rel="noopener noreferrer" onPointerEnter={fillFrom}>
                  <span className="label">Book a 30-minute intro call</span>
                </a>
                <span className="c-email">
                  <span className="or">or</span>
                  <a className="c-quiet" href={`mailto:${EMAIL}`}>{EMAIL}</a>
                  <button className="c-copy" type="button" onClick={copy} data-done={copied || undefined}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </span>
              </div>
              <p className="c-do-note">30 minutes, no prep needed.</p>
            </div>
          </div>

          <aside className="c-side" aria-label="Fit">
            <section>
              <h3>Best fit</h3>
              <ul>
                <li>Early-stage companies</li>
                <li>Product-focused engineering</li>
                <li>AI-enabled products</li>
                <li>Complex business workflows</li>
                <li>0 to 1, and scaling products</li>
              </ul>
            </section>
            <section>
              <h3>Open to</h3>
              <ul>
                <li>Founding Engineer roles</li>
                <li>Product Engineer roles</li>
                <li>Software Engineer roles</li>
              </ul>
            </section>
            <section>
              <h3>Speaks</h3>
              <p>English, Spanish, Portuguese</p>
            </section>
          </aside>
        </div>

        <nav className="c-foot wk-grid" aria-label="Footer">
          <div className="f-col">
            <h3>Based in</h3>
            <p>Vancouver</p>
            <p className="sub"><time dateTime={clock?.iso}>{clock?.text ?? '--:--'}</time> local time</p>
          </div>
          <div className="f-col">
            <h3>Elsewhere</h3>
            <ul>
              <li><a className="f-link" href="https://github.com/thettteus" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              <li><a className="f-link" href="https://www.linkedin.com/in/mateuspdasilva" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
              <li><a className="f-link" href={RESUME} target="_blank" rel="noopener noreferrer">Résumé (PDF)</a></li>
            </ul>
          </div>
          <div className="f-col">
            <h3>Colophon</h3>
            <p>Set in Helvetica Neue.</p>
            <p className="sub">Designed and built by hand.</p>
          </div>
          <div className="f-col f-end">
            <a className="f-top" href="#top">Back to top</a>
            <p className="sub">© {new Date().getFullYear()} {NAME}</p>
          </div>
        </nav>

        <p className="c-wordmark" ref={mark} aria-hidden="true">
          <span ref={inner} style={{ display: 'inline-block' }}>
            {[...NAME].map((c, i) => (
              <span className="ch" key={i} style={{ '--i': i } as CSSProperties}>{c === ' ' ? ' ' : c}</span>
            ))}
          </span>
        </p>
        <p className="sr-only" aria-live="polite">{copied ? 'E-mail copied' : ''}</p>
      </div>
    </footer>
  );
}
