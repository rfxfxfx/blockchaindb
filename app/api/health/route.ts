import { NextRequest, NextResponse } from "next/server";
import { getConfig, networkName } from "@/lib/config";
import { getProvider, withTimeout } from "@/lib/blockchain";
import { isEncryptionAvailable } from "@/lib/crypto";
import { withApiAuth, apiOptions } from "@/lib/auth";
import { BlockchainDB } from "@/lib/database";

export const dynamic = "force-dynamic";
export const OPTIONS = apiOptions;

/**
 * GET /api/health — a safe, public-facing status for API consumers.
 * Reports network + contract + counts, but never the wallet or balance.
 */
export const GET = withApiAuth(async () => {
  const config = getConfig();
  try {
    const provider = getProvider();
    const network = await withTimeout(provider.getNetwork());
    const chainId = Number(network.chainId);
    let collections = 0;
    let documents = 0;
    if (config.contractAddress) {
      const stats = await new BlockchainDB().stats();
      collections = stats.collections;
      documents = stats.documents;
    }
    return NextResponse.json({
      ok: true,
      network: { name: networkName(chainId), chainId },
      contract: config.contractAddress || null,
      encrypted: isEncryptionAvailable(),
      collections,
      documents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unreachable";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
});
