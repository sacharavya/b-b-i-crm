"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { graphFetch } from "@/lib/graph/client";
import { uploadFile } from "@/lib/graph/uploads";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import {
  ALLOWED_EXTENSIONS_HUMAN,
  ALLOWED_MIME_TYPES_SET,
  MAX_UPLOAD_BYTES,
  formatBytesMb,
} from "@/lib/validators/document";
import { paymentSchema } from "@/lib/validators/payment";

type CaseUpdate = Database["crm"]["Tables"]["cases"]["Update"];

const CASE_STATUSES = [
  "retainer_signed",
  "documentation_in_progress",
  "documentation_review",
  "submitted_to_ircc",
  "biometrics_pending",
  "biometrics_completed",
  "awaiting_decision",
  "passport_requested",
  "refused",
  "additional_info_requested",
  "closed",
] as const;

const advanceSchema = z.object({
  caseId: z.string().uuid(),
  targetStatus: z.enum(CASE_STATUSES),
});

export type AdvanceInput = z.infer<typeof advanceSchema>;
export type AdvanceResult = { ok: true } | { error: string };

/**
 * Advance a case to a new phase. Calls crm.can_advance_phase() to enforce
 * the firm's payment gates; on a blocked transition the function returns
 * { error: <reason> } so the UI can swap to its gate-block view rather
 * than throw.
 */
export async function advancePhase(
  input: AdvanceInput,
): Promise<AdvanceResult> {
  const parsed = advanceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { caseId, targetStatus } = parsed.data;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: staff } = await supabase
    .schema("crm")
    .from("staff")
    .select("id")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!staff) return { error: "Active staff record not found" };

  // Current status — needed for the case_event payload and to short-circuit
  // no-op transitions.
  const { data: caseRow, error: caseErr } = await supabase
    .schema("crm")
    .from("cases")
    .select("status")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (caseErr || !caseRow) {
    return { error: caseErr?.message ?? "Case not found" };
  }

  if (caseRow.status === targetStatus) {
    return { ok: true };
  }

  // Gate check via the SQL function. Returns a one-row table {allowed,reason}.
  const { data: gateRows, error: gateErr } = await supabase
    .schema("crm")
    .rpc("can_advance_phase", {
      p_case_id: caseId,
      p_target_status: targetStatus,
    });

  if (gateErr) return { error: gateErr.message };

  const gate = Array.isArray(gateRows) ? gateRows[0] : gateRows;
  if (!gate?.allowed) {
    return { error: gate?.reason ?? "Phase advancement blocked" };
  }

  // Build update payload, stamping the relevant lifecycle timestamp.
  const now = new Date().toISOString();
  const updates: CaseUpdate = { status: targetStatus };
  switch (targetStatus) {
    case "submitted_to_ircc":
      updates.submitted_at = now;
      break;
    case "passport_requested":
    case "refused":
    case "additional_info_requested":
      updates.decided_at = now;
      break;
    case "closed":
      updates.closed_at = now;
      break;
  }

  const { error: updateErr } = await supabase
    .schema("crm")
    .from("cases")
    .update(updates)
    .eq("id", caseId);

  if (updateErr) return { error: updateErr.message };

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseId,
      event_type: "status_changed",
      event_data: { from: caseRow.status, to: targetStatus },
      description: `Status changed from ${caseRow.status} to ${targetStatus}`,
      created_by: staff.id,
    });

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { ok: true };
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .trim();
}

export type UploadDocumentResult =
  | { ok: true; documentId: string; sharepointWebUrl: string }
  | { error: string };

