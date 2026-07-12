import { NextRequest, NextResponse } from "next/server";
import { BlockchainDB } from "@/lib/database";
import { withApiAuth, apiOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const OPTIONS = apiOptions;

/**
 * POST /api/create
 * { "collection": "users", "data": { "name": "John", "age": 25 } }
 */
export const POST = withApiAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { collection, data } = body ?? {};
    if (!collection || typeof collection !== "string") {
      return NextResponse.json(
        { error: "`collection` (string) is required" },
        { status: 400 }
      );
    }
    if (data === undefined) {
      return NextResponse.json({ error: "`data` is required" }, { status: 400 });
    }
    const db = new BlockchainDB();
    const result = await db.create(collection, data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
