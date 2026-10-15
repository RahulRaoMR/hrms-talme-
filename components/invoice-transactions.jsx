"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowDownLeft, ArrowDownUp, ArrowUp, ArrowUpRight, Ban, ChevronLeft, ChevronRight, CircleCheck, Download, Eye, FileText, Info, LoaderCircle, MoreHorizontal, Paperclip, Pencil, Plus, Printer, RefreshCw, Search, Share2, SlidersHorizontal, Trash2, Wallet, X } from "lucide-react";
import { money } from "@/lib/invoice-model";
import { filterInvoiceList, invoiceAmount, invoiceDate, invoiceListSummary, invoiceSalesSeries, invoiceStatusGroup } from "@/lib/invoice-list";
import "./pages/vms-list.css";

const tabs = [["all", "All invoices"], ["unpaid", "Unpaid"], ["partial", "Part paid"], ["paid", "Paid"], ["other", "Other"]];
const currency = (value) => `\u20b9 ${money(invoiceAmount(value))}`;

function SalesChart({ transactions, available }) {
  const [range, setRange] = useState("month");
  const series = useMemo(() => invoiceSalesSeries(transactions, range), [transactions, range]);
  const width = 700;
  const height = 120;
  const peak = Math.max(...series.buckets.map((bucket) => bucket.total), 1);
  const points = series.buckets.map((bucket, index) => ({ ...bucket, x: 8 + index * 684 / (series.buckets.length - 1), y: 80 - bucket.total / peak * 70 }));
  const line = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const ticks = points.filter((_, index) => index === 0 || index === points.length - 1 || index % (range === "month" ? 7 : range === "year" ? 3 : 1) === 0);
  return <section className="invoice-trend" aria-label="Sales overview">
    <div className="invoice-trend-heading"><span>Sales overview</span><strong>{available ? currency(series.total) : "\u2014"}</strong><small>{series.label}</small></div>
    <div className="invoice-trend-plot">
      <div className="invoice-periods" role="group" aria-label="Sales period">
        {[["month", "This month"], ["year", "This year"], ["years", "5 years"]].map(([value, label]) => <button type="button" key={value} aria-pressed={range === value} onClick={() => setRange(value)}>{label}</button>)}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`Invoiced sales for ${series.label}: ${currency(series.total)}`}>
        {[10, 45, 80].map((y) => <line className="invoice-chart-grid" key={y} x1="8" x2="692" y1={y} y2={y} />)}
        <polygon className="invoice-chart-area" points={`${line} 692,80 8,80`} />
        <polyline className="invoice-chart-stroke" points={line} />
        {ticks.map((point) => <text key={point.label} x={point.x} y="110" textAnchor={point.x === 8 ? "start" : point.x === 692 ? "end" : "middle"}>{point.label}</text>)}
        {points.filter((point) => point.total > 0).map((point) => <circle key={point.label} cx={point.x} cy={point.y} r="3"><title>{point.label}: {currency(point.total)}</title></circle>)}
      </svg>
    </div>
  </section>;
}

