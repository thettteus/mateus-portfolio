import { type ReactNode } from 'react';

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

export default function WorkCases({ cases }: { cases: WorkCase[] }) {
  return (
    <ol className="wk-cases">
      {cases.map((c, index) => (
        <li className="wk-case" key={c.id}>
          <article className="wk-project" aria-labelledby={`case-${c.id}-title`}>
            <div className="wk-text">
              <p className="wk-eyebrow"><span>{String(index + 1).padStart(2, '0')}</span>{c.type}</p>
              <h3 id={`case-${c.id}-title`}>{c.name}</h3>
              <p className="wk-role">{c.role}</p>
              <p className="wk-lead">{c.lead}</p>
              <ul className="wk-stack" aria-label="Built with">
                {c.stack.map(tech => <li key={tech}>{tech}</li>)}
              </ul>
              <div className="wk-links">
                {c.links.map((link, i) => (
                  <a className={i === 0 ? 'wk-primary' : undefined} key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}<span aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>

            </div>
            <figure className="wk-visual">
              <div className={`wk-media${c.mediaClass ? ` ${c.mediaClass}` : ''}`}>{c.media}</div>
              <figcaption><span>{c.name}</span>{c.status && <span>{c.live && <i className="wk-live" aria-hidden="true" />}{c.status}</span>}</figcaption>
              {c.call && (
                <div className="wk-detail">
                  <span className="wk-detail-label">{c.call.label === 'My role' ? 'What I built' : 'Behind the build'}</span>
                  <p>{c.call.text}</p>
                </div>
              )}
            </figure>
          </article>
        </li>
      ))}
    </ol>
  );
}
