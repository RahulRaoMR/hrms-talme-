"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/modal";
import InvoiceTransactions from "@/components/invoice-transactions";
import SuiteShell from "@/components/suite-shell";
import InvoicePdfPreview from "@/components/invoice-pdf-preview";
import { apiUrl } from "@/lib/api-client";
import { ArrowLeft, Download, Eye, FileText, Paperclip, Plus, Save, Trash2, X } from "lucide-react";
import { amountInWords, calculateInvoice, defaultInvoiceBranchId, getInvoiceCompany, invoiceBranches, invoiceValidation, meghaInvoiceParty, money } from "@/lib/invoice-model";
import "./vms-invoice.css";
import { confirmSavedInvoice, downloadInvoiceBlob, invoiceAttachment, invoiceFile, invoiceRequest } from "@/lib/invoice-client";

const savedSalesStorageKey = "talme-sale-invoices";

const initialRows = [
  { id: 1, item: "", hsn: "", description: "", details: "", qty: "1", unit: "NONE", price: "", tax: "Select" }
];

const unitOptions = ["NONE", "BAGS (BAG)", "BOTTLES (BTL)", "BOX (BOX)", "BUNDLES (BDL)", "DOZENS (DZN)", "GRAMMES (GM)", "KILOGRAMS (KG)", "LITRE (LTR)", "MONTH (MTH)", "PIECES (PCS)"];

const invoiceTaxOptions = [
  "NONE",
  "GST@0%",
  "GST@3%",
  "GST@5%",
  "GST@12%",
  "GST@18%",
  "GST@28%",
  "CGST+SGST@5%",
  "CGST+SGST@12%",
  "CGST+SGST@18%",
  "CGST+SGST@28%",
  "IGST@5%",
  "IGST@12%",
  "IGST@18%",
  "IGST@28%"
];

const invoiceTdsOptions = [
  "NONE (0%)",
  "0.1%",
  "0.75%",
  "1%",
  "2%",
  "5%",
  "10%",
  "20%",
  "30%"
];

const gstStateCodeMap = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  10: "Bihar",
  11: "Sikkim",
  12: "Arunachal Pradesh",
  13: "Nagaland",
  14: "Manipur",
  15: "Mizoram",
  16: "Tripura",
  17: "Meghalaya",
  18: "Assam",
  19: "West Bengal",
  20: "Jharkhand",
  21: "Odisha",
  22: "Chhattisgarh",
  23: "Madhya Pradesh",
  24: "Gujarat",
  26: "Dadra and Nagar Haveli and Daman and Diu",
  27: "Maharashtra",
  29: "Karnataka",
  30: "Goa",
  31: "Lakshadweep",
  32: "Kerala",
  33: "Tamil Nadu",
  34: "Puducherry",
  35: "Andaman and Nicobar Islands",
  36: "Telangana",
  37: "Andhra Pradesh",
  38: "Ladakh"
};



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


