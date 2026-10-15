"use client";

import CoreTable from "@/components/core-table";

import CoreActionLabel from "@/components/core-action-label";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  createDocumentRecordAction,
  deleteDocumentRecordAction,
  updateDocumentRecordAction
} from "@/lib/api-actions";
import Modal from "@/components/modal";
import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";
import InvoicePdfPreview from "@/components/invoice-pdf-preview";
import { downloadInvoiceBlob, invoiceFile, invoiceRequest } from "@/lib/invoice-client";
import { apiUrl } from "@/lib/api-client";
import { mergeDocumentRecords, uploadedAssetToDocument } from "@/lib/document-records";

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
  const [loadError, setLoadError] = useState(data.loadError || "");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [previewAsset, setPreviewAsset] = useState(null);
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editState, setEditState] = useState(null);
  const [formState, setFormState] = useState(documentSeed);
  const [uploadState, setUploadState] = useState({
    module: "Employee",
    owner: "",
    label: ""
  });
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function refreshDocuments() {
      try {
        const [nextDocuments, nextAssets, invoiceDocuments] = await Promise.all([
          fetchResourceRows("/api/documents", "documents"),
          fetchResourceRows("/api/uploads", "uploads"),
          invoiceRequest("/api/invoice-documents").catch((error) => { if (error.status === 401 || error.status === 403) return []; throw error; })
        ]);

        if (cancelled) return;

        setAssets([...invoiceDocuments, ...nextAssets]);
        setDocuments(mergeDocumentRecords([...invoiceDocuments, ...nextDocuments], nextAssets));
        setLoadError("");
      } catch (error) {
        console.error("Unable to refresh documents.", error);
        if (!cancelled) setLoadError(error?.message || "Unable to load saved documents.");
      }
    }

    refreshDocuments();
    window.addEventListener("focus", refreshDocuments);
    const timer = window.setInterval(refreshDocuments, 30000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshDocuments);
      window.clearInterval(timer);
    };
  }, [refreshVersion]);

  useEffect(() => () => { if (invoicePreview?.url) URL.revokeObjectURL(invoicePreview.url); }, [invoicePreview]);
  useEffect(() => () => { if (previewAsset?.fileUrl?.startsWith("blob:")) URL.revokeObjectURL(previewAsset.fileUrl); }, [previewAsset]);

  async function openInvoiceDocument(document) {
    try {
      const blob = await invoiceFile(document.fileUrl);
      if (document.mimeType === "application/pdf") setInvoicePreview({ url: URL.createObjectURL(blob), fileName: document.fileName, invoiceNo: document.invoiceNo || document.docType });
      else if (document.mimeType?.startsWith("image/")) setPreviewAsset({ ...document, fileUrl: URL.createObjectURL(blob) });
      else downloadInvoiceBlob(blob, document.fileName);
    } catch (error) {
      setLoadError(error.message);
    }
  }

  return (
    <SuiteShell
      eyebrow="Document Management"
      title="Documents"
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
                try {
                  const body = new FormData();
                  body.append("file", file);
                  body.append("module", uploadState.module);
                  body.append("owner", uploadState.owner);
                  body.append("label", uploadState.label);
                  const response = await fetch(apiUrl("/api/uploads"), { method: "POST", body });
                  const payload = await response.json();

                  if (!response.ok) {
                    throw new Error(payload?.error || "Unable to upload file.");
                  }

                  setAssets((current) => [payload, ...current]);
                  setDocuments((current) => mergeDocumentRecords([uploadedAssetToDocument(payload), ...current], [payload]));
                  event.target.value = "";
                } catch (error) {
                  console.error("Unable to upload document.", error);
                } finally {
                  setUploading(false);
                }
              }}
            />
            {uploading ? "Uploading..." : "Upload File"}
          </label>
          <button className="ghost-button" onClick={() => setModalOpen(true)} type="button">
            <CoreActionLabel label="Add Document" />
          </button>
        </>
      }
    >
      <section className="page-section panel">
        {loadError ? (
          <div role="alert">
            <p className="form-error">{loadError}</p>
            <button className="mini-button" type="button" onClick={() => setRefreshVersion((value) => value + 1)}>Retry</button>
          </div>
        ) : null}
        <div className="panel-head">
          <div>
            <p className="eyebrow">Document Register</p>
            <h3>Expiry-aware compliance control</h3>
          </div>
        </div>
        <CoreTable className="data-table">
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
                    {document.invoiceId ? <>
                      <button className="mini-button" onClick={() => openInvoiceDocument(document)} type="button"><CoreActionLabel label="View" /></button>
                      <Link className="mini-button" href={`/invoices/${document.invoiceId}`}>Open Invoice</Link>
                    </> : <Link className="mini-button" href={`/documents/${document.id}`}>View</Link>}
                    {!document.invoiceId ? <>
                    <button className="mini-button" onClick={() => setEditState(document)} type="button">
                      <CoreActionLabel label="Edit" />
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
                      <CoreActionLabel label="Delete" />
                    </button>
                    </> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </CoreTable>
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
        <CoreTable className="data-table">
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
            {assets.map((asset) => {
              const canPreview = isImageAsset(asset);

              return (
                <tr key={asset.id}>
                  <td>{asset.module}</td>
                  <td>{asset.owner}</td>
                  <td>
                    {asset.invoiceId ? <button className="document-preview-button" onClick={() => openInvoiceDocument(asset)} type="button">{asset.fileName}</button> : canPreview ? (
                      <button className="document-preview-button" onClick={() => setPreviewAsset(asset)} type="button">
                        {asset.fileName}
                      </button>
                    ) : asset.fileName}
                  </td>
                  <td>{asset.mimeType}</td>
                  <td>{asset.sizeLabel}</td>
                  <td>{asset.status}</td>
                  <td>
                    {asset.invoiceId ? (
                      <button className="mini-button" onClick={() => openInvoiceDocument(asset)} type="button">Open</button>
                    ) : canPreview ? (
                      <button className="mini-button" onClick={() => setPreviewAsset(asset)} type="button">
                        <CoreActionLabel label="Preview" />
                      </button>
                    ) : (
                      <a className="mini-button" href={resolveAssetUrl(asset.fileUrl)} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </CoreTable>
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
      <AssetPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
      {invoicePreview ? <InvoicePdfPreview url={invoicePreview.url} invoiceNo={invoicePreview.invoiceNo} onClose={() => setInvoicePreview(null)} onDownload={() => downloadInvoiceBlob(invoicePreview.url, invoicePreview.fileName)} /> : null}
    </SuiteShell>
  );
}

function normalizeResourceRows(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

async function fetchResourceRows(path, key) {
  const response = await fetch(apiUrl(path), { cache: "no-store" });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error || `${path} failed with ${response.status}`);
  }

  return normalizeResourceRows(await response.json(), key);
}

function isImageAsset(asset) {
  return (
    String(asset?.mimeType || "").toLowerCase().startsWith("image/") ||
    /\.(avif|gif|jpe?g|png|webp)$/i.test(String(asset?.fileName || asset?.fileUrl || ""))
  );
}

function resolveAssetUrl(value) {
  const url = String(value || "").trim();

  return url.startsWith("/uploads/") ? apiUrl(url) : url;
}

function AssetPreviewModal({ asset, onClose }) {
  const [failed, setFailed] = useState(false);
  const assetUrl = resolveAssetUrl(asset?.fileUrl);

  useEffect(() => {
    setFailed(false);
  }, [assetUrl]);

  if (!asset) return null;

  return (
    <div className="image-preview-shell" role="presentation" onClick={onClose}>
      <div className="image-preview-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="image-preview-head">
          <div>
            <p className="eyebrow">{asset.label || asset.module || "Document"}</p>
            <h3>{asset.fileName}</h3>
          </div>
          <button className="ghost-button" onClick={onClose} type="button">
            <CoreActionLabel label="Close" />
          </button>
        </div>
        {assetUrl && !failed ? (
          <img alt={asset.fileName} src={assetUrl} onError={() => setFailed(true)} />
        ) : (
          <p className="empty-state">Image preview is not available for this file.</p>
        )}
      </div>
    </div>
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
