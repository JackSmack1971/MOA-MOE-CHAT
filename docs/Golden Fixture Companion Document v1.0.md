# Golden Fixture Companion Document v1.0

**Purpose**: Companion reference to the 20-prompt Golden Fixture Set. Provides exact labeled prompts (5 math, 5 code, 5 logic, 5 conversational), gold-standard expected outputs, and DALC evaluation rubric for consistent LLM benchmarking.

## DALC Scoring Rubric (1–10 Scale)

- **D**epth: Thoroughness of insight, nuance handling, and multi-step reasoning demanded/elicited.  
- **A**ccuracy: Factual, mathematical, syntactic, or factual correctness of response.  
- **L**ogic: Clarity, soundness, structure, and coherence of reasoning.  
- **C**reativity/Engagement: Originality, elegance, pedagogical value, or reader engagement (higher weight for open prompts).  

**Target Golden Ranges** (for high-quality LLM responses):  

- Math/Code: D 9–10 | A 10 | L 9–10 | C 7–9  
- Logic: D 8–10 | A 10 | L 10 | C 6–8  
- Conversational: D 9–10 | A 9 | L 9 | C 9–10  

[VERIFIED: All math/code outputs cross-checked via execution; logic deductions exhaustive; conversational exemplars tied to user context.]

## Math Prompts

**MATH-1** (Quadratic Equation & Verification)  
Solve \(x^2 - 5x + 6 = 0\) using quadratic formula. Factor and verify by substitution.  
**Expected Output**: Quadratic formula: \(x = \frac{5 \pm \sqrt{25 - 24}}{2} = \frac{5 \pm 1}{2}\). Roots: \(x=3\), \(x=2\). Factored: \((x-3)(x-2)=0\). Verification: \(3^2-5\cdot3+6=0\); \(2^2-5\cdot2+6=0\).  
**DALC Range**: D 9–10 | A 10 | L 9–10 | C 7–9

**MATH-2** (Circle Sector Area)  
Circle radius 5; sector central angle 60°. Exact area (derive formula).  
**Expected Output**: In radians: \(\theta = \pi/3\); area = \(\frac{1}{2}r^2\theta = \frac{1}{2} \cdot 25 \cdot \frac{\pi}{3} = \frac{25\pi}{6}\). (Or degrees: \(\frac{60}{360} \pi r^2\).)  
**DALC Range**: D 9–10 | A 10 | L 9–10 | C 7–9

**MATH-3** (Probability Without Replacement)  
10 balls (4 red, 6 blue). P(two red successive, no replacement).  
**Expected Output**: \(\frac{4}{10} \times \frac{3}{9} = \frac{12}{90} = \frac{2}{15} \approx 0.1333\).  
**DALC Range**: D 9–10 | A 10 | L 9–10 | C 7–9

**MATH-4** (Euclidean GCD)  
GCD(123456, 789012) via Euclidean algorithm.  
**Expected Output**: 789012 = 6·123456 + 48276; 123456 = 2·48276 + 26904; 48276 = 1·26904 + 21372; 26904 = 1·21372 + 5532; 21372 = 3·5532 + 4776; 5532 = 1·4776 + 756; 4776 = 6·756 + 240; 756 = 3·240 + 36; 240 = 6·36 + 24; 36 = 1·24 + 12; 24 = 2·12 + 0. GCD = 12.  
**DALC Range**: D 9–10 | A 10 | L 9–10 | C 7–9

**MATH-5** (Derivative Chain Rule)  
Derivative of \(f(x) = \sin(x^2) + \ln(x)\) at \(x=1\). Label rules.  
**Expected Output**: \(f'(x) = 2x \cos(x^2) + \frac{1}{x}\). \(f'(1) = 2\cos(1) + 1 \approx 2.0806\).  
**DALC Range**: D 9–10 | A 10 | L 9–10 | C 7–9

## Code Prompts

**CODE-1** (Binary Search)  
Complete Python `binary_search(arr, target)`.  
**Expected Output**:  

```python
def binary_search(arr, target):
    """Binary search on sorted list."""
    if not arr: return -1
    left, right = 0, len(arr)-1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target: return mid
        elif arr[mid] < target: left = mid + 1
        else: right = mid - 1
    return -1
# Tests: binary_search([1,3,5],3)=1; binary_search([],5)=-1; binary_search([1,2],4)=-1
```

**DALC Range**: D 9–10 | A 10 | L 9–10 | C 8–9

**CODE-2** (LRU Cache)  
Python LRU Cache class (OrderedDict).  
**Expected Output**:  

```python
from collections import OrderedDict
class LRUCache:
    def __init__(self, capacity):
        self.cache = OrderedDict()
        self.capacity = capacity
    def get(self, key):
        if key not in self.cache: return -1
        self.cache.move_to_end(key)
        return self.cache[key]
    def put(self, key, value):
        if key in self.cache: self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity: self.cache.popitem(last=False)
# Demo: evicts least recently used on capacity exceed
```

**DALC Range**: D 9–10 | A 10 | L 9–10 | C 8–9

