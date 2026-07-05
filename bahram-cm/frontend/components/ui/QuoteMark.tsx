import { cn } from "@/lib/cn";

export function QuoteMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={cn("h-8 w-8 text-gold/50", className)}
    >
      <path
        d="M12 8C7 8 4 12 4 17v7h9v-9H8.5C9 13 10.5 11 13 10.5L12 8zm15 0c-5 0-8 4-8 9v7h9v-9h-4.5c.5-2 2-4 4.5-4.5L27 8z"
        fill="currentColor"
      />
    </svg>
  );
}
