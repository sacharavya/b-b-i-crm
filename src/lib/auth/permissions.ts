/**
 * Application-layer source of truth for the role/permission model.
 *
 * Mirrors crm.staff_can() in 20260501000003_user_management.sql, which is
 * the database-layer source of truth used by RLS. Keep them in sync when
 * the role defaults change — there's no automated cross-check.
 */

export type Role =
  | "super_user"
  | "admin"
  | "rcic"
  | "document_officer"
  | "reception"
  | "readonly"
  // Legacy enum values still present in crm.staff_role. No production
  // rows currently carry these; they're handled defensively as
  // zero-permission so that any forgotten row fails closed.
  | "paralegal"
  | "staff";

export type Permission =
  | "view_dashboard"
  | "view_cases"
  | "create_cases"
  | "edit_cases"
  | "delete_cases"
  | "advance_phase"
  | "view_clients"
  | "create_clients"
  | "edit_clients"
  | "delete_clients"
  | "view_documents"
  | "upload_documents"
  | "review_documents"
  | "view_communications"
  | "create_communications"
  | "view_tasks"
  | "manage_tasks"
  | "view_financials"
  | "record_payments"
  | "edit_invoices"
  | "view_intake_form"
  | "edit_intake_form"
  | "view_audit_log"
  | "manage_staff"
  | "manage_super_users"
  | "manage_admins"
  | "reset_passwords"
  | "export_data"
  | "change_system_settings";

export type StaffWithOverrides = {
  id: string;
  role: Role;
  first_name: string;
  last_name: string;
  email: string;
  permission_overrides: Record<string, boolean>;
};

const ALL_PERMISSIONS: ReadonlyArray<Permission> = [
  "view_dashboard",
  "view_cases",
  "create_cases",
  "edit_cases",
  "delete_cases",
  "advance_phase",
  "view_clients",
  "create_clients",
  "edit_clients",
  "delete_clients",
  "view_documents",
  "upload_documents",
  "review_documents",
  "view_communications",
  "create_communications",
  "view_tasks",
  "manage_tasks",
  "view_financials",
  "record_payments",
  "edit_invoices",
  "view_intake_form",
  "edit_intake_form",
  "view_audit_log",
  "manage_staff",
  "manage_super_users",
  "manage_admins",
  "reset_passwords",
  "export_data",
  "change_system_settings",
];

const ADMIN_DENIED: ReadonlySet<Permission> = new Set([
  "manage_super_users",
  "manage_admins",
  "change_system_settings",
]);

const RCIC_PERMS: ReadonlyArray<Permission> = [
  "view_dashboard",
  "view_cases",
  "create_cases",
  "edit_cases",
  "advance_phase",
  "view_clients",
  "create_clients",
  "edit_clients",
  "view_documents",
  "upload_documents",
  "review_documents",
  "view_communications",
  "create_communications",
  "view_tasks",
  "manage_tasks",
  "view_financials",
  "record_payments",
  "edit_invoices",
  "view_intake_form",
  "edit_intake_form",
];

const DOCUMENT_OFFICER_PERMS: ReadonlyArray<Permission> = [
  "view_dashboard",
  "view_cases",
  "create_cases",
  "edit_cases",
  "view_clients",
  "edit_clients",
  "view_documents",
  "upload_documents",
  "review_documents",
  "view_communications",
  "create_communications",
  "view_tasks",
  "manage_tasks",
  "view_intake_form",
  "edit_intake_form",
];

const RECEPTION_PERMS: ReadonlyArray<Permission> = [
  "view_dashboard",
  "view_cases",
  "view_clients",
  "create_clients",
  "view_communications",
  "create_communications",
  "view_tasks",
];

const READONLY_PERMS: ReadonlyArray<Permission> = [
  "view_dashboard",
  "view_cases",
  "view_clients",
  "view_documents",
  "view_communications",
  "view_tasks",
  "view_financials",
  "view_intake_form",
];

export const ROLE_PERMISSIONS: Readonly<
  Record<Role, ReadonlySet<Permission>>
> = {
  super_user: new Set<Permission>(ALL_PERMISSIONS),
  admin: new Set<Permission>(
    ALL_PERMISSIONS.filter((p) => !ADMIN_DENIED.has(p)),
  ),
  rcic: new Set<Permission>(RCIC_PERMS),
  document_officer: new Set<Permission>(DOCUMENT_OFFICER_PERMS),
  reception: new Set<Permission>(RECEPTION_PERMS),
  readonly: new Set<Permission>(READONLY_PERMS),
  // Legacy roles default to zero permissions — fail closed.
  paralegal: new Set<Permission>(),
  staff: new Set<Permission>(),
};

/**
 * Permissions a super_user or admin can override per-staff via the
 * permission_overrides JSONB. Anything not listed here is role-only —
 * trying to set it in the JSON has no effect.
 */
export const PERMISSION_OVERRIDABLE: ReadonlySet<Permission> = new Set([
  "view_financials",
  "export_data",
  "delete_cases",
  "delete_clients",
  "review_documents",
]);

export function staffCan(
  staff: StaffWithOverrides,
  permission: Permission,
): boolean {
  if (PERMISSION_OVERRIDABLE.has(permission)) {
    const override = staff.permission_overrides[permission];
    if (typeof override === "boolean") return override;
  }
  return ROLE_PERMISSIONS[staff.role].has(permission);
}

/**
 * Materialise the full set of permissions a staff member effectively has,
 * after applying overrides. Useful for snapshotting into context or for
 * cheap multi-check lookups in render-heavy code.
 */
export function resolvePermissions(
  staff: StaffWithOverrides,
): ReadonlySet<Permission> {
  const set = new Set<Permission>();
  for (const perm of ALL_PERMISSIONS) {
    if (staffCan(staff, perm)) set.add(perm);
  }
  return set;
}
