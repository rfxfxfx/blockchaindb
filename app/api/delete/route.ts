import { NextRequest, NextResponse } from "next/server";
import { BlockchainDB } from "@/lib/database";
import { withApiAuth, apiOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const OPTIONS = apiOptions;

/**
 * POST /api/delete
 * { "collection": "users", "id": 1 }
 */
export const POST = withApiAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { collection, id } = body ?? {};
    if (!collection || typeof collection !== "string") {
      return NextResponse.json(
        { error: "`collection` (string) is required" },
        { status: 400 }
      );
    }
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json(
        { error: "`id` must be a positive integer" },
        { status: 400 }
      );
    }
    const db = new BlockchainDB();
    const result = await db.delete(collection, id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete failed";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
