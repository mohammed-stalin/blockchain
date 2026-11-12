const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MiniSocialModule", (m) => {
  const miniSocial = m.contract("MiniSocial");
  return { miniSocial };
});
