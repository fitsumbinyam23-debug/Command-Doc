import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const client = path.join(dist, "client");
const server = path.join(dist, "server");

await rm(dist, { recursive: true, force: true });
await mkdir(client, { recursive: true });
await mkdir(server, { recursive: true });

for (const entry of ["index.html", "refresh.html", "styles.css", "sw.js", "sw-refresh.js", "src", "data"]) {
  await cp(path.join(root, entry), path.join(client, entry), { recursive: true });
}

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

await writeFile(path.join(server, "index.js"), worker, "utf8");
