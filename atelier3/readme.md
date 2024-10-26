
---

# Hash Table Application with Custom Hash Function

## Overview

This application demonstrates the implementation of a hash table in Python, featuring a custom hash function and two collision resolution methods: linear probing and double hashing. The application provides a graphical user interface (GUI) using Tkinter, allowing users to interact with the hash table by inserting, deleting, and looking up key-value pairs.

## Custom Hash Function

The custom hash function used in this application is defined as follows:

```python
def custom_hash_function(self, key):
    # Custom hash function: Sum of digits
    return sum(int(digit) for digit in str(key)) % self.size
```

### Explanation of the Hash Function

1. **Key Input**: The function takes an integer key as input.
2. **Sum of Digits**: It converts the key to a string, iterates through each character (digit), converts it back to an integer, and calculates the sum of these digits.
3. **Modulo Operation**: The sum is then taken modulo the size of the hash table to ensure the resulting index falls within the bounds of the table.

### Benefits

- The sum of digits is a simple yet effective method for distributing keys across the hash table. This approach can help reduce collisions for certain types of numeric keys, especially those with different digit sums.

## Collision Resolution Methods

The application supports two collision resolution strategies:

1. **Linear Probing**:
   - If a collision occurs (i.e., the calculated index is already occupied), the algorithm searches for the next available index linearly.
   
   ```python
   def linear_probe(self, index):
       initial_index = index
       while self.table[index] is not None:
           index = (index + 1) % self.size
           if index == initial_index:
               return None  # No empty slot found, the table is full
       return index
   ```

2. **Double Hashing**:
   - This method uses a secondary hash function to calculate a new index when a collision occurs. It helps to disperse the keys more uniformly throughout the table.
   
   ```python
   def double_hash_probe(self, key, iteration):
       hash_prime = 7  # Choose a prime number as the hash prime
       return (self.custom_hash_function(key) + iteration * hash_prime) % self.size
   ```

## Application Features

- **Insert Key-Value Pairs**: Users can enter a key and a value to insert into the hash table.
- **Delete Key-Value Pairs**: Users can delete a key from the hash table, and the application will handle reorganizing the table to maintain coherence.
- **Lookup Key**: Users can search for a key and see if it exists in the hash table.
- **Display Table**: The current state of the hash table is displayed in a tree view, showing the index, key, and value for each occupied slot.

## Testing the Custom Hash Function

To test the functionality of the custom hash function:

1. Run the application.
2. Use the input fields to insert various keys (integers) and values (strings).
3. Observe how the custom hash function distributes the keys within the hash table and how the collision resolution methods handle any collisions that occur.

## Requirements

- Python 3.x
- Tkinter (comes pre-installed with Python)

## Running the Application

To run the application, save the provided code in a Python file (e.g., `hash_table.py`) and execute it with Python:

```bash
python hash_table.py
```

## Conclusion

This application provides a clear implementation of a hash table with a custom hash function, showcasing how different strategies can effectively manage collisions. The GUI makes it easy to visualize and interact with the hash table, allowing users to test and observe the behavior of their hash function and collision resolution methods.

--- 
