"use client";

import Link from "next/link";
import type { CollectionInfo } from "@/lib/types";

export default function CollectionCard({
  collection,
}: {
  collection: CollectionInfo;
}) {
  return (
    <Link
      href={`/documents?collection=${encodeURIComponent(collection.name)}`}
      className="group rounded-xl border border-base-border bg-base-panel p-5 transition-colors hover:border-brand/40 hover:bg-base-raised"
    >
      <div className="flex items-start justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-faint text-lg">
          📁
        </span>
        <span className="rounded-full border border-base-border px-2.5 py-0.5 text-xs text-ink-soft">
          {collection.documentCount}{" "}
          {collection.documentCount === 1 ? "document" : "documents"}
        </span>
      </div>
      <h3 className="mt-4 truncate text-[15px] font-semibold group-hover:text-brand">
        {collection.name}
      </h3>
      <p className="mt-1 text-xs text-ink-faint">Open in document editor →</p>
    </Link>
  );
}
