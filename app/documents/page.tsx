"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable from "@/components/DataTable";
import DocumentEditor from "@/components/DocumentEditor";
import type { CollectionInfo, DocumentRecord } from "@/lib/types";

function DocumentsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const collection = searchParams.get("collection") ?? "";

  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<
    { mode: "closed" } | { mode: "new" } | { mode: "edit"; doc: DocumentRecord }
  >({ mode: "closed" });
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadCollections = useCallback(async () => {
    try {
      const res = await fetch("/api/collections").then((r) => r.json());
      const cols: CollectionInfo[] = res.collections ?? [];
      setCollections(cols);
      return cols;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    loadCollections().then((cols) => {
      if (!collection && cols.length > 0) {
        router.replace(
          `/documents?collection=${encodeURIComponent(cols[0].name)}`
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDocuments = useCallback(async () => {
    if (!collection) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/list?collection=${encodeURIComponent(collection)}`
      ).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setDocuments(res.documents ?? []);
      loadCollections(); // keep the dropdown's document counts fresh
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [collection, loadCollections]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const quickDelete = async (doc: DocumentRecord) => {
    setBusyId(doc.id);
    setError(null);
    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection, id: doc.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Transaction failed");
      await loadDocuments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Documents</h2>
          <select
            value={collection}
            onChange={(e) =>
              router.replace(
                `/documents?collection=${encodeURIComponent(e.target.value)}`
              )
            }
            className="rounded-lg border border-base-border bg-base-panel px-3 py-2 text-sm outline-none focus:border-brand/60"
          >
            {collection === "" && <option value="">Select collection…</option>}
            {collections.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.documentCount})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setEditor({ mode: "new" })}
          disabled={!collection}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-base hover:bg-brand-dim disabled:opacity-40"
        >
          + New Document
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {!collection ? (
        <div className="rounded-xl border border-dashed border-base-border p-10 text-center text-sm text-ink-faint">
          Create a collection first, then add documents to it.
        </div>
      ) : loading ? (
        <p className="text-sm text-ink-faint">Reading from the chain…</p>
      ) : (
        <DataTable
          documents={documents}
          busyId={busyId}
          onEdit={(doc) => setEditor({ mode: "edit", doc })}
          onDelete={quickDelete}
        />
      )}

      {editor.mode !== "closed" && collection && (
        <DocumentEditor
          collection={collection}
          document={editor.mode === "edit" ? editor.doc : null}
          onClose={() => setEditor({ mode: "closed" })}
          onSaved={() => {
            setEditor({ mode: "closed" });
            loadDocuments();
          }}
          onDeleted={() => {
            setEditor({ mode: "closed" });
            loadDocuments();
          }}
        />
      )}
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-faint">Loading…</p>}>
      <DocumentsView />
    </Suspense>
  );
}
