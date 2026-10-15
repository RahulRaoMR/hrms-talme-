import { handleInvoiceRequest } from "@/lib/invoice-request-handler";

export const runtime = "nodejs";
export const GET = async (request, context) => handleInvoiceRequest(request, "file", await context.params);