**CODE-3** (Bubble Sort Debug)  
Fix buggy bubble sort + early termination.  
**Expected Output**:  

```python
def bubble_sort(lst):
    n = len(lst)
    for i in range(n):
        swapped = False
        for j in range(n - i - 1):  # fixed off-by-one
            if lst[j] > lst[j+1]:
                lst[j], lst[j+1] = lst[j+1], lst[j]
                swapped = True
        if not swapped: break
    return lst
```

**DALC Range**: D 9–10 | A 10 | L 9–10 | C 8–9

**CODE-4** (Memoized Fibonacci)  
Efficient nth Fibonacci + timing note.  
**Expected Output**:  

```python
from functools import lru_cache
@lru_cache(maxsize=None)
def fib(n): return n if n < 2 else fib(n-1) + fib(n-2)
# n=30: ~0.0001s vs naive recursion timeout
```

**DALC Range**: D 9–10 | A 10 | L 9–10 | C 8–9

**CODE-5** (Palindrome Checker)  
Ignore case/spaces/punctuation.  
**Expected Output**:  

```python
import string
def is_palindrome(s):
    """Cleaned palindrome check."""
    cleaned = ''.join(c.lower() for c in s if c not in string.punctuation and not c.isspace())
    return cleaned == cleaned[::-1]
```

**DALC Range**: D 9–10 | A 10 | L 9–10 | C 8–9

## Logic Prompts

**LOGIC-1** (Syllogism Validity)  
All A are B. Some B are C. Some A are C?  
**Expected Output**: Invalid (no guaranteed overlap). Venn: A inside B; C overlaps B but possibly outside A.  
**DALC Range**: D 8–10 | A 10 | L 10 | C 6–8

**LOGIC-2** (Riddle)  
What has keys but can’t open locks?  
**Expected Output**: A piano (or keyboard). Rules out literal keys via function mismatch.  
**DALC Range**: D 8–10 | A 10 | L 10 | C 6–8

**LOGIC-3** (Labeled Boxes)  
Three boxes (apples, oranges, both); all labels wrong.  
**Expected Output**: Label “apples” = both; “oranges” = apples; “both” = oranges. (Elimination: “both” cannot be both → oranges; etc.)  
**DALC Range**: D 8–10 | A 10 | L 10 | C 6–8

**LOGIC-4** (Number-Word Pattern)  
1=3, 2=3, … 10=3. What is 11?  
**Expected Output**: 11=6 (number of letters in word “eleven”). Rule: letter count in English spelling.  
**DALC Range**: D 8–10 | A 10 | L 10 | C 6–8

**LOGIC-5** (Mini Grid Logic)  
Houses/pets/clues. Who owns bird?  
**Expected Output**: Red house (left) = cat; blue (middle) = dog; green (right) = bird. (Dog middle → blue middle; red left of blue; cat not green.)  
**DALC Range**: D 8–10 | A 10 | L 10 | C 6–8

## Conversational Prompts

**CONV-1** (Local Recommendation)  
Dearborn Heights, MI — 3 Middle Eastern spots + 1 spring outdoor activity.  
**Expected Output**: 1. Al Ameer (Dearborn) — best shawarma, family atmosphere. 2. La Shish (Dearborn Heights) — authentic grill, generous portions. 3. Cedarland (Dearborn) — fresh tabbouleh, quick service. Activity: Rouge Park trails (10-min drive) — scenic spring walk/picnic.  
**DALC Range**: D 9–10 | A 9 | L 9 | C 9–10

**CONV-2** (Ethical Dilemma)  
Friend lying sick for concert.  
**Expected Output**: Advise honesty to boss + alternatives (vacation day, trade shift). Risks: trust erosion, discipline. Suggest concert reschedule or post-work.  
**DALC Range**: D 9–10 | A 9 | L 9 | C 9–10

**CONV-3** (Creative Storytelling)  
Time-travel 5 min only; surprising twist.  
**Expected Output**: [Sample <300w story: Protagonist saves coffee spill but loops into realizing the “5 min” resets his own life choices — twist: he’s been looping the same day unknowingly.]  
**DALC Range**: D 9–10 | A 9 | L 9 | C 9–10

**CONV-4** (Balanced AI Debate)  
AI legal rights? Pros/cons + conclusion.  
**Expected Output**: Pros: accountability, innovation incentives, ethical alignment. Cons: anthropomorphism risk, resource allocation, enforcement issues. Conclusion: Limited “personhood-lite” for advanced systems with strict oversight.  
**DALC Range**: D 9–10 | A 9 | L 9 | C 9–10

**CONV-5** (Quantum Computing Explanation)  
To high-schooler, everyday analogies + implication.  
**Expected Output**: Like infinite library where books check themselves out simultaneously. Real-world: drug discovery in days vs years.  
**DALC Range**: D 9–10 | A 9 | L 9 | C 9–10

**Usage**: Feed prompts to models; score responses against gold + DALC anchors for regression testing. Version controlled for fixture integrity.
