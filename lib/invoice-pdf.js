import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { amountInWords, calculateInvoice, getInvoiceCompany, money } from "./invoice-model.js";

export async function createInvoicePdf({ invoice, party, rows, documentType = "Tax Invoice" }) {
  const invoiceCompany = getInvoiceCompany(invoice.branchId);
  const doc = await PDFDocument.create();
  doc.setTitle(`${documentType} ${invoice.invoiceNo || "Draft"}`);
  doc.setAuthor(invoiceCompany.name);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const totals = calculateInvoice(invoice, rows, party);
  const left = 28, right = 567.28, width = right - left, pageHeight = 841.89;
  const ink = rgb(0.09, 0.11, 0.13), gray = rgb(0.38, 0.41, 0.44), rule = rgb(0.55, 0.57, 0.59);
  let page, y;
  const clean = (value) => String(value ?? "").replace(/\u20b9/g, "INR ").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/[^\x20-\x7e\n]/g, " ");
  function text(value, x, top, { size = 8.2, strong = false, align = "left", color = ink } = {}) {
    const font = strong ? bold : regular;
    const label = clean(value);
    const measured = font.widthOfTextAtSize(label, size);
    page.drawText(label, { x: align === "right" ? x - measured : align === "center" ? x - measured / 2 : x, y: pageHeight - top - size, size, font, color });
  }
  function line(x1, top1, x2, top2) {
    page.drawLine({ start: { x: x1, y: pageHeight - top1 }, end: { x: x2, y: pageHeight - top2 }, thickness: 0.5, color: rule });
  }
  function box(x, top, w, h, fill = false) {
    page.drawRectangle({ x, y: pageHeight - top - h, width: w, height: h, borderWidth: 0.5, borderColor: rule, ...(fill ? { color: rgb(0.95, 0.96, 0.97) } : {}) });
  }
  function wrap(value, maxWidth, size = 8.2, strong = false) {
    const font = strong ? bold : regular;
    const result = [];
    for (const paragraph of clean(value).split("\n")) {
      let current = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const next = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= maxWidth) { current = next; continue; }
        if (current) result.push(current);
        current = "";
        for (const character of word) {
          if (font.widthOfTextAtSize(current + character, size) > maxWidth) { result.push(current); current = ""; }
          current += character;
        }
      }
      result.push(current);
    }
    return result;
  }
  function wrapped(value, x, top, maxWidth, options = {}) {
    const size = options.size || 8.2, gap = options.gap || 11;
    const lines = wrap(value, maxWidth, size, options.strong);
    lines.forEach((label, i) => text(label, x, top + i * gap, options));
    return lines.length * gap;
  }
  function newPage(continued = false) {
    page = doc.addPage([595.28, pageHeight]);
    text(documentType, 297.64, 21, { size: 14, strong: true, align: "center" });
    text(invoice.copies || "Original", right, 25, { size: 7.5, align: "right", color: gray });
    y = 48;
    if (continued) {
      text(`${invoiceCompany.name} | Invoice ${invoice.invoiceNo || "Draft"} | Continued`, left, y, { size: 8, strong: true });
      y += 22;
    }
  }
  function ensure(height) { if (y + height > 795) newPage(true); }
  function date(value) { const parts = String(value || "").split("-"); return parts.length === 3 ? parts.reverse().join("/") : value || "-"; }
  newPage();
  const half = width / 2;
  const companyLines = [invoiceCompany.name, ...invoiceCompany.address.split("\n"), `UDYAM Reg No.: ${invoiceCompany.udyam}`, `GSTIN/UIN: ${invoiceCompany.gstin}`, "State: Karnataka, Code: 29", `CIN: ${invoiceCompany.cin}`, `E-Mail: ${invoiceCompany.email}`];
  const companyHeight = companyLines.reduce((height, label, i) => height + wrap(label, half - 16, i === 0 ? 9 : 8.2, i === 0).length * (i === 0 ? 13 : 11), 16);
  const billingLines = wrap(party.billing || "-", half - 16);
  const shippingLines = wrap(party.shipping || "", half - 16);
  const buyerLines = ["Buyer (Bill to)", party.name || "-", billingLines.slice(0, 6).join("\n"), `GSTIN/UIN: ${party.gstin || "Unregistered"}`, `PAN/IT No.: ${party.pan || party.gstin?.slice(2, 12) || "-"}`, `State: ${party.state || "-"}`, `Place of Supply: ${invoice.state === "Select" ? party.state || "-" : invoice.state || party.state || "-"}`, ...(party.shipping ? ["Ship to", shippingLines.slice(0, 5).join("\n")] : [])];
  const buyerHeight = buyerLines.reduce((height, label, i) => height + wrap(label, half - 16, 8.2, i === 1).length * 11, 16);
  const metadata = [
    ["Invoice No.", invoice.invoiceNo || "Draft", "Dated", date(invoice.invoiceDate)],
    ["Purchase Order No.", invoice.poNo || "-", "PO Date", date(invoice.poDate)],
    ["Payment Method", invoice.mode || "Credit", "Payment Terms", wrap(invoice.paymentTerms || "-", half / 2 - 14).length > 4 ? "See payment terms below" : invoice.paymentTerms || "-"],
    ["Delivery Note", invoice.deliveryNote || "-", "Destination", invoice.state === "Select" ? party.state || "-" : invoice.state || party.state || "-"]
  ];
  const metaHeights = metadata.map((row) => Math.max(wrap(row[1], half / 2 - 14, 8.2, true).length, wrap(row[3], half / 2 - 14, 8.2, true).length) * 11 + 25);
  const headerHeight = Math.max(companyHeight + buyerHeight, metaHeights.reduce((sum, h) => sum + h, 0) + 35);
  box(left, y, half, companyHeight);
  let cursor = y + 7;
  companyLines.forEach((label, i) => { cursor += wrapped(label, left + 8, cursor, half - 16, { size: i === 0 ? 9 : 8.2, strong: i === 0, gap: i === 0 ? 13 : 11 }); });
  box(left, y + companyHeight, half, headerHeight - companyHeight);
  cursor = y + companyHeight + 7;
  buyerLines.forEach((label, i) => { cursor += wrapped(label, left + 8, cursor, half - 16, { strong: i === 1, color: i === 0 ? gray : ink }); });
  cursor = y;
  metadata.forEach((row, i) => {
    [0, 1].forEach((column) => {
      const x = left + half + column * half / 2;
      box(x, cursor, half / 2, metaHeights[i]);
      text(row[column * 2], x + 7, cursor + 6, { size: 7.2, color: gray });
      wrapped(row[column * 2 + 1], x + 7, cursor + 18, half / 2 - 14, { strong: true });
    });
    cursor += metaHeights[i];
  });
  box(left + half, cursor, half, headerHeight - (cursor - y));
  text("Terms of Delivery", left + half + 7, cursor + 6, { size: 7.2, color: gray });
  const deliveryLines = wrap(invoice.deliveryTerms || "-", half - 14);
  // Keep unusually long optional terms in the flowing notes section below.
  if (deliveryLines.length * 11 <= headerHeight - (cursor - y) - 22) deliveryLines.forEach((label, i) => text(label, left + half + 7, cursor + 19 + i * 11));
  else text("See delivery terms below", left + half + 7, cursor + 19);
  const longDelivery = deliveryLines.length * 11 > headerHeight - (cursor - y) - 22;
  y += headerHeight;
  if (billingLines.length > 6) flowingText("Billing address (continued)", billingLines.slice(6).join(" "));
  if (shippingLines.length > 5) flowingText("Shipping address (continued)", shippingLines.slice(5).join(" "));

  const columns = [left, left + 25, left + 258, left + 314, left + 356, left + 418, left + 453, right];
  function cells(labels, height, { header = false, strong = false } = {}) {
    labels.forEach((value, i) => {
      const x = columns[i], cellWidth = columns[i + 1] - x;
      box(x, y, cellWidth, height, header);
      wrapped(value, i >= 3 && i !== 5 ? columns[i + 1] - 5 : x + 5, y + 7, cellWidth - 10, { size: header ? 7.4 : 8.2, strong: header || strong, align: i >= 3 && i !== 5 ? "right" : "left" });
    });
    y += height;
  }
  function itemHeader() { cells(["Sl No.", "Particulars", "HSN/SAC", "Qty", "Rate (INR)", "Per", "Amount (INR)"], 29, { header: true }); }
  ensure(60);
  itemHeader();
  const items = totals.items.filter((row) => row.item || row.amount);
  items.forEach((row, index) => {
    const description = [row.item, row.description, row.details].filter(Boolean).join("\n");
    const descriptionLines = wrap(description, columns[2] - columns[1] - 12);
    const values = [String(index + 1), "", row.hsn || "-", String(row.qty || ""), money(row.price), row.unit === "NONE" ? "-" : row.unit || "-", money(row.amount)];
    const numericLines = Math.max(...values.map((value, i) => wrap(value, columns[i + 1] - columns[i] - 10).length));
    let offset = 0;
    do {
      if (y + Math.max(46, numericLines * 11 + 16) > 795) { newPage(true); itemHeader(); }
      const capacity = Math.max(1, Math.floor((795 - y - 16) / 11));
      const chunk = descriptionLines.slice(offset, offset + capacity);
      const height = Math.max(46, Math.max(chunk.length, offset === 0 ? numericLines : 0) * 11 + 16);
      const rowTop = y;
      cells(offset === 0 ? values : ["", "", "", "", "", "", ""], height);
      chunk.forEach((label, i) => text(label, columns[1] + 6, rowTop + 7 + i * 11, { strong: offset === 0 && i === 0 }));
      offset += chunk.length;
    } while (offset < descriptionLines.length);
  });
  const taxLines = [["Taxable value", totals.subtotal], ...(totals.cgst ? [["OUTPUT CGST", totals.cgst], ["OUTPUT SGST", totals.sgst]] : []), ...(totals.igst ? [["OUTPUT IGST", totals.igst]] : []), ["Round off", totals.roundOff], ["Invoice total", totals.grand]];
  ensure(taxLines.length * 20 + 42);
  taxLines.forEach(([label, amount], index) => {
    const strong = index === taxLines.length - 1;
    box(left, y, width, 20, strong);
    text(label, right - 115, y + 5, { strong, align: "right", size: strong ? 9 : 8.2 });
    text(money(amount), right - 7, y + 5, { strong, align: "right", size: strong ? 9 : 8.2 });
    y += 20;
  });
  const amountWords = wrap(amountInWords(totals.grand), width - 16, 8.5, true);
  const wordsHeight = 24 + amountWords.length * 11;
  ensure(wordsHeight);
  box(left, y, width, wordsHeight);
  text("Amount Chargeable (in words)", left + 7, y + 5, { size: 7.2, color: gray });
  amountWords.forEach((label, i) => text(label, left + 7, y + 17 + i * 11, { size: 8.5, strong: true }));
  text("E. & O.E.", right - 7, y + 5, { size: 7, align: "right" });
  y += wordsHeight + 12;

  const summaryColumns = [left, left + 70, left + 159, left + 210, left + 282, left + 354, left + 424, right];
  function summaryRow(values, header = false, strong = false) {
    const height = Math.max(...values.map((value, i) => wrap(value, summaryColumns[i + 1] - summaryColumns[i] - 10, 7.5, header || strong).length)) * 10 + 12;
    if (y + height > 795) { newPage(true); if (!header) summaryRow(["HSN/SAC", "Taxable (INR)", "GST Rate", "CGST", "SGST", "IGST", "Total Tax"], true); }
    values.forEach((value, i) => {
      box(summaryColumns[i], y, summaryColumns[i + 1] - summaryColumns[i], height, header);
      wrapped(value, i > 0 ? summaryColumns[i + 1] - 5 : summaryColumns[i] + 5, y + 6, summaryColumns[i + 1] - summaryColumns[i] - 10, { size: 7.5, gap: 10, strong: header || strong, align: i > 0 ? "right" : "left" });
    });
    y += height;
  }
  ensure(75);
  summaryRow(["HSN/SAC", "Taxable (INR)", "GST Rate", "CGST", "SGST", "IGST", "Total Tax"], true);
  totals.groups.forEach((group) => summaryRow([group.hsn, money(group.taxable), `${Number((group.rate * 100).toFixed(2))}%`, group.interstate ? "-" : `${Number((group.rate * 50).toFixed(2))}%: ${money(group.cgst)}`, group.interstate ? "-" : `${Number((group.rate * 50).toFixed(2))}%: ${money(group.sgst)}`, group.interstate ? money(group.igst) : "-", money(group.tax)]));
  summaryRow(["Total", money(totals.subtotal), "", money(totals.cgst), money(totals.sgst), money(totals.igst), money(totals.tax)], false, true);
  function flowingText(label, value) {
    const labels = wrap(`${label}: ${value}`, width - 14);
    for (const part of labels) { ensure(14); text(part, left + 7, y + 4); y += 12; }
    y += 7;
  }
  flowingText("Tax Amount (in words)", amountInWords(totals.tax));
  if (totals.tds) flowingText(`TDS (${invoice.tds})`, `INR ${money(totals.tds)} | Net payable: INR ${money(totals.payable)}`);
  if (totals.received) flowingText("Received", `INR ${money(totals.received)} | Balance due: INR ${money(totals.balance)}`);
  if (invoice.notes) flowingText("Notes", invoice.notes);
  if (wrap(invoice.paymentTerms || "", half / 2 - 14).length > 4) flowingText("Payment terms", invoice.paymentTerms);
  if (longDelivery) flowingText("Delivery terms", invoice.deliveryTerms);
  const signatureHeight = Math.max(100, wrap(invoice.signatoryName || "", half - 16, 10, true).length * 12 + 65);
  ensure(signatureHeight);
  box(left, y, half, signatureHeight);
  box(left + half, y, half, signatureHeight);
  text("Company's Bank Details", left + 7, y + 7, { strong: true });
  let bankY = y + 23;
  [invoiceCompany.name, `Bank Name: ${invoiceCompany.bank}`, `A/c No.: ${invoiceCompany.account}`, `Branch & IFSC: ${invoiceCompany.ifsc}`, `Company's PAN: ${invoiceCompany.pan}`].forEach((label) => { bankY += wrapped(label, left + 7, bankY, half - 14, { size: 7.5, gap: 11 }); });
  wrapped(`for ${invoiceCompany.name}`, left + half + 8, y + 7, half - 16, { size: 8, strong: true });
  wrapped(invoice.signatoryName || "", left + half + 8, y + 40, half - 16, { size: 10, strong: true, gap: 12 });
  text("Authorised Signatory", right - 8, y + signatureHeight - 17, { align: "right", size: 8 });
  const pages = doc.getPages();
  pages.forEach((pdfPage, i) => {
    page = pdfPage;
    line(left, 810, right, 810);
    text(`Invoice ${invoice.invoiceNo || "Draft"}`, left, 815, { size: 7, color: gray });
    text(`Page ${i + 1} of ${pages.length}`, right, 815, { size: 7, color: gray, align: "right" });
  });
  return new Blob([await doc.save()], { type: "application/pdf" });
}
