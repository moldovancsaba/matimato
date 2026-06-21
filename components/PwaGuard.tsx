"use client";

import { useEffect } from "react";

export default function PwaGuard() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => undefined);

    if ("caches" in window) {
      caches.keys()
        .then((keys) => Promise.all(keys.filter((key) => key.toLowerCase().includes("matimato")).map((key) => caches.delete(key))))
        .catch(() => undefined);
    }
  }, []);

  return null;
}
