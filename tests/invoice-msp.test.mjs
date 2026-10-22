import assert from "node:assert/strict";
import test from "node:test";
import { calculateInvoice, calculateInvoiceMsp, defaultInvoiceMsp, invoiceMspValidation, invoiceValidation, meghaInvoiceParty } from "../lib/invoice-model.js";
import { getInvoice, getInvoiceFile, saveInvoice } from "../lib/invoice-records.js";
import { invoiceListSummary, invoiceSalesSeries } from "../lib/invoice-list.js";
import { createInvoicePdf } from "../lib/invoice-pdf.js";
import { invoiceTestDatabase } from "./helpers/invoice-db.mjs";
import { invoicePdfText } from "./helpers/invoice-pdf.mjs";
import { referenceInvoice, referenceParty, referenceRows } from "./helpers/invoice-msp-reference.mjs";

const user = { email: "msp-check@example.test", role: "Accounts" };
const invoice = { invoiceNo: "MSP-CHECK", invoiceDate: "2026-10-22", state: "Karnataka", tax: "GST@18%", tds: "NONE (0%)", roundOff: false };
const rows = [{ id: 1, item: "Contract staffing", hsn: "998513", qty: "1", price: "100000", tax: "Select" }];
const msp = { mspApplicable: true, mspTreatment: "DEDUCTION", mspType: "PERCENTAGE", mspRate: "5", mspChannel: "ABC Platform" };
const payload = (data = {}, items = rows) => ({ invoiceNo: invoice.invoiceNo, invoiceData: { ...invoice, ...data }, partyData: { ...meghaInvoiceParty }, rowsData: items });

test("MSP defaults to zero for historical invoices and when disabled", () => {
  assert.equal(calculateInvoiceMsp({}, 100000), 0);
  assert.equal(calculateInvoiceMsp({ mspApplicable: false, mspType: "FIXED", mspAmount: "5000" }, 100000), 0);
  assert.equal(invoiceMspValidation({ mspApplicable: false, mspRate: "invalid", mspAmount: "-1" }), "");
});

test("percentage and fixed MSP use the service subtotal and round to paise", () => {
  const percentage = { mspApplicable: true, mspType: "PERCENTAGE", mspRate: "5" };
  assert.equal(calculateInvoiceMsp(percentage, 100000), 5000);
  assert.equal(calculateInvoiceMsp({ ...percentage, mspRate: "0" }, 100000), 0);
  assert.equal(calculateInvoiceMsp({ ...percentage, mspRate: "0.005" }, 100), 0.01);
  assert.equal(calculateInvoiceMsp({ ...percentage, mspRate: "33.3333" }, 0.03), 0.01);
  assert.equal(calculateInvoiceMsp({ mspApplicable: true, mspType: "FIXED", mspAmount: "3,000.25" }, 100000), 3000.25);
});

test("MSP validation rejects malformed values, negative amounts and unsupported precision", () => {
  const percentage = { mspApplicable: true, mspType: "PERCENTAGE", mspRate: "5" };
  assert.equal(invoiceMspValidation(percentage), "");
  for (const value of ["", "-1", "101", "Infinity", "NaN", "abc", "1e2", "0.00001", "1000000000000000000000000000"]) {
    assert.match(invoiceMspValidation({ ...percentage, mspRate: value }), /MSP rate/, value);
  }
  for (const value of ["", "-1", "NaN", "Infinity", "abc", "0.001", "90071992547409.92"]) {
    assert.match(invoiceMspValidation({ mspApplicable: true, mspType: "FIXED", mspAmount: value }), /MSP amount/, value);
  }
  for (const value of ["0", "0.01", ".50", "3000.25"]) {
    assert.equal(invoiceMspValidation({ mspApplicable: true, mspType: "FIXED", mspAmount: value }), "", value);
  }
  assert.match(invoiceMspValidation({ ...percentage, mspType: "OTHER" }), /MSP type/);
  assert.match(invoiceMspValidation({ ...percentage, mspApplicable: "false" }), /Yes or No/);
  assert.match(invoiceMspValidation({ ...percentage, mspChannel: "x".repeat(201) }), /200 characters/);
  assert.equal(invoiceMspValidation({ ...percentage, mspTreatment: "FEE", mspTax: "GST@99%" }), "");
});

