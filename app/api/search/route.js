import { getResource } from "@/lib/local-api-store";
import { proxyToConfiguredApi } from "@/lib/server-api";

const emptyResults = {
  employees: [],
  candidates: [],
  vendors: [],
  invoices: [],
  documents: [],
  approvals: []
};

const searchFields = {
  employees: ["name", "employeeId", "department", "location"],
  candidates: ["name", "role", "source"],
  vendors: ["vendor", "category"],
  invoices: ["vendor", "invoiceNo", "amount"],
  documents: ["owner", "docType", "module"],
  approvals: ["title", "owner", "module"]
};

export async function GET(request) {
  const proxiedResponse = await proxyToConfiguredApi(request, `/api/search${new URL(request.url).search}`);

  if (proxiedResponse) {
    return proxiedResponse;
  }

  const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() || "";

  return Response.json(
    Object.fromEntries(
      Object.entries(searchFields).map(([resource, fields]) => [
        resource,
        getSearchItems(getResource(resource) || [], query, fields)
      ])
    )
  );
}

function getSearchItems(items, query, fields) {
  if (!query) return items;
  return filterItems(items, query, fields);
}

function filterItems(items, query, fields) {
  return items.filter((item) =>
    fields.some((field) => String(item[field] || "").toLowerCase().includes(query))
  );
}
