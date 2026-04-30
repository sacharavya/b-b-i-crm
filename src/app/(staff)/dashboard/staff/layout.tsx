import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";

export default async function StaffMgmtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getStaff();
  if (!staff || !staffCan(staff, "manage_staff")) {
    redirect("/dashboard?error=forbidden_staff_management");
  }
  return <>{children}</>;
}
