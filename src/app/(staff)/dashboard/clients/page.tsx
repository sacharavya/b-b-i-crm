import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/index";

import { ClientsTable, type ClientRow } from "./_components/clients-table";

export default async function ClientsPage() {
  const me = await getStaff();
  if (!me) redirect("/login");

  if (!staffCan(me, "view_clients")) {
    redirect("/dashboard?error=forbidden_view_clients");
  }

  const supabase = await createClient();

  const { data: clients } = await supabase
    .schema("crm")
    .from("clients")
    .select(
      `
        id,
        client_number,
        legal_name_full,
        email,
        phone_primary,
        country_of_citizenship,
        created_at
      `,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const clientIds = (clients ?? []).map((c) => c.id);

  const { data: caseRows } = clientIds.length
    ? await supabase
        .schema("crm")
        .from("cases")
        .select("client_id, status")
        .is("deleted_at", null)
        .in("client_id", clientIds)
    : { data: [] as Array<{ client_id: string; status: string }> };

  const totalCasesByClient = new Map<string, number>();
  const openCasesByClient = new Map<string, number>();
  for (const row of caseRows ?? []) {
    totalCasesByClient.set(
      row.client_id,
      (totalCasesByClient.get(row.client_id) ?? 0) + 1,
    );
    if (row.status !== "closed") {
      openCasesByClient.set(
        row.client_id,
        (openCasesByClient.get(row.client_id) ?? 0) + 1,
      );
    }
  }

  const rows: ClientRow[] = (clients ?? []).map((c) => ({
    id: c.id,
    clientNumber: c.client_number,
    legalName: c.legal_name_full,
    email: c.email,
    phone: c.phone_primary,
    citizenship: c.country_of_citizenship,
    createdAt: c.created_at,
    totalCases: totalCasesByClient.get(c.id) ?? 0,
    openCases: openCasesByClient.get(c.id) ?? 0,
  }));

  const total = rows.length;
  const canCreateClients = staffCan(me, "create_clients");

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--navy)]">
            Clients
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {total === 0
              ? "No clients yet."
              : `${total} client${total === 1 ? "" : "s"}.`}
          </p>
        </div>
        {canCreateClients && (
          <Link
            href="/dashboard/clients/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            + New client
          </Link>
        )}
      </div>

      <ClientsTable rows={rows} />
    </main>
  );
}
