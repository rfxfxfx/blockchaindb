"use client";

export default function NetworkCard({
  label,
  value,
  mono = false,
  href,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  href?: string;
}) {
  const content = (
    <span className={mono ? "break-all font-mono text-[13px]" : "text-sm"}>
      {value}
    </span>
  );
  return (
    <div className="rounded-xl border border-base-border bg-base-panel p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
        {label}
      </p>
      <div className="mt-2 text-ink">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-brand hover:underline"
          >
            {content} ↗
          </a>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
