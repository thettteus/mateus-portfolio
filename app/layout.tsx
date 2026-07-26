import '@/styles/main.scss';
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbfc' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL('https://mateusps.vercel.app'),
  title: 'Mateus P. S. — Product Engineer',
  description:
    'Product engineer building the systems that let products ship faster: from ambiguous problems to production, across backend, AI, data, and product. The proof is real repos, architecture decisions, and trade-offs, not claims.',
  keywords: [
    'Product Engineer', 'Founding Engineer', 'Solution Architect', 'Software Architecture',
    'Developer Platforms', 'AI Infrastructure',
    'TypeScript', 'Next.js', 'React', 'Node.js', 'Python', 'Go', 'PostgreSQL', 'AWS',
    'LLM Applications', 'MCP', 'RAG',
  ],
  authors: [{ name: 'Mateus Pereira da Silva' }],
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png', media: '(prefers-color-scheme: light)' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-16x16.png', sizes: '16x16', type: 'image/png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon-dark-32x32.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: dark)' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Mateus P. S. — Product Engineer',
    description: 'From ambiguous problems to production systems: backend, AI, data, and product engineering, proven with real repos and architecture decisions.',
    url: 'https://mateusps.vercel.app/',
    siteName: 'Mateus P. S.',
    images: [{ url: 'https://mateusps.vercel.app/og-image.png', width: 1200, height: 630, alt: 'Mateus P. S. — Product Engineer' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mateus P. S. — Product Engineer',
    description: 'Product Engineer taking ambiguous problems to production. The proof is real repos, not claims.',
    images: ['https://mateusps.vercel.app/og-image.png'],
  },
  alternates: { canonical: 'https://mateusps.vercel.app/' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme');var t=s||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);var c=t==='dark'?'#0a0a0f':'#fbfbfc';var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++){m[i].setAttribute('content',c);}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Person',
              name: 'Mateus Pereira da Silva',
              alternateName: 'Mateus P. S.',
              jobTitle: 'Product Engineer',
              url: 'https://mateusps.vercel.app/',
              email: 'mailto:mateuspdasilva369@gmail.com',
              description: 'Product engineer building the systems that let products ship faster: from ambiguous problems to production, across backend, AI, data, and product engineering.',
              knowsAbout: ['Software architecture', 'Developer platforms', 'AI infrastructure', 'Product engineering', 'TypeScript', 'Go', 'Python', 'PostgreSQL', 'AWS', 'LLM applications', 'RAG'],
              sameAs: ['https://www.linkedin.com/in/mateuspdasilva', 'https://github.com/thettteus'],
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
