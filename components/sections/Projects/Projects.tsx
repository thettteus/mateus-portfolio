import { FadeIn } from '@/components/ui/FadeIn';

type ProjectLink = {
  label: string;
  href: string;
};

type Project = {
  name: string;
  kind: string;
  area: string;
  intent: string;
  decision?: string;
  stack: string[];
  href?: string;
  linkLabel?: string;
  links?: ProjectLink[];
  repo?: string;
  note?: string;
};

const projects: Project[] = [
  {
    name: 'Workflow Execution Engine',
    kind: 'Open source · Thesis',
    area: 'Engineering platform',
    intent: 'Engineering knowledge lives in docs and people’s heads. WEE turns well-defined workflows into versioned, replayable, budgeted pipelines, and the engine owns the loops, not the model. It has already reviewed a real PR and opened a real pull request on a public repo, end to end.',
    decision: 'core/tool/git deliberately has no push op. Landing a fix on GitHub goes through the generic http tool speaking GitHub’s own Git Data API directly, instead of a one-off integration bolted onto git.',
    stack: ['Go', 'TypeScript', 'JSON Schema', 'LLM APIs'],
    repo: 'thettteus/workflow-execution-engine',
    links: [
      { label: 'GitHub', href: 'https://github.com/thettteus/workflow-execution-engine' },
      { label: 'Case study', href: 'https://github.com/thettteus/workflow-execution-engine/blob/main/docs/CASE-STUDY.md' },
      { label: 'Architecture', href: 'https://github.com/thettteus/workflow-execution-engine/blob/main/docs/ARCHITECTURE.md' },
      { label: 'ADRs', href: 'https://github.com/thettteus/workflow-execution-engine/tree/main/docs/adr' },
      { label: 'Vision', href: 'https://github.com/thettteus/workflow-execution-engine/blob/main/docs/VISION.md' },
    ],
  },
  {
    name: 'Plan Patagonia',
    kind: 'Co-founder · 0→1',
    area: 'Travel tech',
    intent: 'Planning a Patagonia trek means stitching together forums, stale blogs and guesswork. Plan Patagonia makes it one reliable place to decide. I co-founded it and built the whole platform, architecture to launch.',
    stack: ['TypeScript', 'Next.js', 'Prisma', 'Neon Postgres', 'Claude API'],
    href: 'https://planpatagonia.com/',
    linkLabel: 'Visit site',
    note: 'Launching Aug 2026',
  },
  {
    name: 'go-kafka-sdk',
    kind: 'Open source',
    area: 'Backend tooling',
    intent: 'Every Kafka service re-implements the same connection, retry and error handling, each with its own bugs. This SDK packages those patterns once, so services ship events instead of plumbing.',
    decision: 'Defaults to acks=all and auto.offset.reset=earliest: safe out of the box, one config map away from full librdkafka control.',
    stack: ['Go', 'Apache Kafka'],
    href: 'https://github.com/thettteus/go-kafka-sdk',
    repo: 'thettteus/go-kafka-sdk',
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

  return (
    <section className="projects" id="projects">
      <div className="container">
        <FadeIn as="header" className="sec-head">
          <div className="sec-eyebrow">
            <span className="num">02</span>
            <span className="lbl">Projects</span>
          </div>
          <h2>What I’m building <em>right now.</em></h2>
        </FadeIn>

        <div className="writing-list">
          {projects.map(({ name, kind, area, intent, decision, stack, href, linkLabel, links, note }, i) => {
            const label = linkLabel ?? 'GitHub';
            const pulse = note ?? (commits[i] && `Last commit ${commits[i]}`);
            const arrow = (
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 11L11 3M5 3h6v6" />
              </svg>
            );
            const body = (
              <div className="ac-body">
                <div className="ac-meta">
                  <span>{kind}</span>
                  <span>{area}</span>
                  {pulse && <span className="ac-pulse">{pulse}</span>}
                </div>
                <h3>{name}</h3>
                <p className="ac-dek">{intent}</p>
                {decision && (
                  <p className="ac-decision">
                    <span>Key call</span>
                    {decision}
                  </p>
                )}
                <div className="proj-stack">
                  {stack.map(t => <span className="t" key={t}>{t}</span>)}
                </div>
                {links ? (
                  <div className="ac-links">
                    {links.map(l => (
                      <a className="ac-read" key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={`${name} — ${l.label}`}>
                        {l.label}
                        {arrow}
                      </a>
                    ))}
                  </div>
                ) : href ? (
                  <span className="ac-read">
                    {label}
                    {arrow}
                  </span>
                ) : null}
              </div>
            );
            return (
              <FadeIn as="article" className="article-card" key={name}>
                {!links && href ? (
                  <a className="ac-link" href={href} target="_blank" rel="noopener noreferrer" aria-label={`${name} — ${label}`}>
                    {body}
                  </a>
                ) : (
                  body
                )}
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
