"use client";

import type { StatusResponse } from "@/lib/types";

function shorten(hash: string | null | undefined): string {
  if (!hash) return "—";
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export default function DashboardStats({
  status,
}: {
  status: StatusResponse | null;
}) {
  const cards = [
    {
      label: "Collections",
      value: status?.stats ? String(status.stats.collections) : "—",
    },
    {
      label: "Documents",
      value: status?.stats ? String(status.stats.documents) : "—",
    },
    {
      label: "Current Network",
      value: status?.network?.name ?? "—",
    },
    {
      label: "Contract",
      value: shorten(status?.contract?.address),
      mono: true,
    },
    {
      label: "Encryption",
      value:
        status === null
          ? "…"
          : status.encryption.enabled
            ? "🔒 On"
            : "Off (no key)",
    },
    {
      label: "Status",
      value: status === null ? "…" : status.connected ? "🟢 Connected" : "🔴 Offline",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-base-border bg-base-panel p-4"
        >
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
            {card.label}
          </p>
          <p
            className={`mt-2 truncate text-lg font-semibold ${
              card.mono ? "font-mono text-sm leading-7" : ""
            }`}
            title={typeof card.value === "string" ? card.value : undefined}
          >
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
