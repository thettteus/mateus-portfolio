import { FadeIn } from '@/components/ui/FadeIn';
import SystemWalkthrough from './SystemWalkthrough';

export default function Process() {
  return (
    <section className="process" id="process">
      <div className="container">
        <FadeIn as="header" className="sec-head">
          <div className="sec-eyebrow">
            <span className="lbl">Process</span>
          </div>
          <h2>Not just the code, <em>the whole system.</em></h2>
          <p className="sub">
            Five layers between a rough idea and a working system. I own all of them, so nothing gets lost in a hand-off.
          </p>
        </FadeIn>

        <FadeIn>
          <SystemWalkthrough />
        </FadeIn>
      </div>
    </section>
  );
}
