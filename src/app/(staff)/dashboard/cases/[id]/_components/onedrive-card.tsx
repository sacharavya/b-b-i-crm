"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

import { retryFolderCreation } from "../../new/actions";

export function OneDriveCard({
  caseId,
  folderId,
  folderUrl,
}: {
  caseId: string;
  folderId: string | null;
  folderUrl: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRetry() {
    setError(null);
    startTransition(async () => {
      const result = await retryFolderCreation(caseId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (folderUrl && folderId) {
    return (
      <Link
        href={folderUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${buttonVariants({ variant: "outline", size: "sm" })} w-full justify-center`}
      >
        <ExternalLink className="mr-1 h-3.5 w-3.5" />
        Open folder
      </Link>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-stone-500">Folder not yet created.</p>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleRetry}
        disabled={pending}
      >
        {pending ? "Retrying…" : "Retry folder creation"}
      </Button>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
