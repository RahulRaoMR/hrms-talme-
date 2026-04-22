"use client";

import { useEffect, useState } from "react";

export function useDemoStore(storageKey, seed, endpoint) {
  const [items, setItems] = useState(seed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        if (endpoint) {
          const response = await fetch(endpoint);
          const payload = await response.json();
          const nextItems = Array.isArray(payload) ? payload : seed;
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
    const response = await fetch(endpoint, { cache: "no-store" });
    const payload = await response.json();
    saveItems(Array.isArray(payload) ? payload : seed);
  };

  return {
    items,
    ready,
    setItems: saveItems,
    async reload() {
      await reload();
    },
    prepend(item) {
      saveItems((current) => [item, ...current]);
    },
    replace(id, item) {
      saveItems((current) =>
        current.map((entry) => (entry.id === id ? item : entry))
      );
    },
    remove(id) {
      saveItems((current) => current.filter((entry) => entry.id !== id));
    }
  };
}
