import type { ReactNode } from "react";

import {
  staffCan,
  type Permission,
  type StaffWithOverrides,
} from "@/lib/auth/permissions";

/**
 * Server-component conditional renderer. Pass the staff object obtained
 * via getStaff() from "@/lib/auth/staff" — keeps the permission check
 * purely on the server and out of the RSC payload sent to the client.
 *
 * For client components use { Can } from "./can" instead, which reads
 * staff from context.
 */
export function CanServer({
  staff,
  permission,
  children,
  fallback = null,
}: {
  staff: StaffWithOverrides;
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return staffCan(staff, permission) ? <>{children}</> : <>{fallback}</>;
}
