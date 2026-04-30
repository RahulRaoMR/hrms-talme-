"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  approveInvoiceAction,
  bulkDeleteInvoicesAction,
  createInvoiceAction,
  deleteInvoiceAction,
  importInvoicesAction,
  releasePayrollAction,
  updateInvoiceAction
} from "@/app/actions";
import BarChart from "@/components/bar-chart";
import CsvActions from "@/components/csv-actions";
import FilterChips from "@/components/filter-chips";
import Modal from "@/components/modal";
import EmployeeCtcBreakdownPanel from "@/components/features/payroll/employee-ctc-breakdown-panel";
import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";
import PayrollOverview from "@/components/features/payroll/payroll-overview";
import { demoSeed, payrollChartSets, storeKeys } from "@/lib/demo-data";
import { useDemoStore } from "@/lib/use-demo-store";

export default function PayrollPageClient() {
  const { items: invoices, prepend, reload, replace, remove } = useDemoStore(
    storeKeys.invoices,
    demoSeed.invoices,
    "/api/invoices"
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState("All");
  const [range, setRange] = useState("Monthly");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "vendor", direction: "asc" });
  const [selectedIds, setSelectedIds] = useState([]);
  const [isPending, startTransition] = useTransition();
  const [releaseSummary, setReleaseSummary] = useState(null);
  const [formState, setFormState] = useState({
    vendor: "PrimeServe Infra",
    invoiceNo: "INV-5511",
    attendance: "April locked",
    amount: "INR 11,40,000"
  });
  const [editState, setEditState] = useState(null);

  const normalizedInvoices = useMemo(
    () =>
      invoices.map((invoice) => ({
        ...invoice,
        label: invoice.label || invoice.status,
        tone: invoice.tone || "slate"
      })),
    [invoices]
  );

  const visibleInvoices = useMemo(() => {
    const filtered = normalizedInvoices.filter((invoice) => {
      const matchesFilter = invoiceFilter === "All" || invoice.label === invoiceFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        invoice.vendor.toLowerCase().includes(q) ||
        invoice.invoiceNo.toLowerCase().includes(q) ||
        invoice.amount.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });

    return filtered.sort((a, b) => {
      const aValue = String(a[sort.key] || "").toLowerCase();
      const bValue = String(b[sort.key] || "").toLowerCase();
      return sort.direction === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }, [invoiceFilter, normalizedInvoices, query, sort]);

  const totalPages = Math.max(1, Math.ceil(visibleInvoices.length / 5));
  const pagedInvoices = visibleInvoices.slice((page - 1) * 5, page * 5);
  const pagedIds = pagedInvoices.map((invoice) => invoice.id);
  const toggleSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  };

  const chartSet = payrollChartSets[range];

  return (
    <SuiteShell
      eyebrow="Payroll Module"
      title="Payroll, Payroll Tax, Invoice Control, and Salary Payment"
      primaryHref="/vms"
      primaryLabel="Open VMS"
      brandEyebrow="Payroll Suite"
      actions={
        <div className="row-actions">
          <button className="ghost-button" onClick={() => setModalOpen(true)} type="button">
            Add Invoice
          </button>
          <button
            className="primary-button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await releasePayrollAction();
                setReleaseSummary(result);
              })
            }
            type="button"
          >
            {isPending ? "Releasing..." : "Release Payroll"}
          </button>
        </div>
      }
    >
      <PayrollOverview />
      <EmployeeCtcBreakdownPanel />

      {releaseSummary ? (
        <section className="page-section panel">
          <div className="signal-row">
            <span className="teal">
              {releaseSummary.sent} salary email{releaseSummary.sent === 1 ? "" : "s"} sent
            </span>
            <span>{releaseSummary.eligible} eligible employees</span>
            <span>{releaseSummary.periodLabel}</span>
          </div>
        </section>
      ) : null}

      <section className="page-section split-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Invoice Queue</p>
              <h3>Vendor-linked finance</h3>
            </div>
          </div>
          <div className="table-toolbar">
            <FilterChips
              options={["All", "Approved", "Finance Review", "Pending Docs", "Queued"]}
              value={invoiceFilter}
              onChange={(value) => {
                setInvoiceFilter(value);
                setPage(1);
              }}
            />
            <input
              className="search-input"
              placeholder="Search vendor, invoice, or amount"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
            <button
              className="mini-button danger-button"
              disabled={selectedIds.length === 0 || isPending}
              onClick={() =>
                startTransition(async () => {
                  await bulkDeleteInvoicesAction(selectedIds);
                  selectedIds.forEach((id) => remove(id));
                  setSelectedIds([]);
                  await reload();
                })
              }
              type="button"
            >
              Delete Selected ({selectedIds.length})
            </button>
            <CsvActions
              filename="talme-invoices.csv"
              rows={visibleInvoices}
              columns={[
                { key: "vendor", label: "Vendor" },
                { key: "invoiceNo", label: "Invoice No." },
                { key: "attendance", label: "Attendance" },
                { key: "amount", label: "Amount" },
                { key: "label", label: "Status" }
              ]}
              sample={"PrimeServe Infra,INV-5511,April locked,\"INR 11,40,000\",Queued"}
              onImport={importInvoicesAction}
              onImported={reload}
            />
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <input
                    aria-label="Select visible invoices"
                    checked={pagedIds.length > 0 && pagedIds.every((id) => selectedIds.includes(id))}
                    onChange={(event) =>
                      setSelectedIds((current) =>
                        event.target.checked
                          ? Array.from(new Set([...current, ...pagedIds]))
                          : current.filter((id) => !pagedIds.includes(id))
                      )
                    }
                    type="checkbox"
                  />
                </th>
                <th><button className="table-sort" onClick={() => toggleSort("vendor")} type="button">Vendor</button></th>
                <th><button className="table-sort" onClick={() => toggleSort("invoiceNo")} type="button">Invoice No.</button></th>
                <th><button className="table-sort" onClick={() => toggleSort("attendance")} type="button">Attendance</button></th>
                <th><button className="table-sort" onClick={() => toggleSort("amount")} type="button">Amount</button></th>
                <th><button className="table-sort" onClick={() => toggleSort("label")} type="button">Approval</button></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedInvoices.map((invoice) => (
                <tr key={invoice.id || `${invoice.invoiceNo}-${invoice.vendor}`}>
                  <td>
                    <input
                      aria-label={`Select ${invoice.invoiceNo}`}
                      checked={selectedIds.includes(invoice.id)}
                      onChange={(event) =>
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, invoice.id]
                            : current.filter((id) => id !== invoice.id)
                        )
                      }
                      type="checkbox"
                    />
                  </td>
                  <td>{invoice.vendor}</td>
                  <td>{invoice.invoiceNo}</td>
                  <td>{invoice.attendance}</td>
                  <td>{invoice.amount}</td>
                  <td>
                    <StatusBadge tone={invoice.tone}>{invoice.label}</StatusBadge>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link className="mini-button" href={`/invoices/${invoice.id}`}>
                        View
                      </Link>
                      <button
                        className="mini-button"
                        onClick={() => {
                          setEditState(invoice);
                          setEditModalOpen(true);
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="mini-button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            const approved = await approveInvoiceAction(invoice.id);
                            replace(invoice.id, approved);
                            await reload();
                          })
                        }
                        type="button"
                      >
                        Approve
                      </button>
                      <button
                        className="mini-button danger-button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            await deleteInvoiceAction(invoice.id);
                            remove(invoice.id);
                            await reload();
                          })
                        }
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination-row">
            <span className="pagination-note">
              Showing {pagedInvoices.length} of {visibleInvoices.length} invoices
            </span>
            <div className="row-actions">
              <button
                className="mini-button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                Previous
              </button>
              <span className="page-badge">
                {page} / {totalPages}
              </span>
              <button
                className="mini-button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Aggregator Model</p>
              <h3>Payment management</h3>
            </div>
          </div>
          <div className="flow-grid">
            <div className="flow-card"><strong>Attendance</strong><small>Reconciled</small></div>
            <div className="flow-card"><strong>Invoice</strong><small>Validated</small></div>
            <div className="flow-card"><strong>Statutory Hold</strong><small>Controlled</small></div>
            <div className="flow-card"><strong>Release</strong><small>Salary / Vendor Payment</small></div>
          </div>
        </article>
      </section>

      <section className="page-section panel chart-filter-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Finance View</p>
            <h3>Choose reporting window</h3>
          </div>
        </div>
        <FilterChips options={["Monthly", "Quarterly"]} value={range} onChange={setRange} />
      </section>

      <section className="page-section split-grid">
        <BarChart
          eyebrow="Disbursement Trend"
          title="Monthly salary release confidence"
          summary={chartSet.disbursement.summary}
          items={chartSet.disbursement.items}
        />
        <BarChart
          eyebrow="Invoice Aging"
          title="Finance backlog by bucket"
          summary={chartSet.aging.summary}
          items={chartSet.aging.items}
        />
      </section>

      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Compliance</p>
              <h3>Tax and bank controls</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>PF / ESI Checks</span><strong>Closed</strong></div>
            <div className="doc-line"><span>TDS Validation</span><strong>Closed</strong></div>
            <div className="doc-line"><span>Bank Advice File</span><strong>Pending</strong></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Salary Payment</p>
              <h3>Release readiness</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>Worker Bank Validation</span><strong>98.7%</strong></div>
            <div className="doc-line"><span>Payment Advice</span><strong>Queued</strong></div>
            <div className="doc-line"><span>Post-Payment Reconciliation</span><strong>Scheduled</strong></div>
          </div>
        </article>
      </section>

      <Modal
        open={modalOpen}
        eyebrow="Create Invoice"
        title="Add to Payment Queue"
        onClose={() => setModalOpen(false)}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const created = await createInvoiceAction({
                ...formState,
                status: "Queued",
                tone: "gold"
              });
              prepend(created);
              await reload();
              setModalOpen(false);
            });
          }}
        >
          <div className="form-grid">
            <label>
              <span>Vendor</span>
              <input
                value={formState.vendor}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, vendor: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Invoice No.</span>
              <input
                value={formState.invoiceNo}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, invoiceNo: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Attendance</span>
              <input
                value={formState.attendance}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, attendance: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Amount</span>
              <input
                value={formState.amount}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, amount: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="modal-actions">
            <button className="ghost-button" onClick={() => setModalOpen(false)} type="button">
              Cancel
            </button>
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? "Saving..." : "Save Invoice"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={editModalOpen && !!editState}
        eyebrow="Update Invoice"
        title="Edit Payment Queue Record"
        onClose={() => {
          setEditModalOpen(false);
          setEditState(null);
        }}
      >
        {editState ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const updated = await updateInvoiceAction(editState.id, {
                  vendor: editState.vendor,
                  invoiceNo: editState.invoiceNo,
                  attendance: editState.attendance,
                  amount: editState.amount,
                  status: editState.label,
                  tone: editState.tone
                });
                replace(editState.id, updated);
                await reload();
                setEditModalOpen(false);
                setEditState(null);
              });
            }}
          >
            <div className="form-grid">
              <label>
                <span>Vendor</span>
                <input
                  value={editState.vendor}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, vendor: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Invoice No.</span>
                <input
                  value={editState.invoiceNo}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, invoiceNo: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Attendance</span>
                <input
                  value={editState.attendance}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, attendance: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Amount</span>
                <input
                  value={editState.amount}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, amount: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="ghost-button"
                onClick={() => {
                  setEditModalOpen(false);
                  setEditState(null);
                }}
                type="button"
              >
                Cancel
              </button>
              <button className="primary-button" disabled={isPending} type="submit">
                {isPending ? "Updating..." : "Update Invoice"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </SuiteShell>
  );
}