export async function uploadDocument(
  caseId: string,
  documentCode: string,
  formData: FormData,
): Promise<UploadDocumentResult> {
  if (!z.string().uuid().safeParse(caseId).success) {
    return { error: "Invalid case id" };
  }
  if (!z.string().min(1).max(50).safeParse(documentCode).success) {
    return { error: "Invalid document code" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file provided" };

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      error: `File exceeds the 4MB limit (${formatBytesMb(file.size)} MB).`,
    };
  }
  if (!ALLOWED_MIME_TYPES_SET.has(file.type)) {
    return {
      error: `File type ${file.type || "unknown"} is not allowed. Use ${ALLOWED_EXTENSIONS_HUMAN}.`,
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: staff } = await supabase
    .schema("crm")
    .from("staff")
    .select("id")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!staff) return { error: "Active staff record not found" };

  const { data: caseRow } = await supabase
    .schema("crm")
    .from("cases")
    .select("id, client_id, service_template_id, sharepoint_folder_id")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caseRow) return { error: "Case not found" };

  if (!caseRow.sharepoint_folder_id) {
    return {
      error:
        "OneDrive folder hasn't been created for this case yet. Use 'Retry folder creation' on the OneDrive card first.",
    };
  }

  const { data: templateDoc } = await supabase
    .schema("ref")
    .from("template_documents")
    .select("category, document_label")
    .eq("service_template_id", caseRow.service_template_id)
    .eq("document_code", documentCode)
    .maybeSingle();
  if (!templateDoc) {
    return { error: "Document code is not part of this case's template." };
  }

  const { data: category } = await supabase
    .schema("ref")
    .from("document_categories")
    .select("name")
    .eq("code", templateDoc.category)
    .maybeSingle();
  if (!category) {
    return { error: "Document category not found in reference data." };
  }

  const driveId = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!driveId) return { error: "GRAPH_DOCUMENT_LIBRARY_ID is not set" };

  // List children of the case folder once and find the matching category
  // subfolder. The list is captured here for the duration of this single
  // upload — no cross-call caching, just keep within the request.
  let categoryFolderId: string;
  try {
    const children = await graphFetch<{
      value: Array<{ id: string; name: string; folder?: object }>;
    }>(
      `/drives/${driveId}/items/${caseRow.sharepoint_folder_id}/children?$select=id,name,folder`,
    );
    const match = children.value.find(
      (c) => c.folder && c.name === category.name,
    );
    if (!match) {
      return {
        error: `Subfolder "${category.name}" not found inside the case folder. The folder structure may be incomplete — try "Retry folder creation".`,
      };
    }
    categoryFolderId = match.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Failed to list case folder: ${message}` };
  }

  const sanitizedOriginalName = sanitizeFileName(file.name);
  const uploadName = `${documentCode}_${sanitizedOriginalName}`;

  let uploadResponse: { id: string; name: string; webUrl: string; size: number };
  try {
    uploadResponse = await uploadFile(
      driveId,
      categoryFolderId,
      uploadName,
      file,
      file.type,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Upload to OneDrive failed: ${message}` };
  }

  // Existing versions: mark prior as superseded, compute next version.
  const { data: existing } = await supabase
    .schema("files")
    .from("documents")
    .select("id, version_number, status")
    .eq("case_id", caseId)
    .eq("document_code", documentCode)
    .is("deleted_at", null);

  const priorRows = existing ?? [];
  const maxVersion = priorRows.reduce(
    (m, d) => Math.max(m, d.version_number),
    0,
  );
  const nextVersion = maxVersion + 1;
  const priorId =
    priorRows.length > 0
      ? priorRows.reduce((latest, d) =>
          d.version_number > latest.version_number ? d : latest,
        ).id
      : null;

  if (priorRows.length > 0) {
    const idsToSupersede = priorRows
      .filter((d) => d.status !== "superseded")
      .map((d) => d.id);
    if (idsToSupersede.length > 0) {
      await supabase
        .schema("files")
        .from("documents")
        .update({ status: "superseded" })
        .in("id", idsToSupersede);
    }
  }

  // CICC audit-trail note: the OneDrive audit log will record every upload
  // as the shared OneDrive owner (info@bigbangimmigration.com), since the
  // app uses an app-only Graph token against that shared mailbox. The
  // legally meaningful per-staff attribution is captured here in
  // uploaded_by_staff and in the case_event below.
  const { data: newDoc, error: insertErr } = await supabase
    .schema("files")
    .from("documents")
    .insert({
      case_id: caseId,
      client_id: caseRow.client_id,
      document_code: documentCode,
      display_name: templateDoc.document_label,
      category: templateDoc.category,
      sharepoint_drive_id: driveId,
      sharepoint_item_id: uploadResponse.id,
      sharepoint_web_url: uploadResponse.webUrl,
      file_name: uploadName,
      file_size_bytes: file.size,
      mime_type: file.type,
      status: "uploaded",
      version_number: nextVersion,
      supersedes: priorId,
      uploaded_by_staff: staff.id,
      uploaded_by_client: false,
    })
    .select("id")
    .single();

  if (insertErr || !newDoc) {
    return {
      error: `Could not record document: ${insertErr?.message ?? "unknown"}`,
    };
  }

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseId,
      event_type: "document_received",
      event_data: {
        document_code: documentCode,
        document_id: newDoc.id,
        version_number: nextVersion,
        file_name: uploadName,
      },
      description: `Document received: ${templateDoc.document_label} (v${nextVersion})`,
      visible_to_client: false,
      created_by: staff.id,
    });

  revalidatePath(`/dashboard/cases/${caseId}`);
  return {
    ok: true,
    documentId: newDoc.id,
    sharepointWebUrl: uploadResponse.webUrl,
  };
}

