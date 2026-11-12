// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @notice A small public feed. Deletion hides a post from the current feed;
/// transactions and historical chain data remain public.
contract MiniSocial {
    uint256 public constant TWEET_MAX_LENGTH = 280;
    uint256 public constant MAX_PAGE_SIZE = 50;

    struct Post {
        uint256 id;
        address author;
        string content;
        uint256 timestamp;
        uint256 likes;
        bool deleted;
    }

    Post[] private posts;
    mapping(address => uint256[]) private authorPosts;
    mapping(uint256 => mapping(address => bool)) public hasLiked;

    event PostPublished(uint256 indexed id, address indexed author, string content);
    event PostDeleted(uint256 indexed id, address indexed author);
    event ReactionChanged(uint256 indexed id, address indexed account, bool liked);

    function publishPost(string calldata message) external {
        uint256 length = bytes(message).length;
        require(length > 0 && length <= TWEET_MAX_LENGTH, "Post must be 1-280 bytes");
        uint256 id = posts.length;
        posts.push(Post(id, msg.sender, message, block.timestamp, 0, false));
        authorPosts[msg.sender].push(id);
        emit PostPublished(id, msg.sender, message);
    }

    function getPost(uint256 id) public view returns (Post memory) {
        require(id < posts.length, "Post does not exist");
        return posts[id];
    }

    /// @notice Counts include deleted entries to keep pagination stable.
    /// address(0) selects the global feed.
    function getTotalPosts(address author) external view returns (uint256) {
        return author == address(0) ? posts.length : authorPosts[author].length;
    }

    /// @notice Newest first. Clients hide entries with deleted=true.
    function getPosts(address author, uint256 offset, uint256 limit)
        external view returns (Post[] memory page)
    {
        require(limit > 0 && limit <= MAX_PAGE_SIZE, "Page size must be 1-50");
        uint256 total = author == address(0) ? posts.length : authorPosts[author].length;
        if (offset >= total) return new Post[](0);
        uint256 count = total - offset;
        if (count > limit) count = limit;
        page = new Post[](count);
        for (uint256 i; i < count; ++i) {
            uint256 position = total - 1 - offset - i;
            uint256 id = author == address(0) ? position : authorPosts[author][position];
            page[i] = posts[id];
        }
    }

    function likePost(uint256 id) external {
        require(id < posts.length && !posts[id].deleted, "Post unavailable");
        require(!hasLiked[id][msg.sender], "Already liked");
        hasLiked[id][msg.sender] = true;
        posts[id].likes++;
        emit ReactionChanged(id, msg.sender, true);
    }

    /// @notice Dislike removes this wallet's own like.
    function dislikePost(uint256 id) external {
        require(id < posts.length && !posts[id].deleted, "Post unavailable");
        require(hasLiked[id][msg.sender], "No like to remove");
        hasLiked[id][msg.sender] = false;
        posts[id].likes--;
        emit ReactionChanged(id, msg.sender, false);
    }

    function deletePost(uint256 id) external {
        require(id < posts.length && !posts[id].deleted, "Post unavailable");
        require(posts[id].author == msg.sender, "Only the author can delete");
        posts[id].deleted = true;
        posts[id].content = "";
        emit PostDeleted(id, msg.sender);
    }
}