test("MSP defaults to a deduction before GST consistently in calculations, API storage and PDF", async () => {
  assert.equal(defaultInvoiceMsp.mspApplicable, false);
  assert.equal(defaultInvoiceMsp.mspTreatment, "DEDUCTION");
  const fields = { ...msp };
  delete fields.mspTreatment;
  const draft = { ...invoice, ...fields };
  const totals = calculateInvoice(draft, rows);
  assert.equal(totals.mspTreatment, "DEDUCTION");
  assert.equal(totals.mspFee, 0);
  assert.equal(totals.mspDeduction, 5000);
  assert.equal(totals.amountBeforeTax, 95000);
  assert.equal(totals.grand, 112100);
  assert.equal(totals.payable, 112100);
  const db = invoiceTestDatabase();
  const saved = await saveInvoice(db, user, payload(fields));
  assert.equal(saved.invoiceData.mspTreatment, "DEDUCTION");
  assert.equal(saved.mspTreatment, "DEDUCTION");
  assert.equal(saved.amount, "INR 1,12,100.00");
  assert.equal(saved.balance, saved.amount);
  const pdf = await createInvoicePdf({ invoice: draft, party: meghaInvoiceParty, rows });
  const text = await invoicePdfText(new Uint8Array(await pdf.arrayBuffer()));
  assert.ok(text.includes("MSP fees (-5%) - ABC Platform"));
  assert.ok(text.includes("(-5,000.00)"));
  assert.ok(text.includes("95,000.00"));
  assert.ok(text.includes("1,12,100.00"));
});

test("MSP reduces the taxable value and GST once while the existing TDS calculation is retained", () => {
  const result = calculateInvoice({ ...invoice, ...msp, tds: "2%" }, rows);
  assert.equal(result.mspAmount, 5000);
  assert.equal(result.subtotal, 100000);
  assert.equal(result.amountBeforeTax, 95000);
  assert.equal(result.cgst, 8550);
  assert.equal(result.sgst, 8550);
  assert.equal(result.tax, 17100);
  assert.equal(result.grand, 112100);
  assert.equal(result.tds, 2000);
  assert.equal(result.payable, 110100);
  assert.equal(result.balance, 110100);
  assert.equal(result.groups[0].taxable, 95000);
  const fixed = calculateInvoice({ ...invoice, mspApplicable: true, mspTreatment: "DEDUCTION", mspType: "FIXED", mspAmount: "3000" }, rows);
  assert.equal(fixed.payable, 114460);
  assert.equal(invoiceValidation({ ...invoice, mspApplicable: true, mspType: "FIXED", mspAmount: "100000.01" }, meghaInvoiceParty, rows), "MSP deduction cannot exceed the service subtotal.");
});

test("old added-fee flags cannot bypass the deduction and existing GST/place-of-supply choices still apply", () => {
  const fee = { ...invoice, ...msp, mspTreatment: "FEE" };
  const noFeeTax = calculateInvoice(fee, rows);
  assert.equal(noFeeTax.subtotal, 100000);
  assert.equal(noFeeTax.amountBeforeTax, 95000);
  assert.equal(noFeeTax.tax, 17100);
  assert.equal(noFeeTax.grand, 112100);
  assert.equal(noFeeTax.mspDeduction, 5000);
  const taxed = calculateInvoice({ ...fee, mspTax: "GST@18%" }, rows);
  assert.equal(taxed.cgst, 8550);
  assert.equal(taxed.sgst, 8550);
  assert.equal(taxed.grand, 112100);
  assert.equal(taxed.serviceTax, 17100);
  assert.equal(taxed.groups.reduce((total, group) => total + group.taxable, 0), 95000);
  const interstate = calculateInvoice({ ...fee, state: "Maharashtra", mspTax: "GST@5%" }, rows);
  assert.equal(interstate.igst, 17100);
  assert.equal(interstate.cgst, 0);
  const override = calculateInvoice({ ...fee, state: "Maharashtra" }, [{ ...rows[0], tax: "CGST+SGST@5%" }]);
  assert.equal(override.igst, 0);
  assert.equal(override.cgst, 2375);
  assert.equal(override.sgst, 2375);
});

