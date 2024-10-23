import random
from math import gcd
from sympy import nextprime

# Function to find modular inverse of a number
def modinv(a, m):
    m0, x0, x1 = m, 0, 1
    if m == 1:
        return 0
    while a > 1:
        q = a // m
        m, a = a % m, m
        x0, x1 = x1 - q * x0, x0
    return x1 + m0 if x1 < 0 else x1



def generate_large_prime(bits=1024):
    # Generate a random large number and find the next prime number
    large_num = random.getrandbits(bits)
    prime = nextprime(large_num)
    return prime


# Function to generate key pairs (public and private)
def generate_keypair():
    # For real-world usage, use much larger primes
    p = generate_large_prime(512)  # Generate a 512-bit prime number
    q = generate_large_prime(512)
    n = p * q
    phi = (p - 1) * (q - 1)
    
    # Choose an integer e such that 1 < e < phi and gcd(e, phi) = 1
    e = random.choice([i for i in range(2, phi) if gcd(i, phi) == 1])
    
    # Calculate d such that (d * e) % phi == 1
    d = modinv(e, phi)
    
    # Return public and private key pairs
    return ((e, n), (d, n))

# Function to encrypt a message
def encrypt(message, public_key):
    e, n = public_key
    # Convert each character to its integer representation and encrypt
    message_as_int = [ord(char) for char in message]
    encrypted_message = [(m ** e) % n for m in message_as_int]
    return encrypted_message

# Function to decrypt a message
def decrypt(ciphertext, private_key):
    d, n = private_key
    # Decrypt each integer back to its character
    decrypted_message = [(c ** d) % n for c in ciphertext]
    return ''.join([chr(m) for m in decrypted_message])

# Generate key pairs
public_key, private_key = generate_keypair()
print(f"Public key: {public_key}")
print(f"Private key: {private_key}")

# Example encryption and decryption
message = "HELLO"
print(f"\nOriginal message: {message}")

# Encrypt the message
encrypted_message = encrypt(message, public_key)
print(f"Encrypted message: {encrypted_message}")

# Decrypt the message
decrypted_message = decrypt(encrypted_message, private_key)
print(f"Decrypted message: {decrypted_message}")
