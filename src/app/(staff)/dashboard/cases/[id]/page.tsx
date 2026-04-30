import { format } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

import { AdvanceDialog } from "./_components/advance-dialog";
import {
  AssignmentCard,
  type StaffOption,
} from "./_components/assignment-card";
import { CaseTabs, VALID_TABS, type Tab } from "./_components/case-tabs";
import {
  DocumentChecklist,
  type LatestDoc,
} from "./_components/document-checklist";
import { OneDriveCard } from "./_components/onedrive-card";
import { PhasePipeline } from "./_components/phase-pipeline";
import { RecordPaymentTrigger } from "./_components/record-payment-trigger";

type CaseStatus = Database["crm"]["Enums"]["case_status"];

const statusPill: Record<CaseStatus, { label: string; className: string }> = {
  retainer_signed: {
    label: "Retainer Signed",
    className: "bg-gray-200 text-gray-700",
  },
  documentation_in_progress: {
    label: "Documentation",
    className: "bg-blue-100 text-blue-800",
  },
  documentation_review: {
    label: "In Review",
    className: "bg-blue-100 text-blue-800",
  },
  submitted_to_ircc: {
    label: "Submitted",
    className: "bg-amber-100 text-amber-800",
  },
  biometrics_pending: {
    label: "Biometrics",
    className: "bg-teal-100 text-teal-800",
  },
  biometrics_completed: {
    label: "Biometrics",
    className: "bg-teal-100 text-teal-800",
  },
  awaiting_decision: {
    label: "Awaiting Decision",
    className: "bg-teal-100 text-teal-800",
  },
  passport_requested: {
    label: "Passport Request",
    className: "bg-green-100 text-green-800",
  },
  refused: {
    label: "Refused",
    className: "bg-red-100 text-red-800",
  },
  additional_info_requested: {
    label: "More Info",
    className: "bg-amber-100 text-amber-800",
  },
  closed: {
    label: "Closed",
    className: "bg-gray-200 text-gray-700",
  },
};

const cadFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});
const formatCad = (n: number) => cadFormatter.format(n);

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; folderPending?: string }>;
};

