export const invoiceCompany = {
  name: "TALME TECHNOLOGIES PRIVATE LIMITED",
  address: "No.24 Vittal Mallya Road, Level 14, Concorde Towers\nUB City, Bangalore - 560001",
  gstin: "29AAJCT8187F1ZO",
  pan: "AAJCT8187F",
  state: "Karnataka",
  udyam: "UDYAM-KR-03-0262217 (Micro)",
  cin: "U74999KA2022PTC168566",
  email: "accounts@talme.in",
  bank: "ICICI BANK LIMITED",
  account: "233705000913",
  ifsc: "ICIC0002337"
};

export const defaultInvoiceBranchId = "ub-city";
export const invoiceBranches = [
  { id: defaultInvoiceBranchId, label: "UB City", address: invoiceCompany.address },
  { id: "banashankari", label: "Banashankari (BSK 2nd Stage)", address: "285, 9th Main Road, 26th Cross BSK 2ND Stage,\nBengaluru 560070" }
];

export function getInvoiceCompany(branchId) {
  const branch = invoiceBranches.find((option) => option.id === branchId) || invoiceBranches[0];
  return { ...invoiceCompany, address: branch.address };
}

export const meghaInvoiceParty = {
  name: "Megha Fruit Processing Pvt Ltd",
  billing: "2/141, Megha Fruit Processing Pvt Ltd, Darbe, Puttur,\nSubramanya, Narimogaru, Dakshina Kannada - 574202",
  shipping: "",
  gstin: "29AADCM9416C1ZH",
  pan: "AADCM9416C",
  gstType: "Registered Business",
  state: "Karnataka",
  phone: "",
  email: ""
};

export const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const numeric = (value) => Number(String(value ?? "").replace(/,/g, "")) || 0;

export function taxRate(value) {
  return Number(String(value || "").match(/@(\d+(?:\.\d+)?)%/)?.[1] || 0) / 100;
}

export function invoiceRowTax(row, invoice) {
  const selection = !row.tax || row.tax === "Select" ? invoice.tax : row.tax;
  return taxRate(selection);
}

export function calculateInvoice(invoice, rows, party = {}) {
  const state = invoice.state && invoice.state !== "Select" ? invoice.state : party.state;
  const groups = new Map();
  const items = rows.map((row) => {
    const rate = invoiceRowTax(row, invoice);
    const selection = !row.tax || row.tax === "Select" ? invoice.tax : row.tax;
    const interstate = String(selection).startsWith("IGST") || (!String(selection).startsWith("CGST") && Boolean(state && state !== invoiceCompany.state));
    const amount = roundMoney(numeric(row.qty) * numeric(row.price));
    const cgst = interstate ? 0 : roundMoney(amount * rate / 2);
    const sgst = interstate ? 0 : roundMoney(amount * rate / 2);
    const igst = interstate ? roundMoney(amount * rate) : 0;
    const tax = roundMoney(cgst + sgst + igst);
    const item = { ...row, amount, taxAmount: tax, rate, cgst, sgst, igst, interstate };
    if (row.item || amount) {
      const key = `${row.hsn || "-"}|${rate}|${interstate}`;
      const group = groups.get(key) || { hsn: row.hsn || "-", rate, interstate, taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0 };
      for (const [field, value] of Object.entries({ taxable: amount, cgst, sgst, igst, tax })) group[field] = roundMoney(group[field] + value);
      groups.set(key, group);
    }
    return item;
  });
  const sum = (field) => roundMoney(items.reduce((total, item) => total + item[field], 0));
  const subtotal = sum("amount");
  const tax = sum("taxAmount");
  const beforeRounding = roundMoney(subtotal + tax);
  const grand = invoice.roundOff === false ? beforeRounding : Math.round(beforeRounding);
  const tdsRate = Number(String(invoice.tds || "").match(/^(\d+(?:\.\d+)?)%$/)?.[1] || 0) / 100;
  const tds = roundMoney(subtotal * tdsRate);
  const payable = roundMoney(grand - tds);
  const received = invoice.received ? numeric(invoice.receivedAmount) : 0;
  return { items, groups: [...groups.values()], subtotal, tax, cgst: sum("cgst"), sgst: sum("sgst"), igst: sum("igst"), grand, roundOff: roundMoney(grand - beforeRounding), tds, payable, received, balance: roundMoney(Math.max(0, payable - received)) };
}

export function invoiceValidation(invoice, party, rows) {
  if (!party.name?.trim()) return "Enter a customer name.";
  if (!party.billing?.trim()) return "Enter the customer's billing address.";
  if (!invoice.invoiceNo?.trim()) return "Enter an invoice number.";
  if (invoice.branchId && !invoiceBranches.some((branch) => branch.id === invoice.branchId)) return "Choose a valid issuing branch.";
  const date = new Date(invoice.invoiceDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(invoice.invoiceDate || "") || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== invoice.invoiceDate) return "Enter a valid invoice date.";
  if (!invoice.state || invoice.state === "Select") return "Choose the place of supply.";
  if (party.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(party.gstin)) return "Check the customer's 15-character GSTIN.";
  const filled = rows.filter((row) => row.item?.trim() || row.price || row.qty && numeric(row.qty) !== 1);
  if (!filled.length) return "Add at least one service or item.";
  for (const row of filled) {
    const index = rows.indexOf(row) + 1;
    if (!row.item?.trim()) return `Enter a service or item name for row ${index}.`;
    if (!Number.isFinite(Number(row.qty)) || numeric(row.qty) <= 0) return `Enter a quantity greater than zero for row ${index}.`;
    if (!String(row.price).trim() || !Number.isFinite(Number(String(row.price).replace(/,/g, ""))) || numeric(row.price) < 0) return `Enter a valid rate for row ${index}.`;
    if (!Number.isSafeInteger(Math.round(numeric(row.qty) * numeric(row.price) * 100))) return `The amount in row ${index} is too large.`;
  }
  const totals = calculateInvoice(invoice, rows, party);
  if (invoice.received && (!Number.isFinite(Number(invoice.receivedAmount)) || numeric(invoice.receivedAmount) < 0 || numeric(invoice.receivedAmount) > totals.payable)) return "Received amount must be between zero and the net payable amount.";
  return "";
}

function wholeNumberWords(value) {
  const ones = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (value < 20) return ones[value];
  if (value < 100) return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${ones[value % 10]}` : ""}`;
  const [divisor, label] = value >= 10000000 ? [10000000, "Crore"] : value >= 100000 ? [100000, "Lakh"] : value >= 1000 ? [1000, "Thousand"] : [100, "Hundred"];
  return `${wholeNumberWords(Math.floor(value / divisor))} ${label}${value % divisor ? ` ${wholeNumberWords(value % divisor)}` : ""}`;
}

export function amountInWords(value) {
  const paise = Math.round(Number(value || 0) * 100);
  return `INR Rupees ${wholeNumberWords(Math.floor(paise / 100))}${paise % 100 ? ` and ${wholeNumberWords(paise % 100)} Paise` : ""} Only`;
}
