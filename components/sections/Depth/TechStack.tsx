'use client';
import { useEffect, useRef, useState } from 'react';

type Tool = { name: string };
const AREAS: { name: string; tools: Tool[] }[] = [
  {
    name: 'Languages',
    tools: [
      { name: 'TypeScript' },
      { name: 'Python' },
      { name: 'Go' },
      { name: 'PHP' },
      { name: 'Bash' },
    ],
  },
  {
    name: 'Frameworks',
    tools: [
      { name: 'Node.js' },
      { name: 'React' },
      { name: 'Next.js' },
      { name: 'FastAPI' },
      { name: 'Prisma' },
    ],
  },
  {
    name: 'Data',
    tools: [
      { name: 'PostgreSQL' },
      { name: 'MySQL' },
      { name: 'Redis' },
      { name: 'Kafka' },
      { name: 'Polars' },
      { name: 'Data pipelines' },
      { name: 'Query optimization' },
    ],
  },
  {
    name: 'Architecture',
    tools: [
      { name: 'Microservices' },
      { name: 'Event-driven' },
      { name: 'Distributed systems' },
      { name: 'Background workers' },
      { name: 'SDKs' },
    ],
  },
  {
    name: 'Testing',
    tools: [
      { name: 'pytest' },
      { name: 'Jest' },
      { name: 'go test' },
      { name: 'Playwright' },
      { name: 'Selenium' },
    ],
  },
  {
    name: 'Infrastructure',
    tools: [
      { name: 'Linux' },
      { name: 'AWS' },
      { name: 'Docker' },
      { name: 'Kubernetes' },
      { name: 'Terraform' },
      { name: 'Cloudflare' },
      { name: 'CI/CD' },
    ],
  },
  {
    name: 'Observability',
    tools: [
      { name: 'Prometheus' },
      { name: 'Grafana' },
      { name: 'CloudWatch' },
      { name: 'Observability' },
    ],
  },
  {
    name: 'AI',
    tools: [
      { name: 'LLM APIs' },
      { name: 'RAG' },
      { name: 'LangGraph' },
      { name: 'LangSmith' },
      { name: 'Prompt engineering' },
      { name: 'Tool calling' },
      { name: 'Structured outputs' },
      { name: 'Embeddings' },
      { name: 'Code agents' },
      { name: 'MCP' },
    ],
  },
];

type Entry = { id: string; area: number; name: string };
const TOOLS: Entry[] = AREAS.flatMap((area, r) =>
  area.tools.map((t, k) => ({
    id: `${r}-${k}`,
    area: r,
    name: t.name,
  })),
);
// Interleave disciplines so the field reads as one composition. The index
// above it reveals which tools belong together without rearranging them.
const FIELD_TOOLS = [...TOOLS].sort(
  (a, b) => Number(a.id.split('-')[1]) - Number(b.id.split('-')[1]) || a.area - b.area,
);
const KEY_TOOLS = new Set(['TypeScript', 'Go', 'React', 'PostgreSQL', 'Kafka', 'AWS', 'LLM APIs']);
const TOTAL = TOOLS.length;
const DEFAULT_CAP = `tools across ${AREAS.length} areas.`;

