"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/modal";
import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";

const savedSalesStorageKey = "talme-sale-invoices";

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

export default function VmsPageClient() {
  const [view, setView] = useState("list");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [savedSales, setSavedSales] = useState([]);
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
    receivedAmount: ""
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
    } catch {
      setSavedSales([]);
    } finally {
      setSalesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!salesLoaded) return;
    window.localStorage.setItem(savedSalesStorageKey, JSON.stringify(savedSales));
  }, [savedSales, salesLoaded]);

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
      receivedAmount: ""
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
      receivedAmount: ""
    });
    setRows(isYokogawa ? yokogawaRows : initialRows);
    setAttachedDocument("");
    setAttachedImage("");
    setMessage("");
    setView("editor");
  }

  function downloadInvoice() {
    const payload = new URLSearchParams({
      invoiceNo: invoice.invoiceNo,
      invoiceDate: invoice.invoiceDate,
      poNo: invoice.poNo,
      poDate: invoice.poDate,
      state: invoice.state,
      party: party.name,
      billing: party.billing,
      shipping: party.shipping,
      subtotal: String(totals.subtotal),
      tax: String(totals.tax),
      grand: String(totals.grand),
      rows: JSON.stringify(rows)
    });
    window.open(`/api/pdf/invoice?${payload.toString()}`, "_blank", "noopener,noreferrer");
    setMessage("Tax invoice PDF prepared.");
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
      setSavedSales((current) => current.filter((sale) => sale.id !== transaction.id));
      setMessage(`Delete requested for invoice ${transaction.invoiceNo}.`);
      return;
    }

    if (action === "Duplicate") {
      const copy = {
        ...transaction,
        id: `sale-${Date.now()}`,
        invoiceNo: `${transaction.invoiceNo}-copy`,
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
      setMessage(`PDF opened for invoice ${transaction.invoiceNo}.`);
      return;
    }

    setMessage(`${action} selected for invoice ${transaction.invoiceNo}.`);
  }

  function handlePrintMenuAction(transaction, action) {
    setActivePrintMenuId(null);
    setActiveActionMenuId(null);
    setMessage(`${action} selected for invoice ${transaction.invoiceNo}.`);
  }

  const visibleTransactions = useMemo(() => {
    const q = transactionSearch.trim().toLowerCase();
    const savedIds = new Set(savedSales.map((sale) => sale.id));
    const savedInvoiceNos = new Set(savedSales.map((sale) => sale.invoiceNo));
    return [
      ...savedSales,
      ...transactions.filter(
        (transaction) => !savedIds.has(transaction.id) && !savedInvoiceNos.has(transaction.invoiceNo)
      )
    ].filter((transaction) => {
      if (!q) return true;
      return [transaction.date, transaction.invoiceNo, transaction.party, transaction.amount, transaction.status]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [savedSales, transactionSearch]);

  const salesSummary = useMemo(() => {
    const extractAmount = (value) => Number(String(value || "").replace(/[^\d.]/g, "")) || 0;
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
                        <StatusBadge tone={transaction.status === "Paid" ? "green" : transaction.status === "Unpaid" ? "red" : "gold"}>
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
                        <button className="invoice-icon-button" onClick={() => setMessage(`Share link prepared for invoice ${transaction.invoiceNo}.`)} type="button" aria-label={`Share invoice ${transaction.invoiceNo}`}>
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
