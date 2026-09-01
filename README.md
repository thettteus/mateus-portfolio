# Matt P. S. — Product Engineer portfolio

I build the systems that let products ship faster — not a list of skills, but the leverage
behind them. Every project card is a proof point: a real repo, a real trade-off, a real decision.
Built fast with AI in the loop; finished slow by hand.

## Stack

- **Next.js 15** (App Router, static generation) + **React 19** + **TypeScript**
- **SCSS design system** — one token-driven file, light/dark themes, no CSS-in-JS
- **Framer Motion** for scroll reveals and staggered entrances (respects `prefers-reduced-motion`)
- Helvetica system font throughout — no separate display/mono web fonts

## Sections

Hero → Marquee → Depth (range across the stack) → Projects (public/open-source work, framed as
problem → decision → impact) → Process (how I work, end to end) → AI Leverage (judgment vs.
AI-driven speed, and the harness that scales it) → Writing (long-form) → Contact. Plus one
standalone article route under `/writing/[slug]`.

## Details that matter

- Every generative diagram — the isometric stack in Depth, the orbit walkthrough in Process, the
  refraction motif in AI Leverage — is hand-built SVG/CSS, no stock art or charting library
- The Hero's real GitHub commit graph pulls live from the GitHub GraphQL API — proof, not
  decoration. Falls back to a generative plus-grid when no `GITHUB_TOKEN` is configured
- Theme switch with zero flash — inline script resolves the theme before first paint
- JSON-LD, OpenGraph, sitemap, semantic landmarks — SEO and accessibility as features, not afterthoughts
- ~155 kB first load, fully static

## Run

```bash
npm install
npm run dev        # content edits
npm run dev:clean  # after structural file changes (clears .next)
```

Deployed on [Vercel](https://vercel.com).
