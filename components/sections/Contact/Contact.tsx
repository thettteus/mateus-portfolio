import { FadeIn } from "@/components/ui/FadeIn";

export default function Contact() {
  return (
    <section className="contact" id="contact" aria-labelledby="contact-heading">
      <div className="topo-bg" aria-hidden="true" />
      <div className="container contact-inner">
        <FadeIn
          as="header"
          className="sec-head"
          style={{ marginBottom: "48px" }}
        >
          <div className="sec-eyebrow">
            <span className="num">06</span>
            <span className="lbl">Work with me</span>
          </div>
        </FadeIn>

        <div className="contact-grid">
          <FadeIn>
            <p className="contact-statement" id="contact-heading">
              Have a solution worth building?
              <br />
              <em>Let&apos;s turn it into a product.</em>
            </p>
            <p className="contact-lead">
              From discovery and architecture to implementation and production.
              One engineer. End-to-end ownership.
            </p>

            <div className="contact-cta-group">
              <a
                className="contact-link contact-link-primary"
                href="https://calendly.com/mateuspdasilva369/1-1-meeting"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" />
                  <path d="M1.5 5.5h11M4 1v2M10 1v2" />
                </svg>
                Schedule a 30-minute intro call
                <svg
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 7h10M8 3l4 4-4 4" />
                </svg>
              </a>

              <div className="contact-links">
                <a
                  className="contact-link"
                  href="https://github.com/thettteus"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub (opens in new tab)"
                >
                  GitHub
                  <svg
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 11L11 3M5 3h6v6" />
                  </svg>
                </a>
                <a
                  className="contact-link"
                  href="https://www.linkedin.com/in/mateuspdasilva"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn (opens in new tab)"
                >
                  LinkedIn
                  <svg
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 11L11 3M5 3h6v6" />
                  </svg>
                </a>
                <a
                  className="contact-link"
                  href="mailto:mateuspdasilva369@gmail.com"
                  aria-label="Email Matt"
                >
                  Email
                  <svg
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 11L11 3M5 3h6v6" />
                  </svg>
                </a>
                <a
                  className="contact-link"
                  href="/assets/files/mateus_resume.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Resume
                  <svg
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 11L11 3M5 3h6v6" />
                  </svg>
                </a>
              </div>
            </div>
          </FadeIn>

          <FadeIn className="contact-meta" delay={0.1}>
            <div className="cm-block">
              <div className="cmk">Best fit</div>
              <div className="opp">
                <span>Early-stage companies</span>
                <span>Product-focused engineering</span>
                <span>AI-enabled products</span>
                <span>Complex business workflows</span>
                <span>0 → 1 and scaling products</span>
              </div>
            </div>
            <div className="cm-block">
              <div className="cmk">Open to</div>
              <div className="opp">
                <span>Product Engineer roles</span>
                <span>Software Engineer roles</span>
                <span>Founding Engineer roles</span>
              </div>
            </div>
            <div className="cm-block">
              <div className="cmk">Languages</div>
              <div className="cmv">English · Spanish · Portuguese</div>
            </div>
            <div className="cm-block">
              <div className="cmk">Résumé</div>
              <div className="cmv">
                <a
                  className="dl-pdf"
                  href="/assets/files/mateus_resume.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download résumé PDF (opens in new tab)"
                >
                  Download PDF
                  <svg
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 11L11 3M5 3h6v6" />
                  </svg>
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
