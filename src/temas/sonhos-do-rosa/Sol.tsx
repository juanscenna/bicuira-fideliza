/** Sol em traço, do desenho da logo da pousada (usado como ornamento). */
export function Sol({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M10 30a14 14 0 0 1 28 0" />
      <path d="M24 6v4M8 14l3 3M40 14l-3 3M4 30h4M40 30h4" />
      <path d="M6 38c6-3 12-3 18 0s12 3 18 0" />
    </svg>
  );
}
