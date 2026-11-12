const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const artifact = require(path.join(root, "artifacts/contracts/MiniSocial.sol/MiniSocial.json"));
fs.writeFileSync(path.join(root, "deployment-artifact.json"), JSON.stringify({
  contractName: artifact.contractName,
  abi: artifact.abi,
  bytecode: artifact.bytecode
}, null, 2) + "\n");
console.log("MiniSocial ABI and deployment bytecode are ready.");
