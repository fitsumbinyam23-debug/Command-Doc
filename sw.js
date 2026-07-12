"use strict";

const CACHE_NAME = "command-doctor-2026-07-lab-21-topology-diagnostics";
const OFFLINE_ASSETS = [
  "./",
  "./index.html",
  "./refresh.html",
  "./lab.html",
  "./sw-refresh.js",
  "./styles.css?v=2026.07-lab.21&phase1=topology&advanced=diagnostics",
  "./src/app.js?v=2026.07-lab.13",
  "./src/lab-engine.js?v=2026.07-lab.21&phase1=topology&advanced=diagnostics",
  "./src/app-release-21.js?v=2026.07-lab.21&phase1=topology&advanced=diagnostics",
  "./src/topology-workspace.js?v=2026.07-lab.21&phase1=topology&advanced=diagnostics",
  "./data/commands/admin_commands.json",
  "./data/commands/aruba_cx.json",
  "./data/commands/cisco_ios.json",
  "./data/commands/hp_comware.json",
  "./data/commands/linux.json",
  "./data/commands/windows_cmd.json",
  "./data/commands/platform_commands.json",
  "./data/commands/network_commands_extended.json",
  "./data/commands/vendor_learning_extended.json",
  "./data/commands/switch_configuration_extended.json",
  "./data/labs/stages.json",
  "./data/labs/sections.json",
  "./data/labs/curriculum.json",
  "./data/labs/curriculum_vendor_tracks.json",
  "./data/labs/lessons/foundation.json",
  "./data/labs/lessons/foundation_extended.json",
  "./data/labs/lessons/configuration.json",
  "./data/labs/lessons/configuration_extended.json",
  "./data/labs/quizzes/lesson-quizzes.json",
  "./data/labs/quizzes/extended-quizzes.json",
  "./data/labs/scenarios/scenarios.json",
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

  const isAppShell = event.request.mode === "navigate"
    || url.pathname.endsWith("/index.html")
    || /\.(?:js|css)$/.test(url.pathname);

  if (isAppShell) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response?.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => caches.match(event.request, { ignoreSearch: true }))
    );
    return;
  }

  if (url.pathname.includes("/data/labs/")) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response?.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => caches.match(event.request, { ignoreSearch: true }))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || fetch(event.request).then((response) => {
      if (response?.ok) {
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
      }
      return response;
    }))
  );
});
