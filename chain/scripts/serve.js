const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const routes = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/app-config.js": ["app-config.js", "text/javascript; charset=utf-8"],
  "/deployment-artifact.json": ["deployment-artifact.json", "application/json"],
  "/vendor/ethers.js": ["node_modules/ethers/dist/ethers.umd.min.js", "text/javascript; charset=utf-8"]
};
const server = http.createServer((req, res) => {
  const route = routes[req.url.split("?")[0]];
  if (!route || !["GET", "HEAD"].includes(req.method)) {
    res.writeHead(404); res.end("Not found"); return;
  }
  fs.readFile(path.join(root, route[0]), (error, content) => {
    if (error) { res.writeHead(503); res.end("Run npm run prepare:app first."); return; }
    res.writeHead(200, {
      "Content-Type": route[1],
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    });
    res.end(req.method === "HEAD" ? undefined : content);
  });
});
if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  server.listen(port, "127.0.0.1", () => console.log("MiniSocial: http://127.0.0.1:" + port));
}
module.exports = server;