function RowMenu({ menu, onClose, onAction }) {
  const ref = useRef(null);
  const { transaction, trigger } = menu;
  const complete = Boolean(transaction.invoiceData);
  const closed = ["Cancelled", "Returned"].includes(transaction.status);
  const actions = [
    ["View/Edit", "Edit invoice", Pencil],
    ...(complete ? [["Open PDF", "Preview PDF", Eye], ["Print", "Print invoice", Printer]] : []),
    ...(!transaction.pendingSync ? [["Share", "Share link", Share2]] : []),
    ...(complete && !closed && !transaction.pendingSync && invoiceAmount(transaction.balance) > 0 ? [["Receive Payment", "Mark as paid", CircleCheck]] : []),
    ...(complete && !closed && !transaction.pendingSync ? [["Cancel Invoice", "Cancel invoice", Ban]] : []),
    ...(!transaction.pendingSync ? [["Delete", "Delete invoice", Trash2]] : [])
  ];
  const bounds = trigger.getBoundingClientRect();
  const menuHeight = actions.length * 38 + 12;
  const left = Math.max(8, Math.min(bounds.right - 220, window.innerWidth - 228));
  const top = bounds.bottom + menuHeight + 8 <= window.innerHeight ? bounds.bottom + 6 : Math.max(8, bounds.top - menuHeight - 6);

  useEffect(() => {
    ref.current?.querySelector("button")?.focus({ preventScroll: true });
    const outside = (event) => { if (!ref.current?.contains(event.target) && !trigger.contains(event.target)) onClose(); };
    const dismiss = () => onClose();
    const scrollOutside = (event) => { if (!ref.current?.contains(event.target)) onClose(); };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", dismiss);
    window.addEventListener("wheel", scrollOutside, { passive: true });
    window.addEventListener("touchmove", scrollOutside, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("wheel", scrollOutside);
      window.removeEventListener("touchmove", scrollOutside);
    };
  }, [onClose, trigger]);

  function keyboard(event) {
    if (event.key === "Escape") { event.preventDefault(); onClose(); trigger.focus(); }
    if (event.key === "Tab") onClose();
    const buttons = [...ref.current.querySelectorAll("button")];
    const index = buttons.indexOf(document.activeElement);
    const next = event.key === "ArrowDown" ? (index + 1) % buttons.length : event.key === "ArrowUp" ? (index - 1 + buttons.length) % buttons.length : event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : -1;
    if (next >= 0) { event.preventDefault(); buttons[next].focus(); }
  }

  return createPortal(<div ref={ref} className="invoice-list-menu" style={{ left, top }} role="menu" aria-label={`Actions for invoice ${transaction.invoiceNo}`} onKeyDown={keyboard}>
    {actions.map(([action, label, Icon]) => <button key={action} type="button" role="menuitem" className={action === "Delete" ? "is-destructive" : ""} onClick={() => {
      onClose(); trigger.focus();
      if (["Delete", "Cancel Invoice", "Receive Payment"].includes(action) && !window.confirm(action === "Delete" ? `Delete invoice ${transaction.invoiceNo} and its documents? This cannot be undone.` : action === "Cancel Invoice" ? `Cancel invoice ${transaction.invoiceNo}?` : `Mark the full outstanding balance of ${currency(transaction.balance)} as received for invoice ${transaction.invoiceNo}?`)) return;
      onAction(transaction, action);
    }}><Icon size={16} /><span>{label}</span></button>)}
  </div>, document.body);
}

