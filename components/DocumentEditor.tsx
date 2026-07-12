"use client";

import { useEffect, useState } from "react";
import JsonEditor from "./JsonEditor";
import type { DocumentRecord } from "@/lib/types";

/**
 * Slide-over editor for one document. Pass `document: null` for a new one.
 * onSaved/onDeleted fire after the transaction is mined.
 *
 * Default UX is a Supabase-style field editor (plain-text fields, no JSON to
 * hand-write). A "Raw JSON" toggle is there for power users / nested data.
 */

type FieldType = "text" | "number" | "boolean";

interface Field {
  id: number;
  key: string;
  value: string;
  type: FieldType;
}

let fieldSeq = 0;
const newField = (partial?: Partial<Field>): Field => ({
  id: fieldSeq++,
  key: "",
  value: "",
  type: "text",
  ...partial,
});

/** Turn a stored document into editable fields. Returns null for shapes that
 *  can't be flat fields (arrays, nested objects) — those use raw JSON mode. */
function dataToFields(data: unknown): Field[] | null {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  const fields: Field[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      fields.push(newField({ key, value, type: "text" }));
    } else if (typeof value === "number") {
      fields.push(newField({ key, value: String(value), type: "number" }));
    } else if (typeof value === "boolean") {
      fields.push(newField({ key, value: String(value), type: "boolean" }));
    } else {
      return null; // nested/complex → raw JSON mode
    }
  }
  return fields;
}

/** Build the document object from field rows. */
function fieldsToData(fields: Field[]): { data?: Record<string, unknown>; error?: string } {
  const data: Record<string, unknown> = {};
  const seen = new Set<string>();
  for (const f of fields) {
    const key = f.key.trim();
    if (!key && !f.value.trim()) continue; // skip fully-empty rows
    if (!key) return { error: "Every field needs a name." };
    if (seen.has(key)) return { error: `Duplicate field name: "${key}".` };
    seen.add(key);

    if (f.type === "number") {
      if (f.value.trim() === "" || !Number.isFinite(Number(f.value))) {
        return { error: `"${key}" is set to Number but "${f.value}" isn't a number.` };
      }
      data[key] = Number(f.value);
    } else if (f.type === "boolean") {
      data[key] = f.value === "true";
    } else {
      data[key] = f.value;
    }
  }
  if (Object.keys(data).length === 0) {
    return { error: "Add at least one field." };
  }
  return { data };
}

