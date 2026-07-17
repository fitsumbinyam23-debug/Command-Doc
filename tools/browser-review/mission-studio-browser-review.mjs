import crypto from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import zlib from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const defaultClient = fsSync.existsSync(path.join(root, "dist", "client")) ? path.join(root, "dist", "client") : root;
const args = parseArgs(process.argv.slice(2));
const outDir = path.resolve(args.out || path.join(os.tmpdir(), `command-doctor-mission-studio-review-${Date.now()}`));
const repeat = Number(args.repeat || 1);
const clientRoot = path.resolve(args.client || defaultClient);
const externalBaseUrl = typeof args["base-url"] === "string"
  ? args["base-url"].replace(/\/lab\.html.*$/i, "").replace(/\/$/, "")
  : "";
const cssViewportDesktop = { width: 1440, height: 900, mobile: false };
const cssViewportDesktopCompact = { width: 1280, height: 800, mobile: false };
const cssViewportMobile = { width: 390, height: 844, mobile: true };
const reviewFailureGuards = [
  "desktop onboarding narrow content strip",
  "desktop home narrow content strip",
  "desktop shell old layout reuse",
  "desktop mission hero missing visual",
  "mobile home partial viewport",
  "mobile bottom navigation overlap",
  "screenshot metric mismatch",
  "course phase title mismatch",
  "planned level false start",
  "stage 1 home regression"
];

const level0State = (stepId = "mission") => ({
  current_lesson_id: "level00_what_is_a_network",
  current_step_id: stepId,
  completed_lesson_ids: [],
  prediction_responses: {},
  try_responses: {},
  explanation_responses: {},
  confidence_by_lesson: {},
  final_checkpoint_result: null,
  level_complete: false,
  resume_timestamp: "",
  mastery: { concept_orientation: false }
});

const scenarios = [
  { id: "desktop-onboarding", viewport: cssViewportDesktop, seed: { path: "" }, steps: [] },
  { id: "desktop-home-zero", viewport: cssViewportDesktop, seed: { path: "zero" }, steps: [{ click: "Home" }] },
  { id: "desktop-home-practice-path", viewport: cssViewportDesktop, seed: { path: "practice" }, steps: [{ click: "Home" }] },
  { id: "desktop-home-technician-path", viewport: cssViewportDesktop, seed: { path: "tools" }, steps: [{ click: "Home" }] },
  { id: "desktop-home-recent-activity", viewport: cssViewportDesktop, seed: { path: "zero", step: "see", activity: "recent" }, steps: [{ click: "Home" }] },
  { id: "desktop-home-empty-activity", viewport: cssViewportDesktop, seed: { path: "zero", step: "mission" }, steps: [{ click: "Home" }] },
  { id: "desktop-navigation-focus", viewport: cssViewportDesktop, seed: { path: "zero" }, steps: [{ focus: "Practice" }] },
  { id: "desktop-1280-home-zero", viewport: cssViewportDesktopCompact, seed: { path: "zero" }, steps: [{ click: "Home" }] },
  { id: "desktop-course-phase-1", viewport: cssViewportDesktop, seed: { path: "zero" }, expectedPhaseTitle: "ABSOLUTE BEGINNER", steps: [{ click: "Course" }, { phaseId: "phase_01" }] },
  { id: "desktop-course-phase-5", viewport: cssViewportDesktop, seed: { path: "zero" }, expectedPhaseTitle: "SECURITY", steps: [{ click: "Course" }, { phaseId: "phase_05" }] },
  { id: "desktop-course-phase-10", viewport: cssViewportDesktop, seed: { path: "zero" }, expectedPhaseTitle: "ADVANCED NETWORKING", steps: [{ click: "Course" }, { phaseId: "phase_10" }] },
  { id: "desktop-level-0-overview", viewport: cssViewportDesktop, seed: { path: "zero" }, expectedLevelTitle: "Welcome to Networking", steps: [{ click: "Course" }, { phaseId: "phase_01" }, { openLevelNumber: "0" }] },
  { id: "desktop-level-1-planned-overview", viewport: cssViewportDesktop, seed: { path: "zero" }, expectedLevelTitle: "Network Devices and Connections", steps: [{ click: "Course" }, { phaseId: "phase_01" }, { openLevelNumber: "1" }] },
  { id: "desktop-current-level-focus", viewport: cssViewportDesktop, seed: { path: "zero" }, expectedPhaseTitle: "ABSOLUTE BEGINNER", steps: [{ click: "Course" }, { focusSelector: ".ms-course-level-card.is-current .ms-button" }] },
  { id: "desktop-locked-planned-state-comparison", viewport: cssViewportDesktop, seed: { path: "zero" }, expectedPhaseTitle: "ABSOLUTE BEGINNER", steps: [{ click: "Course" }, { phaseId: "phase_01" }] },
  { id: "desktop-1280-course-phase-1", viewport: cssViewportDesktopCompact, seed: { path: "zero" }, expectedPhaseTitle: "ABSOLUTE BEGINNER", steps: [{ click: "Course" }, { phaseId: "phase_01" }] },
  { id: "desktop-1280-level-0-overview", viewport: cssViewportDesktopCompact, seed: { path: "zero" }, expectedLevelTitle: "Welcome to Networking", steps: [{ click: "Course" }, { phaseId: "phase_01" }, { openLevelNumber: "0" }] },
  { id: "mobile-onboarding", viewport: cssViewportMobile, seed: { path: "" }, steps: [] },
  { id: "mobile-home-zero", viewport: cssViewportMobile, seed: { path: "zero" }, steps: [{ click: "Home" }] },
  { id: "mobile-home-bottom-scroll", viewport: cssViewportMobile, seed: { path: "zero" }, steps: [{ click: "Home" }], scrollSelector: ".ms-recommendation-row" },
  { id: "mobile-navigation-focus", viewport: cssViewportMobile, seed: { path: "zero" }, steps: [{ focus: "Tools" }] },
  { id: "mobile-course-phase-1", viewport: cssViewportMobile, seed: { path: "zero" }, expectedPhaseTitle: "ABSOLUTE BEGINNER", steps: [{ click: "Course" }, { phaseId: "phase_01" }] },
  { id: "mobile-course-phase-5", viewport: cssViewportMobile, seed: { path: "zero" }, expectedPhaseTitle: "SECURITY", steps: [{ click: "Course" }, { phaseId: "phase_05" }] },
  { id: "mobile-course-phase-10", viewport: cssViewportMobile, seed: { path: "zero" }, expectedPhaseTitle: "ADVANCED NETWORKING", steps: [{ click: "Course" }, { phaseId: "phase_10" }] },
  { id: "mobile-level-0-overview", viewport: cssViewportMobile, seed: { path: "zero" }, expectedLevelTitle: "Welcome to Networking", steps: [{ click: "Course" }, { phaseId: "phase_01" }, { openLevelNumber: "0" }] },
  { id: "mobile-level-1-planned-overview", viewport: cssViewportMobile, seed: { path: "zero" }, expectedLevelTitle: "Network Devices and Connections", steps: [{ click: "Course" }, { phaseId: "phase_01" }, { openLevelNumber: "1" }] },
  { id: "mobile-bottom-action-visibility", viewport: cssViewportMobile, seed: { path: "zero" }, expectedLevelTitle: "Welcome to Networking", steps: [{ click: "Course" }, { phaseId: "phase_01" }, { openLevelNumber: "0" }], scrollSelector: ".ms-level-hero" }
];

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[index + 1];
      parsed[key] = next && !next.startsWith("--") ? argv[++index] : true;
    }
  }
  return parsed;
}

