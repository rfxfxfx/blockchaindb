import { NextRequest, NextResponse } from "next/server";
import { BlockchainDB } from "@/lib/database";
import { withApiAuth, apiOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const OPTIONS = apiOptions;

/**
 * GET /api/get?collection=users&id=1
 */
export const GET = withApiAuth(async (req: NextRequest) => {
  try {
    const collection = req.nextUrl.searchParams.get("collection");
    const idParam = req.nextUrl.searchParams.get("id");
    if (!collection) {
      return NextResponse.json(
        { error: "`collection` query param is required" },
        { status: 400 }
      );
    }
    const id = Number(idParam);
    if (!idParam || !Number.isInteger(id) || id < 1) {
      return NextResponse.json(
        { error: "`id` query param must be a positive integer" },
        { status: 400 }
      );
    }
    const db = new BlockchainDB();
    const document = await db.get(collection, id);
    return NextResponse.json({ document });
  } catch (error) {
    const message = error instanceof Error ? error.message : "get failed";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