export type RecordPaymentResult =
  | { ok: true }
  | { error: string; fieldErrors?: Record<string, string[]> };

/**
 * Record a payment against a case. Refunds are out of scope for v1, so
 * is_refund is hard-coded to false. Closed cases are rejected.
 */
export async function recordPayment(
  caseId: string,
  payload: unknown,
): Promise<RecordPaymentResult> {
  if (!z.string().uuid().safeParse(caseId).success) {
    return { error: "Invalid case id" };
  }

  const parsed = paymentSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<
      string,
      string[]
    >;
    return { error: "Please fix the errors below.", fieldErrors };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: staff } = await supabase
    .schema("crm")
    .from("staff")
    .select("id")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!staff) return { error: "Active staff record not found" };

  const { data: caseRow, error: caseErr } = await supabase
    .schema("crm")
    .from("cases")
    .select("id, client_id, status")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (caseErr || !caseRow) return { error: caseErr?.message ?? "Case not found" };
  if (caseRow.status === "closed") {
    return { error: "Cannot record a payment on a closed case." };
  }

  const { data: payment, error: payErr } = await supabase
    .schema("crm")
    .from("payments")
    .insert({
      case_id: caseId,
      client_id: caseRow.client_id,
      amount_cad: parsed.data.amountCad,
      method: parsed.data.method,
      reference: parsed.data.reference ?? null,
      received_date: parsed.data.receivedDate,
      notes: parsed.data.notes ?? null,
      is_refund: false,
      recorded_by: staff.id,
    })
    .select("id")
    .single();

  if (payErr || !payment) {
    return { error: payErr?.message ?? "Could not record payment" };
  }

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseId,
      event_type: "fee_collected",
      event_data: {
        amount_cad: parsed.data.amountCad,
        method: parsed.data.method,
        payment_id: payment.id,
      },
      description: `Payment recorded: $${parsed.data.amountCad} via ${parsed.data.method}`,
      visible_to_client: false,
      created_by: staff.id,
    });

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { ok: true };
}

const assignmentSchema = z.object({
  caseId: z.string().uuid(),
  // Legacy column name in the DB; UI now exposes a single "Assigned" slot.
  rcicId: z.string().uuid("Pick a staff member"),
});

export type UpdateAssignmentInput = z.infer<typeof assignmentSchema>;
export type UpdateAssignmentResult = { ok: true } | { error: string };

export async function updateAssignment(
  input: UpdateAssignmentInput,
): Promise<UpdateAssignmentResult> {
  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { caseId, rcicId } = parsed.data;

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "edit_cases")) {
    return { error: "You don't have permission to change assignments." };
  }

  const supabase = await createClient();

  const { data: caseRow, error: loadErr } = await supabase
    .schema("crm")
    .from("cases")
    .select("assigned_rcic")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (loadErr || !caseRow) {
    return { error: loadErr?.message ?? "Case not found" };
  }

  // Verify the chosen staff member is still active.
  const { data: assignee } = await supabase
    .schema("crm")
    .from("staff")
    .select("id, is_active, deleted_at")
    .eq("id", rcicId)
    .maybeSingle();
  if (!assignee || assignee.deleted_at || !assignee.is_active) {
    return { error: "Selected staff member is not active." };
  }

  if (caseRow.assigned_rcic === rcicId) {
    return { ok: true };
  }

  const { error: updateErr } = await supabase
    .schema("crm")
    .from("cases")
    .update({ assigned_rcic: rcicId })
    .eq("id", caseId);

  if (updateErr) return { error: updateErr.message };

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseId,
      event_type: "other",
      event_data: { from: caseRow.assigned_rcic, to: rcicId },
      description: "Assignment updated",
      created_by: me.id,
    });

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { ok: true };
}
