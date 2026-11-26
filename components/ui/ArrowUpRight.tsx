// The outbound arrow used by every outbound link: drawn, not a glyph, so its
// stroke matches the rest of the line icons at any size.
export default function ArrowUpRight() {
  return (
    <svg className="arrow-ur" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 13 13 3M4.5 3H13v8.5" />
    </svg>
  );
}
