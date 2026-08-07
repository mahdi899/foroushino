import { splitTextWithLinks } from '@/lib/family/linkifyText';

export function LinkifiedText({ text }: { text: string }) {
  const parts = splitTextWithLinks(text);

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'link') {
          return (
            <a
              key={i}
              href={part.href}
              className="family-text-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              {part.value}
            </a>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </>
  );
}
