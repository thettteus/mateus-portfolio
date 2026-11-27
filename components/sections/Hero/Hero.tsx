import Image from 'next/image';
import { Fragment, type ReactNode } from 'react';
import BookCall from '@/components/ui/BookCall';

const PHOTO = '/assets/me/profile_pic.avif';

// one drawing language for the four marks: 24-unit grid, 1.5px stroke, round joins
const ICONS: Record<string, ReactNode> = {
  product: (
    <>
      <path d="M12 3.5 20.5 8 12 12.5 3.5 8Z" />
      <path d="m3.5 12 8.5 4.5 8.5-4.5" />
      <path d="m3.5 16 8.5 4.5 8.5-4.5" />
    </>
  ),
  engineering: (
    <>
      <path d="M8 7.5 3.5 12 8 16.5" />
      <path d="M16 7.5 20.5 12 16 16.5" />
      <path d="m13.75 5-3.5 14" />
    </>
  ),
  data: (
    <>
      <rect x="3.5" y="12" width="4.5" height="8.5" rx="2.25" />
      <rect x="9.75" y="3.5" width="4.5" height="17" rx="2.25" />
      <rect x="16" y="8" width="4.5" height="12.5" rx="2.25" />
    </>
  ),
  ai: <path d="M12 3c.6 5 3.9 8.4 9 9-5.1.6-8.4 4-9 9-.6-5-3.9-8.4-9-9 5.1-.6 8.4-4 9-9Z" />,
};

const AREAS = [
  { id: 'product', title: 'Product', sub: 'Strategy, execution, impact' },
  { id: 'engineering', title: 'Engineering', sub: 'Full-stack, distributed systems' },
  { id: 'data', title: 'Data', sub: 'Pipelines, analytics, scale' },
  { id: 'ai', title: 'AI', sub: 'LLM apps, agents, RAG' },
];

export default function Hero() {
  return (
    <section id="top" tabIndex={-1} className="cover" aria-labelledby="hero-title">
      <div className="container">
        <div className="cover-grid wk-grid">
          <p className="cover-role">Sr. Software Engineer</p>

          <div className="cover-copy">
            <h1 className="cover-title" id="hero-title">
              From ambiguity
              <br />
              to production.
            </h1>
            <p className="cover-dek">
              Product thinking, full-stack engineering,
              <br /> and AI systems in production.
            </p>
          </div>

          <div className="cover-actions">
            <BookCall href="#contact" size="md" />
            <a className="quiet" href="#projects">
              <span>See selected work</span>
              <svg className="quiet-eye" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </a>
          </div>

          <div className="cover-photo-cell">
            <figure className="cover-photo">
              <Image
                src={PHOTO}
                alt="Portrait of Matt P. S."
                fill
                sizes="(max-width: 800px) 92vw, 28vw"
                draggable={false}
                priority
                unoptimized
              />
            </figure>
          </div>
        </div>

        <ul className="areas" aria-label="What I work on">
          {/* the hairlines are items of their own so space-between puts each
              one exactly halfway between its neighbours */}
          {AREAS.map((a, i) => (
            <Fragment key={a.id}>
              {i > 0 && <li className="areas-sep" aria-hidden="true" />}
              <li className="area">
                <svg className="area-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  {ICONS[a.id]}
                </svg>
                <div>
                  <b>{a.title}</b>
                  <span>{a.sub}</span>
                </div>
              </li>
            </Fragment>
          ))}
        </ul>
      </div>
    </section>
  );
}
