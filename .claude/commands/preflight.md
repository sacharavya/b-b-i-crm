---
description: >
  Pre-commit and pre-PR sanity check. Runs a fast set of gates against
  staged changes or the current file: tests, secrets, todos, console
  statements, and a one-line summary of what's about to be committed.
  Use before every commit or when preparing a PR. Say "preflight" or
  "run preflight" to invoke.
---

# Preflight

## Usage

```
/preflight              ← runs against staged changes (git diff --staged)
/preflight [file]       ← runs against a specific file
```

A fast, opinionated gate that catches the things developers most commonly
forget before committing or raising a PR. Runs in under a minute.
Not a substitute for full council review — use that before merging.

---

## Step 1 — Determine scope

If the user invoked with no input:
> "Running preflight on your staged changes. Paste your diff or file if
> you'd like me to check something specific instead."

Default to staged changes (`git diff --staged`). If not in a git repo or
nothing is staged, check the current file. If no file is open, ask.

---

## Step 2 — Run the gates

Check each gate in sequence. Stop and flag immediately on any Block.

### Gate 1 — What is actually changing?
Produce a one-line plain English summary of the change:
> "[Type]: [what changed] in [file/module]"

Examples:
> "Fix: null guard added to session middleware in `auth.ts`"
> "Feat: new `/users/:id/role` endpoint added to `routes/users.ts`"
> "Chore: lodash updated from 4.17.20 to 4.17.21"

This is the commit message candidate. If it can't be summarised in one
line, the change may be too large to commit atomically.

---

### Gate 2 — Secrets and credentials
Scan for:
- Hardcoded strings matching patterns: API keys, tokens, passwords,
  private keys, connection strings with credentials
- Any string that looks like a secret committed to a non-env file

```
🚨 BLOCK — secret detected: [describe what and where]
✅ PASS — no credentials or secrets found
```

---

### Gate 3 — Debug and development artefacts
Scan for:
- `console.log`, `console.error`, `print()`, `debugger`, `pdb.set_trace()`
  in non-test, non-logger files
- Commented-out code blocks (more than 3 consecutive commented lines)
- TODO/FIXME/HACK comments introduced in this diff (existing ones are fine)

```
⚠️ FLAG — [N] debug statements found: [list locations]
⚠️ FLAG — commented-out code block at [location]
⚠️ FLAG — new TODO introduced at [location]: "[text]"
✅ PASS — no debug artefacts
```

---

### Gate 4 — Test alignment
Check:
- If logic files were changed, were test files also changed?
- If a new function or export was added, is there a corresponding test?
- If existing tests were deleted, was that intentional?

```
⚠️ FLAG — logic changed in [file] but no test file updated
⚠️ FLAG — [N] tests removed — confirm this was intentional
✅ PASS — test changes look aligned with logic changes
```

---

### Gate 5 — Diff sanity
Check:
- Is this a single coherent change, or are multiple unrelated changes mixed?
- Are there accidentally staged files (lock files, build artefacts, `.env`)?
- Is the diff size reasonable for a single commit? (flag if >400 lines changed)

```
⚠️ FLAG — diff contains unrelated changes: [describe]
⚠️ FLAG — potentially unintended files staged: [list]
⚠️ FLAG — large diff ([N] lines) — consider splitting into smaller commits
✅ PASS — diff looks coherent and appropriately scoped
```

---

## Step 3 — Output

```
## Preflight — [scope]

Gate 1 — Summary
→ [one-line commit message candidate]

Gate 2 — Secrets       [✅ / 🚨]
Gate 3 — Debug artefacts [✅ / ⚠️]
Gate 4 — Test alignment  [✅ / ⚠️]
Gate 5 — Diff sanity     [✅ / ⚠️]

---
[CLEAR TO COMMIT / REVIEW FLAGS BEFORE COMMITTING / BLOCK — DO NOT COMMIT]

[If flags or blocks: bullet list of specific items to fix]
```

---

## Follow-up behaviour

- "fix [gate issue]" → apply the fix and re-run that gate only
- "ignore [flag]" → acknowledge and mark as accepted, proceed
- "full review" → hand off to `council-review` for deeper analysis
- "write commit message" → expand Gate 1 summary into a full conventional
  commit message using `pr-describer` format