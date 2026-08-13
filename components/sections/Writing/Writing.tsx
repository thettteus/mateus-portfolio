import Link from 'next/link';
import { FadeIn } from '@/components/ui/FadeIn';

type Article = {
  slug: string;
  kind: string;
  year: string;
  title: string;
  dek: string;
};

const articles: Article[] = [
  {
    slug: 'stop-using-the-best-model-for-everything',
    kind: 'Essay',
    year: '2026',
    title: 'Stop using the best model for everything: designing an AI stack around cost, risk, and complexity',
    dek: 'The strongest model has plenty of work to do. It just should not be responsible for everything.',
  },
  {
    slug: 'artificial-intelligence-and-human-vanity',
    kind: 'Essay',
    year: '2026',
    title: "AI Didn’t Replace Our Intelligence. It Challenged Our Self-Importance.",
    dek: 'Answers have become abundant. Abundance is not the same as meaning.',
  },
];

export default function Writing() {
  return (
    <section className="writing" id="writing">
      <div className="container">
        <FadeIn as="header" className="sec-head">
          <div className="sec-eyebrow">
            <span className="num">05</span>
            <span className="lbl">Writing</span>
          </div>
          <h2>I write to work things out.</h2>
          <p className="sub">
            On engineering, product, and the parts of the job I’m still figuring out.
          </p>
        </FadeIn>

        <div className="writing-list">
          {articles.map(({ slug, kind, year, title, dek }) => (
            <FadeIn as="article" className="article-card" key={slug}>
              <Link className="ac-link" href={`/writing/${slug}`} aria-label={`Read: ${title}`}>
                <div className="ac-body">
                  <div className="ac-meta">
                    <span>{kind}</span>
                    <span>{year}</span>
                  </div>
                  <h3>{title}</h3>
                  <p className="ac-dek">{dek}</p>
                  <span className="ac-read">
                    Read
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 11L11 3M5 3h6v6" />
                    </svg>
                  </span>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
