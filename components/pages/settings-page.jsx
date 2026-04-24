"use client";

import { useState, useTransition } from "react";
import {
  createCompanySettingAction,
  deleteCompanySettingAction,
  updateCompanySettingAction
} from "@/app/actions";
import Modal from "@/components/modal";
import SuiteShell from "@/components/suite-shell";

const settingSeed = {
  category: "Payroll",
  name: "Bonus Month",
  value: "March",
  status: "Active"
};

export default function SettingsPageClient({ settings: initialSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [modalOpen, setModalOpen] = useState(false);
  const [editState, setEditState] = useState(null);
  const [formState, setFormState] = useState(settingSeed);
  const [isPending, startTransition] = useTransition();

  return (
    <SuiteShell
      eyebrow="Company Settings"
      title="Departments, Holidays, Payroll Rules, and Approval Levels"
      primaryHref="/employee-portal"
      primaryLabel="Employee Portal"
      brandEyebrow="Admin Suite"
      actions={
        <button className="ghost-button" onClick={() => setModalOpen(true)} type="button">
          Add Setting
        </button>
      }
    >
      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Policy Engine</p>
            <h3>Configurable company rules</h3>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Rule</th>
              <th>Value</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((setting) => (
              <tr key={setting.id}>
                <td>{setting.category}</td>
                <td>{setting.name}</td>
                <td>{setting.value}</td>
                <td>{setting.status}</td>
                <td>
                  <div className="row-actions">
                    <button className="mini-button" onClick={() => setEditState(setting)} type="button">
                      Edit
                    </button>
                    <button
                      className="mini-button danger-button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await deleteCompanySettingAction(setting.id);
                          setSettings((current) => current.filter((item) => item.id !== setting.id));
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
              <p className="eyebrow">Master Data</p>
              <h3>Operating structure</h3>
            </div>
          </div>
          <div className="chip-row">
            <span>Departments</span>
            <span>Branches</span>
            <span>Grades</span>
            <span>Holidays</span>
            <span>Shift Rosters</span>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Security</p>
              <h3>Corporate defaults</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>Role-based access</span><strong>Enabled</strong></div>
            <div className="doc-line"><span>Audit logs</span><strong>Enabled</strong></div>
            <div className="doc-line"><span>SSO readiness</span><strong>Planned</strong></div>
          </div>
        </article>
      </section>

      <EntityModal
        open={modalOpen}
        title="Create Setting"
        state={formState}
        setState={setFormState}
        isPending={isPending}
        onClose={() => setModalOpen(false)}
        onSubmit={() =>
          startTransition(async () => {
            const created = await createCompanySettingAction(formState);
            setSettings((current) => [created, ...current]);
            setModalOpen(false);
          })
        }
      />

      <EntityModal
        open={!!editState}
        title="Update Setting"
        state={editState}
        setState={setEditState}
        isPending={isPending}
        onClose={() => setEditState(null)}
        onSubmit={() =>
          startTransition(async () => {
            const updated = await updateCompanySettingAction(editState.id, editState);
            setSettings((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setEditState(null);
          })
        }
      />
    </SuiteShell>
  );
}

function EntityModal({ open, title, state, setState, onSubmit, onClose, isPending }) {
  return (
    <Modal open={open} eyebrow="Company Settings" title={title} onClose={onClose}>
      {state ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="form-grid">
            {[
              ["category", "Category"],
              ["name", "Rule Name"],
              ["value", "Value"],
              ["status", "Status"]
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
              {isPending ? "Saving..." : "Save Setting"}
            </button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
