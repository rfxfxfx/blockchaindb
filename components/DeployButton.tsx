"use client";

import { useState } from "react";
import Link from "next/link";
import type { StatusResponse } from "@/lib/types";

interface DeployResult {
  address: string;
  txHash: string;
  network: string;
  deployer: string;
  confirmed: boolean;
}

/**
 * One-click deploy of Database.sol from the configured wallet. Self-contained:
 * it reads readiness from `status`, guides the user when something's missing
 * (no wallet / not connected), runs a two-click confirm (louder on mainnet),
 * and calls onDeployed() with the fresh address when the tx is mined.
 *
 * `onBeforeDeploy` lets a caller persist pending form edits first (Settings);
 * omit it when settings are already saved (Contract page).
 */
export default function DeployButton({
  status,
  onDeployed,
  onBeforeDeploy,
  size = "md",
}: {
  status: StatusResponse | null;
  onDeployed?: (result: DeployResult) => void;
  onBeforeDeploy?: () => Promise<void>;
  size?: "md" | "lg";
}) {
  const [confirming, setConfirming] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const connected = status?.connected ?? false;
  const hasWallet = status?.configured?.wallet ?? false;
  const networkName = status?.network?.name ?? "this network";
  const isMainnet = status?.network?.testnet === false;

  // Not ready → guide instead of a dead button.
  if (status && !hasWallet) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
        <p className="font-medium text-amber-300">Add a wallet to deploy</p>
        <p className="mt-1 text-ink-soft">
          Deploying sends a transaction, so it needs a funded wallet key.{" "}
          <Link href="/settings" className="text-brand hover:underline">
            Add one in Settings →
          </Link>
        </p>
      </div>
    );
  }

  const run = async () => {
    if (!confirming) {
      setConfirming(true);
      setError(null);
      return;
    }
    setConfirming(false);
    setDeploying(true);
    setError(null);
    setPending(false);
    try {
      if (onBeforeDeploy) await onBeforeDeploy();
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Deploy failed");
      const result = body as DeployResult;
      setPending(result.confirmed === false);
      onDeployed?.(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  const pad = size === "lg" ? "px-6 py-3 text-sm" : "px-4 py-2 text-sm";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={deploying || !connected}
          className={`rounded-lg font-semibold transition-colors disabled:opacity-40 ${pad} ${
            confirming
              ? "border border-amber-500/60 bg-amber-500/15 text-amber-300"
              : "bg-brand text-base hover:bg-brand-dim"
          }`}
        >
          {deploying
            ? "Deploying… waiting for the chain"
            : confirming
              ? isMainnet
                ? `Confirm — deploy on ${networkName} (real funds)`
                : `Confirm — deploy on ${networkName}`
              : "🚀 Deploy Database.sol"}
        </button>
        {confirming && !deploying && (
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-xs text-ink-faint hover:text-ink"
          >
            Cancel
          </button>
        )}
        {!connected && status && (
          <span className="text-xs text-red-400">
            Not connected — check the RPC in Settings.
          </span>
        )}
      </div>

      {confirming && (
        <p
          className={`text-xs ${isMainnet ? "text-amber-300" : "text-ink-faint"}`}
        >
          {isMainnet
            ? `⚠ This spends real ${status?.network?.currency ?? "funds"} on ${networkName}. Click confirm to proceed.`
            : `This sends one transaction from your wallet on ${networkName} and fills in the contract address automatically.`}
        </p>
      )}

      {pending && (
        <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-300">
          Transaction submitted and the address is saved — it's still
          confirming on-chain. No need to deploy again; it'll show as connected
          once mined.
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
