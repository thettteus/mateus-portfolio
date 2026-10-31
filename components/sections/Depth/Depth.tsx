import { FadeIn } from '@/components/ui/FadeIn';
import RangeStack, { type RangeLayer } from './RangeStack';

export default function Depth() {
  const layers: RangeLayer[] = [
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

        <RangeStack layers={layers} />

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
