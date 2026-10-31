'use client';
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';

// Full working range across my projects (Vorax, colplan, Plan Patagonia,
// Multi Agent Loop, go-kafka-sdk) and mateus_resume.pdf. `a` lists aliases
// (pipe-separated) so a search or a pasted job description finds the tool;
// `cs` is a case-sensitive pattern for names that are also common words.
type Tool = { name: string; a?: string; cs?: RegExp };
const AREAS: { name: string; tools: Tool[] }[] = [
  { name: 'Languages', tools: [
    { name: 'TypeScript', a: 'ts|javascript|js' }, { name: 'Python', a: 'py' },
    { name: 'Go', a: 'golang', cs: /\bGo\b|[Gg]olang/ }, { name: 'PHP' }, { name: 'Bash', a: 'shell|shell scripting' },
  ] },
  { name: 'Frameworks', tools: [
    { name: 'Node.js', a: 'node|nodejs|javascript|js' }, { name: 'React', a: 'reactjs', cs: /\bReact\b|[Rr]eact\.?[Jj][Ss]/ },
    { name: 'Next.js', a: 'nextjs' }, { name: 'FastAPI' }, { name: 'Prisma', a: 'orm' },
  ] },
  { name: 'Data', tools: [
    { name: 'PostgreSQL', a: 'postgres|psql|sql' }, { name: 'MySQL', a: 'sql' }, { name: 'Redis', a: 'cache|caching' },
    { name: 'Kafka', a: 'streaming|event streaming' }, { name: 'Polars', a: 'dataframes' },
    { name: 'Data pipelines', a: 'etl|data pipeline|data engineering' }, { name: 'Query optimization', a: 'sql|performance tuning' },
  ] },
  { name: 'Architecture', tools: [
    { name: 'Microservices', a: 'microservice' }, { name: 'Event-driven', a: 'event driven architecture|eda|events' },
    { name: 'Distributed systems', a: 'distributed system' }, { name: 'Background workers', a: 'queues|job queues|async jobs' },
    { name: 'SDKs', a: 'sdk' },
  ] },
  { name: 'Testing', tools: [
    { name: 'pytest', a: 'testing|unit tests' }, { name: 'Jest', a: 'testing|unit tests' }, { name: 'go test', a: 'testing|unit tests' },
    { name: 'Playwright', a: 'e2e|end to end|testing' }, { name: 'Selenium', a: 'e2e|testing' },
  ] },
  { name: 'Infrastructure', tools: [
    { name: 'Linux', a: 'unix' }, { name: 'AWS', a: 'amazon web services|cloud' }, { name: 'Docker', a: 'containers' },
    { name: 'Kubernetes', a: 'k8s' }, { name: 'Terraform', a: 'iac|infrastructure as code' }, { name: 'Cloudflare', a: 'cdn|edge' },
    { name: 'CI/CD', a: 'ci|cd|continuous integration|continuous delivery' },
  ] },
  { name: 'Observability', tools: [
    { name: 'Prometheus', a: 'monitoring|metrics' }, { name: 'Grafana', a: 'monitoring|dashboards' },
    { name: 'CloudWatch', a: 'monitoring|logs' }, { name: 'Observability', a: 'monitoring|tracing|logging' },
  ] },
  { name: 'AI', tools: [
    { name: 'LLM APIs', a: 'llm|llms|large language models|genai|generative ai' },
    { name: 'RAG', a: 'retrieval augmented generation|retrieval|vector search' },
    { name: 'LangGraph', a: 'agents|ai agents|langchain' }, { name: 'LangSmith', a: 'evals|langchain' },
    { name: 'Prompt engineering', a: 'prompting|prompts' }, { name: 'Tool calling', a: 'function calling|tool use' },
    { name: 'Structured outputs', a: 'json mode|structured output' }, { name: 'Embeddings', a: 'vectors|vector search|embedding' },
    { name: 'Code agents', a: 'agents|ai agents|coding agents' }, { name: 'MCP', a: 'model context protocol' },
  ] },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#]+/g, ' ').trim();
const squash = (s: string) => s.replace(/ /g, '');

type Entry = { id: string; area: number; name: string; terms: string[]; cs?: RegExp };
const TOOLS: Entry[] = AREAS.flatMap((area, r) =>
  area.tools.map((t, k) => ({
    id: `${r}-${k}`,
    area: r,
    name: t.name,
    terms: [t.name, ...(t.a ?? '').split('|').filter(Boolean)].map(norm),
    cs: t.cs,
  })),
);
const TOTAL = TOOLS.length;
const DEFAULT_CAP = `tools in ${AREAS.length} areas`;

// short queries: match the start of any word, name or alias
function prefixMatch(q: string) {
  const qn = norm(q);
  const qs = squash(qn);
  const hit = new Set<string>();
  if (!qn) return hit;
  TOOLS.forEach((t) => {
    if (t.terms.some((term) => term.startsWith(qn) || squash(term).startsWith(qs) || term.split(' ').some((w) => w.startsWith(qn)))) hit.add(t.id);
  });
  AREAS.forEach((area, r) => {
    if (norm(area.name).startsWith(qn)) TOOLS.forEach((t) => { if (t.area === r) hit.add(t.id); });
  });
  return hit;
}

// pasted text: whole words and phrases only, so "next steps" is not Next.js
function textMatch(text: string) {
  const padded = ` ${norm(text)} `;
  const hit = new Set<string>();
  TOOLS.forEach((t) => {
    if (t.cs) { if (t.cs.test(text)) hit.add(t.id); return; }
    if (t.terms.some((term) => padded.includes(` ${term} `) || padded.includes(` ${squash(term)} `))) hit.add(t.id);
  });
  return hit;
}

/**
 * TechStack — the tools index: a one-line-per-area list you can search, filter
 * by area, or paste a job description into to see what matches.
 */
export default function TechStack() {
  const input = useRef<HTMLInputElement>(null);
  const index = useRef<HTMLOListElement>(null);
  const [query, setQuery] = useState('');
  const [area, setArea] = useState<number | null>(null);
  const [anim, setAnim] = useState<'' | 'js-anim' | 'js-anim is-in'>('');
  const [shown, setShown] = useState(TOTAL);
  const shownRef = useRef(TOTAL);

  const showAll = () => { setQuery(''); setArea(null); input.current?.focus(); };
  const link = (label: string, onClick: () => void) => (
    <button className="link-btn" type="button" onClick={onClick}>{label}</button>
  );

  // what's matched, and how to report it
  const result = useMemo((): { hit: Set<string> | null; count: number; cap: string; extra?: ReactNode; hasHit?: boolean } => {
    const q = query;
    if (area !== null) {
      const hit = new Set(TOOLS.filter((t) => t.area === area).map((t) => t.id));
      return { hit, count: hit.size, cap: `tools in ${AREAS[area].name}.`, extra: 'all', hasHit: true };
    }
    if (!q.trim()) return { hit: null, count: TOTAL, cap: DEFAULT_CAP };
    const long = q.length > 40 || q.trim().split(/\s+/).length > 3;
    let hit = long ? textMatch(q) : prefixMatch(q);
    if (!long && hit.size === 0) hit = textMatch(q);
    const label = q.trim().length > 24 ? `${q.trim().slice(0, 24)}…` : q.trim();
    if (hit.size === 0) return { hit, count: 0, cap: `matches for “${label}”.`, extra: 'ask' };
    if (long) return { hit, count: hit.size, cap: `of ${TOTAL} found in your text.`, extra: 'all', hasHit: true };
    return { hit, count: hit.size, cap: `of ${TOTAL} ${hit.size === 1 ? 'tool matches' : 'tools match'} “${label}”.`, extra: 'all', hasHit: true };
  }, [query, area]);

  // the big number counts to its new value
  useEffect(() => {
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = result.count;
    if (calm) { shownRef.current = target; setShown(target); return; }
    const from = shownRef.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 450);
      shownRef.current = Math.round(from + (target - from) * (1 - (1 - k) ** 3));
      setShown(shownRef.current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [result.count]);

  // "/" jumps to the search from anywhere on the page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing = !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // rules draw and rows resolve once, when the index scrolls in
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !index.current) return;
    setAnim('js-anim');
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); setAnim('js-anim is-in'); }
    }, { threshold: 0.12 });
    io.observe(index.current);
    return () => io.disconnect();
  }, []);

  const { hit } = result;
  const filtering = hit !== null;
  const extra = result.extra === 'all'
    ? link('Show all', showAll)
    : result.extra === 'ask' ? <a href="#contact">Ask me about it.</a> : null;
  let i = 0; // running item index, for the stagger

  return (
    <div className="stk">
      <div className="stk-top">
        <h3 className="stk-title">What I build with.</h3>
        <div className="stk-panel">
          <div className="stk-search" role="search">
            <input
              ref={input}
              type="search"
              value={query}
              onChange={(e) => { setArea(null); setQuery(e.target.value); }}
              onKeyDown={(e) => { if (e.key === 'Escape') setQuery(''); }}
              aria-label="Search the stack or paste a job description"
              placeholder="Search, or paste a job description"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="stk-search-aside">
              {query ? link('Clear', () => { setQuery(''); input.current?.focus(); }) : <kbd aria-hidden="true">/</kbd>}
            </span>
          </div>
          <p className="stk-score">
            <span className={`stk-score-num${result.hasHit ? ' has-hit' : ''}`} aria-hidden="true">{shown}</span>
            <span className="stk-score-cap" aria-hidden="true">{result.cap}{extra}</span>
          </p>
          <p className="sr-only" aria-live="polite">{filtering ? `${result.count} ${result.cap}` : ''}</p>
        </div>
      </div>

      <ol className={`stk-index ${anim}${filtering ? ' is-filtering' : ''}`} ref={index}>
        {AREAS.map((a, r) => {
          const tools = TOOLS.filter((t) => t.area === r);
          const m = hit ? tools.filter((t) => hit.has(t.id)).length : 0;
          return (
            <li className={`stk-row${m > 0 ? ' has-match' : ''}`} key={a.name} style={{ '--r': r } as CSSProperties}>
              <button
                className="stk-row-head"
                type="button"
                aria-pressed={area === r}
                style={{ '--k': 0 } as CSSProperties}
                onClick={() => { setQuery(''); setArea(area === r ? null : r); }}
              >
                <span className="stk-row-name">{a.name}</span>
                <span className="stk-row-count" aria-hidden="true">{hit ? `${m}/${tools.length}` : tools.length}</span>
              </button>
              <p className="stk-row-tools">
                {tools.map((t, k) => (
                  <Fragment key={t.id}>
                    <span
                      className={`stk-item${hit?.has(t.id) ? ' is-match' : ''}`}
                      style={{ '--i': i++, '--k': k + 1 } as CSSProperties}
                    >
                      <span className="stk-t">{t.name}</span>{k < tools.length - 1 ? ',' : ''}
                    </span>
                    {k < tools.length - 1 ? ' ' : ''}
                  </Fragment>
                ))}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
