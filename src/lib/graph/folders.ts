import { createClient } from "@/lib/supabase/server";

import { GraphApiError, graphFetch } from "./client";

type DriveItem = {
  id: string;
  name: string;
  webUrl: string;
  folder?: { childCount?: number };
};

export type CaseFolderResult = {
  driveItemId: string;
  webUrl: string;
};

/**
 * Creates the case folder hierarchy in the firm's SharePoint document
 * library and returns the case folder's drive item id + web URL.
 *
 * Hierarchy (relative to the configured library root):
 *   {Year}/
 *     {ClientNumber} {LastName, FirstName}/
 *       {CaseNumber} {ServiceName}/
 *         {Category subfolders from ref.template_documents}
 *
 * Idempotent: if any folder along the path already exists it is reused
 * rather than re-created.
 */
export async function createCaseFolderStructure(
  caseId: string,
): Promise<CaseFolderResult> {
  const driveId = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!driveId) {
    throw new Error("GRAPH_DOCUMENT_LIBRARY_ID is not set");
  }

  const supabase = await createClient();

  const { data: caseRow, error } = await supabase
    .schema("crm")
    .from("cases")
    .select(
      `
        id,
        case_number,
        opened_at,
        service_type_id,
        service_template_id,
        client:clients(client_number, legal_name_full, family_name, given_names)
      `,
    )
    .eq("id", caseId)
    .is("deleted_at", null)
    .single();

  if (error || !caseRow) {
    throw new Error(`Case ${caseId} not found: ${error?.message ?? "no row"}`);
  }

  // Cross-schema embed (cases→ref.service_types) doesn't type-infer in
  // supabase-js, so fetch the service name separately.
  const { data: service } = await supabase
    .schema("ref")
    .from("service_types")
    .select("name")
    .eq("id", caseRow.service_type_id)
    .single();

  const { data: templateDocs, error: tdErr } = await supabase
    .schema("ref")
    .from("template_documents")
    .select("category")
    .eq("service_template_id", caseRow.service_template_id);

  if (tdErr) {
    throw new Error(`Could not load template categories: ${tdErr.message}`);
  }

  const categoryCodes = [
    ...new Set((templateDocs ?? []).map((d) => d.category)),
  ];

  const { data: categories } = await supabase
    .schema("ref")
    .from("document_categories")
    .select("code, name, display_order")
    .in("code", categoryCodes)
    .order("display_order");

  const year = new Date(caseRow.opened_at).getFullYear().toString();

  const lastName =
    caseRow.client?.family_name?.trim() ||
    caseRow.client?.legal_name_full?.split(/\s+/).slice(-1).join(" ") ||
    "";
  const firstName =
    caseRow.client?.given_names?.trim() ||
    caseRow.client?.legal_name_full?.split(/\s+/).slice(0, -1).join(" ") ||
    "";

  const clientFolder = sanitize(
    `${caseRow.client?.client_number ?? ""} ${lastName}, ${firstName}`.trim(),
  );
  const caseFolder = sanitize(
    `${caseRow.case_number} ${service?.name ?? ""}`.trim(),
  );

  // Optional sandbox/anchor folder. Treated as a path so nested values like
  // "Sandbox/CRM-tests" work; unset means anchor at drive root.
  const rootFolder = process.env.GRAPH_ROOT_FOLDER?.trim() ?? "";
  const rootParts = rootFolder
    ? rootFolder.split("/").map((p) => p.trim()).filter(Boolean).map(sanitize)
    : [];

  const pathParts = [...rootParts, year, clientFolder, caseFolder].filter(
    Boolean,
  );

  const root = await graphFetch<DriveItem>(`/drives/${driveId}/root`);
  let parent: DriveItem = root;
  for (const part of pathParts) {
    parent = await ensureFolder(driveId, parent.id, part);
  }

  for (const cat of categories ?? []) {
    await ensureFolder(driveId, parent.id, sanitize(cat.name));
  }

  return { driveItemId: parent.id, webUrl: parent.webUrl };
}

/**
 * Returns the named child folder under `parentItemId`, creating it if it
 * doesn't exist. Idempotent under a single caller; concurrent callers
 * racing on the same name should get one survivor via the 409 fallback.
 */
async function ensureFolder(
  driveId: string,
  parentItemId: string,
  name: string,
): Promise<DriveItem> {
  const existing = await findChildFolder(driveId, parentItemId, name);
  if (existing) return existing;

  try {
    return await graphFetch<DriveItem>(
      `/drives/${driveId}/items/${parentItemId}/children`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          folder: {},
          "@microsoft.graph.conflictBehavior": "fail",
        }),
      },
    );
  } catch (err) {
    if (err instanceof GraphApiError && err.status === 409) {
      const found = await findChildFolder(driveId, parentItemId, name);
      if (found) return found;
    }
    throw err;
  }
}

async function findChildFolder(
  driveId: string,
  parentItemId: string,
  name: string,
): Promise<DriveItem | null> {
  // Filter on name; $select keeps the payload small.
  const escaped = name.replace(/'/g, "''");
  const list = await graphFetch<{ value: DriveItem[] }>(
    `/drives/${driveId}/items/${parentItemId}/children?$select=id,name,webUrl,folder&$filter=name eq '${encodeURIComponent(escaped)}'`,
  );
  return list.value.find((i) => i.folder && i.name === name) ?? null;
}

function sanitize(name: string): string {
  // SharePoint disallows: \ / : * ? " < > | and trailing/leading dots/spaces
  return name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .trim();
}
