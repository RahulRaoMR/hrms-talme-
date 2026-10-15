import { canUsePersistentDatabase, hasPersistentDatabase, isDatabaseUnavailableError, prisma } from "@/lib/prisma-store";
import { proxyToConfiguredApi } from "@/lib/server-api";
import { resolvePunchUser } from "@/lib/punch-request-handler";
import { deleteInvoice, getInvoice, getInvoiceFile, listInvoiceDocuments, listInvoices, requireInvoiceAccess, saveInvoice } from "./invoice-records.js";

export async function handleInvoiceRequest(request, action, { id, documentId } = {}) {
  try {
    if (!hasPersistentDatabase) {
      const url = new URL(request.url);
      const proxied = await proxyToConfiguredApi(request, url.pathname + url.search);
      if (proxied) return proxied;
    }
    const user = await resolvePunchUser(request);
    requireInvoiceAccess(user);
    if (!canUsePersistentDatabase()) return Response.json({ error: "The invoice database is unavailable. Your changes have not been saved. Please retry." }, { status: 503 });
    if (action === "file") {
      const file = await getInvoiceFile(prisma, user, id, documentId);
      return new Response(new Uint8Array(file.data), { headers: {
        "Content-Type": file.mimeType, "Content-Length": String(file.size),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox"
      } });
    }
    let result;
    if (action === "list") result = await listInvoices(prisma, user);
    else if (action === "documents") result = await listInvoiceDocuments(prisma, user);
    else if (action === "get") result = await getInvoice(prisma, user, id);
    else if (action === "delete") result = await deleteInvoice(prisma, user, id);
    else {
      const payload = await request.json().catch(() => { throw Object.assign(new Error("Invalid invoice JSON."), { status: 400 }); });
      result = await saveInvoice(prisma, user, payload, id);
    }
    return Response.json(result, { status: action === "save" && !id ? 201 : 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error.code === "P2002") return Response.json({ error: "This invoice number already exists. Open that invoice or choose another number." }, { status: 409 });
    if (error.code === "P2021" || error.code === "P2022") return Response.json({ error: "The invoice database needs the shared invoice documents migration." }, { status: 503 });
    if (!error.status) console.error("Invoice request failed:", error.code || error.name);
    return Response.json({ error: error.status ? error.message : isDatabaseUnavailableError(error) ? "The invoice database is unavailable. Please retry." : "Unable to save or load the invoice. Please retry." }, { status: error.status || 503 });
  }
}
