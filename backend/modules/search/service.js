import { getGlobalSearchResults } from "@/lib/query-data";

export async function searchSuite(query) {
  return getGlobalSearchResults(query);
}
