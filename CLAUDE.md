@AGENTS.md

# Permissions

The CRM uses a role + permission-overrides model. Three layers must agree
on every flag:

1. **UI** — `<Can permission="...">` (client, reads
   `useStaff()` from `src/lib/auth/staff-context.tsx`) or
   `<CanServer staff={me} permission="...">` (server, takes the staff
   object explicitly). Both live in `src/components/auth/`.

2. **Server actions** — load the staff via `getStaff()` from
   `src/lib/auth/staff.ts` and call `staffCan(staff, permission)`. Always
   gate at the action level, even if the UI already hid the trigger.

3. **RLS** — Postgres policies use
   `crm.staff_can(auth.uid(), 'permission_name')` in their `USING`
   clauses. The function lives in
   `supabase/migrations/20260501000003_user_management.sql`.

## Adding a new permission

Two places, in lock-step:

- **TypeScript** — append to the `Permission` union and the appropriate
  role entries in `ROLE_PERMISSIONS` in `src/lib/auth/permissions.ts`.
  If the permission is per-staff overrideable, add it to
  `PERMISSION_OVERRIDABLE` too.
- **SQL** — write a new migration that `CREATE OR REPLACE FUNCTION
  crm.staff_can(...)` with the updated CASE branches. The TS map and
  the SQL function are duplicated by design (UI vs RLS); there is no
  automated cross-check.

## Role hierarchy (application layer)

- `super_user` can manage anyone, including other super_users.
- `admin` cannot create, edit, deactivate, or reset passwords for other
  `admin` or `super_user` rows. Enforced via `canActOnRole()` in
  `src/lib/validators/staff.ts` and inside the staff server actions.
- The DB does not enforce this — RLS allows either role to write
  `crm.staff`. The application-only constraint is intentional so a
  service-role recovery path exists when both super_users lose access.

## Override-able permissions

Only the flags in `PERMISSION_OVERRIDABLE` (currently
`view_financials`, `export_data`, `delete_cases`, `delete_clients`,
`review_documents`) can be overridden per-staff via
`crm.staff.permission_overrides`. Anything else is role-only — putting
it in the JSONB has no effect.

# Engineering workflows

Curated Claude Code tooling vendored from
[`sagunji/eng-workflows`](https://github.com/sagunji/eng-workflows) (MIT).
Files live under `.claude/commands/` and `.claude/skills/`.

**Slash commands**

- `/preflight` — pre-commit gate (secrets, debug artefacts, test
  alignment, diff sanity). Run before every commit.
- `/council-review` — five-role quality review (architecture, QA,
  security, DX, maintenance) for a branch or PR.
- `/architecture` — codebase audit for drift, coupling, gaps.

**Auto-triggering skills** (loaded by description, no manual invoke)

- `code-reviewer` — quality + anti-pattern review on a paste/diff.
- `db-schema-reviewer` — migration / schema design review (high
  signal here: each migration in `supabase/migrations/` is worth
  running through this).
- `debug-detective` — error / runtime diagnosis.
- `pr-describer` — generates PR descriptions from a branch diff.
- `security-auditor` — input-to-output trace, exploit paths.
- `test-writer` — produces test coverage. The CRM has no test suite
  yet; this skill is the on-ramp.

## Delete authority

Three permissions control destructive (hard-delete) operations on core
records: `delete_cases`, `delete_clients`, `delete_checklists`. All three
are super_user only and NOT overridable per-staff. Admins, RCICs, and
other roles can deactivate or archive but cannot permanently delete
these records. The non-overridability is enforced in three places that
must agree:

- **TS**: `NON_OVERRIDABLE_PERMISSIONS` in
  `src/lib/auth/permissions.ts` — `staffCan()` skips any
  `permission_overrides` value for these keys and falls through to the
  role table.
- **SQL**: the early `IF p_permission IN (...) THEN RETURN v_role =
  'super_user'` branch in `crm.staff_can()` (migration
  `20260502000007_tighten_delete_permissions.sql`).
- **RLS**: `crm.cases.cases_delete`, `crm.clients.clients_delete`, and
  the per-command `service_types_delete` / `service_templates_delete`
  policies all route through `staff_can()`.

When wiring new delete UI, gate the trigger with `staffCan()` (or
`<Can>`) AND re-check it inside the server action as defense in depth.
UI gating alone is not sufficient.
