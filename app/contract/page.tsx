"use client";

import { useCallback, useEffect, useState } from "react";
import NetworkCard from "@/components/NetworkCard";
import DeployButton from "@/components/DeployButton";
import type { StatusResponse } from "@/lib/types";

const CONTRACT_FUNCTIONS = [
  { sig: "create(collection, data) → id", kind: "write" },
  { sig: "get(collection, id) → Document", kind: "view" },
  { sig: "update(collection, id, data)", kind: "write" },
  { sig: "remove(collection, id)", kind: "write" },
  { sig: "list(collection) → Document[]", kind: "view" },
  { sig: "createCollection(name)", kind: "write" },
  { sig: "listCollections() → (names, counts)", kind: "view" },
  { sig: "totalDocuments() → uint256", kind: "view" },
  { sig: "owner() → address", kind: "view" },
];

export default function ContractPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [justDeployed, setJustDeployed] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const explorer = status?.network?.explorerUrl;
  const address = status?.contract?.address;
  const deployed = Boolean(address);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Smart Contract</h2>
        <p className="mt-0.5 text-sm text-ink-faint">
          Database.sol — one contract, your whole database.
        </p>
      </div>

      {/* ---- deploy hero: the easy path ---- */}
      {!deployed ? (
        <section className="rounded-xl border border-brand/30 bg-gradient-to-br from-brand-faint to-transparent p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-faint text-xl">
              📜
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold">
                Deploy your database contract
              </h3>
              <p className="mt-1 text-sm text-ink-soft">
                One click puts Database.sol on{" "}
                <span className="text-ink">
                  {status?.network?.name ?? "your network"}
                </span>
                . The address is saved for you — then you can start creating
                collections. No terminal, no Solidity.
              </p>
              <div className="mt-4">
                <DeployButton
                  status={status}
                  size="lg"
                  onDeployed={(r) => {
                    setJustDeployed(r.address);
                    load();
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-base-border bg-base-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-brand">
                <span className="h-2 w-2 rounded-full bg-brand" />
                {justDeployed ? "Deployed & connected" : "Contract connected"}
              </p>
              <p className="mt-1 truncate font-mono text-xs text-ink-soft">
                {address}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {explorer && (
                <a
                  href={`${explorer}/address/${address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand hover:underline"
                >
                  View on explorer ↗
                </a>
              )}
              <details className="group relative">
                <summary className="cursor-pointer list-none rounded-lg border border-base-border px-3 py-1.5 text-xs text-ink-soft hover:text-ink">
                  Redeploy
                </summary>
                <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-base-border bg-base-panel p-4 shadow-xl">
                  <p className="mb-3 text-xs text-ink-soft">
                    Deploys a fresh, empty contract and repoints the app to it.
                    Your current data stays on the old address but the dashboard
                    will show the new (empty) one.
                  </p>
                  <DeployButton
                    status={status}
                    onDeployed={(r) => {
                      setJustDeployed(r.address);
                      load();
                    }}
                  />
                </div>
              </details>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <NetworkCard
          label="Contract Address"
          value={address ?? "Not deployed yet"}
          mono
          href={
            address && explorer ? `${explorer}/address/${address}` : undefined
          }
        />
        <NetworkCard label="Owner" value={status?.contract?.owner ?? "—"} mono />
        <NetworkCard
          label="Current Block"
          value={
            status?.network ? status.network.blockNumber.toLocaleString() : "—"
          }
          mono
        />
        <NetworkCard label="Network" value={status?.network?.name ?? "—"} />
      </div>

      <section className="rounded-xl border border-base-border bg-base-panel">
        <div className="border-b border-base-border px-5 py-3">
          <h3 className="text-sm font-semibold">Interface</h3>
        </div>
        <ul className="divide-y divide-base-border">
          {CONTRACT_FUNCTIONS.map((fn) => (
            <li
              key={fn.sig}
              className="flex items-center justify-between px-5 py-3"
            >
              <code className="font-mono text-[13px] text-ink">{fn.sig}</code>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                  fn.kind === "view"
                    ? "bg-sky-500/10 text-sky-300"
                    : "bg-brand-faint text-brand"
                }`}
              >
                {fn.kind}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