export default function InvoiceTransactions({ transactions, loaded, error, signInRequired = false, message, busy, onDismissMessage, onRefresh, onOpen, onAction, onNew }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [customer, setCustomer] = useState("");
  const [owner, setOwner] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("date-desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [menu, setMenu] = useState(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const summary = useMemo(() => invoiceListSummary(transactions), [transactions]);
  const visible = useMemo(() => filterInvoiceList(transactions, { query, status, customer, owner, from, to, sort }), [transactions, query, status, customer, owner, from, to, sort]);
  const customers = useMemo(() => [...new Set(transactions.map((item) => item.party).filter(Boolean))].sort(), [transactions]);
  const owners = useMemo(() => [...new Set(transactions.map((item) => item.createdBy).filter(Boolean))].sort(), [transactions]);
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = visible.slice(start, start + pageSize);
  const filterCount = [customer, owner, from, to].filter(Boolean).length;
  const hasFilters = Boolean(query || status !== "all" || filterCount);
  const datesInvalid = Boolean(from && to && from > to);
  const available = loaded && !(error && !transactions.length);

  useEffect(() => { setPage(1); setMenu(null); }, [query, status, customer, owner, from, to, sort, pageSize]);

  function clearFilters() { setQuery(""); setStatus("all"); setCustomer(""); setOwner(""); setFrom(""); setTo(""); }
  async function refresh() { setRefreshing(true); try { await onRefresh(); } finally { setRefreshing(false); } }
  function sortColumn(field) { setSort(`${field}-${sort === `${field}-desc` ? "asc" : "desc"}`); }
  function sortHeading(label, field) {
    const active = sort.startsWith(`${field}-`);
    const Icon = active ? sort.endsWith("asc") ? ArrowUp : ArrowDown : ArrowDownUp;
    return <th scope="col" aria-sort={active ? sort.endsWith("asc") ? "ascending" : "descending" : "none"}><button type="button" onClick={() => sortColumn(field)}>{label}<Icon size={12} /></button></th>;
  }

  return <section className="invoice-list-page" aria-label="Invoice transactions" aria-busy={!loaded || busy}>
    {error ? <div className="invoice-list-alert" role="alert"><span>{error}</span>{signInRequired ? <a href="/login?next=%2Finvoices">Sign In</a> : <button type="button" onClick={refresh} disabled={refreshing}><RefreshCw size={14} />Retry</button>}</div> : null}
    <div className="invoice-overview-heading"><h2>Overview</h2><span>All time</span></div>
    <div className="invoice-metrics">
      {[
        { label: "Total invoiced", value: currency(summary.invoiced), detail: `${transactions.filter((item) => !item.pendingSync).length} saved invoices`, Icon: FileText, tone: "blue" },
        { label: "Outstanding", value: currency(summary.outstanding), detail: `${summary.customers.size} customers`, Icon: ArrowUpRight, tone: "amber" },
        { label: "Received", value: currency(summary.received), detail: "Payments received", Icon: ArrowDownLeft, tone: "green" },
        { label: "Awaiting payment", value: String(summary.unpaid).padStart(2, "0"), detail: "Invoices with balance due", Icon: Wallet, tone: "neutral" }
      ].map(({ label, value, detail, Icon, tone }) => <article className={`invoice-metric ${tone}`} key={label}><div className="invoice-metric-label"><span>{label}</span><Icon size={17} /></div><strong>{available ? value : "\u2014"}</strong><small>{available ? detail : "\u00a0"}</small></article>)}
    </div>
    <SalesChart transactions={transactions} available={available} />

    <div className="invoice-register-heading"><div><h2>Invoice register</h2><span className="invoice-count">{available ? transactions.length : "\u2014"}</span></div><div className="invoice-register-controls"><button className="invoice-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="invoice-register-filters" onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={16} />Filters{filterCount ? <span>{filterCount}</span> : null}</button><button type="button" className="invoice-tool-button" aria-label="Refresh invoices" title="Refresh invoices" disabled={refreshing || !loaded} onClick={refresh}><RefreshCw size={16} className={refreshing ? "is-spinning" : ""} /></button></div></div>
    <div className="invoice-register-tabs" role="group" aria-label="Payment status">
      {tabs.map(([value, label]) => <button type="button" key={value} aria-pressed={status === value} onClick={() => setStatus(value)}>{label}<span>{!available ? "\u2014" : value === "all" ? transactions.length : transactions.filter((item) => invoiceStatusGroup(item) === value).length}</span></button>)}
    </div>
    <div className="invoice-register-toolbar">
      <div className="invoice-register-search"><Search size={17} /><input aria-label="Search invoices" placeholder="Search invoice, customer or GSTIN..." value={query} onChange={(event) => setQuery(event.target.value)} />{query ? <button type="button" title="Clear search" aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button> : null}</div>
      <select aria-label="Filter by customer" value={customer} onChange={(event) => setCustomer(event.target.value)}><option value="">All customers</option>{customers.map((name) => <option key={name}>{name}</option>)}</select>
      <select aria-label="Sort invoices" value={sort} onChange={(event) => setSort(event.target.value)}>
        <option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="invoice-asc">Invoice number</option><option value="customer-asc">Customer A-Z</option><option value="amount-desc">Highest amount</option><option value="balance-desc">Highest balance</option>
        {["invoice-desc", "customer-desc", "amount-asc", "balance-asc"].includes(sort) ? <option value={sort}>{({ "invoice-desc": "Invoice number Z-A", "customer-desc": "Customer Z-A", "amount-asc": "Lowest amount", "balance-asc": "Lowest balance" })[sort]}</option> : null}
      </select>
    </div>
    {filtersOpen ? <div id="invoice-register-filters" className="invoice-register-filters">
      <label>From date<input type="date" aria-label="From date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></label>
      <label>To date<input type="date" aria-label="To date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></label>
      <label>Created by<select aria-label="Created by" value={owner} onChange={(event) => setOwner(event.target.value)}><option value="">All users</option>{owners.map((name) => <option key={name}>{name}</option>)}</select></label>
      <button className="invoice-clear-filters" type="button" disabled={!hasFilters} onClick={clearFilters}><X size={14} />Clear filters</button>
      {datesInvalid ? <p role="alert">The end date must be on or after the start date.</p> : null}
    </div> : null}
    {hasFilters && !filtersOpen ? <div className="invoice-filter-summary"><span>{visible.length} matching invoices</span><button type="button" onClick={clearFilters}>Clear filters<X size={13} /></button></div> : null}
    {message ? <div className="invoice-register-message" role="status"><Info size={16} /><span>{message}</span><button type="button" aria-label="Dismiss notification" onClick={onDismissMessage}><X size={15} /></button></div> : null}
    <div className="invoice-register-scroll">
      <table className="invoice-register-table">
        <thead><tr>{sortHeading("Invoice", "invoice")}{sortHeading("Customer", "customer")}{sortHeading("Issued", "date")}{sortHeading("Amount", "amount")}{sortHeading("Outstanding", "balance")}<th scope="col">Status</th><th scope="col"><span className="invoice-sr-only">Actions</span></th></tr></thead>
        <tbody>
          {!pageRows.length ? <tr><td colSpan={7} className="invoice-register-empty">{!loaded ? <><LoaderCircle className="is-spinning" size={26} /><strong>Loading invoices...</strong></> : <><FileText size={30} /><strong>{signInRequired ? "Sign in to view the shared invoices" : error ? "Invoices unavailable" : hasFilters ? "No matching invoices" : "No invoices yet"}</strong>{signInRequired ? <a href="/login?next=%2Finvoices">Sign In</a> : hasFilters ? <button type="button" onClick={clearFilters}>Clear filters</button> : !error ? <button type="button" onClick={onNew}><Plus size={15} />New invoice</button> : null}</>}</td></tr> : null}
          {pageRows.map((transaction) => {
            const date = invoiceDate(transaction);
            const files = transaction.documents?.filter((document) => document.kind !== "Invoice PDF").length || 0;
            const group = invoiceStatusGroup(transaction);
            return <tr key={transaction.id}>
              <td className="invoice-register-number"><button type="button" disabled={busy} onClick={() => onOpen(transaction)}>{transaction.invoiceNo || "Draft"}</button><small>{transaction.transaction || "Sale"}{files ? <button type="button" disabled={busy} title={`${files} attached documents`} aria-label={`View ${files} documents for invoice ${transaction.invoiceNo}`} onClick={() => onOpen(transaction)}><Paperclip size={12} />{files}</button> : null}</small></td>
              <td className="invoice-register-customer"><strong>{transaction.party || "Customer pending"}</strong><small title={transaction.createdBy || ""}>{transaction.partyData?.gstin || transaction.createdBy || transaction.paymentType || "Credit"}</small></td>
              <td className="invoice-register-date">{date ? <time dateTime={transaction.invoiceData?.invoiceDate || undefined}>{date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</time> : transaction.date || "Not dated"}</td>
              <td className="invoice-register-amount" data-label="Amount">{currency(transaction.amount)}</td>
              <td className="invoice-register-balance" data-label="Outstanding">{currency(transaction.balance)}</td>
              <td className="invoice-register-status"><span className={`invoice-payment-status ${group}`}><i aria-hidden="true" />{transaction.pendingSync ? "Not synced" : transaction.status || "Unpaid"}</span></td>
              <td className="invoice-register-actions"><div>
                <button type="button" className="invoice-tool-button" title="Preview invoice PDF" aria-label={`Preview invoice ${transaction.invoiceNo}`} disabled={!transaction.invoiceData || busy} onClick={() => onAction(transaction, "Open PDF")}><Eye size={16} /></button>
                <button type="button" className="invoice-tool-button" title="Download invoice PDF" aria-label={`Download invoice ${transaction.invoiceNo}`} disabled={!transaction.invoiceData || busy} onClick={() => onAction(transaction, "Download PDF")}><Download size={16} /></button>
                <button type="button" className="invoice-tool-button" title="More actions" aria-label={`More actions for invoice ${transaction.invoiceNo}`} aria-haspopup="menu" aria-expanded={menu?.transaction.id === transaction.id} disabled={busy} onClick={(event) => setMenu(menu?.transaction.id === transaction.id ? null : { transaction, trigger: event.currentTarget })}><MoreHorizontal size={17} /></button>
              </div></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    <footer className="invoice-register-footer"><span aria-live="polite">{!available ? signInRequired ? "Sign in to load invoices" : "Invoices not loaded" : visible.length ? `${start + 1}-${Math.min(start + pageSize, visible.length)} of ${visible.length} invoices` : "0 invoices"}</span><div><label>Rows<select aria-label="Invoices per page" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>{[10, 25, 50].map((size) => <option key={size}>{size}</option>)}</select></label><span>{currentPage} / {pages}</span><button type="button" title="Previous page" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={17} /></button><button type="button" title="Next page" aria-label="Next page" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={17} /></button></div></footer>
    {menu ? <RowMenu menu={menu} onClose={closeMenu} onAction={onAction} /> : null}
  </section>;
}
