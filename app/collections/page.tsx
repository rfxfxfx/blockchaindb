"use client";

import { useCallback, useEffect, useState } from "react";
import CollectionCard from "@/components/CollectionCard";
import type { CollectionInfo } from "@/lib/types";

export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/collections").then((r) => r.json());
      if (res.collections) setCollections(res.collections);
      else if (res.error) setError(res.error);
    } catch {
      setError("Could not reach the API.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Transaction failed");
      setName("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Collections</h2>
          <p className="mt-0.5 text-sm text-ink-faint">
            Each collection is a namespace of JSON documents inside the
            contract.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-base hover:bg-brand-dim"
        >
          + New Collection
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={create}
          className="flex items-center gap-3 rounded-xl border border-base-border bg-base-panel p-4"
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. users"
            className="flex-1 rounded-lg border border-base-border bg-base px-3 py-2 text-sm outline-none focus:border-brand/60"
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-base hover:bg-brand-dim disabled:opacity-40"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </form>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {!loaded ? (
        <p className="text-sm text-ink-faint">Loading collections…</p>
      ) : collections.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-base-border p-10 text-center text-sm text-ink-faint">
          No collections yet. Create one — <b>Users</b> is a good start.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((c) => (
            <CollectionCard key={c.name} collection={c} />
          ))}
        </div>
      )}
    </div>
  );
}
