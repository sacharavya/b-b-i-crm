"use client";

import { Check, ExternalLink, Loader2, Upload as UploadIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition, type ChangeEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/index";
import {
  ALLOWED_EXTENSIONS_HUMAN,
  ALLOWED_MIME_TYPES,
  ALLOWED_MIME_TYPES_SET,
  MAX_UPLOAD_BYTES,
  formatBytesMb,
} from "@/lib/validators/document";

import { uploadDocument } from "../actions";

const ACCEPT = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".heic",
  ".doc",
  ".docx",
  ...ALLOWED_MIME_TYPES,
].join(",");

export type DocumentRowProps = {
  caseId: string;
  templateDoc: {
    document_code: string;
    document_label: string;
    condition_label: string | null;
    instructions: string | null;
  };
  uploaded: {
    status: string;
    file_name: string | null;
    sharepoint_web_url: string | null;
    version_number: number;
  } | null;
};

export function DocumentRow({ caseId, templateDoc, uploaded }: DocumentRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const received =
    uploaded &&
    (uploaded.status === "uploaded" || uploaded.status === "accepted");
  const isConditional = templateDoc.condition_label !== null;

  function trigger() {
    setError(null);
    inputRef.current?.click();
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset early so the same file can be picked again later.
    e.target.value = "";
    if (!file) return;

    // Pre-flight checks. Without these, a >5MB file would trip Next.js's
    // server action body-size guard and surface as a runtime error before
    // the action ever runs. We also check the mime type so users get
    // immediate feedback rather than waiting for a server roundtrip.
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(
        `File exceeds the 4MB limit (${formatBytesMb(file.size)} MB). Compress or split before uploading.`,
      );
      return;
    }
    if (!ALLOWED_MIME_TYPES_SET.has(file.type)) {
      setError(
        `File type ${file.type || "unknown"} is not allowed. Use ${ALLOWED_EXTENSIONS_HUMAN}.`,
      );
      return;
    }

    const fd = new FormData();
    fd.append("file", file);

    startTransition(async () => {
      const result = await uploadDocument(
        caseId,
        templateDoc.document_code,
        fd,
      );
      if ("error" in result) {
        setError(result.error);
      }
    });
  }

  return (
    <li className={cn("relative flex items-center gap-3 py-3", pending && "opacity-60")}>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={ACCEPT}
        onChange={handleChange}
      />

      {received ? (
        <span
          aria-label="Received"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-200 text-green-800"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      ) : (
        <span
          aria-label="Missing"
          className="h-6 w-6 shrink-0 rounded-full border-2 border-dashed border-stone-300"
        />
      )}

      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-sm",
            isConditional && !received
              ? "text-stone-500"
              : "font-medium text-stone-900",
          )}
        >
          {templateDoc.document_label}
        </div>
        {templateDoc.condition_label && (
          <div className="mt-0.5 text-xs text-stone-500">
            {templateDoc.condition_label}
          </div>
        )}
        {templateDoc.instructions && (
          <div className="mt-0.5 text-xs text-stone-500">
            {templateDoc.instructions}
          </div>
        )}
        {error && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        {received && uploaded?.file_name && (
          <span className="max-w-[140px] truncate text-xs text-stone-500">
            {uploaded.file_name}
          </span>
        )}
        {received && uploaded?.sharepoint_web_url && (
          <Link
            href={uploaded.sharepoint_web_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open in OneDrive"
            className={buttonVariants({ size: "sm", variant: "ghost" })}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}

        <Button
          variant={received ? "ghost" : "outline"}
          size="sm"
          onClick={trigger}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : received ? (
            <UploadIcon className="h-3.5 w-3.5" />
          ) : (
            <>
              <UploadIcon className="mr-1 h-3.5 w-3.5" />
              Upload
            </>
          )}
        </Button>
      </div>
    </li>
  );
}
