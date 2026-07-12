import { NextRequest, NextResponse } from "next/server";
import { BlockchainDB } from "@/lib/database";
import { withApiAuth, apiOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const OPTIONS = apiOptions;

/** GET /api/collections — every collection with its live document count. */
export const GET = withApiAuth(async () => {
  try {
    const db = new BlockchainDB();
    const collections = await db.listCollections();
    return NextResponse.json({ collections });
  } catch (error) {
    const message = error instanceof Error ? error.message : "list failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

/**
 * POST /api/collections
 * { "name": "users" }
 */
export const POST = withApiAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "`name` (string) is required" },
        { status: 400 }
      );
    }
    const db = new BlockchainDB();
    const result = await db.createCollection(name);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "create collection failed";
    const status = message.includes("exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
