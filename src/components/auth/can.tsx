"use client";

import type { ReactNode } from "react";

import { staffCan, type Permission } from "@/lib/auth/permissions";
import { useStaff } from "@/lib/auth/staff-context";

/**
 * Client-side conditional renderer. Reads the active staff from context
 * and renders children only if the requested permission resolves true.
 *
 * For server components, import { CanServer } from "./can-server" instead
 * and pass the staff object explicitly.
 */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const staff = useStaff();
  return staffCan(staff, permission) ? <>{children}</> : <>{fallback}</>;
}
