const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.resolve(root, "dist");
if (path.dirname(output) !== root) throw new Error("Build output must be inside chain.");

const files = [
  ["index.html", "index.html"],
  ["styles.css", "styles.css"],
  ["app.js", "app.js"],
  ["app-config.js", "app-config.js"],
  ["deployment-artifact.json", "deployment-artifact.json"],
  ["node_modules/ethers/dist/ethers.umd.min.js", "vendor/ethers.js"],
  ["node_modules/ethers/LICENSE.md", "vendor/ethers.LICENSE.md"]
];
// Use only these public files. Never copy the repository or environment files.
fs.mkdirSync(path.join(output, "vendor"), { recursive: true });
for (const [source, destination] of files) {
  fs.copyFileSync(path.join(root, source), path.join(output, destination));
}
fs.writeFileSync(path.join(output, ".nojekyll"), "");
console.log("GitHub Pages static app built in chain/dist.");
