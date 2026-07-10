"use strict";

const CACHE_NAME = "command-doctor-2026-07-mvp-21";
const OFFLINE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=2026.07-mvp.21",
  "./src/app.js?v=2026.07-mvp.21",
  "./data/commands/admin_commands.json",
  "./data/commands/aruba_cx.json",
  "./data/commands/cisco_ios.json",
  "./data/commands/hp_comware.json",
  "./data/commands/linux.json",
  "./data/commands/windows_cmd.json",
  "./data/commands/platform_commands.json",
  "./data/commands/network_commands_extended.json",
  "./data/flows/dns_troubleshooting.json",
  "./data/flows/gateway_troubleshooting.json",
  "./data/flows/interface_troubleshooting.json",
  "./data/flows/stack_troubleshooting.json",
  "./data/flows/vlan_troubleshooting.json",
  "./data/safety/dangerous_commands.json",
  "./data/sources/sources.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((name) => name.startsWith("command-doctor-") && name !== CACHE_NAME)
        .map((name) => caches.delete(name))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then((response) => {
        if (!response || !response.ok) {
          return response;
        }
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