async function loadPlaywright() {
  try {
    const loaded = await import("playwright");
    return loaded.default || loaded;
  } catch {
    const candidates = [
      process.env.PLAYWRIGHT_NODE_MODULES && path.join(process.env.PLAYWRIGHT_NODE_MODULES, "playwright", "index.js"),
      path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright", "index.js"),
      path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", ".pnpm", "playwright@1.61.1", "node_modules", "playwright", "index.js")
    ].filter(Boolean);
    for (const candidate of candidates) {
      if (await exists(candidate)) {
        try {
          const loaded = await import(pathToFileURL(candidate).href);
          return loaded.default || loaded;
        } catch {
          continue;
        }
      }
    }
  }
  return null;
}

function contentType(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

async function startStaticServer(directory) {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const routePath = decodeURIComponent(url.pathname === "/" ? "/lab.html" : url.pathname);
      const target = path.resolve(directory, `.${routePath}`);
      if (!target.startsWith(directory)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }
      const stat = await fs.stat(target);
      const file = stat.isDirectory() ? path.join(target, "index.html") : target;
      response.writeHead(200, { "content-type": contentType(file), "cache-control": "no-store" });
      fsSync.createReadStream(file).pipe(response);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function findBrowser() {
  const candidates = [
    args.browser,
    process.env.BROWSER,
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  throw new Error(`No Chrome or Edge browser was found. Set BROWSER to a Chromium executable path.`);
}

const exists = (target) => fs.access(target).then(() => true).catch(() => false);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ignorableBrowserLog = (text = "") => /favicon|net::ERR_NETWORK_CHANGED/i.test(String(text));

async function waitForExit(process, timeoutMs = 3000) {
  if (process.exitCode !== null || process.signalCode !== null) return;
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    process.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function removeProfile(profile) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await fs.rm(profile, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!["EBUSY", "EPERM", "ENOTEMPTY"].includes(error.code)) throw error;
      await delay(250 * (attempt + 1));
    }
  }
}

async function launchBrowser(browserPath) {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "command-doctor-mission-studio-"));
  const browser = spawn(browserPath, [
    args.headed ? "" : "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-sync",
    "--no-first-run",
    "--no-default-browser-check",
    "--force-device-scale-factor=1",
    "--remote-allow-origins=*",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank"
  ].filter(Boolean), { stdio: ["ignore", "pipe", "pipe"] });
  const activePortFile = path.join(profile, "DevToolsActivePort");
  let content = "";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await exists(activePortFile)) {
      content = await fs.readFile(activePortFile, "utf8");
      break;
    }
    if (browser.exitCode !== null) throw new Error(`Browser exited before DevTools became available.`);
    await delay(100);
  }
  if (!content) throw new Error("Timed out waiting for DevToolsActivePort.");
  const [port] = content.trim().split(/\r?\n/);
  return { browser, profile, port };
}

async function newPage(port, url) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  if (!response.ok) throw new Error(`Unable to create browser page: ${response.status}`);
  const target = await response.json();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.open();
  return client;
}

class RawWebSocket {
  constructor(url) {
    this.url = new URL(url);
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.readyState = "closed";
    this.messageListeners = [];
  }

