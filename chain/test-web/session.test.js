const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const first = "0x1111111111111111111111111111111111111111";
const second = "0x2222222222222222222222222222222222222222";
const address = "0x3333333333333333333333333333333333333333";
function setup() {
  const nodes = new Map(), calls = [], listeners = {}, reactions = [];
  let selected = first, pickerError;
  function element() {
    return {
      textContent: "", value: "", hidden: false, disabled: false, dataset: {}, children: [],
      listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; },
      replaceChildren(...children) { this.children = children; },
      append(...children) { this.children.push(...children); },
      setAttribute() {}, querySelector() { return null; }
    };
  }
  const get = id => {
    if (!nodes.has(id)) nodes.set(id, element());
    return nodes.get(id);
  };
  const storage = new Map([["minisocial.contract.11155111", address]]);
  const ethereum = {
    on(name, fn) { listeners[name] = fn; },
    async request({ method }) {
      calls.push(method);
      if (method === "wallet_requestPermissions") {
        if (pickerError) throw pickerError;
        listeners.accountsChanged([selected]);
        return [];
      }
      if (method === "eth_chainId") return "0xaa36a7";
      if (method === "eth_accounts" || method === "eth_requestAccounts") return [selected];
      throw new Error("Unexpected RPC: " + method);
    }
  };
  class BrowserProvider {
    async getSigner() { const who = selected; return { getAddress: async () => who }; }
    async getBalance() { return 1n; }
    async getCode() { return "0x1234"; }
  }
  class Contract {
    constructor(_, abi, signer) { this.signer = signer; }
    async TWEET_MAX_LENGTH() { return 280n; }
    async MAX_PAGE_SIZE() { return 50n; }
    async getPosts() { return [{ id: 0n, author: first, content: "Hello", timestamp: 1n, likes: 0n }]; }
    async getTotalPosts() { return 1n; }
    async hasLiked(id, who) { reactions.push(who); return who === first; }
    async likePost() { calls.push("like:" + await this.signer.getAddress()); return { hash: "0xtx", wait: async () => {} }; }
  }
  const context = vm.createContext({
    window: { ethereum, ethers: {}, MINISOCIAL_CONFIG: { chainId: 11155111, preferredWallet: first } },
    document: { getElementById: get, createElement: element, querySelectorAll: () => [] },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    ethers: { BrowserProvider, Contract, isAddress: value => /^0x[0-9a-f]{40}$/i.test(value), getAddress: x => x,
      ZeroAddress: "0x0000000000000000000000000000000000000000", formatEther: () => "1" },
    fetch: async () => ({ ok: true, json: async () => ({ abi: [] }) }), TextEncoder
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../app.js"), "utf8"), context);
  return { get, calls, reactions, storage, listeners,
    select(who) { selected = who; }, reject(error) { pickerError = error; },
    async click(id) { await get(id).listeners.click(); } };
}

test("logout clears the session and reconnecting lets a second account like the same post", async () => {
  const app = setup();
  await app.click("connect");
  assert.equal(app.get("logout").hidden, false);
  app.get("postContent").value = "Private draft";
  await app.click("myPosts");
  await app.click("logout");
  assert.equal(app.get("connect").hidden, false);
  assert.equal(app.get("logout").hidden, true);
  assert.equal(app.get("publish").disabled, true);
  assert.equal(app.get("postContent").value, "");
  assert.equal(app.get("posts").children.length, 0);
  assert.equal(app.get("contractAddress").value, address);
  assert.equal(app.storage.get("minisocial.contract.11155111"), address);
  app.select(second);
  await app.click("connect");
  assert.equal(app.get("feedLabel").textContent.startsWith("Everyone"), true);
  assert.equal(app.reactions.at(-1), second);
  const actions = app.get("posts").children[0].children[3];
  assert.equal(actions.children.length, 2, "Second account cannot delete the author's post");
  assert.equal(actions.children[1].textContent, "Like");
  await actions.children[1].listeners.click();
  assert.ok(app.calls.includes("like:" + second));
  assert.equal(app.calls.filter(x => x === "wallet_requestPermissions").length, 2);
});

test("switch account connects with the selected signer", async () => {
  const app = setup();
  await app.click("connect");
  app.select(second);
  await app.click("switchAccount");
  assert.equal(app.reactions.at(-1), second);
  assert.equal(app.get("deploy").disabled, true);
  assert.equal(app.get("publish").disabled, false);
});

test("cancelled account selection leaves the app logged out", async () => {
  const app = setup();
  await app.click("connect");
  app.reject({ code: 4001, message: "User rejected request" });
  await app.click("switchAccount");
  assert.equal(app.get("connect").hidden, false);
  assert.equal(app.get("publish").disabled, true);
  assert.equal(app.get("status").dataset.error, "true");
});

test("wallets without the permissions API can still connect", async () => {
  const app = setup();
  app.reject({ code: 4200 });
  await app.click("connect");
  assert.equal(app.get("logout").hidden, false);
  app.listeners.accountsChanged([]);
  assert.equal(app.get("publish").disabled, true);
  assert.equal(app.get("logout").hidden, true);
});
