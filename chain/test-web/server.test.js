const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const server = require("../scripts/serve");

test("local server serves the app and blocks non-public files", async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const origin = "http://127.0.0.1:" + server.address().port;
    for (const url of ["/", "/styles.css", "/app.js", "/app-config.js", "/vendor/ethers.js", "/deployment-artifact.json"]) {
      const response = await fetch(origin + url);
      assert.equal(response.status, 200, url);
      assert.ok((await response.text()).length > 0, url);
      assert.ok(response.headers.get("content-security-policy").includes("script-src 'self'"));
    }
    for (const url of ["/package.json", "/.env", "/contracts/MiniSocial.sol", "/..%2F.env", "/.git/config"]) {
      assert.equal((await fetch(origin + url)).status, 404, url);
    }
    assert.equal((await fetch(origin + "/app.js", { method: "POST" })).status, 404);
    const artifact = await (await fetch(origin + "/deployment-artifact.json")).json();
    const compiled = JSON.parse(fs.readFileSync(path.join(__dirname, "../artifacts/contracts/MiniSocial.sol/MiniSocial.json")));
    assert.deepEqual(artifact.abi, compiled.abi);
    assert.equal(artifact.bytecode, compiled.bytecode);
    const functions = artifact.abi.filter(entry => entry.type === "function").map(entry => entry.name);
    for (const name of ["publishPost", "getPosts", "getTotalPosts", "hasLiked", "likePost", "dislikePost", "deletePost"]) {
      assert.ok(functions.includes(name), name);
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
