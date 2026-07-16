import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const clientFlag = args.indexOf("--client");
const client = path.resolve(root, clientFlag === -1 ? ".review-build/mission-studio/client" : args[clientFlag + 1]);
const normalise = (reference) => reference.split("?")[0].replace(/^\.\//, "");
const assert = (condition, message) => {
  if (!condition) throw new Error(`Isolated startup test failed: ${message}`);
};
const contentType = (target) => target.endsWith(".json") ? "application/json" : target.endsWith(".js") ? "application/javascript" : target.endsWith(".css") ? "text/css" : "text/html";

const server = http.createServer(async (request, response) => {
  const requested = new URL(request.url, "http://127.0.0.1").pathname;
  const relative = requested === "/" ? "index.html" : decodeURIComponent(requested).replace(/^\//, "");
  const target = path.resolve(client, relative);
  if (!target.startsWith(client)) {
    response.writeHead(403).end();
    return;
  }
  try {
    response.writeHead(200, { "content-type": contentType(target) });
    response.end(await fs.readFile(target));
  } catch {
    response.writeHead(404).end();
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

try {
  const rootResponse = await fetch(`${base}/`);
  assert(rootResponse.ok, "root URL loads from isolated client");
  const index = await rootResponse.text();
  assert(index.includes('location.replace("lab.html")'), "root redirects to current lab entry");
  const labResponse = await fetch(`${base}/lab.html`);
  assert(labResponse.ok, "current lab entry loads");
  const lab = await labResponse.text();
  const assets = [
    ...[...lab.matchAll(/<(?:script)[^>]+\bsrc=["']([^"']+)["']/gi)].map((match) => normalise(match[1])),
    ...[...lab.matchAll(/<(?:link)[^>]+\bhref=["']([^"']+)["']/gi)].map((match) => normalise(match[1]))
  ];
  for (const asset of assets) assert((await fetch(`${base}/${asset}`)).ok, `active asset loads: ${asset}`);
  const appSource = await (await fetch(`${base}/src/app-release-21.js`)).text();
  const data = [...new Set([...appSource.matchAll(/["'](data\/[A-Za-z0-9_./-]+\.json)["']/g)].map((match) => match[1]))];
  for (const asset of data) {
    const response = await fetch(`${base}/${asset}`);
    assert(response.ok, `runtime data loads: ${asset}`);
    JSON.parse(await response.text());
  }
  console.log(JSON.stringify({
    suite: "isolated startup",
    status: "passed",
    client,
    root: `${base}/`,
    active_assets: assets.length,
    runtime_json: data.length,
    passed: 3 + assets.length + data.length
  }));
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
