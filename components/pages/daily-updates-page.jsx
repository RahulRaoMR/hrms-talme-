"use client";

import { useEffect, useMemo, useState } from "react";
import SuiteShell from "@/components/suite-shell";
import { apiUrl } from "@/lib/api-client";
import { getSuiteSession } from "@/lib/auth-session";

const dateRangeOptions = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "all", label: "All Time" }
];

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function isSameDay(first, second) {
  return startOfDay(first).getTime() === startOfDay(second).getTime();
}

function formatDateBadge(date) {
  const value = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(value, today)) return "Today";
  if (isSameDay(value, yesterday)) return "Yesterday";

  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatTimestamp(date) {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function initials(name) {
  return String(name || "TU")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function groupByDay(updates) {
  return updates.reduce((groups, update) => {
    const key = formatDateBadge(update.createdAt);
    groups[key] ||= [];
    groups[key].push(update);
    return groups;
  }, {});
}

export default function DailyUpdatesPageClient() {
  const [session, setSession] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingMessage, setEditingMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const currentUser = session?.user || {};
  const currentEmail = currentUser.email || "local@talme.ai";

  useEffect(() => {
    setSession(getSuiteSession());
  }, []);

  async function loadUpdates() {
    setLoading(true);

    try {
      const response = await fetch(apiUrl("/api/daily-updates"), { cache: "no-store" });
      const payload = await response.json().catch(() => []);
      setUpdates(Array.isArray(payload) ? payload : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUpdates();
  }, []);

  const userOptions = useMemo(() => {
    const authors = updates
      .map((update) => ({
        email: update.authorEmail || "",
        name: update.authorName || "Team Member"
      }))
      .filter((author) => author.email);
    const uniqueAuthors = Array.from(new Map(authors.map((author) => [author.email, author])).values());

    return [
      { value: "all", label: "Everyone" },
      { value: "mine", label: "Myself" },
      ...uniqueAuthors
        .filter((author) => author.email !== currentEmail)
        .map((author) => ({ value: author.email, label: author.name }))
    ];
  }, [currentEmail, updates]);

  const filteredUpdates = useMemo(() => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    return updates
      .filter((update) => {
        const createdAt = new Date(update.createdAt || Date.now());

        if (dateRange === "today" && !isSameDay(createdAt, today)) return false;
        if (dateRange === "yesterday" && !isSameDay(createdAt, yesterday)) return false;
        if (activeTab === "mine" && update.authorEmail !== currentEmail) return false;
        if (activeTab === "all" && userFilter === "mine" && update.authorEmail !== currentEmail) return false;
        if (activeTab === "all" && !["all", "mine"].includes(userFilter) && update.authorEmail !== userFilter) return false;

        return true;
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [activeTab, currentEmail, dateRange, updates, userFilter]);

  const groupedUpdates = groupByDay(filteredUpdates);

  async function postUpdate() {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    setPosting(true);

    try {
      const response = await fetch(apiUrl("/api/daily-updates"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: currentUser.name || "Talme User",
          authorEmail: currentEmail,
          authorRole: currentUser.role || "Employee",
          message: trimmedMessage
        })
      });

      if (!response.ok) {
        throw new Error("Unable to post update.");
      }

      setMessage("");
      setActiveTab("all");
      setDateRange("all");
      setUserFilter("all");
      await loadUpdates();
    } finally {
      setPosting(false);
    }
  }

  function startEditing(update) {
    setEditingId(update.id);
    setEditingMessage(update.message || "");
  }

  function cancelEditing() {
    setEditingId("");
    setEditingMessage("");
  }

  async function saveUpdate(id) {
    const trimmedMessage = editingMessage.trim();
    if (!trimmedMessage) return;

    setSavingId(id);

    try {
      const response = await fetch(apiUrl(`/api/daily-updates/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedMessage })
      });

      if (!response.ok) {
        throw new Error("Unable to update daily update.");
      }

      cancelEditing();
      await loadUpdates();
    } finally {
      setSavingId("");
    }
  }

  async function deleteUpdate(id) {
    const confirmed = window.confirm("Delete this update?");
    if (!confirmed) return;

    setDeletingId(id);

    try {
      const response = await fetch(apiUrl(`/api/daily-updates/${id}`), {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Unable to delete daily update.");
      }

      if (editingId === id) {
        cancelEditing();
      }

      await loadUpdates();
    } finally {
      setDeletingId("");
    }
  }

  return (
    <SuiteShell eyebrow="Daily Updates" title="Daily Updates" brandEyebrow="Team Worklog">
      <section className="page-section panel daily-updates-shell">
        <div className="daily-updates-tabs">
          <button className={activeTab === "mine" ? "active" : ""} onClick={() => setActiveTab("mine")} type="button">
            My Updates
          </button>
          <button className={activeTab === "all" ? "active" : ""} onClick={() => setActiveTab("all")} type="button">
            All Updates
          </button>
          <button className="daily-refresh" onClick={loadUpdates} type="button" aria-label="Refresh updates">
            Refresh
          </button>
        </div>

        {activeTab === "mine" ? (
          <div className="daily-composer">
            <div className="daily-avatar">{initials(currentUser.name)}</div>
            <div className="daily-composer-main">
              <textarea
                placeholder="What did you work on today? Share your progress, blockers, and plans..."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              <div className="daily-composer-footer">
                <small>Tip: Use line breaks to organize your update into sections.</small>
                <button className="primary-button" disabled={!message.trim() || posting} onClick={postUpdate} type="button">
                  {posting ? "Posting..." : "Post Update"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="daily-filters">
            <div>
              <p className="eyebrow">Filters</p>
              <label>
                <span>Date Range</span>
                <select value={dateRange} onChange={(event) => setDateRange(event.target.value)}>
                  {dateRangeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>User</span>
                <select value={userFilter} onChange={(event) => setUserFilter(event.target.value)}>
                  {userOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <button className="ghost-button" onClick={() => { setDateRange("all"); setUserFilter("all"); }} type="button">
              Clear All
            </button>
          </div>
        )}

        <div className="daily-feed">
          {loading ? <p className="empty-state">Loading updates...</p> : null}
          {!loading && !filteredUpdates.length ? <p className="empty-state">No updates found.</p> : null}

          {Object.entries(groupedUpdates).map(([day, dayUpdates]) => (
            <div className="daily-day-group" key={day}>
              <div className="daily-day-divider">
                <span>{day}</span>
                <small>{dayUpdates.length} update{dayUpdates.length === 1 ? "" : "s"}</small>
              </div>

              {dayUpdates.map((update) => {
                const mine = update.authorEmail === currentEmail;

                return (
                  <article className={`daily-update-card ${mine ? "mine" : "team"}`} key={update.id}>
                    {!mine ? <div className="daily-avatar">{initials(update.authorName)}</div> : null}
                    <div className="daily-update-body">
                      <div className="daily-update-meta">
                        <strong>{mine ? "You" : update.authorName || "Team Member"}</strong>
                        <span>{formatTimestamp(update.createdAt)}</span>
                        {update.authorRole ? <em>{update.authorRole}</em> : null}
                      </div>
                      {editingId === update.id ? (
                        <div className="daily-edit-form">
                          <textarea
                            value={editingMessage}
                            onChange={(event) => setEditingMessage(event.target.value)}
                            rows={5}
                          />
                          <div className="daily-update-actions">
                            <button
                              className="ghost-button"
                              disabled={savingId === update.id || !editingMessage.trim()}
                              onClick={() => saveUpdate(update.id)}
                              type="button"
                            >
                              {savingId === update.id ? "Saving..." : "Save"}
                            </button>
                            <button className="ghost-button" onClick={cancelEditing} type="button">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p>{update.message}</p>
                          {mine ? (
                            <div className="daily-update-actions">
                              <button className="ghost-button" onClick={() => startEditing(update)} type="button">
                                Edit
                              </button>
                              <button
                                className="ghost-button danger"
                                disabled={deletingId === update.id}
                                onClick={() => deleteUpdate(update.id)}
                                type="button"
                              >
                                {deletingId === update.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                    {mine ? <div className="daily-avatar">{initials(update.authorName || currentUser.name)}</div> : null}
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </SuiteShell>
  );
}
