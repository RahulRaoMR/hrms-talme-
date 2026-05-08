"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createUserAction,
  deleteUserAction,
  updateUserAction
} from "@/lib/api-actions";
import Modal from "@/components/modal";
import StatusBadge from "@/components/status-badge";
import SuiteShell from "@/components/suite-shell";
import { useDemoStore } from "@/lib/use-demo-store";

const seedUsers = [
  {
    id: "seed-user",
    name: "Talme Director",
    email: "director@talme.ai",
    role: "Enterprise Admin",
    active: true
  }
];

export default function UsersPageClient() {
  const { items: users, prepend, reload, replace, remove } = useDemoStore(
    "talme-users",
    seedUsers,
    "/api/users"
  );
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editState, setEditState] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState({
    name: "Operations Admin",
    email: "ops@talme.ai",
    role: "Operations Manager",
    password: "talme123",
    active: true
  });

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.role.toLowerCase().includes(q)
    );
  }, [query, users]);

  return (
    <SuiteShell
      eyebrow="Admin Module"
      title="User Management"
      primaryHref="/activity"
      primaryLabel="Open Activity"
      brandEyebrow="Access Control"
      actions={
        <button className="ghost-button" onClick={() => setModalOpen(true)} type="button">
          Add User
        </button>
      }
    >
      <section className="page-section panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Access Directory</p>
            <h3>Users and roles</h3>
          </div>
        </div>
        <div className="table-toolbar">
          <input
            className="search-input"
            placeholder="Search user, email, or role"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <StatusBadge tone={user.active ? "teal" : "slate"}>
                    {user.active ? "Active" : "Disabled"}
                  </StatusBadge>
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="mini-button"
                      onClick={() => {
                        setEditState({ ...user, password: "" });
                        setEditModalOpen(true);
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="mini-button danger-button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await deleteUserAction(user.id);
                          remove(user.id);
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
      </section>

      <UserModal
        open={modalOpen}
        title="Create User"
        state={formState}
        setState={setFormState}
        isPending={isPending}
        onClose={() => setModalOpen(false)}
        onSubmit={() =>
          startTransition(async () => {
            const created = await createUserAction(formState);
            prepend(created);
            await reload();
            setModalOpen(false);
          })
        }
      />

      <UserModal
        open={editModalOpen && !!editState}
        title="Update User"
        state={editState}
        setState={setEditState}
        isPending={isPending}
        onClose={() => {
          setEditModalOpen(false);
          setEditState(null);
        }}
        onSubmit={() =>
          startTransition(async () => {
            const updated = await updateUserAction(editState.id, editState);
            replace(editState.id, updated);
            await reload();
            setEditModalOpen(false);
            setEditState(null);
          })
        }
      />
    </SuiteShell>
  );
}

function UserModal({ open, title, state, setState, onSubmit, onClose, isPending }) {
  return (
    <Modal open={open} eyebrow="Access Control" title={title} onClose={onClose}>
      {state ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="form-grid">
            <label>
              <span>Name</span>
              <input
                value={state.name}
                onChange={(event) =>
                  setState((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Email</span>
              <input
                value={state.email}
                onChange={(event) =>
                  setState((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Role</span>
              <input
                value={state.role}
                onChange={(event) =>
                  setState((current) => ({ ...current, role: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={state.password || ""}
                placeholder="Leave blank to keep current password"
                onChange={(event) =>
                  setState((current) => ({ ...current, password: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Active</span>
              <select
                value={state.active ? "true" : "false"}
                onChange={(event) =>
                  setState((current) => ({ ...current, active: event.target.value === "true" }))
                }
              >
                <option value="true">Active</option>
                <option value="false">Disabled</option>
              </select>
            </label>
          </div>
          <div className="modal-actions">
            <button className="ghost-button" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? "Saving..." : "Save User"}
            </button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
