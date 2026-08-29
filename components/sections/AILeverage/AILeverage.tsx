'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { FadeIn } from '@/components/ui/FadeIn';

/* ── refraction motif geometry ──────────────────────────────────────────
   scattered possibilities converge at the prism's left vertex; judgment
   focuses them into one accent beam → directed impact. Only the chosen path
   and the outcome carry the signature: the possibilities are graphite, so the
   color marks the decision rather than the noise it was picked out of. Their
   scatter is carried by value — each ray sits at its own point between
   --ink-4 and --ink, which keeps both themes legible where a fixed hex
   would vanish on one of them. */
const CX = 300;
const CY = 250;
const PRISM = {
  T: [358, 166], // top apex
  R: [416, 250], // right vertex (beam exit)
  B: [358, 334], // bottom apex
  L: [300, 250], // left vertex (convergence)
  F: [358, 268], // front vertex (3D facet)
};
const IMPACT_X = 720;

/* t = position on the graphite ramp between --ink-4 (faint) and --ink */
const RAY_DEFS: { a: number; l: number; t: number }[] = [
  { a: -38, l: 196, t: 0.55 },
  { a: -31, l: 232, t: 0.8 },
  { a: -24, l: 250, t: 1 },
  { a: -17, l: 212, t: 0.5 },
  { a: -9, l: 244, t: 0.72 },
  { a: -2, l: 224, t: 0.34 },
  { a: 6, l: 250, t: 0.92 },
  { a: 13, l: 214, t: 0.45 },
  { a: 20, l: 242, t: 0.66 },
  { a: 28, l: 206, t: 0.28 },
  { a: 35, l: 232, t: 0.6 },
  { a: 41, l: 190, t: 0.86 },
];
const RAY_SCALE = 1.28; // longer threads, reaching further left
const RAYS = RAY_DEFS.map(({ a, l, t }) => {
  const r = (a * Math.PI) / 180;
  const L = l * RAY_SCALE;
  return {
    x: +(CX - L * Math.cos(r)).toFixed(1),
    y: +(CY + L * Math.sin(r)).toFixed(1),
    c: `color-mix(in srgb, var(--ink) ${Math.round(t * 100)}%, var(--ink-4))`,
  };
});

const STAGES: { x: number; k: string; s: [string, string] }[] = [
  { x: 177, k: 'POSSIBILITIES', s: ['AI expands', 'the frontier'] },
  { x: 358, k: 'JUDGMENT', s: ['I bring focus,', 'context, and taste'] },
  { x: 539, k: 'DIRECTION', s: ['One path', 'chosen'] },
  { x: 720, k: 'IMPACT', s: ['Outcomes that', 'move the business'] },
];

export default function AILeverage() {
  const svgRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const outline = `M${PRISM.L} L${PRISM.T} L${PRISM.R} L${PRISM.B} Z`;
  return (
    <section className={`ai-edge${shown ? ' is-in' : ''}`} id="ai">
      <div className="container">
        <FadeIn as="header" className="sec-head">
          <div className="sec-eyebrow">
            <span className="num">04</span>
            <span className="lbl">Working with leverage</span>
          </div>
          <h2>
            Generating options is easy now. <em>Choosing is the job.</em>
          </h2>
          <p className="sub">
            AI creates countless possibilities. My job is to bring judgment, context, and responsibility to choose the path that creates real impact.
          </p>
        </FadeIn>

        <FadeIn className="ai-flow" delay={0.1}>
          <div ref={svgRef}>
          <svg
              className="ai-flow-svg"
              viewBox="-16 20 896 410"
              role="img"
              aria-label="AI expands possibilities; judgment focuses them into one direction that drives business impact."
            >
              {/* scattered possibilities → convergence */}
              <g className="ai-rays">
                {RAYS.map((r, i) => (
                  <g key={i}>
                    <line x1={r.x} y1={r.y} x2={CX} y2={CY} stroke={r.c} strokeWidth="1.7" strokeLinecap="round" opacity="0.5" pathLength={1} />
                    <circle cx={r.x} cy={r.y} r="3" fill={r.c} opacity="0.9" />
                  </g>
                ))}
              </g>

              {/* prism — line-art crystal, lines only (no fill) */}
              <path className="prism-edge" d={outline} pathLength={1} style={{ '--pe': 0 } as CSSProperties} />
              <path className="prism-edge" d={`M${PRISM.F} L${PRISM.T}`} pathLength={1} style={{ '--pe': 1 } as CSSProperties} />
              <path className="prism-edge" d={`M${PRISM.F} L${PRISM.R}`} pathLength={1} style={{ '--pe': 2 } as CSSProperties} />
              <path className="prism-edge" d={`M${PRISM.F} L${PRISM.B}`} pathLength={1} style={{ '--pe': 3 } as CSSProperties} />
              <path className="prism-edge" d={`M${PRISM.F} L${PRISM.L}`} pathLength={1} style={{ '--pe': 4 } as CSSProperties} />

              {/* focused beam → impact */}
              <line className="beam" x1={PRISM.R[0]} y1={PRISM.R[1]} x2={IMPACT_X} y2={CY} pathLength={1} />

              {/* impact — rings fade in when beam lands, ping fires once */}
              <g className="impact-rings">
                <circle className="ring" cx={IMPACT_X} cy={CY} r="58" opacity="0.28" />
                <circle className="ring" cx={IMPACT_X} cy={CY} r="38" opacity="0.5" />
                <circle className="ring" cx={IMPACT_X} cy={CY} r="18" opacity="0.8" />
              </g>
              <circle className="impact-ping" cx={IMPACT_X} cy={CY} r="6" />
              <circle className="impact-dot" cx={IMPACT_X} cy={CY} r="5.5" />

              {/* stage labels */}
              {STAGES.map(({ x, k, s }) => (
                <g key={k}>
                  <text className="flow-k" x={x} y={64} textAnchor="middle">{k}</text>
                  <text className="flow-sub" x={x} y={88} textAnchor="middle">
                    <tspan x={x}>{s[0]}</tspan>
                    <tspan x={x} dy="16">{s[1]}</tspan>
                  </text>
                </g>
              ))}
            </svg>
            {/* mobile: svg labels get too small when the diagram scales down,
                so the stages read as an HTML strip under the diagram */}
            <div className="ai-flow-stages" aria-hidden="true">
              {STAGES.map(({ k }, i) => (
                <span key={k}>
                  {k}
                  {i < STAGES.length - 1 && <i>→</i>}
                </span>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
