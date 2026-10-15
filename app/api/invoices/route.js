import { handleInvoiceRequest } from "@/lib/invoice-request-handler";

export const runtime = "nodejs";
export const GET = (request) => handleInvoiceRequest(request, "list");
export const POST = (request) => handleInvoiceRequest(request, "save");
