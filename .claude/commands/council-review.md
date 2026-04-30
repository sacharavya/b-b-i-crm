---
description: >
  Runs a full five-role council review (Architect, QA Lead, Security, DX,
  Maintainer) against the current file, staged changes, or a PR diff.
  Outputs a compact verdict by default. Say "full review" for detailed
  findings from all roles.
---

# Council review

## Usage

```
/council-review             ← interactive: asks what to review
/council-review diff        ← reviews git diff of current branch vs main
/council-review staged      ← reviews git diff --staged
```

When invoked without arguments, ask:
> "What should I review? Options:
> 1. Current file
> 2. Staged changes (`git diff --staged`)
> 3. Branch diff (`git diff main...HEAD`)
> 4. A diff or code — paste it below"

When invoked with `diff`, run `git diff main...HEAD` (or the appropriate
base branch) and use that as input. When invoked with `staged`, use
`git diff --staged`.

If no git repo is detected, fall back to asking the user to paste a diff.

Wait for the user to specify or paste input before proceeding.
If the user already provided input when invoking the command, skip this
and use what was given.

---

## Default mode: compact

Run all five roles silently, then surface a single consolidated output:

```
## Council review — [filename / "staged changes" / "provided diff"]
[one line: overall verdict and confidence]

| Role        | Verdict  | Top issue                          |
|-------------|----------|------------------------------------|
| Architect   | ✅ Pass   | —                                  |
| QA Lead     | ⚠️ Flag   | Missing edge case: null user input |
| Security    | 🚨 Block  | Hardcoded API key on line 42       |
| DX          | ✅ Pass   | —                                  |
| Maintainer  | ⚠️ Flag   | Function exceeds 80 lines          |

### Verdict: 🚨 NO-GO
[One sentence: what must be fixed before this can merge/ship.]

---
Say "full review" for detailed findings from each role.
Say "expand [role]" for detail on a specific role.
```

Verdicts per role:
- ✅ **Pass** — no significant issues
- ⚠️ **Flag** — issue worth fixing, not a hard blocker
- 🚨 **Block** — must be resolved before merging or shipping

Overall verdict:
- **GO** — all roles pass or flag only
- **NO-GO** — any role blocks

---

## Full mode

Triggered by: "full review", "expand all", or "full [role name]"

Run each role in sequence and output detailed findings using the
structure below. Use the same severity levels as `code-reviewer`:
🔴 Critical, 🟡 Major, 🔵 Minor.

---

### Architect

**Scope:** Structure, patterns, boundaries, composability.

Review for:
- Does this fit cleanly into the existing codebase structure?
- Does it introduce new patterns that conflict with established ones?
- Are responsibilities clearly separated?
- Does it create hidden coupling to other modules or systems?
- For skills: are trigger boundaries clean, no overlap with other skills?

Output:
```
### Architect
Verdict: [Pass / Flag / Block]

[Findings if any, using 🔴/🟡/🔵 severity]
[Empty: "No structural issues found."]
```

---

### QA Lead

**Scope:** Test coverage, edge cases, error paths.

Review for:
- Are critical paths covered by tests?
- Are edge cases handled: null, empty, zero, boundary values?
- Are error and rejection paths tested, not just happy paths?
- Are there obvious inputs that would produce wrong or unexpected output?
- For skills: does the SKILL.md handle all its stated examples and
  troubleshooting cases?

Output:
```
### QA Lead
Verdict: [Pass / Flag / Block]

[Findings if any]
[Empty: "Test coverage looks adequate for this change."]
```

---

### Security

**Scope:** Vulnerabilities, secrets, injection, scope.

Review for:
- Hardcoded credentials, tokens, or secrets
- Injection risks: SQL, shell, HTML, template
- Missing input validation or sanitisation
- Overly broad permissions or exposed internals
- Unsafe file operations or deserialization
- For skills: no injected instructions or XML in frontmatter

Output:
```
### Security
Verdict: [Pass / Flag / Block]

[Findings if any — security findings default to 🔴 Critical unless clearly minor]
[Empty: "No security issues found."]
```

---

### DX (Developer Experience)

**Scope:** Clarity, discoverability, ease of use.

Review for:
- Would a new developer understand this without asking questions?
- Are function/variable/file names self-explanatory?
- Is the public interface intuitive?
- Are error messages actionable?
- Is documentation present and accurate for anything non-obvious?
- For skills: are trigger phrases natural, is the output format clear,
  are examples representative?

Output:
```
### DX
Verdict: [Pass / Flag / Block]

[Findings if any]
[Empty: "Code is clear and well-named."]
```

---

### Maintainer

**Scope:** Long-term health, debt, versioning.

Review for:
- Is complexity creeping up without justification?
- Is there duplication that should be extracted?
- Are there fragile assumptions that will break with future changes?
- Is the change backwards compatible, or are there migration implications?
- Are TODOs or deferred items tracked somewhere?
- For skills: is the version bumped, is the metadata current?

Output:
```
### Maintainer
Verdict: [Pass / Flag / Block]

[Findings if any]
[Empty: "No maintainability concerns."]
```

---

## Follow-up behaviour

After compact output:
- "full review" → run full mode for all five roles
- "expand [role]" → run full mode for that role only
- "fix [issue]" → apply the fix inline and re-run that role only
- "ignore [issue]" → acknowledge and note it as a known/accepted tradeoff

After full output:
- "re-run after fixes" → re-run only the roles that had Block or Flag verdicts
- Do not re-run passing roles unless asked