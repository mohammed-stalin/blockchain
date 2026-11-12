const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

test("Pages bundle loads all assets and the contract artifact below a repository path", async () => {
  const root = path.resolve(__dirname, "../dist");
  const expected = [
    ".nojekyll", "app-config.js", "app.js", "deployment-artifact.json",
    "index.html", "styles.css", "vendor/ethers.js", "vendor/ethers.LICENSE.md"
  ];
  const actual = fs.readdirSync(root, { recursive: true })
    .filter(file => fs.statSync(path.join(root, file)).isFile())
    .map(file => file.replaceAll("\\", "/")).sort();
  assert.deepEqual(actual, [...expected].sort(), "Publish only the public bundle");
  const server = http.createServer((req, res) => {
    const prefix = "/blockchain/";
    const name = req.url.startsWith(prefix) ? req.url.slice(prefix.length) || "index.html" : "";
    if (!expected.includes(name)) { res.writeHead(404); res.end(); return; }
    res.end(fs.readFileSync(path.join(root, name)));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const base = "http://127.0.0.1:" + server.address().port + "/blockchain/";
    const response = await fetch(base);
    assert.equal(response.status, 200);
    const html = await response.text();
    const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]);
    assert.ok(references.length >= 5);
    for (const reference of references) {
      assert.ok(reference.startsWith("./"), "Use a relative asset URL: " + reference);
      const url = new URL(reference, base);
      assert.ok(url.pathname.startsWith("/blockchain/"));
      assert.equal((await fetch(url)).status, 200, reference);
    }
    const app = await (await fetch(new URL("./app.js", base))).text();
    const artifactReference = app.match(/fetch\("([^"]+deployment-artifact\.json)"\)/);
    assert.ok(artifactReference, "App fetches the generated ABI and bytecode");
    const artifactURL = new URL(artifactReference[1], base);
    assert.equal(artifactURL.pathname, "/blockchain/deployment-artifact.json");
    const artifact = await (await fetch(artifactURL)).json();
    assert.equal(artifact.contractName, "MiniSocial");
    assert.ok(artifact.bytecode.startsWith("0x"));
    const config = await (await fetch(new URL("./app-config.js", base))).text();
    assert.ok(config.includes("11155111"), "Keep Sepolia configured");
    assert.equal((await fetch(new URL("../.env", base))).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
