import { handleInvoiceRequest } from "@/lib/invoice-request-handler";

export const runtime = "nodejs";
export const GET = async (request, context) => handleInvoiceRequest(request, "get", await context.params);
export const PATCH = async (request, context) => handleInvoiceRequest(request, "save", await context.params);
export const DELETE = async (request, context) => handleInvoiceRequest(request, "delete", await context.params);
