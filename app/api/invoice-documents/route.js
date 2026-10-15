import { handleInvoiceRequest } from "@/lib/invoice-request-handler";

export const runtime = "nodejs";
export const GET = (request) => handleInvoiceRequest(request, "documents");
