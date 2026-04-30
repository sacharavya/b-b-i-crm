---
name: security-auditor
description: >
  Proactively audits code for security vulnerabilities: injection, auth
  gaps, exposed secrets, insecure data handling, and OWASP top-10 issues.
  Use when user says "security audit", "check this for vulnerabilities",
  "is this secure", "audit this endpoint", "check for security issues",
  "review this for auth problems", or before a significant release or
  penetration test. Also triggers when user shares auth, payment, or
  user-data handling code without a specific question.
  Does NOT replace a professional security audit for regulated or
  high-risk systems. Does NOT trigger for general coding help.
license: MIT
metadata:
  author: sagun karanjit
  version: 1.0.0
  category: security
---

# Security auditor

## Purpose
Find real security vulnerabilities in code before they reach production.
Focus on issues with concrete exploitation paths — not theoretical risks
or style preferences dressed up as security concerns.

---

## Important scope note

This skill covers code-level security issues. It does not cover:
- Infrastructure security (firewall rules, VPC config, IAM policies)
- Dependency CVEs — use `npm audit` / `yarn audit` for those
- Penetration testing or runtime attack simulation
- Compliance requirements (SOC2, HIPAA, PCI-DSS) — those need a
  qualified auditor

For high-stakes systems handling payments, health data, or regulated PII,
treat findings here as a starting point, not a complete audit.

---

## Step 1 — Understand the attack surface

Before auditing, identify:

1. **Entry points** — what inputs does this code accept?
   (HTTP requests, form fields, URL params, file uploads, websocket
   messages, environment variables, inter-service calls)
2. **Trust boundaries** — where does untrusted data cross into trusted
   systems? (user input → DB, user input → shell, user data → HTML)
3. **Sensitive operations** — auth checks, data writes, file access,
   external service calls, token generation
4. **Data in scope** — does this handle PII, credentials, payment data,
   or tokens?

---

## Step 2 — Audit across eight vectors

Check each vector. Only report findings with a concrete exploitation path.
Do not report theoretical risks without evidence in the code.

---

### Vector 1 — Injection

**SQL injection**
- User-controlled values interpolated directly into SQL strings
- Fix: parameterised queries / prepared statements always

```
// Vulnerable
db.query(`SELECT * FROM users WHERE email = '${email}'`)

// Safe
db.query('SELECT * FROM users WHERE email = $1', [email])
```

**Command injection**
- User input passed to `exec`, `spawn`, `eval`, `Function()`, or
  template engines without sanitisation
- Fix: never pass user input to shell commands; use argument arrays,
  not string interpolation

**NoSQL injection**
- User-controlled objects passed directly to MongoDB queries
  (e.g. `{ $where: userInput }`)
- Fix: validate and sanitise query objects; use schema validation

**Template injection**
- User input rendered in server-side templates without escaping
- Fix: always escape output; never render raw user strings as templates

---

### Vector 2 — Authentication and authorisation

**Missing auth guard**
- Route or function accessible without authentication check
- Check: every route that accesses user data has an auth middleware

**Broken authorisation**
- User A can access User B's data by changing an ID in the request
- Check: every data query is scoped to the authenticated user's ID,
  not a user-supplied ID alone

```
// Vulnerable — user can supply any userId
const order = await Order.findById(req.params.orderId)

// Safe — scoped to authenticated user
const order = await Order.findOne({
  id: req.params.orderId,
  userId: req.user.id   // from verified session, not request
})
```

**Privilege escalation**
- User can assign themselves a higher role
- Check: role assignment always comes from server state, never from
  user-supplied input

**Weak session handling**
- Sessions not invalidated on logout
- Session tokens not rotated after privilege change
- Tokens with no expiry

---

### Vector 3 — Secrets and credentials

**Hardcoded secrets**
- API keys, tokens, passwords, or connection strings in source code
- Check all string literals against these patterns:
  `sk_`, `pk_`, `Bearer `, `password =`, `secret =`, `api_key =`
- Fix: use environment variables; never commit secrets to git

**Secrets in logs**
- Passwords, tokens, or PII appearing in log statements
- Check: `console.log`, `logger.info`, error messages for sensitive fields

**Exposed env vars to client**
- In Next.js/Vite: any env var not prefixed with `NEXT_PUBLIC_` /
  `VITE_` should never reach client bundles
- Check: server-side secrets not leaked through `getStaticProps`,
  `getServerSideProps`, or API responses

---

### Vector 4 — Input validation and sanitisation

**Missing validation on user input**
- Type, length, format, and range not validated before processing
- Especially critical for: file uploads, numeric IDs, enum fields,
  date ranges

**Path traversal**
- User-controlled file paths allowing access outside intended directory
  (`../../etc/passwd`)
- Fix: validate and normalise all file paths; use `path.resolve` and
  check the result starts with the allowed base directory

