import { calculateInvoice } from "./invoice-model.js";

export function invoiceAmount(value) {
  const number = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

export function invoiceDate(transaction) {
  const value = String(transaction.invoiceData?.invoiceDate || transaction.date || "");
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const display = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!iso && !display) return null;
  const [year, month, day] = iso ? iso.slice(1).map(Number) : [Number(display[3]), Number(display[2]), Number(display[1])];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function invoiceStatusGroup(transaction) {
  if (transaction.pendingSync) return "other";
  return ({ Paid: "paid", Unpaid: "unpaid", "Part Paid": "partial" })[transaction.status] || "other";
}

export function filterInvoiceList(transactions, { query = "", status = "all", customer = "", owner = "", from = "", to = "", sort = "date-desc" } = {}) {
  const search = query.trim().toLowerCase();
  const start = from ? invoiceDate({ date: from })?.getTime() : null;
  const end = to ? invoiceDate({ date: to })?.getTime() : null;
  const filtered = transactions.filter((transaction) => {
    const date = invoiceDate(transaction)?.getTime();
    return (status === "all" || invoiceStatusGroup(transaction) === status)
      && (!customer || transaction.party === customer)
      && (!owner || transaction.createdBy === owner)
      && (start == null || date != null && date >= start)
      && (end == null || date != null && date <= end)
      && (!search || [transaction.invoiceNo, transaction.party, transaction.date, transaction.status, transaction.amount, transaction.createdBy, transaction.partyData?.gstin].join(" ").toLowerCase().includes(search));
  });
  const direction = sort.endsWith("asc") ? 1 : -1;
  const field = sort.split("-")[0];
  return filtered.sort((a, b) => {
    if (field === "date") {
      const first = invoiceDate(a)?.getTime();
      const second = invoiceDate(b)?.getTime();
      if (first == null || second == null) return first == null && second == null ? 0 : first == null ? 1 : -1;
      return direction * (first - second);
    }
    if (["amount", "balance"].includes(field)) return direction * (invoiceAmount(a[field]) - invoiceAmount(b[field]));
    return direction * String(field === "customer" ? a.party : a.invoiceNo).localeCompare(String(field === "customer" ? b.party : b.invoiceNo), "en", { numeric: true });
  });
}

function activeSale(transaction) {
  return !transaction.pendingSync && !["Cancelled", "Returned"].includes(transaction.status) && !/return|purchase/i.test(transaction.transaction || "");
}

export function invoiceListSummary(transactions) {
  return transactions.filter(activeSale).reduce((summary, transaction) => {
    const amount = invoiceAmount(transaction.amount);
    const balance = transaction.status === "Paid" ? 0 : invoiceAmount(transaction.balance);
    // TDS reduces the balance but is not a payment received from the customer.
    const received = transaction.invoiceData && Array.isArray(transaction.rowsData)
      ? calculateInvoice(transaction.invoiceData, transaction.rowsData, transaction.partyData).received
      : Math.max(0, amount - balance);
    summary.invoiced += amount;
    summary.outstanding += balance;
    summary.received += received;
    if (balance > 0) { summary.unpaid += 1; summary.customers.add(transaction.party); }
    return summary;
  }, { invoiced: 0, outstanding: 0, received: 0, unpaid: 0, customers: new Set() });
}

export function invoiceSalesSeries(transactions, range = "month", now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const count = range === "month" ? new Date(year, month + 1, 0).getDate() : range === "year" ? 12 : 5;
  const buckets = Array.from({ length: count }, (_, index) => ({
    label: range === "month" ? String(index + 1) : range === "year" ? new Date(year, index, 1).toLocaleDateString("en-IN", { month: "short" }) : String(year - 4 + index),
    total: 0
  }));
  for (const transaction of transactions.filter(activeSale)) {
    const date = invoiceDate(transaction);
    if (!date) continue;
    let index = -1;
    if (range === "month" && date.getFullYear() === year && date.getMonth() === month) index = date.getDate() - 1;
    if (range === "year" && date.getFullYear() === year) index = date.getMonth();
    if (range === "years") index = date.getFullYear() - year + 4;
    if (index >= 0 && index < buckets.length) buckets[index].total += invoiceAmount(transaction.amount);
  }
  return {
    buckets,
    total: buckets.reduce((sum, bucket) => sum + bucket.total, 0),
    label: range === "month" ? now.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : range === "year" ? String(year) : `${year - 4} - ${year}`
  };
}
