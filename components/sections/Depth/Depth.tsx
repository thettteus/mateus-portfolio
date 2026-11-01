import { FadeIn } from '@/components/ui/FadeIn';
import RangeStack, { type RangeLayer } from './RangeStack';
import TechStack from './TechStack';

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

  return (
    <section className="depth" id="depth">
      <div className="container">
        <FadeIn as="header" className="sec-head">
          <div className="sec-eyebrow">
            <span className="lbl">The range</span>
          </div>
          <h2>Problems cut across layers. <em>So do I.</em></h2>
        </FadeIn>

        <RangeStack layers={layers} />

        <TechStack />
      </div>
    </section>
  );
}
