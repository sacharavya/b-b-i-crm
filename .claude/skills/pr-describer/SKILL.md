---
name: pr-describer
description: >
  Writes clear, complete pull request descriptions from a git diff, commit
  log, or plain description of changes. Covers what changed, why, how to
  test it, and any risks or follow-ups. Use when user says "write a PR
  description", "write a PR for this", "PR description for these changes",
  "help me describe this PR", "write a pull request", or pastes a diff or
  list of commits without further instruction.
  Does NOT trigger for code review — use code-reviewer for that.
  Does NOT trigger for general git help or branch management questions.
license: MIT
metadata:
  author: sagun karanjit
  version: 1.0.0
  category: workflow
---

# PR describer

## Purpose
Write PR descriptions that give reviewers everything they need to understand,
test, and merge changes confidently — without requiring a Slack thread to
fill in the gaps.

---

## Step 1 — Gather input

Accept any of these as input:

| Input type | What to extract |
|------------|----------------|
| Git diff | Changed files, added/removed logic, config changes |
| Commit log | Intent from commit messages, scope of change |
| Plain description | User's own words about what changed and why |
| Combination | Prefer diff/commits for what, user words for why |

If only a diff is provided with no explanation of intent, ask once:
> "What's the purpose of these changes? One sentence is enough."

The "why" cannot be inferred from code alone and is the most valuable
part of any PR description.

---

## Step 2 — Analyse the change

Before writing, classify the change type and assess its characteristics:

**Change types:**
- `feat` — new feature or capability
- `fix` — bug fix
- `refactor` — restructuring without behaviour change
- `chore` — dependency update, config, tooling
- `perf` — performance improvement
- `docs` — documentation only
- `test` — tests only
- `breaking` — any change that requires callers to update

**Assess:**
- **Scope** — how many files/systems are touched?
- **Risk** — does it touch auth, payments, data writes, or public APIs?
- **Reversibility** — can it be reverted cleanly if something breaks?
- **Dependencies** — does it require other PRs, migrations, or config
  changes to land first?

This assessment shapes the tone and emphasis of the description — a
one-line chore gets a short PR, a breaking API change gets a detailed one.

---

## Step 3 — Write the description

Use this structure. Omit sections that genuinely don't apply — a
dependency update doesn't need a "How to test" section beyond "CI passes".

```markdown
## What

[2–4 sentences. What was changed. Factual, specific. Name the files,
functions, or systems involved if helpful. No "this PR" or "I have"
— write in third person or imperative.]

## Why

[2–3 sentences. Why this change was needed. The problem being solved,
the requirement being met, or the improvement being made. Link to issue,
ticket, or Slack thread if one exists.]

## How it works (optional)

[Include only for non-obvious implementations. A brief explanation of
the approach taken, especially if alternatives were considered and
rejected. Diagrams or code snippets if they save the reviewer time.]

## How to test

[Specific steps a reviewer can follow to verify the change works.
Not "run the tests" — actual user-facing or API-level verification steps.
Include:
- Preconditions (test data, env vars, feature flags to enable)
- Steps to exercise the change
- Expected outcome]

## Risks and notes

[Only if applicable. Include any of:
- Parts of the code that feel uncertain or need extra reviewer attention
- Known limitations or follow-up work this defers
- Side effects on other systems or teams
- Performance implications
- Any manual steps required alongside this PR (migration, config change)]

## Checklist

- [ ] Tests added or updated
- [ ] Docs updated (if behaviour changed)
- [ ] No new warnings in CI
- [ ] Feature flag added (if applicable)
- [ ] Breaking change documented in changelog
```

---

## Step 4 — Tailor the length

Match the PR's scope to the description's length:

| Change scope | Description length |
|---|---|
| Single file, low risk (typo, rename, dep bump) | 3–5 lines, no sections needed |
| Single feature or bug fix | Full structure, ~150–300 words |
| Multi-system change or refactor | Full structure + How it works, ~300–500 words |
| Breaking change | Full structure + migration notes, as long as needed |

Never pad a simple PR to seem thorough. Never abbreviate a risky one
to seem efficient.

---

## Step 5 — Title

Write a PR title in conventional commit format:

```
<type>(<scope>): <short description>
```

Rules:
- Type: `feat`, `fix`, `refactor`, `chore`, `perf`, `docs`, `test`
- Scope: the module, service, or area affected (optional but useful)
- Description: imperative, lowercase, no period, under 72 characters
- Breaking changes: append `!` after type/scope: `feat(auth)!: replace JWT with session tokens`

Examples:
```
fix(auth): handle null user on session refresh
feat(billing): add proration to plan upgrades
chore(deps): update lodash to 4.17.21
refactor(api): extract pagination logic into shared util
perf(db): add index on users.email for login queries
```

---

## Examples

### Example 1 — Diff only
**User:** pastes a diff with no context

**Actions:**
1. Extract what changed from the diff
2. Ask: "What's the purpose of these changes?"
3. Write description once intent is provided

### Example 2 — Commit log
**User:** pastes a list of commits like:
```
fix: handle null user in session middleware
fix: add guard for missing address field
test: add tests for session edge cases
```

**Actions:**
1. Infer this is a defensive bug fix release
2. Group related commits into a coherent "What" narrative
3. Infer "Why" from commit messages — flag if unclear
4. Write a unified description, not one paragraph per commit

### Example 3 — "Write a PR for this feature"
**User:** describes a feature in plain language

**Actions:**
1. Use their words for "Why" verbatim where possible — they know the intent
2. Expand into structured format
3. Write "How to test" based on the feature's user-visible behaviour

### Example 4 — Breaking change
**User:** "I renamed the `username` field to `handle` across the API"

**Actions:**
1. Mark as `feat(api)!:` — breaking change
2. "Risks and notes" gets a migration section:
   - What callers need to update
   - Whether the old field is still accepted temporarily
   - Suggested deprecation timeline
3. Checklist explicitly includes "changelog updated" and "API consumers notified"

---

## Troubleshooting

**Diff is too large to read in full:**
Summarise by file or module — group related changes. Flag to the user
that a large PR is harder to review and suggest splitting if it contains
unrelated changes.

**Commits are messy or uninformative ("fix stuff", "wip", "asdf"):**
Infer intent from the diff itself. Note in the description: "Commit
messages didn't convey intent — description inferred from code changes."

**User has a PR template in their repo:**
If the user shares it, fill it in exactly. Never replace an existing
template with this structure — adapt to what's already there.

**Change is purely internal (refactor, test, chore):**
Keep it short. Reviewers need to trust it doesn't change behaviour —
so the most important thing to communicate is what was not changed, and
why the refactor was safe.