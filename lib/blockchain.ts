import { JsonRpcProvider, Wallet, formatEther } from "ethers";
import { getConfig, networkName, explorerUrl } from "./config";

/** Reject after `ms` so a dead RPC can't hang a request. */
export function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`RPC timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export function getProvider(): JsonRpcProvider {
  const { rpcUrl } = getConfig();
  // staticNetwork skips a network-detection roundtrip per instantiation.
  return new JsonRpcProvider(rpcUrl, undefined, { staticNetwork: false });
}

export function getWallet(): Wallet {
  const { privateKey } = getConfig();
  if (!privateKey) {
    throw new Error("PRIVATE_KEY is not set. Add it in Settings or .env.local.");
  }
  return new Wallet(privateKey, getProvider());
}

export interface NetworkSnapshot {
  name: string;
  chainId: number;
  blockNumber: number;
  rpcUrl: string;
  explorerUrl: string | null;
  walletAddress: string | null;
  balance: string | null;
}

export async function getNetworkSnapshot(): Promise<NetworkSnapshot> {
  const { rpcUrl, privateKey } = getConfig();
  const provider = getProvider();
  const [network, blockNumber] = await withTimeout(
    Promise.all([provider.getNetwork(), provider.getBlockNumber()])
  );
  const chainId = Number(network.chainId);

  let walletAddress: string | null = null;
  let balance: string | null = null;
  if (privateKey) {
    const wallet = new Wallet(privateKey, provider);
    walletAddress = wallet.address;
    balance = formatEther(await withTimeout(provider.getBalance(wallet.address)));
  }

  return {
    name: networkName(chainId),
    chainId,
    blockNumber,
    rpcUrl,
    explorerUrl: explorerUrl(chainId),
    walletAddress,
    balance,
  };
}