/** A fixed typographic field; scrolling changes its focus, never its layout. */
export default function TechStack() {
  const field = useRef<HTMLUListElement>(null);
  const [area, setArea] = useState<number | null>(0);
  const [preview, setPreview] = useState<number | null>(null);
  const activeArea = preview ?? area;

  const hit =
    activeArea === null
      ? null
      : new Set(TOOLS.filter((t) => t.area === activeArea).map((t) => t.id));
  const count = hit?.size ?? TOTAL;
  const cap = activeArea === null ? DEFAULT_CAP : `tools in ${AREAS[activeArea].name}.`;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setArea((current) => (current === null ? 0 : (current + 1) % AREAS.length));
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const el = field.current;
    if (!el) return;
    const words = [...el.querySelectorAll<HTMLElement>('.stk-word')];
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let points: { el: HTMLElement; position: number; last: string }[] = [];
    let visible = false,
      disposed = false,
      raf = 0,
      previous = 0;
    let current = 0,
      target = 0;
    const clamp = (v: number) => Math.min(1, Math.max(0, v));

    const paint = () => {
      const center = -0.3 + current * 1.6;
      points.forEach((point) => {
        const distance = Math.abs(point.position - center) / 0.3;
        const t = clamp(1 - distance);
        const focus = motion.matches ? 1 : t * t * (3 - 2 * t);
        const value = focus.toFixed(3);
        if (point.last === value) return;
        point.el.style.setProperty('--focus', value);
        point.last = value;
      });
    };
    const frame = (now: number) => {
      raf = 0;
      if (disposed) return;
      const dt = previous ? Math.min(64, now - previous) : 16;
      previous = now;
      current =
        motion.matches || Math.abs(target - current) < 0.001
          ? target
          : current + (target - current) * (1 - Math.exp(-dt / 85));
      paint();
      if (visible && !motion.matches && Math.abs(target - current) >= 0.001)
        raf = requestAnimationFrame(frame);
      else previous = 0;
    };
    const wake = () => {
      if (!raf && !disposed) raf = requestAnimationFrame(frame);
    };
    const update = () => {
      const r = el.getBoundingClientRect();
      target = clamp((innerHeight * 0.85 - r.top) / (innerHeight * 0.7 + r.height));
      if (visible || motion.matches) wake();
    };
    const measure = () => {
      const r = el.getBoundingClientRect();
      points = words.map((word) => {
        const w = word.getBoundingClientRect();
        const x = (w.left - r.left + w.width / 2) / Math.max(1, r.width);
        const y = (w.top - r.top + w.height / 2) / Math.max(1, r.height);
        return { el: word, position: x * 0.62 + y * 0.38, last: '' };
      });
      update();
      paint();
    };
    const seen = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) update();
        else {
          cancelAnimationFrame(raf);
          raf = 0;
          previous = 0;
        }
      },
      { rootMargin: '80px' },
    );
    const resized = new ResizeObserver(measure);
    resized.observe(el);
    seen.observe(el);
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', measure);
    motion.addEventListener('change', measure);
    document.fonts.ready.then(() => {
      if (!disposed) measure();
    });
    measure();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      seen.disconnect();
      resized.disconnect();
      removeEventListener('scroll', update);
      removeEventListener('resize', measure);
      motion.removeEventListener('change', measure);
    };
  }, []);

  return (
    <section className="stk" id="toolkit" aria-labelledby="stack-title">
      <div className="container">
        <header className="stk-head">
          <h2 id="stack-title">What I build with.</h2>
        </header>

        <nav
          className="stk-areas"
          aria-label="Highlight tools by area"
          onPointerLeave={() => setPreview(null)}
        >
          {AREAS.map((a, r) => (
            <button
              key={a.name}
              type="button"
              className={activeArea === r ? 'is-active' : undefined}
              aria-pressed={area === r}
              aria-controls="stack-tools"
              onPointerEnter={(e) => {
                if (e.pointerType === 'mouse') setPreview(r);
              }}
              onFocus={(e) => {
                if (e.currentTarget.matches(':focus-visible')) setPreview(r);
              }}
              onBlur={() => setPreview(null)}
              onClick={() => {
                setArea(r);
              }}
            >
              {a.name}
            </button>
          ))}
        </nav>

        <ul
          className={`stk-field${hit ? ' is-filtering' : ''}`}
          id="stack-tools"
          ref={field}
          aria-label="Tools across eight areas"
        >
          {FIELD_TOOLS.map((t) => (
            <li
              className={`stk-word${KEY_TOOLS.has(t.name) ? ' is-key' : ''}${hit?.has(t.id) ? ' is-match' : ''}`}
              key={t.id}
              data-area={AREAS[t.area].name}
              aria-label={`${t.name}, ${AREAS[t.area].name}`}
            >
              {t.name}
            </li>
          ))}
        </ul>

        <p className="stk-status" role="status" aria-live="off" aria-atomic="true">
          <span>{count}</span> {cap}
        </p>
      </div>
    </section>
  );
}
