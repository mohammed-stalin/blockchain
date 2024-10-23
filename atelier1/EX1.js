import crypto from 'crypto';

// Constants for direction
const LEFT = 'left';
const RIGHT = 'right';

// Sample leaf hashes
const leaves = [
    'leaf1',
    'leaf2',
    'leaf3',
    'leaf4',
    'leaf5',
    'leaf6'
];

// Function to hash data using SHA-256
const sha256 = (data) => {
    return crypto.createHash('sha256').update(data).digest('hex');
};

// Ensure the array length is even by duplicating the last element if necessary
const ensureEvenLength = (hashes) => {
    if (hashes.length % 2 !== 0) {
        hashes.push(hashes[hashes.length - 1]);
    }
};

// Generate the Merkle root from the leaf hashes
const generateMerkleRoot = (hashes) => {
    if (!hashes || hashes.length === 0) return '';
    
    ensureEvenLength(hashes);
    const combinedHashes = [];

    for (let i = 0; i < hashes.length; i += 2) {
        const combinedHash = sha256(hashes[i] + hashes[i + 1]);
        combinedHashes.push(combinedHash);
    }

    return combinedHashes.length === 1 
        ? combinedHashes[0] 
        : generateMerkleRoot(combinedHashes);
};

// Generate the Merkle tree structure
const generateMerkleTree = (hashes) => {
    const tree = [hashes];
    let currentLevel = hashes;

    while (currentLevel.length > 1) {
        ensureEvenLength(currentLevel);
        const nextLevel = [];

        for (let i = 0; i < currentLevel.length; i += 2) {
            const combinedHash = sha256(currentLevel[i] + currentLevel[i + 1]);
            nextLevel.push(combinedHash);
        }
        tree.push(nextLevel);
        currentLevel = nextLevel;
    }

    return tree;
};

// Generate a Merkle proof for a given hash
const generateMerkleProof = (hash, hashes) => {
    const tree = generateMerkleTree(hashes);
    const proof = [];
    let hashIndex = tree[0].indexOf(hash);

    if (hashIndex === -1) return null; // Hash not found

    for (let level = 0; level < tree.length - 1; level++) {
        const isLeftChild = hashIndex % 2 === 0;
        const siblingIndex = isLeftChild ? hashIndex + 1 : hashIndex - 1;
        const siblingHash = tree[level][siblingIndex];

        proof.push({
            hash: siblingHash,
            direction: isLeftChild ? RIGHT : LEFT
        });

        hashIndex = Math.floor(hashIndex / 2);
    }

    return proof;
};

// Verify a Merkle proof against a given root
const verifyMerkleProof = (leaf, proof, root) => {
    let hashValue = sha256(leaf);
    
    for (const { hash: proofHash, direction } of proof) {
        hashValue = direction === LEFT 
            ? sha256(proofHash + hashValue) 
            : sha256(hashValue + proofHash);
    }

    return hashValue === root;
};

// Example execution
const merkleRoot = generateMerkleRoot(leaves.map(sha256));
const proof = generateMerkleProof(sha256(leaves[4]), leaves.map(sha256));
const tree = generateMerkleTree(leaves.map(sha256));
const rootFromProof = proof ? proof.reduce((acc, { hash, direction }) => {
    return direction === LEFT ? sha256(hash + acc) : sha256(acc + hash);
}, sha256(leaves[4])) : null;

console.log('Merkle Root:', merkleRoot);
console.log('Generated Merkle Proof:', proof);
console.log('Merkle Tree:', tree);
console.log('Root from Merkle Proof:', rootFromProof);
console.log('Proof Validity:', rootFromProof === merkleRoot);
