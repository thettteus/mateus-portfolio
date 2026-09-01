import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AI Didn’t Replace Our Intelligence — Mateus P. S.',
  description:
    'Answers have become abundant. Abundance is not the same as meaning. An essay on AI, self-importance, and where human value really lives.',
  alternates: { canonical: 'https://mattbuilds.io/writing/artificial-intelligence-and-human-vanity' },
  openGraph: {
    title: 'AI Didn’t Replace Our Intelligence. It Challenged Our Self-Importance.',
    description: 'Answers have become abundant. Abundance is not the same as meaning.',
    url: 'https://mattbuilds.io/writing/artificial-intelligence-and-human-vanity',
    type: 'article',
    authors: ['Mateus Pereira da Silva'],
    images: [{ url: 'https://mattbuilds.io/og.png', width: 1200, height: 630, type: 'image/png', alt: 'Mateus P. S. — Product Engineer' }],
  },
};

export default function Article() {
  return (
    <main className="article-page">
      <article className="article">
        <Link className="article-back" href="/#writing">
          <span aria-hidden="true">←</span> Mateus P. S.
        </Link>

        <header className="article-head">
          <span className="article-kicker">Essay · 2026</span>
          <h1>AI Didn’t Replace Our Intelligence. It Challenged Our Self-Importance.</h1>
          <p className="article-dek">
            Answers have become abundant. Abundance is not the same as meaning.
          </p>
          <span className="article-by">Mateus P. S.</span>
        </header>

        <div className="article-body">
          <p>When I first started using AI at work, I didn’t tell anyone.</p>
          <p>
            No one had forbidden it. There wasn’t even an unspoken rule against it. Still, I kept it
            to myself.
          </p>
          <p>
            At the time, I was still early in my career as a software engineer. Even so, I was
            already being trusted with complex problems and expected to deliver work that would
            normally be assigned to someone much more experienced. I had worked hard to earn that
            trust, and I didn’t want people to think it belonged to a tool instead of me.
          </p>
          <p>Before long, opening an AI chat became part of my daily routine.</p>
          <p>
            It helped me analyze database queries, organize documentation, review code, explore
            performance bottlenecks, and untangle ideas before I wrote a single line of code.
          </p>
          <p>The interesting part is that I hid it.</p>
          <p>Not because I thought I was cheating.</p>
          <p>The discomfort came from somewhere else.</p>
          <p>I imagined someone looking at my work and saying:</p>
          <blockquote>“AI did that.”</blockquote>
          <p>As if using a tool somehow diminished the work of understanding the problem.</p>
          <p>Looking back, I think that feeling was vanity.</p>

          <hr />

          <p>A few months later, something changed.</p>
          <p>
            An important client was blocked by an old database query. It had accumulated business
            rules, had become painfully complex, and took so long to run that it would eventually
            time out.
          </p>
          <p>
            I opened the query, broke down the logic, used AI to challenge my assumptions, explore
            optimization ideas, and question some of the decisions I was making. Step by step, I
            reorganized the query, improved its structure, and validated every change.
          </p>
          <p>
            Less than ten minutes later, a request that had previously never finished was returning
            results in just a few milliseconds.
          </p>
          <p>When I told my boss it was fixed, he looked at me in surprise.</p>
          <blockquote>“Already?”</blockquote>
          <p>Yes.</p>
          <p>The client got back to work.</p>
          <p>And that’s when something clicked.</p>
          <p>AI hadn’t solved that problem.</p>
          <p>
            I was still the one who understood the system, knew the business rules, recognized which
            optimizations were safe, and took responsibility for every change.
          </p>
          <p>AI had simply shortened the distance between understanding and execution.</p>
          <p>That was the day I stopped seeing it as a potential replacement.</p>
          <p>
            Since then, I’ve started thinking of it more as someone who is always willing to review
            the same idea for the tenth time, brainstorm with me, challenge my assumptions, and
            suggest paths I might not have considered. But every one of those conversations depends on
            the same thing: someone who understands the context and knows why the problem exists in
            the first place.
          </p>

          <hr />

          <p>
            As I became more comfortable with that idea at work, I noticed another conversation
            happening everywhere else.
          </p>
          <p>Almost every discussion about AI eventually leads to the same question:</p>
          <blockquote>“Will AI replace humans?”</blockquote>
          <p>The more I heard that question, the less it seemed to be about technology.</p>
          <p>It seemed to be about us.</p>
          <p>
            Maybe because this isn’t the first time we’ve discovered that our place in the universe
            isn’t quite as special as we once believed.
          </p>
          <p>Astronomy showed us that Earth isn’t the center of the universe.</p>
          <p>Biology showed us that we’re part of the same tree of life as every other living thing.</p>
          <p>Freud suggested that we don’t even fully understand our own minds.</p>
          <p>Each of those ideas took away a little of the privilege we thought we had.</p>
          <p>Perhaps AI is doing something similar.</p>
          <p>There’s an irony here.</p>
          <p>
            For decades, we’ve imagined an alien civilization arriving to tell us to “seek knowledge,”
            as if it would take intelligence from another galaxy for us to accept that intelligence
            doesn’t have to look like us.
          </p>
          <p>Meanwhile, extraordinary examples have always been right in front of us.</p>
          <p>
            Honeybee swarms choose a new home through a distributed decision-making process, where
            hundreds of scout bees evaluate potential sites until a consensus naturally emerges.
          </p>
          <p>
            Ant colonies solve complex logistical problems using simple local rules, inspiring
            optimization algorithms that engineers still use today.
          </p>
          <p>
            Beneath forests, trees and fungi exchange nutrients and chemical signals through
            underground networks that have reshaped our understanding of entire ecosystems.
          </p>
          <p>None of them writes code.</p>
          <p>None of them attends meetings.</p>
          <p>
            Yet all of them solve complex collective problems in ways we’re still trying to understand.
          </p>
          <p>Maybe the surprising thing isn’t that artificial intelligence exists.</p>
          <p>
            Maybe it’s that we spent so long believing intelligence only counts when it resembles our
            own.
          </p>

          <hr />

          <p>That realization also changed how I see my own work.</p>
          <p>Calculators didn’t replace mathematics.</p>
          <p>Spreadsheets didn’t replace accountants.</p>
          <p>Tools usually reduce effort long before they reduce relevance.</p>
          <p>AI seems to be following the same pattern, but at a much faster pace.</p>
          <p>It dramatically reduced the cost of intellectual work.</p>
          <p>And that forced me to face an uncomfortable question.</p>
          <p>If my value came only from execution, how much of that value was ever really mine?</p>
          <p>I still don’t have a definitive answer.</p>
          <p>But I know where the answer isn’t.</p>
          <p>It isn’t about writing code faster.</p>
          <p>It isn’t in memorizing syntax.</p>
          <p>And it isn’t in producing answers before everyone else.</p>
          <p>I still rely on AI every single day.</p>
          <p>
            The more capable these systems become, the less I find myself valuing speed or execution
            alone.
          </p>
          <p>
            Instead, I keep coming back to the things no tool can decide for me: understanding people,
            choosing the right problems, setting priorities, and taking responsibility for
            consequences.
          </p>
          <p>Answers have become abundant. But abundance is not the same as meaning.</p>
          <p className="article-close">
            Judgment, context, empathy, and the ability to ask good questions remain remarkably scarce.
          </p>
        </div>

        <footer className="article-foot">
          <Link className="article-back" href="/#writing">
            <span aria-hidden="true">←</span> Back to writing
          </Link>
        </footer>
      </article>
    </main>
  );
}
