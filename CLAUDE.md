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
