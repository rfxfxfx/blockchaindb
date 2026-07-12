"use client";

/** Plain-textarea JSON editor with live validation and a format button. */
export default function JsonEditor({
  value,
  onChange,
  rows = 12,
}: {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
}) {
  let parseError: string | null = null;
  if (value.trim()) {
    try {
      JSON.parse(value);
    } catch (e) {
      parseError = e instanceof Error ? e.message : "Invalid JSON";
    }
  }

  const format = () => {
    try {
      onChange(JSON.stringify(JSON.parse(value), null, 2));
    } catch {
      // leave as-is; the error banner already explains
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-faint">
          JSON
        </span>
        <button
          type="button"
          onClick={format}
          disabled={Boolean(parseError) || !value.trim()}
          className="rounded-md border border-base-border px-2.5 py-1 text-xs text-ink-soft hover:text-ink disabled:opacity-40"
        >
          Format
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        spellCheck={false}
        className={`w-full resize-y rounded-lg border bg-base p-3 font-mono text-[13px] leading-relaxed text-ink outline-none transition-colors ${
          parseError
            ? "border-red-500/60 focus:border-red-500"
            : "border-base-border focus:border-brand/60"
        }`}
        placeholder='{ "name": "Alice", "age": 20 }'
      />
      {parseError && (
        <p className="mt-1.5 text-xs text-red-400">{parseError}</p>
      )}
    </div>
  );
}
