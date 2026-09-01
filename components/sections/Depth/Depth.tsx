import { FadeIn } from '@/components/ui/FadeIn';
import { StaggerGrid, StaggerItem } from '@/components/ui/StaggerGrid';
import { IsoLayer } from '@/components/ui/generative/IsoLayer';
import { type LineArtVariant } from '@/components/ui/generative/LineArt';

export default function Depth() {
  const layers: {
    ix: string;
    title: string;
    items: string[];
    art: LineArtVariant;
  }[] = [
    {
      ix: '01',
      title: 'Shaping the product',
      items: ['Ambiguous problems', 'Stakeholder alignment', 'Product scoping', 'MVP definition', 'Prototyping', 'UX thinking'],
      art: 'discovery',
    },
    {
      ix: '02',
      title: 'Designing the architecture',
      items: ['System design', 'Data modeling', 'APIs & SDKs', 'Event-driven systems', 'Multi-tenant scale', 'Technical trade-offs'],
      art: 'architecture',
    },
    {
      ix: '03',
      title: 'Building & shipping',
      items: ['Full-stack delivery', 'Cloud', 'Data workflows', 'RAG & agent workflows', 'Model selection', 'Production ownership'],
      art: 'engineering',
    },
    {
      ix: '04',
      title: 'Building the tools that build',
      items: ['Internal platforms', 'Workflow automation', 'SDKs & templates', 'Agent infrastructure', 'Validation systems', 'Developer experience'],
      art: 'harness',
    },
    {
      ix: '05',
      title: 'Running lean at scale',
      items: ['Cloud cost', 'SQL optimization', 'Latency', 'Performance', 'Observability', 'Reliability'],
      art: 'scale',
    },
    {
      ix: '06',
      title: 'Securing the system',
      items: ['Threat modeling', 'Pentest', 'Hardening', 'Audits & compliance', 'Access & secrets', 'Secure defaults'],
      art: 'security',
    },
  ];

  // Full working range across my projects (Vorax, colplan, Plan Patagonia,
  // Multi Agent Loop, go-kafka-sdk) and mateus_resume.pdf.
  const technologies = [
    // Languages & frameworks
    { name: 'TypeScript' }, { name: 'Node.js' }, { name: 'React' }, { name: 'Next.js' },
    { name: 'Python' }, { name: 'FastAPI' }, { name: 'Go' }, { name: 'PHP' },
    // Data
    { name: 'PostgreSQL' }, { name: 'MySQL' }, { name: 'Prisma' }, { name: 'Redis' },
    { name: 'Kafka' }, { name: 'Polars' }, { name: 'Data pipelines' }, { name: 'Query optimization' },
    // Systems
    { name: 'Microservices' }, { name: 'Event-driven' }, { name: 'Distributed systems' },
    { name: 'Background workers' }, { name: 'SDKs' },
    // Quality
    { name: 'pytest' }, { name: 'Jest' }, { name: 'go test' }, { name: 'Playwright' },
    { name: 'Selenium' },
    // Cloud & ops
    { name: 'Linux' }, { name: 'Bash' }, { name: 'AWS' }, { name: 'Docker' },
    { name: 'Kubernetes' }, { name: 'Terraform' }, { name: 'Cloudflare' }, { name: 'CI/CD' },
    { name: 'Prometheus' }, { name: 'Grafana' }, { name: 'CloudWatch' }, { name: 'Observability' },
    // AI
    { name: 'LLM APIs' }, { name: 'RAG' }, { name: 'LangGraph' }, { name: 'LangSmith' },
    { name: 'Prompt engineering' }, { name: 'Tool calling' }, { name: 'Structured outputs' },
    { name: 'Embeddings' }, { name: 'Code agents' }, { name: 'MCP' },
  ];

  return (
    <section className="depth" id="depth">
      <div className="container">
        <FadeIn as="header" className="sec-head">
          <div className="sec-eyebrow">
            <span className="num">01</span>
            <span className="lbl">The range</span>
          </div>
          <h2>Problems cut across layers. <em>So do I.</em></h2>
        </FadeIn>

        <div className="iso-module">
          <StaggerGrid className="iso-stack">
            {layers.map(({ ix, title, items, art }, i) => {
              const side = i % 2 === 0 ? 'left' : 'right';
              const label = (
                <div className="iso-label">
                  <span className="db-ix">{ix}</span>
                  <h3 className="db-title">{title}</h3>
                  <ul className="db-items">
                    {items.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              );
              return (
                <StaggerItem className={`iso-layer side-${side}`} key={ix}>
                  <div className="iso-cell iso-cell-l">{side === 'left' && label}</div>
                  <div className="iso-cell iso-cell-c">
                    <IsoLayer variant={art} />
                  </div>
                  <div className="iso-cell iso-cell-r">{side === 'right' && label}</div>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        </div>

        <FadeIn className="depth-feed">
          <span className="df-label">Stack</span>
          <ul className="df-list">
            {technologies.map(({ name }) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </FadeIn>
      </div>
    </section>
  );
}
