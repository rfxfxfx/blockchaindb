"use client";

import type { DocumentRecord } from "@/lib/types";

function preview(data: unknown, max = 80): string {
  const text = typeof data === "string" ? data : JSON.stringify(data);
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function formatTime(unix: number): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleString();
}

export default function DataTable({
  documents,
  onEdit,
  onDelete,
  busyId,
}: {
  documents: DocumentRecord[];
  onEdit: (doc: DocumentRecord) => void;
  onDelete: (doc: DocumentRecord) => void;
  busyId?: number | null;
}) {
  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-base-border p-10 text-center text-sm text-ink-faint">
        No documents yet. Create the first one — it becomes a transaction on the
        chain.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-base-border">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-base-border bg-base-panel text-xs uppercase tracking-wider text-ink-faint">
          <tr>
            <th className="px-4 py-3 font-medium">ID</th>
            <th className="px-4 py-3 font-medium">Data</th>
            <th className="px-4 py-3 font-medium">Updated</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-border">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-base-panel/60">
              <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                {doc.id}
              </td>
              <td className="max-w-md px-4 py-3">
                {doc.locked ? (
                  <span className="flex items-center gap-1.5 text-xs text-ink-faint">
                    🔒 Encrypted — needs the owner key to read
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    {doc.encrypted && (
                      <span
                        title="Stored encrypted on-chain"
                        className="shrink-0 text-xs"
                      >
                        🔒
                      </span>
                    )}
                    <code className="block truncate font-mono text-xs text-ink">
                      {preview(doc.data)}
                    </code>
                  </div>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">
                {formatTime(doc.updatedAt)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button
                  onClick={() => onEdit(doc)}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand-faint"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(doc)}
                  disabled={busyId === doc.id}
                  className="ml-1 rounded-md px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                >
                  {busyId === doc.id ? "…" : "Delete"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
