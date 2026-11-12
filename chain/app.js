"use strict";
const config = window.MINISOCIAL_CONFIG;
const $ = (id) => document.getElementById(id);
const storageKey = "minisocial.contract." + config.chainId;
let provider, signer, account, contract, artifact;
let busy = false, feedAuthor = null, offset = 0, feedVersion = 0;
const preferred = config.preferredWallet.toLowerCase();
const actionIds = ["connect", "saveContract", "deploy", "publish", "refresh", "allPosts", "myPosts", "findAuthor", "loadMore"];

function status(message, error = false) {
  $("status").textContent = message;
  $("status").dataset.error = String(error);
}
function errorMessage(error) {
  return error.shortMessage || error.reason || error.message || "Something went wrong.";
}
function storedAddress() {
  try { return localStorage.getItem(storageKey) || ""; } catch { return ""; }
}
function rememberAddress(address) {
  try { localStorage.setItem(storageKey, address); } catch { /* Address still works this session. */ }
}
function syncControls() {
  actionIds.forEach((id) => { $(id).disabled = busy; });
  ["publish", "refresh", "allPosts", "myPosts", "findAuthor", "loadMore"].forEach((id) => {
    $(id).disabled = busy || !contract || !account;
  });
  $("deploy").disabled = busy || !account || account.toLowerCase() !== preferred;
  $("postContent").disabled = busy || !contract;
  document.querySelectorAll(".post-actions button").forEach((button) => { button.disabled = busy || !contract; });
}
async function task(fn) {
  if (busy) return;
  busy = true; syncControls();
  try { await fn(); } catch (error) { status(errorMessage(error), true); }
  finally { busy = false; syncControls(); }
}
async function assertSession() {
  const chain = Number(await window.ethereum.request({ method: "eth_chainId" }));
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  if (chain !== config.chainId) throw new Error("Switch MetaMask to Sepolia and reconnect.");
  if (!accounts[0] || accounts[0].toLowerCase() !== account?.toLowerCase()) {
    throw new Error("Your wallet changed. Reconnect before continuing.");
  }
}
async function attach(address) {
  contract = undefined;
  $("contractLink").hidden = true;
  feedVersion++;
  $("posts").replaceChildren();
  $("loadMore").hidden = true;
  await assertSession();
  if (!ethers.isAddress(address)) throw new Error("Enter a deployed MiniSocial contract address.");
  const normalized = ethers.getAddress(address.toLowerCase());
  if (await provider.getCode(normalized) === "0x") throw new Error("No contract exists at this address on Sepolia.");
  const candidate = new ethers.Contract(normalized, artifact.abi, signer);
  if (await candidate.TWEET_MAX_LENGTH() !== 280n || await candidate.MAX_PAGE_SIZE() !== 50n) {
    throw new Error("This address is not a compatible MiniSocial contract.");
  }
  await candidate.getPosts(ethers.ZeroAddress, 0, 1);
  contract = candidate;
  rememberAddress(normalized);
  $("contractAddress").value = normalized;
  $("contractLink").href = "https://sepolia.etherscan.io/address/" + normalized;
  $("contractLink").hidden = false;
  await loadPosts(true);
}
async function connect() {
  if (!window.ethereum) throw new Error("Install MetaMask, then open this page in that browser.");
  if (!window.ethers) throw new Error("Wallet library unavailable. Restart with npm start.");
  contract = undefined; account = undefined;
  await window.ethereum.request({ method: "eth_requestAccounts" });
  if (Number(await window.ethereum.request({ method: "eth_chainId" })) !== config.chainId) {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa36a7" }] });
  }
  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  account = await signer.getAddress();
  $("connect").textContent = account.slice(0, 6) + "…" + account.slice(-4);
  $("walletStatus").textContent = account.toLowerCase() === preferred ? "Your preferred wallet is connected." : "Another wallet is connected. Select your preferred wallet to deploy.";
  $("balance").textContent = Number(ethers.formatEther(await provider.getBalance(account))).toFixed(5) + " Sepolia ETH";
  const response = await fetch("./deployment-artifact.json");
  if (!response.ok) throw new Error("Run npm run prepare:app to generate the contract artifact.");
  artifact = await response.json();
  const address = $("contractAddress").value.trim();
  if (address) await attach(address);
  else status("Wallet connected. Deploy MiniSocial or enter an existing contract address.");
}
async function deploy() {
  await assertSession();
  if (account.toLowerCase() !== preferred) throw new Error("Select your preferred wallet in MetaMask to deploy.");
  status("Confirm the MiniSocial deployment in MetaMask. This costs Sepolia test ETH.");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  const deployed = await factory.deploy();
  status("Deployment submitted: " + deployed.deploymentTransaction().hash + ". Waiting for confirmation…");
  await deployed.waitForDeployment();
  const address = await deployed.getAddress();
  // Save a confirmed deployment even if the wallet changed while it was pending.
  rememberAddress(address);
  $("contractAddress").value = address;
  await assertSession();
  await attach(address);
  status("MiniSocial deployed on Sepolia: " + address);
}
function renderPost(post, liked) {
  const article = document.createElement("article");
  article.className = "post";
  const author = document.createElement("a");
  author.className = "post-author";
  author.href = "https://sepolia.etherscan.io/address/" + post.author;
  author.target = "_blank"; author.rel = "noopener noreferrer";
  author.textContent = post.author;
  const timestamp = document.createElement("time");
  const date = new Date(Number(post.timestamp) * 1000);
  timestamp.dateTime = date.toISOString(); timestamp.textContent = date.toLocaleString();
  const content = document.createElement("p");
  content.className = "post-content"; content.textContent = post.content;
  const actions = document.createElement("div");
  actions.className = "post-actions";
  const count = document.createElement("span"); count.textContent = post.likes.toString() + " likes";
  const like = document.createElement("button"); like.className = "secondary";
  like.textContent = liked ? "Remove like" : "Like";
  like.setAttribute("aria-pressed", String(liked));
  like.addEventListener("click", () => task(() => transact(() => liked ? contract.dislikePost(post.id) : contract.likePost(post.id), "Reaction updated.")));
  actions.append(count, like);
  if (post.author.toLowerCase() === account.toLowerCase()) {
    const remove = document.createElement("button"); remove.className = "secondary"; remove.textContent = "Delete";
    remove.addEventListener("click", () => {
      if (window.confirm("Hide this post from the feed? Its blockchain history will remain public.")) {
        task(() => transact(() => contract.deletePost(post.id), "Post deleted from the feed."));
      }
    });
    actions.append(remove);
  }
  article.append(author, timestamp, content, actions);
  return article;
}
async function loadPosts(reset) {
  await assertSession();
  const activeContract = contract, activeAccount = account;
  if (!activeContract) throw new Error("Choose a contract first.");
  const version = ++feedVersion;
  if (reset) { offset = 0; $("posts").replaceChildren(); }
  const selectedAuthor = feedAuthor || ethers.ZeroAddress;
  $("feedLabel").textContent = (feedAuthor ? "Posts by " + feedAuthor : "Everyone") + " · newest first";
  const [posts, total] = await Promise.all([
    activeContract.getPosts(selectedAuthor, offset, 20),
    activeContract.getTotalPosts(selectedAuthor)
  ]);
  const visible = posts.filter((post) => !post.deleted);
  const reactions = await Promise.all(visible.map((post) => activeContract.hasLiked(post.id, activeAccount)));
  if (version !== feedVersion || contract !== activeContract || account !== activeAccount) return;
  $("posts").querySelector(".empty")?.remove();
  visible.forEach((post, i) => $("posts").append(renderPost(post, reactions[i])));
  offset += posts.length;
  $("loadMore").hidden = BigInt(offset) >= total;
  if (!$("posts").children.length) {
    const empty = document.createElement("p"); empty.className = "empty";
    empty.textContent = BigInt(offset) < total ? "No visible posts on this page. Load more to continue." : "No posts yet. Start the conversation.";
    $("posts").append(empty);
  }
}
async function transact(send, message) {
  await assertSession();
  status("Confirm the transaction in MetaMask…");
  const tx = await send();
  status("Transaction submitted: " + tx.hash + ". Waiting for confirmation…");
  await tx.wait();
  await assertSession();
  await loadPosts(true);
  status(message);
}
function invalidate() {
  contract = undefined; account = undefined; signer = undefined; provider = undefined;
  feedVersion++;
  $("connect").textContent = "Reconnect wallet";
  $("walletStatus").textContent = "Wallet or network changed. Reconnect to continue.";
  $("balance").textContent = ""; $("contractLink").hidden = true;
  $("posts").replaceChildren(); $("loadMore").hidden = true;
  status("Wallet or network changed. Reconnect on Sepolia."); syncControls();
}
$("preferredWallet").textContent = config.preferredWallet;
$("contractAddress").value = storedAddress() || config.contractAddress;
$("connect").addEventListener("click", () => task(connect));
$("saveContract").addEventListener("click", () => task(async () => {
  if (!account) throw new Error("Connect your wallet first.");
  await attach($("contractAddress").value.trim()); status("MiniSocial contract connected.");
}));
$("deploy").addEventListener("click", () => task(deploy));
$("postContent").addEventListener("input", () => {
  $("counter").textContent = new TextEncoder().encode($("postContent").value).length + " / 280 bytes";
});
$("publish").addEventListener("click", () => task(async () => {
  const message = $("postContent").value.trim();
  const length = new TextEncoder().encode(message).length;
  if (!length || length > 280) throw new Error("Write a post between 1 and 280 UTF-8 bytes.");
  await transact(() => contract.publishPost(message), "Post published.");
  $("postContent").value = ""; $("counter").textContent = "0 / 280 bytes";
}));
$("refresh").addEventListener("click", () => task(() => loadPosts(true)));
$("loadMore").addEventListener("click", () => task(() => loadPosts(false)));
$("allPosts").addEventListener("click", () => task(async () => { feedAuthor = null; await loadPosts(true); }));
$("myPosts").addEventListener("click", () => task(async () => { feedAuthor = account; await loadPosts(true); }));
$("authorForm").addEventListener("submit", (event) => {
  event.preventDefault();
  task(async () => {
    const author = $("authorAddress").value.trim();
    if (!ethers.isAddress(author) || author.toLowerCase() === ethers.ZeroAddress) throw new Error("Enter a valid author wallet address.");
    feedAuthor = ethers.getAddress(author.toLowerCase()); await loadPosts(true);
  });
});
if (window.ethereum?.on) {
  window.ethereum.on("accountsChanged", invalidate);
  window.ethereum.on("chainChanged", invalidate);
}
syncControls();
