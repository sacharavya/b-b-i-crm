"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DeleteConfirmDialog } from "@/components/checklists/delete-confirm-dialog";
import { Button } from "@/components/ui/button";

import { deleteClient } from "../../actions";

export function DeleteClientTrigger({
  clientId,
  clientName,
  clientNumber,
}: {
  clientId: string;
  clientName: string;
  clientNumber: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteClient(clientId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push("/dashboard/clients");
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-destructive hover:bg-red-50 hover:text-destructive"
      >
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        Delete client
      </Button>

      <DeleteConfirmDialog
        open={open}
        onOpenChange={(o) => {
          if (!o) setError(null);
          setOpen(o);
        }}
        title="Delete this client?"
        description="This permanently removes the client record. Any cases that reference this client must be removed first."
        warningLines={[
          "Intake history (family, education, employment, travel, addresses) is removed via cascade.",
          "Communications and audit-log entries about this client are NOT removed.",
          "There is no soft-delete fallback — deletion is final.",
        ]}
        expectedToken={clientNumber}
        tokenLabel="Type the client number to confirm"
        pending={pending}
        error={error}
        onConfirm={runDelete}
        confirmLabel={`Delete ${clientName}`}
      />
    </>
  );
}
