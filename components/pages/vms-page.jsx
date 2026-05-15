"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/modal";
import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";

const savedSalesStorageKey = "talme-sale-invoices";
const deletedSalesStorageKey = "talme-deleted-sale-invoices";

const initialRows = [
  {
    id: 1,
    item: "Premium staffing service",
    hsn: "998519",
    description: "Corporate manpower deployment",
    details: "May cycle",
    qty: "1",
    unit: "NONE",
    price: "47200",
    tax: "GST@18%"
  },
  {
    id: 2,
    item: "",
    hsn: "",
    description: "",
    details: "",
    qty: "",
    unit: "NONE",
    price: "",
    tax: "Select"
  }
];

const unitOptions = ["NONE", "BAGS (BAG)", "BOTTLES (BTL)", "BOX (BOX)", "BUNDLES (BDL)", "DOZENS (DZN)", "GRAMMES (GM)", "KILOGRAMS (KG)", "LITRE (LTR)", "MONTH (MTH)", "PIECES (PCS)"];

const transactions = [
  { id: "demo-siddha", date: "06/05/2026", invoiceNo: "98352651136", party: "Siddha Space", transaction: "Sale", paymentType: "Credit", amount: "₹ 55,696", balance: "₹ 55,696", status: "Unpaid", tone: "red" },
  { id: "demo-8", date: "06/05/2026", invoiceNo: "8", party: "YOKOGAWA INDIA LIMITED", transaction: "Sale", paymentType: "Cash", amount: "₹ 114943.8", balance: "₹ 114943.8", status: "Unpaid", tone: "red" },
  { id: "demo-3", date: "05/05/2026", invoiceNo: "3", party: "IIBS Bengaluru Airport Campus", transaction: "Sale", paymentType: "Cash", amount: "₹ 14750", balance: "₹ 14750", status: "Unpaid", tone: "red" },
  { id: "demo-2", date: "04/05/2026", invoiceNo: "2", party: "Wipro Enterprises Private Limited", transaction: "Sale", paymentType: "Cash", amount: "₹ 23469", balance: "₹ 23469", status: "Unpaid", tone: "red" },
  { id: "demo-1", date: "04/05/2026", invoiceNo: "1", party: "Rhodium Ferro Alloys Ltd", transaction: "Sale", paymentType: "Cash", amount: "₹ 72000", balance: "₹ 72000", status: "Unpaid", tone: "red" }
];

const yokogawaRows = [
  ["EGRPNL 10023 Electrical Inst HIS Consoles", "995461", "25MC13-PARAD...", "", "2", "Nos", "396", "NONE"],
  ["EGRPNL 10023 Electrical Inst MRSH Cabinets", "995461", "25GC12-GRASI...", "", "2", "Nos", "8475", "NONE"],
  ["EGRPNL 10023 Electrical Inst HIS Consoles", "995461", "25MA03-INOX-...", "", "2", "Nos", "396", "NONE"],
  ["EGRPNL 10023 Electrical Inst BAFFEL Plate", "995461", "25MA02-INOX A...", "", "1", "Nos", "2317", "NONE"],
  ["EGRPNL 10023 Electrical Inst BAFFEL Plate", "995461", "25MA02-INOX A...", "", "6", "Nos", "3164", "NONE"],
  ["EGRPNL 10023 Electrical Inst HIS Consoles", "995461", "25MA02-INOX A...", "", "1", "Nos", "396", "NONE"],
  ["EGRPNL 10023 Electrical Inst MRSH Cabinets", "995461", "25MF01-PPL GO...", "", "2", "Nos", "8475", "NONE"],
  ["EGRPNL 10023 Electrical Inst SYS MRSH Cabinets", "995461", "25CF06-SPIC - D...", "", "1", "Nos", "7006", "NONE"],
  ["EGRPNL 10023 Electrical Inst SYS MRSH Cabinets", "995461", "25CF06-SPIC - D...", "", "1", "Nos", "7006", "NONE"],
  ["EGRPNL 10023 Electrical Inst SYS MRSH Cabinets", "995461", "25CF06-SPIC - D...", "", "1", "Nos", "7006", "NONE"],
  ["EGRPNL 10023 Electrical Inst MRSH Cabinets", "995461", "25CF06-SPIC - D...", "", "1", "Nos", "7006", "NONE"]
].map(([item, hsn, description, details, qty, unit, price, tax], index) => ({
  id: `yoko-${index + 1}`,
  item,
  hsn,
  description,
  details,
  qty,
  unit,
  price,
  tax
}));

const indiaStatesAndUts = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h10v5H7V3Zm-2 7h14a3 3 0 0 1 3 3v5h-4v3H6v-3H2v-5a3 3 0 0 1 3-3Zm3 7v2h8v-2H8Zm11-3a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 16.1c-.8 0-1.5.3-2 .8L8.9 12.8a3.2 3.2 0 0 0 0-1.6L16 7.1A3 3 0 1 0 15 5c0 .3 0 .5.1.8L8 9.9a3 3 0 1 0 0 4.2l7.1 4.1c-.1.2-.1.5-.1.8a3 3 0 1 0 3-2.9Z" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 2h2v3h6V2h2v3h3v17H4V5h3V2Zm11 9H6v9h12v-9ZM6 7v2h12V7H6Z" />
    </svg>
  );
}

function DateField({ label, value, onChange }) {
  const pickerRef = useRef(null);

  return (
    <label>
      <span>{label}</span>
      <div className="invoice-date-field">
        <input
          inputMode="numeric"
          onChange={(event) => onChange(parseDisplayDate(event.target.value))}
          placeholder="DD/MM/YYYY"
          value={formatDateForList(value)}
        />
        <input
          aria-label={`${label} calendar`}
          className="invoice-native-date"
          onChange={(event) => onChange(event.target.value)}
          ref={pickerRef}
          tabIndex={-1}
          type="date"
          value={value || ""}
        />
        <button
          aria-label={`Open ${label} calendar`}
          className="invoice-date-button"
          onClick={() => {
            const picker = pickerRef.current;
            if (picker?.showPicker) picker.showPicker();
            else picker?.click();
          }}
          type="button"
        >
          <CalendarIcon />
        </button>
      </div>
    </label>
  );
}

