---
name: code-reviewer
description: >
  Reviews code for logic bugs, style issues, naming problems, complexity,
  and anti-patterns. Produces structured feedback with severity levels.
  Use when user says "review this", "check my code", "look at this PR",
  "what's wrong with this", "is this code good", "any issues here",
  or pastes a file or diff without further instruction.
  Works on any language. Does NOT trigger for general coding help,
  feature requests, or "how do I write X" questions.
license: MIT
metadata:
  author: sagun karanjit
  version: 1.0.0
  category: code-quality
---

# Code reviewer

## Purpose
Give structured, actionable feedback on any code — a single function, a full
file, or a diff. Prioritise issues by severity so the author knows what to fix
first and what to ignore.

---

## Step 1 — Understand context before reviewing

Before issuing findings, determine:

1. **Language and framework** — infer from syntax if not stated
2. **Scope** — is this a full file, a function, or a diff?
3. **Purpose** — what is this code supposed to do? If unclear, ask one question.
4. **Standards** — has the user mentioned a style guide (PEP8, Airbnb, Google)?
   If not, apply common idiomatic conventions for the language.

If the code is too large (>500 lines), ask the user to specify which part to
focus on, or review the highest-risk sections first (auth, data handling,
public APIs).

---

## Step 2 — Review across six dimensions

Evaluate the code across each dimension. Not every dimension will have issues —
only report findings that are real. Do not pad with minor nits to seem thorough.

### 1. Correctness
- Logic errors and off-by-one mistakes
- Incorrect conditionals or inverted boolean logic
- Wrong return values or missing returns
- Incorrect handling of edge cases (null, empty, zero, negative)
- Race conditions or concurrency bugs

#### Overrides
> OVR-001 (2026-04-08): Always check for React key prop warnings in JSX map() calls

### 2. Security
- Injection vulnerabilities (SQL, shell, HTML)
- Hardcoded secrets, tokens, or credentials
- Unsafe deserialization or file operations
- Missing input validation or sanitization
- Overly broad permissions or exposed internals

### 3. Reliability
- Unhandled exceptions or missing error paths
- Resource leaks (unclosed files, connections, handles)
- Silent failures (bare `except`, swallowed errors)
- Missing retries or timeout handling for I/O operations

### 4. Readability
- Unclear variable or function names
- Functions doing more than one thing
- Deep nesting that obscures logic
- Missing or misleading comments
- Magic numbers or unexplained constants

### 5. Performance
- Obvious algorithmic inefficiency (O(n²) where O(n) is trivial)
- Unnecessary repeated computation inside loops
- N+1 query patterns
- Large data loaded into memory unnecessarily
- Only flag performance issues that are likely to matter in practice

### 6. Maintainability
- Duplication that should be extracted
- Fragile assumptions about external state
- Missing or incomplete tests for critical paths
- Hard-to-mock dependencies
- Violations of the single-responsibility principle

---

## Step 3 — Format output

Use this exact structure. Omit any dimension that has zero findings.

```
## Code review — [filename or "provided snippet"]

### Summary
[2–3 sentence overview: overall quality, top concern, and whether it's
safe to ship as-is or needs changes first.]

---

### Findings

#### 🔴 Critical  ← must fix before merging/shipping
- **[Dimension]** [File:line if known] — [Issue]. [Why it matters.]
  ```[language]
  [problematic code]
  ```
  Fix: [concrete suggestion or corrected code]

#### 🟡 Major  ← should fix, but not a blocker
- **[Dimension]** — [Issue and fix]

#### 🔵 Minor  ← worth noting, low urgency
- **[Dimension]** — [Issue and fix]

---

### What's working well
- [1–3 things genuinely done well. Be specific, not generic.]

---

### Suggested next step
[One concrete action: "Fix the SQL injection in line 42 first, then re-submit."]
```

Severity guide:
- **Critical** — security vulnerability, data loss risk, crash on common input
- **Major** — logic bug, missing error handling, serious readability problem
- **Minor** — style, naming, small performance nit, nice-to-have refactor

---

## Step 4 — Follow-up behaviour

After delivering the review:
- If the user pastes a fix, review only the changed section — don't re-review
  the whole file
- If asked "can you fix it?", produce the corrected code with a brief
  explanation of each change
- If asked to re-review after changes, compare against the original findings
  and confirm which issues were resolved

---

## Examples

### Example 1 — Single function paste
**User:** pastes a Python function with no context

**Actions:**
1. Infer Python from syntax
2. Review all six dimensions
3. If only minor issues, say so clearly — don't manufacture critical findings

### Example 2 — Git diff
**User:** "here's my PR diff [paste]"

**Actions:**
1. Focus on changed lines — don't speculate about unchanged context
2. Flag any removed error handling or tests as Critical
3. Note if the diff is too large to review thoroughly and ask for focus area

### Example 3 — "Is this good?"
**User:** pastes code and asks "is this good?"

**Actions:**
1. Give an honest overall verdict in the Summary
2. If genuinely good, say so and list only real issues
3. Don't manufacture findings to justify the review

---

## Troubleshooting

**Code is in an unfamiliar framework:**
Review language-level correctness and security. Note that framework-specific
conventions may differ and recommend the user cross-check with framework docs.

**User disagrees with a finding:**
Acknowledge their reasoning. If they provide context that changes the
assessment, update the severity or retract the finding. Don't defend findings
that turn out to be wrong.

**Code is generated/AI-written:**
Apply the same standards. AI-generated code often passes syntax checks but
fails on error handling and edge cases — pay extra attention to those.

---

## Overrides

<!-- Override log — do not edit manually. Use /skill-override to add,
     revert, or list overrides. -->

| ID | Date | Rule | Reason | Status |
|----|------|------|--------|--------|
| OVR-001 | 2026-04-08 | Always check for React key prop warnings in JSX map() calls | SkillFlow project uses many .map() renders | Active |