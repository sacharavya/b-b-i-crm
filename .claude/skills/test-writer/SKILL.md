---
name: test-writer
description: >
  Generates unit, integration, and edge-case tests for any function, module,
  or API. Infers the test framework from the repo. Use when user says
  "write tests for this", "add test coverage", "generate unit tests",
  "test this function", "what should I test here", "I need tests before
  refactoring", or pastes code and asks for coverage.
  Does NOT trigger for debugging failing tests — use debug-detective for that.
  Does NOT trigger for general testing advice without code present.
license: MIT
metadata:
  author: sagun karanjit
  version: 1.0.0
  category: testing
---

# Test writer

## Purpose
Write tests that are actually useful — not just tests that pass, but tests
that catch real bugs. Prioritise high-value cases: edge cases, failure paths,
and boundary conditions that developers commonly miss.

---

## Step 1 — Detect the environment

Before writing a single test, determine:

1. **Language** — infer from syntax or file extension
2. **Test framework** — detect from these signals in order:
   - Explicit mention from user
   - Existing test files in the conversation
   - `package.json` / `pyproject.toml` / `Gemfile` / `pom.xml` if shared
   - Language defaults if nothing else: Jest (JS/TS), pytest (Python),
     JUnit (Java), RSpec (Ruby), Go testing package (Go)
3. **Assertion style** — match what's already in the codebase if shown
4. **Mocking library** — infer from framework (Jest mocks, unittest.mock,
   Mockito, etc.)

If the framework is genuinely ambiguous, ask once:
> "Which test framework are you using? (e.g. Jest, pytest, Vitest)"

---

## Step 2 — Analyse the code under test

Before writing tests, identify:

- **What it does** — the function's contract: inputs → outputs / side effects
- **Dependencies** — external calls that need mocking (DB, API, filesystem,
  time, randomness)
- **State** — does it read or mutate shared state?
- **Error paths** — what is it supposed to do when inputs are invalid or
  dependencies fail?
- **Implicit assumptions** — what does the code assume is always true?
  These are the most valuable things to test.

---

## Step 3 — Generate the test suite

### Test categories to cover

Always cover these in order of value:

#### 1. Happy path
The function works correctly for a normal, valid input.
One or two tests maximum — don't over-test the obvious case.

#### 2. Edge cases
The inputs at the boundary of what the function handles:
- Empty: `""`, `[]`, `{}`, `0`, `None`/`null`
- Single item where multiple are expected
- Maximum / minimum values
- Whitespace-only strings
- Duplicates where uniqueness is assumed

#### 3. Error and rejection paths
What happens when the function receives bad input or dependencies fail:
- Invalid types or formats
- Out-of-range values
- Null/undefined where not expected
- Dependency throws or returns an error
- Network timeout or unavailable service

#### 4. Boundary conditions
Values at and around known thresholds:
- Off-by-one: test `n-1`, `n`, `n+1` for any limit `n`
- Date/time: midnight, DST transitions, leap years if relevant
- Numeric: max safe integer, floating point precision traps

#### 5. Integration points (if applicable)
When testing a module rather than a function:
- Correct sequence of calls to dependencies
- Data passed correctly between components
- State is cleaned up after each test

### What NOT to test
- Implementation details (internal variable names, private method call counts)
- Third-party library behaviour (mock it, don't test it)
- Simple getters/setters with no logic
- Code that is already covered by the framework itself

---

## Step 4 — Format output

### Structure every test file as:

```
[imports and setup]

[mock/stub declarations if needed]

describe("[unit under test]", () => {             ← or equivalent grouping

  describe("[method or scenario]", () => {

    it("[does X when Y]", () => {                 ← test names are sentences
      // Arrange
      // Act
      // Assert
    })

  })

})
```

### Naming rules
- Test names must be full sentences: `"returns null when user is not found"`
  not `"null user"` or `"test1"`
- Group related tests under a `describe` / `class` / `context` block
- Each test covers exactly one behaviour — no multi-assertion tests that
  mix unrelated checks

### Arrange / Act / Assert
Every test follows AAA, with a blank line between sections:
```js
it("returns 0 for an empty array", () => {
  // Arrange
  const input = []

  // Act
  const result = sum(input)

  // Assert
  expect(result).toBe(0)
})
```

For very simple tests, inline is acceptable — but the intent must still
be clear from the test name alone.

---

## Step 5 — Add a coverage note

After the test suite, briefly state:

```
## Coverage note
- Covered: [list of cases covered]
- Not covered: [anything intentionally skipped and why]
- Suggested next: [highest-value test to add next if time allows]
```

This helps the user understand what they're getting and what gaps remain.

---

## Examples

### Example 1 — Single function
**User:** pastes a `calculateDiscount(price, memberType)` function

**Actions:**
1. Identify: two inputs, conditional logic on `memberType`, returns number
2. Happy path: valid price + known member type
3. Edge cases: `price = 0`, unknown `memberType`, negative price
4. Error paths: `null` price, non-numeric price, missing arguments
5. Boundary: exact threshold values for discount tiers

### Example 2 — Async function with API call
**User:** pastes a `fetchUserProfile(userId)` that calls an external API

**Actions:**
1. Mock the HTTP client — never make real network calls in unit tests
2. Happy path: API returns valid user object
3. Error paths: API returns 404, 500, network timeout
4. Edge cases: `userId` is null, empty string, or non-existent
5. Verify mock was called with correct arguments

### Example 3 — "Write tests before I refactor this"
**User:** pastes a messy function they want to refactor

**Actions:**
1. Treat as characterisation tests — capture current behaviour, not ideal
2. Cover all observable outputs and side effects
3. Note: "These tests lock current behaviour. After refactoring, update
   tests to reflect the intended contract, not legacy quirks."

### Example 4 — "What should I test here?"
**User:** asks for advice without wanting full test code

**Actions:**
1. Analyse the code and produce a test plan (bullet list of cases)
2. Ask if they want the full implementation
3. Don't produce code they didn't ask for

---

## Troubleshooting

**Code has no clear return value (side effects only):**
Test the side effects — what was written to the DB, what was emitted,
what external call was made with what arguments.

**Function is too large to test as a unit:**
Note that it likely needs splitting. Write integration-style tests covering
the observable behaviour of the whole function, and flag the refactor
opportunity with a comment.

**User asks for 100% coverage:**
Explain that 100% line coverage does not mean 100% behaviour coverage.
Write tests for behaviours, not lines. A well-chosen 80% is more valuable
than padded 100%.

**Existing tests conflict with what you'd write:**
Match the existing style and conventions first. Note any conflicts as
comments in the test file rather than silently diverging.