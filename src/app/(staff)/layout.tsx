import { redirect } from "next/navigation";

import type { Role, StaffWithOverrides } from "@/lib/auth/permissions";
import { StaffProvider } from "@/lib/auth/staff-context";
import { createClient } from "@/lib/supabase/server";

import { StaffSidebar } from "./_components/staff-sidebar";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: row } = await supabase
    .schema("crm")
    .from("staff")
    .select(
      "id, role, first_name, last_name, email, is_active, permission_overrides, password_reset_required_at",
    )
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!row || !row.is_active) {
    await supabase.auth.signOut();
    redirect("/login?error=unauthorized");
  }

  // Forced-reset gate. If the row has a non-null timestamp, the user must
  // pick a new password before reaching anything inside (staff)/. The
  // reset-password page lives in (auth)/, so this layout doesn't run there
  // — no redirect loop is possible.
  if (row.password_reset_required_at !== null) {
    redirect("/reset-password");
  }

  const staff: StaffWithOverrides = {
    id: row.id,
    role: row.role as Role,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    permission_overrides:
      (row.permission_overrides as Record<string, boolean> | null) ?? {},
  };

  return (
    <StaffProvider staff={staff}>
      <div className="flex min-h-screen">
        <StaffSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </StaffProvider>
  );
}
