"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  approveCandidateAction,
  bulkDeleteCandidatesAction,
  createCandidateAction,
  deleteCandidateAction,
  importCandidatesAction,
  updateCandidateAction
} from "@/app/actions";
import CsvActions from "@/components/csv-actions";
import Drawer from "@/components/drawer";
import FilterChips from "@/components/filter-chips";
import Modal from "@/components/modal";
import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";
import { demoSeed, storeKeys } from "@/lib/demo-data";
import { useDemoStore } from "@/lib/use-demo-store";

export default function AtsPageClient() {
  const { items: candidates, prepend, reload, replace, remove } = useDemoStore(
    storeKeys.candidates,
    demoSeed.candidates,
    "/api/candidates"
  );
  const [sourceFilter, setSourceFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "name", direction: "asc" });
  const [selectedIds, setSelectedIds] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState({
    name: "Asha Verma",
    role: "Talent Specialist",
    stage: "Screening",
    source: "Direct ATS"
  });
  const [editState, setEditState] = useState(null);

  const normalizedCandidates = useMemo(
    () =>
      candidates.map((candidate) => ({
        ...candidate,
        label: candidate.label || candidate.status,
        tone: candidate.tone || "slate"
      })),
    [candidates]
  );

  const filteredCandidates = useMemo(() => {
    const filtered = normalizedCandidates.filter((candidate) => {
      const matchesSource = sourceFilter === "All" || candidate.source === sourceFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        candidate.name.toLowerCase().includes(q) ||
        candidate.role.toLowerCase().includes(q) ||
        candidate.stage.toLowerCase().includes(q);
      return matchesSource && matchesQuery;
    });

    return filtered.sort((a, b) => {
      const aValue = String(a[sort.key] || "").toLowerCase();
      const bValue = String(b[sort.key] || "").toLowerCase();
      return sort.direction === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }, [normalizedCandidates, query, sort, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / 5));
  const pagedCandidates = filteredCandidates.slice((page - 1) * 5, page * 5);
  const pagedIds = pagedCandidates.map((candidate) => candidate.id);

  const toggleSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  };

  return (
    <SuiteShell
      eyebrow="ATS Module"
      title="Recruitment Command Center"
      primaryHref="/hrms"
      primaryLabel="Go To HRMS"
      actions={
        <button
          className="ghost-button"
          onClick={() => setDrawerOpen(true)}
          type="button"
        >
          Pipeline Insight
        </button>
      }
      brandEyebrow="ATS Suite"
    >
      <section className="page-section split-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Pipeline</p>
              <h3>Hiring flow</h3>
            </div>
            <button className="mini-button" onClick={() => setModalOpen(true)} type="button">
              Add Candidate
            </button>
          </div>
          <div className="flow-grid">
            <div className="flow-card"><strong>Requisition</strong><small>Plant HR Manager</small></div>
            <div className="flow-card"><strong>Sourcing</strong><small>64 profiles</small></div>
            <div className="flow-card"><strong>Interview</strong><small>12 scheduled</small></div>
            <div className="flow-card"><strong>Offer</strong><small>4 released</small></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Requisition Brief</p>
              <h3>Current role</h3>
            </div>
          </div>
          <div className="form-grid">
            <label><span>Business Unit</span><input defaultValue="Manufacturing HR" /></label>
            <label><span>Location</span><input defaultValue="Pune Plant" /></label>
            <label><span>Role Type</span><input defaultValue="Manager" /></label>
            <label><span>Hiring SLA</span><input defaultValue="21 Days" /></label>
          </div>
        </article>
      </section>

      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Candidate Shortlist</p>
            <h3>Source-aware review</h3>
          </div>
        </div>
        <div className="table-toolbar">
          <FilterChips
            options={["All", "Direct ATS", "Staffing Vendor", "Referral"]}
            value={sourceFilter}
            onChange={(value) => {
              setSourceFilter(value);
              setPage(1);
            }}
          />
          <input
            className="search-input"
            placeholder="Search candidate, role, or stage"
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
                await bulkDeleteCandidatesAction(selectedIds);
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
            filename="talme-candidates.csv"
            rows={filteredCandidates}
            columns={[
              { key: "name", label: "Name" },
              { key: "role", label: "Role" },
              { key: "stage", label: "Stage" },
              { key: "source", label: "Source" },
              { key: "label", label: "Status" }
            ]}
            sample={"Asha Verma,Talent Specialist,Screening,Direct ATS,Imported"}
            onImport={importCandidatesAction}
            onImported={reload}
          />
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <input
                  aria-label="Select visible candidates"
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
              <th><button className="table-sort" onClick={() => toggleSort("name")} type="button">Name</button></th>
              <th><button className="table-sort" onClick={() => toggleSort("role")} type="button">Role</button></th>
              <th><button className="table-sort" onClick={() => toggleSort("stage")} type="button">Stage</button></th>
              <th><button className="table-sort" onClick={() => toggleSort("source")} type="button">Source</button></th>
              <th><button className="table-sort" onClick={() => toggleSort("label")} type="button">Decision</button></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedCandidates.map((candidate) => (
              <tr key={candidate.id || `${candidate.name}-${candidate.role}`}>
                <td>
                  <input
                    aria-label={`Select ${candidate.name}`}
                    checked={selectedIds.includes(candidate.id)}
                    onChange={(event) =>
                      setSelectedIds((current) =>
                        event.target.checked
                          ? [...current, candidate.id]
                          : current.filter((id) => id !== candidate.id)
                      )
                    }
                    type="checkbox"
                  />
                </td>
                <td>{candidate.name}</td>
                <td>{candidate.role}</td>
                <td>{candidate.stage}</td>
                <td>{candidate.source}</td>
                <td>
                  <StatusBadge tone={candidate.tone}>{candidate.label}</StatusBadge>
                </td>
                <td>
                  <div className="row-actions">
                    <Link className="mini-button" href={`/candidates/${candidate.id}`}>
                      View
                    </Link>
                    <button
                      className="mini-button"
                      onClick={() => {
                        setEditState(candidate);
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
                          const approved = await approveCandidateAction(candidate.id);
                          replace(candidate.id, approved);
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
                          await deleteCandidateAction(candidate.id);
                          remove(candidate.id);
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
            Showing {pagedCandidates.length} of {filteredCandidates.length} candidates
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

      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Interview Cadence</p>
              <h3>Structured process</h3>
            </div>
          </div>
          <div className="card-stack">
            <div className="process-card"><strong>Screening</strong><small>TA review and score capture</small></div>
            <div className="process-card"><strong>Business Round</strong><small>Plant and HR leadership</small></div>
            <div className="process-card"><strong>Final Approval</strong><small>Offer and onboarding release</small></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">ATS Outcomes</p>
              <h3>Premium visibility</h3>
            </div>
          </div>
          <div className="signal-row">
            <span className="teal">Time-to-hire improving</span>
            <span>Vendor-sourced roles stable</span>
            <span className="gold">2 final approvals pending</span>
          </div>
        </article>
      </section>

      <Modal
        open={modalOpen}
        eyebrow="Create Candidate"
        title="Add to ATS Pipeline"
        onClose={() => setModalOpen(false)}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const created = await createCandidateAction({
                ...formState,
                status: "New",
                tone: "gold"
              });
              prepend(created);
              await reload();
              setModalOpen(false);
              setSourceFilter("All");
            });
          }}
        >
          <div className="form-grid">
            <label>
              <span>Name</span>
              <input
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Role</span>
              <input
                value={formState.role}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, role: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Stage</span>
              <input
                value={formState.stage}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, stage: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Source</span>
              <input
                value={formState.source}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, source: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="modal-actions">
            <button className="ghost-button" onClick={() => setModalOpen(false)} type="button">
              Cancel
            </button>
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? "Saving..." : "Save Candidate"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={editModalOpen && !!editState}
        eyebrow="Update Candidate"
        title="Edit ATS Record"
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
                const updated = await updateCandidateAction(editState.id, {
                  name: editState.name,
                  role: editState.role,
                  stage: editState.stage,
                  source: editState.source,
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
                <span>Name</span>
                <input
                  value={editState.name}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Role</span>
                <input
                  value={editState.role}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, role: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Stage</span>
                <input
                  value={editState.stage}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, stage: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Source</span>
                <input
                  value={editState.source}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, source: event.target.value }))
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
                {isPending ? "Updating..." : "Update Candidate"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Drawer
        open={drawerOpen}
        eyebrow="ATS Insight"
        title="Pipeline Readout"
        onClose={() => setDrawerOpen(false)}
      >
        <div className="process-card">
          <strong>Requisition Pressure</strong>
          <small>Security and workforce operations roles are the fastest-moving openings.</small>
        </div>
        <div className="process-card">
          <strong>Source Mix</strong>
          <small>Direct ATS is strongest for corporate hiring; vendors are stronger for field roles.</small>
        </div>
        <div className="process-card">
          <strong>Offer Risk</strong>
          <small>2 final approvals are still waiting on compensation sign-off.</small>
        </div>
      </Drawer>
    </SuiteShell>
  );
}
