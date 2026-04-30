import { DocumentRow } from "./document-row";

export type TemplateDoc = {
  document_code: string;
  document_label: string;
  category: string;
  is_required: boolean;
  condition_label: string | null;
  display_order: number;
};

export type LatestDoc = {
  status: string;
  file_name: string | null;
  sharepoint_web_url: string | null;
  version_number: number;
};

export function DocumentChecklist({
  caseId,
  templateDocs,
  latestByCode,
}: {
  caseId: string;
  templateDocs: TemplateDoc[];
  latestByCode: Map<string, LatestDoc>;
}) {
  const isReceived = (code: string) => {
    const u = latestByCode.get(code);
    return Boolean(u && (u.status === "uploaded" || u.status === "accepted"));
  };

  const receivedCount = templateDocs.filter((d) =>
    isReceived(d.document_code),
  ).length;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Document checklist</h2>
        <span className="text-sm text-stone-500">
          {receivedCount} of {templateDocs.length} received
        </span>
      </div>
      {templateDocs.length === 0 ? (
        <p className="text-sm text-stone-500">
          No documents in this service template.
        </p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {templateDocs.map((d) => (
            <DocumentRow
              key={d.document_code}
              caseId={caseId}
              templateDoc={{
                document_code: d.document_code,
                document_label: d.document_label,
                condition_label: d.condition_label,
              }}
              uploaded={latestByCode.get(d.document_code) ?? null}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
