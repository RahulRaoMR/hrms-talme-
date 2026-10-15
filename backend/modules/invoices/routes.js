import { Router } from "express";
import { punchUser } from "../../lib/punch-regularization.js";
import { deleteInvoice, getInvoice, getInvoiceFile, listInvoiceDocuments, listInvoices, requireInvoiceAccess, saveInvoice } from "../../../lib/invoice-records.js";

export function invoiceRoutes(prisma) {
  const router = Router();
  const handle = (action) => async (req, res, next) => {
    try {
      const user = punchUser(req.headers.authorization);
      requireInvoiceAccess(user);
      await action(req, res, user);
    } catch (error) {
      if (error.code === "P2002") return res.status(409).json({ error: "This invoice number already exists." });
      if (["P2021", "P2022"].includes(error.code)) return res.status(503).json({ error: "The invoice database needs the shared invoice documents migration." });
      next(error);
    }
  };
  router.get("/invoices", handle(async (_req, res, user) => res.set("Cache-Control", "private, no-store").json(await listInvoices(prisma, user))));
  router.post("/invoices", handle(async (req, res, user) => res.status(201).json(await saveInvoice(prisma, user, req.body))));
  router.get("/invoices/:id", handle(async (req, res, user) => res.set("Cache-Control", "private, no-store").json(await getInvoice(prisma, user, req.params.id))));
  router.patch("/invoices/:id", handle(async (req, res, user) => res.json(await saveInvoice(prisma, user, req.body, req.params.id))));
  router.delete("/invoices/:id", handle(async (req, res, user) => res.json(await deleteInvoice(prisma, user, req.params.id))));
  router.get("/invoice-documents", handle(async (_req, res, user) => res.set("Cache-Control", "private, no-store").json(await listInvoiceDocuments(prisma, user))));
  const file = handle(async (req, res, user) => {
    const document = await getInvoiceFile(prisma, user, req.params.id, req.params.documentId);
    res.set({ "Content-Type": document.mimeType, "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.fileName)}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" });
    res.send(Buffer.from(document.data));
  });
  router.get("/invoices/:id/pdf", file);
  router.get("/invoices/:id/documents/:documentId", file);
  return router;
}
