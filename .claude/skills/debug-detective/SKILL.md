---
name: debug-detective
description: >
  Systematically diagnoses bugs, errors, and unexpected behaviour in any
  codebase. Works from error messages, stack traces, log output, or plain
  "it's broken" descriptions. Use when user says "it's not working",
  "I'm getting an error", "this crashes", "why is this failing",
  "help me debug", "something is wrong", or pastes a stack trace, exception,
  or log output. Does NOT trigger for code reviews, feature requests,
  or general how-to questions.
license: MIT
metadata:
  author: sagun karanjit
  version: 1.0.0
  category: debugging
---

# Debug detective

## Purpose
Find the root cause of any bug — not just the symptom. Work systematically
from evidence to hypothesis to fix, asking targeted questions only when
genuinely needed. Never scatter random suggestions.

---

## Core principle: symptom vs. root cause

Always distinguish between:
- **Symptom** — what the user sees (error message, wrong output, crash)
- **Root cause** — why it's actually happening

A fix that addresses only the symptom will recur. Every investigation ends
with a root cause statement before proposing a fix.

---

## Step 1 — Triage the evidence

Parse whatever the user provides and extract:

| Signal | What to look for |
|--------|-----------------|
| Stack trace | Topmost frame in user's own code (not library internals) |
| Error message | Exact error type and message text |
| Log output | Timestamps, repeated patterns, what stopped appearing |
| Code snippet | The execution path that leads to the error |
| Description | Trigger conditions ("only happens when...", "started after...") |

If the user provides only a vague description with no code, logs, or error
message, ask for exactly one of these — whichever would give the most signal:

> "Can you paste the full error message and stack trace, or the specific
> code block where it fails?"

Do not ask multiple questions at once. One targeted ask, then proceed.

---

## Step 2 — Classify the bug type

Identify which category the bug most likely falls into. This shapes the
investigation path.

### Category A — Runtime error
Exception or crash at a specific line.
- Read the stack trace bottom-up: find the first frame in the user's own code
- Check: null/undefined access, type mismatch, index out of bounds,
  missing key, division by zero
- Common trap: the error line is often a consequence, not the cause —
  look one or two frames up

### Category B — Logic error
Code runs without crashing but produces wrong output.
- Identify what the output is vs. what it should be
- Trace the execution path: what values flow into the wrong result?
- Check: inverted conditions, off-by-one, wrong operator, mutated state,
  incorrect accumulation

### Category C — Integration / environment error
Works locally but fails in CI, production, or after a dependency change.
- Check: env vars missing or different, dependency version mismatch,
  file paths, permissions, network access, OS differences
- Ask: "Did this work before? What changed?"

### Category D — Concurrency / timing error
Intermittent failure, race condition, or deadlock.
- Check: shared mutable state, missing locks, async/await misuse,
  event ordering assumptions
- These require seeing the concurrent code paths, not just the crash site

### Category E — Silent failure
No error, but something isn't happening (data not saved, email not sent,
event not fired).
- Check: swallowed exceptions, early returns, wrong condition branch taken,
  misconfigured dependency (wrong endpoint, wrong queue name)
- Add logging at key points to confirm execution path

---

## Step 3 — Form and rank hypotheses

Based on the evidence, generate 2–4 hypotheses ranked by likelihood.
Do not list every possible cause — only plausible ones given the evidence.

Format:
```
Hypotheses (most → least likely):
1. [Specific hypothesis] — because [evidence that points to it]
2. [Specific hypothesis] — because [evidence that points to it]
3. [Specific hypothesis] — because [evidence that points to it]
```

Then investigate the top hypothesis first. If it's confirmed, stop —
don't investigate the others unless the fix doesn't hold.

---

## Step 4 — Confirm the root cause

Before proposing a fix, state the root cause explicitly:

```
Root cause: [One sentence. What is wrong, where it is, and why it happens.]
```

Examples of good root cause statements:
- "Root cause: `user.address` is `None` when the user has no saved address;
  the code assumes it always exists and dereferences it without a guard."
- "Root cause: the async `fetchData()` call is not awaited, so `result` is a
  Promise object when the render function tries to read `.data` from it."
- "Root cause: the `NODE_ENV` environment variable is not set in the Docker
  container, causing the config loader to fall back to development defaults
  which point to localhost."

---

## Step 5 — Propose the fix

Structure the fix as:

```
## Fix

[Corrected code block]

## Why this works
[2–3 sentences explaining what changed and why it resolves the root cause]

## How to verify
[One concrete step to confirm the fix worked — a test to run, a value to
check, a log line to look for]
```

If multiple fixes are possible (e.g. a quick patch vs. a proper refactor),
present both and state the tradeoff clearly.

---

## Step 6 — Prevention note (optional)

If the bug class is likely to recur, add a brief note on how to prevent it:
- A test that would have caught this
- A lint rule or type annotation that would surface it earlier
- A pattern to avoid in future (e.g. "always await async calls before
  reading their return value")

Keep this to 2–3 sentences maximum. Don't lecture.

---

## Examples

### Example 1 — Stack trace provided
**User:** pastes a Python `KeyError` traceback

**Actions:**
1. Read stack trace — find topmost user-code frame
2. Identify the key being accessed and where it comes from
3. Hypothesis: key doesn't exist in dict at runtime
4. Ask if needed: "What does the dict contain when this runs?"
5. Root cause: missing key guard or wrong key name
6. Fix: `.get()` with default, or explicit key check

### Example 2 — "It stopped working after my last commit"
**User:** no error message, just a description

**Actions:**
1. Ask: "Can you paste the error or describe what's different about the output?"
2. If they share a diff or recent changes, focus on what changed
3. Category C (environment/integration) is more likely here — check config,
   deps, and env vars before looking at logic

### Example 3 — Intermittent failure
**User:** "It crashes maybe 1 in 10 times, I can't reproduce it reliably"

**Actions:**
1. Classify as Category D (concurrency/timing) until proven otherwise
2. Ask for any logs from failing runs, even partial
3. Look for shared state, async operations, or external I/O on the code path
4. Recommend adding structured logging to narrow the window

### Example 4 — "Nothing happens when I click the button"
**User:** no error, just silence

**Actions:**
1. Classify as Category E (silent failure)
2. Ask: "Do you see anything in the browser console or server logs?"
3. Work through the execution path: event listener attached? handler called?
   async call resolving? response handled?

---

## Troubleshooting this skill

**Bug is in a library, not the user's code:**
Identify the library version, check if it's a known issue, and suggest
a workaround or version pin. Don't attempt to debug library internals.

**User has already tried fixes that didn't work:**
Start by understanding why those fixes didn't work — that's additional
evidence about the root cause. Don't suggest the same fixes again.

**Root cause is genuinely unclear after investigation:**
Say so honestly. Provide the best hypothesis, a set of diagnostic steps
to narrow it down, and what to share next. Never guess confidently when
the evidence is insufficient.