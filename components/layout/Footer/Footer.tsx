export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer" role="contentinfo">
      <div className="topo-bg" aria-hidden="true" />
      <div className="container footer-inner">
        <span className="footer-id">Matt P. S.</span>
<span className="footer-copy">
          <span aria-hidden="true">©</span>
          <span className="sr-only">Copyright</span> {year}. All rights reserved
        </span>
        <a href="#top" className="footer-top" aria-label="Back to top of page">
          Back to top
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 10V2M2 6l4-4 4 4" />
          </svg>
        </a>
      </div>
    </footer>
  );
}
