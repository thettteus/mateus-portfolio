import Layers, { type Layer } from './Layers';

export default function Depth() {
  const layers: Layer[] = [
    {
      short: 'Product',
      title: 'Shaping the product',
      items: ['Ambiguous problems', 'Stakeholder alignment', 'Product scoping', 'MVP definition', 'Prototyping', 'UX thinking'],
    },
    {
      short: 'Engineering',
      title: 'Designing & shipping',
      items: ['System design', 'Data modeling', 'APIs & SDKs', 'Full-stack delivery', 'RAG & agent workflows', 'Production ownership'],
    },
    {
      short: 'Platform',
      title: 'Building the tools that build',
      items: ['Internal platforms', 'Workflow automation', 'Agent infrastructure', 'Validation systems', 'Developer experience'],
    },
    {
      short: 'Operations',
      title: 'Running lean & secure',
      items: ['Cloud cost', 'Performance', 'Observability', 'Reliability', 'Hardening', 'Access & secrets'],
    },
  ];

  return (
    <section className="depth" id="depth" aria-labelledby="depth-title">
      <div className="container">
        <div className="dl-head wk-grid">
          <h2 id="depth-title">Problems cut across layers. <b>So do I.</b></h2>
        </div>
      </div>

      <Layers layers={layers} />
    </section>
  );
}