export default async function CasePage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  const tab: Tab = (VALID_TABS as readonly string[]).includes(sp.tab ?? "")
    ? (sp.tab as Tab)
    : "documents";
  const folderPending = sp.folderPending === "1";

  const me = await getStaff();
  const canEditCase = me ? staffCan(me, "edit_cases") : false;

  const supabase = await createClient();

  const { data: caseRow } = await supabase
    .schema("crm")
    .from("cases")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!caseRow) notFound();

  const [
    clientRes,
    serviceRes,
    templateDocsRes,
    uploadedDocsRes,
    paymentsRes,
    tasksRes,
    staffRes,
  ] = await Promise.all([
    supabase
      .schema("crm")
      .from("clients")
      .select("legal_name_full, client_number, family_name, given_names")
      .eq("id", caseRow.client_id)
      .maybeSingle(),
    supabase
      .schema("ref")
      .from("service_types")
      .select("name")
      .eq("id", caseRow.service_type_id)
      .maybeSingle(),
    supabase
      .schema("ref")
      .from("template_documents")
      .select(
        "document_code, document_label, category, is_required, condition_label, display_order",
      )
      .eq("service_template_id", caseRow.service_template_id)
      .order("display_order"),
    supabase
      .schema("files")
      .from("documents")
      .select(
        "document_code, status, file_name, version_number, sharepoint_web_url",
      )
      .eq("case_id", id)
      .is("deleted_at", null),
    supabase
      .schema("crm")
      .from("payments")
      .select("amount_cad, is_refund")
      .eq("case_id", id)
      .is("deleted_at", null),
    supabase
      .schema("crm")
      .from("tasks")
      .select("id, title, due_date")
      .eq("case_id", id)
      .is("deleted_at", null)
      .in("status", ["open", "in_progress"])
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .schema("crm")
      .from("staff")
      .select("id, first_name, last_name, role")
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("last_name", { ascending: true }),
  ]);

  const client = clientRes.data;
  const service = serviceRes.data;
  const templateDocs = templateDocsRes.data ?? [];
  const uploadedDocs = uploadedDocsRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const allStaff = staffRes.data ?? [];

  // Role-based gating is intentionally off for now — assignment is open
  // to any active staff member. We'll narrow this down later once the
  // role/permission story for assignments is settled.
  const assignableStaff: StaffOption[] = allStaff.map((s) => ({
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
  }));

  // Latest version per document_code
  const latestByCode = new Map<string, LatestDoc>();
  for (const doc of uploadedDocs) {
    if (!doc.document_code) continue;
    const existing = latestByCode.get(doc.document_code);
    if (!existing || doc.version_number > existing.version_number) {
      latestByCode.set(doc.document_code, {
        status: doc.status,
        file_name: doc.file_name,
        sharepoint_web_url: doc.sharepoint_web_url,
        version_number: doc.version_number,
      });
    }
  }

  const collected = payments.reduce(
    (acc, p) => acc + (p.is_refund ? -1 : 1) * Number(p.amount_cad),
    0,
  );
  const quoted = Number(caseRow.quoted_fee_cad);
  const paymentPct =
    quoted > 0 ? Math.min(100, Math.round((collected / quoted) * 100)) : 0;
  const retainerMin =
    caseRow.retainer_minimum_cad === null
      ? null
      : Number(caseRow.retainer_minimum_cad);
  const paidInFull = quoted > 0 && collected >= quoted;
  const retainerSatisfied =
    retainerMin === null ? collected > 0 : collected >= retainerMin;

  const pill = statusPill[caseRow.status];

  const nextTask = tasks[0];

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-4 text-sm">
          <Link href="/dashboard" className="text-stone-500 hover:text-stone-800">
            Cases
          </Link>
          <span className="mx-2 text-stone-400">›</span>
          <span className="font-medium text-stone-800">
            {caseRow.case_number}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-6 py-6">
        {folderPending && (
          <div
            role="alert"
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <strong>OneDrive folder is pending.</strong> The case was created,
            but the folder couldn&apos;t be provisioned automatically. Use the
            &ldquo;Retry folder creation&rdquo; button in the OneDrive card on
            the right to try again.
          </div>
        )}

        {/* Header card */}
        <Card>
          <CardContent className="flex items-start justify-between gap-6 p-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--navy)]">
                {client?.legal_name_full ?? "—"}
              </h1>
              <p className="mt-1 text-sm text-stone-600">
                {service?.name ?? "—"} · {caseRow.case_number} · opened{" "}
                {format(new Date(caseRow.opened_at), "MMM d, yyyy")}
              </p>
            </div>
            <Badge
              className={`${pill.className} shrink-0 rounded-full px-3 py-1 font-medium`}
            >
              {pill.label}
            </Badge>
          </CardContent>
        </Card>

        <PhasePipeline status={caseRow.status}>
          <AdvanceDialog
            caseId={caseRow.id}
            currentStatus={caseRow.status}
            quotedFeeCad={quoted}
            retainerMinimumCad={retainerMin}
            collectedCad={collected}
          />
        </PhasePipeline>

        <CaseTabs caseId={caseRow.id} activeTab={tab} />

        {tab === "documents" ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <DocumentChecklist
              caseId={caseRow.id}
              templateDocs={templateDocs}
              latestByCode={latestByCode}
            />
            <aside className="space-y-3">
              <Card>
                <CardContent className="space-y-2 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Payment
                  </div>
                  <div className="text-xl font-semibold text-stone-900">
                    {formatCad(collected)} / {formatCad(quoted)}
                  </div>
                  <div className="text-xs text-stone-500">
                    {paymentPct}% paid
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${paymentPct}%` }}
                    />
                  </div>

                  {(paidInFull || retainerSatisfied) && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {paidInFull && (
                        <Badge className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Paid in full
                        </Badge>
                      )}
                      {retainerSatisfied && !paidInFull && (
                        <Badge className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Retainer satisfied
                        </Badge>
                      )}
                    </div>
                  )}

                  <RecordPaymentTrigger caseId={caseRow.id} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-2 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Assigned
                  </div>
                  <AssignmentCard
                    caseId={caseRow.id}
                    assignedId={caseRow.assigned_rcic}
                    options={assignableStaff}
                    canEdit={canEditCase}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-1 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Tasks
                  </div>
                  <div className="text-sm font-medium text-stone-900">
                    {tasks.length} open
                  </div>
                  {nextTask ? (
                    <div className="text-xs text-stone-500">
                      Next: {nextTask.title}
                      {nextTask.due_date
                        ? ` due ${format(new Date(nextTask.due_date), "MMM d")}`
                        : ""}
                    </div>
                  ) : (
                    <div className="text-xs text-stone-500">No open tasks</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-2 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    OneDrive
                  </div>
                  <OneDriveCard
                    caseId={caseRow.id}
                    folderId={caseRow.sharepoint_folder_id}
                    folderUrl={caseRow.sharepoint_folder_url}
                  />
                </CardContent>
              </Card>
            </aside>
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-stone-500">
              Coming soon
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
