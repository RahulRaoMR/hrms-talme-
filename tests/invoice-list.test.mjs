import test from "node:test";
import assert from "node:assert/strict";
import { filterInvoiceList, invoiceAmount, invoiceDate, invoiceListSummary, invoiceSalesSeries } from "../lib/invoice-list.js";

const records = [
  { id: "1", invoiceNo: "INV-10", party: "Megha Fruits", date: "14/10/2026", amount: "INR 2,490.00", balance: "INR 2,490.00", status: "Unpaid", createdBy: "accounts@talme.test" },
  { id: "2", invoiceNo: "INV-2", party: "Other Customer", date: "01/10/2026", amount: "1,000", balance: "0", status: "Paid", createdBy: "admin@talme.test" },
  { id: "3", invoiceNo: "OLD", party: "Megha Fruits", date: "March closed", amount: "400", balance: "200", status: "Part Paid" }
];

test("invoice list filters combine search, status, customer, owner and inclusive date bounds", () => {
  assert.deepEqual(filterInvoiceList(records, { query: "megha", status: "unpaid", customer: "Megha Fruits", owner: "accounts@talme.test", from: "2026-10-14", to: "2026-10-14" }).map((item) => item.id), ["1"]);
  assert.equal(filterInvoiceList(records, { from: "2026-10-01", to: "2026-10-13" }).length, 1);
  assert.equal(filterInvoiceList(records, { query: "nothing" }).length, 0);
  assert.equal(filterInvoiceList([{ ...records[0], pendingSync: true }], { status: "unpaid" }).length, 0);
});

test("sorting handles amounts, natural invoice numbers and undated legacy records without mutating input", () => {
  assert.deepEqual(filterInvoiceList(records, { sort: "invoice-asc" }).map((item) => item.invoiceNo), ["INV-2", "INV-10", "OLD"]);
  assert.deepEqual(filterInvoiceList(records, { sort: "date-asc" }).map((item) => item.id), ["2", "1", "3"]);
  assert.deepEqual(filterInvoiceList(records, { sort: "amount-desc" }).map((item) => item.id), ["1", "2", "3"]);
  assert.equal(records[0].id, "1");
  assert.equal(invoiceAmount("INR -1,250.50"), -1250.5);
  assert.equal(invoiceDate({ date: "31/02/2026" }), null);
});

test("overview excludes cancelled, returned and unsynced records and does not count TDS as received", () => {
  const tdsInvoice = { amount: "1180", balance: "1160", status: "Unpaid", invoiceData: { state: "Karnataka", tax: "GST@18%", tds: "2%", received: false }, rowsData: [{ qty: "1", price: "1000", tax: "Select" }] };
  const summary = invoiceListSummary([...records, tdsInvoice, { ...records[0], status: "Cancelled" }, { ...records[0], status: "Returned" }, { ...records[0], pendingSync: true }]);
  assert.equal(summary.invoiced, 5070);
  assert.equal(summary.outstanding, 3850);
  assert.equal(summary.received, 1200);
  assert.equal(summary.unpaid, 3);
});

test("chart buckets use invoice dates and the selected calendar period", () => {
  const now = new Date(2026, 9, 14);
  const month = invoiceSalesSeries(records, "month", now);
  assert.equal(month.buckets.length, 31);
  assert.equal(month.buckets[13].total, 2490);
  assert.equal(month.total, 3490);
  assert.equal(invoiceSalesSeries(records, "year", now).buckets[9].total, 3490);
  assert.equal(invoiceSalesSeries(records, "years", now).buckets[4].total, 3490);
  assert.equal(invoiceSalesSeries([], "month", new Date(2028, 1, 1)).buckets.length, 29);
});
