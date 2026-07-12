"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NETWORKS, DEFAULT_NETWORK, findByRpcUrl } from "@/lib/networks";

type Tab = "testnet" | "mainnet";

export default function SettingsPage() {
  const [rpcUrl, setRpcUrl] = useState(DEFAULT_NETWORK.rpcUrl);
  const [customRpc, setCustomRpc] = useState(false);
  const [tab, setTab] = useState<Tab>("testnet");
  const [privateKey, setPrivateKey] = useState("");
  const [privateKeySet, setPrivateKeySet] = useState(false);
  const [contractAddress, setContractAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [confirmDeploy, setConfirmDeploy] = useState(false);
  // Gate Save/Deploy on a successful load so a failed initial fetch can't let
  // the user overwrite stored settings with the default form values.
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  const loadSettings = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("load failed");
      const s = await res.json();
      const saved: string = s.rpcUrl || DEFAULT_NETWORK.rpcUrl;
      setRpcUrl(saved);
      setContractAddress(s.contractAddress ?? "");
      setPrivateKeySet(Boolean(s.privateKeySet));
      const preset = findByRpcUrl(saved);
      setCustomRpc(!preset);
      if (preset) setTab(preset.testnet ? "testnet" : "mainnet");
      setLoaded(true);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const selected = useMemo(
    () => (customRpc ? undefined : findByRpcUrl(rpcUrl)),
    [rpcUrl, customRpc]
  );
  const visibleNetworks = NETWORKS.filter((n) =>
    tab === "testnet" ? n.testnet : !n.testnet
  );
  const mainnetSelected = selected ? !selected.testnet : false;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, string> = { rpcUrl, contractAddress };
      // Only send the key if the user typed one; blank keeps the existing key.
      if (privateKey.trim()) payload.privateKey = privateKey.trim();
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Save failed");
      setMessage({ kind: "ok", text: "Saved to .env.local" });
      if (privateKey.trim()) setPrivateKeySet(true);
      setPrivateKey("");
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Save failed",
      });
    } finally {
      setSaving(false);
    }
  };

  const deploy = async () => {
    if (!confirmDeploy) {
      setConfirmDeploy(true);
      return;
    }
    setConfirmDeploy(false);
    setDeploying(true);
    setMessage(null);
    try {
      // Persist pending edits first so the deploy uses what's on screen.
      const payload: Record<string, string> = { rpcUrl, contractAddress };
      if (privateKey.trim()) payload.privateKey = privateKey.trim();
      const saveRes = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const saveBody = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveBody.error ?? "Save failed");
      if (privateKey.trim()) setPrivateKeySet(true);
      setPrivateKey("");

      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Deploy failed");
      setContractAddress(body.address);
      setMessage({
        kind: "ok",
        text:
          body.confirmed === false
            ? `Submitted to ${body.network} — ${body.address} saved, still confirming on-chain.`
            : `Deployed to ${body.address} on ${body.network} — saved to .env.local`,
      });
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Deploy failed",
      });
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="mt-0.5 text-sm text-ink-faint">
          Pick a network, add a wallet, deploy — settings persist to{" "}
          <code className="font-mono text-xs">.env.local</code> and apply
          immediately.
        </p>
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm">
          <span className="text-red-300">
            Couldn't load your current settings — saving now could overwrite
            them. Retry before making changes.
          </span>
          <button
            onClick={loadSettings}
            className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/10"
          >
            Retry
          </button>
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
        {/* ---- network ---- */}
        <section className="rounded-xl border border-base-border bg-base-panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Network</h3>
              <p className="mt-0.5 text-xs text-ink-faint">
                Any EVM-compatible chain. Default:{" "}
                <span className="text-brand">{DEFAULT_NETWORK.name}</span>.
              </p>
            </div>
            <div className="flex rounded-lg border border-base-border p-0.5">
              {(["testnet", "mainnet"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    tab === t
                      ? "bg-base-raised text-ink"
                      : "text-ink-faint hover:text-ink-soft"
                  }`}
                >
                  {t}s
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {visibleNetworks.map((n) => {
              const active = !customRpc && selected?.id === n.id;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setCustomRpc(false);
                    setRpcUrl(n.rpcUrl);
                  }}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                    active
                      ? "border-brand/60 bg-brand-faint"
                      : "border-base-border hover:border-base-border hover:bg-base-raised"
                  }`}
                >
                  <span>
                    <span
                      className={`block text-sm font-medium ${active ? "text-brand" : ""}`}
                    >
                      {n.name}
                      {n.id === DEFAULT_NETWORK.id && (
                        <span className="ml-2 rounded-full bg-brand-faint px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                          default
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-faint">
                      Chain {n.chainId} · {n.currency}
                    </span>
                  </span>
                  <span
                    className={`h-3 w-3 rounded-full border ${
                      active
                        ? "border-brand bg-brand"
                        : "border-ink-faint/40"
                    }`}
                  />
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCustomRpc(true)}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                customRpc
                  ? "border-brand/60 bg-brand-faint"
                  : "border-dashed border-base-border hover:bg-base-raised"
              }`}
            >
              <span>
                <span
                  className={`block text-sm font-medium ${customRpc ? "text-brand" : ""}`}
                >
                  Custom RPC
                </span>
                <span className="mt-0.5 block text-xs text-ink-faint">
                  Any other EVM endpoint
                </span>
              </span>
              <span
                className={`h-3 w-3 rounded-full border ${
                  customRpc ? "border-brand bg-brand" : "border-ink-faint/40"
                }`}
              />
            </button>
          </div>

          {customRpc ? (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-faint">
                RPC URL
              </label>
              <input
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-lg border border-base-border bg-base px-3 py-2 font-mono text-[13px] outline-none focus:border-brand/60"
              />
            </div>
          ) : (
            <p className="mt-4 truncate font-mono text-xs text-ink-faint">
              RPC: {rpcUrl}
            </p>
          )}

          {mainnetSelected && (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              ⚠ Mainnet selected — every write costs real{" "}
              {selected?.currency ?? "gas"}.
            </p>
          )}
          {selected?.testnet && selected.faucetUrl && (
            <p className="mt-4 text-xs text-ink-faint">
              Need test {selected.currency}?{" "}
              <a
                href={selected.faucetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-brand hover:underline"
              >
                Get some from the {selected.name} faucet ↗
              </a>
            </p>
          )}
        </section>

        {/* ---- wallet ---- */}
        <section className="rounded-xl border border-base-border bg-base-panel p-6">
          <h3 className="text-sm font-semibold">Wallet</h3>
          <p className="mb-4 mt-0.5 text-xs text-ink-faint">
            Signs every write. Use a dedicated key — it never leaves this
            machine.
          </p>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-faint">
            Wallet Private Key
          </label>
          <input
            type="password"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder={
              privateKeySet ? "•••••••• (already set — type to replace)" : "0x…"
            }
            autoComplete="off"
            className="w-full rounded-lg border border-base-border bg-base px-3 py-2 font-mono text-[13px] outline-none focus:border-brand/60"
          />
        </section>

        {/* ---- contract ---- */}
        <section className="rounded-xl border border-base-border bg-base-panel p-6">
          <h3 className="text-sm font-semibold">Smart Contract</h3>
          <p className="mb-4 mt-0.5 text-xs text-ink-faint">
            Contract addresses are per-network — switching networks means
            deploying (or pasting) a contract on that chain.
          </p>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-faint">
            Contract Address
          </label>
          <input
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder="0x… (or deploy below)"
            className="w-full rounded-lg border border-base-border bg-base px-3 py-2 font-mono text-[13px] outline-none focus:border-brand/60"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={deploy}
              disabled={deploying || saving || !loaded}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
                confirmDeploy
                  ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                  : "border-brand/50 text-brand hover:bg-brand-faint"
              }`}
            >
              {deploying
                ? "Deploying… (waiting for the chain)"
                : confirmDeploy
                  ? `Click again to deploy on ${selected?.name ?? "this network"}`
                  : "Deploy Database.sol"}
            </button>
            {confirmDeploy && !deploying && (
              <button
                type="button"
                onClick={() => setConfirmDeploy(false)}
                className="text-xs text-ink-faint hover:text-ink"
              >
                Cancel
              </button>
            )}
            <span className="text-xs text-ink-faint">
              Sends a transaction from your wallet and fills the address in
              automatically.
            </span>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || deploying || !loaded}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-base hover:bg-brand-dim disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {message && (
            <span
              className={`text-sm ${
                message.kind === "ok" ? "text-brand" : "text-red-400"
              }`}
            >
              {message.kind === "ok" ? "✓ " : ""}
              {message.text}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
