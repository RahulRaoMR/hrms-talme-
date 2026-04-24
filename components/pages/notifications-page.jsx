"use client";

import { useState, useTransition } from "react";
import {
  createNotificationAction,
  deleteNotificationAction,
  sendNotificationAction,
  updateNotificationAction
} from "@/app/actions";
import Modal from "@/components/modal";
import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";

const notificationSeed = {
  subject: "Attendance Lock Reminder",
  audience: "Managers + HR Ops",
  recipients: "hr@talme.ai, +919999999999",
  channel: "Email, SMS, WhatsApp, Dashboard",
  message: "Please lock attendance before payroll generation cutoff.",
  status: "Draft",
  tone: "gold"
};

export default function NotificationsPageClient({ notifications: initialNotifications }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [modalOpen, setModalOpen] = useState(false);
  const [editState, setEditState] = useState(null);
  const [formState, setFormState] = useState(notificationSeed);
  const [isPending, startTransition] = useTransition();

  return (
    <SuiteShell
      eyebrow="Communication Module"
      title="Communication and Notification Center"
      primaryHref="/dashboard"
      primaryLabel="Back To Dashboard"
      brandEyebrow="Communication Hub"
      actions={
        <button className="ghost-button" onClick={() => setModalOpen(true)} type="button">
          Compose Message
        </button>
      }
    >
      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Notification Feed</p>
              <h3>Live updates</h3>
            </div>
          </div>
          <div className="card-stack">
            {notifications.map((notification) => (
              <div className="process-card" key={notification.id}>
                <strong>{notification.subject}</strong>
                <small>{notification.audience} via {notification.channel}</small>
                <small>Recipients: {notification.recipients}</small>
                <small>{notification.message}</small>
                {notification.providerResult ? <small>Result: {notification.providerResult}</small> : null}
                {notification.providerError ? <small>Error: {notification.providerError}</small> : null}
                <div className="row-actions">
                  <StatusBadge tone={notification.tone}>{notification.status}</StatusBadge>
                  <button className="mini-button" onClick={() => setEditState(notification)} type="button">
                    Edit
                  </button>
                  <button
                    className="mini-button"
                    disabled={isPending || notification.status === "Sent"}
                    onClick={() =>
                      startTransition(async () => {
                        const sent = await sendNotificationAction(notification.id);
                        setNotifications((current) =>
                          current.map((item) => (item.id === sent.id ? sent : item))
                        );
                      })
                    }
                    type="button"
                  >
                    Send
                  </button>
                  <button
                    className="mini-button danger-button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteNotificationAction(notification.id);
                        setNotifications((current) => current.filter((item) => item.id !== notification.id));
                      })
                    }
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Broadcast Composer</p>
              <h3>Audience setup</h3>
            </div>
          </div>
          <div className="form-grid">
            <label><span>Audience</span><input value={formState.audience} readOnly /></label>
            <label><span>Channel</span><input value={formState.channel} readOnly /></label>
          </div>
        </article>
      </section>

      <section className="page-section panel-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Audience Channels</p>
              <h3>Who receives what</h3>
            </div>
          </div>
          <div className="signal-row">
            <span className="teal">Recruiters and panelists</span>
            <span>Employees and managers</span>
            <span className="gold">Vendors and finance approvers</span>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Escalation Rules</p>
              <h3>Automated triggers</h3>
            </div>
          </div>
          <div className="doc-stack">
            <div className="doc-line"><span>Missed SLA</span><strong>Auto-alert in 15 min</strong></div>
            <div className="doc-line"><span>Payroll Exception</span><strong>Escalate to Finance</strong></div>
            <div className="doc-line"><span>Compliance Failure</span><strong>Block invoice release</strong></div>
          </div>
        </article>
      </section>

      <NotificationModal
        open={modalOpen}
        title="Create Notification"
        state={formState}
        setState={setFormState}
        isPending={isPending}
        onClose={() => setModalOpen(false)}
        onSubmit={() =>
          startTransition(async () => {
            const created = await createNotificationAction(formState);
            setNotifications((current) => [created, ...current]);
            setModalOpen(false);
          })
        }
      />

      <NotificationModal
        open={!!editState}
        title="Update Notification"
        state={editState}
        setState={setEditState}
        isPending={isPending}
        onClose={() => setEditState(null)}
        onSubmit={() =>
          startTransition(async () => {
            const updated = await updateNotificationAction(editState.id, editState);
            setNotifications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setEditState(null);
          })
        }
      />
    </SuiteShell>
  );
}

function NotificationModal({ open, title, state, setState, onSubmit, onClose, isPending }) {
  return (
    <Modal open={open} eyebrow="Communication Module" title={title} onClose={onClose}>
      {state ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="form-grid">
            {[
              ["subject", "Subject"],
              ["audience", "Audience"],
              ["recipients", "Recipients"],
              ["channel", "Channel"],
              ["message", "Message"],
              ["status", "Status"],
              ["tone", "Tone"]
            ].map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                {key === "message" ? (
                  <textarea
                    value={state[key] ?? ""}
                    onChange={(event) =>
                      setState((current) => ({ ...current, [key]: event.target.value }))
                    }
                  />
                ) : (
                  <input
                    value={state[key] ?? ""}
                    onChange={(event) =>
                      setState((current) => ({ ...current, [key]: event.target.value }))
                    }
                  />
                )}
              </label>
            ))}
          </div>
          <div className="modal-actions">
            <button className="ghost-button" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? "Saving..." : "Save Notification"}
            </button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