test("zero MSP, mixed item GST, decimal paise and round-off remain consistent", () => {
  for (const mspTreatment of ["DEDUCTION", "FEE"]) {
    const zero = calculateInvoice({ ...invoice, ...msp, mspRate: "0", mspTreatment }, rows);
    assert.equal(zero.mspAmount, 0);
    assert.equal(zero.payable, 118000);
  }
  const mixedRows = [{ ...rows[0], price: "0.10" }, { ...rows[0], price: "0.20", tax: "NONE" }];
  const mixed = calculateInvoice({ ...invoice, ...msp, mspRate: "5" }, mixedRows);
  assert.equal(mixed.subtotal, 0.3);
  assert.equal(mixed.mspAmount, 0.02);
  assert.equal(mixed.tax, 0.02);
  assert.equal(mixed.payable, 0.3);
  const rounded = calculateInvoice({ ...invoice, ...msp, roundOff: true }, [{ ...rows[0], price: "2110" }]);
  assert.equal(rounded.grand, 2365);
  assert.equal(rounded.mspAmount, 105.5);
  assert.equal(rounded.payable, 2365);
});

test("the API recalculates MSP, persists its decimal fields, and ignores forged totals", async () => {
  const db = invoiceTestDatabase();
  const saved = await saveInvoice(db, user, { ...payload({ ...msp, mspAmount: "1", mspRate: "5.0000" }), amount: "1", balance: "1" });
  assert.equal(saved.mspAmount, 5000);
  assert.equal(saved.mspRate, 5);
  assert.equal(saved.amount, "INR 1,12,100.00");
  assert.equal(saved.balance, "INR 1,12,100.00");
  assert.equal(saved.invoiceData.mspAmount, "5000");
  const stored = db.state.invoices[0];
  assert.equal(stored.mspAmount, "5000");
  assert.equal(stored.mspRate, "5");
  assert.equal(stored.mspChannel, "ABC Platform");
  assert.equal((await getInvoice(db, user, saved.id)).invoiceData.mspRate, "5");
  const frontend = calculateInvoice({ ...invoice, ...msp }, rows);
  assert.equal(Number(saved.invoiceData.mspAmount), frontend.mspAmount);
  assert.equal(saved.balance, `INR ${frontend.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`);
});

test("MSP edits recalculate rates and item changes, switch types, and disable cleanly", async () => {
  const db = invoiceTestDatabase();
  let saved = await saveInvoice(db, user, payload(msp));
  const edit = async (fields, items = saved.rowsData) => {
    saved = await saveInvoice(db, user, { ...saved, invoiceData: { ...saved.invoiceData, ...fields }, rowsData: items }, saved.id);
    return saved;
  };
  await edit({ mspRate: "6" });
  assert.equal(saved.mspAmount, 6000);
  await edit({}, [{ ...rows[0], price: "200000" }]);
  assert.equal(saved.mspAmount, 12000);
  await edit({ mspType: "FIXED", mspAmount: "3000.25" });
  assert.equal(saved.mspRate, null);
  assert.equal(saved.mspAmount, 3000.25);
  await edit({ mspTreatment: "FEE", mspTax: "GST@5%" });
  assert.equal(saved.amount, "INR 2,32,459.71");
  assert.equal(saved.mspTreatment, "DEDUCTION");
  assert.equal(saved.mspTax, "NONE");
  await edit({ mspApplicable: false });
  assert.equal(saved.mspAmount, 0);
  assert.equal(saved.mspApplicable, false);
  assert.equal(saved.mspType, null);
  assert.equal(saved.mspChannel, null);
  assert.equal(saved.amount, "INR 2,36,000.00");
  assert.equal(saved.balance, saved.amount);
  assert.equal(saved.invoiceData.mspChannel, "");
});

test("unpaid, partial and full payments use net payable without counting MSP as cash", async () => {
  for (const mspTreatment of ["DEDUCTION", "FEE"]) {
    for (const receivedAmount of [0, 10000, 112100]) {
      const db = invoiceTestDatabase();
      const saved = await saveInvoice(db, user, payload({ ...msp, mspTreatment, received: receivedAmount > 0, receivedAmount: String(receivedAmount) }));
      assert.equal(saved.status, receivedAmount === 0 ? "Unpaid" : receivedAmount === 10000 ? "Part Paid" : "Paid");
      const summary = invoiceListSummary([saved]);
      const totals = calculateInvoice(saved.invoiceData, saved.rowsData, saved.partyData);
      assert.equal(summary.invoiced, totals.grand);
      assert.equal(summary.received, receivedAmount);
      assert.equal(summary.outstanding, totals.payable - receivedAmount);
      assert.equal(invoiceSalesSeries([saved], "month", new Date(2026, 9, 22)).total, totals.grand);
    }
  }
  const db = invoiceTestDatabase();
  await assert.rejects(saveInvoice(db, user, payload({ ...msp, received: true, receivedAmount: "118000" })), { status: 400 });
});

