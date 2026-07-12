import { Contract } from "ethers";
import DatabaseArtifact from "@/abi/Database.json";
import { getConfig } from "./config";
import { getProvider, getWallet } from "./blockchain";

export const DATABASE_ABI = DatabaseArtifact.abi;

function requireAddress(): string {
  const { contractAddress } = getConfig();
  if (!contractAddress) {
    throw new Error(
      "CONTRACT_ADDRESS is not set. Deploy Database.sol (npm run deploy) and add the address in Settings or .env.local."
    );
  }
  return contractAddress;
}

/** Read-only contract bound to the provider (no key required). */
export function getReadContract(): Contract {
  return new Contract(requireAddress(), DATABASE_ABI, getProvider());
}

/** Writable contract bound to the owner wallet. */
export function getWriteContract(): Contract {
  return new Contract(requireAddress(), DATABASE_ABI, getWallet());
}
