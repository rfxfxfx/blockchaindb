"use client";

import { useEffect, useState } from "react";
import NetworkCard from "@/components/NetworkCard";
import type { StatusResponse } from "@/lib/types";

export default function NetworkPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  const net = status?.network;
  const explorer = net?.explorerUrl;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Network</h2>
        <p className="mt-0.5 text-sm text-ink-faint">
          The EVM network this database lives on.
        </p>
      </div>

      {status?.error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {status.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <NetworkCard
          label="Network"
          value={
            status === null ? "…" : (net?.name ?? "Unknown")
          }
        />
        <NetworkCard
          label="Chain ID"
          value={net ? String(net.chainId) : "—"}
          mono
        />
        <NetworkCard
          label="Current Block"
          value={net ? net.blockNumber.toLocaleString() : "—"}
          mono
        />
        <NetworkCard label="RPC URL" value={net?.rpcUrl ?? "—"} mono />
        <NetworkCard
          label="Wallet"
          value={status?.wallet?.address ?? "Not configured"}
          mono
          href={
            status?.wallet && explorer
              ? `${explorer}/address/${status.wallet.address}`
              : undefined
          }
        />
        <NetworkCard
          label="Balance"
          value={
            status?.wallet
              ? `${Number(status.wallet.balance).toFixed(4)} ${net?.currency ?? ""}`
              : "—"
          }
          mono
        />
        <NetworkCard
          label="Type"
          value={
            net === undefined || net === null
              ? "—"
              : net.testnet === null
                ? "Custom chain"
                : net.testnet
                  ? "Testnet"
                  : "Mainnet — real funds"
          }
        />
        <NetworkCard
          label="Explorer"
          value={explorer ? explorer.replace("https://", "") : "—"}
          href={explorer ?? undefined}
        />
        {net?.testnet && net.faucetUrl && (
          <NetworkCard
            label="Faucet"
            value={`Get test ${net.currency}`}
            href={net.faucetUrl}
          />
        )}
        <NetworkCard
          label="Status"
          value={
            status === null
              ? "…"
              : status.connected
                ? "🟢 Connected"
                : "🔴 Disconnected"
          }
        />
      </div>
    </div>
  );
}
