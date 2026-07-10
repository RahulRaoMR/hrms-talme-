"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-client";

export function useDemoStore(storageKey, seed, endpoint) {
  const [items, setItems] = useState(seed);
  const [ready, setReady] = useState(false);
  const deletedStorageKey = `${storageKey}-deleted-ids`;

  function readDeletedIds() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(deletedStorageKey) || "[]");
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  function saveDeletedIds(ids) {
    try {
      window.localStorage.setItem(deletedStorageKey, JSON.stringify(Array.from(new Set(ids.map(String)))));
    } catch {}
  }

  function withoutDeleted(nextItems) {
    const deletedIds = new Set(readDeletedIds());
    return nextItems.filter((item) => !deletedIds.has(String(item.id)));
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        if (endpoint) {
          const response = await fetch(apiUrl(endpoint));
          const payload = await response.json();
          const nextItems = withoutDeleted(Array.isArray(payload) ? payload : seed);
          window.localStorage.setItem(storageKey, JSON.stringify(nextItems));
          if (!cancelled) {
            setItems(nextItems);
          }
        } else {
          const existing = window.localStorage.getItem(storageKey);
          if (existing) {
            if (!cancelled) {
              setItems(JSON.parse(existing));
            }
          } else {
            window.localStorage.setItem(storageKey, JSON.stringify(seed));
            if (!cancelled) {
              setItems(seed);
            }
          }
        }
      } catch {
        if (!cancelled) {
          setItems(seed);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [endpoint, seed, storageKey]);

  const saveItems = (updater) => {
    setItems((current) => {
      const nextItems =
        typeof updater === "function" ? updater(current) : updater;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(nextItems));
      } catch {}
      return nextItems;
    });
  };

  const reload = async () => {
    if (!endpoint) return;
    const response = await fetch(apiUrl(endpoint), { cache: "no-store" });
    const payload = await response.json();
    saveItems(withoutDeleted(Array.isArray(payload) ? payload : seed));
  };

  return {
    items,
    ready,
    setItems: saveItems,
    async reload() {
      await reload();
    },
    prepend(item) {
      saveDeletedIds(readDeletedIds().filter((id) => id !== String(item.id)));
      saveItems((current) => [item, ...current]);
    },
    replace(id, item) {
      saveDeletedIds(readDeletedIds().filter((deletedId) => deletedId !== String(id)));
      saveItems((current) =>
        current.map((entry) => (entry.id === id ? item : entry))
      );
    },
    remove(id) {
      saveDeletedIds([...readDeletedIds(), String(id)]);
      saveItems((current) => current.filter((entry) => entry.id !== id));
    }
  };
}
