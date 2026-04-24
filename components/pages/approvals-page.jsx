"use client";

import { useState, useTransition } from "react";
import {
  createApprovalItemAction,
  deleteApprovalItemAction,
  updateApprovalItemAction
} from "@/app/actions";
import Modal from "@/components/modal";
import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";

const approvalSeed = {
  module: "Payroll",
  title: "Salary Release Approval",
  owner: "May Payroll",
  amount: "INR 1.96 Cr",
  level: "Finance",
  status: "Pending",
  tone: "gold"
};

export default function ApprovalsPageClient({ approvals: initialApprovals }) {
  const [approvals, setApprovals] = useState(initialApprovals);
  const [modalOpen, setModalOpen] = useState(false);
  const [editState, setEditState] = useState(null);
  const [formState, setFormState] = useState(approvalSeed);
  const [isPending, startTransition] = useTransition();

  return (
    <SuiteShell
      eyebrow="Approval Inbox"
      title="Cross-Module Approval Command"
      primaryHref="/reports"
      primaryLabel="Open Reports"
      brandEyebrow="Governance Suite"
      actions={
        <button className="ghost-button" onClick={() => setModalOpen(true)} type="button">
          Add Approval
        </button>
      }
    >
      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Unified Queue</p>
            <h3>Leave, payroll, invoice, and vendor approvals</h3>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Module</th>
              <th>Request</th>
              <th>Owner</th>
              <th>Value</th>
              <th>Level</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map((approval) => (
              <tr key={approval.id}>
                <td>{approval.module}</td>
                <td>{approval.title}</td>
                <td>{approval.owner}</td>
                <td>{approval.amount}</td>
                <td>{approval.level}</td>
                <td><StatusBadge tone={approval.tone}>{approval.status}</StatusBadge></td>
                <td>
                  <div className="row-actions">
                    <button className="mini-button" onClick={() => setEditState(approval)} type="button">
                      Edit
                    </button>
                    <button
                      className="mini-button danger-button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await deleteApprovalItemAction(approval.id);
                          setApprovals((current) => current.filter((item) => item.id !== approval.id));
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
      </section>

      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Approval Chain</p>
              <h3>Enterprise sign-off rules</h3>
            </div>
          </div>
          <div className="flow-grid">
            <div className="flow-card"><strong>Manager</strong><small>Employee and leave validation</small></div>
            <div className="flow-card"><strong>Operations</strong><small>Attendance and manpower verification</small></div>
            <div className="flow-card"><strong>Finance</strong><small>Tax, invoice, and payment release</small></div>
            <div className="flow-card"><strong>Admin</strong><small>Policy override and final control</small></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Risk Guardrails</p>
              <h3>Before approval</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>Missing attendance lock</span><strong>Block payroll</strong></div>
            <div className="doc-line"><span>Vendor KYC expired</span><strong>Hold invoice</strong></div>
            <div className="doc-line"><span>Bank details pending</span><strong>Hold salary</strong></div>
          </div>
        </article>
      </section>

      <EntityModal
        open={modalOpen}
        title="Create Approval"
        state={formState}
        setState={setFormState}
        isPending={isPending}
        onClose={() => setModalOpen(false)}
        onSubmit={() =>
          startTransition(async () => {
            const created = await createApprovalItemAction(formState);
            setApprovals((current) => [created, ...current]);
            setModalOpen(false);
          })
        }
      />

      <EntityModal
        open={!!editState}
        title="Update Approval"
        state={editState}
        setState={setEditState}
        isPending={isPending}
        onClose={() => setEditState(null)}
        onSubmit={() =>
          startTransition(async () => {
            const updated = await updateApprovalItemAction(editState.id, editState);
            setApprovals((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setEditState(null);
          })
        }
      />
    </SuiteShell>
  );
}

function EntityModal({ open, title, state, setState, onSubmit, onClose, isPending }) {
  return (
    <Modal open={open} eyebrow="Approval Inbox" title={title} onClose={onClose}>
      {state ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="form-grid">
            {[
              ["module", "Module"],
              ["title", "Title"],
              ["owner", "Owner"],
              ["amount", "Value"],
              ["level", "Level"],
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
              {isPending ? "Saving..." : "Save Approval"}
            </button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
