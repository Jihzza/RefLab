import { useId, type ReactNode } from 'react';
import { Surface } from '@/components/ui';

interface PolicyDocumentProps {
  children: ReactNode;
  icon: ReactNode;
  lastUpdated: string;
  title: string;
}

interface PolicySectionProps {
  children: ReactNode;
  id: string;
  title: string;
}

/** Shared editorial frame for each legal document. */
export function PolicyDocument({
  children,
  icon,
  lastUpdated,
  title,
}: PolicyDocumentProps) {
  const titleId = useId();

  return (
    <article aria-labelledby={titleId} className="space-y-4 sm:space-y-5">
      <Surface
        variant="raised"
        padding="none"
        className="relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7"
      >
        <span
          aria-hidden="true"
          className="absolute right-0 top-0 h-1.5 w-28 -skew-x-[28deg] bg-(--mc-color-accent) sm:w-36"
        />
        <span
          aria-hidden="true"
          className="absolute right-2 top-0 h-1.5 w-7 -skew-x-[28deg] bg-(--mc-color-danger)"
        />

        <div className="flex items-start gap-4 sm:items-center sm:gap-5">
          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-full border border-(--mc-color-accent)/55 bg-(--mc-color-canvas) text-(--mc-color-accent) shadow-(--mc-shadow-soft) sm:size-14"
          >
            {icon}
          </span>
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-xl font-extrabold tracking-[-0.02em] text-(--mc-color-text) sm:text-2xl"
            >
              {title}
            </h2>
            <p className="mt-1.5 text-xs font-medium text-(--mc-color-text-muted) sm:text-sm">
              {lastUpdated}
            </p>
          </div>
        </div>
      </Surface>

      <div className="space-y-4 sm:space-y-5">{children}</div>
    </article>
  );
}

/** A deep-linkable legal section with consistent reading width and hierarchy. */
export function PolicySection({ children, id, title }: PolicySectionProps) {
  const headingId = `${id}-heading`;

  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-32">
      <Surface
        variant="default"
        padding="none"
        className="group relative overflow-hidden px-5 py-5 sm:px-7 sm:py-6"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-(--mc-color-accent) opacity-80 transition-opacity group-hover:opacity-100 motion-reduce:transition-none"
        />
        <h3
          id={headingId}
          className="text-base font-bold leading-snug text-(--mc-color-text) sm:text-lg"
        >
          <a
            href={`#${id}`}
            className="mc-focus-ring rounded-sm transition-colors hover:text-(--mc-color-accent) motion-reduce:transition-none"
          >
            {title}
          </a>
        </h3>
        <div className="mt-3 max-w-[72ch] text-[0.9375rem] leading-7 text-(--mc-color-text-secondary)">
          {children}
        </div>
      </Surface>
    </section>
  );
}
