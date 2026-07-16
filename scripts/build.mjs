import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const parseOutDir = (argv = []) => {
  const flagIndex = argv.indexOf("--out-dir");
  if (flagIndex === -1) return path.join(root, "dist");
  const value = argv[flagIndex + 1];
  if (!value || value.startsWith("--")) throw new Error("--out-dir requires a directory path");
  return path.resolve(root, value);
};

export const publicEntries = [
  "index.html",
  "lab.html",
  "refresh.html",
  "recover.html",
  "styles.css",
  "mission-studio.css",
  "sw.js",
  "sw-refresh.js",
  "sw-recover.js",
  "src",
  "data"
];

const worker = `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      url.pathname = "/index.html";
    }
    return env.ASSETS.fetch(new Request(url, request));
  }
};
`;

const exists = async (target) => stat(target).then(() => true).catch(() => false);
const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return nested.flat();
};
const normaliseReference = (reference) => reference.split("?")[0].replace(/^\.\//, "");
const fail = (message) => { throw new Error(`Build integrity check failed: ${message}`); };

export async function buildCommandDoctor({ outDir = path.join(root, "dist") } = {}) {
  const dist = path.resolve(root, outDir);
  const client = path.join(dist, "client");
  const server = path.join(dist, "server");

  await rm(dist, { recursive: true, force: true });
  await mkdir(client, { recursive: true });
  await mkdir(server, { recursive: true });

  for (const entry of publicEntries) {
    await cp(path.join(root, entry), path.join(client, entry), { recursive: true });
  }

  await writeFile(path.join(server, "index.js"), worker, "utf8");

  const htmlFiles = (await walk(client)).filter((file) => file.endsWith(".html"));
  const requiredData = new Set();
  for (const file of (await walk(path.join(client, "src"))).filter((entry) => entry.endsWith(".js"))) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/["'](data\/[A-Za-z0-9_./-]+\.json)["']/g)) requiredData.add(match[1]);
  }

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    const references = [
      ...[...html.matchAll(/<(?:script)[^>]+\bsrc=["']([^"']+)["']/gi)].map((match) => match[1]),
      ...[...html.matchAll(/<(?:link)[^>]+\bhref=["']([^"']+)["']/gi)].map((match) => match[1]),
      ...[...html.matchAll(/location\.replace\(["']([^"']+)["']\)/g)].map((match) => match[1])
    ];
    for (const reference of references) {
      if (/^(?:https?:|#|mailto:)/i.test(reference)) continue;
      const target = path.resolve(path.dirname(file), normaliseReference(reference));
      if (!target.startsWith(client) || !(await exists(target))) fail(`${path.relative(client, file)} references missing ${reference}`);
    }
  }

  for (const reference of requiredData) {
    if (!(await exists(path.join(client, reference)))) fail(`missing runtime data ${reference}`);
  }

  for (const file of (await walk(path.join(client, "data", "generated"))).filter((entry) => entry.endsWith(".json"))) {
    const source = await readFile(file, "utf8");
    try { JSON.parse(source); } catch { fail(`${path.relative(client, file)} is not valid JSON`); }
    if (/^(Exit code:|Wall time:|Total output lines:|Output:|stdout|stderr)/m.test(source)) fail(`${path.relative(client, file)} contains terminal output`);
  }

  return {
    build: "complete",
    output_dir: dist,
    client_dir: client,
    html_files: htmlFiles.map((file) => path.relative(client, file)),
    static_data_files: requiredData.size,
    public_entries: publicEntries
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await buildCommandDoctor({ outDir: parseOutDir(process.argv.slice(2)) })));
}
