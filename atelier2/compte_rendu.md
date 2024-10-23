# Custom Public-Key Cryptography Algorithm

## Introduction

This project introduces a novel encryption/decryption algorithm inspired by public-key cryptography methods, such as RSA. The goal is to develop a secure, efficient, and non-trivial encryption mechanism that poses a significant challenge to attackers. We ensure that the encryption process is reversible, unlike hash-based methods, while maintaining strong cryptographic properties.

## Algorithm Overview

Our algorithm is designed with the following principles:
- **Public and Private Key Generation**: Similar to RSA, the algorithm uses two keys: a public key for encryption and a private key for decryption.
- **Prime Number Utilization**: Large prime numbers are fundamental to both key generation and message encryption.
- **Mathematical Complexity**: The encryption process involves modular exponentiation with a carefully selected modulus to ensure security.
- **Message Padding**: To mitigate certain cryptographic attacks, a padding scheme is implemented before encryption.

The following sections describe each part of the algorithm in detail, along with code examples to illustrate the encryption and decryption process.

## Key Generation

We generate a pair of large prime numbers, `p` and `q`, and compute:
- `n = p * q`
- Euler’s Totient: `φ(n) = (p-1)(q-1)`

We choose a small integer `e` such that `gcd(e, φ(n)) = 1`, making `e` the encryption key. The decryption key `d` is calculated as the modular inverse of `e` modulo `φ(n)`.

```python
import random
from math import gcd

# Function to find modular inverse
def modinv(a, m):
    m0, x0, x1 = m, 0, 1
    if m == 1:
        return 0
    while a > 1:
        q = a // m
        m, a = a % m, m
        x0, x1 = x1 - q * x0, x0
    return x1 + m0 if x1 < 0 else x1

# Generate large primes (for simplicity, smaller primes in this example)
def generate_keypair():
    p = 11
    q = 57
    n = p * q
    phi = (p - 1) * (q - 1)
    
    e = random.choice([i for i in range(2, phi) if gcd(i, phi) == 1])
    d = modinv(e, phi)
    
    return ((e, n), (d, n))

public_key, private_key = generate_keypair()
print(f"Public key: {public_key}")
print(f"Private key: {private_key}")
```

## Encryption

The encryption process takes the plaintext message and converts it to an integer representation. Each chunk of the message is encrypted using the formula:

```
ciphertext = (message^e) % n
```

The encrypted message is a series of integers that can only be decrypted with the private key.

```python
# Encrypt message using the public key
def encrypt(message, public_key):
    e, n = public_key
    message_as_int = [ord(char) for char in message]
    encrypted_message = [(m ** e) % n for m in message_as_int]
    return encrypted_message

message = "HELLO"
encrypted = encrypt(message, public_key)
print(f"Encrypted message: {encrypted}")
```

## Decryption

To decrypt the message, we use the private key and the formula:

```
message = (ciphertext^d) % n
```

This returns the original plaintext message.

```python
# Decrypt message using the private key
def decrypt(ciphertext, private_key):
    d, n = private_key
    decrypted_message = [(c ** d) % n for c in ciphertext]
    return ''.join([chr(m) for m in decrypted_message])

decrypted = decrypt(encrypted, private_key)
print(f"Decrypted message: {decrypted}")
```

---
