import Link from "next/link";
import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

import { NewCaseWizard } from "./_components/wizard";

export default async function NewCasePage() {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "create_cases")) {
    redirect("/dashboard?error=forbidden_create_cases");
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: serviceTypes }, { data: templates }, { data: countries }] =
    await Promise.all([
      supabase
        .schema("ref")
        .from("service_types")
        .select("id, code, name")
        .eq("is_active", true)
        .order("display_order"),
      supabase
        .schema("ref")
        .from("service_templates")
        .select("service_type_id, effective_from, effective_to"),
      supabase
        .schema("ref")
        .from("countries")
        .select("code, name")
        .eq("is_active", true)
        .order("name"),
    ]);

  const typesWithChecklist = new Set(
    (templates ?? [])
      .filter(
        (t) =>
          t.effective_from <= today &&
          (t.effective_to === null || t.effective_to >= today),
      )
      .map((t) => t.service_type_id),
  );

  const serviceOptions = (serviceTypes ?? []).map((st) => ({
    id: st.id,
    code: st.code,
    name: st.name,
    hasChecklist: typesWithChecklist.has(st.id),
  }));

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 text-sm text-stone-500">
            <Link href="/dashboard" className="hover:text-stone-800">
              Cases
            </Link>
            <span>›</span>
            <span className="text-stone-800">New case</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <NewCaseWizard
          serviceOptions={serviceOptions}
          countries={countries ?? []}
        />
      </main>
    </div>
  );
}
