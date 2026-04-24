"use client";

import { useState, useTransition } from "react";
import {
  createVendorWorkerAction,
  deleteVendorWorkerAction,
  updateVendorWorkerAction
} from "@/app/actions";
import Modal from "@/components/modal";
import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";

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
  const [workers, setWorkers] = useState(data.workers);
  const [vendors] = useState(data.vendors);
  const [invoices] = useState(data.invoices);
  const [modalOpen, setModalOpen] = useState(false);
  const [editState, setEditState] = useState(null);
  const [formState, setFormState] = useState(workerSeed);
  const [isPending, startTransition] = useTransition();

  return (
    <SuiteShell
      eyebrow="Vendor Portal"
      title="Registration, Worker Uploads, Invoices, and Payment Tracking"
      primaryHref="/notifications"
      primaryLabel="Open Alerts"
      brandEyebrow="Supplier Suite"
      actions={
        <button className="ghost-button" onClick={() => setModalOpen(true)} type="button">
          Add Worker
        </button>
      }
    >
      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Vendor Profile</p>
              <h3>Supplier onboarding status</h3>
            </div>
          </div>
          <div className="doc-stack">
            {vendors.map((vendor) => (
              <div className="doc-line" key={vendor.id}>
                <span>{vendor.vendor} - {vendor.category}</span>
                <strong>{vendor.status}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Worker Management</p>
              <h3>Contract workforce</h3>
            </div>
          </div>
          <table className="data-table">
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
              {workers.map((worker) => (
                <tr key={worker.id}>
                  <td>{worker.workerId}</td>
                  <td>{worker.name}</td>
                  <td>{worker.site}</td>
                  <td>{worker.wageRate}</td>
                  <td><StatusBadge tone={worker.tone}>{worker.status}</StatusBadge></td>
                  <td>
                    <div className="row-actions">
                      <button className="mini-button" onClick={() => setEditState(worker)} type="button">
                        Edit
                      </button>
                      <button
                        className="mini-button danger-button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            await deleteVendorWorkerAction(worker.id);
                            setWorkers((current) => current.filter((item) => item.id !== worker.id));
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
              href={`/api/pdf/invoice?vendor=${encodeURIComponent(invoices[0].vendor)}&invoiceNo=${encodeURIComponent(invoices[0].invoiceNo)}&amount=${encodeURIComponent(invoices[0].amount)}&status=${encodeURIComponent(invoices[0].status)}`}
              target="_blank"
              rel="noreferrer"
            >
              Export Invoice PDF
            </a>
          ) : null}
        </div>
        <table className="data-table">
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
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.vendor}</td>
                <td>{invoice.invoiceNo}</td>
                <td>{invoice.attendance}</td>
                <td>{invoice.amount}</td>
                <td><StatusBadge tone={invoice.tone}>{invoice.status}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <EntityModal
        open={modalOpen}
        title="Create Vendor Worker"
        state={formState}
        setState={setFormState}
        isPending={isPending}
        onClose={() => setModalOpen(false)}
        onSubmit={() =>
          startTransition(async () => {
            const created = await createVendorWorkerAction(formState);
            setWorkers((current) => [created, ...current]);
            setModalOpen(false);
          })
        }
      />

      <EntityModal
        open={!!editState}
        title="Update Vendor Worker"
        state={editState}
        setState={setEditState}
        isPending={isPending}
        onClose={() => setEditState(null)}
        onSubmit={() =>
          startTransition(async () => {
            const updated = await updateVendorWorkerAction(editState.id, editState);
            setWorkers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setEditState(null);
          })
        }
      />
    </SuiteShell>
  );
}

function EntityModal({ open, title, state, setState, onSubmit, onClose, isPending }) {
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
        </form>
      ) : null}
    </Modal>
  );
}
