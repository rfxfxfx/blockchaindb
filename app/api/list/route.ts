import { NextRequest, NextResponse } from "next/server";
import { BlockchainDB } from "@/lib/database";
import { withApiAuth, apiOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const OPTIONS = apiOptions;

/**
 * GET /api/list?collection=users
 */
export const GET = withApiAuth(async (req: NextRequest) => {
  try {
    const collection = req.nextUrl.searchParams.get("collection");
    if (!collection) {
      return NextResponse.json(
        { error: "`collection` query param is required" },
        { status: 400 }
      );
    }
    const db = new BlockchainDB();
    const documents = await db.list(collection);
    return NextResponse.json({ documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "list failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
