import { NextResponse } from "next/server";
import { getGlobalSearchResults } from "@/lib/query-data";

export async function GET(request) {
  const query = request.nextUrl.searchParams.get("q") || "";
  const results = await getGlobalSearchResults(query);
  return NextResponse.json(results);
}