**Mass assignment**
- User-supplied object spread directly onto a database model
- Fix: explicit allowlist of assignable fields

```
// Vulnerable
await User.update(req.body)

// Safe
const { name, email } = req.body
await User.update({ name, email })
```

---

### Vector 5 — Data exposure

**Over-exposed API responses**
- Returning full database rows including sensitive fields (passwords,
  tokens, internal IDs, PII) the client doesn't need
- Fix: explicit response serialisation — never return raw DB objects

**PII logging or storage**
- Email, phone, name, address stored in logs or error tracking without
  redaction
- Fix: redact before logging; use structured logging with field-level
  redaction

**Sensitive data in URLs**
- Tokens, session IDs, or PII in query strings (appear in server logs,
  browser history, referrer headers)
- Fix: sensitive values in request body or headers, never URL params

---

### Vector 6 — CSRF and XSS

**Cross-site request forgery (CSRF)**
- State-changing endpoints accessible via cross-origin requests without
  a CSRF token
- Check: POST/PUT/DELETE endpoints have CSRF protection or use
  SameSite=Strict cookies + origin validation

**Cross-site scripting (XSS)**
- User-controlled content rendered as raw HTML
- In React: `dangerouslySetInnerHTML` with unsanitised content
- In templates: unescaped output (`{{{ value }}}` in Handlebars, etc.)
- Fix: escape all user content; use `DOMPurify` if HTML rendering is
  genuinely required

---

### Vector 7 — Dependencies and supply chain

**Outdated dependencies with known CVEs**
- Check: run `npm audit` / `yarn audit` and surface Critical and High
  findings
- Note which findings are in production dependencies vs. dev-only

**Overly broad package permissions**
- Packages with postinstall scripts that run arbitrary code
- Not always detectable from code alone — flag for manual review

---

### Vector 8 — Monorepo-specific risks

**Shared package exposing internals**
- Types or utilities in the shared package that expose internal
  implementation details to the frontend bundle
- Fix: explicit exports — never `export * from` an internal module

**Service-to-service auth**
- Internal API calls between services relying on `req.user` without
  verifying the call came from a trusted service
- Fix: service-to-service calls use a shared secret or mTLS,
  not user session tokens

**Environment variable leakage across packages**
- Shared config package that bundles server secrets into the frontend
- Fix: separate frontend and backend config packages; never import
  server config in frontend code

---

## Step 3 — Format output

```
## Security audit — [filename or area]

### Summary
[2–3 sentences: overall risk level, most critical finding, whether this
is safe to ship as-is.]

---

### Findings

#### 🔴 Critical — exploit path exists, fix before shipping
- **[Vector]** [File:line if known] — [Vulnerability].
  Exploit: [How an attacker would use this]
  Fix: [Specific corrected code]

#### 🟡 Major — significant risk, fix soon
- **[Vector]** — [Vulnerability and fix]

#### 🔵 Minor — low risk, worth addressing
- **[Vector]** — [Issue and fix]

---

### What's secure
- [Specific things done correctly — be precise]

---

### Recommended next steps
1. [Most critical fix]
2. [Second priority]
3. [Any tooling to add: audit scripts, linting rules, secret scanning]
```

Severity guide:
- **Critical** — direct exploit path: data exfiltration, auth bypass,
  RCE, credential exposure
- **Major** — likely attack vector with real impact if exploited
- **Minor** — defence-in-depth issue, low exploitation likelihood

---

## Examples

### Example 1 — Auth endpoint
**User:** shares a login or session route

**Actions:**
1. Check: SQL/NoSQL injection in credential lookup
2. Check: timing-safe comparison for passwords/tokens
3. Check: session token rotation after login
4. Check: account enumeration via different error messages

### Example 2 — "Audit this before our pentest"
**User:** shares multiple files ahead of a security review

**Actions:**
1. Systematic pass through all eight vectors
2. Prioritise by exploitability — remote, unauthenticated exploits first
3. Flag areas the pentester should focus on manually

### Example 3 — Data handling code
**User:** shares code that processes user uploads or PII

**Actions:**
1. Path traversal on file operations
2. File type validation (MIME type, not just extension)
3. PII in logs or error messages
4. Over-exposed response fields

---

## Troubleshooting

**Finding requires context not in the code:**
Note the assumption required: "This is safe IF the auth middleware
always runs before this handler — verify that in your router config."

**User pushes back on a finding:**
Explain the concrete exploit path. If they provide context that
genuinely removes the risk, update the severity or retract. Never
defend a finding that doesn't apply.

**Code is in a framework with built-in protections:**
Acknowledge the protection and confirm it's configured correctly.
"Next.js escapes JSX by default — this is safe unless
dangerouslySetInnerHTML is used, which it isn't here."