  async open() {
    const key = crypto.randomBytes(16).toString("base64");
    this.socket = net.createConnection({ host: this.url.hostname, port: Number(this.url.port) });
    await new Promise((resolve, reject) => {
      this.socket.once("connect", resolve);
      this.socket.once("error", reject);
    });
    this.socket.write([
      `GET ${this.url.pathname}${this.url.search} HTTP/1.1`,
      `Host: ${this.url.host}`,
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Key: ${key}`,
      "Sec-WebSocket-Version: 13",
      "\r\n"
    ].join("\r\n"));
    await new Promise((resolve, reject) => {
      let handshake = Buffer.alloc(0);
      const onData = (chunk) => {
        handshake = Buffer.concat([handshake, chunk]);
        const marker = handshake.indexOf("\r\n\r\n");
        if (marker === -1) return;
        this.socket.off("data", onData);
        const header = handshake.subarray(0, marker).toString("utf8");
        if (!/^HTTP\/1\.1 101/i.test(header)) {
          reject(new Error(`WebSocket upgrade failed: ${header.split(/\r?\n/)[0]}`));
          return;
        }
        this.readyState = "open";
        const remaining = handshake.subarray(marker + 4);
        if (remaining.length) this.handleData(remaining);
        this.socket.on("data", (data) => this.handleData(data));
        this.socket.on("close", () => { this.readyState = "closed"; });
        resolve();
      };
      this.socket.on("data", onData);
      this.socket.once("error", reject);
    });
  }

  onMessage(listener) {
    this.messageListeners.push(listener);
  }

  handleData(data) {
    this.buffer = Buffer.concat([this.buffer, data]);
    while (this.buffer.length >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      const opcode = first & 0x0f;
      let length = second & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (this.buffer.length < 4) return;
        length = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (this.buffer.length < 10) return;
        const high = this.buffer.readUInt32BE(2);
        const low = this.buffer.readUInt32BE(6);
        length = high * 2 ** 32 + low;
        offset = 10;
      }
      const masked = Boolean(second & 0x80);
      const maskOffset = masked ? 4 : 0;
      if (this.buffer.length < offset + maskOffset + length) return;
      let payload = this.buffer.subarray(offset + maskOffset, offset + maskOffset + length);
      if (masked) {
        const mask = this.buffer.subarray(offset, offset + 4);
        payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
      }
      this.buffer = this.buffer.subarray(offset + maskOffset + length);
      if (opcode === 0x8) {
        this.close();
        return;
      }
      if (opcode === 0x1) {
        const text = payload.toString("utf8");
        this.messageListeners.forEach((listener) => listener(text));
      }
    }
  }

  send(text) {
    const payload = Buffer.from(text, "utf8");
    const mask = crypto.randomBytes(4);
    let header;
    if (payload.length < 126) {
      header = Buffer.from([0x81, 0x80 | payload.length]);
    } else if (payload.length < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 0x80 | 126;
      header.writeUInt16BE(payload.length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 0x80 | 127;
      header.writeUInt32BE(0, 2);
      header.writeUInt32BE(payload.length, 6);
    }
    const masked = Buffer.alloc(payload.length);
    for (let index = 0; index < payload.length; index += 1) masked[index] = payload[index] ^ mask[index % 4];
    this.socket.write(Buffer.concat([header, mask, masked]));
  }

  close() {
    this.readyState = "closed";
    this.socket?.end();
  }
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async open() {
    this.ws = new RawWebSocket(this.url);
    await this.ws.open();
    this.ws.onMessage((data) => {
      this.handleMessage(data).catch((error) => {
        for (const [id, pending] of this.pending.entries()) {
          clearTimeout(pending.timer);
          pending.reject(error);
          this.pending.delete(id);
        }
      });
    });
  }

  async handleMessage(data) {
    const text = typeof data === "string"
      ? data
      : data instanceof Blob
        ? await data.text()
        : Buffer.from(data).toString("utf8");
    const message = JSON.parse(text);
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject, timer } = this.pending.get(message.id);
      clearTimeout(timer);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }
    if (message.method) {
      const listeners = this.listeners.get(message.method) || [];
      listeners.forEach((listener) => listener(message.params || {}));
    }
  }

  send(method, params = {}) {
    const id = this.nextId++;
    if (this.ws.readyState !== "open") throw new Error(`CDP socket is not open for ${method}.`);
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, 10000);
      this.pending.set(id, { resolve, reject, timer });
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  async close() {
    if (this.ws?.readyState === "open") this.ws.close();
  }
}

async function evaluate(client, expression, awaitPromise = false) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime evaluation failed");
  }
  return result.result?.value;
}

async function configurePage(client, viewport, consoleErrors) {
  client.on("Runtime.consoleAPICalled", (params) => {
    const text = params.args?.map((arg) => arg.value || arg.description || "").join(" ");
    if (["error", "assert"].includes(params.type) && !ignorableBrowserLog(text)) consoleErrors.push(text);
  });
  client.on("Log.entryAdded", (params) => {
    if (["error", "warning"].includes(params.entry?.level) && !ignorableBrowserLog(params.entry.text || "")) consoleErrors.push(params.entry.text);
  });
  await client.send("Runtime.enable");
  await client.send("Page.enable");
  await client.send("Log.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
    screenWidth: viewport.width,
    screenHeight: viewport.height
  });
  await client.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
}

async function navigateAndSeed(client, baseUrl, scenario) {
  await client.send("Page.navigate", { url: `${baseUrl}/lab.html?seed=${encodeURIComponent(scenario.id)}` });
  await waitForReadyState(client);
  const seed = {
    path: scenario.seed.path || "",
    level0: level0State(scenario.seed.step || "mission"),
    recentTool: "diagnose"
  };
  if (scenario.seed.activity === "recent") {
    seed.level0.resume_timestamp = "2026-07-17T00:00:00.000Z";
    seed.level0.confidence_by_lesson[seed.level0.current_lesson_id] = "Growing";
  }
  await evaluate(client, `(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("command-doctor.learning-path", ${JSON.stringify(seed.path)});
    localStorage.setItem("command-doctor.level-0-progress", ${JSON.stringify(JSON.stringify(seed.level0))});
    localStorage.setItem("command-doctor.recent-technician-tool", ${JSON.stringify(seed.recentTool)});
    return true;
  })()`);
  await client.send("Page.navigate", { url: `${baseUrl}/lab.html?scenario=${encodeURIComponent(scenario.id)}` });
  await waitForAppReady(client, scenario);
}

async function waitForReadyState(client) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const readyState = await evaluate(client, "document.readyState");
    if (readyState === "complete" || readyState === "interactive") return;
    await delay(50);
  }
  throw new Error("Timed out waiting for DOM content.");
}

async function waitForAppReady(client, scenario, { requireLessonVisual = false } = {}) {
  await waitForReadyState(client);
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const ready = await evaluate(client, `(() => {
      const nav = [...document.querySelectorAll("[data-ms-primary-nav='true']")].slice(0, 5).map((item) => item.textContent.trim()).join("|");
      const active = document.querySelector(".view.active");
      const activeRoot = active?.querySelector("[id$='Root'], .history-list, .knowledge-grid") || active;
      return Boolean(window.CommandDoctorBeginnerExperience && window.CommandDoctorMissionStudioComponents && nav === "Home|Course|Practice|Progress|Tools" && activeRoot && activeRoot.children.length);
    })()`);
    if (ready) break;
    if (attempt === 159) throw new Error("Timed out waiting for application initialization and required data.");
    await delay(50);
  }
  await evaluate(client, `(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all([...document.images].map((img) => new Promise((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(resolve, 750);
      const rect = img.getBoundingClientRect();
      const renderedSvg = /\\.svg(?:$|\\?)/i.test(img.currentSrc || img.src || "") && rect.width > 0 && rect.height > 0;
      if (img.complete || renderedSvg || !img.decode) {
        finish();
        return;
      }
      img.decode().then(finish).catch(finish);
    })));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return true;
  })()`, true);
  await waitForStableGeometry(client);
  if (requireLessonVisual && /^(?:desktop|mobile)-lesson/.test(scenario.id)) {
    let visualReady = false;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      visualReady = await evaluate(client, `(() => {
        const images = [...document.querySelectorAll(".mission-visual-panel img")].filter((img) => img.getBoundingClientRect().width > 0);
        images.forEach((img) => img.scrollIntoView({ block: "center", inline: "nearest" }));
        return images.length > 0 && images.every((img) => {
          const rect = img.getBoundingClientRect();
          const renderedSvg = /\.svg(?:$|\?)/i.test(img.currentSrc || img.src || "") && rect.width > 0 && rect.height > 0;
          return img.complete && (img.naturalWidth > 0 || renderedSvg);
        });
      })()`);
      if (visualReady) break;
      await delay(100);
    }
    if (!visualReady) throw new Error(`${scenario.id} visual loading and image decode failed.`);
  }
}

async function waitForStableGeometry(client) {
  let previous = null;
  let stable = 0;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const metrics = await collectGeometry(client);
    const signature = JSON.stringify([
      Math.round(metrics.activeRootRect.left),
      Math.round(metrics.activeRootRect.top),
      Math.round(metrics.activeRootRect.width),
      Math.round(metrics.activeRootRect.height),
      Math.round(metrics.mainRect.width)
    ]);
    stable = signature === previous ? stable + 1 : 0;
    previous = signature;
    if (stable >= 2) return;
    await delay(80);
  }
  throw new Error("Initial render stability failed: active-root geometry did not settle.");
}

async function clickVisibleText(client, text) {
  const clicked = await evaluate(client, `(() => {
    const targetText = ${JSON.stringify(text)};
    const candidates = [...document.querySelectorAll("button, summary, a")].filter((node) => {
      const rect = node.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0 && getComputedStyle(node).visibility !== "hidden";
      return visible && node.textContent.trim().includes(targetText);
    });
    const node = candidates[0];
    if (!node) return false;
    node.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Could not find visible UI control: ${text}`);
  await waitForAppReady(client, { id: text.toLowerCase(), seed: {} });
}

async function focusVisibleText(client, text) {
  const focused = await evaluate(client, `(() => {
    const targetText = ${JSON.stringify(text)};
    const candidates = [...document.querySelectorAll("button, summary, a")].filter((node) => {
      const rect = node.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0 && getComputedStyle(node).visibility !== "hidden";
      return visible && node.textContent.trim().includes(targetText);
    });
    const node = candidates[0];
    if (!node) return false;
    node.focus();
    return document.activeElement === node;
  })()`);
  if (!focused) throw new Error(`Could not focus visible UI control: ${text}`);
  await waitForAppReady(client, { id: text.toLowerCase(), seed: {} });
}

async function selectPhase(client, phaseId) {
  const selected = await evaluate(client, `(() => {
    const phaseId = ${JSON.stringify(phaseId)};
    const selector = document.querySelector(".ms-mobile-phase-selector select");
    if (selector) {
      selector.value = phaseId;
      selector.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    const button = document.querySelector("[data-phase-id='" + phaseId + "']");
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!selected) throw new Error(`Could not select course phase: ${phaseId}`);
  await waitForAppReady(client, { id: phaseId, seed: {} });
}

async function openLevelNumber(client, levelNumber) {
  const opened = await evaluate(client, `(() => {
    const levelNumber = ${JSON.stringify(levelNumber)};
    const button = document.querySelector(".ms-course-level-card[data-level-number='" + levelNumber + "'] .ms-button");
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!opened) throw new Error(`Could not open level number: ${levelNumber}`);
  await waitForAppReady(client, { id: `level-${levelNumber}`, seed: {} });
}

async function focusSelector(client, selector) {
  const focused = await evaluate(client, `(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (!node) return false;
    node.focus();
    return document.activeElement === node;
  })()`);
  if (!focused) throw new Error(`Could not focus selector: ${selector}`);
  await waitForAppReady(client, { id: selector, seed: {} });
}

async function collectGeometry(client) {
  return evaluate(client, `(() => {
    const rect = (node) => {
      const value = node?.getBoundingClientRect?.() || { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };
      return { left: value.left, top: value.top, width: value.width, height: value.height, right: value.right, bottom: value.bottom };
    };
    const active = document.querySelector(".view.active");
    const activeRoot = active?.querySelector("[id$='Root'], .history-list, .knowledge-grid, .admin-root") || active;
    const shell = document.querySelector(".ms-app-shell");
    const main = document.querySelector(".ms-shell-main") || document.querySelector(".main-panel");
    const visibleSidebar = [...document.querySelectorAll(".ms-desktop-sidebar, .ms-mobile-header")].find((item) => {
      const box = item.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && getComputedStyle(item).display !== "none";
    });
    const nav = visibleSidebar || document.querySelector(".sidebar");
    const hero = active?.querySelector(".ms-home-hero, .ms-level-hero");
    const bottomNav = document.querySelector(".ms-mobile-bottom-nav");
    const missionVisual = active?.querySelector(".ms-mission-visual img");
    const missionVisualText = active?.querySelector(".ms-mission-visual figcaption");
    const phaseControl = active?.querySelector(".ms-phase-rail, .ms-mobile-phase-selector");
    const timeline = active?.querySelector(".ms-level-timeline, .ms-level-mission-sequence");
    const contextPanel = active?.querySelector(".ms-phase-context, .ms-readiness-summary");
    const activeLevel = active?.querySelector(".ms-course-level-node.is-current, .ms-level-mission-sequence li.is-current");
    const courseTitle = active?.querySelector("#courseTitle")?.textContent?.trim() || "";
    const phaseButtonCount = active?.querySelectorAll("[data-phase-id]").length || 0;
    const mobilePhaseOptionCount = active?.querySelectorAll(".ms-mobile-phase-selector option").length || 0;
    const levelCardCount = active?.querySelectorAll(".ms-course-level-card").length || 0;
    const sequenceCount = active?.querySelectorAll(".ms-level-mission-sequence li").length || 0;
    const plannedStartCount = [...(active?.querySelectorAll(".is-planned .ms-button, .ms-planned-level-notice .ms-button") || [])]
      .filter((button) => /^start\b/i.test(button.textContent.trim())).length;
    const rawInternalIdPresent = /level_\d\d|phase_\d\d/.test(active?.textContent || "");
    const zeroCountCopyPresent = /0 commands|0 mapped commands/i.test(active?.textContent || "");
    const activeNav = [...document.querySelectorAll("[data-ms-primary-nav='true']")].filter((item) => {
      const box = item.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && getComputedStyle(item).display !== "none";
    });
    const activeViewCount = [...document.querySelectorAll(".view.active")].length;
    const fixedBottomNavCount = [...document.querySelectorAll(".ms-mobile-bottom-nav")].filter((item) => {
      const box = item.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && getComputedStyle(item).position === "fixed";
    }).length;
    const duplicateRootContent = [...document.querySelectorAll(".view.active [id$='Root']")].filter((item) => item.children.length > 0).length > 1;
    const focused = document.activeElement;
    const colorParts = (value) => {
      const match = String(value || "").match(/rgba?\\(([^)]+)\\)/);
      if (!match) return null;
      const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    };
    const backgroundFor = (node) => {
      let cursor = node;
      while (cursor) {
        const bg = colorParts(getComputedStyle(cursor).backgroundColor);
        if (bg && bg.a !== 0) return bg;
        cursor = cursor.parentElement;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    };
    const channel = (value) => {
      const normalized = value / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (color) => (0.2126 * channel(color.r)) + (0.7152 * channel(color.g)) + (0.0722 * channel(color.b));
    const contrastRatio = (fg, bg) => {
      const first = luminance(fg);
      const second = luminance(bg);
      return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    };
    const contrastResults = [".ms-content-header h2", ".ms-home-section p", ".ms-button-primary", ".ms-button-secondary", ".nav-tab.active", ".ms-kicker"].map((selector) => {
      const node = active?.querySelector(selector) || document.querySelector(selector);
      if (!node) return null;
      const style = getComputedStyle(node);
      const fg = colorParts(style.color);
      const bg = backgroundFor(node);
      const weight = Number.parseInt(style.fontWeight, 10) || 400;
      const size = Number.parseFloat(style.fontSize) || 16;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      return fg && bg ? { selector, ratio: Number(contrastRatio(fg, bg).toFixed(2)), minimum: large ? 3 : 4.5 } : null;
    }).filter(Boolean);
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    const scrollWidth = document.documentElement.scrollWidth;
    const rootRect = rect(activeRoot);
    const mainRect = rect(main);
    const availableMainWidth = Math.max(1, Math.min(mainRect.width || viewportWidth, viewportWidth));
    return {
      activeViewId: active?.id || "",
      activeRootSelector: activeRoot?.id ? "#" + activeRoot.id : "." + [...(activeRoot?.classList || [])].join("."),
      shellRect: rect(shell),
      activeRootRect: rootRect,
      mainRect,
      navigationRect: rect(nav),
      heroRect: rect(hero),
      phaseControlRect: rect(phaseControl),
      timelineRect: rect(timeline),
      contextRect: rect(contextPanel),
      activeLevelRect: rect(activeLevel),
      bottomNavigationRect: rect(bottomNav),
      documentScrollWidth: scrollWidth,
      documentClientWidth: viewportWidth,
      viewportHeight,
      horizontalOverflow: scrollWidth > viewportWidth + 1,
      focusedElement: focused ? [focused.tagName.toLowerCase(), focused.id ? "#" + focused.id : "", focused.className ? "." + String(focused.className).split(/\\s+/).filter(Boolean).join(".") : ""].join("") : "",
      visibleNavigationCount: activeNav.length,
      fixedBottomNavCount,
      activeViewCount,
      duplicateRootContent,
      contrastResults,
      contentWidthRatio: rootRect.width / availableMainWidth,
      oldShellPresent: Boolean(document.querySelector(".app-shell, .sidebar, .main-panel, .nav-tabs, .status-stack")),
      pathChoiceCount: active?.querySelectorAll("[data-path-choice]").length || 0,
      dominantActionCount: active?.querySelectorAll("[data-dominant-action='true']").length || 0,
      courseTitle,
      phaseButtonCount,
      mobilePhaseOptionCount,
      levelCardCount,
      sequenceCount,
      plannedStartCount,
      rawInternalIdPresent,
      zeroCountCopyPresent,
      missionVisual: {
        present: Boolean(missionVisual),
        src: missionVisual?.getAttribute("src") || "",
        altLength: missionVisual?.getAttribute("alt")?.length || 0,
        textLength: missionVisualText?.textContent?.trim().length || 0
      }
    };
  })()`);
}

async function captureScenario(client, scenario, runDir, consoleErrors) {
  for (const step of scenario.steps) {
    if (step.click) await clickVisibleText(client, step.click);
    if (step.focus) await focusVisibleText(client, step.focus);
    if (step.phaseId) await selectPhase(client, step.phaseId);
    if (step.openLevelNumber) await openLevelNumber(client, step.openLevelNumber);
    if (step.focusSelector) await focusSelector(client, step.focusSelector);
  }
  if (scenario.scrollSelector) {
    await evaluate(client, `document.querySelector(${JSON.stringify(scenario.scrollSelector)})?.scrollIntoView({ block: "start" })`);
  }
  await waitForAppReady(client, scenario, { requireLessonVisual: true });
  const geometry = await collectGeometry(client);
  const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
  const buffer = Buffer.from(screenshot.data, "base64");
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const screenshotPath = path.join(runDir, "screenshots", `${scenario.id}.png`);
  await fs.writeFile(screenshotPath, buffer);
  const pixelContentBounds = pngContentBounds(buffer);
  const record = {
    scenario_id: scenario.id,
    timestamp: new Date().toISOString(),
    viewport: { width: scenario.viewport.width, height: scenario.viewport.height },
    device_scale_factor: 1,
    screenshot_sha256: sha256,
    screenshot_path: path.relative(outDir, screenshotPath).replace(/\\/g, "/"),
    active_root_selector: geometry.activeRootSelector,
    shell_rectangle: geometry.shellRect,
    active_root_rectangle: geometry.activeRootRect,
    main_rectangle: geometry.mainRect,
    navigation_rectangle: geometry.navigationRect,
    hero_rectangle: geometry.heroRect,
    phase_control_rectangle: geometry.phaseControlRect,
    timeline_rectangle: geometry.timelineRect,
    context_rectangle: geometry.contextRect,
    active_level_rectangle: geometry.activeLevelRect,
    bottom_navigation_rectangle: geometry.bottomNavigationRect,
    document_scroll_width: geometry.documentScrollWidth,
    horizontal_overflow: geometry.horizontalOverflow,
    focused_element: geometry.focusedElement,
    console_errors: [...consoleErrors],
    content_width_ratio: geometry.contentWidthRatio,
    visible_navigation_count: geometry.visibleNavigationCount,
    fixed_bottom_navigation_count: geometry.fixedBottomNavCount,
    active_view_count: geometry.activeViewCount,
    duplicate_root_content: geometry.duplicateRootContent,
    contrast_results: geometry.contrastResults,
    old_shell_present: geometry.oldShellPresent,
    path_choice_count: geometry.pathChoiceCount,
    dominant_action_count: geometry.dominantActionCount,
    course_title: geometry.courseTitle,
    phase_button_count: geometry.phaseButtonCount,
    mobile_phase_option_count: geometry.mobilePhaseOptionCount,
    level_card_count: geometry.levelCardCount,
    level_sequence_count: geometry.sequenceCount,
    planned_start_count: geometry.plannedStartCount,
    raw_internal_id_present: geometry.rawInternalIdPresent,
    zero_count_copy_present: geometry.zeroCountCopyPresent,
    mission_visual: geometry.missionVisual,
    pixel_content_bounds: pixelContentBounds
  };
  validateRecord(record, scenario);
  return record;
}

function validateRecord(record, scenario) {
  const mobile = scenario.viewport.mobile;
  const threshold = mobile ? 0.88 : 0.8;
  const approvedNarrow = /lesson-(see|predict|mission)|onboarding/.test(scenario.id);
  if (!approvedNarrow && record.content_width_ratio < threshold) {
    throw new Error(`${scenario.id} active content uses ${Math.round(record.content_width_ratio * 100)}% of available width.`);
  }
  if (mobile && record.content_width_ratio < 0.88) throw new Error(`${scenario.id} mobile content width below 88%.`);
  if (record.horizontal_overflow) throw new Error(`${scenario.id} horizontal overflow detected.`);
  if (record.visible_navigation_count !== 5) throw new Error(`${scenario.id} expected one visible navigation with five tabs.`);
  if (record.fixed_bottom_navigation_count > 1) throw new Error(`${scenario.id} duplicate fixed nav in full-page capture risk.`);
  if (record.active_view_count !== 1 || record.duplicate_root_content) throw new Error(`${scenario.id} duplicated root content detected.`);
  if (record.old_shell_present) throw new Error(`${scenario.id} old shell classes are still present in the active product DOM.`);
  if (/onboarding/.test(scenario.id) && record.path_choice_count !== 3) throw new Error(`${scenario.id} expected exactly three path choices.`);
  if (/home/.test(scenario.id) && !/onboarding/.test(scenario.id)) {
    if (record.dominant_action_count !== 1) throw new Error(`${scenario.id} expected one dominant mission action.`);
    if (record.hero_rectangle.width < 320 || record.hero_rectangle.height < 220) throw new Error(`${scenario.id} mission hero is too small.`);
    if (!record.mission_visual.present || !record.mission_visual.src.includes("mission-studio-home-network.svg")) throw new Error(`${scenario.id} missing local mission visual asset.`);
    if (record.mission_visual.altLength < 30 || record.mission_visual.textLength < 40) throw new Error(`${scenario.id} mission visual lacks alt text or text alternative.`);
  }
  if (/course-phase|current-level|locked-planned/.test(scenario.id)) {
    if (scenario.expectedPhaseTitle && record.course_title !== scenario.expectedPhaseTitle) {
      throw new Error(`${scenario.id} course phase title mismatch: expected ${scenario.expectedPhaseTitle}, got ${record.course_title}.`);
    }
    if (mobile) {
      if (record.mobile_phase_option_count !== 10) throw new Error(`${scenario.id} mobile phase selector does not expose ten phases.`);
      if (record.phase_control_rectangle.width < 300 || record.phase_control_rectangle.height < 44) throw new Error(`${scenario.id} mobile phase selector is clipped or too small.`);
    } else if (record.phase_button_count !== 10) {
      throw new Error(`${scenario.id} desktop phase rail does not expose ten phases.`);
    }
    if (record.timeline_rectangle.width < 320 || record.timeline_rectangle.height < 220) throw new Error(`${scenario.id} timeline is too small for connected progression.`);
    if (record.context_rectangle.width < 260 || record.context_rectangle.height < 160) throw new Error(`${scenario.id} phase context panel is not useful enough.`);
    if (record.active_level_rectangle.width < 260 || record.active_level_rectangle.height < 80) throw new Error(`${scenario.id} active level is not visually present.`);
    if (record.raw_internal_id_present) throw new Error(`${scenario.id} raw internal IDs leaked into learner copy.`);
    if (record.zero_count_copy_present) throw new Error(`${scenario.id} zero-count learner copy leaked into Course.`);
  }
  if (/level-0-overview/.test(scenario.id)) {
    if (record.course_title !== scenario.expectedLevelTitle) throw new Error(`${scenario.id} level title mismatch: expected ${scenario.expectedLevelTitle}, got ${record.course_title}.`);
    if (record.hero_rectangle.width < 320 || record.hero_rectangle.height < 220) throw new Error(`${scenario.id} Level 0 hero is too small.`);
    if (record.level_sequence_count !== 8) throw new Error(`${scenario.id} Level 0 should render eight lessons, got ${record.level_sequence_count}.`);
    if (record.raw_internal_id_present || record.zero_count_copy_present) throw new Error(`${scenario.id} Level 0 overview leaked internal or zero-count copy.`);
  }
  if (/level-1-planned-overview/.test(scenario.id)) {
    if (record.course_title !== scenario.expectedLevelTitle) throw new Error(`${scenario.id} level title mismatch: expected ${scenario.expectedLevelTitle}, got ${record.course_title}.`);
    if (record.planned_start_count > 0) throw new Error(`${scenario.id} planned level false start: Start action is present.`);
    if (record.raw_internal_id_present || record.zero_count_copy_present) throw new Error(`${scenario.id} planned overview leaked internal or zero-count copy.`);
  }
  if (!mobile && (record.navigation_rectangle.width < 240 || record.navigation_rectangle.width > 264)) throw new Error(`${scenario.id} desktop sidebar width outside approved range.`);
  if (mobile && record.bottom_navigation_rectangle.height < 44) throw new Error(`${scenario.id} mobile bottom navigation is missing or too small.`);
  if (record.console_errors.length) throw new Error(`${scenario.id} console errors: ${record.console_errors.join("; ")}`);
  if (!record.contrast_results?.length) throw new Error(`${scenario.id} computed contrast audit did not run.`);
  const contrastFailures = record.contrast_results.filter((item) => item.ratio < item.minimum);
  if (contrastFailures.length) {
    throw new Error(`${scenario.id} computed contrast failed: ${contrastFailures.map((item) => `${item.selector} ${item.ratio}:${item.minimum}`).join(", ")}`);
  }
  const pixelWidth = record.pixel_content_bounds.right - record.pixel_content_bounds.left + 1;
  const geometryWidth = Math.max(1, record.active_root_rectangle.width);
  if (pixelWidth < Math.min(geometryWidth * 0.55, scenario.viewport.width * 0.5)) {
    throw new Error(`${scenario.id} screenshot metric mismatch: pixel bounds contradict active content geometry.`);
  }
}

async function navigateAndSeedPage(page, baseUrl, scenario) {
  await page.goto(`${baseUrl}/lab.html?seed=${encodeURIComponent(scenario.id)}`, { waitUntil: "domcontentloaded" });
  const seed = {
    path: scenario.seed.path || "",
    level0: level0State(scenario.seed.step || "mission"),
    recentTool: "diagnose"
  };
  if (scenario.seed.activity === "recent") {
    seed.level0.resume_timestamp = "2026-07-17T00:00:00.000Z";
    seed.level0.confidence_by_lesson[seed.level0.current_lesson_id] = "Growing";
  }
  await page.evaluate((payload) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("command-doctor.learning-path", payload.path);
    localStorage.setItem("command-doctor.level-0-progress", JSON.stringify(payload.level0));
    localStorage.setItem("command-doctor.recent-technician-tool", payload.recentTool);
  }, seed);
  await page.goto(`${baseUrl}/lab.html?scenario=${encodeURIComponent(scenario.id)}`, { waitUntil: "domcontentloaded" });
  await waitForAppReadyPage(page, scenario);
}

async function waitForAppReadyPage(page, scenario, { requireLessonVisual = false } = {}) {
  try {
    await page.waitForFunction(() => {
      const nav = [...document.querySelectorAll("[data-ms-primary-nav='true']")].slice(0, 5).map((item) => item.textContent.trim()).join("|");
      const active = document.querySelector(".view.active");
      const activeRoot = active?.querySelector("[id$='Root'], .history-list, .knowledge-grid") || active;
      return Boolean(window.CommandDoctorBeginnerExperience && window.CommandDoctorMissionStudioComponents && nav === "Home|Course|Practice|Progress|Tools" && activeRoot && activeRoot.children.length);
    }, null, { timeout: 15000 });
  } catch (error) {
    const diagnostic = await page.evaluate(() => {
      const nav = [...document.querySelectorAll("[data-ms-primary-nav='true']")].slice(0, 5).map((item) => item.textContent.trim()).join("|");
      const active = document.querySelector(".view.active");
      const activeRoot = active?.querySelector("[id$='Root'], .history-list, .knowledge-grid") || active;
      return {
        nav,
        active: active?.id || "",
        activeChildren: activeRoot?.children.length || 0,
        beginner: Boolean(window.CommandDoctorBeginnerExperience),
        components: Boolean(window.CommandDoctorMissionStudioComponents),
        bodyClass: document.body.className
      };
    }).catch(() => ({}));
    throw new Error(`${scenario.id} readiness timeout: ${JSON.stringify(diagnostic)} (${error.message})`);
  }
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all([...document.images].map((img) => new Promise((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(resolve, 750);
      const rect = img.getBoundingClientRect();
      const renderedSvg = /\.svg(?:$|\?)/i.test(img.currentSrc || img.src || "") && rect.width > 0 && rect.height > 0;
      if (img.complete || renderedSvg || !img.decode) {
        finish();
        return;
      }
      img.decode().then(finish).catch(finish);
    })));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await waitForStableGeometryPage(page);
  if (requireLessonVisual && /^(?:desktop|mobile)-lesson/.test(scenario.id)) {
    await page.locator(".mission-visual-panel img").first().scrollIntoViewIfNeeded({ timeout: 10000 });
    const visualReady = await page.waitForFunction(() => {
      const images = [...document.querySelectorAll(".mission-visual-panel img")].filter((img) => img.getBoundingClientRect().width > 0);
      return images.length > 0 && images.every((img) => {
        const rect = img.getBoundingClientRect();
        const renderedSvg = /\.svg(?:$|\?)/i.test(img.currentSrc || img.src || "") && rect.width > 0 && rect.height > 0;
        return img.complete && (img.naturalWidth > 0 || renderedSvg);
      });
    }, null, { timeout: 15000 }).then(() => true).catch(() => false);
    if (!visualReady) throw new Error(`${scenario.id} visual loading and image decode failed.`);
  }
}

async function waitForStableGeometryPage(page) {
  let previous = null;
  let stable = 0;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const metrics = await collectGeometryPage(page);
    const signature = JSON.stringify([
      Math.round(metrics.activeRootRect.left),
      Math.round(metrics.activeRootRect.top),
      Math.round(metrics.activeRootRect.width),
      Math.round(metrics.activeRootRect.height),
      Math.round(metrics.mainRect.width)
    ]);
    stable = signature === previous ? stable + 1 : 0;
    previous = signature;
    if (stable >= 2) return;
    await delay(80);
  }
  throw new Error("Initial render stability failed: active-root geometry did not settle.");
}

async function clickVisibleTextPage(page, text) {
  const control = page.locator("button:visible, summary:visible, a:visible").filter({ hasText: text }).first();
  await control.click({ timeout: 10000 });
  await waitForAppReadyPage(page, { id: text.toLowerCase(), seed: {} });
}

async function focusVisibleTextPage(page, text) {
  const control = page.locator("button:visible, summary:visible, a:visible").filter({ hasText: text }).first();
  await control.focus({ timeout: 10000 });
  await waitForAppReadyPage(page, { id: text.toLowerCase(), seed: {} });
}

async function selectPhasePage(page, phaseId) {
  const selected = await page.evaluate((value) => {
    const selector = document.querySelector(".ms-mobile-phase-selector select");
    if (selector) {
      selector.value = value;
      selector.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    const button = document.querySelector(`[data-phase-id="${value}"]`);
    if (!button) return false;
    button.click();
    return true;
  }, phaseId);
  if (!selected) throw new Error(`Could not select course phase: ${phaseId}`);
  await waitForAppReadyPage(page, { id: phaseId, seed: {} });
}

async function openLevelNumberPage(page, levelNumber) {
  const opened = await page.evaluate((value) => {
    const button = document.querySelector(`.ms-course-level-card[data-level-number="${value}"] .ms-button`);
    if (!button) return false;
    button.click();
    return true;
  }, levelNumber);
  if (!opened) throw new Error(`Could not open level number: ${levelNumber}`);
  await waitForAppReadyPage(page, { id: `level-${levelNumber}`, seed: {} });
}

async function focusSelectorPage(page, selector) {
  const focused = await page.evaluate((value) => {
    const node = document.querySelector(value);
    if (!node) return false;
    node.focus();
    return document.activeElement === node;
  }, selector);
  if (!focused) throw new Error(`Could not focus selector: ${selector}`);
  await waitForAppReadyPage(page, { id: selector, seed: {} });
}

async function collectGeometryPage(page) {
  return page.evaluate(() => {
    const rect = (node) => {
      const value = node?.getBoundingClientRect?.() || { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };
      return { left: value.left, top: value.top, width: value.width, height: value.height, right: value.right, bottom: value.bottom };
    };
    const active = document.querySelector(".view.active");
    const activeRoot = active?.querySelector("[id$='Root'], .history-list, .knowledge-grid, .admin-root") || active;
    const shell = document.querySelector(".ms-app-shell");
    const main = document.querySelector(".ms-shell-main") || document.querySelector(".main-panel");
    const visibleSidebar = [...document.querySelectorAll(".ms-desktop-sidebar, .ms-mobile-header")].find((item) => {
      const box = item.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && getComputedStyle(item).display !== "none";
    });
    const nav = visibleSidebar || document.querySelector(".sidebar");
    const hero = active?.querySelector(".ms-home-hero, .ms-level-hero");
    const bottomNav = document.querySelector(".ms-mobile-bottom-nav");
    const missionVisual = active?.querySelector(".ms-mission-visual img");
    const missionVisualText = active?.querySelector(".ms-mission-visual figcaption");
    const phaseControl = active?.querySelector(".ms-phase-rail, .ms-mobile-phase-selector");
    const timeline = active?.querySelector(".ms-level-timeline, .ms-level-mission-sequence");
    const contextPanel = active?.querySelector(".ms-phase-context, .ms-readiness-summary");
    const activeLevel = active?.querySelector(".ms-course-level-node.is-current, .ms-level-mission-sequence li.is-current");
    const courseTitle = active?.querySelector("#courseTitle")?.textContent?.trim() || "";
    const phaseButtonCount = active?.querySelectorAll("[data-phase-id]").length || 0;
    const mobilePhaseOptionCount = active?.querySelectorAll(".ms-mobile-phase-selector option").length || 0;
    const levelCardCount = active?.querySelectorAll(".ms-course-level-card").length || 0;
    const sequenceCount = active?.querySelectorAll(".ms-level-mission-sequence li").length || 0;
    const plannedStartCount = [...(active?.querySelectorAll(".is-planned .ms-button, .ms-planned-level-notice .ms-button") || [])]
      .filter((button) => /^start\b/i.test(button.textContent.trim())).length;
    const rawInternalIdPresent = /level_\d\d|phase_\d\d/.test(active?.textContent || "");
    const zeroCountCopyPresent = /0 commands|0 mapped commands/i.test(active?.textContent || "");
    const activeNav = [...document.querySelectorAll("[data-ms-primary-nav='true']")].filter((item) => {
      const box = item.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && getComputedStyle(item).display !== "none";
    });
    const activeViewCount = [...document.querySelectorAll(".view.active")].length;
    const fixedBottomNavCount = [...document.querySelectorAll(".ms-mobile-bottom-nav")].filter((item) => {
      const box = item.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && getComputedStyle(item).position === "fixed";
    }).length;
    const duplicateRootContent = [...document.querySelectorAll(".view.active [id$='Root']")].filter((item) => item.children.length > 0).length > 1;
    const focused = document.activeElement;
    const colorParts = (value) => {
      const match = String(value || "").match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    };
    const backgroundFor = (node) => {
      let cursor = node;
      while (cursor) {
        const bg = colorParts(getComputedStyle(cursor).backgroundColor);
        if (bg && bg.a !== 0) return bg;
        cursor = cursor.parentElement;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    };
    const channel = (value) => {
      const normalized = value / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (color) => (0.2126 * channel(color.r)) + (0.7152 * channel(color.g)) + (0.0722 * channel(color.b));
    const contrastRatio = (fg, bg) => {
      const first = luminance(fg);
      const second = luminance(bg);
      return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    };
    const contrastResults = [".ms-content-header h2", ".ms-home-section p", ".ms-button-primary", ".ms-button-secondary", ".nav-tab.active", ".ms-kicker"].map((selector) => {
      const node = active?.querySelector(selector) || document.querySelector(selector);
      if (!node) return null;
      const style = getComputedStyle(node);
      const fg = colorParts(style.color);
      const bg = backgroundFor(node);
      const weight = Number.parseInt(style.fontWeight, 10) || 400;
      const size = Number.parseFloat(style.fontSize) || 16;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      return fg && bg ? { selector, ratio: Number(contrastRatio(fg, bg).toFixed(2)), minimum: large ? 3 : 4.5 } : null;
    }).filter(Boolean);
    const viewportWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const rootRect = rect(activeRoot);
    const mainRect = rect(main);
    const availableMainWidth = Math.max(1, Math.min(mainRect.width || viewportWidth, viewportWidth));
    return {
      activeViewId: active?.id || "",
      activeRootSelector: activeRoot?.id ? "#" + activeRoot.id : "." + [...(activeRoot?.classList || [])].join("."),
      shellRect: rect(shell),
      activeRootRect: rootRect,
      mainRect,
      navigationRect: rect(nav),
      heroRect: rect(hero),
      phaseControlRect: rect(phaseControl),
      timelineRect: rect(timeline),
      contextRect: rect(contextPanel),
      activeLevelRect: rect(activeLevel),
      bottomNavigationRect: rect(bottomNav),
      documentScrollWidth: scrollWidth,
      documentClientWidth: viewportWidth,
      viewportHeight: window.innerHeight,
      horizontalOverflow: scrollWidth > viewportWidth + 1,
      focusedElement: focused ? [focused.tagName.toLowerCase(), focused.id ? "#" + focused.id : "", focused.className ? "." + String(focused.className).split(/\s+/).filter(Boolean).join(".") : ""].join("") : "",
      visibleNavigationCount: activeNav.length,
      fixedBottomNavCount,
      activeViewCount,
      duplicateRootContent,
      contrastResults,
      contentWidthRatio: rootRect.width / availableMainWidth,
      oldShellPresent: Boolean(document.querySelector(".app-shell, .sidebar, .main-panel, .nav-tabs, .status-stack")),
      pathChoiceCount: active?.querySelectorAll("[data-path-choice]").length || 0,
      dominantActionCount: active?.querySelectorAll("[data-dominant-action='true']").length || 0,
      courseTitle,
      phaseButtonCount,
      mobilePhaseOptionCount,
      levelCardCount,
      sequenceCount,
      plannedStartCount,
      rawInternalIdPresent,
      zeroCountCopyPresent,
      missionVisual: {
        present: Boolean(missionVisual),
        src: missionVisual?.getAttribute("src") || "",
        altLength: missionVisual?.getAttribute("alt")?.length || 0,
        textLength: missionVisualText?.textContent?.trim().length || 0
      }
    };
  });
}

async function captureScenarioPage(page, scenario, runDir, consoleErrors) {
  for (const step of scenario.steps) {
    if (step.click) await clickVisibleTextPage(page, step.click);
    if (step.focus) await focusVisibleTextPage(page, step.focus);
    if (step.phaseId) await selectPhasePage(page, step.phaseId);
    if (step.openLevelNumber) await openLevelNumberPage(page, step.openLevelNumber);
    if (step.focusSelector) await focusSelectorPage(page, step.focusSelector);
  }
  if (scenario.scrollSelector) {
    await page.locator(scenario.scrollSelector).first().scrollIntoViewIfNeeded({ timeout: 10000 });
  }
  await waitForAppReadyPage(page, scenario, { requireLessonVisual: true });
  const geometry = await collectGeometryPage(page);
  const screenshotPath = path.join(runDir, "screenshots", `${scenario.id}.png`);
  const buffer = await page.screenshot({ path: screenshotPath, fullPage: false, animations: "disabled" });
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const pixelContentBounds = pngContentBounds(buffer);
  const record = {
    scenario_id: scenario.id,
    timestamp: new Date().toISOString(),
    viewport: { width: scenario.viewport.width, height: scenario.viewport.height },
    device_scale_factor: 1,
    screenshot_sha256: sha256,
    screenshot_path: path.relative(outDir, screenshotPath).replace(/\\/g, "/"),
    active_root_selector: geometry.activeRootSelector,
    shell_rectangle: geometry.shellRect,
    active_root_rectangle: geometry.activeRootRect,
    main_rectangle: geometry.mainRect,
    navigation_rectangle: geometry.navigationRect,
    hero_rectangle: geometry.heroRect,
    phase_control_rectangle: geometry.phaseControlRect,
    timeline_rectangle: geometry.timelineRect,
    context_rectangle: geometry.contextRect,
    active_level_rectangle: geometry.activeLevelRect,
    bottom_navigation_rectangle: geometry.bottomNavigationRect,
    document_scroll_width: geometry.documentScrollWidth,
    horizontal_overflow: geometry.horizontalOverflow,
    focused_element: geometry.focusedElement,
    console_errors: [...consoleErrors],
    content_width_ratio: geometry.contentWidthRatio,
    visible_navigation_count: geometry.visibleNavigationCount,
    fixed_bottom_navigation_count: geometry.fixedBottomNavCount,
    active_view_count: geometry.activeViewCount,
    duplicate_root_content: geometry.duplicateRootContent,
    contrast_results: geometry.contrastResults,
    old_shell_present: geometry.oldShellPresent,
    path_choice_count: geometry.pathChoiceCount,
    dominant_action_count: geometry.dominantActionCount,
    course_title: geometry.courseTitle,
    phase_button_count: geometry.phaseButtonCount,
    mobile_phase_option_count: geometry.mobilePhaseOptionCount,
    level_card_count: geometry.levelCardCount,
    level_sequence_count: geometry.sequenceCount,
    planned_start_count: geometry.plannedStartCount,
    raw_internal_id_present: geometry.rawInternalIdPresent,
    zero_count_copy_present: geometry.zeroCountCopyPresent,
    mission_visual: geometry.missionVisual,
    pixel_content_bounds: pixelContentBounds
  };
  validateRecord(record, scenario);
  return record;
}

async function runEvidencePlaywright(playwright, baseUrl, runIndex, browserPath) {
  const runDir = path.join(outDir, `run-${runIndex}`);
  await fs.mkdir(path.join(runDir, "screenshots"), { recursive: true });
  const browser = await playwright.chromium.launch({
    executablePath: browserPath,
    headless: !args.headed,
    args: ["--force-device-scale-factor=1", "--no-first-run", "--no-default-browser-check"]
  });
  const records = [];
  try {
    for (const scenario of scenarios) {
      const consoleErrors = [];
      const context = await browser.newContext({
        viewport: { width: scenario.viewport.width, height: scenario.viewport.height },
        deviceScaleFactor: 1,
        isMobile: scenario.viewport.mobile
      });
      const page = await context.newPage();
      page.on("console", (message) => {
        if (["error", "warning"].includes(message.type()) && !ignorableBrowserLog(message.text()) && !/Failed to load resource: the server responded with a status of 404/i.test(message.text())) consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => consoleErrors.push(error.message));
      page.on("response", (response) => {
        const url = response.url();
        if (response.status() >= 400 && !/favicon\.ico/i.test(url)) consoleErrors.push(`${response.status()} ${url}`);
      });
      try {
        await navigateAndSeedPage(page, baseUrl, scenario);
        records.push(await captureScenarioPage(page, scenario, runDir, consoleErrors));
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  await fs.writeFile(path.join(runDir, "metrics.json"), JSON.stringify(records, null, 2));
  return records;
}

function pngContentBounds(buffer) {
  const png = decodePng(buffer);
  const edge = pixelAt(png, png.width - 1, png.height - 1);
  const bounds = { left: png.width, top: png.height, right: 0, bottom: 0 };
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const pixel = pixelAt(png, x, y);
      if (Math.abs(pixel.r - edge.r) + Math.abs(pixel.g - edge.g) + Math.abs(pixel.b - edge.b) > 34 && pixel.a > 10) {
        bounds.left = Math.min(bounds.left, x);
        bounds.top = Math.min(bounds.top, y);
        bounds.right = Math.max(bounds.right, x);
        bounds.bottom = Math.max(bounds.bottom, y);
      }
    }
  }
  if (bounds.left > bounds.right) return { left: 0, top: 0, right: 0, bottom: 0 };
  return bounds;
}

function pixelAt(png, x, y) {
  const offset = (y * png.width + x) * 4;
  return { r: png.pixels[offset], g: png.pixels[offset + 1], b: png.pixels[offset + 2], a: png.pixels[offset + 3] };
}

function decodePng(buffer) {
  if (buffer.toString("ascii", 1, 4) !== "PNG") throw new Error("Screenshot is not a PNG.");
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 6;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      colorType = data[9];
      if (bitDepth !== 8 || ![2, 6].includes(colorType)) throw new Error(`Unsupported PNG format: depth ${bitDepth}, color ${colorType}`);
    }
    if (type === "IDAT") idat.push(data);
    if (type === "IEND") break;
    offset += length + 12;
  }
  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bytesPerPixel;
  const rgba = Buffer.alloc(width * height * 4);
  let source = 0;
  let previous = Buffer.alloc(stride);
  let outputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[source++];
    const row = Buffer.from(inflated.subarray(source, source + stride));
    source += stride;
    unfilter(row, previous, bytesPerPixel, filter);
    for (let x = 0; x < width; x += 1) {
      const rowOffset = x * bytesPerPixel;
      rgba[outputOffset++] = row[rowOffset];
      rgba[outputOffset++] = row[rowOffset + 1];
      rgba[outputOffset++] = row[rowOffset + 2];
      rgba[outputOffset++] = colorType === 6 ? row[rowOffset + 3] : 255;
    }
    previous = row;
  }
  return { width, height, pixels: rgba };
}

function unfilter(row, previous, bytesPerPixel, filter) {
  for (let index = 0; index < row.length; index += 1) {
    const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0;
    const up = previous[index] || 0;
    const upLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] || 0 : 0;
    if (filter === 1) row[index] = (row[index] + left) & 255;
    else if (filter === 2) row[index] = (row[index] + up) & 255;
    else if (filter === 3) row[index] = (row[index] + Math.floor((left + up) / 2)) & 255;
    else if (filter === 4) row[index] = (row[index] + paeth(left, up, upLeft)) & 255;
    else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);
  }
}

function paeth(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
}

async function runEvidence(baseUrl, runIndex, browserPath) {
  const runDir = path.join(outDir, `run-${runIndex}`);
  await fs.mkdir(path.join(runDir, "screenshots"), { recursive: true });
  const { browser, profile, port } = await launchBrowser(browserPath);
  const stderr = [];
  browser.stderr.on("data", (chunk) => stderr.push(chunk.toString()));
  const records = [];
  try {
    for (const scenario of scenarios) {
      const consoleErrors = [];
      const client = await newPage(port, "about:blank");
      try {
        await configurePage(client, scenario.viewport, consoleErrors);
        await navigateAndSeed(client, baseUrl, scenario);
        records.push(await captureScenario(client, scenario, runDir, consoleErrors));
      } finally {
        await client.close();
      }
    }
  } finally {
    browser.kill();
    await waitForExit(browser);
    if (!args["keep-profile"]) await removeProfile(profile);
  }
  await fs.writeFile(path.join(runDir, "metrics.json"), JSON.stringify(records, null, 2));
  await fs.writeFile(path.join(runDir, "browser-stderr.txt"), stderr.join(""));
  return records;
}

function compareRuns(runs) {
  if (runs.length < 2) return { equivalent: true, comparisons: [] };
  const baseline = new Map(runs[0].map((record) => [record.scenario_id, record]));
  const comparisons = [];
  const errors = [];
  for (let runIndex = 1; runIndex < runs.length; runIndex += 1) {
    for (const record of runs[runIndex]) {
      const base = baseline.get(record.scenario_id);
      const delta = {
        scenario_id: record.scenario_id,
        run: runIndex + 1,
        geometry_delta: Math.abs(record.active_root_rectangle.width - base.active_root_rectangle.width) + Math.abs(record.active_root_rectangle.left - base.active_root_rectangle.left),
        pixel_width_delta: Math.abs((record.pixel_content_bounds.right - record.pixel_content_bounds.left) - (base.pixel_content_bounds.right - base.pixel_content_bounds.left)),
        screenshot_hash_match: record.screenshot_sha256 === base.screenshot_sha256
      };
      comparisons.push(delta);
      if (delta.geometry_delta > 2 || delta.pixel_width_delta > 4) errors.push(`${record.scenario_id} run ${runIndex + 1} geometry or pixel bounds drifted.`);
    }
  }
  return { equivalent: errors.length === 0, comparisons, errors };
}

const serverInfo = externalBaseUrl ? { server: null, baseUrl: externalBaseUrl } : await startStaticServer(clientRoot);
try {
  await fs.mkdir(outDir, { recursive: true });
  const browserPath = await findBrowser();
  const playwright = await loadPlaywright();
  const runs = [];
  for (let index = 1; index <= repeat; index += 1) {
    runs.push(playwright
      ? await runEvidencePlaywright(playwright, serverInfo.baseUrl, index, browserPath)
      : await runEvidence(serverInfo.baseUrl, index, browserPath));
  }
  const comparison = compareRuns(runs);
  const manifest = {
    status: comparison.equivalent ? "passed" : "failed",
    client_root: clientRoot,
    external_base_url: externalBaseUrl || "",
    browser_path: browserPath,
    automation_stack: playwright ? "playwright" : "chrome-devtools-protocol",
    output_dir: outDir,
    scenario_count: scenarios.length,
    repeat,
    review_failure_guards: reviewFailureGuards,
    screenshot_metric_binding: true,
    viewport_screenshots_only: true,
    comparison
  };
  await fs.writeFile(path.join(outDir, "binding-manifest.json"), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(outDir, "responsive-geometry-report.json"), JSON.stringify(comparison, null, 2));
  if (!comparison.equivalent) throw new Error(comparison.errors.join("; "));
  console.log(JSON.stringify(manifest, null, 2));
} finally {
  if (serverInfo.server) serverInfo.server.close();
}
