"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DataTable from "@/components/DataTable";
import DocumentEditor from "@/components/DocumentEditor";
import type {
  CollectionInfo,
  DocumentRecord,
  StatusResponse,
} from "@/lib/types";

/**
 * A self-contained mini CRUD app: pick or create a collection, then add / edit /
 * delete records — all on one screen, straight against the configured contract.
 * Reuses the same field editor + encryption as the rest of the dashboard.
 */
export default function PlaygroundPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [collection, setCollection] = useState("");
  const [newName, setNewName] = useState("");
  const [creatingCol, setCreatingCol] = useState(false);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<
    | { mode: "closed" }
    | { mode: "new" }
    | { mode: "edit"; doc: DocumentRecord }
  >({ mode: "closed" });

  const loadStatus = useCallback(
    () =>
      fetch("/api/status")
        .then((r) => r.json())
        .then(setStatus)
        .catch(() => {}),
    []
  );

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

  const loadDocuments = useCallback(async (col: string) => {
    if (!col) {
      setDocuments([]);
      return;
    }
    setLoadingDocs(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/list?collection=${encodeURIComponent(col)}`
      ).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setDocuments(res.documents ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load records");
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadCollections().then((cols) => {
      if (cols.length && !collection) setCollection(cols[0].name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (collection) loadDocuments(collection);
  }, [collection, loadDocuments]);

  const refresh = async () => {
    await Promise.all([loadStatus(), loadCollections(), loadDocuments(collection)]);
  };

  const createCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreatingCol(true);
    setError(null);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Transaction failed");
      setNewName("");
      await loadCollections();
      setCollection(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setCreatingCol(false);
    }
  };

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
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setBusyId(null);
    }
  };

  const notReady = status && !status.configured.contract;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">CRUD Playground</h2>
          <p className="mt-0.5 text-sm text-ink-faint">
            Create, read, update and delete records end-to-end — every action is
            a real transaction on your contract.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {status?.network && (
            <span className="rounded-full border border-base-border bg-base-panel px-3 py-1.5">
              {status.network.name}
            </span>
          )}
          {status?.encryption.enabled && (
            <span className="rounded-full border border-brand/30 bg-brand-faint px-3 py-1.5 text-brand">
              🔒 Encrypted
            </span>
          )}
        </div>
      </div>

      {notReady ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm">
          <p className="font-medium text-amber-300">No contract configured</p>
          <p className="mt-1 text-ink-soft">
            Deploy or paste a contract on the{" "}
            <Link href="/contract" className="text-brand hover:underline">
              Smart Contract
            </Link>{" "}
            page (or in{" "}
            <Link href="/settings" className="text-brand hover:underline">
              Settings
            </Link>
            ) first — then come back to test CRUD.
          </p>
        </div>
      ) : (
        <>
          {/* Step 1 — collection */}
          <section className="rounded-xl border border-base-border bg-base-panel p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-faint text-xs font-semibold text-brand">
                1
              </span>
              <h3 className="text-sm font-semibold">Pick a collection</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {collections.length > 0 ? (
                <select
                  value={collection}
                  onChange={(e) => setCollection(e.target.value)}
                  className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm outline-none focus:border-brand/60"
                >
                  {collections.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.documentCount})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm text-ink-faint">
                  No collections yet — create your first one:
                </span>
              )}
              <form onSubmit={createCollection} className="flex items-center gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="new collection name"
                  className="rounded-lg border border-base-border bg-base px-3 py-2 text-sm outline-none focus:border-brand/60"
                />
                <button
                  type="submit"
                  disabled={creatingCol || !newName.trim()}
                  className="rounded-lg border border-brand/50 px-3 py-2 text-sm font-medium text-brand hover:bg-brand-faint disabled:opacity-40"
                >
                  {creatingCol ? "Creating…" : "+ Create"}
                </button>
              </form>
            </div>
          </section>

          {/* Step 2 — records */}
          <section className="rounded-xl border border-base-border bg-base-panel p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-faint text-xs font-semibold text-brand">
                  2
                </span>
                <h3 className="text-sm font-semibold">
                  Records
                  {collection && (
                    <span className="ml-1 font-normal text-ink-faint">
                      in <span className="font-mono">{collection}</span>
                    </span>
                  )}
                </h3>
              </div>
              <button
                onClick={() => setEditor({ mode: "new" })}
                disabled={!collection}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-base hover:bg-brand-dim disabled:opacity-40"
              >
                + New Record
              </button>
            </div>

            {!collection ? (
              <p className="rounded-lg border border-dashed border-base-border p-6 text-center text-sm text-ink-faint">
                Create a collection above to start adding records.
              </p>
            ) : loadingDocs ? (
              <p className="text-sm text-ink-faint">Reading from the chain…</p>
            ) : (
              <DataTable
                documents={documents}
                busyId={busyId}
                onEdit={(doc) => setEditor({ mode: "edit", doc })}
                onDelete={quickDelete}
              />
            )}
          </section>
        </>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {editor.mode !== "closed" && collection && (
        <DocumentEditor
          collection={collection}
          document={editor.mode === "edit" ? editor.doc : null}
          onClose={() => setEditor({ mode: "closed" })}
          onSaved={() => {
            setEditor({ mode: "closed" });
            refresh();
          }}
          onDeleted={() => {
            setEditor({ mode: "closed" });
            refresh();
          }}
        />
      )}
    </div>
  );
}
