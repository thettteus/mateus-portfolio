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
      title: 'Designing & shipping',
      items: ['System design', 'Data modeling', 'APIs & SDKs', 'Full-stack delivery', 'RAG & agent workflows', 'Production ownership'],
      art: 'architecture',
    },
    {
      ix: '03',
      title: 'Building the tools that build',
      items: ['Internal platforms', 'Workflow automation', 'Agent infrastructure', 'Validation systems', 'Developer experience'],
      art: 'harness',
    },
    {
      ix: '04',
      title: 'Running lean & secure',
      items: ['Cloud cost', 'Performance', 'Observability', 'Reliability', 'Hardening', 'Access & secrets'],
      art: 'scale',
    },
  ];

  return (
    <section className="depth" id="depth">
      <div className="container">
        <RangeStack
          layers={layers}
          head={<h2>Problems cut across layers. <b>So do I.</b></h2>}
        />

        <TechStack />
      </div>
    </section>
  );
}
