import Image from 'next/image';
import { FadeIn } from '@/components/ui/FadeIn';
import WorkCases, { type WorkCase } from './WorkCases';

type Project = Omit<WorkCase, 'status'> & {
  repo?: string; // shows "Last commit …" from GitHub
  note?: string; // fixed status, wins over the commit date
};

const shot = (src: string, alt: string) => (
  <Image src={src} alt={alt} width={3024} height={1470} sizes="(max-width: 959px) calc(100vw - 48px), (max-width: 1240px) 55vw, 680px" unoptimized />
);

// go-kafka-sdk reads better as its shape than as a screenshot
const kafkaDiagram = (
  <svg viewBox="0 0 560 330" role="img" aria-label="Diagram: Go producer and consumer services call go-kafka-sdk, which sends and receives messages through the Kafka cluster">
    <defs><marker id="wk-ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path className="dg-head" d="M0 0 L8 4 L0 8 z" /></marker></defs>
    <rect className="dg-box" x="1" y="1" width="558" height="82" rx="6" strokeDasharray="3 4" />
    <text className="dg-s" x="16" y="22">Your application</text>
    <rect className="dg-node" x="40" y="34" width="200" height="36" rx="4" />
    <text className="dg-t" x="140" y="57" textAnchor="middle">Go service, producer</text>
    <rect className="dg-node" x="320" y="34" width="200" height="36" rx="4" />
    <text className="dg-t" x="420" y="57" textAnchor="middle">Go service, consumer</text>

    <path className="dg-arrow" d="M140 70 V140" markerEnd="url(#wk-ah)" />
    <path className="dg-arrow" d="M420 70 V140" markerEnd="url(#wk-ah)" />
    <text className="dg-m" x="150" y="98">NewProducer()</text>
    <text className="dg-m" x="150" y="114">producer.Produce()</text>
    <text className="dg-m" x="430" y="98">NewConsumer()</text>
    <text className="dg-m" x="430" y="114">consumer.Consume()</text>

    <rect className="dg-sdk" x="1" y="146" width="558" height="82" rx="6" />
    <text className="dg-a" x="16" y="167">go-kafka-sdk</text>
    <rect className="dg-sdk-node" x="40" y="178" width="200" height="36" rx="4" />
    <text className="dg-t" x="140" y="201" textAnchor="middle">Producer API</text>
    <rect className="dg-sdk-node" x="320" y="178" width="200" height="36" rx="4" />
    <text className="dg-t" x="420" y="201" textAnchor="middle">Consumer API</text>

    <path className="dg-arrow" d="M140 214 V250 Q140 266 156 266 H222" markerEnd="url(#wk-ah)" />
    <path className="dg-arrow" d="M338 280 H404 Q420 280 420 264 V222" markerEnd="url(#wk-ah)" />
    <text className="dg-s" x="150" y="252">sends message</text>
    <text className="dg-s" x="430" y="252">receives message</text>

    <rect className="dg-node" x="226" y="254" width="108" height="40" rx="4" />
    <text className="dg-t" x="280" y="279" textAnchor="middle">Kafka cluster</text>
  </svg>
);

const projects: Project[] = [
  {
    id: 'wee',
    name: 'Workflow Execution Engine',
    role: 'Open source, thesis',
    type: 'Engineering platform',
    live: true,
    lead: 'From engineering knowledge to executable workflows. WEE runs versioned, replayable AI pipelines with explicit budgets. Already used to review and open real pull requests, end to end.',
    call: {
      label: 'Key call',
      text: <><code>core/tool/git</code> deliberately has no push op. Landing a fix on GitHub goes through the generic http tool speaking GitHub’s own Git Data API, instead of a one-off integration bolted onto git.</>,
    },
    stack: ['Go', 'TypeScript', 'JSON Schema', 'LLM APIs'],
    repo: 'thettteus/workflow-execution-engine',
    links: [
      { label: 'GitHub', href: 'https://github.com/thettteus/workflow-execution-engine' },
      { label: 'Case study', href: 'https://github.com/thettteus/workflow-execution-engine/blob/main/docs/CASE-STUDY.md' },
      { label: 'Architecture', href: 'https://github.com/thettteus/workflow-execution-engine/blob/main/docs/ARCHITECTURE.md' },
      { label: 'ADRs', href: 'https://github.com/thettteus/workflow-execution-engine/tree/main/docs/adr' },
      { label: 'Vision', href: 'https://github.com/thettteus/workflow-execution-engine/blob/main/docs/VISION.md' },
    ],
    media: shot('/assets/projects/wee.avif', 'Workflow Execution Engine project preview'),
    mediaClass: 'is-dark',
  },
  {
    id: 'pat',
    name: 'Plan Patagonia',
    role: 'Product & Technical Founder',
    type: 'Travel tech, 0 to 1',
    live: true,
    note: 'Launched Aug 2026',
    lead: 'A live travel platform bringing destinations, trails, stays, experiences, and practical travel tools into one Patagonia planning experience.',
    call: { label: 'My role', text: 'I led product strategy, experience design, and engineering, taking Plan Patagonia from concept to launch.' },
    stack: ['TypeScript', 'Next.js', 'Prisma', 'Neon Postgres', 'Claude API'],
    links: [{ label: 'Visit site', href: 'https://planpatagonia.com/' }],
    media: shot('/assets/projects/plan_patagonia.avif', 'Plan Patagonia project preview'),
  },
  {
    id: 'kafka',
    name: 'go-kafka-sdk',
    role: 'Open source',
    type: 'Backend tooling',
    lead: 'Every Kafka service re-implements the same connection, retry and error handling, each with its own bugs. This SDK packages those patterns once, so services ship events instead of plumbing.',
    call: {
      label: 'Key call',
      text: <>Defaults to <code>acks=all</code> and <code>auto.offset.reset=earliest</code>: safe out of the box, one config map away from full librdkafka control.</>,
    },
    stack: ['Go', 'Apache Kafka'],
    repo: 'thettteus/go-kafka-sdk',
    links: [{ label: 'GitHub', href: 'https://github.com/thettteus/go-kafka-sdk' }],
    media: kafkaDiagram,
    mediaClass: 'is-diagram',
  },
];

async function lastCommit(repo: string): Promise<string | undefined> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : undefined,
      next: { revalidate: 60 },
    });
    if (!res.ok) return undefined;
    const { pushed_at } = await res.json();
    if (!pushed_at) return undefined;
    const d = new Date(pushed_at);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(d.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }),
    });
  } catch {
    return undefined;
  }
}

export default async function Projects() {
  const commits = await Promise.all(
    projects.map(p => (p.repo ? lastCommit(p.repo) : Promise.resolve(undefined)))
  );
  const cases: WorkCase[] = projects.map((p, i) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    type: p.type,
    live: p.live,
    status: p.note ?? (commits[i] && `Last commit ${commits[i]}`),
    lead: p.lead,
    call: p.call,
    stack: p.stack,
    links: p.links,
    media: p.media,
    mediaClass: p.mediaClass,
  }));

  return (
    <section className="projects" id="projects">
      <div className="container">
        <FadeIn as="header" className="wk-top wk-grid">
          <h2>Selected work.</h2>
          <p className="wk-note">Products, platforms, and the engineering behind them.</p>
        </FadeIn>

        <WorkCases cases={cases} />
      </div>
    </section>
  );
}