function DateField({ label, value, onChange }) {
  return <label><span>{label}</span><input aria-label={label} type="date" value={value || ""} onChange={(event) => onChange(event.target.value)} /></label>;
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

function normalizeTdsOption(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized || normalized === "NONE" || normalized === "NONE (0%)") return "NONE (0%)";
  const match = normalized.match(/^(\d+(?:\.\d+)?)%$/);
  if (!match) return "NONE (0%)";

  return invoiceTdsOptions.find((option) => option === `${match[1]}%`) || "NONE (0%)";
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

function normalizeAddressLines(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function removeAddressLabelLines(lines, labels) {
  const labelSet = new Set(labels.map((label) => label.toLowerCase()));
  return lines.filter((line) => !labelSet.has(line.toLowerCase()));
}

function displayAddress(address) {
  return removeAddressLabelLines(normalizeAddressLines(address), ["Billing Address"]).join("\n");
}

function normalizeLookup(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeGstin(value) {
  return String(value || "").replace(/\s/g, "").toUpperCase();
}

function getStateFromGstin(value) {
  const code = normalizeGstin(value).slice(0, 2);
  return gstStateCodeMap[code] || "";
}

function partyFromRecord(record) {
  return {
    id: record.id,
    name: record.name || "",
    gstin: record.gstin || "",
    pan: record.pan || record.gstin?.slice(2, 12) || "",
    phone: record.phone || "",
    gstType: record.gstType || (record.gstin ? "Registered Business" : "Unregistered/Consumer"),
    state: record.state || getStateFromGstin(record.gstin) || "Karnataka",
    email: record.email || "",
    billing: record.billing || "",
    shipping: record.shipping || ""
  };
}

function buildInvoicePartyPayload(party) {
  return {
    name: String(party.name || "").trim(),
    gstin: normalizeGstin(party.gstin) || undefined,
    phone: String(party.phone || "").trim(),
    gstType: party.gstType || "Unregistered/Consumer",
    state: party.state || getStateFromGstin(party.gstin) || "",
    email: String(party.email || "").trim(),
    billing: String(party.billing || "").trim(),
    shipping: String(party.shipping || "").trim()
  };
}

function hasInvoicePartyDetails(party) {
  const payload = buildInvoicePartyPayload(party);
  return Boolean(payload.name && (payload.gstin || payload.phone || payload.billing || payload.shipping));
}

function mergeInvoiceParties(records, savedSales) {
  const merged = new Map();

  function add(record) {
    const party = partyFromRecord(record || {});
    if (!hasInvoicePartyDetails(party)) return;

    const key = normalizeGstin(party.gstin) || `${normalizeLookup(party.name)}|${normalizeLookup(party.phone)}`;
    if (!key || key === "|") return;

    const populatedParty = Object.fromEntries(
      Object.entries(party).filter(([, value]) => value !== undefined && value !== "")
    );

    merged.set(key, {
      ...(merged.get(key) || {}),
      ...populatedParty
    });
  }

  records.forEach(add);
  savedSales.forEach((sale) => add(sale.partyData));

  return Array.from(merged.values());
}



export default function VmsPageClient({ initialInvoiceId = "" }) {
  const [view, setView] = useState("list");
  const [savedSales, setSavedSales] = useState([]);
  const [localSales, setLocalSales] = useState([]);
  const [editingLocalInvoiceNo, setEditingLocalInvoiceNo] = useState("");
  const [salesLoaded, setSalesLoaded] = useState(false);
  const [salesError, setSalesError] = useState("");
  const [signInRequired, setSignInRequired] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [activeVersion, setActiveVersion] = useState("");
  const [previewFileName, setPreviewFileName] = useState("");
  const [activeSaleId, setActiveSaleId] = useState(null);
  const [invoiceParties, setInvoiceParties] = useState([]);
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partyModalMode, setPartyModalMode] = useState("add");
  const [activePartySuggestions, setActivePartySuggestions] = useState("");
  const [activeAddressField, setActiveAddressField] = useState("");
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
    branchId: defaultInvoiceBranchId,
    mode: "Credit",
    invoiceNo: "98352651136",
    invoiceDate: "2026-05-06",
    poNo: "",
    poDate: "",
    state: "Select",
    copies: "Original",
    tax: "GST@18%",
    tds: "NONE (0%)",
    received: false,
    receivedAmount: "",
    signatoryName: ""
  });
  const [rows, setRows] = useState(initialRows);
  const [message, setMessage] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [showShippingAddress, setShowShippingAddress] = useState(false);
  const [attachedDocument, setAttachedDocument] = useState("");
  const [attachedImage, setAttachedImage] = useState("");

  const loadingSalesRef = useRef(false);
  const initialInvoiceOpenedRef = useRef(false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [view]);

  const loadSharedInvoices = useCallback(async ({ syncLegacy = false } = {}) => {
    if (loadingSalesRef.current) return;
    loadingSalesRef.current = true;
    try {
      let records = await invoiceRequest();
      if (!Array.isArray(records)) throw new Error("Unable to load saved invoices.");
      let migrationError = "";
      if (syncLegacy) {
        let legacy = [];
        try {
          const parsed = JSON.parse(window.localStorage.getItem(savedSalesStorageKey) || "[]");
          if (Array.isArray(parsed)) legacy = parsed;
        } catch {}
        const remaining = [];
        for (const sale of legacy) {
          const existing = records.find((record) => record.invoiceNo === sale.invoiceNo);
          if (existing?.invoiceData) continue;
          if (!sale.invoiceData || !sale.partyData || !Array.isArray(sale.rowsData)) {
            remaining.push(sale);
            migrationError = "Some older invoices need their complete details before they can be synced.";
            continue;
          }
          try {
            const saved = await invoiceRequest(existing ? `/api/invoices/${existing.id}` : "/api/invoices", {
              method: existing ? "PATCH" : "POST",
              body: JSON.stringify({ ...sale, updatedAt: existing?.updatedAt })
            });
            confirmSavedInvoice(saved);
            records = [saved, ...records.filter((record) => record.id !== saved.id)];
          } catch (error) {
            remaining.push(sale);
            migrationError = `Some older invoices have not synced: ${error.message}`;
          }
        }
        if (legacy.length) window.localStorage.setItem(savedSalesStorageKey, JSON.stringify(remaining));
        setLocalSales(remaining.map((sale) => {
          const existing = records.find((record) => record.invoiceNo === sale.invoiceNo);
          return { ...sale, id: existing?.id || sale.id, updatedAt: existing?.updatedAt, pendingSync: true, party: sale.party || sale.partyData?.name || existing?.party || "Customer pending" };
        }));
      }
      setSavedSales(records);
      setSignInRequired(false);
      setSalesError(migrationError);
      if (initialInvoiceId && !initialInvoiceOpenedRef.current) {
        const requested = records.find((record) => record.id === initialInvoiceId);
        if (requested) {
          initialInvoiceOpenedRef.current = true;
          openTransaction(requested);
        } else setSalesError("Invoice not found.");
      }
    } catch (error) {
      setSignInRequired(error.status === 401);
      setSalesError(error.message || "Unable to load saved invoices.");
    } finally {
      loadingSalesRef.current = false;
      setSalesLoaded(true);
    }
  }, [initialInvoiceId]);

  useEffect(() => {
    loadSharedInvoices({ syncLegacy: true });
    const refresh = () => loadSharedInvoices();
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, [loadSharedInvoices]);

  useEffect(() => {
    let cancelled = false;

    async function loadInvoiceParties() {
      try {
        const response = await fetch(apiUrl("/api/invoice-parties"), { cache: "no-store" });
        if (!response.ok) return;
        const rows = await response.json();
        if (!cancelled && Array.isArray(rows)) {
          setInvoiceParties(rows);
        }
      } catch {}
    }

    loadInvoiceParties();

    return () => {
      cancelled = true;
    };
  }, []);


  const previousInvoiceTotalRef = useRef(0);

  const partyDirectory = useMemo(() => mergeInvoiceParties([meghaInvoiceParty, ...invoiceParties], savedSales), [invoiceParties, savedSales]);

  useEffect(() => {
    if (!previewUrl) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") setPreviewUrl(""); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      URL.revokeObjectURL(previewUrl);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [previewUrl]);

  const partySuggestions = useMemo(() => {
    const partyQueryValue =
      activePartySuggestions === "phone" ? party.phone :
      activePartySuggestions === "gstin" ? party.gstin :
      party.name;
    const query = normalizeLookup(partyQueryValue);
    if (query.length < 2) return [];

    return partyDirectory
      .filter((record) =>
        [record.name, record.phone, record.gstin, record.billing, record.shipping]
          .some((value) => normalizeLookup(value).includes(query))
      )
      .slice(0, 5);
  }, [activePartySuggestions, party.name, party.phone, party.gstin, partyDirectory]);

  const gstinSuggestions = useMemo(() => {
    const query = normalizeGstin(party.gstin);
    if (query.length < 2) return [];

    return partyDirectory
      .filter((record) => normalizeGstin(record.gstin).includes(query))
      .slice(0, 5);
  }, [party.gstin, partyDirectory]);

  const totals = useMemo(() => calculateInvoice(invoice, rows, party), [invoice, rows, party]);
  const supplier = getInvoiceCompany(invoice.branchId);

  const paymentSummary = useMemo(() => ({
    received: totals.received,
    balance: totals.balance,
    status: totals.received <= 0 ? "Unpaid" : totals.balance <= 0 ? "Paid" : "Part Paid"
  }), [totals.received, totals.balance]);

  useEffect(() => {
    const previousTotal = previousInvoiceTotalRef.current;

    if (invoice.received) {
      const receivedAmount = toSafeNumber(invoice.receivedAmount);
      const shouldSyncReceived =
        !String(invoice.receivedAmount || "").trim() ||
        Math.abs(receivedAmount - previousTotal) < 0.01 ||
        receivedAmount > totals.payable;

      if (shouldSyncReceived) {
        setInvoice((current) => ({ ...current, receivedAmount: String(totals.payable) }));
      }
    }

    previousInvoiceTotalRef.current = totals.payable;
  }, [invoice.received, invoice.receivedAmount, totals.payable]);

  function findExistingParty(payload) {
    const gstin = normalizeGstin(payload.gstin);
    if (party.id) {
      const byId = invoiceParties.find((record) => record.id === party.id);
      if (byId) return byId;
    }

    if (gstin) {
      const byGstin = invoiceParties.find((record) => normalizeGstin(record.gstin) === gstin);
      if (byGstin) return byGstin;
    }

    return invoiceParties.find((record) =>
      normalizeLookup(record.name) === normalizeLookup(payload.name) &&
      normalizeLookup(record.phone) === normalizeLookup(payload.phone)
    );
  }

  async function persistInvoiceParty({ silent = false, resetAfterSave = false } = {}) {
    if (!hasInvoicePartyDetails(party)) return null;

    const payload = buildInvoicePartyPayload(party);
    const existing = findExistingParty(payload);
    const path = existing ? `/api/invoice-parties/${existing.id}` : "/api/invoice-parties";

    try {
      const response = await fetch(apiUrl(path), {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Unable to save party.");
      }

      const savedParty = await response.json();
      setInvoiceParties((current) => {
        const exists = current.some((record) => record.id === savedParty.id);
        return exists
          ? current.map((record) => (record.id === savedParty.id ? savedParty : record))
          : [savedParty, ...current];
      });

      if (resetAfterSave) {
        setParty({
          name: "",
          gstin: "",
          phone: "",
          gstType: "Unregistered/Consumer",
          state: "Karnataka",
          email: "",
          billing: "",
          shipping: ""
        });
        setShowShippingAddress(false);
      } else {
        setParty((current) => ({ ...current, id: savedParty.id, gstin: savedParty.gstin || current.gstin }));
      }

      if (!silent) {
        setMessage(`Party ${savedParty.name} saved to backend.`);
      }

      return savedParty;
    } catch (error) {
      if (!silent) {
        setMessage(error.message || "Unable to save party.");
      }
      return null;
    }
  }



  function applyInvoiceParty(record) {
    const nextParty = partyFromRecord(record);
    setParty(nextParty);
    setShowShippingAddress(Boolean(nextParty.shipping));
    setActivePartySuggestions("");
    setActiveAddressField("");
    if (nextParty.state && invoice.state === "Select") {
      setInvoice((current) => ({ ...current, state: nextParty.state }));
    }
  }

  function updatePartyField(field, value) {
    const nextValue = field === "gstin" ? normalizeGstin(value) : value;

    if (field === "gstin") {
      const matchingParty = partyDirectory.find((record) => normalizeGstin(record.gstin) === nextValue);
      if (matchingParty) {
        applyInvoiceParty({ ...matchingParty, gstin: nextValue });
        return;
      }
    }

    setParty((current) => {
      const nextParty = { ...current, [field]: nextValue };
      if (field === "gstin") {
        nextParty.pan = nextValue.slice(2, 12);
        const state = getStateFromGstin(nextValue);
        if (state) {
          nextParty.state = state;
          nextParty.gstType = "Registered Business";
        }
      }

      return nextParty;
    });
  }

  function getAddressSuggestions(field) {
    const query = normalizeLookup(party[field]);
    const suggestions = [];
    const seen = new Set();

    function add(address, label, source) {
      const cleanAddress = displayAddress(address);
      const key = normalizeLookup(cleanAddress);
      if (!cleanAddress || seen.has(key)) return;
      if (query && !key.includes(query) && !normalizeLookup(label).includes(query)) return;
      seen.add(key);
      suggestions.push({ address: cleanAddress, label, source });
    }

    if (field === "shipping") {
      add(party.billing, "Use billing address", party.name || "Current party");
    }

    partyDirectory.forEach((record) => {
      add(record.billing, record.name || "Saved billing address", "Billing");
      add(record.shipping, record.name || "Saved shipping address", "Shipping");
    });

    return suggestions.slice(0, 5);
  }

  function applyAddressSuggestion(field, address) {
    setParty((current) => ({ ...current, [field]: address }));
    setActiveAddressField("");
  }

  function updateRow(id, key, value) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  }

  function updateInvoiceTax(value) {
    setInvoice((current) => ({ ...current, tax: value }));
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
        qty: "1",
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
    setEditingLocalInvoiceNo("");
    setActiveVersion("");
    setAttachments([]);
    setShowShippingAddress(false);
    setParty({
      name: "",
      gstin: "",
      phone: "",
      gstType: "Unregistered/Consumer",
      state: "Karnataka",
      email: "",
      billing: "",
      shipping: ""
    });
    setInvoice({
      branchId: defaultInvoiceBranchId,
      mode: "Credit",
      invoiceNo: String(Date.now()).slice(-6),
      invoiceDate: new Date().toISOString().slice(0, 10),
      poNo: "",
      poDate: "",
      state: "Select",
      copies: "Original",
      tax: "GST@18%",
      tds: "NONE (0%)",
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
    setEditingLocalInvoiceNo(transaction.pendingSync ? transaction.invoiceNo : "");
    setActiveVersion(transaction.updatedAt || "");
    setAttachments((transaction.documents || []).filter((document) => document.kind !== "Invoice PDF"));
    setParty(transaction.partyData);
    setShowShippingAddress(Boolean(transaction.partyData.shipping));
    setInvoice({
      branchId: defaultInvoiceBranchId,
      received: false,
      receivedAmount: "",
      ...transaction.invoiceData,
      tds: normalizeTdsOption(transaction.invoiceData.tds)
    });
    setRows(transaction.rowsData.map((row, index) => ({ ...row, id: row.id ?? index + 1 })));
    setAttachedDocument(transaction.attachedDocument || "");
    setAttachedImage(transaction.attachedImage || "");
    setMessage(`Opened sale invoice ${transaction.invoiceNo}.`);
    setView("editor");
  }

  function openTransaction(transaction) {
    if (transaction.invoiceData && transaction.partyData && Array.isArray(transaction.rowsData)) {
      openSavedSale(transaction);
      return;
    }
    const snapshot = getTransactionSnapshot(transaction);
    setActiveSaleId(transaction.id);
    setEditingLocalInvoiceNo(transaction.pendingSync ? transaction.invoiceNo : "");
    setActiveVersion(transaction.updatedAt || "");
    setAttachments((transaction.documents || []).filter((document) => document.kind !== "Invoice PDF"));
    setParty({ ...snapshot.party, billing: "", shipping: "" });
    setInvoice({ branchId: defaultInvoiceBranchId, ...snapshot.invoice, invoiceNo: transaction.invoiceNo, invoiceDate: /^\d{4}-\d{2}-\d{2}$/.test(snapshot.invoice.invoiceDate) ? snapshot.invoice.invoiceDate : new Date().toISOString().slice(0, 10) });
    setRows(snapshot.rows);
    setShowShippingAddress(false);
    setMessage("");
    setView("editor");
  }

  function currentTransaction() {
    return {
      id: activeSaleId || "draft-invoice",
      updatedAt: activeVersion || undefined,
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
  }

  function validateDraft() {
    const error = invoiceValidation(invoice, party, rows);
    if (error) setMessage(error);
    return !error;
  }

  async function downloadInvoice() {
    if (!validateDraft()) return;
    setPdfBusy(true);
    try {
      const blob = await buildInvoicePdf(currentTransaction());
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tax-invoice-${(invoice.invoiceNo || "draft").replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Tax invoice PDF downloaded.");
    } catch {
      setMessage("Unable to generate the invoice. Please try again.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function previewInvoice() {
    if (!validateDraft()) return;
    setPdfBusy(true);
    try {
      const blob = await buildInvoicePdf(currentTransaction());
      setPreviewFileName(`tax-invoice-${invoice.invoiceNo.replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      setMessage("Unable to generate the invoice. Please try again.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function addInvoiceAttachments(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    setIsAttaching(true);
    try {
      if (attachments.length + files.length > 20) throw new Error("An invoice can have up to 20 attachments.");
      if ([...attachments, ...files].reduce((sum, file) => sum + (file.size || 0), 0) > 10 * 1024 * 1024) throw new Error("Invoice attachments must total 10 MB or less.");
      const added = await Promise.all(files.map(invoiceAttachment));
      setAttachments((current) => [...current, ...added]);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsAttaching(false);
    }
  }

  async function viewSavedDocument(document) {
    setPdfBusy(true);
    try {
      const blob = await invoiceFile(document.fileUrl);
      if (document.mimeType === "application/pdf") {
        setPreviewFileName(document.fileName);
        setPreviewUrl(URL.createObjectURL(blob));
      } else downloadInvoiceBlob(blob, document.fileName);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPdfBusy(false);
    }
  }

  function loadMeghaReference() {
    setActiveSaleId(null);
    setEditingLocalInvoiceNo("");
    setActiveVersion("");
    setAttachments([]);
    setShowShippingAddress(false);
    setParty({ ...meghaInvoiceParty });
    setInvoice({
      branchId: defaultInvoiceBranchId,
      mode: "Credit", invoiceNo: "053TTPL2627", invoiceDate: "2026-10-06",
      poNo: "", poDate: "", state: "Karnataka", copies: "Original", tax: "GST@18%",
      tds: "NONE (0%)", received: false, receivedAmount: "", roundOff: true,
      paymentTerms: "MSME within 45 days from date of invoice",
      signatoryName: "Amrutha DR", notes: "", deliveryTerms: "", deliveryNote: ""
    });
    setRows([{ id: Date.now(), item: "Contract staffing", hsn: "998513",
      description: "Incentive for employees TT_1 & TT_4 as per attached email, service fee @6%",
      details: "", qty: "1", unit: "NONE", price: "2110", tax: "Select" }]);
    setAttachedImage("");
    setAttachedDocument("");
    setMessage("");
  }

  async function buildInvoicePdf(transaction, documentType = "Tax Invoice") {
    const snapshot = getTransactionSnapshot(transaction);
    const { createInvoicePdf } = await import("@/lib/invoice-pdf");
    return createInvoicePdf({ invoice: snapshot.invoice, party: snapshot.party, rows: snapshot.rows, documentType });
  }

  function getTransactionSnapshot(transaction) {
    const snapshotInvoice = transaction.invoiceData || {
      branchId: defaultInvoiceBranchId,
      mode: transaction.paymentType || "Cash",
      invoiceNo: transaction.invoiceNo,
      invoiceDate: parseDisplayDate(transaction.date),
      poNo: "",
      poDate: "",
      state: "",
      copies: "Original",
      tax: "GST@18%",
      tds: "NONE (0%)",
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
    return {
      invoice: snapshotInvoice,
      party: snapshotParty,
      rows: snapshotRows,
      totals: calculateInvoice(snapshotInvoice, snapshotRows, snapshotParty)
    };
  }

  async function openInvoiceDocument(transaction, documentType, { print = false } = {}) {
    const popup = window.open("", "_blank", "width=980,height=800");
    if (!popup) {
      setMessage("Allow popups for this site to open the invoice.");
      return;
    }
    try {
      const blob = transaction.pdfUrl ? await invoiceFile(transaction.pdfUrl) : await buildInvoicePdf(transaction, documentType);
      const url = URL.createObjectURL(blob);
      popup.location.replace(url);
      if (print) popup.addEventListener("load", () => popup.print(), { once: true });
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      popup.close();
      setMessage("Unable to generate the invoice. Please try again.");
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

  async function upsertTransaction(transaction) {
    setIsSaving(true);
    try {
      const existing = savedSales.find((sale) => sale.id === transaction.id);
      const saved = await invoiceRequest(existing ? `/api/invoices/${existing.id}` : "/api/invoices", {
        method: existing ? "PATCH" : "POST",
        body: JSON.stringify(transaction)
      });
      if (transaction.invoiceData) confirmSavedInvoice(saved);
      setSavedSales((current) => [saved, ...current.filter((sale) => sale.id !== saved.id)]);
      return saved;
    } catch (error) {
      setMessage(error.message || "The invoice was not saved. Please retry.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTransaction(transaction) {
    setIsSaving(true);
    try {
      await invoiceRequest(`/api/invoices/${transaction.id}`, { method: "DELETE" });
      setSavedSales((current) => current.filter((sale) => sale.id !== transaction.id));
      setMessage(`Invoice ${transaction.invoiceNo} deleted.`);
    } catch (error) {
      setMessage(error.message || "The invoice was not deleted.");
    } finally {
      setIsSaving(false);
    }
  }

  async function shareTransaction(transaction) {
    if (transaction.pendingSync) { setMessage("This invoice has not synced."); return; }
    const shareUrl = `${window.location.origin}/invoices/${encodeURIComponent(transaction.id)}`;
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

  async function markPaymentReceived(transaction) {
    const updated = {
      ...transaction,
      status: "Paid",
      tone: "green",
      balance: formatCurrency(0),
      invoiceData: {
        ...(transaction.invoiceData || getTransactionSnapshot(transaction).invoice),
        tds: normalizeTdsOption(transaction.invoiceData?.tds),
        received: true,
        receivedAmount: String(getTransactionSnapshot(transaction).totals.payable)
      }
    };

    if (await upsertTransaction(updated)) setMessage(`Payment received for invoice ${transaction.invoiceNo}.`);
  }

  async function saveInvoice() {
    if (!validateDraft() || isSaving) return;
    if (savedSales.some((sale) => sale.id !== activeSaleId && sale.invoiceNo === invoice.invoiceNo.trim())) {
      setMessage("This invoice number already exists. Open the saved invoice or choose another number.");
      return;
    }
    const saved = await upsertTransaction({
      ...currentTransaction(),
      invoiceNo: invoice.invoiceNo.trim(),
      updatedAt: activeVersion || undefined,
      attachments
    });
    if (!saved) return;
    if (editingLocalInvoiceNo) {
      setLocalSales((current) => current.filter((sale) => sale.invoiceNo !== editingLocalInvoiceNo));
      try {
        const legacy = JSON.parse(window.localStorage.getItem(savedSalesStorageKey) || "[]");
        window.localStorage.setItem(savedSalesStorageKey, JSON.stringify(legacy.filter((sale) => sale.invoiceNo !== editingLocalInvoiceNo)));
      } catch {}
      setEditingLocalInvoiceNo("");
      setSalesError("");
    }
    setActiveSaleId(saved.id);
    setActiveVersion(saved.updatedAt);
    setAttachments(saved.documents.filter((document) => document.kind !== "Invoice PDF"));
    setMessage(`Invoice ${saved.invoiceNo} and its documents saved.`);
    setView("list");
  }

  async function handleTransactionAction(transaction, action) {
    if (transaction.pendingSync && action !== "View/Edit" && !["Preview", "Open PDF", "Print", "Download PDF"].includes(action)) {
      setMessage("This invoice has not synced.");
      return;
    }

    if (action === "View/Edit") {
      openTransaction(transaction);
      return;
    }

    if (action === "Share") {
      await shareTransaction(transaction);
      return;
    }

    if (action === "Download PDF") {
      if (pdfBusy) return;
      setPdfBusy(true);
      try {
        const blob = transaction.pdfUrl ? await invoiceFile(transaction.pdfUrl) : await buildInvoicePdf(transaction);
        downloadInvoiceBlob(blob, `tax-invoice-${transaction.invoiceNo.replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`);
        setMessage(`Invoice ${transaction.invoiceNo} downloaded.`);
      } catch (error) {
        setMessage(error.message || "Unable to download the invoice. Please try again.");
      } finally {
        setPdfBusy(false);
      }
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
      if (await upsertTransaction(returnRecord)) setMessage(`Invoice ${transaction.invoiceNo} converted to return.`);
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
      if (await upsertTransaction(cancelled)) setMessage(`Invoice ${transaction.invoiceNo} cancelled.`);
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
      if (await upsertTransaction(copy)) setMessage(`Duplicate created for invoice ${transaction.invoiceNo}.`);
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

  const transactions = useMemo(() => {
    const localNumbers = new Set(localSales.map((sale) => sale.invoiceNo));
    return [...localSales, ...savedSales.filter((sale) => !localNumbers.has(sale.invoiceNo))];
  }, [localSales, savedSales]);

  return (
    <SuiteShell
      compactHeader
      eyebrow="Billing & Payments"
      title={view === "editor" ? "Tax Invoice" : "Invoices"}
      primaryHref="/reports"
      primaryLabel="Reports"
      brandEyebrow="Invoice Suite"
      actions={
        view === "editor" ? (
          <button className="ghost-button" aria-label="All invoices" onClick={() => setView("list")} type="button">
            <ArrowLeft size={16} /><span className="invoice-back-label">All invoices</span>
          </button>
        ) : (
          <button className="primary-button" disabled={isSaving} onClick={resetInvoiceDraft} type="button">
            <Plus size={16} />New Invoice
          </button>
        )
      }
    >
      <section className="invoice-suite">
        <div className="invoice-workspace">
          {view === "list" ? (
            <InvoiceTransactions
              transactions={transactions}
              loaded={salesLoaded}
              error={salesError}
              signInRequired={signInRequired}
              message={message}
              busy={isSaving || pdfBusy}
              onDismissMessage={() => setMessage("")}
              onRefresh={() => loadSharedInvoices({ syncLegacy: true })}
              onOpen={openTransaction}
              onAction={handleTransactionAction}
              onNew={resetInvoiceDraft}
            />
          ) : (
            <section className="tax-invoice panel invoice-editor" aria-busy={isSaving}>
              <div className="invoice-editor-heading">
                <div><h3>{activeSaleId ? "Edit tax invoice" : "New tax invoice"}</h3><span>{invoice.invoiceNo || "Draft"} · {party.name || "Customer pending"}</span></div>
                <button className="ghost-button" onClick={loadMeghaReference} type="button"><FileText size={16} />Megha reference</button>
              </div>

              <div className="invoice-supplier">
                <div className="invoice-supplier-details">
                  <strong>{supplier.name}</strong>
                  <span>{supplier.address.replace(/\n/g, " ")}</span>
                  <span>GSTIN: {supplier.gstin} · PAN: {supplier.pan}</span>
                </div>
                <label className="invoice-branch-field"><span>Issuing branch</span>
                  <select aria-label="Issuing branch" value={invoice.branchId || defaultInvoiceBranchId}
                    onChange={(event) => setInvoice((current) => ({ ...current, branchId: event.target.value }))}>
                    {invoiceBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}
                  </select>
                </label>
              </div>

              <div className="invoice-editor-details">
                <section className="invoice-customer-section">
                  <h4>Customer &amp; Billing</h4>
                  <div className="customer-field">
                    <label htmlFor="invoice-customer">Customer *</label>
                    <div className="invoice-customer-search">
                      <input id="invoice-customer" value={party.name || ""} autoComplete="off"
                        onChange={(event) => updatePartyField("name", event.target.value)}
                        onFocus={() => setActivePartySuggestions("name")}
                        onBlur={() => window.setTimeout(() => setActivePartySuggestions(""), 150)}
                        placeholder="Customer name" />
                    </div>
                    {activePartySuggestions === "name" && partySuggestions.length ? (
                      <div className="invoice-suggestion-list">
                        {partySuggestions.map((suggestion) => (
                          <button key={suggestion.id || suggestion.gstin || suggestion.name} type="button"
                            onMouseDown={(event) => event.preventDefault()} onClick={() => applyInvoiceParty(suggestion)}>
                            <strong>{suggestion.name}</strong><span>{suggestion.gstin || suggestion.phone}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="invoice-field-pair">
                    <label><span>Customer GSTIN</span><input maxLength={15} placeholder="Unregistered"
                      value={party.gstin || ""} onChange={(event) => updatePartyField("gstin", event.target.value)} /></label>
                    <label><span>Customer PAN</span><input maxLength={10}
                      value={party.gstin?.slice(2, 12) || party.pan || ""}
                      readOnly={Boolean(party.gstin)}
                      onChange={(event) => setParty((current) => ({ ...current, pan: event.target.value.toUpperCase() }))} /></label>
                  </div>
                  <label><span>Bill to address *</span><textarea aria-label="Billing Address" rows={4} value={party.billing || ""}
                    onChange={(event) => updatePartyField("billing", event.target.value)} /></label>
                  <label className="invoice-check"><input type="checkbox" checked={showShippingAddress || Boolean(party.shipping)}
                    onChange={(event) => { setShowShippingAddress(event.target.checked); if (!event.target.checked) setParty((current) => ({ ...current, shipping: "" })); }} />
                    Different shipping address</label>
                  {showShippingAddress || party.shipping ? <label><span>Ship to address</span><textarea aria-label="Ship to address" rows={3} value={party.shipping || ""}
                    onChange={(event) => updatePartyField("shipping", event.target.value)} /></label> : null}
                </section>

                <section className="invoice-document-section">
                  <h4>Invoice Details</h4>
                  <div className="invoice-field-pair">
                    <label><span>Invoice number *</span><input value={invoice.invoiceNo}
                      onChange={(event) => setInvoice((current) => ({ ...current, invoiceNo: event.target.value }))} /></label>
                    <DateField label="Invoice date *" value={invoice.invoiceDate} onChange={(value) => setInvoice((current) => ({ ...current, invoiceDate: value }))} />
                    <label><span>Purchase order number</span><input value={invoice.poNo}
                      onChange={(event) => setInvoice((current) => ({ ...current, poNo: event.target.value }))} /></label>
                    <DateField label="PO date" value={invoice.poDate} onChange={(value) => setInvoice((current) => ({ ...current, poDate: value }))} />
                    <label><span>Place of supply *</span><select aria-label="Place of supply *" value={invoice.state}
                      onChange={(event) => setInvoice((current) => ({ ...current, state: event.target.value }))}>
                      <option value="Select">Select state</option>{indiaStatesAndUts.map((state) => <option key={state}>{state}</option>)}
                    </select></label>
                    <label><span>Customer state</span><select aria-label="Customer state" value={party.state || "Karnataka"}
                      onChange={(event) => setParty((current) => ({ ...current, state: event.target.value }))}>
                      {indiaStatesAndUts.map((state) => <option key={state}>{state}</option>)}
                    </select></label>
                  </div>
                  <label><span>Payment terms</span><textarea aria-label="Payment terms" rows={2} value={invoice.paymentTerms || ""}
                    onChange={(event) => setInvoice((current) => ({ ...current, paymentTerms: event.target.value }))} /></label>
                </section>
              </div>

              <div className="invoice-items-heading">
                <h4>Services &amp; Items</h4>
                <label><span>Default GST</span><select aria-label="Default GST" value={invoice.tax} onChange={(event) => updateInvoiceTax(event.target.value)}>
                  {invoiceTaxOptions.map((option) => <option key={option}>{option}</option>)}
                </select></label>
              </div>
              <div className="invoice-editor-table-wrap">
                <table className="invoice-editor-table">
                  <colgroup><col style={{ width: 40 }} /><col /><col style={{ width: 85 }} /><col style={{ width: 66 }} />
                    <col style={{ width: 90 }} /><col style={{ width: 105 }} /><col style={{ width: 116 }} /><col style={{ width: 94 }} /><col style={{ width: 110 }} /></colgroup>
                  <thead><tr><th>#</th><th>Service / Description</th><th>HSN/SAC</th><th>Qty</th><th>Unit</th><th>Rate (INR)</th><th>GST</th><th>Tax (INR)</th><th>Amount (INR)</th></tr></thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const item = totals.items[index];
                      return <tr key={row.id}>
                        <td data-label="Row"><div className="invoice-item-index"><span>{index + 1}</span>
                          <button title="Delete item" aria-label={`Delete row ${index + 1}`} disabled={rows.length <= 1}
                            className="invoice-icon-control" type="button" onClick={() => deleteRow(row.id)}><Trash2 size={15} /></button></div></td>
                        <td data-label="Service" className="invoice-service-cell">
                          <input aria-label={`Service ${index + 1}`} placeholder="Service or item name" value={row.item} onChange={(event) => updateRow(row.id, "item", event.target.value)} />
                          <textarea aria-label={`Description ${index + 1}`} placeholder="Description" rows={2} value={row.description || ""}
                            onChange={(event) => updateRow(row.id, "description", event.target.value)} />
                          <input aria-label={`Period or reference ${index + 1}`} placeholder="Period / reference" value={row.details || ""}
                            onChange={(event) => updateRow(row.id, "details", event.target.value)} />
                        </td>
                        <td data-label="HSN/SAC"><input aria-label={`HSN/SAC ${index + 1}`} value={row.hsn || ""} onChange={(event) => updateRow(row.id, "hsn", event.target.value)} /></td>
                        <td data-label="Qty"><input aria-label={`Quantity ${index + 1}`} type="number" min="0.001" step="any" value={row.qty} onChange={(event) => updateRow(row.id, "qty", event.target.value)} /></td>
                        <td data-label="Unit"><select aria-label={`Unit ${index + 1}`} value={row.unit || "NONE"} onChange={(event) => updateRow(row.id, "unit", event.target.value)}>
                          {Array.from(new Set([...unitOptions, row.unit].filter(Boolean))).map((unit) => <option key={unit} value={unit}>{unit === "NONE" ? "-" : unit}</option>)}
                        </select></td>
                        <td data-label="Rate (INR)"><input aria-label={`Rate ${index + 1}`} inputMode="decimal" value={row.price} onChange={(event) => updateRow(row.id, "price", event.target.value)} /></td>
                        <td data-label="GST"><select aria-label={`GST ${index + 1}`} value={row.tax || "Select"} onChange={(event) => updateRow(row.id, "tax", event.target.value)}>
                          <option value="Select">Default</option>{invoiceTaxOptions.map((option) => <option key={option}>{option}</option>)}
                        </select><small>{item.interstate ? "IGST" : "CGST + SGST"} · {Number((item.rate * 100).toFixed(2))}%</small></td>
                        <td data-label="Tax (INR)" className="invoice-number">{money(item.taxAmount)}</td>
                        <td data-label="Amount (INR)" className="invoice-number"><strong>{money(item.amount)}</strong></td>
                      </tr>;
                    })}
                  </tbody>
                  <tfoot><tr><td colSpan={7}>Taxable value</td><td className="invoice-number">{money(totals.tax)}</td><td className="invoice-number">{money(totals.subtotal)}</td></tr></tfoot>
                </table>
              </div>
              <div className="invoice-editor-add">
                <button className="ghost-button" onClick={addRow} type="button"><Plus size={16} />Add item</button>
              </div>

              <div className="invoice-editor-bottom">
                <section className="invoice-payment-section">
                  <h4>Payment &amp; Other Details</h4>
                  <div className="invoice-field-pair">
                    <label><span>Payment method</span><select aria-label="Payment method" value={invoice.mode} onChange={(event) => setInvoice((current) => ({ ...current, mode: event.target.value }))}>
                      {["Credit", "Cash", "UPI", "Bank Transfer"].map((method) => <option key={method}>{method}</option>)}
                    </select></label>
                    <label><span>Copy type</span><select aria-label="Copy type" value={invoice.copies} onChange={(event) => setInvoice((current) => ({ ...current, copies: event.target.value }))}>
                      <option>Original</option><option>Duplicate</option><option>Triplicate</option>
                    </select></label>
                    <label><span>Signatory name</span><input value={invoice.signatoryName || ""} onChange={(event) => setInvoice((current) => ({ ...current, signatoryName: event.target.value }))} /></label>
                    <label><span>Delivery note</span><input value={invoice.deliveryNote || ""} onChange={(event) => setInvoice((current) => ({ ...current, deliveryNote: event.target.value }))} /></label>
                  </div>
                  <label><span>Delivery terms</span><textarea aria-label="Delivery terms" rows={2} value={invoice.deliveryTerms || ""} onChange={(event) => setInvoice((current) => ({ ...current, deliveryTerms: event.target.value }))} /></label>
                  <label><span>Invoice notes</span><textarea aria-label="Invoice notes" rows={3} value={invoice.notes || ""} onChange={(event) => setInvoice((current) => ({ ...current, notes: event.target.value }))} /></label>
                  <div className="invoice-attachments">
                    <div><h4>Invoice Documents</h4><label className="ghost-button invoice-attach-button" title="Attach documents">
                      <Paperclip size={16} /><span>{isAttaching ? "Attaching..." : "Attach files"}</span>
                      <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt" multiple disabled={isSaving || isAttaching} onChange={addInvoiceAttachments} />
                    </label></div>
                    {(savedSales.find((sale) => sale.id === activeSaleId)?.documents || []).filter((document) => document.kind === "Invoice PDF").map((document) =>
                      <div className="invoice-attachment-row" key={document.id}><FileText size={16} /><span>{document.fileName}</span><button className="invoice-icon-control" aria-label="View saved invoice PDF" title="View saved invoice PDF" disabled={pdfBusy} onClick={() => viewSavedDocument(document)} type="button"><Eye size={16} /></button></div>
                    )}
                    {attachments.map((document, index) => <div className="invoice-attachment-row" key={document.id || `${document.fileName}-${index}`}>
                      <FileText size={16} /><span>{document.fileName}</span>
                      {document.fileUrl ? <button className="invoice-icon-control" aria-label={`Open ${document.fileName}`} title="Open document" disabled={pdfBusy} onClick={() => viewSavedDocument(document)} type="button"><Download size={16} /></button> : <small>Pending save</small>}
                      <button className="invoice-icon-control" aria-label={`Remove ${document.fileName}`} title="Remove document" disabled={isSaving} onClick={() => setAttachments((current) => current.filter((_, itemIndex) => index !== itemIndex))} type="button"><X size={15} /></button>
                    </div>)}
                  </div>
                </section>
                <section className="invoice-editor-totals" aria-label="Invoice totals">
                  <h4>Invoice Summary</h4>
                  <div><span>Taxable value</span><strong>{money(totals.subtotal)}</strong></div>
                  {totals.cgst > 0 ? <><div><span>CGST</span><strong>{money(totals.cgst)}</strong></div><div><span>SGST</span><strong>{money(totals.sgst)}</strong></div></> : null}
                  {totals.igst > 0 ? <div><span>IGST</span><strong>{money(totals.igst)}</strong></div> : null}
                  <div><label className="invoice-check"><input type="checkbox" checked={invoice.roundOff !== false}
                    onChange={(event) => setInvoice((current) => ({ ...current, roundOff: event.target.checked }))} />Round off</label><strong>{money(totals.roundOff)}</strong></div>
                  <div className="invoice-grand-total"><span>Invoice total (INR)</span><strong>{money(totals.grand)}</strong></div>
                  <p className="invoice-amount-words">{amountInWords(totals.grand)}</p>
                  <div><label htmlFor="invoice-tds">TDS deduction</label><select id="invoice-tds" value={normalizeTdsOption(invoice.tds)}
                    onChange={(event) => setInvoice((current) => ({ ...current, tds: event.target.value }))}>
                    {invoiceTdsOptions.map((option) => <option key={option}>{option}</option>)}
                  </select><strong>{money(totals.tds)}</strong></div>
                  {totals.tds > 0 ? <div><span>Net payable</span><strong>{money(totals.payable)}</strong></div> : null}
                  <div><label className="invoice-check"><input type="checkbox" checked={Boolean(invoice.received)}
                    onChange={(event) => setInvoice((current) => ({ ...current, received: event.target.checked, receivedAmount: event.target.checked ? String(totals.payable) : "" }))} />Payment received</label>
                    {invoice.received ? <input aria-label="Received amount" inputMode="decimal" value={invoice.receivedAmount || ""}
                      onChange={(event) => setInvoice((current) => ({ ...current, receivedAmount: event.target.value }))} /> : <strong>{money(0)}</strong>}</div>
                  <div className="invoice-balance-total"><span>Balance due (INR)</span><strong>{money(paymentSummary.balance)}</strong></div>
                </section>
              </div>
              <div className="invoice-editor-actions">
                <p role="status">{message}</p>
                <div>
                  <button className="ghost-button" onClick={() => { setMessage(""); setView("list"); }} type="button">Cancel</button>
                  <button className="ghost-button" disabled={pdfBusy} onClick={previewInvoice} type="button"><Eye size={16} />Preview</button>
                  <button className="ghost-button" disabled={pdfBusy} onClick={downloadInvoice} type="button"><Download size={16} />Download Invoice</button>
                  <button className="primary-button" disabled={pdfBusy || isSaving || isAttaching} onClick={saveInvoice} type="button"><Save size={16} />{isSaving ? "Saving..." : "Save Invoice"}</button>
                </div>
              </div>
            </section>
          )}
        </div>
      </section>

      {previewUrl ? <InvoicePdfPreview url={previewUrl} invoiceNo={invoice.invoiceNo} onClose={() => setPreviewUrl("")} onDownload={() => downloadInvoiceBlob(previewUrl, previewFileName)} busy={pdfBusy} /> : null}

      <Modal
        open={partyModalOpen}
        eyebrow="Customer Master"
        title={partyModalMode === "change" ? "Edit Party" : "Add Party"}
        variant="party"
        onClose={() => setPartyModalOpen(false)}
      >
        <div className={`party-modal ${partyModalMode === "change" ? "party-modal-change" : ""}`}>
          <div className="party-top-grid">
            <label className="invoice-suggestion-field">
              <span>Party Name *</span>
              <input
                value={party.name}
                onBlur={() => window.setTimeout(() => setActivePartySuggestions(""), 120)}
                onChange={(event) => updatePartyField("name", event.target.value)}
                onFocus={() => setActivePartySuggestions("name")}
              />
              {activePartySuggestions === "name" && partySuggestions.length ? (
                <div className="invoice-suggestion-list">
                  {partySuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.id || suggestion.name}-${suggestion.gstin || suggestion.phone}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applyInvoiceParty(suggestion)}
                      type="button"
                    >
                      <strong>{suggestion.name}</strong>
                      <span>{suggestion.gstin || suggestion.phone || suggestion.billing}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </label>
            <label className="invoice-suggestion-field">
              <span>GSTIN</span>
              <input
                list="invoice-gstin-options"
                value={party.gstin}
                onBlur={() => window.setTimeout(() => setActivePartySuggestions(""), 120)}
                onChange={(event) => updatePartyField("gstin", event.target.value)}
                onFocus={() => setActivePartySuggestions("gstin")}
              />
              <datalist id="invoice-gstin-options">
                {partyDirectory.filter((record) => record.gstin).map((record) => (
                  <option key={record.gstin} value={record.gstin}>{record.name}</option>
                ))}
              </datalist>
              {activePartySuggestions === "gstin" && gstinSuggestions.length ? (
                <div className="invoice-suggestion-list">
                  {gstinSuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.id || suggestion.name}-${suggestion.gstin}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applyInvoiceParty(suggestion)}
                      type="button"
                    >
                      <strong>{suggestion.gstin}</strong>
                      <span>{suggestion.name} - {suggestion.billing || suggestion.state}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </label>
            <label className="invoice-suggestion-field">
              <span>Phone Number</span>
              <input
                value={party.phone}
                onBlur={() => window.setTimeout(() => setActivePartySuggestions(""), 120)}
                onChange={(event) => updatePartyField("phone", event.target.value)}
                onFocus={() => setActivePartySuggestions("phone")}
              />
              {activePartySuggestions === "phone" && partySuggestions.length ? (
                <div className="invoice-suggestion-list">
                  {partySuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.id || suggestion.name}-${suggestion.phone || suggestion.gstin}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applyInvoiceParty(suggestion)}
                      type="button"
                    >
                      <strong>{suggestion.phone || suggestion.name}</strong>
                      <span>{suggestion.name} - {suggestion.billing || suggestion.gstin}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </label>
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
            <label className="invoice-address-field">
              <span>Billing Address</span>
              <textarea
                value={party.billing}
                onBlur={() => window.setTimeout(() => setActiveAddressField(""), 120)}
                onChange={(event) => updatePartyField("billing", event.target.value)}
                onFocus={() => setActiveAddressField("billing")}
              />
              {activeAddressField === "billing" && getAddressSuggestions("billing").length ? (
                <div className="invoice-suggestion-list invoice-address-suggestions">
                  {getAddressSuggestions("billing").map((suggestion) => (
                    <button
                      key={`${suggestion.source}-${suggestion.address}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applyAddressSuggestion("billing", suggestion.address)}
                      type="button"
                    >
                      <strong>{suggestion.label}</strong>
                      <span>{suggestion.address}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </label>
            <div className="party-stack">
              <span>Shipping Address</span>
              {showShippingAddress ? (
                <label className="invoice-address-field invoice-address-field-plain">
                  <textarea
                    aria-label="New Shipping Address"
                    placeholder="Shipping Address"
                    value={party.shipping}
                    onBlur={() => window.setTimeout(() => setActiveAddressField(""), 120)}
                    onChange={(event) => updatePartyField("shipping", event.target.value)}
                    onFocus={() => setActiveAddressField("shipping")}
                  />
                  {activeAddressField === "shipping" && getAddressSuggestions("shipping").length ? (
                    <div className="invoice-suggestion-list invoice-address-suggestions">
                      {getAddressSuggestions("shipping").map((suggestion) => (
                        <button
                          key={`${suggestion.source}-${suggestion.address}`}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => applyAddressSuggestion("shipping", suggestion.address)}
                          type="button"
                        >
                          <strong>{suggestion.label}</strong>
                          <span>{suggestion.address}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </label>
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
            {partyModalMode === "add" ? <button className="ghost-button" onClick={() => persistInvoiceParty({ resetAfterSave: true })} type="button">Save &amp; New</button> : null}
            <button
              className="primary-button"
              onClick={async () => {
                await persistInvoiceParty();
                setPartyModalOpen(false);
              }}
              type="button"
            >
              {partyModalMode === "change" ? "Update" : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </SuiteShell>
  );
}