test("invalid MSP payloads fail before any invoice or PDF writes", async () => {
  const db = invoiceTestDatabase();
  for (const fields of [{ mspRate: "-1" }, { mspRate: "101" }, { mspApplicable: "false" }, { mspType: "OTHER" }, { mspType: "FIXED", mspAmount: "-1" }, { mspType: "FIXED", mspAmount: "100000.01" }, { mspChannel: "x".repeat(201) }]) {
    await assert.rejects(saveInvoice(db, user, payload({ ...msp, ...fields })), { status: 400 });
  }
  assert.equal(db.state.invoices.length, 0);
  assert.equal(db.state.documents.length, 0);
});

test("MSP appears in PDFs with channel, payable and balance while historical invoices stay unchanged", async () => {
  for (const mspTreatment of ["DEDUCTION", "FEE"]) {
    const db = invoiceTestDatabase();
    const saved = await saveInvoice(db, user, payload({ ...msp, mspTreatment, received: true, receivedAmount: "10000" }));
    const text = await invoicePdfText((await getInvoiceFile(db, user, saved.id)).data);
    assert.ok(text.includes("MSP fees (-5%) - ABC Platform"));
    assert.ok(text.includes("(-5,000.00)"));
    assert.ok(text.includes("1,12,100.00"));
    assert.ok(text.includes("1,02,100.00"));
  }
  const legacyBlob = await createInvoicePdf({ invoice, party: meghaInvoiceParty, rows });
  const legacyText = await invoicePdfText(new Uint8Array(await legacyBlob.arrayBuffer()));
  const disabledBlob = await createInvoicePdf({ invoice: { ...invoice, ...msp, mspApplicable: false }, party: meghaInvoiceParty, rows });
  assert.equal(await invoicePdfText(new Uint8Array(await disabledBlob.arrayBuffer())), legacyText);
  assert.equal(legacyText.includes("MSP fees"), false);
  const db = invoiceTestDatabase();
  const legacy = await saveInvoice(db, user, payload());
  assert.equal(legacy.amount, "INR 1,18,000.00");
  assert.equal(legacy.balance, "INR 1,18,000.00");
  assert.equal(legacy.mspApplicable, false);
  assert.equal(legacy.mspAmount, 0);
});

test("old records without MSP fields can be read and edited without changing their amounts or saved PDFs", async () => {
  const db = invoiceTestDatabase();
  const saved = await saveInvoice(db, user, payload());
  const stored = db.state.invoices[0];
  for (const key of Object.keys(stored.details.invoiceData).filter((key) => key.startsWith("msp"))) delete stored.details.invoiceData[key];
  const originalPdf = Buffer.from((await getInvoiceFile(db, user, saved.id)).data);
  const loaded = await getInvoice(db, user, saved.id);
  assert.equal(loaded.invoiceData.mspApplicable, undefined);
  assert.deepEqual(Buffer.from((await getInvoiceFile(db, user, loaded.id)).data), originalPdf);
  const updated = await saveInvoice(db, user, { ...loaded, invoiceData: { ...loaded.invoiceData, notes: "Historical invoice edited" } }, loaded.id);
  assert.equal(updated.amount, loaded.amount);
  assert.equal(updated.balance, loaded.balance);
  assert.equal(updated.mspApplicable, false);
  assert.equal(updated.mspAmount, 0);
});