export default function DocumentEditor({
  collection,
  document,
  onClose,
  onSaved,
  onDeleted,
}: {
  collection: string;
  document: DocumentRecord | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const isNew = document === null;
  const [mode, setMode] = useState<"fields" | "json">("fields");
  const [fields, setFields] = useState<Field[]>([newField()]);
  const [json, setJson] = useState("{\n  \n}");
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (isNew) {
      setMode("fields");
      setFields([newField()]);
      setJson("{\n  \n}");
      return;
    }
    const parsed = dataToFields(document.data);
    if (parsed) {
      setMode("fields");
      setFields(parsed.length ? parsed : [newField()]);
    } else {
      // nested/complex document → edit as JSON
      setMode("json");
      setJson(JSON.stringify(document.data, null, 2));
    }
  }, [document, isNew]);

  const setField = (id: number, patch: Partial<Field>) =>
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const addField = () => setFields((fs) => [...fs, newField()]);
  const removeField = (id: number) =>
    setFields((fs) => (fs.length === 1 ? [newField()] : fs.filter((f) => f.id !== id)));

  // Keep the two modes in sync when toggling.
  const toFieldsMode = () => {
    try {
      const parsed = dataToFields(JSON.parse(json));
      if (!parsed) {
        setError("This document has nested data — keep editing it as JSON.");
        return;
      }
      setFields(parsed.length ? parsed : [newField()]);
      setMode("fields");
      setError(null);
    } catch {
      setError("Fix the JSON before switching to fields.");
    }
  };
  const toJsonMode = () => {
    const built = fieldsToData(fields);
    if (built.error) {
      setError(built.error);
      return;
    }
    setJson(JSON.stringify(built.data, null, 2));
    setMode("json");
    setError(null);
  };

  const save = async () => {
    let data: unknown;
    if (mode === "fields") {
      const built = fieldsToData(fields);
      if (built.error) {
        setError(built.error);
        return;
      }
      data = built.data;
    } else {
      try {
        data = JSON.parse(json);
      } catch {
        setError("Fix the JSON before saving.");
        return;
      }
    }

    setBusy("save");
    setError(null);
    try {
      const res = await fetch(isNew ? "/api/create" : "/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isNew ? { collection, data } : { collection, id: document.id, data }
        ),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Transaction failed");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (isNew) return;
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection, id: document.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Transaction failed");
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-lg flex-col border-l border-base-border bg-base-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-base-border px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold">
              {isNew ? "New Document" : `Document #${document.id}`}
            </h2>
            <p className="mt-0.5 text-xs text-ink-faint">
              Collection: <span className="font-mono">{collection}</span>
              {!isNew && (
                <>
                  {" · "}ID: <span className="font-mono">{document.id}</span>
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-ink-faint hover:bg-base-raised hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-faint">
              {mode === "fields" ? "Fields" : "Raw JSON"}
            </span>
            <button
              type="button"
              onClick={mode === "fields" ? toJsonMode : toFieldsMode}
              className="rounded-md border border-base-border px-2.5 py-1 text-xs text-ink-soft hover:text-ink"
            >
              {mode === "fields" ? "Edit as raw JSON" : "Back to fields"}
            </button>
          </div>

          {mode === "fields" ? (
            <div className="space-y-2">
              <div className="flex gap-2 px-1 text-[11px] uppercase tracking-wider text-ink-faint">
                <span className="flex-1">Field</span>
                <span className="flex-1">Value</span>
                <span className="w-24">Type</span>
                <span className="w-6" />
              </div>
              {fields.map((f) => (
                <div key={f.id} className="flex items-center gap-2">
                  <input
                    value={f.key}
                    onChange={(e) => setField(f.id, { key: e.target.value })}
                    placeholder="name"
                    className="min-w-0 flex-1 rounded-lg border border-base-border bg-base px-3 py-2 text-sm outline-none focus:border-brand/60"
                  />
                  {f.type === "boolean" ? (
                    <select
                      value={f.value || "true"}
                      onChange={(e) => setField(f.id, { value: e.target.value })}
                      className="min-w-0 flex-1 rounded-lg border border-base-border bg-base px-3 py-2 text-sm outline-none focus:border-brand/60"
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      value={f.value}
                      onChange={(e) => setField(f.id, { value: e.target.value })}
                      inputMode={f.type === "number" ? "decimal" : "text"}
                      placeholder={f.type === "number" ? "20" : "Alice"}
                      className="min-w-0 flex-1 rounded-lg border border-base-border bg-base px-3 py-2 text-sm outline-none focus:border-brand/60"
                    />
                  )}
                  <select
                    value={f.type}
                    onChange={(e) =>
                      setField(f.id, { type: e.target.value as FieldType })
                    }
                    className="w-24 rounded-lg border border-base-border bg-base px-2 py-2 text-xs text-ink-soft outline-none focus:border-brand/60"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeField(f.id)}
                    className="w-6 shrink-0 rounded-md text-ink-faint hover:text-red-400"
                    aria-label="Remove field"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addField}
                className="mt-1 rounded-lg border border-dashed border-base-border px-3 py-2 text-sm text-ink-soft hover:border-brand/40 hover:text-brand"
              >
                + Add field
              </button>
            </div>
          ) : (
            <JsonEditor value={json} onChange={setJson} rows={16} />
          )}

          <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-faint">
            <span>🔒</span>
            Saved encrypted on-chain — only your wallet key can read it back.
          </p>

          {error && (
            <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
          {busy && (
            <p className="mt-3 text-xs text-ink-soft">
              Waiting for the transaction to be mined…
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-base-border px-6 py-4">
          {!isNew ? (
            <button
              onClick={remove}
              disabled={busy !== null}
              className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-40"
            >
              {busy === "delete" ? "Deleting…" : "Delete"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={busy !== null}
              className="rounded-lg border border-base-border px-4 py-2 text-sm text-ink-soft hover:text-ink disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy !== null}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-base hover:bg-brand-dim disabled:opacity-40"
            >
              {busy === "save" ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
