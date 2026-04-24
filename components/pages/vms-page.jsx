"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  approveVendorAction,
  bulkDeleteVendorsAction,
  createVendorAction,
  deleteVendorAction,
  importVendorsAction,
  updateVendorAction
} from "@/app/actions";
import CsvActions from "@/components/csv-actions";
import FilterChips from "@/components/filter-chips";
import Modal from "@/components/modal";
import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";
import { demoSeed, storeKeys } from "@/lib/demo-data";
import { useDemoStore } from "@/lib/use-demo-store";

export default function VmsPageClient() {
  const { items: vendors, prepend, reload, replace, remove } = useDemoStore(
    storeKeys.vendors,
    demoSeed.vendors,
    "/api/vendors"
  );
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "vendor", direction: "asc" });
  const [selectedIds, setSelectedIds] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState({
    vendor: "PrimeServe Infra",
    category: "Housekeeping",
    sites: "6",
    rating: "4.3"
  });
  const [editState, setEditState] = useState(null);

  const normalizedVendors = useMemo(
    () =>
      vendors.map((vendor) => ({
        ...vendor,
        label: vendor.label || vendor.status,
        tone: vendor.tone || "slate",
        sites: String(vendor.sites),
        rating: String(vendor.rating)
      })),
    [vendors]
  );

  const filteredVendors = useMemo(() => {
    const filtered = normalizedVendors.filter((vendor) => {
      const matchesCategory = categoryFilter === "All" || vendor.category === categoryFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        vendor.vendor.toLowerCase().includes(q) ||
        vendor.category.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });

    return filtered.sort((a, b) => {
      const aValue = String(a[sort.key] || "").toLowerCase();
      const bValue = String(b[sort.key] || "").toLowerCase();
      return sort.direction === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }, [categoryFilter, normalizedVendors, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredVendors.length / 5));
  const pagedVendors = filteredVendors.slice((page - 1) * 5, page * 5);
  const pagedIds = pagedVendors.map((vendor) => vendor.id);

  const toggleSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  };

  return (
    <SuiteShell
      eyebrow="VMS Module"
      title="Vendor Registration, Search, and Payment Operations"
      primaryHref="/notifications"
      primaryLabel="Open Alerts"
      brandEyebrow="VMS Suite"
      actions={
        <button className="ghost-button" onClick={() => setModalOpen(true)} type="button">
          Add Vendor
        </button>
      }
    >
      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Vendor Registration</p>
              <h3>Corporate onboarding</h3>
            </div>
          </div>
          <div className="form-grid">
            <label><span>Vendor Name</span><input defaultValue="SecureAxis Services" /></label>
            <label><span>Vendor Type</span><input defaultValue="Security Vendor" /></label>
            <label><span>City</span><input defaultValue="Mumbai" /></label>
            <label><span>Compliance</span><input defaultValue="KYC + Statutory Cleared" /></label>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Vendor Model</p>
              <h3>Supply chain categories</h3>
            </div>
          </div>
          <div className="chip-row">
            <span>Staffing Vendor</span>
            <span>Transport Vendor</span>
            <span>Canteen Vendor</span>
            <span>Housekeeping Vendor</span>
            <span>Security Vendor</span>
            <span>Uniform Vendor</span>
            <span>Material Supply</span>
          </div>
        </article>
      </section>

      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Search &amp; Filter</p>
            <h3>Vendor directory</h3>
          </div>
        </div>
        <div className="table-toolbar">
          <FilterChips
            options={["All", "Staffing", "Transport", "Canteen", "Security", "Housekeeping"]}
            value={categoryFilter}
            onChange={(value) => {
              setCategoryFilter(value);
              setPage(1);
            }}
          />
          <input
            className="search-input"
            placeholder="Search vendor or category"
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
                await bulkDeleteVendorsAction(selectedIds);
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
            filename="talme-vendors.csv"
            rows={filteredVendors}
            columns={[
              { key: "vendor", label: "Vendor" },
              { key: "category", label: "Category" },
              { key: "sites", label: "Sites" },
              { key: "rating", label: "Rating" },
              { key: "label", label: "Status" }
            ]}
            sample={"PrimeServe Infra,Housekeeping,6,4.3,Imported"}
            onImport={importVendorsAction}
            onImported={reload}
          />
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <input
                  aria-label="Select visible vendors"
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
              <th><button className="table-sort" onClick={() => toggleSort("category")} type="button">Category</button></th>
              <th><button className="table-sort" onClick={() => toggleSort("sites")} type="button">Sites</button></th>
              <th><button className="table-sort" onClick={() => toggleSort("rating")} type="button">Rating</button></th>
              <th><button className="table-sort" onClick={() => toggleSort("label")} type="button">Status</button></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedVendors.map((vendor) => (
              <tr key={vendor.id || `${vendor.vendor}-${vendor.category}`}>
                <td>
                  <input
                    aria-label={`Select ${vendor.vendor}`}
                    checked={selectedIds.includes(vendor.id)}
                    onChange={(event) =>
                      setSelectedIds((current) =>
                        event.target.checked
                          ? [...current, vendor.id]
                          : current.filter((id) => id !== vendor.id)
                      )
                    }
                    type="checkbox"
                  />
                </td>
                <td>{vendor.vendor}</td>
                <td>{vendor.category}</td>
                <td>{vendor.sites}</td>
                <td>{vendor.rating}</td>
                <td>
                  <StatusBadge tone={vendor.tone}>{vendor.label}</StatusBadge>
                </td>
                <td>
                  <div className="row-actions">
                    <Link className="mini-button" href={`/vendors/${vendor.id}`}>
                      View
                    </Link>
                    <button
                      className="mini-button"
                      onClick={() => {
                        setEditState(vendor);
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
                          const approved = await approveVendorAction(vendor.id);
                          replace(vendor.id, approved);
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
                          await deleteVendorAction(vendor.id);
                          remove(vendor.id);
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
            Showing {pagedVendors.length} of {filteredVendors.length} vendors
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
      </section>

      <section className="page-section split-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Vendor Management Office</p>
              <h3>Governance controls</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>Onboarding Governance</span><strong>Centralized</strong></div>
            <div className="doc-line"><span>Commercial Controls</span><strong>Managed</strong></div>
            <div className="doc-line"><span>SLA Monitoring</span><strong>Live</strong></div>
            <div className="doc-line"><span>Site Escalations</span><strong>Tracked</strong></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Workforce MSP Model</p>
              <h3>Service workflow</h3>
            </div>
          </div>
          <div className="card-stack">
            <div className="process-card"><strong>Demand Intake</strong><small>Business teams raise outsourced staffing needs</small></div>
            <div className="process-card"><strong>Vendor Allocation</strong><small>Preferred vendors receive SLA and requirement</small></div>
            <div className="process-card"><strong>Deployment &amp; Attendance</strong><small>Workers mapped to shifts, attendance, and payout</small></div>
          </div>
        </article>
      </section>

      <Modal
        open={modalOpen}
        eyebrow="Create Vendor"
        title="Add to VMS"
        onClose={() => setModalOpen(false)}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const created = await createVendorAction({
                ...formState,
                status: "New",
                tone: "gold"
              });
              prepend(created);
              await reload();
              setCategoryFilter("All");
              setModalOpen(false);
            });
          }}
        >
          <div className="form-grid">
            <label>
              <span>Vendor Name</span>
              <input
                value={formState.vendor}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, vendor: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Category</span>
              <input
                value={formState.category}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, category: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Sites</span>
              <input
                value={formState.sites}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, sites: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Rating</span>
              <input
                value={formState.rating}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, rating: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="modal-actions">
            <button className="ghost-button" onClick={() => setModalOpen(false)} type="button">
              Cancel
            </button>
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? "Saving..." : "Save Vendor"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={editModalOpen && !!editState}
        eyebrow="Update Vendor"
        title="Edit VMS Record"
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
                const updated = await updateVendorAction(editState.id, {
                  vendor: editState.vendor,
                  category: editState.category,
                  sites: editState.sites,
                  rating: editState.rating,
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
                <span>Vendor Name</span>
                <input
                  value={editState.vendor}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, vendor: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Category</span>
                <input
                  value={editState.category}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, category: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Sites</span>
                <input
                  value={editState.sites}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, sites: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Rating</span>
                <input
                  value={editState.rating}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, rating: event.target.value }))
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
                {isPending ? "Updating..." : "Update Vendor"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </SuiteShell>
  );
}
