/** Rosa em traço, inspirada nas rosas da logo (usada como carimbo). */
export function Rosa({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M24 20c2.5-2 6-1 6 2.2 0 3.6-4 5.6-7.2 4.4-3.4-1.3-3.9-6-1-8.6 3.4-3 9.8-2.3 12.3 2 2.7 4.6-.6 10.5-6.4 11.6-6.4 1.2-12-3.6-11.6-9.8.4-6.6 7.4-11 14.2-9.4" />
      <path d="M10.5 22c-1.8 7.6 3 15.4 11 17.3 8.6 2 17.2-3.6 18.4-12.2.6-4-.6-7.6-2.9-10.3" />
      <path d="M12 16.5C14.8 10.6 21 7.3 27.4 8.2" />
    </svg>
  );
}
