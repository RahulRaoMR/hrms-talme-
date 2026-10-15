"use client";

import CoreTable from "@/components/core-table";

import CoreActionLabel from "@/components/core-action-label";

import { useState, useTransition } from "react";
import {
  createVendorWorkerAction,
  deleteVendorWorkerAction,
  updateVendorWorkerAction
} from "@/lib/api-actions";
import Modal from "@/components/modal";
import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";
import { apiUrl } from "@/lib/api-client";

const workerSeed = {
  workerId: "VW-9001",
  name: "Omkar Jadhav",
  vendor: "StaffCore India",
  site: "Pune Plant",
  skill: "Forklift Operator",
  wageRate: "INR 980/day",
  attendance: "22/26",
  status: "Active",
  tone: "teal"
};

export default function VendorPortalPageClient({ data }) {
  const [workers, setWorkers] = useState(Array.isArray(data.workers) ? data.workers : []);
  const [vendors] = useState(Array.isArray(data.vendors) ? data.vendors : []);
  const [invoices] = useState(Array.isArray(data.invoices) ? data.invoices : []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editState, setEditState] = useState(null);
  const [formState, setFormState] = useState(workerSeed);
  const [actionError, setActionError] = useState(data.loadError || "");
  const [isPending, startTransition] = useTransition();

  function runWorkerAction(action) {
    setActionError("");
    startTransition(() => {
      action().catch((error) => {
        setActionError(error?.message || "Unable to save worker changes.");
      });
    });
  }

  return (
    <SuiteShell
      eyebrow="Vendor Portal"
      title="Vendor Portal"
      primaryHref="/notifications"
      primaryLabel="Open Alerts"
      brandEyebrow="Supplier Suite"
      actions={
        <button
          className="ghost-button"
          onClick={() => {
            setActionError("");
            setFormState(workerSeed);
            setModalOpen(true);
          }}
          type="button"
        >
          <CoreActionLabel label="Add Worker" />
        </button>
      }
    >
      {actionError ? <p className="form-error">{actionError}</p> : null}

      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Vendor Profile</p>
              <h3>Supplier onboarding status</h3>
            </div>
          </div>
          <div className="doc-stack">
            {vendors.length ? vendors.map((vendor) => (
              <div className="doc-line" key={vendor.id}>
                <span>{vendor.vendor} - {vendor.category}</span>
                <strong>{vendor.status || vendor.label || "Not added"}</strong>
              </div>
            )) : <div className="doc-line"><span>Vendor profiles</span><strong>Not added</strong></div>}
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Worker Management</p>
              <h3>Contract workforce</h3>
            </div>
          </div>
          <CoreTable className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Worker</th>
                <th>Site</th>
                <th>Rate</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workers.length ? workers.map((worker) => (
                <tr key={worker.id}>
                  <td>{worker.workerId}</td>
                  <td>{worker.name}</td>
                  <td>{worker.site}</td>
                  <td>{worker.wageRate}</td>
                  <td><StatusBadge tone={worker.tone}>{worker.status}</StatusBadge></td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="mini-button"
                        onClick={() => {
                          setActionError("");
                          setEditState(worker);
                        }}
                        type="button"
                      >
                        <CoreActionLabel label="Edit" />
                      </button>
                      <button
                        className="mini-button danger-button"
                        disabled={isPending}
                        onClick={() =>
                          runWorkerAction(async () => {
                            await deleteVendorWorkerAction(worker.id);
                            setWorkers((current) => current.filter((item) => item.id !== worker.id));
                          })
                        }
                        type="button"
                      >
                        <CoreActionLabel label="Delete" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6}>No workers found.</td>
                </tr>
              )}
            </tbody>
          </CoreTable>
        </article>
      </section>

      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Invoice and Payment</p>
            <h3>Track payment status</h3>
          </div>
        </div>
        <div className="landing-actions">
          {invoices[0] ? (
            <a
              className="primary-button"
              href={apiUrl(`/api/pdf/invoice?vendor=${encodeURIComponent(invoices[0].vendor)}&invoiceNo=${encodeURIComponent(invoices[0].invoiceNo)}&amount=${encodeURIComponent(invoices[0].amount)}&status=${encodeURIComponent(invoices[0].status)}`)}
              target="_blank"
              rel="noreferrer"
            >
              Export Invoice PDF
            </a>
          ) : null}
        </div>
        <CoreTable className="data-table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Invoice</th>
              <th>Attendance</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length ? invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.vendor}</td>
                <td>{invoice.invoiceNo}</td>
                <td>{invoice.attendance}</td>
                <td>{invoice.amount}</td>
                <td><StatusBadge tone={invoice.tone}>{invoice.status}</StatusBadge></td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5}>No invoices found.</td>
              </tr>
            )}
          </tbody>
        </CoreTable>
      </section>

      <EntityModal
        open={modalOpen}
        title="Create Vendor Worker"
        state={formState}
        setState={setFormState}
        error={actionError}
        isPending={isPending}
        onClose={() => setModalOpen(false)}
        onSubmit={() =>
          runWorkerAction(async () => {
            const created = await createVendorWorkerAction(formState);
            setWorkers((current) => [created, ...current]);
            setFormState(workerSeed);
            setModalOpen(false);
          })
        }
      />

      <EntityModal
        open={!!editState}
        title="Update Vendor Worker"
        state={editState}
        setState={setEditState}
        error={actionError}
        isPending={isPending}
        onClose={() => setEditState(null)}
        onSubmit={() =>
          runWorkerAction(async () => {
            const updated = await updateVendorWorkerAction(editState.id, editState);
            setWorkers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setEditState(null);
          })
        }
      />
    </SuiteShell>
  );
}

function EntityModal({ open, title, state, setState, onSubmit, onClose, isPending, error }) {
  return (
    <Modal open={open} eyebrow="Vendor Portal" title={title} onClose={onClose}>
      {state ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="form-grid">
            {[
              ["workerId", "Worker ID"],
              ["name", "Name"],
              ["vendor", "Vendor"],
              ["site", "Site"],
              ["skill", "Skill"],
              ["wageRate", "Wage Rate"],
              ["attendance", "Attendance"],
              ["status", "Status"],
              ["tone", "Tone"]
            ].map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <input
                  value={state[key] ?? ""}
                  onChange={(event) =>
                    setState((current) => ({ ...current, [key]: event.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="modal-actions">
            <button className="ghost-button" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? "Saving..." : "Save Worker"}
            </button>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
        </form>
      ) : null}
    </Modal>
  );
}
