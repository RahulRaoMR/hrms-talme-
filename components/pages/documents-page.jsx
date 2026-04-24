"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  createDocumentRecordAction,
  deleteDocumentRecordAction,
  updateDocumentRecordAction
} from "@/app/actions";
import Modal from "@/components/modal";
import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";

const documentSeed = {
  owner: "StaffCore India",
  docType: "MSA Contract",
  module: "Vendor",
  expiry: "Dec 31, 2026",
  status: "Verified",
  tone: "teal"
};

export default function DocumentsPageClient({ data }) {
  const [documents, setDocuments] = useState(data.documents);
  const [assets, setAssets] = useState(data.assets);
  const [modalOpen, setModalOpen] = useState(false);
  const [editState, setEditState] = useState(null);
  const [formState, setFormState] = useState(documentSeed);
  const [uploadState, setUploadState] = useState({
    module: "Employee",
    owner: "Manish Gupta",
    label: "Offer Letter"
  });
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <SuiteShell
      eyebrow="Document Management"
      title="KYC, Contracts, Invoices, and Compliance Vault"
      primaryHref="/settings"
      primaryLabel="Open Settings"
      brandEyebrow="Compliance Suite"
      actions={
        <>
          <label className="ghost-button">
            <input
              hidden
              type="file"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setUploading(true);
                const body = new FormData();
                body.append("file", file);
                body.append("module", uploadState.module);
                body.append("owner", uploadState.owner);
                body.append("label", uploadState.label);
                const response = await fetch("/api/uploads", { method: "POST", body });
                const payload = await response.json();
                setAssets((current) => [payload, ...current]);
                setUploading(false);
                event.target.value = "";
              }}
            />
            {uploading ? "Uploading..." : "Upload File"}
          </label>
          <button className="ghost-button" onClick={() => setModalOpen(true)} type="button">
            Add Document
          </button>
        </>
      }
    >
      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Document Register</p>
            <h3>Expiry-aware compliance control</h3>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Owner</th>
              <th>Document</th>
              <th>Module</th>
              <th>Expiry</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr key={document.id}>
                <td>{document.owner}</td>
                <td>{document.docType}</td>
                <td>{document.module}</td>
                <td>{document.expiry}</td>
                <td><StatusBadge tone={document.tone}>{document.status}</StatusBadge></td>
                <td>
                  <div className="row-actions">
                    <Link className="mini-button" href={`/documents/${document.id}`}>
                      View
                    </Link>
                    <button className="mini-button" onClick={() => setEditState(document)} type="button">
                      Edit
                    </button>
                    <button
                      className="mini-button danger-button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await deleteDocumentRecordAction(document.id);
                          setDocuments((current) => current.filter((item) => item.id !== document.id));
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
              <p className="eyebrow">Upload Categories</p>
              <h3>Premium vault structure</h3>
            </div>
          </div>
          <div className="chip-row">
            <span>Employee KYC</span>
            <span>Vendor Contracts</span>
            <span>PF / ESI Challans</span>
            <span>Invoices</span>
            <span>Payslips</span>
            <span>Bank Advice</span>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Controls</p>
              <h3>Expiry automation</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>30-day expiry alert</span><strong>Enabled</strong></div>
            <div className="doc-line"><span>Invoice release block</span><strong>Enabled</strong></div>
            <div className="doc-line"><span>Audit trail</span><strong>Permanent</strong></div>
          </div>
        </article>
      </section>

      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Uploaded Assets</p>
            <h3>Files across ATS, employee, vendor, and payroll modules</h3>
          </div>
        </div>
        <div className="form-grid">
          <label>
            <span>Module</span>
            <input
              value={uploadState.module}
              onChange={(event) => setUploadState((current) => ({ ...current, module: event.target.value }))}
            />
          </label>
          <label>
            <span>Owner</span>
            <input
              value={uploadState.owner}
              onChange={(event) => setUploadState((current) => ({ ...current, owner: event.target.value }))}
            />
          </label>
          <label>
            <span>Label</span>
            <input
              value={uploadState.label}
              onChange={(event) => setUploadState((current) => ({ ...current, label: event.target.value }))}
            />
          </label>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Module</th>
              <th>Owner</th>
              <th>File</th>
              <th>Type</th>
              <th>Size</th>
              <th>Status</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td>{asset.module}</td>
                <td>{asset.owner}</td>
                <td>{asset.fileName}</td>
                <td>{asset.mimeType}</td>
                <td>{asset.sizeLabel}</td>
                <td>{asset.status}</td>
                <td>
                  <a className="mini-button" href={asset.fileUrl} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <EntityModal
        open={modalOpen}
        title="Create Document"
        state={formState}
        setState={setFormState}
        isPending={isPending}
        onClose={() => setModalOpen(false)}
        onSubmit={() =>
          startTransition(async () => {
            const created = await createDocumentRecordAction(formState);
            setDocuments((current) => [created, ...current]);
            setModalOpen(false);
          })
        }
      />

      <EntityModal
        open={!!editState}
        title="Update Document"
        state={editState}
        setState={setEditState}
        isPending={isPending}
        onClose={() => setEditState(null)}
        onSubmit={() =>
          startTransition(async () => {
            const updated = await updateDocumentRecordAction(editState.id, editState);
            setDocuments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setEditState(null);
          })
        }
      />
    </SuiteShell>
  );
}

function EntityModal({ open, title, state, setState, onSubmit, onClose, isPending }) {
  return (
    <Modal open={open} eyebrow="Document Management" title={title} onClose={onClose}>
      {state ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="form-grid">
            {[
              ["owner", "Owner"],
              ["docType", "Document Type"],
              ["module", "Module"],
              ["expiry", "Expiry"],
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
              {isPending ? "Saving..." : "Save Document"}
            </button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
