import { FadeIn } from '@/components/ui/FadeIn';
import WritingList, { type Essay } from './WritingList';

const essays: Essay[] = [
  {
    slug: 'stop-using-the-best-model-for-everything',
    kind: 'Essay',
    year: '2026',
    title: 'Stop using the best model for everything: designing an AI stack around cost, risk, and complexity',
    dek: 'The strongest model has plenty of work to do. It just should not be responsible for everything.',
    mark: 'models',
  },
  {
    slug: 'artificial-intelligence-and-human-vanity',
    kind: 'Essay',
    year: '2026',
    title: 'AI didn’t replace our intelligence. It challenged our self-importance.',
    dek: 'Answers have become abundant. Abundance is not the same as meaning.',
    mark: 'field',
  },
];

export default function Writing() {
  return (
    <section className="writing" id="writing">
      <div className="container">
        <FadeIn as="header" className="wk-top wk-grid">
          <h2>I write to <b>work things out.</b></h2>
          <p className="wk-note">On engineering, product, and the parts of the job I’m still figuring out.</p>
        </FadeIn>

        <WritingList essays={essays} />
      </div>
    </section>
  );
}
