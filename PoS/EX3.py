import time
import hashlib
import random

class ProofOfWork:
    def __init__(self, difficulty):
        self.difficulty = difficulty

    def mine(self, data):
        nonce = 0
        prefix_str = '0' * self.difficulty
        while True:
            block = f"{data}-{nonce}".encode()
            block_hash = hashlib.sha256(block).hexdigest()
            if block_hash.startswith(prefix_str):
                return nonce, block_hash
            nonce += 1

class ProofOfStake:
    def __init__(self):
        self.stakers = {}
        self.current_block = 0

    def add_staker(self, address, stake):
        self.stakers[address] = stake

    def validate_block(self, data):
        total_stake = sum(self.stakers.values())
        rand_num = random.uniform(0, total_stake)
        cumulative = 0
        for address, stake in self.stakers.items():
            cumulative += stake
            if cumulative >= rand_num:
                selected_staker = address
                break
        return selected_staker, f"block created by {selected_staker} with data: {data}"

# Example usage and timing
def example_usage():
    data = "wahed data simple chwiya "
    
    # Proof of Work
    pow = ProofOfWork(difficulty=4)
    start_time = time.time()
    nonce, pow_hash = pow.mine(data)
    pow_time = time.time() - start_time
    print(f"Pow: Nonce: {nonce}, Hash: {pow_hash}, time: {pow_time:.4f} s")

    # Proof of Stake
    pos = ProofOfStake()
    pos.add_staker("Address1", 10)
    pos.add_staker("Address2", 20)
    pos.add_staker("Address3", 30)

    start_time = time.time()
    staker, pos_result = pos.validate_block(data)
    pos_time = time.time() - start_time
    print(f"Proof of Stake: {pos_result}, Time taken: {pos_time:.4f} s")

if __name__ == "__main__":
    example_usage()
