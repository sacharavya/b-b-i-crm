"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// Reusable type-to-confirm dialog for hard deletes. Caller supplies the
// expected confirmation token (typically the entity's name or case number)
// and the async confirm handler.

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  warningLines = [],
  expectedToken,
  tokenLabel,
  pending,
  error,
  onConfirm,
  confirmLabel = "Delete permanently",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  warningLines?: string[];
  expectedToken: string;
  tokenLabel: string;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  confirmLabel?: string;
}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const matches = typed.trim() === expectedToken.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => (pending ? null : onOpenChange(o))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {warningLines.length > 0 && (
          <ul className="space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {warningLines.map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
        )}

        <label className="block text-sm">
          <span className="block text-xs font-medium text-stone-600">
            Type <span className="font-mono">{expectedToken}</span> to confirm
          </span>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={tokenLabel}
            disabled={pending}
            autoComplete="off"
            className="mt-1"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={pending || !matches}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Deleting…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
