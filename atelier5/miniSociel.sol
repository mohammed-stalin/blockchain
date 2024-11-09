// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

contract MiniSocial {

    uint256 public TWEET_MAX_LENGTH = 300;

    struct Post {
        uint256 id;
        address author;
        string content;
        uint256 timestamp;
        uint256 likes;
    }

    mapping(address => Post[]) private userPosts;

    function publishPost(string memory _message) public {
        require(bytes(_message).length <= TWEET_MAX_LENGTH, "The Tweet you are trying to post is too long");

        Post memory newPost = Post({
            id: userPosts[msg.sender].length,
            author: msg.sender,
            content: _message,
            timestamp: block.timestamp,
            likes: 0
        });

        userPosts[msg.sender].push(newPost);
    }

    function getPost(address _author, uint256 _index) public view returns (string memory, address) {
        require(_index < userPosts[_author].length, "Post does not exist");
        Post memory post = userPosts[_author][_index];
        return (post.content, post.author);
    }

    function getAllTweets(address _author) public view returns (Post[] memory) {
        return userPosts[_author];
    }

    function getTotalPosts(address _author) public view returns (uint256) {
        return userPosts[_author].length;
    }

    function likePost(address _author, uint256 _index) public {
        require(_index < userPosts[_author].length, "Post does not exist");
        userPosts[_author][_index].likes += 1;
    }
}