test("the actual Micron service lines deduct 2.32% before IGST and round to INR 60,582", async () => {
  const totals = calculateInvoice(referenceInvoice, referenceRows, referenceParty);
  assert.equal(totals.subtotal, 52560);
  assert.equal(totals.mspAmount, 1219.39);
  assert.equal(totals.amountBeforeTax, 51340.61);
  // The supplied PDF prints 9,241.30; normal two-decimal rounding gives 9,241.31.
  assert.equal(totals.igst, 9241.31);
  assert.equal(totals.cgst, 0);
  assert.equal(totals.sgst, 0);
  assert.equal(totals.roundOff, 0.08);
  assert.equal(totals.grand, 60582);
  assert.equal(totals.balance, 60582);
  const db = invoiceTestDatabase();
  const saved = await saveInvoice(db, user, { invoiceData: referenceInvoice, partyData: referenceParty, rowsData: referenceRows });
  assert.equal(saved.amount, "INR 60,582.00");
  assert.equal(saved.invoiceData.mspAmount, "1219.39");
  const text = await invoicePdfText((await getInvoiceFile(db, user, saved.id)).data);
  for (const value of ["MSP fees (-2.32%)", "(-1,219.39)", "51,340.61", "9,241.31", "0.08", "60,582.00"]) assert.ok(text.includes(value), value);
  assert.ok(text.indexOf("MSP fees") < text.indexOf("OUTPUT IGST"));
});

test("mixed HSN and GST rates share MSP exactly in paise and use each reduced taxable value", () => {
  const mixed = [
    { ...rows[0], price: "1000", tax: "GST@18%" },
    { ...rows[0], hsn: "998519", price: "500", tax: "GST@5%" },
    { ...rows[0], hsn: "998520", price: "500", tax: "NONE" }
  ];
  const totals = calculateInvoice({ ...invoice, ...msp }, mixed);
  assert.equal(totals.subtotal, 2000);
  assert.equal(totals.mspAmount, 100);
  assert.equal(totals.amountBeforeTax, 1900);
  assert.deepEqual(totals.items.map((item) => item.mspDeduction), [50, 25, 25]);
  assert.deepEqual(totals.groups.map((group) => group.taxable), [950, 475, 475]);
  assert.equal(totals.tax, 194.76);
  assert.equal(totals.grand, 2094.76);
  assert.equal(totals.items[2].taxAmount, 0);
});

test("paise allocation reconciles every item and tax group for fixed and percentage deductions", () => {
  for (const state of ["Karnataka", "Gujarat"]) {
    for (let count = 1; count <= 30; count += 1) {
      const items = Array.from({ length: count }, (_, index) => ({ ...rows[0], price: ((index + 1) * 0.13).toFixed(2), hsn: String(index % 3), tax: ["GST@18%", "GST@5%", "NONE"][index % 3] }));
      for (const fields of [{ ...msp, mspRate: "2.32" }, { mspApplicable: true, mspType: "FIXED", mspAmount: "0.01" }]) {
        const totals = calculateInvoice({ ...invoice, ...fields, state }, items);
        const cents = (value) => Math.round(value * 100);
        assert.equal(totals.items.reduce((sum, item) => sum + cents(item.mspDeduction), 0), cents(totals.mspAmount));
        assert.equal(totals.items.reduce((sum, item) => sum + cents(item.taxable), 0), cents(totals.amountBeforeTax));
        assert.equal(totals.groups.reduce((sum, group) => sum + cents(group.taxable), 0), cents(totals.amountBeforeTax));
        for (const field of ["cgst", "sgst", "igst"]) {
          assert.equal(totals.items.reduce((sum, item) => sum + cents(item[field]), 0), cents(totals[field]));
          assert.equal(totals.groups.reduce((sum, group) => sum + cents(group[field]), 0), cents(totals[field]));
        }
        assert.ok(totals.items.every((item) => item.taxable >= 0 && item.mspDeduction <= item.amount));
      }
    }
  }
});

test("full and zero MSP handle zero taxable value without changing no-MSP rounding", () => {
  const all = calculateInvoice({ ...invoice, ...msp, mspRate: "100" }, rows);
  assert.equal(all.amountBeforeTax, 0);
  assert.equal(all.tax, 0);
  assert.equal(all.grand, 0);
  const tiny = [{ ...rows[0], price: "0.03" }, { ...rows[0], price: "0.03" }];
  const original = calculateInvoice(invoice, tiny);
  const zero = calculateInvoice({ ...invoice, ...msp, mspRate: "0" }, tiny);
  assert.equal(zero.tax, original.tax);
  assert.equal(zero.grand, original.grand);
});
