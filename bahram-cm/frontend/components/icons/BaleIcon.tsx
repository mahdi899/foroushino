type Props = {
  className?: string;
};

/** Bale messenger mark (simplified brand icon). */
export function BaleIcon({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="3" width="20" height="16" rx="6" fill="#2BBAE8" />
      <path
        d="M8.2 8.4c0-.55.45-1 1-1h5.6c.55 0 1 .45 1 1v3.2c0 .55-.45 1-1 1h-3.1l-2.2 1.6c-.35.26-.9.02-.9-.42V8.4Z"
        fill="white"
      />
      <circle cx="10.2" cy="10.1" r=".75" fill="#2BBAE8" />
      <circle cx="12.5" cy="10.1" r=".75" fill="#2BBAE8" />
      <circle cx="14.8" cy="10.1" r=".75" fill="#2BBAE8" />
      <path d="M7 20.5c2.2-1.1 4.6-1.7 7.2-1.7" stroke="#2BBAE8" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