function formatDateForList(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function parseDisplayDate(value) {
  const clean = String(value || "").trim();
  const parts = clean.split(/[/-]/);
  if (parts.length !== 3) return clean;
  const [day, month, year] = parts;
  if (!day || !month || !year) return clean;
  return `${year.padStart(4, "20")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function formatCurrency(value) {
  return `₹ ${toSafeNumber(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  })}`;
}

function toSafeNumber(value) {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractAmount(value) {
  return Number(String(value || "").replace(/[^\d.]/g, "")) || 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function numberToWords(value) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const num = Math.max(0, Math.floor(Number(value) || 0));

  function belowHundred(n) {
    if (n < 20) return ones[n];
    return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
  }

  function belowThousand(n) {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    return `${hundred ? `${ones[hundred]} Hundred` : ""}${hundred && rest ? " " : ""}${rest ? belowHundred(rest) : ""}`.trim();
  }

  if (num === 0) return "Zero";

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const rest = num % 1000;

  return [
    crore ? `${belowThousand(crore)} Crore` : "",
    lakh ? `${belowThousand(lakh)} Lakh` : "",
    thousand ? `${belowThousand(thousand)} Thousand` : "",
    rest ? belowThousand(rest) : ""
  ].filter(Boolean).join(" ");
}

function pdfEscape(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "");
}

function buildPdfDocument({ lines, texts, width = 595.28, height = 841.89 }) {
  const objects = [];
  const content = [];

  content.push("0.5 w");
  lines.forEach(([x1, y1, x2, y2]) => {
    content.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  });
  texts.forEach(({ x, y, text, size = 7, bold = false, align = "left", maxWidth = 0 }) => {
    const cleaned = pdfEscape(text);
    const estimatedWidth = cleaned.length * size * 0.48;
    const drawX = align === "right" ? x - estimatedWidth : align === "center" ? x - estimatedWidth / 2 : x;
    content.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${drawX.toFixed(2)} ${y.toFixed(2)} Td (${cleaned}) Tj ET`);
  });

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  objects.push(`<< /Length ${content.join("\n").length} >>\nstream\n${content.join("\n")}\nendstream`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function wrapPdfText(text, maxChars) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export default function VmsPageClient() {
  const [view, setView] = useState("list");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [savedSales, setSavedSales] = useState([]);
  const [deletedTransactionIds, setDeletedTransactionIds] = useState([]);
  const [salesLoaded, setSalesLoaded] = useState(false);
  const [activeSaleId, setActiveSaleId] = useState(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [activePrintMenuId, setActivePrintMenuId] = useState(null);
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partyModalMode, setPartyModalMode] = useState("add");
  const [unitMenuRow, setUnitMenuRow] = useState(null);
  const [party, setParty] = useState({
    name: "Siddha Space",
    gstin: "",
    phone: "98352651136",
    gstType: "Unregistered/Consumer",
    state: "Maharashtra",
    email: "accounts@siddhaspace.in",
    billing: "Siddha Space, Mumbai",
    shipping: "Siddha Space site office"
  });
  const [invoice, setInvoice] = useState({
    mode: "Credit",
    invoiceNo: "98352651136",
    invoiceDate: "2026-05-06",
    poNo: "",
    poDate: "",
    state: "Select",
    copies: "Original",
    tax: "GST@18%",
    tds: "NONE",
    received: false,
    receivedAmount: "",
    signatoryName: ""
  });
  const [rows, setRows] = useState(initialRows);
  const [message, setMessage] = useState("");
  const [showShippingAddress, setShowShippingAddress] = useState(false);
  const [attachedDocument, setAttachedDocument] = useState("");
  const [attachedImage, setAttachedImage] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(savedSalesStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setSavedSales(parsed);
      }
      const deletedStored = window.localStorage.getItem(deletedSalesStorageKey);
      if (deletedStored) {
        const parsedDeleted = JSON.parse(deletedStored);
        if (Array.isArray(parsedDeleted)) setDeletedTransactionIds(parsedDeleted);
      }
    } catch {
      setSavedSales([]);
      setDeletedTransactionIds([]);
    } finally {
      setSalesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!salesLoaded) return;
    window.localStorage.setItem(savedSalesStorageKey, JSON.stringify(savedSales));
  }, [savedSales, salesLoaded]);

  useEffect(() => {
    if (!salesLoaded) return;
    window.localStorage.setItem(deletedSalesStorageKey, JSON.stringify(deletedTransactionIds));
  }, [deletedTransactionIds, salesLoaded]);

  useEffect(() => {
    function closeRowMenus() {
      setActiveActionMenuId(null);
      setActivePrintMenuId(null);
    }

    window.addEventListener("click", closeRowMenus);
    return () => window.removeEventListener("click", closeRowMenus);
  }, []);

  const totals = useMemo(() => {
    const subtotal = rows.reduce((sum, row) => {
      const qty = toSafeNumber(row.qty);
      const price = toSafeNumber(row.price);
      return sum + qty * price;
    }, 0);
    const tax = invoice.tax === "GST@18%" ? subtotal * 0.18 : 0;
    return {
      subtotal,
      tax,
      grand: subtotal + tax
    };
  }, [invoice.tax, rows]);

  const paymentSummary = useMemo(() => {
    const received = invoice.received ? toSafeNumber(invoice.receivedAmount) : 0;
    const balance = Math.max(totals.grand - received, 0);
    return {
      received,
      balance,
      status: received <= 0 ? "Unpaid" : balance <= 0 ? "Paid" : "Part Paid"
    };
  }, [invoice.received, invoice.receivedAmount, totals.grand]);

  function updateRow(id, key, value) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        id: Date.now(),
        item: "",
        hsn: "",
        description: "",
        details: "",
        qty: "",
        unit: "NONE",
        price: "",
        tax: "Select"
      }
    ]);
  }

  function deleteRow(id) {
    setRows((current) => {
      if (current.length <= 1) return current;
      return current.filter((row) => row.id !== id);
    });
  }

  function resetInvoiceDraft() {
    setActiveSaleId(null);
    setParty({
      name: "",
      gstin: "",
      phone: "",
      gstType: "Unregistered/Consumer",
      state: "Maharashtra",
      email: "",
      billing: "",
      shipping: ""
    });
    setInvoice({
      mode: "Credit",
      invoiceNo: String(Date.now()).slice(-6),
      invoiceDate: new Date().toISOString().slice(0, 10),
      poNo: "",
      poDate: "",
      state: "Select",
      copies: "Original",
      tax: "GST@18%",
      tds: "NONE",
      received: false,
      receivedAmount: "",
      signatoryName: ""
    });
    setRows(initialRows.map((row) => ({ ...row, id: Date.now() + row.id })));
    setAttachedDocument("");
    setAttachedImage("");
    setMessage("");
    setView("editor");
  }

  function openSavedSale(transaction) {
    if (!transaction.invoiceData || !transaction.partyData || !transaction.rowsData) return;

    setActiveSaleId(transaction.id);
    setParty(transaction.partyData);
    setInvoice({
      received: false,
      receivedAmount: "",
      ...transaction.invoiceData
    });
    setRows(transaction.rowsData);
    setAttachedDocument(transaction.attachedDocument || "");
    setAttachedImage(transaction.attachedImage || "");
    setMessage(`Opened sale invoice ${transaction.invoiceNo}.`);
    setView("editor");
  }

  function openTransaction(transaction) {
    if (transaction.invoiceData) {
      openSavedSale(transaction);
      return;
    }

    const isYokogawa = transaction.party.includes("YOKOGAWA");
    const isSiddha = transaction.party.includes("Siddha Space");
    setActiveSaleId(transaction.id);
    setParty({
      name: transaction.party,
      gstin: "",
      phone: isSiddha ? "98352651136" : "",
      gstType: isYokogawa ? "Registered Business" : "Unregistered/Consumer",
      state: isYokogawa ? "Karnataka" : "Maharashtra",
      email: isSiddha ? "accounts@siddhaspace.in" : "",
      billing: isYokogawa
        ? "NO 96, ELECTRONIC CITY\nCOMPLEX HOSUR ROAD\nELECTRONIC CITY\nBengaluru Urban, Karnataka"
        : isSiddha
          ? "Siddha Space, Mumbai"
          : `${transaction.party}\nBilling Address`,
      shipping: isSiddha ? "Siddha Space site office" : ""
    });
    setInvoice({
      mode: transaction.paymentType || "Cash",
      invoiceNo: transaction.invoiceNo,
      invoiceDate: "2026-05-06",
      poNo: isYokogawa ? "4513721078" : "",
      poDate: isYokogawa ? "2026-05-05" : "",
      state: isYokogawa ? "Karnataka" : "Select",
      copies: "Original",
      tax: "GST@18%",
      tds: "NONE",
      received: false,
      receivedAmount: "",
      signatoryName: ""
    });
    setRows(isYokogawa ? yokogawaRows : initialRows);
    setAttachedDocument("");
    setAttachedImage("");
    setMessage("");
    setView("editor");
  }

  function downloadInvoice() {
    const transaction = {
      id: activeSaleId || "draft-invoice",
      date: formatDateForList(invoice.invoiceDate),
      invoiceNo: invoice.invoiceNo || "Draft",
      party: party.name || "Unnamed Customer",
      transaction: "Sale",
      paymentType: invoice.mode,
      amount: formatCurrency(totals.grand),
      balance: formatCurrency(paymentSummary.balance),
      status: paymentSummary.status,
      invoiceData: invoice,
      partyData: party,
      rowsData: rows
    };
    const blob = buildInvoicePdf(transaction);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `tax-invoice-${invoice.invoiceNo || "draft"}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Tax invoice PDF downloaded.");
  }

  function buildInvoicePdf(transaction) {
    const snapshot = getTransactionSnapshot(transaction);
    const invoiceDate = transaction.date || formatDateForList(snapshot.invoice.invoiceDate);
    const taxableAmount = snapshot.totals.subtotal || snapshot.totals.grand - snapshot.totals.tax;
    const cgst = snapshot.totals.tax / 2;
    const sgst = snapshot.totals.tax / 2;
    const roundedTotal = Math.round(snapshot.totals.grand);
    const signatoryName = String(snapshot.invoice.signatoryName || "").trim();
    const lines = [];
    const texts = [];
    const page = { width: 595.28, height: 841.89 };
    const left = 28;
    const right = 567;
    const top = 812;
    const bottom = 32;
    const titleBottom = top - 20;
    const headerBottom = 660;
    const partyBottom = 552;
    const tableTop = partyBottom;
    const tableHeaderBottom = 528;
    const itemBottom = 450;
    const taxRow1Bottom = 426;
    const taxRow2Bottom = 402;
    const taxRow3Bottom = 378;
    const totalBottom = 350;
    const wordsBottom = 318;
    const taxSummaryTop = wordsBottom;
    const taxSummaryBottom = 232;
    const taxWordsBottom = 204;
    const bottomTop = 168;

    function line(x1, y1, x2, y2) {
      lines.push([x1, y1, x2, y2]);
    }

    function text(x, y, value, options = {}) {
      texts.push({ x, y, text: value, ...options });
    }

    function multiText(x, y, value, maxChars, gap = 10, options = {}) {
      wrapPdfText(value, maxChars).slice(0, options.maxLines || 6).forEach((part, index) => {
        text(x, y - index * gap, part, options);
      });
    }

    line(left, bottom, right, bottom);
    line(left, top, right, top);
    line(left, bottom, left, top);
    line(right, bottom, right, top);
    text((left + right) / 2, top - 13, "Tax Invoice", { size: 11, bold: true, align: "center" });
    line(left, titleBottom, right, titleBottom);

    const mid = 300;
    line(mid, titleBottom, mid, headerBottom);
    line(left, headerBottom, right, headerBottom);
    text(left + 8, top - 34, "TALME TECHNOLOGIES PRIVATE LIMITED", { size: 8, bold: true });
    multiText(left + 8, top - 45, "No 24 Vittal Mallya Road, Level 14, Concorde Towers UB City, Bangalore - 560001", 50, 9);
    text(left + 8, top - 72, "UDYAM Reg No.: UDYAM-KR-03-0262217 (Micro)", { size: 7 });
    text(left + 8, top - 82, "GSTIN/UIN: 29AACTJ8187F1ZO", { size: 7 });
    text(left + 8, top - 92, "State Name: Karnataka, Code: 29", { size: 7 });
    text(left + 8, top - 102, "CIN: U74999KA2022PTC168666", { size: 7 });
    text(left + 8, top - 112, "E-Mail: accounts@talme.in", { size: 7 });

    const metaX = [mid, 432, right];
    const metaY = [titleBottom, 770, 748, 726, 704, 682, headerBottom];
    metaY.forEach((y) => line(mid, y, right, y));
    line(metaX[1], titleBottom, metaX[1], headerBottom);
    const meta = [
      ["Invoice No.", transaction.invoiceNo, "Dated", invoiceDate],
      ["Delivery Note", snapshot.invoice.poNo || "-", "Mode/Terms of Payment", transaction.paymentType || snapshot.invoice.mode || "Immediate"],
      ["Purchase Order No.", snapshot.invoice.poNo || "4513721078", "Dated", formatDateForList(snapshot.invoice.poDate) || invoiceDate],
      ["Dispatch Doc No.", "-", "Delivery Note Date", "-"],
      ["Dispatched through", "-", "Destination", snapshot.party.state || "-"],
      ["Terms of Delivery", transaction.status || "-", "Reference", "Tax Invoice PDF"]
    ];
    meta.forEach((row, index) => {
      const y = 778 - index * 22;
      text(mid + 6, y + 5, row[0], { size: 5.6 });
      text(mid + 6, y - 4, row[1], { size: 6.8, bold: true });
      text(metaX[1] + 6, y + 5, row[2], { size: 5.6 });
      text(metaX[1] + 6, y - 4, row[3], { size: 6.8, bold: true });
    });

    line(left, partyBottom, right, partyBottom);
    line(mid, headerBottom, mid, partyBottom);
    text(left + 8, 646, "Buyer (Bill to)", { size: 6 });
    text(left + 8, 635, snapshot.party.name || transaction.party, { size: 8, bold: true });
    multiText(left + 8, 624, snapshot.party.billing || `${transaction.party} Billing Address`, 48, 9, { size: 6.7, maxLines: 5 });
    text(mid + 8, 646, "Consignee (Ship to)", { size: 6 });
    text(mid + 8, 635, snapshot.party.name || transaction.party, { size: 8, bold: true });
    multiText(mid + 8, 624, snapshot.party.shipping || snapshot.party.billing || "Shipping Address", 44, 9, { size: 6.7, maxLines: 4 });
    text(mid + 8, 588, `GSTIN/UIN: ${snapshot.party.gstin || "29AAACY0840P1ZV"}`, { size: 6.7 });
    text(mid + 8, 578, "PAN/IT No: AAACY0840P", { size: 6.7 });
    text(mid + 8, 568, `State Name: ${snapshot.party.state || "Karnataka"}`, { size: 6.7 });
    text(mid + 8, 558, `Place of Supply: ${snapshot.party.state || "Karnataka"} State-29`, { size: 6.7 });

    const cols = [left, 62, 285, 350, 400, 448, 492, right];
    cols.forEach((x) => line(x, totalBottom, x, tableTop));
    [tableTop, tableHeaderBottom, itemBottom, taxRow1Bottom, taxRow2Bottom, taxRow3Bottom, totalBottom, wordsBottom, taxSummaryTop, taxSummaryBottom, taxWordsBottom, bottomTop].forEach((y) => line(left, y, right, y));
    ["Sl No.", "Particulars", "HSN/SAC", "Quantity", "Rate", "per", "Amount"].forEach((heading, index) => {
      text((cols[index] + cols[index + 1]) / 2, 536, heading, { size: 6, bold: true, align: "center" });
    });

    const firstRow = snapshot.rows[0] || {};
    const rowAmount = toSafeNumber(firstRow.qty || 1) * toSafeNumber(firstRow.price || taxableAmount);
    text(45, 502, "1", { size: 7, align: "center" });
    text(172, 502, firstRow.item || "Electrical Installation Services", { size: 8, bold: true, align: "center" });
    multiText(104, 488, firstRow.description || "In reference of the attached purchase order.", 31, 9, { size: 6, maxLines: 3 });
    text(318, 502, firstRow.hsn || "995461", { size: 7, align: "center" });
    text(392, 502, firstRow.qty || "1", { size: 7, align: "right" });
    text(440, 502, formatCurrency(firstRow.price || rowAmount), { size: 7, align: "right" });
    text(470, 502, firstRow.unit || "Nos", { size: 7, align: "center" });
    text(558, 502, formatCurrency(rowAmount), { size: 7, align: "right" });
    text(236, 435, "OUTPUT CGST @ 9%", { size: 6.4, bold: true, align: "right" });
    text(440, 435, "9 %", { size: 7, align: "right" });
    text(558, 435, formatCurrency(cgst), { size: 7, bold: true, align: "right" });
    text(236, 411, "OUTPUT SGST @ 9%", { size: 6.4, bold: true, align: "right" });
    text(440, 411, "9 %", { size: 7, align: "right" });
    text(558, 411, formatCurrency(sgst), { size: 7, bold: true, align: "right" });
    text(236, 387, "Round off", { size: 6.4, bold: true, align: "right" });
    text(558, 387, formatCurrency(roundedTotal - snapshot.totals.grand), { size: 7, align: "right" });
    text(236, 360, "Total", { size: 7, bold: true, align: "right" });
    text(558, 360, formatCurrency(roundedTotal), { size: 8, bold: true, align: "right" });

    text(left + 6, 338, "Amount Chargeable (in words)", { size: 6 });
    text(left + 6, 327, `INR ${numberToWords(roundedTotal)} only`, { size: 8, bold: true });
    const taxCols = [left, 118, 206, 278, 342, 414, 478, right];
    taxCols.forEach((x) => line(x, taxSummaryBottom, x, taxSummaryTop));
    [302, 280, 256, taxSummaryBottom].forEach((y) => line(left, y, right, y));
    ["HSN/SAC", "Taxable Value", "CGST Rate", "CGST Amount", "SGST Rate", "SGST Amount", "Total Tax"].forEach((heading, index) => {
      text((taxCols[index] + taxCols[index + 1]) / 2, 306, heading, { size: 6, bold: true, align: "center" });
    });
    text(74, 288, "995461", { size: 7, align: "center" });
    text(198, 288, formatCurrency(taxableAmount), { size: 7, align: "right" });
    text(310, 288, "9%", { size: 7, align: "center" });
    text(406, 288, formatCurrency(cgst), { size: 7, align: "right" });
    text(446, 288, "9%", { size: 7, align: "center" });
    text(526, 288, formatCurrency(sgst), { size: 7, align: "right" });
    text(558, 288, formatCurrency(snapshot.totals.tax), { size: 7, align: "right" });
    text(left + 6, 220, "Tax Amount (in words):", { size: 6 });
    text(left + 6, 210, `INR ${numberToWords(Math.round(snapshot.totals.tax))} only`, { size: 8, bold: true });

    line(mid, bottom, mid, bottomTop);
    text(left + 8, bottomTop - 16, "Company's Bank Details", { size: 8, bold: true });
    text(left + 8, bottomTop - 28, "A/c Holder's Name: TALME TECHNOLOGIES PRIVATE LIMITED", { size: 7 });
    text(left + 8, bottomTop - 38, "Bank Name: ICICI BANK LIMITED", { size: 7 });
    text(left + 8, bottomTop - 48, "A/c No.: 233705000913", { size: 7 });
    text(left + 8, bottomTop - 58, "Branch & IFSC Code: ICIC0002337", { size: 7 });
    text(mid + 8, bottomTop - 16, "for TALME TECHNOLOGIES PRIVATE LIMITED", { size: 8, bold: true });
    if (signatoryName) {
      text(552, bottomTop - 54, signatoryName, { size: 14, align: "right" });
    } else {
      line(410, bottomTop - 54, 552, bottomTop - 54);
    }
    text(552, bottomTop - 74, "Authorised Signatory", { size: 7, align: "right" });

    return buildPdfDocument({ lines, texts, width: page.width, height: page.height });
  }

  function getTransactionSnapshot(transaction) {
    const snapshotInvoice = transaction.invoiceData || {
      mode: transaction.paymentType || "Cash",
      invoiceNo: transaction.invoiceNo,
      invoiceDate: parseDisplayDate(transaction.date),
      poNo: "",
      poDate: "",
      state: "",
      copies: "Original",
      tax: "GST@18%",
      tds: "NONE",
      received: transaction.status === "Paid",
      receivedAmount: transaction.status === "Paid" ? String(extractAmount(transaction.amount)) : ""
    };
    const snapshotParty = transaction.partyData || {
      name: transaction.party,
      gstin: "",
      phone: "",
      gstType: "Unregistered/Consumer",
      state: "",
      email: "",
      billing: `${transaction.party}\nBilling Address`,
      shipping: ""
    };
    const snapshotRows = transaction.rowsData || [
      {
        id: `${transaction.id}-row`,
        item: "Invoice service",
        hsn: "998519",
        description: transaction.transaction || "Sale",
        details: transaction.invoiceNo,
        qty: "1",
        unit: "NONE",
        price: String(extractAmount(transaction.amount)),
        tax: "NONE"
      }
    ];
    const subtotal = snapshotRows.reduce((sum, row) => sum + toSafeNumber(row.qty) * toSafeNumber(row.price), 0);
    const tax = snapshotRows.reduce((sum, row) => {
      const amount = toSafeNumber(row.qty) * toSafeNumber(row.price);
      return sum + (row.tax === "GST@18%" ? amount * 0.18 : row.tax === "GST@12%" ? amount * 0.12 : 0);
    }, 0);
    const grand = subtotal + tax || extractAmount(transaction.amount);

    return {
      invoice: snapshotInvoice,
      party: snapshotParty,
      rows: snapshotRows,
      totals: {
        subtotal,
        tax,
        grand
      }
    };
  }

  function buildInvoiceHtml(transaction, documentType = "Tax Invoice") {
    const snapshot = getTransactionSnapshot(transaction);
    const invoiceDate = transaction.date || formatDateForList(snapshot.invoice.invoiceDate);
    const taxableAmount = snapshot.totals.subtotal || snapshot.totals.grand - snapshot.totals.tax;
    const cgst = snapshot.totals.tax / 2;
    const sgst = snapshot.totals.tax / 2;
    const roundedTotal = Math.round(snapshot.totals.grand);
    const amountWords = `${numberToWords(roundedTotal)} only`;
    const signatoryName = String(snapshot.invoice.signatoryName || "").trim();
    const rowHtml = snapshot.rows
      .map((row, index) => {
        const amount = toSafeNumber(row.qty) * toSafeNumber(row.price);
        const description = [row.description, row.details].filter(Boolean).join(" ");
        return `
          <tr>
            <td class="center">${index + 1}</td>
            <td class="particulars">
              <strong>${escapeHtml(row.item || "Electrical Installation Services")}</strong>
              ${description ? `<em>${escapeHtml(description)}</em>` : "<em>In reference of the attached purchase order.</em>"}
            </td>
            <td class="center">${escapeHtml(row.hsn || "995461")}</td>
            <td class="right">${escapeHtml(row.qty || "1")}</td>
            <td class="right">${formatCurrency(row.price)}</td>
            <td class="center">${escapeHtml(row.unit || "Nos")}</td>
            <td class="right">${formatCurrency(amount)}</td>
          </tr>
        `;
      })
      .join("");

    return `<!doctype html>
      <html>
        <head>
          <title>${escapeHtml(documentType)} ${escapeHtml(transaction.invoiceNo)}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 18px; color: #111; font-family: Arial, Helvetica, sans-serif; background: #f2f4f7; }
            .actions { display: flex; justify-content: flex-end; gap: 10px; width: 794px; margin: 0 auto 12px; }
            button { padding: 9px 15px; border: 0; border-radius: 4px; background: #111827; color: #fff; cursor: pointer; font-weight: 700; }
            .sheet { width: 794px; min-height: 1123px; margin: 0 auto; background: #fff; border: 1px solid #333; font-size: 10px; line-height: 1.25; }
            .title { height: 22px; display: grid; place-items: center; border-bottom: 1px solid #333; font-size: 14px; font-weight: 800; }
            .top-grid { display: grid; grid-template-columns: 1.08fr 1fr; border-bottom: 1px solid #333; }
            .seller-box, .meta-grid, .buyer-box, .consignee-box, .words-box, .bank-box, .tax-words-box, .signature-box, .pan-box { padding: 6px 8px; }
            .seller-box { border-right: 1px solid #333; min-height: 112px; }
            .seller-box strong, .buyer-box strong, .consignee-box strong { display: block; font-size: 11px; }
            .meta-grid { padding: 0; display: grid; grid-template-columns: 1fr 1fr; }
            .meta-cell { min-height: 38px; padding: 5px 7px; border-right: 1px solid #333; border-bottom: 1px solid #333; }
            .meta-cell:nth-child(2n) { border-right: 0; }
            .meta-cell:nth-last-child(-n + 2) { border-bottom: 0; }
            .label { display: block; color: #555; font-size: 9px; }
            .value { display: block; margin-top: 2px; font-weight: 700; }
            .party-grid { display: grid; grid-template-columns: 1.08fr 1fr; border-bottom: 1px solid #333; }
            .buyer-box { border-right: 1px solid #333; min-height: 110px; }
            .consignee-box { min-height: 110px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border-right: 1px solid #333; border-bottom: 1px solid #333; padding: 5px 6px; vertical-align: top; }
            th:last-child, td:last-child { border-right: 0; }
            thead th { height: 28px; font-size: 9px; font-weight: 700; text-align: center; }
            .items tbody tr.item-row td, .items tbody tr:first-child td { height: 248px; }
            .center { text-align: center; }
            .right { text-align: right; }
            .particulars strong { display: block; margin: 8px 0 8px; text-align: center; }
            .particulars em { display: block; padding-left: 24px; font-size: 9px; }
            .tax-line td { height: 23px; font-weight: 700; }
            .tax-line .particulars { text-align: right; }
            .total-row td { height: 26px; font-weight: 800; }
            .words-box { min-height: 48px; border-bottom: 1px solid #333; }
            .words-box strong, .tax-words-box strong { display: block; margin-top: 3px; }
            .tax-summary th, .tax-summary td { font-size: 9px; padding: 4px; }
            .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; border-top: 0; }
            .bank-box { border-right: 1px solid #333; min-height: 120px; }
            .signature-box { min-height: 120px; position: relative; }
            .signature-name { position: absolute; right: 18px; bottom: 36px; font-size: 22px; font-family: Georgia, serif; }
            .signature-label { position: absolute; right: 18px; bottom: 12px; text-align: right; }
            .pan-box { border-top: 1px solid #333; display: grid; grid-template-columns: 1fr 1fr; padding: 0; }
            .pan-box div { padding: 7px 8px; }
            .pan-box div:first-child { border-right: 1px solid #333; }
            .muted { color: #555; }
            @media print {
              @page { size: A4; margin: 8mm; }
              body { padding: 0; background: #fff; }
              .actions { display: none; }
              .sheet { width: 100%; min-height: auto; border: 1px solid #333; }
            }
          </style>
        </head>
        <body>
          <div class="actions">
            <button onclick="window.print()">Print</button>
            <button onclick="window.close()">Close</button>
          </div>
          <main class="sheet">
            <div class="title">Tax Invoice</div>
            <section class="top-grid">
              <div class="seller-box">
                <strong>TALME TECHNOLOGIES PRIVATE LIMITED</strong>
                <div>No 24 Vittal Mallya Road, Level 14, Concorde Towers UB City, Bangalore - 560001</div>
                <div>UDYAM Reg No.: UDYAM-KR-03-0262217 (Micro)</div>
                <div>GSTIN/UIN: 29AACTJ8187F1ZO</div>
                <div>State Name: Karnataka, Code: 29</div>
                <div>CIN: U74999KA2022PTC168666</div>
                <div>E-Mail: accounts@talme.in</div>
              </div>
              <div class="meta-grid">
                <div class="meta-cell"><span class="label">Invoice No.</span><span class="value">${escapeHtml(transaction.invoiceNo)}</span></div>
                <div class="meta-cell"><span class="label">Dated</span><span class="value">${escapeHtml(invoiceDate)}</span></div>
                <div class="meta-cell"><span class="label">Delivery Note</span><span class="value">${escapeHtml(snapshot.invoice.poNo || "-")}</span></div>
                <div class="meta-cell"><span class="label">Mode/Terms of Payment</span><span class="value">${escapeHtml(transaction.paymentType || snapshot.invoice.mode || "Immediate")}</span></div>
                <div class="meta-cell"><span class="label">Purchase Order No.</span><span class="value">${escapeHtml(snapshot.invoice.poNo || "4513721078")}</span></div>
                <div class="meta-cell"><span class="label">Dated</span><span class="value">${escapeHtml(formatDateForList(snapshot.invoice.poDate) || invoiceDate)}</span></div>
                <div class="meta-cell"><span class="label">Dispatch Doc No.</span><span class="value">-</span></div>
                <div class="meta-cell"><span class="label">Delivery Note Date</span><span class="value">-</span></div>
                <div class="meta-cell"><span class="label">Dispatched through</span><span class="value">-</span></div>
                <div class="meta-cell"><span class="label">Destination</span><span class="value">${escapeHtml(snapshot.party.state || "-")}</span></div>
                <div class="meta-cell"><span class="label">Terms of Delivery</span><span class="value">${escapeHtml(transaction.status || "-")}</span></div>
                <div class="meta-cell"><span class="label">Reference</span><span class="value">${escapeHtml(documentType)}</span></div>
              </div>
            </section>
            <section class="party-grid">
              <div class="buyer-box">
                <span class="muted">Buyer (Bill to)</span>
                <strong>${escapeHtml(snapshot.party.name || transaction.party)}</strong>
                <div>${escapeHtml(snapshot.party.billing || `${transaction.party}\nBilling Address`)}</div>
              </div>
              <div class="consignee-box">
                <span class="muted">Consignee (Ship to)</span>
                <strong>${escapeHtml(snapshot.party.name || transaction.party)}</strong>
                <div>${escapeHtml(snapshot.party.shipping || snapshot.party.billing || "Shipping Address")}</div>
                <br />
                <div><strong>GSTIN/UIN:</strong> ${escapeHtml(snapshot.party.gstin || "29AAACY0840P1ZV")}</div>
                <div><strong>PAN/IT No:</strong> AAACY0840P</div>
                <div><strong>State Name:</strong> ${escapeHtml(snapshot.party.state || "Karnataka")}</div>
                <div><strong>Place of Supply:</strong> ${escapeHtml(snapshot.party.state || "Karnataka")} State-29</div>
              </div>
            </section>
            <table class="items">
              <thead>
                <tr>
                  <th style="width: 38px;">Sl No.</th>
                  <th>Particulars</th>
                  <th style="width: 70px;">HSN/SAC</th>
                  <th style="width: 60px;">Quantity</th>
                  <th style="width: 72px;">Rate</th>
                  <th style="width: 48px;">per</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${rowHtml}
                <tr class="tax-line">
                  <td></td>
                  <td class="particulars">OUTPUT CGST @ 9%</td>
                  <td></td><td></td><td class="right">9 %</td><td></td><td class="right">${formatCurrency(cgst)}</td>
                </tr>
                <tr class="tax-line">
                  <td></td>
                  <td class="particulars">OUTPUT SGST @ 9%</td>
                  <td></td><td></td><td class="right">9 %</td><td></td><td class="right">${formatCurrency(sgst)}</td>
                </tr>
                <tr class="tax-line">
                  <td></td>
                  <td class="particulars">Round off</td>
                  <td></td><td></td><td></td><td></td><td class="right">${formatCurrency(roundedTotal - snapshot.totals.grand)}</td>
                </tr>
                <tr class="total-row">
                  <td></td>
                  <td class="right">Total</td>
                  <td></td><td></td><td></td><td></td><td class="right">${formatCurrency(roundedTotal)}</td>
                </tr>
              </tbody>
            </table>
            <section class="words-box">
              <span>Amount Chargeable (in words)</span>
              <strong>INR ${escapeHtml(amountWords)}</strong>
            </section>
            <table class="tax-summary">
              <thead>
                <tr>
                  <th rowspan="2">HSN/SAC</th>
                  <th rowspan="2">Taxable Value</th>
                  <th colspan="2">CGST</th>
                  <th colspan="2">SGST/UTGST</th>
                  <th rowspan="2">Total Tax Amount</th>
                </tr>
                <tr>
                  <th>Rate</th><th>Amount</th><th>Rate</th><th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>995461</td>
                  <td class="right">${formatCurrency(taxableAmount)}</td>
                  <td class="center">9%</td>
                  <td class="right">${formatCurrency(cgst)}</td>
                  <td class="center">9%</td>
                  <td class="right">${formatCurrency(sgst)}</td>
                  <td class="right">${formatCurrency(snapshot.totals.tax)}</td>
                </tr>
                <tr>
                  <td class="right"><strong>Total</strong></td>
                  <td class="right"><strong>${formatCurrency(taxableAmount)}</strong></td>
                  <td></td><td class="right"><strong>${formatCurrency(cgst)}</strong></td>
                  <td></td><td class="right"><strong>${formatCurrency(sgst)}</strong></td>
                  <td class="right"><strong>${formatCurrency(snapshot.totals.tax)}</strong></td>
                </tr>
              </tbody>
            </table>
            <section class="tax-words-box">
              <span>Tax Amount (in words):</span>
              <strong>INR ${escapeHtml(numberToWords(Math.round(snapshot.totals.tax)))} only</strong>
            </section>
            <section class="bottom-grid">
              <div>
                <div class="bank-box">
                  <strong>Company's Bank Details</strong>
                  <div>A/c Holder's Name: TALME TECHNOLOGIES PRIVATE LIMITED</div>
                  <div>Bank Name: ICICI BANK LIMITED</div>
                  <div>A/c No.: 233705000913</div>
                  <div>Branch &amp; IFSC Code: ICIC0002337</div>
                </div>
                <div class="pan-box">
                  <div>Company's PAN<br /><strong>AACTJ8187F</strong></div>
                  <div>Declaration<br />Certified that the particulars given above are true and correct.</div>
                </div>
              </div>
              <div class="signature-box">
                <strong>for TALME TECHNOLOGIES PRIVATE LIMITED</strong>
                <div class="signature-name">${escapeHtml(signatoryName || "________________")}</div>
                <div class="signature-label">Authorised Signatory</div>
              </div>
            </section>
          </main>
        </body>
      </html>`;
  }

  function openInvoiceDocument(transaction, documentType, { print = false } = {}) {
    const popup = window.open("", "_blank", "width=980,height=720");

    if (!popup) {
      setMessage("Popup blocked. Allow popups for this site, then try again.");
      return;
    }

    popup.document.open();
    popup.document.write(buildInvoiceHtml(transaction, documentType));
    popup.document.close();
    popup.focus();

    if (print) {
      popup.addEventListener("load", () => popup.print(), { once: true });
      window.setTimeout(() => popup.print(), 350);
    }
  }

  function openHistoryDocument(transaction) {
    const popup = window.open("", "_blank", "width=760,height=620");

    if (!popup) {
      setMessage("Popup blocked. Allow popups for this site, then try again.");
      return;
    }

    popup.document.open();
    popup.document.write(`<!doctype html>
      <html>
        <head>
          <title>Invoice History ${escapeHtml(transaction.invoiceNo)}</title>
          <style>
            body { margin: 0; padding: 28px; color: #111827; font-family: Arial, sans-serif; background: #f8fafc; }
            main { max-width: 680px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; padding: 26px; }
            h1 { margin: 0 0 8px; font-size: 22px; }
            p { margin: 4px 0; color: #4b5563; }
            ol { margin-top: 22px; padding-left: 22px; }
            li { margin-bottom: 16px; }
            strong { color: #111827; }
            button { margin-top: 18px; padding: 10px 16px; border: 0; border-radius: 6px; background: #111827; color: #fff; font-weight: 700; cursor: pointer; }
          </style>
        </head>
        <body>
          <main>
            <h1>Invoice History</h1>
            <p><strong>Invoice:</strong> ${escapeHtml(transaction.invoiceNo)}</p>
            <p><strong>Party:</strong> ${escapeHtml(transaction.party)}</p>
            <p><strong>Status:</strong> ${escapeHtml(transaction.status)}</p>
            <ol>
              <li><strong>Created</strong><br />Invoice created on ${escapeHtml(transaction.date)}.</li>
              <li><strong>Reviewed</strong><br />Finance queue checked amount ${escapeHtml(transaction.amount)}.</li>
              <li><strong>Current Status</strong><br />Invoice is marked as ${escapeHtml(transaction.status)}.</li>
            </ol>
            <button onclick="window.print()">Print History</button>
          </main>
        </body>
      </html>`);
    popup.document.close();
    popup.focus();
  }

  function upsertTransaction(transaction) {
    setDeletedTransactionIds((current) => current.filter((id) => id !== transaction.id));
    setSavedSales((current) => {
      const exists = current.some((sale) => sale.id === transaction.id);
      return exists ? current.map((sale) => (sale.id === transaction.id ? transaction : sale)) : [transaction, ...current];
    });
  }

  function deleteTransaction(transaction) {
    setSavedSales((current) => current.filter((sale) => sale.id !== transaction.id));
    setDeletedTransactionIds((current) => (current.includes(transaction.id) ? current : [...current, transaction.id]));
    setMessage(`Invoice ${transaction.invoiceNo} deleted from transactions.`);
  }

  async function shareTransaction(transaction) {
    const shareUrl = `${window.location.origin}/vendor-portal?invoice=${encodeURIComponent(transaction.invoiceNo)}`;
    const shareData = {
      title: `Invoice ${transaction.invoiceNo}`,
      text: `${transaction.party} invoice ${transaction.invoiceNo} for ${transaction.amount}`,
      url: shareUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setMessage(`Invoice ${transaction.invoiceNo} shared.`);
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setMessage(`Share link copied for invoice ${transaction.invoiceNo}.`);
    } catch {
      setMessage(`Share cancelled for invoice ${transaction.invoiceNo}.`);
    }
  }

  function markPaymentReceived(transaction) {
    const updated = {
      ...transaction,
      status: "Paid",
      tone: "green",
      balance: formatCurrency(0),
      invoiceData: {
        ...(transaction.invoiceData || getTransactionSnapshot(transaction).invoice),
        received: true,
        receivedAmount: String(extractAmount(transaction.amount))
      }
    };

    upsertTransaction(updated);
    setMessage(`Payment received for invoice ${transaction.invoiceNo}.`);
  }

  function saveInvoice() {
    const saleRecord = {
      id: activeSaleId || `sale-${Date.now()}`,
      date: formatDateForList(invoice.invoiceDate),
      invoiceNo: invoice.invoiceNo || String(savedSales.length + 1),
      party: party.name || "Unnamed Customer",
      transaction: "Sale",
      paymentType: invoice.mode,
      amount: formatCurrency(totals.grand),
      balance: formatCurrency(paymentSummary.balance),
      status: paymentSummary.status,
      tone: paymentSummary.status === "Paid" ? "green" : paymentSummary.status === "Part Paid" ? "gold" : "red",
      invoiceData: invoice,
      partyData: party,
      rowsData: rows,
      attachedDocument,
      attachedImage
    };

    setSavedSales((current) => {
      const exists = current.some((sale) => sale.id === saleRecord.id);
      return exists
        ? current.map((sale) => (sale.id === saleRecord.id ? saleRecord : sale))
        : [saleRecord, ...current];
    });
    setActiveSaleId(saleRecord.id);
    setMessage("");
    setView("list");
  }

  function handleTransactionAction(transaction, action) {
    setActiveActionMenuId(null);
    setActivePrintMenuId(null);

    if (action === "View/Edit") {
      openTransaction(transaction);
      return;
    }

    if (action === "Delete") {
      deleteTransaction(transaction);
      return;
    }

    if (action === "Generate e-Invoice") {
      openInvoiceDocument(transaction, "e-Invoice Preview");
      setMessage(`e-Invoice generated for invoice ${transaction.invoiceNo}.`);
      return;
    }

    if (action === "Receive Payment") {
      markPaymentReceived(transaction);
      return;
    }

    if (action === "Convert To Return") {
      const returnRecord = {
        ...transaction,
        transaction: "Sale Return",
        status: "Returned",
        tone: "gold",
        balance: formatCurrency(0)
      };
      upsertTransaction(returnRecord);
      setMessage(`Invoice ${transaction.invoiceNo} converted to return.`);
      return;
    }

    if (action === "Preview Delivery Challan") {
      openInvoiceDocument(transaction, "Delivery Challan");
      setMessage(`Delivery challan preview opened for invoice ${transaction.invoiceNo}.`);
      return;
    }

    if (action === "Cancel Invoice") {
      const cancelled = {
        ...transaction,
        status: "Cancelled",
        tone: "red",
        balance: formatCurrency(0)
      };
      upsertTransaction(cancelled);
      setMessage(`Invoice ${transaction.invoiceNo} cancelled.`);
      return;
    }

    if (action === "Duplicate") {
      const copy = {
        ...transaction,
        id: `sale-${Date.now()}`,
        invoiceNo: `${transaction.invoiceNo}-copy`,
        status: transaction.status,
        tone: transaction.tone,
        invoiceData: transaction.invoiceData
          ? { ...transaction.invoiceData, invoiceNo: `${transaction.invoiceNo}-copy` }
          : undefined,
        rowsData: transaction.rowsData ? transaction.rowsData.map((row) => ({ ...row })) : undefined,
        partyData: transaction.partyData ? { ...transaction.partyData } : undefined
      };
      setSavedSales((current) => [copy, ...current]);
      setMessage(`Duplicate created for invoice ${transaction.invoiceNo}.`);
      return;
    }

    if (action === "Open PDF") {
      openInvoiceDocument(transaction, "Tax Invoice PDF");
      setMessage(`PDF preview opened for invoice ${transaction.invoiceNo}.`);
      return;
    }

    if (action === "Preview") {
      openInvoiceDocument(transaction, "Invoice Preview");
      setMessage(`Preview opened for invoice ${transaction.invoiceNo}.`);
      return;
    }

    if (action === "Print") {
      openInvoiceDocument(transaction, "Tax Invoice", { print: true });
      setMessage(`Print dialog opened for invoice ${transaction.invoiceNo}.`);
      return;
    }

    if (action === "View History") {
      openHistoryDocument(transaction);
      setMessage(`History opened for invoice ${transaction.invoiceNo}.`);
      return;
    }

    setMessage(`${action} selected for invoice ${transaction.invoiceNo}.`);
  }

  function handlePrintMenuAction(transaction, action) {
    setActivePrintMenuId(null);
    setActiveActionMenuId(null);

    if (action === "Generate e-Invoice") {
      openInvoiceDocument(transaction, "e-Invoice Preview");
      setMessage(`e-Invoice generated for invoice ${transaction.invoiceNo}.`);
      return;
    }

    if (action === "Generate Eway Bill") {
      openInvoiceDocument(transaction, "Eway Bill");
      setMessage(`Eway bill generated for invoice ${transaction.invoiceNo}.`);
      return;
    }

    if (action === "Share") {
      shareTransaction(transaction);
      return;
    }

    if (action === "Print") {
      openInvoiceDocument(transaction, "Tax Invoice", { print: true });
      setMessage(`Print dialog opened for invoice ${transaction.invoiceNo}.`);
      return;
    }
  }

  const visibleTransactions = useMemo(() => {
    const q = transactionSearch.trim().toLowerCase();
    const savedIds = new Set(savedSales.map((sale) => sale.id));
    const savedInvoiceNos = new Set(savedSales.map((sale) => sale.invoiceNo));
    return [
      ...savedSales,
      ...transactions.filter(
        (transaction) =>
          !deletedTransactionIds.includes(transaction.id) &&
          !savedIds.has(transaction.id) &&
          !savedInvoiceNos.has(transaction.invoiceNo)
      )
    ].filter((transaction) => {
      if (!q) return true;
      return [transaction.date, transaction.invoiceNo, transaction.party, transaction.amount, transaction.status]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [deletedTransactionIds, savedSales, transactionSearch]);

  const salesSummary = useMemo(() => {
    const total = visibleTransactions.reduce((sum, transaction) => sum + extractAmount(transaction.amount), 0);
    const received = visibleTransactions
      .filter((transaction) => transaction.status === "Paid")
      .reduce((sum, transaction) => sum + extractAmount(transaction.amount), 0);
    return {
      total,
      received,
      balance: total - received
    };
  }, [visibleTransactions]);

  return (
    <SuiteShell
      eyebrow="Invoice Module"
      title="Invoice & Tax Billing"
      primaryHref="/reports"
      primaryLabel="Finance Reports"
      brandEyebrow="Invoice Suite"
      actions={
        <>
          <button className="ghost-button" onClick={() => setView("list")} type="button">
            Transactions
          </button>
          <button className="primary-button" onClick={resetInvoiceDraft} type="button">
            Add Tax Invoice
          </button>
        </>
      }
    >
      <section className="invoice-suite">
        <div className="invoice-workspace">
          {view === "list" ? (
            <section className="invoice-board panel">
              <div className="invoice-board-top">
                <input
                  placeholder="Search Transactions"
                  value={transactionSearch}
                  onChange={(event) => setTransactionSearch(event.target.value)}
                />
                <div className="row-actions">
                  <button className="ghost-button" onClick={resetInvoiceDraft} type="button">+ Add Sale</button>
                  <button className="ghost-button" type="button">+ Add Purchase</button>
                  <button className="primary-button" onClick={resetInvoiceDraft} type="button">
                    Add Sale
                  </button>
                </div>
              </div>
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Sale Invoices</p>
                  <h3>Transactions</h3>
                </div>
              </div>
              <div className="filter-strip">
                <button>All Sale Invoices</button>
                <button>Pick a date</button>
                <button>All Firms</button>
                <button>All Users</button>
              </div>
              <div className="invoice-total-card">
                <span>Total Sales Amount</span>
                <strong>{formatCurrency(salesSummary.total)}</strong>
                <small>Received: {formatCurrency(salesSummary.received)} &nbsp; Balance: {formatCurrency(salesSummary.balance)}</small>
              </div>
              {message ? <p className="session-note invoice-list-message">{message}</p> : null}
              <table className="data-table invoice-transaction-table">
                <thead>
                  <tr>
                    {["Date", "Invoice no", "Party Name", "Transaction", "Payment Type", "Amount", "Balance", "Status"].map((heading) => (
                      <th key={heading}>
                        <span>{heading}</span>
                        <button className="invoice-table-filter" type="button" aria-label={`Filter ${heading}`}>
                          <FilterIcon />
                        </button>
                      </th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTransactions.map((transaction) => (
                    <tr
                      className={`openable-row ${activeSaleId === transaction.id ? "selected-row" : ""}`}
                      key={transaction.id}
                      onDoubleClick={() => openTransaction(transaction)}
                    >
                      <td>{transaction.date}</td>
                      <td>{transaction.invoiceNo}</td>
                      <td>{transaction.party}</td>
                      <td>{transaction.transaction}</td>
                      <td>{transaction.paymentType}</td>
                      <td>{transaction.amount}</td>
                      <td>{transaction.balance}</td>
                      <td>
                        <StatusBadge tone={transaction.tone || (transaction.status === "Paid" ? "green" : transaction.status === "Unpaid" || transaction.status === "Cancelled" ? "red" : "gold")}>
                          {transaction.status}
                        </StatusBadge>
                      </td>
                      <td className="invoice-table-actions">
                        <button
                          aria-expanded={activePrintMenuId === transaction.id}
                          aria-haspopup="menu"
                          aria-label={`Print actions for invoice ${transaction.invoiceNo}`}
                          className="invoice-icon-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setActiveActionMenuId(null);
                            setActivePrintMenuId((current) => (current === transaction.id ? null : transaction.id));
                          }}
                          type="button"
                        >
                          <PrintIcon />
                        </button>
                        {activePrintMenuId === transaction.id ? (
                          <div className="invoice-print-action-menu" onClick={(event) => event.stopPropagation()} role="menu">
                            {["Generate e-Invoice", "Generate Eway Bill", "Share", "Print"].map((action) => (
                              <button
                                key={action}
                                onClick={() => handlePrintMenuAction(transaction, action)}
                                role="menuitem"
                                type="button"
                              >
                                <span>{action}</span>
                                {action === "Share" ? <ShareIcon /> : action === "Print" ? <PrintIcon /> : null}
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <button className="invoice-icon-button" onClick={() => shareTransaction(transaction)} type="button" aria-label={`Share invoice ${transaction.invoiceNo}`}>
                          <ShareIcon />
                        </button>
                        <button
                          aria-expanded={activeActionMenuId === transaction.id}
                          aria-haspopup="menu"
                          aria-label={`More actions for invoice ${transaction.invoiceNo}`}
                          className="invoice-icon-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setActivePrintMenuId(null);
                            setActiveActionMenuId((current) => (current === transaction.id ? null : transaction.id));
                          }}
                          type="button"
                        >
                          <MoreIcon />
                        </button>
                        {activeActionMenuId === transaction.id ? (
                          <div className="invoice-row-action-menu" onClick={(event) => event.stopPropagation()} role="menu">
                            {[
                              "View/Edit",
                              "Generate e-Invoice",
                              "Receive Payment",
                              "Convert To Return",
                              "Preview Delivery Challan",
                              "Cancel Invoice",
                              "Delete",
                              "Duplicate",
                              "Open PDF",
                              "Preview",
                              "Print",
                              "View History"
                            ].map((action) => (
                              <button
                                key={action}
                                onClick={() => handleTransactionAction(transaction, action)}
                                role="menuitem"
                                type="button"
                              >
                                {action}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : (
            <section className="tax-invoice panel">
              <div className="tax-invoice-top">
                <div>
                  <p className="eyebrow">{party.name || "Sale"}</p>
                  <h3>Sale</h3>
                </div>
                <strong className="invoice-company-name">TALME TECHNOLOGIES PRIVATE LIMITED</strong>
                <div className="credit-toggle">
                  <span>Credit</span>
                  <button
                    aria-label="Toggle credit or cash"
                    className={invoice.mode === "Credit" ? "on" : ""}
                    onClick={() => setInvoice((current) => ({ ...current, mode: current.mode === "Credit" ? "Cash" : "Credit" }))}
                    type="button"
                  />
                  <span>Cash</span>
                </div>
              </div>

              <div className="invoice-form-row">
                <div className="invoice-customer-block">
                  <label className="customer-field">
                    <span>Customer *</span>
                    <div className="customer-field-row">
                      <input
                        aria-label="Customer"
                        value={party.name || ""}
                        onChange={(event) =>
                          setParty((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Search by Name/Phone *"
                      />
                      <button
                        className="ghost-button invoice-inline-button"
                        onClick={() => {
                          setPartyModalMode("add");
                          setPartyModalOpen(true);
                        }}
                        type="button"
                      >
                        Add Party
                      </button>
                    </div>
                    <small className="invoice-balance">BAL: {paymentSummary.balance.toLocaleString("en-IN")}</small>
                  </label>
                  <div className="invoice-address-pair">
                    <label>
                      <span>Billing Address</span>
                      <textarea aria-label="Billing Address" value={party.billing} onChange={(event) => setParty((current) => ({ ...current, billing: event.target.value }))} />
                    </label>
                    <label>
                      <span>Shipping Address</span>
                      <textarea aria-label="Shipping Address" value={party.shipping} onChange={(event) => setParty((current) => ({ ...current, shipping: event.target.value }))} />
                    </label>
                  </div>
                  <div className="invoice-address-actions">
                    <button
                      onClick={() => {
                        setParty((current) => ({ ...current, shipping: "" }));
                        setMessage("Shipping address removed.");
                      }}
                      type="button"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => {
                        setShowShippingAddress(true);
                        setPartyModalMode("change");
                        setPartyModalOpen(true);
                      }}
                      type="button"
                    >
                      Change
                    </button>
                  </div>
                </div>
                <div className="invoice-po-grid">
                  <label><span>PO No.</span><input value={invoice.poNo} onChange={(event) => setInvoice((current) => ({ ...current, poNo: event.target.value }))} /></label>
                  <DateField label="PO Date" value={invoice.poDate} onChange={(value) => setInvoice((current) => ({ ...current, poDate: value }))} />
                </div>
                <div className="invoice-meta-grid">
                  <label><span>Invoice Number</span><input value={invoice.invoiceNo} onChange={(event) => setInvoice((current) => ({ ...current, invoiceNo: event.target.value }))} /></label>
                  <DateField label="Invoice Date" value={invoice.invoiceDate} onChange={(value) => setInvoice((current) => ({ ...current, invoiceDate: value }))} />
                  <label><span>State of supply</span><select value={invoice.state} onChange={(event) => setInvoice((current) => ({ ...current, state: event.target.value }))}><option>Select</option>{indiaStatesAndUts.map((state) => <option key={state}>{state}</option>)}</select></label>
                </div>
              </div>

              <div className="invoice-table-wrap">
                <table className="invoice-entry-table">
                  <colgroup>
                    <col className="invoice-col-index" />
                    <col className="invoice-col-item" />
                    <col className="invoice-col-hsn" />
                    <col className="invoice-col-description" />
                    <col className="invoice-col-details" />
                    <col className="invoice-col-qty" />
                    <col className="invoice-col-unit" />
                    <col className="invoice-col-price" />
                    <col className="invoice-col-tax" />
                    <col className="invoice-col-tax-amount" />
                    <col className="invoice-col-amount" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Item</th>
                      <th>HSN Code</th>
                      <th>Description</th>
                      <th>Details</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>Price/Unit</th>
                      <th>Tax %</th>
                      <th>Tax Amount</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const amount = toSafeNumber(row.qty) * toSafeNumber(row.price);
                      const taxAmount = row.tax === "GST@18%" ? amount * 0.18 : 0;
                      return (
                        <tr key={row.id}>
                          <td>
                            <div className="invoice-row-index">
                              <span>{index + 1}</span>
                              <button
                                aria-label={`Delete row ${index + 1}`}
                                className="invoice-delete-row"
                                disabled={rows.length <= 1}
                                onClick={() => deleteRow(row.id)}
                                type="button"
                              >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v7h-2v-7Zm4 0h2v7h-2v-7ZM7 10h2v7H7v-7Zm-1 11h12l1-13H5l1 13Z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                          <td><input value={row.item} onChange={(event) => updateRow(row.id, "item", event.target.value)} /></td>
                          <td><input value={row.hsn} onChange={(event) => updateRow(row.id, "hsn", event.target.value)} /></td>
                          <td><input value={row.description} onChange={(event) => updateRow(row.id, "description", event.target.value)} /></td>
                          <td><input value={row.details} onChange={(event) => updateRow(row.id, "details", event.target.value)} /></td>
                          <td><input value={row.qty} onChange={(event) => updateRow(row.id, "qty", event.target.value)} /></td>
                          <td className="unit-cell">
                            <button onClick={() => setUnitMenuRow(unitMenuRow === row.id ? null : row.id)} type="button">{row.unit}</button>
                            {unitMenuRow === row.id ? (
                              <div className="unit-menu">
                                <input placeholder="Search" />
                                <button type="button">+ Add New Unit</button>
                                {unitOptions.map((unit) => (
                                  <button
                                    key={unit}
                                    onClick={() => {
                                      updateRow(row.id, "unit", unit);
                                      setUnitMenuRow(null);
                                    }}
                                    type="button"
                                  >
                                    {unit}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </td>
                          <td><input value={row.price} onChange={(event) => updateRow(row.id, "price", event.target.value)} /></td>
                          <td><select value={row.tax} onChange={(event) => updateRow(row.id, "tax", event.target.value)}><option>Select</option><option>GST@18%</option><option>GST@12%</option><option>IGST@18%</option></select></td>
                          <td>{taxAmount.toLocaleString("en-IN")}</td>
                          <td>{(amount + taxAmount).toLocaleString("en-IN")}</td>
                        </tr>
                      );
                    })}
                    <tr className="invoice-total-row">
                      <td colSpan="5">Total</td>
                      <td>{rows.reduce((sum, row) => sum + toSafeNumber(row.qty), 0)}</td>
                      <td colSpan="3">Total</td>
                      <td>{totals.tax.toLocaleString("en-IN")}</td>
                      <td>{totals.grand.toLocaleString("en-IN")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="invoice-row-tools">
                <button className="invoice-add-row-button" onClick={addRow} type="button">
                  + Add Row
                </button>
              </div>

              <div className="invoice-footer-grid">
                <div className="invoice-footer-left">
                  <div className="invoice-footer-controls">
                    <label><span>Payment Type</span><select value={invoice.mode} onChange={(event) => setInvoice((current) => ({ ...current, mode: event.target.value }))}><option>Cash</option><option>Credit</option><option>UPI</option><option>Bank Transfer</option></select></label>
                    <label><span>No. of copies</span><select value={invoice.copies} onChange={(event) => setInvoice((current) => ({ ...current, copies: event.target.value }))}><option>Original</option><option>Duplicate</option><option>Triplicate</option></select></label>
                    <label><span>Signatory Name</span><input placeholder="Enter signatory" value={invoice.signatoryName || ""} onChange={(event) => setInvoice((current) => ({ ...current, signatoryName: event.target.value }))} /></label>
                  </div>
                  <button className="invoice-text-action" onClick={() => setMessage("Payment type option ready to add.")} type="button">+ Add Payment Type</button>
                  <button className="invoice-plain-action" type="button">Add Description</button>
                  <label className="invoice-plain-action invoice-upload-button">
                    <input
                      accept="image/*"
                      className="invoice-file-input"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          setAttachedImage(file.name);
                          setMessage(`${file.name} image attached to invoice.`);
                        }
                      }}
                      type="file"
                    />
                    Add Image
                  </label>
                  {attachedImage ? <span className="invoice-file-name">{attachedImage}</span> : null}
                  <label className="invoice-plain-action invoice-upload-button">
                    <input
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp"
                      className="invoice-file-input"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          setAttachedDocument(file.name);
                          setMessage(`${file.name} document attached to invoice.`);
                        }
                      }}
                      type="file"
                    />
                    Add Document
                  </label>
                  {attachedDocument ? <span className="invoice-file-name">{attachedDocument}</span> : null}
                </div>
                <div className="invoice-tax-box">
                  <label><span>Tax</span><select value={invoice.tax} onChange={(event) => setInvoice((current) => ({ ...current, tax: event.target.value }))}><option>GST@18%</option><option>GST@12%</option><option>NONE</option></select><strong>{totals.tax.toLocaleString("en-IN")}</strong></label>
                  <label><span>TDS</span><select value={invoice.tds} onChange={(event) => setInvoice((current) => ({ ...current, tds: event.target.value }))}><option>NONE</option><option>1%</option><option>2%</option></select><strong>0</strong></label>
                  <div className="invoice-total-line"><span>Total</span><strong>{totals.grand.toLocaleString("en-IN")}</strong></div>
                  <label className="invoice-received-row">
                    <span>
                      <input
                        checked={Boolean(invoice.received)}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setInvoice((current) => ({
                            ...current,
                            received: checked,
                            receivedAmount: checked ? current.receivedAmount || "" : ""
                          }));
                        }}
                        type="checkbox"
                      />
                      Received
                    </span>
                    {invoice.received ? (
                      <input
                        aria-label="Received amount"
                        inputMode="decimal"
                        onChange={(event) => setInvoice((current) => ({ ...current, receivedAmount: event.target.value }))}
                        placeholder="0"
                        value={invoice.receivedAmount || ""}
                      />
                    ) : null}
                  </label>
                  <div className="invoice-total-line invoice-balance-line"><span>Balance</span><strong>{paymentSummary.balance.toLocaleString("en-IN")}</strong></div>
                </div>
              </div>

              <div className="invoice-action-bar">
                {message ? <p className="session-note">{message}</p> : <span />}
                <div className="row-actions">
                  <button
                    className="ghost-button"
                    onClick={() => {
                      setMessage("");
                      setView("list");
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button className="ghost-button" onClick={() => setMessage("Share link prepared for finance approval.")} type="button">Share</button>
                  <button className="ghost-button" onClick={downloadInvoice} type="button">Download Invoice</button>
                  <button className="primary-button" onClick={saveInvoice} type="button">Save</button>
                </div>
              </div>
            </section>
          )}
        </div>
      </section>

      <Modal
        open={partyModalOpen}
        eyebrow="Customer Master"
        title={partyModalMode === "change" ? "Edit Party" : "Add Party"}
        variant="party"
        onClose={() => setPartyModalOpen(false)}
      >
        <div className={`party-modal ${partyModalMode === "change" ? "party-modal-change" : ""}`}>
          <div className="party-top-grid">
            <label><span>Party Name *</span><input value={party.name} onChange={(event) => setParty((current) => ({ ...current, name: event.target.value }))} /></label>
            <label><span>GSTIN</span><input value={party.gstin} onChange={(event) => setParty((current) => ({ ...current, gstin: event.target.value }))} /></label>
            <label><span>Phone Number</span><input value={party.phone} onChange={(event) => setParty((current) => ({ ...current, phone: event.target.value }))} /></label>
          </div>
          <div className="party-tabs">
            <button className="active" type="button">{partyModalMode === "change" ? "Address" : "GST & Address"}</button>
            {partyModalMode === "add" ? <button type="button">Credit &amp; Balance <b>New</b></button> : null}
            <button type="button">Additional Fields</button>
          </div>
          <div className="party-body-grid">
            <div className="party-stack">
              <label><span>GST Type</span><select value={party.gstType} onChange={(event) => setParty((current) => ({ ...current, gstType: event.target.value }))}><option>Unregistered/Consumer</option><option>Registered Business</option><option>Composition Dealer</option></select></label>
              <label><span>State</span><select value={party.state} onChange={(event) => setParty((current) => ({ ...current, state: event.target.value }))}>{indiaStatesAndUts.map((state) => <option key={state}>{state}</option>)}</select></label>
              <label><span>Email ID</span><input value={party.email} onChange={(event) => setParty((current) => ({ ...current, email: event.target.value }))} /></label>
            </div>
            <label><span>Billing Address</span><textarea value={party.billing} onChange={(event) => setParty((current) => ({ ...current, billing: event.target.value }))} /></label>
            <div className="party-stack">
              <span>Shipping Address</span>
              {showShippingAddress ? (
                <textarea
                  aria-label="New Shipping Address"
                  placeholder="Shipping Address"
                  value={party.shipping}
                  onChange={(event) =>
                    setParty((current) => ({ ...current, shipping: event.target.value }))
                  }
                />
              ) : (
                <button
                  className="ghost-button"
                  onClick={() => setShowShippingAddress(true)}
                  type="button"
                >
                  + Add New Address
                </button>
              )}
            </div>
          </div>
          <div className="modal-actions">
            <button className="ghost-button" onClick={() => setPartyModalOpen(false)} type="button">Cancel</button>
            {partyModalMode === "add" ? <button className="ghost-button" onClick={() => setMessage("Party saved. Add another party when ready.")} type="button">Save &amp; New</button> : null}
            <button className="primary-button" onClick={() => setPartyModalOpen(false)} type="button">{partyModalMode === "change" ? "Update" : "Save"}</button>
          </div>
        </div>
      </Modal>
    </SuiteShell>
  );
}
