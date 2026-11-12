const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("MiniSocial", function () {
  async function fixture() {
    const [alice, bob] = await ethers.getSigners();
    const social = await ethers.deployContract("MiniSocial");
    await social.waitForDeployment();
    return { social, alice, bob };
  }

  it("publishes with a stable id, author, content and timestamp", async function () {
    const { social, alice } = await loadFixture(fixture);
    await expect(social.publishPost("Hello Sepolia")).to.emit(social, "PostPublished").withArgs(0, alice.address, "Hello Sepolia");
    const post = await social.getPost(0);
    expect(post.author).to.equal(alice.address);
    expect(post.content).to.equal("Hello Sepolia");
    expect(post.timestamp).to.be.greaterThan(0);
    expect(post.likes).to.equal(0);
    expect(post.deleted).to.equal(false);
  });

  it("enforces the UTF-8 byte limit including multibyte text", async function () {
    const { social } = await loadFixture(fixture);
    await expect(social.publishPost("")).to.be.revertedWith("Post must be 1-280 bytes");
    await expect(social.publishPost("a".repeat(281))).to.be.revertedWith("Post must be 1-280 bytes");
    await social.publishPost("a".repeat(280));
    await social.publishPost("é".repeat(140));
    await expect(social.publishPost("é".repeat(141))).to.be.revertedWith("Post must be 1-280 bytes");
  });

  it("paginates global and author feeds newest first", async function () {
    const { social, alice, bob } = await loadFixture(fixture);
    await social.publishPost("first");
    await social.connect(bob).publishPost("second");
    await social.publishPost("third");
    expect((await social.getPosts(ethers.ZeroAddress, 0, 2)).map(p => p.id)).to.deep.equal([2n, 1n]);
    expect((await social.getPosts(ethers.ZeroAddress, 2, 2)).map(p => p.id)).to.deep.equal([0n]);
    expect((await social.getPosts(alice.address, 0, 20)).map(p => p.id)).to.deep.equal([2n, 0n]);
    expect(await social.getTotalPosts(ethers.ZeroAddress)).to.equal(3);
    expect(await social.getTotalPosts(bob.address)).to.equal(1);
    expect(await social.getPosts(bob.address, 10, 20)).to.have.length(0);
  });

  it("bounds page size and handles huge offsets", async function () {
    const { social } = await loadFixture(fixture);
    await expect(social.getPosts(ethers.ZeroAddress, 0, 0)).to.be.revertedWith("Page size must be 1-50");
    await expect(social.getPosts(ethers.ZeroAddress, 0, 51)).to.be.revertedWith("Page size must be 1-50");
    expect(await social.getPosts(ethers.ZeroAddress, ethers.MaxUint256, 50)).to.have.length(0);
  });

  it("allows one like per wallet and removes only that wallet's like", async function () {
    const { social, alice, bob } = await loadFixture(fixture);
    await social.publishPost("hello");
    await expect(social.connect(bob).likePost(0)).to.emit(social, "ReactionChanged").withArgs(0, bob.address, true);
    await expect(social.connect(bob).likePost(0)).to.be.revertedWith("Already liked");
    await expect(social.dislikePost(0)).to.be.revertedWith("No like to remove");
    await social.likePost(0);
    expect((await social.getPost(0)).likes).to.equal(2);
    await expect(social.connect(bob).dislikePost(0)).to.emit(social, "ReactionChanged").withArgs(0, bob.address, false);
    expect((await social.getPost(0)).likes).to.equal(1);
    expect(await social.hasLiked(0, alice.address)).to.equal(true);
    expect(await social.hasLiked(0, bob.address)).to.equal(false);
    await expect(social.connect(bob).dislikePost(0)).to.be.revertedWith("No like to remove");
    await social.connect(bob).likePost(0);
    expect((await social.getPost(0)).likes).to.equal(2);
  });

  it("restricts deletion to the author and preserves other post ids", async function () {
    const { social, alice, bob } = await loadFixture(fixture);
    await social.publishPost("first");
    await social.connect(bob).publishPost("second");
    await expect(social.connect(bob).deletePost(0)).to.be.revertedWith("Only the author can delete");
    await expect(social.deletePost(0)).to.emit(social, "PostDeleted").withArgs(0, alice.address);
    const deleted = await social.getPost(0);
    expect(deleted.deleted).to.equal(true);
    expect(deleted.content).to.equal("");
    expect((await social.getPost(1)).content).to.equal("second");
    await social.publishPost("third");
    expect((await social.getPost(2)).id).to.equal(2);
    expect(await social.getTotalPosts(ethers.ZeroAddress)).to.equal(3);
    expect((await social.getPosts(ethers.ZeroAddress, 0, 3)).map(p => p.id)).to.deep.equal([2n, 1n, 0n]);
  });

  it("rejects reactions and repeated deletion on deleted posts", async function () {
    const { social } = await loadFixture(fixture);
    await social.publishPost("hello");
    await social.likePost(0);
    await social.deletePost(0);
    await expect(social.likePost(0)).to.be.revertedWith("Post unavailable");
    await expect(social.dislikePost(0)).to.be.revertedWith("Post unavailable");
    await expect(social.deletePost(0)).to.be.revertedWith("Post unavailable");
  });

  it("rejects unknown post ids", async function () {
    const { social } = await loadFixture(fixture);
    await expect(social.getPost(0)).to.be.revertedWith("Post does not exist");
    await expect(social.likePost(0)).to.be.revertedWith("Post unavailable");
    await expect(social.dislikePost(0)).to.be.revertedWith("Post unavailable");
    await expect(social.deletePost(0)).to.be.revertedWith("Post unavailable");
  });
});
